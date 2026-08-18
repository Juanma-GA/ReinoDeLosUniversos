// ui.js
// Pantalla de selección, barras de vida (HUD) y pantalla de resultado.

let selectedCharacterId = null;
let _onCharacterSelect = null; // callback recordado para poder reconstruir la grid tras desbloqueos/mejoras

function buildCharacterGrid(onSelect) {
  if (onSelect) _onCharacterSelect = onSelect;
  const grid = document.getElementById('character-grid');
  grid.innerHTML = '';

  CHARACTERS.forEach(c => {
    const unlocked = isUnlocked(c.id);
    const card = document.createElement('div');
    card.className = 'char-card' + (unlocked ? '' : ' locked');
    card.style.setProperty('--char-color', c.color);
    card.dataset.id = c.id;

    if (!unlocked) {
      card.innerHTML = `
        <div class="lock-icon">🔒</div>
        <div class="char-name">${c.name}</div>
        <div class="unlock-cost">${UNLOCK_COST} 🪙</div>
        <div class="unlock-hint">Clic para desbloquear</div>
      `;
      card.addEventListener('click', () => attemptUnlock(c.id, card));
      grid.appendChild(card);
      return;
    }

    card.innerHTML = `
      <button class="upgrade-toggle" type="button" title="Mejorar personaje">🔧</button>
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
      <div class="upgrade-panel" id="upgrade-panel-${c.id}">
        ${renderUpgradeRow(c.id, 'attack')}
        ${renderUpgradeRow(c.id, 'defense')}
        ${renderUpgradeRow(c.id, 'speed')}
      </div>
    `;

    card.querySelector('.upgrade-toggle').addEventListener('click', e => {
      e.stopPropagation();
      card.querySelector('.upgrade-panel').classList.toggle('open');
    });

    card.querySelectorAll('.upgrade-buy-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const stat = btn.dataset.stat;
        const result = upgradeStat(c.id, stat);
        if (result.success) {
          const wasOpen = card.querySelector('.upgrade-panel').classList.contains('open');
          buildCharacterGrid();
          if (wasOpen) {
            const rebuilt = document.querySelector(`.char-card[data-id="${c.id}"] .upgrade-panel`);
            if (rebuilt) rebuilt.classList.add('open');
          }
        } else {
          flashInsufficientFunds(btn);
        }
      });
    });

    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharacterId = c.id;
      _onCharacterSelect(c.id);
    });

    grid.appendChild(card);
    renderCardIcon(c);
  });

  if (selectedCharacterId) {
    const sel = grid.querySelector(`.char-card[data-id="${selectedCharacterId}"]`);
    if (sel && !sel.classList.contains('locked')) sel.classList.add('selected');
  }

  renderCoinDisplay();
}

function attemptUnlock(charId, cardEl) {
  const result = unlockCharacter(charId);
  if (result.success) {
    buildCharacterGrid();
  } else if (result.reason === 'insufficient') {
    flashInsufficientFunds(cardEl);
  }
}

function renderUpgradeRow(charId, stat) {
  const info = UPGRADE_STATS[stat];
  const level = getUpgradeLevel(charId, stat);
  const cost = getUpgradeCost(charId, stat);
  const maxed = cost == null;
  let dots = '';
  for (let i = 0; i < MAX_UPGRADE_LEVEL; i++) {
    dots += `<span class="lvl-dot ${i < level ? 'filled' : ''}"></span>`;
  }
  return `
    <div class="upgrade-row">
      <span class="upgrade-label">${info.label}</span>
      <span class="upgrade-dots">${dots}</span>
      <button class="upgrade-buy-btn" type="button" data-stat="${stat}" ${maxed ? 'disabled' : ''}>
        ${maxed ? 'MÁX' : `+5% · ${cost}🪙`}
      </button>
    </div>
  `;
}

// Feedback visual (vibración/shake) cuando falta dinero para desbloquear o mejorar.
function flashInsufficientFunds(el) {
  el.classList.remove('shake');
  // Forzar reflow para poder relanzar la animación si ya estaba en curso.
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

function renderCoinDisplay() {
  const el = document.getElementById('coin-count');
  if (el) el.textContent = getCoins();
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

// Actualiza la barra de recarga del súper ataque del jugador (única visible en el HUD).
function updateSuperHUD(entity, now) {
  const host = document.getElementById('player-super-outer');
  const bar = document.getElementById('player-super');
  const text = document.getElementById('player-super-text');

  if (!entity.def.super) {
    host.style.visibility = 'hidden';
    return;
  }
  host.style.visibility = 'visible';

  const elapsed = now - entity.superLastUsedAt;
  const pct = Math.min(1, elapsed / entity.def.super.cooldown);
  bar.style.width = `${pct * 100}%`;
  const ready = pct >= 1;
  host.classList.toggle('ready', ready);
  text.textContent = ready
    ? `R: ${entity.def.super.name} · ¡LISTO!`
    : `R: ${entity.def.super.name} (${Math.ceil((entity.def.super.cooldown - elapsed) / 1000)}s)`;
}

function setHudIdentity(playerChar, cpuChar) {
  document.getElementById('player-icon').textContent = playerChar.icon;
  document.getElementById('player-name').textContent = playerChar.name;
  document.getElementById('cpu-icon').textContent = cpuChar.icon;
  document.getElementById('cpu-name').textContent = cpuChar.name;
  document.getElementById('player-hp').style.background = `linear-gradient(90deg, ${playerChar.color}, #ffffffaa)`;
  document.getElementById('cpu-hp').style.background = `linear-gradient(90deg, ${cpuChar.color}, #ffffffaa)`;
}

function showResult(playerWon, playerChar, cpuChar, coinsEarned) {
  const title = document.getElementById('result-title');
  const subtitle = document.getElementById('result-subtitle');
  const coinsEl = document.getElementById('result-coins');
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
  coinsEl.textContent = `+${coinsEarned} 🪙`;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
