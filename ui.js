// ui.js
// Pantalla de selección, barras de vida (HUD) y pantalla de resultado.

let selectedCharacterId = null;

function buildCharacterGrid(onSelect) {
  const grid = document.getElementById('character-grid');
  grid.innerHTML = '';

  CHARACTERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.style.setProperty('--char-color', c.color);
    card.dataset.id = c.id;

    card.innerHTML = `
      <div class="char-icon" id="char-icon-${c.id}"></div>
      <div class="char-name">${c.name}</div>
      <div class="char-role">${c.role}</div>
      <div class="char-lore">${c.lore}</div>
      <div class="stat-row">
        <span class="stat-label">Ataque</span>
        <div class="stat-bar"><div class="stat-fill atk" style="width:${(c.attack / STAT_MAX.attack) * 100}%"></div></div>
        <span class="stat-value">${c.attack}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Defensa</span>
        <div class="stat-bar"><div class="stat-fill def" style="width:${(c.hp / STAT_MAX.hp) * 100}%"></div></div>
        <span class="stat-value">${c.hp}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Velocidad</span>
        <div class="stat-bar"><div class="stat-fill spd" style="width:${(c.speedStat / STAT_MAX.speedStat) * 100}%"></div></div>
        <span class="stat-value">${c.speedStat}</span>
      </div>
      <div class="char-attack">${attackTypeLabel(c)} · ${c.attackName}</div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharacterId = c.id;
      onSelect(c.id);
    });

    grid.appendChild(card);
    renderCardIcon(c);
  });
}

// Muestra el sprite pre-renderizado del personaje (pose idle) en su tarjeta,
// o el emoji como respaldo mientras ese personaje no tenga sprite propio.
function renderCardIcon(c) {
  const host = document.getElementById(`char-icon-${c.id}`);
  const spriteSet = SPRITE_CACHE[c.id];
  if (!spriteSet) {
    host.textContent = c.icon;
    return;
  }
  const size = 64;
  const preview = document.createElement('canvas');
  preview.width = size;
  preview.height = size;
  const pctx = preview.getContext('2d');
  pctx.drawImage(spriteSet.idle, 0, 0, SPRITE_SIZE, SPRITE_SIZE, 0, 0, size, size);
  host.appendChild(preview);
}

function attackTypeLabel(c) {
  return c.attackType === 'ranged' ? '🎯 A distancia' : '⚔️ Cuerpo a cuerpo';
}

function updateHUD(player, cpu) {
  setHpBar('player', player);
  setHpBar('cpu', cpu);
}

function setHpBar(prefix, entity) {
  const pct = Math.max(0, (entity.hp / entity.maxHp) * 100);
  const bar = document.getElementById(`${prefix}-hp`);
  const text = document.getElementById(`${prefix}-hp-text`);
  bar.style.width = `${pct}%`;
  bar.classList.toggle('low', pct <= 30);
  text.textContent = `${Math.ceil(entity.hp)} / ${entity.maxHp}`;
}

function setHudIdentity(playerChar, cpuChar) {
  document.getElementById('player-icon').textContent = playerChar.icon;
  document.getElementById('player-name').textContent = playerChar.name;
  document.getElementById('cpu-icon').textContent = cpuChar.icon;
  document.getElementById('cpu-name').textContent = cpuChar.name;
  document.getElementById('player-hp').style.background = `linear-gradient(90deg, ${playerChar.color}, #ffffffaa)`;
  document.getElementById('cpu-hp').style.background = `linear-gradient(90deg, ${cpuChar.color}, #ffffffaa)`;
}

function showResult(playerWon, playerChar, cpuChar) {
  const title = document.getElementById('result-title');
  const subtitle = document.getElementById('result-subtitle');
  const box = document.querySelector('.result-box');

  if (playerWon) {
    title.textContent = '¡Victoria!';
    subtitle.textContent = `Tu ${playerChar.name} ha derrotado a ${cpuChar.name}.`;
    box.classList.remove('lose');
    box.classList.add('win');
  } else {
    title.textContent = 'Derrota';
    subtitle.textContent = `${cpuChar.name} ha acabado con tu ${playerChar.name}.`;
    box.classList.remove('win');
    box.classList.add('lose');
  }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
