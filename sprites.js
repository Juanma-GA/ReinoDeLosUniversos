// sprites.js
// Sprites 2D dibujados a mano con Canvas para cada criatura (sin assets externos).
// Cada personaje se pre-renderiza UNA VEZ por pose en un canvas offscreen (SPRITE_CACHE)
// y luego se reutiliza con drawImage en cada frame — nunca se redibuja desde cero en el loop.

const SPRITE_SIZE = 80;   // tamaño del canvas offscreen (cuadrado)
const SPRITE_ANCHOR = 40; // punto (SPRITE_ANCHOR, SPRITE_ANCHOR) del canvas = posición world (entity.x, entity.y)

// Poses pre-renderizadas: reposo, dos fases de caminar (para alternar) y ataque.
const SPRITE_POSES = {
  idle: { leg: 0, arm: 0, attack: false },
  walk1: { leg: 1, arm: 1, attack: false },
  walk2: { leg: -1, arm: -1, attack: false },
  attack: { leg: 0, arm: 0, attack: true }
};

// ---------- Primitivas de dibujo (coordenadas relativas al ancla del personaje) ----------

function sEllipse(ctx, x, y, rx, ry, color, rot) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  ctx.fill();
}

function sCircle(ctx, x, y, r, color) {
  sEllipse(ctx, x, y, r, r, color);
}

function sLimb(ctx, x1, y1, x2, y2, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ---------- Dibujo por personaje ----------
// Convención: figura orientada mirando hacia la derecha; combat.js/game.js la
// invierte horizontalmente (flip) cuando el personaje mira a la izquierda.

function drawTrollSprite(ctx, pose) {
  const skin = '#7c9066';
  const skinDark = '#5c7048';
  const loincloth = '#4d3b23';
  const club = '#6b4a2b';
  const clubDark = '#4a3319';

  const legOffset = pose.leg * 4;
  const armSwing = pose.arm * 6;
  const attackExtend = pose.attack ? 16 : 0;

  // Piernas gruesas y cortas
  sEllipse(ctx, -9 + legOffset, 21, 7, 9, skinDark);
  sEllipse(ctx, 9 - legOffset, 21, 7, 9, skinDark);

  // Joroba en el hombro/espalda
  sEllipse(ctx, 11, -13, 12, 10, skinDark);

  // Torso voluminoso
  sEllipse(ctx, 0, -3, 19, 19, skin);

  // Taparrabos
  sEllipse(ctx, 0, 12, 14, 7, loincloth);

  // Brazo izquierdo (libre, colgando)
  sLimb(ctx, -14, -9, -19 - armSwing * 0.4, 7, 7, skin);
  sCircle(ctx, -19 - armSwing * 0.4, 9, 5, skin);

  // Brazo derecho sosteniendo el garrote
  const handX = 17 + attackExtend;
  const handY = 3 - armSwing;
  sLimb(ctx, 14, -9, handX, handY, 7, skin);
  sCircle(ctx, handX, handY, 5, skin);

  // Garrote con pinchos
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(-0.6 + (pose.attack ? -0.5 : 0));
  ctx.fillStyle = club;
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.lineTo(4, 2);
  ctx.lineTo(6, -24);
  ctx.lineTo(-6, -24);
  ctx.closePath();
  ctx.fill();
  sEllipse(ctx, 0, -26, 8, 9, club);
  ctx.fillStyle = clubDark;
  [-31, -25, -19].forEach(dy => {
    ctx.beginPath();
    ctx.moveTo(-7, dy);
    ctx.lineTo(-11, dy - 3);
    ctx.lineTo(-7, dy + 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, dy);
    ctx.lineTo(11, dy - 3);
    ctx.lineTo(7, dy + 3);
    ctx.fill();
  });
  ctx.restore();

  // Cabeza pequeña, frente pesada
  sCircle(ctx, 0, -29, 10, skin);
  sEllipse(ctx, 0, -34, 9, 4, skinDark);

  // Colmillos
  ctx.fillStyle = '#f4f0e6';
  ctx.beginPath();
  ctx.moveTo(-5, -25);
  ctx.lineTo(-7, -19);
  ctx.lineTo(-3, -23);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, -25);
  ctx.lineTo(7, -19);
  ctx.lineTo(3, -23);
  ctx.fill();

  // Ojos pequeños
  sCircle(ctx, -4, -30, 1.4, '#1a1a1a');
  sCircle(ctx, 4, -30, 1.4, '#1a1a1a');
}

// ---------- Registro y construcción de la caché de sprites ----------

const CHARACTER_SPRITE_DRAWERS = {
  troll: drawTrollSprite
};

const SPRITE_CACHE = {};

function buildSpriteFrame(drawFn, pose) {
  const c = document.createElement('canvas');
  c.width = SPRITE_SIZE;
  c.height = SPRITE_SIZE;
  const cctx = c.getContext('2d');
  cctx.translate(SPRITE_ANCHOR, SPRITE_ANCHOR);
  drawFn(cctx, pose);
  return c;
}

function buildSpriteCache() {
  Object.keys(CHARACTER_SPRITE_DRAWERS).forEach(id => {
    const drawFn = CHARACTER_SPRITE_DRAWERS[id];
    SPRITE_CACHE[id] = {
      idle: buildSpriteFrame(drawFn, SPRITE_POSES.idle),
      walk1: buildSpriteFrame(drawFn, SPRITE_POSES.walk1),
      walk2: buildSpriteFrame(drawFn, SPRITE_POSES.walk2),
      attack: buildSpriteFrame(drawFn, SPRITE_POSES.attack)
    };
  });
}

buildSpriteCache();
