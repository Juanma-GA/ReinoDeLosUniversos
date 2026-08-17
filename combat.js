// combat.js
// Lógica de combate: entidades, movimiento, ataques, proyectiles, daño e IA.

const ARENA_W = 900;
const ARENA_H = 600;
const ENTITY_RADIUS = 22;

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

class Entity {
  constructor(charDef, x, y, isPlayer) {
    this.def = charDef;
    this.x = x;
    this.y = y;
    this.radius = ENTITY_RADIUS;
    this.isPlayer = isPlayer;
    this.hp = charDef.hp;
    this.maxHp = charDef.hp;
    this.facing = isPlayer ? Math.PI : 0;
    this.lastAttackTime = -Infinity;
    this.phaseUntil = 0;
    this.attackFlashUntil = 0;
    this.hitFlashUntil = 0;
    this.dodgeFlashUntil = 0;
    this.kbVX = 0;
    this.kbVY = 0;
    this.alive = true;
  }

  get isPhasing() {
    return performance.now() < this.phaseUntil;
  }

  canAttack(now) {
    return now - this.lastAttackTime >= this.def.cooldown;
  }
}

// Resuelve el impacto de un ataque de `attacker` sobre `target`.
function applyDamage(attacker, target, now) {
  if (target.isPhasing) {
    return { hit: false, reason: 'phase' };
  }
  if (Math.random() < target.def.dodge) {
    if (target.def.phaseOnDodge) target.phaseUntil = now + target.def.phaseOnDodge;
    target.dodgeFlashUntil = now + 300;
    return { hit: false, reason: 'dodge' };
  }
  let reduction = target.def.reduction;
  if (attacker.def.penetration) {
    reduction = reduction * (1 - attacker.def.penetration);
  }
  const dmg = Math.max(1, Math.round(attacker.def.attack * (1 - reduction)));
  target.hp = Math.max(0, target.hp - dmg);
  target.hitFlashUntil = now + 200;
  if (target.hp <= 0) target.alive = false;
  return { hit: true, dmg };
}

// Ejecuta el ataque característico de `attacker` contra `target`.
function performAttack(attacker, target, now, projectiles) {
  if (!attacker.canAttack(now)) return null;
  attacker.lastAttackTime = now;
  attacker.attackFlashUntil = now + 150;

  if (attacker.def.attackType === 'ranged') {
    const p = attacker.def.projectile;
    projectiles.push({
      x: attacker.x + Math.cos(attacker.facing) * (attacker.radius + 4),
      y: attacker.y + Math.sin(attacker.facing) * (attacker.radius + 4),
      vx: Math.cos(attacker.facing) * p.speed,
      vy: Math.sin(attacker.facing) * p.speed,
      radius: p.radius,
      color: p.color,
      owner: attacker,
      target,
      traveled: 0,
      maxRange: attacker.def.range,
      dead: false
    });
    return null;
  }

  // Ataque cuerpo a cuerpo: comprueba distancia + arco frontal.
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const dist = Math.hypot(dx, dy);
  if (dist > attacker.def.range + target.radius) return { hit: false, reason: 'range' };

  const angleToTarget = Math.atan2(dy, dx);
  const diff = Math.abs(normalizeAngle(angleToTarget - attacker.facing));
  if (diff > Math.PI / 2.2) return { hit: false, reason: 'angle' };

  const result = applyDamage(attacker, target, now);
  if (result.hit && attacker.def.knockback) {
    target.kbVX = Math.cos(angleToTarget) * attacker.def.knockback;
    target.kbVY = Math.sin(angleToTarget) * attacker.def.knockback;
  }
  return result;
}

function updateProjectiles(projectiles, now) {
  for (const p of projectiles) {
    if (p.dead) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.traveled += Math.hypot(p.vx, p.vy);

    if (p.x < 0 || p.x > ARENA_W || p.y < 0 || p.y > ARENA_H || p.traveled > p.maxRange) {
      p.dead = true;
      continue;
    }
    if (!p.target.alive) {
      p.dead = true;
      continue;
    }
    const d = Math.hypot(p.x - p.target.x, p.y - p.target.y);
    if (d <= p.radius + p.target.radius) {
      applyDamage(p.owner, p.target, now);
      p.dead = true;
    }
  }
  return projectiles.filter(p => !p.dead);
}

// Mueve una entidad según un vector de dirección normalizado (dx, dy) y aplica knockback + límites de arena.
function moveEntity(entity, dx, dy, dtScale) {
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    const speed = entity.def.speedStat * dtScale;
    entity.x += (dx / len) * speed;
    entity.y += (dy / len) * speed;
  }
  // Knockback con fricción.
  entity.x += entity.kbVX * dtScale;
  entity.y += entity.kbVY * dtScale;
  entity.kbVX *= 0.85;
  entity.kbVY *= 0.85;
  if (Math.abs(entity.kbVX) < 0.05) entity.kbVX = 0;
  if (Math.abs(entity.kbVY) < 0.05) entity.kbVY = 0;

  entity.x = Math.max(entity.radius, Math.min(ARENA_W - entity.radius, entity.x));
  entity.y = Math.max(entity.radius, Math.min(ARENA_H - entity.radius, entity.y));
}

// IA básica de la CPU: persigue/kitea, ataca cuando puede y a veces esquiva desplazándose.
function updateAI(cpu, player, now, dtScale, projectiles) {
  const dx = player.x - cpu.x;
  const dy = player.y - cpu.y;
  const dist = Math.hypot(dx, dy) || 1;
  cpu.facing = Math.atan2(dy, dx);

  const isRanged = cpu.def.attackType === 'ranged';
  const atkRange = isRanged ? cpu.def.range * 0.85 : cpu.def.range + 8;
  const preferredDist = isRanged ? atkRange * 0.6 : atkRange * 0.55;

  let moveX = 0;
  let moveY = 0;

  const dodgeRoll = Math.random();
  if (dodgeRoll < cpu.def.dodge * 0.02) {
    // Esquiva activa: desplazamiento lateral brusco.
    const perp = cpu.facing + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
    moveX = Math.cos(perp);
    moveY = Math.sin(perp);
  } else if (dist > preferredDist + 20) {
    moveX = dx / dist;
    moveY = dy / dist;
  } else if (isRanged && dist < preferredDist - 40) {
    moveX = -dx / dist;
    moveY = -dy / dist;
  } else {
    const perp = cpu.facing + Math.PI / 2;
    moveX = Math.cos(perp) * 0.4;
    moveY = Math.sin(perp) * 0.4;
  }

  moveEntity(cpu, moveX, moveY, dtScale);

  if (dist <= atkRange && cpu.canAttack(now)) {
    performAttack(cpu, player, now, projectiles);
  }
}
