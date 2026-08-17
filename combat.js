// combat.js
// Lógica de combate: entidades, movimiento, ataques, proyectiles, daño e IA.

const ARENA_W = 900;
const ARENA_H = 600;
const ENTITY_RADIUS = 22;

// Multiplica el alcance de impacto de los ataques cuerpo a cuerpo (Enano, Troll,
// Humano, Orco, Espectro) respecto al valor base `range` definido en characters.js.
const MELEE_RANGE_MULTIPLIER = 2;

// Reduce la velocidad de movimiento de la CPU respecto al stat base del personaje,
// sin tocar dicho stat (que sigue rigiendo cadencia/esquiva y el movimiento del jugador).
const AI_SPEED_MULTIPLIER = 0.75;

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Alcance de impacto efectivo de un personaje: los melee se duplican, los ranged
// mantienen su alcance base (que ya representa el rango del proyectil).
function getAttackRange(def) {
  return def.attackType === 'melee' ? def.range * MELEE_RANGE_MULTIPLIER : def.range;
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
    this.isMoving = false;

    // Súper ataque: no disponible al inicio del combate, debe cargar su cooldown completo.
    this.superLastUsedAt = performance.now();
    this.buffAttackUntil = 0;
    this.buffAttackMultiplier = 1;

    // Estados aplicados por súper ataques (propios o del rival).
    this.stunnedUntil = 0; // Enano: Golpe sísmico
    this.slowUntil = 0; // Espectro: Terror espectral
    this.slowFactor = 1;
    this.distortUntil = 0; // Espectro: distorsión visual sobre el objetivo afectado
    this.pendingBurst = []; // Hobbit: Ráfaga de piedras (disparos escalonados en el tiempo)

    // Troll: Embestida brutal (carga en línea recta).
    this.chargeUntil = 0;
    this.chargeDirX = 0;
    this.chargeDirY = 0;
    this.chargeSpeed = 0;
    this.chargeDamage = 0;
    this.chargeKnockback = 0;
    this.chargeHit = false;
  }

  get isPhasing() {
    return performance.now() < this.phaseUntil;
  }

  get isStunned() {
    return performance.now() < this.stunnedUntil;
  }

  get isCharging() {
    return performance.now() < this.chargeUntil;
  }

  canAttack(now) {
    return now - this.lastAttackTime >= this.def.cooldown;
  }

  canUseSuper(now) {
    return !!this.def.super && now - this.superLastUsedAt >= this.def.super.cooldown;
  }
}

// Resuelve el impacto de un ataque de `attacker` sobre `target`.
// `options` permite a los súper ataques modificar la resolución normal:
//  - damageOverride: usa este daño en vez de attacker.def.attack (ya con el multiplicador de furia aplicado si corresponde)
//  - guaranteed: ignora la probabilidad de esquiva del objetivo
//  - ignoreReduction: ignora por completo la reducción de daño del objetivo (daño puro)
function applyDamage(attacker, target, now, options) {
  options = options || {};
  if (target.isPhasing) {
    return { hit: false, reason: 'phase' };
  }
  if (!options.guaranteed && Math.random() < target.def.dodge) {
    if (target.def.phaseOnDodge) target.phaseUntil = now + target.def.phaseOnDodge;
    target.dodgeFlashUntil = now + 300;
    return { hit: false, reason: 'dodge' };
  }
  let reduction = options.ignoreReduction ? 0 : target.def.reduction;
  if (attacker.def.penetration) {
    reduction = reduction * (1 - attacker.def.penetration);
  }
  const baseAttack = now < attacker.buffAttackUntil
    ? attacker.def.attack * attacker.buffAttackMultiplier
    : attacker.def.attack;
  const atk = options.damageOverride != null ? options.damageOverride : baseAttack;
  const dmg = Math.max(1, Math.round(atk * (1 - reduction)));
  target.hp = Math.max(0, target.hp - dmg);
  target.hitFlashUntil = now + 200;
  if (target.hp <= 0) target.alive = false;
  return { hit: true, dmg };
}

// Ejecuta el ataque característico de `attacker` contra `target`.
function performAttack(attacker, target, now, projectiles) {
  if (!attacker.canAttack(now) || attacker.isStunned || attacker.isCharging) return null;
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
  if (dist > getAttackRange(attacker.def) + target.radius) return { hit: false, reason: 'range' };

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

function updateProjectiles(projectiles, now, effects) {
  for (const p of projectiles) {
    if (p.dead) continue;
    p.prevX = p.x;
    p.prevY = p.y;
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
      applyDamage(p.owner, p.target, now, p.options);
      if (p.explosionRadius && effects) {
        effects.push({
          type: 'explosion',
          x: p.x,
          y: p.y,
          color: p.color,
          radius: p.explosionRadius,
          startTime: now,
          duration: 380
        });
      }
      p.dead = true;
    }
  }
  return projectiles.filter(p => !p.dead);
}

// Elimina los efectos visuales transitorios (explosiones, ondas, auras) ya expirados.
function updateEffects(effects, now) {
  return effects.filter(e => now - e.startTime < e.duration);
}

// Ejecuta el súper ataque de `attacker` (tecla R / IA) contra `target` si el cooldown lo permite.
// `ctx` = { projectiles, effects }, los mismos arrays vivos que usa el loop principal.
function performSuper(attacker, target, now, ctx) {
  const superDef = attacker.def.super;
  if (!superDef || !attacker.canUseSuper(now) || attacker.isStunned || attacker.isCharging) return false;

  attacker.superLastUsedAt = now;
  attacker.attackFlashUntil = now + 200;

  switch (superDef.type) {
    case 'attack_buff': {
      attacker.buffAttackUntil = now + superDef.duration;
      attacker.buffAttackMultiplier = superDef.multiplier;
      ctx.effects.push({
        type: 'buffAura',
        entity: attacker,
        color: '#ff5a5a',
        startTime: now,
        duration: superDef.duration
      });
      return true;
    }
    case 'big_fireball': {
      ctx.projectiles.push({
        x: attacker.x + Math.cos(attacker.facing) * (attacker.radius + 4),
        y: attacker.y + Math.sin(attacker.facing) * (attacker.radius + 4),
        vx: Math.cos(attacker.facing) * superDef.speed,
        vy: Math.sin(attacker.facing) * superDef.speed,
        radius: superDef.radius,
        color: '#ff7a3c',
        owner: attacker,
        target,
        traveled: 0,
        maxRange: superDef.range,
        explosionRadius: superDef.explosionRadius,
        options: { damageOverride: superDef.damage },
        dead: false
      });
      return true;
    }
    // Elfo: 3 flechas en abanico alrededor de la dirección actual, cada una con estela.
    case 'multishot': {
      const p = attacker.def.projectile;
      const angles = [-superDef.spread, 0, superDef.spread];
      for (const offset of angles) {
        const angle = attacker.facing + offset;
        ctx.projectiles.push({
          x: attacker.x + Math.cos(angle) * (attacker.radius + 4),
          y: attacker.y + Math.sin(angle) * (attacker.radius + 4),
          vx: Math.cos(angle) * p.speed * 1.1,
          vy: Math.sin(angle) * p.speed * 1.1,
          radius: p.radius + 1,
          color: p.color,
          owner: attacker,
          target,
          traveled: 0,
          maxRange: superDef.range,
          trail: true,
          options: { damageOverride: superDef.damagePerArrow },
          dead: false
        });
      }
      return true;
    }
    // Enano: daño + aturdimiento en área alrededor de sí mismo. Ronda visual: onda expansiva + temblor.
    case 'aoe_stun': {
      const d = Math.hypot(target.x - attacker.x, target.y - attacker.y);
      if (target.alive && d <= superDef.radius + target.radius) {
        const result = applyDamage(attacker, target, now, { damageOverride: superDef.damage, guaranteed: true });
        if (result.hit) {
          target.stunnedUntil = now + superDef.stunDuration;
        }
      }
      ctx.effects.push({
        type: 'shockwave',
        x: attacker.x,
        y: attacker.y,
        color: '#f59e0b',
        radius: superDef.radius,
        startTime: now,
        duration: 400
      });
      ctx.effects.push({ type: 'shake', startTime: now, duration: 250, magnitude: 6 });
      return true;
    }
    // Troll: carga en línea recta, resuelta frame a frame por updateCharge().
    case 'charge': {
      attacker.chargeDirX = Math.cos(attacker.facing);
      attacker.chargeDirY = Math.sin(attacker.facing);
      attacker.chargeUntil = now + superDef.duration;
      attacker.chargeSpeed = superDef.speed;
      attacker.chargeDamage = superDef.damage;
      attacker.chargeKnockback = superDef.knockback;
      attacker.chargeHit = false;
      ctx.effects.push({ type: 'dustTrail', entity: attacker, startTime: now, duration: superDef.duration + 200 });
      return true;
    }
    // Hada: intangible (esquiva todo, reutiliza phaseUntil) + cura una porción de su vida máxima.
    case 'phase_heal': {
      attacker.phaseUntil = now + superDef.phaseDuration;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + superDef.healAmount);
      ctx.effects.push({
        type: 'sparkleAura',
        entity: attacker,
        startTime: now,
        duration: superDef.phaseDuration
      });
      return true;
    }
    // Humano: golpe melee normal pero con daño fijo x2 y garantizado (ignora esquiva).
    case 'guaranteed_crit_melee': {
      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      const dist = Math.hypot(dx, dy);
      if (dist > getAttackRange(attacker.def) + target.radius) return true;
      const angleToTarget = Math.atan2(dy, dx);
      const diff = Math.abs(normalizeAngle(angleToTarget - attacker.facing));
      if (diff > Math.PI / 2.2) return true;

      const result = applyDamage(attacker, target, now, { damageOverride: superDef.damage, guaranteed: true });
      if (result.hit) {
        target.kbVX = Math.cos(angleToTarget) * 8;
        target.kbVY = Math.sin(angleToTarget) * 8;
        ctx.effects.push({ type: 'critFlash', x: target.x, y: target.y, startTime: now, duration: 250 });
        ctx.effects.push({ type: 'critText', x: target.x, y: target.y - target.radius - 16, startTime: now, duration: 700 });
      }
      return true;
    }
    // Hobbit: 3 disparos de honda escalonados en el tiempo, procesados por processPendingBursts().
    case 'burst': {
      attacker.pendingBurst = [];
      for (let i = 0; i < superDef.count; i++) {
        attacker.pendingBurst.push({ fireAt: now + i * superDef.interval, angle: attacker.facing });
      }
      return true;
    }
    // Espectro: daño puro (ignora reducción) + ralentiza y distorsiona visualmente al objetivo.
    case 'pure_damage_slow': {
      const dx = target.x - attacker.x;
      const dy = target.y - attacker.y;
      const dist = Math.hypot(dx, dy);
      const range = getAttackRange(attacker.def) + 10;
      if (dist > range + target.radius) return true;
      const angleToTarget = Math.atan2(dy, dx);
      const diff = Math.abs(normalizeAngle(angleToTarget - attacker.facing));
      if (diff > Math.PI / 1.5) return true;

      const result = applyDamage(attacker, target, now, { damageOverride: superDef.damage, ignoreReduction: true, guaranteed: true });
      if (result.hit) {
        target.slowUntil = now + superDef.slowDuration;
        target.slowFactor = superDef.slowFactor;
        target.distortUntil = now + superDef.slowDuration;
      }
      ctx.effects.push({ type: 'terrorAura', entity: attacker, color: '#7c3aed', startTime: now, duration: 400 });
      return true;
    }
    default:
      return false;
  }
}

// Actualiza la embestida del Troll (o cualquier futura carga): mueve en línea recta y
// resuelve el impacto una única vez. Devuelve true mientras la carga esté en curso
// (el llamador debe omitir el movimiento normal de la entidad ese frame).
function updateCharge(entity, target, now, dtScale, effects) {
  if (!entity.isCharging) return false;

  const speed = entity.chargeSpeed * dtScale;
  entity.x += entity.chargeDirX * speed;
  entity.y += entity.chargeDirY * speed;
  entity.x = Math.max(entity.radius, Math.min(ARENA_W - entity.radius, entity.x));
  entity.y = Math.max(entity.radius, Math.min(ARENA_H - entity.radius, entity.y));
  entity.isMoving = true;

  if (!entity.chargeHit && target.alive) {
    const d = Math.hypot(entity.x - target.x, entity.y - target.y);
    if (d <= entity.radius + target.radius) {
      entity.chargeHit = true;
      const result = applyDamage(entity, target, now, { damageOverride: entity.chargeDamage, guaranteed: true });
      if (result.hit) {
        target.kbVX = entity.chargeDirX * entity.chargeKnockback;
        target.kbVY = entity.chargeDirY * entity.chargeKnockback;
        if (effects) {
          effects.push({ type: 'explosion', x: target.x, y: target.y, color: '#c98a4a', radius: 30, startTime: now, duration: 300 });
        }
      }
      entity.chargeUntil = now; // La embestida termina en el momento del impacto.
    }
  }
  return true;
}

// Dispara los proyectiles pendientes de una ráfaga (Hobbit) cuando les llega su turno.
function processPendingBursts(entity, target, now, ctx) {
  if (!entity.pendingBurst || entity.pendingBurst.length === 0) return;
  entity.pendingBurst = entity.pendingBurst.filter(shot => {
    if (now < shot.fireAt) return true;
    const p = entity.def.projectile;
    ctx.projectiles.push({
      x: entity.x + Math.cos(shot.angle) * (entity.radius + 4),
      y: entity.y + Math.sin(shot.angle) * (entity.radius + 4),
      vx: Math.cos(shot.angle) * p.speed * 1.15,
      vy: Math.sin(shot.angle) * p.speed * 1.15,
      radius: p.radius,
      color: p.color,
      owner: entity,
      target,
      traveled: 0,
      maxRange: entity.def.range,
      trail: true,
      options: { damageOverride: entity.def.super.damage },
      dead: false
    });
    ctx.effects.push({ type: 'speedLines', x: entity.x, y: entity.y, angle: shot.angle, startTime: now, duration: 200 });
    return false;
  });
}

// Mueve una entidad según un vector de dirección normalizado (dx, dy) y aplica knockback + límites de arena.
// `speedMultiplier` permite ajustar la velocidad de movimiento resultante sin tocar el stat base (usado por la IA).
// Un aturdimiento (Enano) bloquea el movimiento voluntario; una ralentización (Espectro) lo reduce.
function moveEntity(entity, dx, dy, dtScale, speedMultiplier = 1, now) {
  now = now != null ? now : performance.now();
  const stunned = now < entity.stunnedUntil;
  const len = stunned ? 0 : Math.hypot(dx, dy);
  entity.isMoving = len > 0;
  if (len > 0) {
    const slow = now < entity.slowUntil ? entity.slowFactor : 1;
    const speed = entity.def.speedStat * dtScale * speedMultiplier * slow;
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
// `ctx` = { projectiles, effects }.
function updateAI(cpu, player, now, dtScale, ctx) {
  if (updateCharge(cpu, player, now, dtScale, ctx.effects)) return;
  processPendingBursts(cpu, player, now, ctx);
  if (cpu.isStunned) {
    moveEntity(cpu, 0, 0, dtScale, AI_SPEED_MULTIPLIER, now); // sigue aplicando knockback/fricción
    return;
  }

  const dx = player.x - cpu.x;
  const dy = player.y - cpu.y;
  const dist = Math.hypot(dx, dy) || 1;
  cpu.facing = Math.atan2(dy, dx);

  const isRanged = cpu.def.attackType === 'ranged';
  const atkRange = isRanged ? cpu.def.range * 0.85 : getAttackRange(cpu.def) + 8;
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

  moveEntity(cpu, moveX, moveY, dtScale, AI_SPEED_MULTIPLIER, now);

  if (dist <= atkRange && cpu.canAttack(now)) {
    performAttack(cpu, player, now, ctx.projectiles);
  }

  // Súper ataque: lo intenta cuando el rival está cerca (melee) o dentro de su alcance (ranged).
  if (cpu.canUseSuper(now) && dist <= atkRange * 1.3) {
    performSuper(cpu, player, now, ctx);
  }
}
