// progression.js
// Progreso persistente del jugador: monedas, personajes desbloqueados y mejoras.
// Se guarda en localStorage y no depende de ningún otro archivo salvo characters.js
// (para calcular los stats finales de un personaje con sus mejoras aplicadas).

const PROGRESS_STORAGE_KEY = 'reino_universos_progress_v1';
const DEFAULT_UNLOCKED_IDS = ['elfo'];

const COINS_ON_WIN = 50;
const COINS_ON_LOSE = 10; // se RESTA al perder (con suelo en 0)

// Coste del nivel 1, 2 y 3 respectivamente (mismo escalonado para las 3 stats mejorables).
const UPGRADE_COSTS = [80, 120, 180];
const MAX_UPGRADE_LEVEL = UPGRADE_COSTS.length;
const UPGRADE_PERCENT_PER_LEVEL = 0.05;

// Las 3 stats mejorables y a qué campo de characters.js corresponden.
const UPGRADE_STATS = {
  attack: { field: 'attack', label: 'Fuerza' },
  defense: { field: 'hp', label: 'Defensa' },
  speed: { field: 'speedStat', label: 'Velocidad' }
};

function defaultProgress() {
  return { coins: 0, unlocked: DEFAULT_UNLOCKED_IDS.slice(), upgrades: {} };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return {
      coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? parsed.coins : 0,
      unlocked: Array.isArray(parsed.unlocked) && parsed.unlocked.length ? parsed.unlocked : DEFAULT_UNLOCKED_IDS.slice(),
      upgrades: parsed.upgrades && typeof parsed.upgrades === 'object' ? parsed.upgrades : {}
    };
  } catch (e) {
    return defaultProgress();
  }
}

let _progress = loadProgress();

function saveProgress() {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(_progress));
}

function getProgress() {
  return _progress;
}

function getCoins() {
  return _progress.coins;
}

function addCoins(amount) {
  _progress.coins += amount;
  saveProgress();
}

// Aplica el resultado de una partida: +50 monedas si se gana, -10 si se pierde (con suelo en 0,
// nunca queda negativo). Devuelve el delta REAL aplicado (puede ser menor que -10 si no había
// suficientes monedas), para que la pantalla de resultado muestre la cifra exacta.
function applyMatchReward(won) {
  if (won) {
    _progress.coins += COINS_ON_WIN;
    saveProgress();
    return COINS_ON_WIN;
  }
  const before = _progress.coins;
  _progress.coins = Math.max(0, _progress.coins - COINS_ON_LOSE);
  saveProgress();
  return _progress.coins - before;
}

function isUnlocked(charId) {
  return _progress.unlocked.indexOf(charId) !== -1;
}

// Coste de desbloqueo de un personaje, según la rareza definida en characters.js.
function getUnlockCost(charId) {
  const def = CHARACTERS.find(c => c.id === charId);
  return RARITIES[def.rarity].cost;
}

function unlockCharacter(charId) {
  if (isUnlocked(charId)) return { success: false, reason: 'already' };
  const cost = getUnlockCost(charId);
  if (_progress.coins < cost) return { success: false, reason: 'insufficient' };
  _progress.coins -= cost;
  _progress.unlocked.push(charId);
  saveProgress();
  return { success: true };
}

function getUpgradeLevel(charId, stat) {
  const entry = _progress.upgrades[charId];
  return (entry && entry[stat]) || 0;
}

// Coste del PRÓXIMO nivel de esa stat, o null si ya está al máximo.
function getUpgradeCost(charId, stat) {
  const level = getUpgradeLevel(charId, stat);
  return level >= MAX_UPGRADE_LEVEL ? null : UPGRADE_COSTS[level];
}

function upgradeStat(charId, stat) {
  if (!isUnlocked(charId)) return { success: false, reason: 'locked' };
  const level = getUpgradeLevel(charId, stat);
  if (level >= MAX_UPGRADE_LEVEL) return { success: false, reason: 'maxed' };
  const cost = UPGRADE_COSTS[level];
  if (_progress.coins < cost) return { success: false, reason: 'insufficient' };

  _progress.coins -= cost;
  if (!_progress.upgrades[charId]) _progress.upgrades[charId] = {};
  _progress.upgrades[charId][stat] = level + 1;
  saveProgress();
  return { success: true };
}

function resetProgress() {
  _progress = defaultProgress();
  saveProgress();
}

// Stats finales de un personaje (base + % de mejora por nivel), lo que combat.js debe usar
// al crear la Entity del jugador en combate. Los stats que no son mejorables (reduction,
// dodge, cooldown, range, etc.) se copian tal cual desde characters.js.
function getFinalCharacterStats(charId) {
  const base = CHARACTERS.find(c => c.id === charId);
  const atkLevel = getUpgradeLevel(charId, 'attack');
  const defLevel = getUpgradeLevel(charId, 'defense');
  const spdLevel = getUpgradeLevel(charId, 'speed');

  return Object.assign({}, base, {
    attack: Math.round(base.attack * (1 + atkLevel * UPGRADE_PERCENT_PER_LEVEL)),
    hp: Math.round(base.hp * (1 + defLevel * UPGRADE_PERCENT_PER_LEVEL)),
    speedStat: Math.round(base.speedStat * (1 + spdLevel * UPGRADE_PERCENT_PER_LEVEL) * 100) / 100
  });
}
