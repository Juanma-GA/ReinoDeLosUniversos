// game.js
// Loop principal y máquina de estados: selección → combate → resultado.

(function () {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');

  let state = 'select'; // 'select' | 'combat' | 'result'
  let player = null;
  let cpu = null;
  let projectiles = [];
  let lastTime = 0;
  let mouseX = ARENA_W / 2;
  let mouseY = ARENA_H / 2;
  const keys = new Set();
  let arenaBackground = null; // canvas offscreen con la textura + decoración pre-renderizadas

  // ---------- Selección ----------
  buildCharacterGrid(() => {
    document.getElementById('btn-start').disabled = false;
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    if (!selectedCharacterId) return;
    startCombat(selectedCharacterId);
  });

  function pickCpuCharacter(excludeId) {
    const pool = CHARACTERS.filter(c => c.id !== excludeId);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function startCombat(playerId) {
    const playerDef = CHARACTERS.find(c => c.id === playerId);
    const cpuDef = pickCpuCharacter(playerId);

    player = new Entity(playerDef, ARENA_W * 0.25, ARENA_H * 0.5, true);
    cpu = new Entity(cpuDef, ARENA_W * 0.75, ARENA_H * 0.5, false);
    projectiles = [];
    arenaBackground = buildArenaBackground([
      { x: player.x, y: player.y, r: 100 },
      { x: cpu.x, y: cpu.y, r: 100 }
    ]);

    setHudIdentity(playerDef, cpuDef);
    updateHUD(player, cpu);
    showScreen('combat-screen');
    state = 'combat';
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  // ---------- Input ----------
  window.addEventListener('keydown', e => {
    keys.add(e.key.toLowerCase());
    if (e.key === ' ') {
      e.preventDefault();
      attemptPlayerAttack();
    }
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    attemptPlayerAttack();
  });

  function attemptPlayerAttack() {
    if (state !== 'combat' || !player.alive) return;
    performAttack(player, cpu, performance.now(), projectiles);
  }

  // ---------- Loop ----------
  function loop(now) {
    if (state !== 'combat') return;
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    const dtScale = dt / (1000 / 60);

    update(now, dtScale);
    render(now);

    requestAnimationFrame(loop);
  }

  function update(now, dtScale) {
    // Jugador: apunta al ratón y se mueve con WASD/flechas.
    player.facing = Math.atan2(mouseY - player.y, mouseX - player.x);

    let mx = 0, my = 0;
    if (keys.has('w') || keys.has('arrowup')) my -= 1;
    if (keys.has('s') || keys.has('arrowdown')) my += 1;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
    if (keys.has('d') || keys.has('arrowright')) mx += 1;
    moveEntity(player, mx, my, dtScale);

    if (cpu.alive) {
      updateAI(cpu, player, now, dtScale, projectiles);
    }

    projectiles = updateProjectiles(projectiles, now);
    updateHUD(player, cpu);

    if (!player.alive || !cpu.alive) {
      endCombat(cpu.alive === false);
    }
  }

  function endCombat(playerWon) {
    state = 'result';
    showResult(playerWon, player.def, cpu.def);
    showScreen('result-screen');
  }

  // ---------- Render ----------
  function render(now) {
    if (arenaBackground) {
      ctx.drawImage(arenaBackground, 0, 0);
    }
    for (const p of projectiles) drawProjectile(p);
    drawEntity(cpu, now);
    drawEntity(player, now);
  }

  // Genera posiciones para rocas y árboles decorativos evitando las zonas de aparición
  // de los personajes (spawnZones) y el solape entre elementos.
  function generateArenaProps(spawnZones) {
    const margin = 45;
    const specs = [
      { type: 'tree', count: 6, minSize: 24, maxSize: 34 },
      { type: 'rock', count: 9, minSize: 10, maxSize: 20 }
    ];
    const props = [];

    for (const spec of specs) {
      let placed = 0;
      let attempts = 0;
      while (placed < spec.count && attempts < 200) {
        attempts++;
        const x = margin + Math.random() * (ARENA_W - margin * 2);
        const y = margin + Math.random() * (ARENA_H - margin * 2);
        const size = spec.minSize + Math.random() * (spec.maxSize - spec.minSize);

        const inSpawnZone = spawnZones.some(z => Math.hypot(x - z.x, y - z.y) < z.r + size);
        if (inSpawnZone) continue;

        const overlaps = props.some(p => Math.hypot(x - p.x, y - p.y) < (size + p.size) * 1.3);
        if (overlaps) continue;

        props.push({ type: spec.type, x, y, size });
        placed++;
      }
    }
    return props;
  }

  // Pre-renderiza fondo de tierra/hierba con textura orgánica + rocas y árboles en un
  // canvas offscreen, para no recalcular ruido ni decoración en cada frame (60fps).
  function buildArenaBackground(spawnZones) {
    const off = document.createElement('canvas');
    off.width = ARENA_W;
    off.height = ARENA_H;
    const octx = off.getContext('2d');

    const g = octx.createRadialGradient(
      ARENA_W / 2, ARENA_H / 2, 60,
      ARENA_W / 2, ARENA_H / 2, ARENA_W / 1.1
    );
    g.addColorStop(0, '#5c6b3c');
    g.addColorStop(0.55, '#42522d');
    g.addColorStop(1, '#28331d');
    octx.fillStyle = g;
    octx.fillRect(0, 0, ARENA_W, ARENA_H);

    // Manchas orgánicas de tierra/hierba para romper la uniformidad del suelo.
    const blotchPalette = ['#6f7f45', '#4c5c2e', '#7d6c40', '#57481f', '#3e4c25', '#8a7247'];
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * ARENA_W;
      const y = Math.random() * ARENA_H;
      const r = 14 + Math.random() * 42;
      octx.globalAlpha = 0.07 + Math.random() * 0.09;
      octx.fillStyle = blotchPalette[Math.floor(Math.random() * blotchPalette.length)];
      octx.beginPath();
      octx.ellipse(x, y, r, r * (0.45 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
      octx.fill();
    }
    octx.globalAlpha = 1;

    const props = generateArenaProps(spawnZones);
    for (const prop of props) drawArenaProp(octx, prop);

    octx.strokeStyle = 'rgba(0,0,0,0.6)';
    octx.lineWidth = 8;
    octx.strokeRect(4, 4, ARENA_W - 8, ARENA_H - 8);

    return off;
  }

  function drawArenaProp(octx, prop) {
    octx.save();
    octx.translate(prop.x, prop.y);

    if (prop.type === 'rock') {
      octx.beginPath();
      octx.ellipse(2, prop.size * 0.4, prop.size * 0.9, prop.size * 0.35, 0, 0, Math.PI * 2);
      octx.fillStyle = 'rgba(0,0,0,0.25)';
      octx.fill();

      octx.beginPath();
      octx.moveTo(-prop.size, 0);
      octx.lineTo(-prop.size * 0.4, -prop.size * 0.8);
      octx.lineTo(prop.size * 0.5, -prop.size * 0.6);
      octx.lineTo(prop.size, prop.size * 0.1);
      octx.lineTo(prop.size * 0.3, prop.size * 0.5);
      octx.lineTo(-prop.size * 0.6, prop.size * 0.4);
      octx.closePath();
      octx.fillStyle = '#8a8a86';
      octx.fill();
      octx.strokeStyle = 'rgba(0,0,0,0.3)';
      octx.lineWidth = 2;
      octx.stroke();
    } else {
      // Árbol: sombra, tronco y copa en dos tonos.
      octx.beginPath();
      octx.ellipse(2, prop.size * 0.2, prop.size * 1.1, prop.size * 0.4, 0, 0, Math.PI * 2);
      octx.fillStyle = 'rgba(0,0,0,0.3)';
      octx.fill();

      octx.fillStyle = '#5b3a22';
      octx.fillRect(-prop.size * 0.12, -prop.size * 0.2, prop.size * 0.24, prop.size * 0.5);

      octx.fillStyle = '#2f5a2b';
      octx.beginPath();
      octx.arc(0, -prop.size * 0.5, prop.size * 0.75, 0, Math.PI * 2);
      octx.fill();

      octx.fillStyle = '#3d7038';
      octx.beginPath();
      octx.arc(-prop.size * 0.25, -prop.size * 0.75, prop.size * 0.55, 0, Math.PI * 2);
      octx.fill();
      octx.beginPath();
      octx.arc(prop.size * 0.3, -prop.size * 0.7, prop.size * 0.5, 0, Math.PI * 2);
      octx.fill();
    }

    octx.restore();
  }

  function drawProjectile(p) {
    ctx.save();
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const SPRITE_DISPLAY_SCALE = 0.8;

  function drawEntity(entity, now) {
    const { x, y, radius, def, facing } = entity;
    const phasing = now < entity.phaseUntil;
    const hitFlash = now < entity.hitFlashUntil;
    const attackFlash = now < entity.attackFlashUntil;
    const sprite = SPRITE_CACHE[def.id];

    ctx.save();
    ctx.globalAlpha = phasing ? 0.35 : 1;

    // Sombra de contacto
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.8, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    if (sprite) {
      drawCreatureSprite(sprite, entity, now, attackFlash, hitFlash);
    } else {
      // Fallback provisional (círculo + emoji) para personajes sin sprite propio todavía.
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = hitFlash ? '#ffffff' : def.color;
      ctx.strokeStyle = attackFlash ? '#ffffff' : 'rgba(0,0,0,0.5)';
      ctx.lineWidth = attackFlash ? 4 : 2;
      ctx.fill();
      ctx.stroke();

      ctx.font = `${radius}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, x, y - 2);
    }

    // Rango de ataque melee (arco sutil) al golpear, por encima del sprite
    if (attackFlash && def.attackType === 'melee') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, getAttackRange(def), facing - Math.PI / 2.2, facing + Math.PI / 2.2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    }

    // Indicador de orientación (apunte preciso, más allá del flip izq/der del sprite)
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(facing) * radius, y + Math.sin(facing) * radius);
    ctx.lineTo(x + Math.cos(facing) * (radius + 10), y + Math.sin(facing) * (radius + 10));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Nombre
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(def.name, x, y - radius - 14);

    ctx.restore();
  }

  // Dibuja el frame de sprite pre-renderizado adecuado (idle/walk/attack), con flip
  // horizontal según hacia dónde mira el personaje. No redibuja formas, solo hace drawImage.
  function drawCreatureSprite(spriteSet, entity, now, attackFlash, hitFlash) {
    const { x, y, facing } = entity;
    let frameKey = 'idle';
    if (attackFlash) {
      frameKey = 'attack';
    } else if (entity.isMoving) {
      frameKey = Math.floor(now / 150) % 2 === 0 ? 'walk1' : 'walk2';
    }
    const frame = spriteSet[frameKey];
    const flip = Math.cos(facing) < 0;
    const size = SPRITE_SIZE * SPRITE_DISPLAY_SCALE;
    const anchor = SPRITE_ANCHOR * SPRITE_DISPLAY_SCALE;

    if (hitFlash) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(frame, -anchor, -anchor, size, size);
    ctx.restore();

    if (attackFlash) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.46, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- Resultado ----------
  document.getElementById('btn-rematch').addEventListener('click', () => {
    startCombat(player.def.id);
  });

  document.getElementById('btn-reselect').addEventListener('click', () => {
    state = 'select';
    document.getElementById('btn-start').disabled = true;
    document.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
    selectedCharacterId = null;
    showScreen('select-screen');
  });
})();
