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

function drawElfoSprite(ctx, pose) {
  const skin = '#f0c090';
  const hair = '#e8d27a';
  const tunic = '#4ade80';
  const tunicDark = '#2f9e57';
  const boot = '#5a3b23';

  const legOffset = pose.leg * 4;
  const armSwing = pose.arm * 5;
  const attackExtend = pose.attack ? 10 : 0;

  // Piernas finas
  sLimb(ctx, -5 + legOffset, 6, -6 + legOffset, 22, 5, boot);
  sLimb(ctx, 5 - legOffset, 6, 6 - legOffset, 22, 5, boot);

  // Tunica trasera sutil + torso esbelto
  sEllipse(ctx, 0, -2, 6, 16, tunicDark);
  sEllipse(ctx, 0, -4, 8, 15, tunic);
  sEllipse(ctx, 0, 6, 8, 5, boot);

  // Arco (mano delantera lo sostiene, mano trasera tensa la cuerda)
  const bowX = 14 + (pose.attack ? 4 : 0);
  const bowY = -6;
  const pull = pose.attack ? -10 : -2;

  sLimb(ctx, 8, -10, bowX, bowY, 5, skin);
  sLimb(ctx, -8, -10, bowX + pull, bowY - armSwing * 0.2, 5, skin);

  ctx.save();
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bowX, bowY - 13);
  ctx.quadraticCurveTo(bowX + 10, bowY, bowX, bowY + 13);
  ctx.stroke();

  ctx.strokeStyle = '#e8e0c8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bowX, bowY - 13);
  ctx.lineTo(bowX + pull, bowY);
  ctx.lineTo(bowX, bowY + 13);
  ctx.stroke();

  if (pose.attack) {
    ctx.strokeStyle = '#c9a45c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bowX + pull, bowY);
    ctx.lineTo(bowX + attackExtend + 12, bowY);
    ctx.stroke();
  }
  ctx.restore();

  // Cabeza con orejas puntiagudas y pelo claro
  sCircle(ctx, 0, -24, 9, skin);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-8, -25);
  ctx.lineTo(-15, -27);
  ctx.lineTo(-7, -20);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -25);
  ctx.lineTo(15, -27);
  ctx.lineTo(7, -20);
  ctx.fill();

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -28, 9, Math.PI, Math.PI * 2);
  ctx.fill();
  sEllipse(ctx, -8, -22, 2, 5, hair);
  sEllipse(ctx, 8, -22, 2, 5, hair);

  sCircle(ctx, -3, -24, 1.2, '#2a2a2a');
  sCircle(ctx, 3, -24, 1.2, '#2a2a2a');
}

function drawEnanoSprite(ctx, pose) {
  const skin = '#e0a877';
  const beard = '#8b5a2b';
  const armor = '#8a8a92';
  const armorDark = '#6b6b74';
  const trim = '#f59e0b';
  const hammerHead = '#5c5c66';
  const hammerHandle = '#6b4a2b';

  const legOffset = pose.leg * 3;
  const armSwing = pose.arm * 5;
  const attackExtend = pose.attack ? 14 : 0;

  // Piernas cortas y anchas
  sEllipse(ctx, -8 + legOffset, 20, 6, 8, armorDark);
  sEllipse(ctx, 8 - legOffset, 20, 6, 8, armorDark);

  // Torso ancho acorazado + cinturón
  sEllipse(ctx, 0, -2, 17, 16, armor);
  sEllipse(ctx, 0, 10, 15, 4, trim);

  // Brazo libre
  sLimb(ctx, -15, -6, -20 - armSwing * 0.3, 8, 6, skin);
  sCircle(ctx, -20 - armSwing * 0.3, 8, 4, skin);

  // Brazo con martillo
  const handX = 16 + attackExtend;
  const handY = 2 - armSwing;
  sLimb(ctx, 15, -6, handX, handY, 6, skin);

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(0.3 + (pose.attack ? -0.8 : 0));
  ctx.fillStyle = hammerHandle;
  ctx.fillRect(-2, -4, 4, 22);
  ctx.fillStyle = hammerHead;
  ctx.fillRect(-9, -14, 18, 12);
  ctx.strokeStyle = armorDark;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-9, -14, 18, 12);
  ctx.restore();

  // Barba grande
  ctx.fillStyle = beard;
  ctx.beginPath();
  ctx.moveTo(-9, -20);
  ctx.quadraticCurveTo(-11, -2, 0, 6);
  ctx.quadraticCurveTo(11, -2, 9, -20);
  ctx.fill();

  // Cabeza con casco
  sCircle(ctx, 0, -24, 10, skin);
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.arc(0, -26, 10, Math.PI, Math.PI * 2);
  ctx.fill();
  sEllipse(ctx, 0, -26, 11, 3, trim);

  sCircle(ctx, -4, -23, 1.2, '#2a2a2a');
  sCircle(ctx, 4, -23, 1.2, '#2a2a2a');
}

function drawHadaSprite(ctx, pose) {
  const skin = '#ffd9c2';
  const dress = '#f472b6';
  const hair = '#fff3c4';
  const wing = 'rgba(244,242,255,0.55)';

  const legOffset = pose.leg * 3;
  const armSwing = pose.arm * 5;
  const attackExtend = pose.attack ? 8 : 0;
  const flutter = pose.arm * 3;

  // Alas translúcidas (detrás del cuerpo)
  ctx.fillStyle = wing;
  ctx.beginPath();
  ctx.ellipse(-9, -10 - flutter, 10, 15, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(9, -10 + flutter, 10, 15, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Piernas finas
  sLimb(ctx, -3 + legOffset, 4, -4 + legOffset, 14, 3, skin);
  sLimb(ctx, 3 - legOffset, 4, 4 - legOffset, 14, 3, skin);

  // Vestido
  ctx.fillStyle = dress;
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.lineTo(7, -8);
  ctx.lineTo(10, 6);
  ctx.lineTo(-10, 6);
  ctx.fill();
  sEllipse(ctx, 0, -8, 7, 8, dress);

  // Brazo con varita
  const handX = 12 + attackExtend;
  const handY = -6 - armSwing * 0.5;
  sLimb(ctx, 6, -8, handX, handY, 3, skin);
  ctx.save();
  ctx.strokeStyle = '#c9a45c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(handX + 10, handY - 6);
  ctx.stroke();
  const starGlow = pose.attack ? '#fff7c0' : '#ffe58a';
  sCircle(ctx, handX + 10, handY - 6, pose.attack ? 4 : 2.5, starGlow);
  ctx.restore();

  // Brazo libre
  sLimb(ctx, -6, -8, -11 - armSwing * 0.3, -2, 3, skin);

  // Cabeza
  sCircle(ctx, 0, -18, 7, skin);
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -21, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  sCircle(ctx, -2.5, -18, 1, '#2a2a2a');
  sCircle(ctx, 2.5, -18, 1, '#2a2a2a');

  // Destellos/partículas
  sCircle(ctx, -14, -20, 1.4, 'rgba(255,255,255,0.85)');
  sCircle(ctx, 15, -14, 1.1, 'rgba(255,255,255,0.7)');
  sCircle(ctx, -12, 2, 1.1, 'rgba(255,255,255,0.6)');
}

function drawHumanoSprite(ctx, pose) {
  const skin = '#f0c090';
  const hairColor = '#5a3b23';
  const tunic = '#60a5fa';
  const tunicDark = '#3f7fd4';
  const cape = '#2f5aa8';
  const blade = '#c9ccd6';
  const hilt = '#8a5a2b';

  const legOffset = pose.leg * 4;
  const armSwing = pose.arm * 5;
  const attackExtend = pose.attack ? 14 : 0;

  // Capa
  ctx.fillStyle = cape;
  ctx.beginPath();
  ctx.moveTo(-9, -14);
  ctx.lineTo(9, -14);
  ctx.lineTo(6, 14);
  ctx.lineTo(-6, 14);
  ctx.fill();

  // Piernas
  sLimb(ctx, -5 + legOffset, 8, -6 + legOffset, 22, 6, tunicDark);
  sLimb(ctx, 5 - legOffset, 8, 6 - legOffset, 22, 6, tunicDark);

  // Torso
  sEllipse(ctx, 0, -3, 10, 15, tunic);
  sEllipse(ctx, 0, 8, 10, 4, hilt);

  // Brazo libre
  sLimb(ctx, -10, -8, -15 - armSwing * 0.3, 6, 5, skin);

  // Brazo con espada
  const handX = 13 + attackExtend;
  const handY = 0 - armSwing;
  sLimb(ctx, 10, -8, handX, handY, 5, skin);

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(-0.3 + (pose.attack ? -0.7 : 0));
  ctx.fillStyle = hilt;
  ctx.fillRect(-2, 0, 4, 6);
  ctx.fillStyle = '#c9a45c';
  ctx.fillRect(-6, -2, 12, 3);
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(-3, -2);
  ctx.lineTo(3, -2);
  ctx.lineTo(2, -24);
  ctx.lineTo(-2, -24);
  ctx.fill();
  ctx.restore();

  // Cabeza
  sCircle(ctx, 0, -22, 9, skin);
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(0, -25, 9, Math.PI, Math.PI * 2);
  ctx.fill();
  sCircle(ctx, -3, -22, 1.2, '#2a2a2a');
  sCircle(ctx, 3, -22, 1.2, '#2a2a2a');
}

function drawMagoSprite(ctx, pose) {
  const skin = '#f0c090';
  const robe = '#a855f7';
  const robeDark = '#7c3aed';
  const trim = '#e8d27a';
  const staffColor = '#6b4a2b';

  const armSwing = pose.arm * 4;
  const attackExtend = pose.attack ? 10 : 0;
  const robeSway = pose.leg * 3;

  // Túnica cónica
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.lineTo(6, -18);
  ctx.lineTo(16 + robeSway, 24);
  ctx.lineTo(-16 + robeSway, 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = robeDark;
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.lineTo(4, 6);
  ctx.lineTo(9 + robeSway, 24);
  ctx.lineTo(-9 + robeSway, 24);
  ctx.fill();

  sEllipse(ctx, 0, 0, 9, 3, trim);

  // Brazo libre
  sLimb(ctx, -8, -12, -13 - armSwing * 0.3, 2, 5, robe);

  // Brazo con bastón y orbe
  const handX = 14 + attackExtend;
  const handY = -4 - armSwing;
  sLimb(ctx, 8, -12, handX, handY, 5, robe);

  ctx.save();
  ctx.strokeStyle = staffColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(handX, handY + 18);
  ctx.lineTo(handX, handY - 20);
  ctx.stroke();
  const orbGlow = pose.attack ? '#e9d5ff' : robe;
  ctx.shadowColor = orbGlow;
  ctx.shadowBlur = pose.attack ? 12 : 6;
  sCircle(ctx, handX, handY - 22, pose.attack ? 6 : 4.5, orbGlow);
  ctx.restore();

  // Cabeza y sombrero puntiagudo
  sCircle(ctx, 0, -24, 9, skin);
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(-10, -28);
  ctx.lineTo(10, -28);
  ctx.lineTo(0, -50);
  ctx.closePath();
  ctx.fill();
  sEllipse(ctx, 0, -28, 12, 3, robeDark);

  // Barba blanca corta
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.quadraticCurveTo(0, -10, 6, -20);
  ctx.fill();

  sCircle(ctx, -3, -25, 1.1, '#2a2a2a');
  sCircle(ctx, 3, -25, 1.1, '#2a2a2a');
}

function drawHobbitSprite(ctx, pose) {
  const skin = '#f0c090';
  const shirt = '#facc15';
  const vest = '#8b5a2b';
  const hair = '#7a4a23';
  const footHair = '#5a3b23';

  const legOffset = pose.leg * 3;
  const armSwing = pose.arm * 5;
  const attackExtend = pose.attack ? 10 : 0;

  // Pies grandes y peludos
  sEllipse(ctx, -9 + legOffset, 20, 8, 5, skin);
  sEllipse(ctx, 9 - legOffset, 20, 8, 5, skin);
  sCircle(ctx, -11 + legOffset, 18, 1.3, footHair);
  sCircle(ctx, -7 + legOffset, 18, 1.3, footHair);
  sCircle(ctx, 11 - legOffset, 18, 1.3, footHair);
  sCircle(ctx, 7 - legOffset, 18, 1.3, footHair);

  // Cuerpo bajo y redondeado
  sEllipse(ctx, 0, 2, 14, 14, shirt);
  sEllipse(ctx, 0, 8, 12, 6, vest);

  // Brazo libre
  sLimb(ctx, -12, -2, -17 - armSwing * 0.3, 10, 5, skin);

  // Brazo con honda
  const handX = 15 + attackExtend;
  const handY = 6 - armSwing;
  sLimb(ctx, 12, -2, handX, handY, 5, skin);

  ctx.save();
  ctx.strokeStyle = '#5a3b23';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(handX - 4, handY - 8);
  ctx.lineTo(handX, handY);
  ctx.lineTo(handX + 4, handY - 8);
  ctx.stroke();
  ctx.strokeStyle = '#c9a45c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(handX - 4, handY - 8);
  ctx.lineTo(handX + (pose.attack ? -6 : 0), handY + (pose.attack ? 4 : 2));
  ctx.lineTo(handX + 4, handY - 8);
  ctx.stroke();
  if (pose.attack) {
    sCircle(ctx, handX - 6, handY + 4, 2, '#8a8a86');
  }
  ctx.restore();

  // Cabeza grande y redonda
  sCircle(ctx, 0, -14, 11, skin);
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -16, 11, Math.PI * 0.9, Math.PI * 2.1);
  ctx.fill();
  sCircle(ctx, -4, -13, 1.2, '#2a2a2a');
  sCircle(ctx, 4, -13, 1.2, '#2a2a2a');
}

function drawOrcoSprite(ctx, pose) {
  const skin = '#4a6b3a';
  const skinDark = '#38522a';
  const strap = '#ef4444';
  const axeHandle = '#5c3d20';
  const axeHead = '#9098a0';

  const legOffset = pose.leg * 4;
  const armSwing = pose.arm * 6;
  const attackExtend = pose.attack ? 16 : 0;

  // Piernas musculosas
  sEllipse(ctx, -9 + legOffset, 20, 7, 10, skinDark);
  sEllipse(ctx, 9 - legOffset, 20, 7, 10, skinDark);

  // Torso musculoso con hombros marcados
  sEllipse(ctx, 0, -4, 16, 17, skin);
  sCircle(ctx, -14, -14, 7, skin);
  sCircle(ctx, 14, -14, 7, skin);

  // Correas
  ctx.strokeStyle = strap;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, -16);
  ctx.lineTo(8, 10);
  ctx.stroke();
  sEllipse(ctx, 0, 10, 13, 5, strap);

  // Brazo libre
  sLimb(ctx, -16, -8, -21 - armSwing * 0.3, 8, 8, skin);
  sCircle(ctx, -21 - armSwing * 0.3, 10, 5, skin);

  // Brazo con hacha grande
  const handX = 18 + attackExtend;
  const handY = 4 - armSwing;
  sLimb(ctx, 16, -8, handX, handY, 8, skin);

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(0.5 + (pose.attack ? -0.9 : 0));
  ctx.fillStyle = axeHandle;
  ctx.fillRect(-2, -4, 4, 26);
  ctx.fillStyle = axeHead;
  ctx.beginPath();
  ctx.moveTo(-2, -20);
  ctx.lineTo(-16, -26);
  ctx.lineTo(-16, -8);
  ctx.lineTo(-2, -12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, -20);
  ctx.lineTo(16, -26);
  ctx.lineTo(16, -8);
  ctx.lineTo(2, -12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cabeza con colmillos
  sCircle(ctx, 0, -28, 10, skin);
  sEllipse(ctx, 0, -33, 9, 4, skinDark);
  ctx.fillStyle = '#f4f0e6';
  ctx.beginPath();
  ctx.moveTo(-4, -24);
  ctx.lineTo(-6, -18);
  ctx.lineTo(-2, -22);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -24);
  ctx.lineTo(6, -18);
  ctx.lineTo(2, -22);
  ctx.fill();
  sCircle(ctx, -4, -29, 1.4, '#ffd400');
  sCircle(ctx, 4, -29, 1.4, '#ffd400');
}

function drawEspectroSprite(ctx, pose) {
  const body = 'rgba(210,220,235,0.55)';
  const bodyDark = 'rgba(160,175,195,0.5)';
  const aura = 'rgba(148,163,184,0.35)';
  const eye = '#bff7ff';

  const sway = pose.leg * 4;
  const armSwing = pose.arm * 5;
  const attackExtend = pose.attack ? 14 : 0;

  // Aura difusa
  const grad = ctx.createRadialGradient(0, -4, 4, 0, -4, 26);
  grad.addColorStop(0, aura);
  grad.addColorStop(1, 'rgba(148,163,184,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, -4, 26, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo tipo túnica ondulante, sin piernas definidas (flota)
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.quadraticCurveTo(-15 + sway, 10, -10 + sway, 22);
  ctx.quadraticCurveTo(-3 + sway, 16, 0, 22);
  ctx.quadraticCurveTo(3 - sway, 16, 10 - sway, 22);
  ctx.quadraticCurveTo(15 - sway, 10, 13, -6);
  ctx.quadraticCurveTo(0, -14, -13, -6);
  ctx.fill();

  // Brazo libre translúcido
  sLimb(ctx, -12, -8, -17 - armSwing * 0.3, 2, 5, bodyDark);

  // Brazo/zarpa de ataque
  const handX = 14 + attackExtend;
  const handY = -4 - armSwing;
  sLimb(ctx, 12, -8, handX, handY, 5, bodyDark);
  ctx.strokeStyle = 'rgba(230,240,250,0.8)';
  ctx.lineWidth = 1.4;
  [-3, 0, 3].forEach(dy => {
    ctx.beginPath();
    ctx.moveTo(handX, handY + dy);
    ctx.lineTo(handX + 6, handY + dy * 1.4);
    ctx.stroke();
  });

  // Cabeza
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, -20, 10, 0, Math.PI * 2);
  ctx.fill();

  // Ojos brillantes
  ctx.save();
  ctx.fillStyle = eye;
  ctx.shadowColor = eye;
  ctx.shadowBlur = 6;
  sCircle(ctx, -3.5, -20, 1.6, eye);
  sCircle(ctx, 3.5, -20, 1.6, eye);
  ctx.restore();
}

// ---------- Registro y construcción de la caché de sprites ----------

const CHARACTER_SPRITE_DRAWERS = {
  elfo: drawElfoSprite,
  enano: drawEnanoSprite,
  troll: drawTrollSprite,
  hada: drawHadaSprite,
  humano: drawHumanoSprite,
  mago: drawMagoSprite,
  hobbit: drawHobbitSprite,
  orco: drawOrcoSprite,
  espectro: drawEspectroSprite
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
