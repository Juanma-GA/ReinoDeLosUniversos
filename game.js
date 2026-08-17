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
    drawArenaBackground();
    for (const p of projectiles) drawProjectile(p);
    drawEntity(cpu, now);
    drawEntity(player, now);
  }

  function drawArenaBackground() {
    const g = ctx.createRadialGradient(
      ARENA_W / 2, ARENA_H / 2, 60,
      ARENA_W / 2, ARENA_H / 2, ARENA_W / 1.1
    );
    g.addColorStop(0, '#3a5f3a');
    g.addColorStop(1, '#1c2e1c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < ARENA_W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA_H);
      ctx.stroke();
    }
    for (let y = 0; y < ARENA_H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, ARENA_W - 8, ARENA_H - 8);
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

  function drawEntity(entity, now) {
    const { x, y, radius, def, facing } = entity;
    const phasing = now < entity.phaseUntil;
    const hitFlash = now < entity.hitFlashUntil;
    const attackFlash = now < entity.attackFlashUntil;

    ctx.save();
    ctx.globalAlpha = phasing ? 0.35 : 1;

    // Sombra
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.8, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // Cuerpo
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = hitFlash ? '#ffffff' : def.color;
    ctx.strokeStyle = attackFlash ? '#ffffff' : 'rgba(0,0,0,0.5)';
    ctx.lineWidth = attackFlash ? 4 : 2;
    ctx.fill();
    ctx.stroke();

    // Rango de ataque melee (arco sutil) al golpear
    if (attackFlash && def.attackType === 'melee') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, def.range, facing - Math.PI / 2.2, facing + Math.PI / 2.2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    }

    // Icono
    ctx.globalAlpha = phasing ? 0.35 : 1;
    ctx.font = `${radius}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, x, y - 2);

    // Indicador de orientación
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(facing) * radius, y + Math.sin(facing) * radius);
    ctx.lineTo(x + Math.cos(facing) * (radius + 10), y + Math.sin(facing) * (radius + 10));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Nombre
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(def.name, x, y - radius - 10);

    ctx.restore();
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
