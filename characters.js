// characters.js
// Definición de las 9 criaturas jugables: stats base y ataque característico.
//
// Stats:
//  - hp:         vida total (Defensa)
//  - attack:     daño por golpe/disparo (Fuerza de ataque)
//  - speedStat:  velocidad de movimiento (px/frame a 60fps) y determina cadencia/esquiva
//  - cooldown:   ms entre ataques (cadencia)
//  - reduction:  % de daño recibido que se reduce (parte de Defensa)
//  - dodge:      probabilidad de esquivar un golpe por completo
//  - attackType: 'melee' | 'ranged'
//  - range:      alcance del ataque (px)
//  - projectile: sólo para ranged {speed, radius, color}
//  - knockback:  sólo para melee, empuje al golpear
//  - penetration: sólo Espectro, % de la reducción del rival que ignora
//  - phaseOnDodge: sólo Espectro, ms de intangibilidad tras esquivar

const CHARACTERS = [
  {
    id: 'elfo',
    name: 'Elfo',
    role: 'Francotirador ágil',
    color: '#4ade80',
    icon: '🏹',
    lore: 'Preciso a distancia, frágil cuerpo a cuerpo.',
    hp: 90,
    attack: 18,
    speedStat: 4.2,
    cooldown: 550,
    reduction: 0.05,
    dodge: 0.10,
    attackType: 'ranged',
    attackName: 'Flecha',
    range: 480,
    projectile: { speed: 9, radius: 5, color: '#4ade80' }
  },
  {
    id: 'enano',
    name: 'Enano',
    role: 'Tanque',
    color: '#f59e0b',
    icon: '🔨',
    lore: 'Alta defensa, lento pero implacable.',
    hp: 180,
    attack: 16,
    speedStat: 2.0,
    cooldown: 750,
    reduction: 0.30,
    dodge: 0.05,
    attackType: 'melee',
    attackName: 'Martillazo',
    range: 60,
    knockback: 6
  },
  {
    id: 'troll',
    name: 'Troll',
    role: 'Bruto',
    color: '#65a30d',
    icon: '🪵',
    lore: 'Fuerza bruta, muchísima vida, muy lento.',
    hp: 220,
    attack: 30,
    speedStat: 1.8,
    cooldown: 1000,
    reduction: 0.20,
    dodge: 0.0,
    attackType: 'melee',
    attackName: 'Garrotazo',
    range: 65,
    knockback: 12
  },
  {
    id: 'hada',
    name: 'Hada',
    role: 'Frágil y rápida',
    color: '#f472b6',
    icon: '✨',
    lore: 'Ataques mágicos débiles pero muy frecuentes.',
    hp: 65,
    attack: 6,
    speedStat: 5.5,
    cooldown: 350,
    reduction: 0.0,
    dodge: 0.15,
    attackType: 'ranged',
    attackName: 'Chispa mágica',
    range: 300,
    projectile: { speed: 8, radius: 3, color: '#f472b6' }
  },
  {
    id: 'humano',
    name: 'Humano',
    role: 'Equilibrado',
    color: '#60a5fa',
    icon: '⚔️',
    lore: 'Sin debilidades marcadas ni grandes fortalezas.',
    hp: 120,
    attack: 14,
    speedStat: 3.2,
    cooldown: 600,
    reduction: 0.12,
    dodge: 0.08,
    attackType: 'melee',
    attackName: 'Estocada',
    range: 70,
    knockback: 4
  },
  {
    id: 'mago',
    name: 'Mago',
    role: 'Artillero arcano',
    color: '#a855f7',
    icon: '🔥',
    lore: 'Golpes a distancia devastadores, frágil en melee.',
    hp: 75,
    attack: 26,
    speedStat: 3.0,
    cooldown: 900,
    reduction: 0.05,
    dodge: 0.08,
    attackType: 'ranged',
    attackName: 'Bola de fuego',
    range: 460,
    projectile: { speed: 6.5, radius: 8, color: '#a855f7' },
    super: {
      name: 'Bola de fuego mayor',
      type: 'big_fireball',
      cooldown: 11000,
      damage: 42,
      radius: 14,
      speed: 4.5,
      range: 460,
      explosionRadius: 36
    }
  },
  {
    id: 'hobbit',
    name: 'Hobbit',
    role: 'Evasivo',
    color: '#facc15',
    icon: '🌀',
    lore: 'Débil pero durísimo de golpear.',
    hp: 70,
    attack: 8,
    speedStat: 5.2,
    cooldown: 450,
    reduction: 0.05,
    dodge: 0.25,
    attackType: 'ranged',
    attackName: 'Honda',
    range: 260,
    projectile: { speed: 10, radius: 3, color: '#facc15' }
  },
  {
    id: 'orco',
    name: 'Orco',
    role: 'Bruiser',
    color: '#ef4444',
    icon: '🪓',
    lore: 'Fuerza alta, defensa media, velocidad media-baja.',
    hp: 140,
    attack: 22,
    speedStat: 2.6,
    cooldown: 650,
    reduction: 0.15,
    dodge: 0.05,
    attackType: 'melee',
    attackName: 'Hachazo',
    range: 68,
    knockback: 7,
    super: {
      name: 'Furia orca',
      type: 'attack_buff',
      cooldown: 10000,
      multiplier: 1.5,
      duration: 3000
    }
  },
  {
    id: 'espectro',
    name: 'Espectro',
    role: 'Fantasma',
    color: '#94a3b8',
    icon: '👻',
    lore: 'Puede atravesar ataques y golpear ignorando parte de la defensa rival.',
    hp: 100,
    attack: 16,
    speedStat: 4.6,
    cooldown: 550,
    reduction: 0.10,
    dodge: 0.20,
    attackType: 'melee',
    attackName: 'Zarpazo espectral',
    range: 62,
    knockback: 3,
    penetration: 0.40,
    phaseOnDodge: 300
  }
];

// Valores máximos del roster, usados por ui.js para normalizar las barras de stats.
const STAT_MAX = {
  attack: Math.max(...CHARACTERS.map(c => c.attack)),
  hp: Math.max(...CHARACTERS.map(c => c.hp)),
  speedStat: Math.max(...CHARACTERS.map(c => c.speedStat))
};
