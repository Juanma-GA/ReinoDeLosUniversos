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

// Rarezas: costo de desbloqueo y color de marco en la pantalla de selección.
// El Elfo usa la rareza 'normal' solo a efectos de color de marco: es el personaje
// inicial y ya viene desbloqueado, por lo que su coste nunca se utiliza.
const RARITIES = {
  normal: { label: 'Normal', color: '#9ca3af', cost: 150 },
  raro: { label: 'Raro', color: '#3b82f6', cost: 300 },
  epico: { label: 'Épico', color: '#a855f7', cost: 500 },
  mitico: { label: 'Mítico', color: '#eab308', cost: 800 },
  legendario: { label: 'Legendario', color: '#f97316', cost: 1200 }
};

const CHARACTERS = [
  {
    id: 'elfo',
    name: 'Elfo',
    role: 'Francotirador ágil',
    color: '#4ade80',
    icon: '🏹',
    rarity: 'normal',
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
    projectile: { speed: 9, radius: 5, color: '#4ade80' },
    super: {
      name: 'Lluvia de flechas',
      type: 'multishot',
      cooldown: 8000,
      damagePerArrow: 14,
      spread: 0.22,
      range: 480
    }
  },
  {
    id: 'enano',
    name: 'Enano',
    role: 'Tanque',
    color: '#f59e0b',
    icon: '🔨',
    rarity: 'normal',
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
    knockback: 6,
    super: {
      name: 'Golpe sísmico',
      type: 'aoe_stun',
      cooldown: 10000,
      damage: 30,
      radius: 90,
      stunDuration: 1000
    }
  },
  {
    id: 'troll',
    name: 'Troll',
    role: 'Bruto',
    color: '#65a30d',
    icon: '🪵',
    rarity: 'epico',
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
    knockback: 12,
    super: {
      name: 'Embestida brutal',
      type: 'charge',
      cooldown: 12000,
      damage: 50,
      knockback: 20,
      speed: 13,
      duration: 450
    }
  },
  {
    id: 'hada',
    name: 'Hada',
    role: 'Frágil y rápida',
    color: '#f472b6',
    icon: '✨',
    rarity: 'raro',
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
    projectile: { speed: 8, radius: 3, color: '#f472b6' },
    super: {
      name: 'Polvo de niebla',
      type: 'phase_heal',
      cooldown: 9000,
      phaseDuration: 1500,
      healAmount: 10
    }
  },
  {
    id: 'humano',
    name: 'Humano',
    role: 'Equilibrado',
    color: '#60a5fa',
    icon: '⚔️',
    rarity: 'normal',
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
    knockback: 4,
    super: {
      name: 'Golpe certero',
      type: 'guaranteed_crit_melee',
      cooldown: 7000,
      damage: 28
    }
  },
  {
    id: 'mago',
    name: 'Mago',
    role: 'Artillero arcano',
    color: '#a855f7',
    icon: '🔥',
    rarity: 'epico',
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
    rarity: 'normal',
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
    projectile: { speed: 10, radius: 3, color: '#facc15' },
    super: {
      name: 'Ráfaga de piedras',
      type: 'burst',
      cooldown: 6000,
      damage: 7,
      count: 3,
      interval: 130
    }
  },
  {
    id: 'orco',
    name: 'Orco',
    role: 'Bruiser',
    color: '#ef4444',
    icon: '🪓',
    rarity: 'raro',
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
    rarity: 'epico',
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
    phaseOnDodge: 300,
    super: {
      name: 'Terror espectral',
      type: 'pure_damage_slow',
      cooldown: 9000,
      damage: 26,
      slowDuration: 1000,
      slowFactor: 0.4
    }
  },

  // ---------- 10 personajes adicionales (tanda 1 de 2) ----------
  {
    id: 'velociraptor',
    name: 'Velociraptor',
    role: 'Depredador veloz',
    color: '#84cc16',
    icon: '🦎',
    rarity: 'raro',
    lore: 'Zarpas veloces y letales, casi imposible de esquivar.',
    hp: 80,
    attack: 20,
    speedStat: 5.8,
    cooldown: 400,
    reduction: 0.03,
    dodge: 0.18,
    attackType: 'melee',
    attackName: 'Zarpazo',
    range: 55,
    knockback: 3,
    super: {
      name: 'Zarpazo certero',
      type: 'guaranteed_crit_melee',
      cooldown: 6000,
      damage: 32
    }
  },
  {
    id: 'pteranodonte',
    name: 'Pteranodonte',
    role: 'Ás aéreo',
    color: '#38bdf8',
    icon: '🦅',
    rarity: 'raro',
    lore: 'Domina los cielos y golpea en picado antes de que puedas reaccionar.',
    hp: 70,
    attack: 16,
    speedStat: 5.0,
    cooldown: 500,
    reduction: 0.03,
    dodge: 0.15,
    attackType: 'ranged',
    attackName: 'Picado',
    range: 320,
    projectile: { speed: 9, radius: 4, color: '#38bdf8' },
    super: {
      name: 'Ráfaga en picado',
      type: 'burst',
      cooldown: 6500,
      damage: 9,
      count: 3,
      interval: 120
    }
  },
  {
    id: 'minotauro',
    name: 'Minotauro',
    role: 'Bestia embistente',
    color: '#92400e',
    icon: '🐂',
    rarity: 'epico',
    lore: 'Fuerza bruta guiada por una ira ancestral.',
    hp: 190,
    attack: 27,
    speedStat: 2.4,
    cooldown: 750,
    reduction: 0.15,
    dodge: 0.04,
    attackType: 'melee',
    attackName: 'Cornada',
    range: 66,
    knockback: 8,
    super: {
      name: 'Carga del laberinto',
      type: 'charge',
      cooldown: 11000,
      damage: 46,
      knockback: 18,
      speed: 12,
      duration: 420
    }
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    role: 'Muralla acorazada',
    color: '#4d7c0f',
    icon: '🦏',
    rarity: 'epico',
    lore: 'Una muralla viviente que embiste sin piedad.',
    hp: 240,
    attack: 22,
    speedStat: 2.0,
    cooldown: 800,
    reduction: 0.25,
    dodge: 0.02,
    attackType: 'melee',
    attackName: 'Cornada triple',
    range: 64,
    knockback: 10,
    super: {
      name: 'Embestida de tres cuernos',
      type: 'charge',
      cooldown: 12000,
      damage: 40,
      knockback: 22,
      speed: 11,
      duration: 400
    }
  },
  {
    id: 'sirena',
    name: 'Sirena',
    role: 'Hechicera hipnótica',
    color: '#2dd4bf',
    icon: '🧜‍♀️',
    rarity: 'mitico',
    lore: 'Su canto hechiza y ralentiza a quien se acerca demasiado.',
    hp: 95,
    attack: 19,
    speedStat: 4.1,
    cooldown: 600,
    reduction: 0.08,
    dodge: 0.12,
    attackType: 'ranged',
    attackName: 'Nota encantada',
    range: 380,
    projectile: { speed: 7, radius: 5, color: '#2dd4bf' },
    super: {
      name: 'Canto hipnótico',
      type: 'pure_damage_slow',
      cooldown: 9000,
      damage: 22,
      slowDuration: 1800,
      slowFactor: 0.35
    }
  },

  // ---------- 10 personajes adicionales (tanda 2 de 2) ----------
  {
    id: 'unicornio',
    name: 'Unicornio',
    role: 'Sanadora veloz',
    color: '#f0abfc',
    icon: '🦄',
    rarity: 'mitico',
    lore: 'Veloz y luminoso, cura sus propias heridas al atacar.',
    hp: 100,
    attack: 21,
    speedStat: 4.8,
    cooldown: 550,
    reduction: 0.08,
    dodge: 0.14,
    attackType: 'ranged',
    attackName: 'Rayo de luz',
    range: 360,
    projectile: { speed: 8, radius: 5, color: '#f0abfc' },
    super: {
      name: 'Bendición lunar',
      type: 'phase_heal',
      cooldown: 9000,
      phaseDuration: 1200,
      healAmount: 24
    }
  },
  {
    id: 'estegosaurio',
    name: 'Estegosaurio',
    role: 'Tanque de púas',
    color: '#78716c',
    icon: '🐢',
    rarity: 'mitico',
    lore: 'Lento pero blindado, su cola con púas no perdona.',
    hp: 260,
    attack: 20,
    speedStat: 1.6,
    cooldown: 900,
    reduction: 0.28,
    dodge: 0.02,
    attackType: 'melee',
    attackName: 'Coletazo',
    range: 58,
    knockback: 9,
    super: {
      name: 'Latigazo de púas',
      type: 'aoe_stun',
      cooldown: 10000,
      damage: 34,
      radius: 85,
      stunDuration: 1100
    }
  },
  {
    id: 'braquiosaurio',
    name: 'Braquiosaurio',
    role: 'Coloso lento',
    color: '#57534e',
    icon: '🦕',
    rarity: 'mitico',
    lore: 'Un coloso lento con una vida casi inagotable.',
    hp: 300,
    attack: 18,
    speedStat: 1.4,
    cooldown: 950,
    reduction: 0.30,
    dodge: 0.0,
    attackType: 'melee',
    attackName: 'Pisotón',
    range: 70,
    knockback: 10,
    super: {
      name: 'Temblor sísmico',
      type: 'attack_buff',
      cooldown: 11000,
      multiplier: 1.6,
      duration: 3500
    }
  },
  {
    id: 'dragon',
    name: 'Dragón',
    role: 'Devastador alado',
    color: '#f97316',
    icon: '🐉',
    rarity: 'legendario',
    lore: 'Vuela sobre la arena y arrasa con su aliento de fuego.',
    hp: 230,
    attack: 32,
    speedStat: 3.4,
    cooldown: 700,
    reduction: 0.18,
    dodge: 0.10,
    attackType: 'ranged',
    attackName: 'Bocanada de fuego',
    range: 400,
    projectile: { speed: 6, radius: 9, color: '#f97316' },
    super: {
      name: 'Aliento del dragón',
      type: 'big_fireball',
      cooldown: 12000,
      damage: 55,
      radius: 18,
      speed: 5,
      range: 420,
      explosionRadius: 44
    }
  },
  {
    id: 'trex',
    name: 'T-Rex',
    role: 'Depredador supremo',
    color: '#dc2626',
    icon: '🦖',
    rarity: 'legendario',
    lore: 'El depredador definitivo: fuerza bruta y un mordisco letal.',
    hp: 250,
    attack: 34,
    speedStat: 2.2,
    cooldown: 850,
    reduction: 0.18,
    dodge: 0.03,
    attackType: 'melee',
    attackName: 'Mordisco',
    range: 68,
    knockback: 12,
    super: {
      name: 'Mordisco devastador',
      type: 'guaranteed_crit_melee',
      cooldown: 8000,
      damage: 58
    }
  }
];

// Valores máximos del roster, usados por ui.js para normalizar las barras de stats.
const STAT_MAX = {
  attack: Math.max(...CHARACTERS.map(c => c.attack)),
  hp: Math.max(...CHARACTERS.map(c => c.hp)),
  speedStat: Math.max(...CHARACTERS.map(c => c.speedStat))
};
