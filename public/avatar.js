/* Cadence — présentateur illustré
 * Personnage vectoriel dessiné image par image : respiration, clignements,
 * mouvements de tête, gestes et bouche pilotée par l'intensité de la voix.
 * Unité locale : le buste mesure 1000 unités de haut, origine en bas au centre.
 */
export const SKINS = ['#F7DCC9', '#EEC5A5', '#DDA67F', '#BD8058', '#91603F', '#5F3C28'];
export const HAIR_COLORS = ['#1C1716', '#3E271C', '#7A4E2F', '#B98A52', '#E2C68E', '#A8432C', '#9AA0A8', '#5A3DF0'];
export const HAIR_STYLES = { court: 'Court', long: 'Long', carre: 'Carré', chignon: 'Chignon', boucles: 'Bouclé', rase: 'Rasé' };
export const DEFAULT_CHAR = { skin: '#DDA67F', hair: 'court', hairColor: '#3E271C', outfit: 'marque', outfitColor: '#2B2F45', glasses: false, beard: false, earrings: false };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function shade(hex, k) {
  const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16) || 0;
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Bouche « parlante » simulée quand il n'y a pas d'enregistrement : syllabes et pauses. */
export function synthTalk(t) {
  const word = Math.sin(t * 2.9) * 0.5 + Math.sin(t * 1.3 + 2) * 0.5;
  if (word < -0.55) return 0;
  return clamp(0.25 + 0.75 * Math.abs(Math.sin(t * 13.1)) * (0.55 + 0.45 * Math.abs(Math.sin(t * 4.7 + 1))));
}

/**
 * Dessine le personnage.
 * @param ctx   contexte 2D
 * @param c     configuration (peau, cheveux, tenue…)
 * @param x,y   bas du buste, au centre, en pixels
 * @param s     pixels par unité (hauteur du buste = 1000 * s)
 * @param a     animation { t, talk 0..1, gesture 0..1, dir ±1 (côté du geste), outfit, accent }
 */
export function drawCharacter(ctx, c, x, y, s, a) {
  const cfg = { ...DEFAULT_CHAR, ...(c || {}) };
  const t = a.t || 0, talk = clamp(a.talk || 0), dir = a.dir || 1;
  const outfit = cfg.outfit === 'marque' && a.outfit ? a.outfit : cfg.outfitColor;
  const skin = cfg.skin, hairC = cfg.hairColor;
  const breathe = Math.sin(t * 2.2) * 5;
  const bob = Math.sin(t * 1.3) * 4 - talk * 5 + Math.sin(t * 8.5) * talk * 2.5;
  const tilt = Math.sin(t * 0.65) * 0.035 + Math.sin(t * 6.3) * talk * 0.018 + dir * 0.015 * (a.gesture || 0);
  const blinkCycle = (t + 0.7) % 3.9, blink = blinkCycle < 0.13 || (blinkCycle > 0.32 && blinkCycle < 0.42 && Math.floor((t + 0.7) / 3.9) % 3 === 1);
  const raise = talk * 9 + Math.max(0, Math.sin(t * 1.7)) * 3;

  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Cheveux arrière
  ctx.save(); ctx.translate(0, -560 + bob); ctx.rotate(tilt);
  ctx.fillStyle = hairC;
  if (cfg.hair === 'long') { rrect(ctx, -190, -150, 380, 420, 150); ctx.fill(); }
  else if (cfg.hair === 'carre') { rrect(ctx, -182, -140, 364, 290, 110); ctx.fill(); }
  else if (cfg.hair === 'chignon') { ctx.beginPath(); ctx.arc(0, -205, 72, 0, 6.283); ctx.fill(); }
  else if (cfg.hair === 'boucles') {
    for (let i = 0; i <= 12; i++) { const ang = Math.PI * (1.02 + i * 0.08); ctx.beginPath(); ctx.arc(Math.cos(ang) * 168, Math.sin(ang) * 175 + 10, 58, 0, 6.283); ctx.fill(); }
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 170, 60, 52, 0, 6.283); ctx.fill(); }
  }
  ctx.restore();

  // Torse
  ctx.save(); ctx.translate(0, breathe * 0.4); ctx.scale(1, 1 + breathe / 900);
  ctx.fillStyle = outfit;
  ctx.beginPath(); ctx.moveTo(-290, 40); ctx.lineTo(-290, -200); ctx.quadraticCurveTo(-288, -300, -175, -322); ctx.lineTo(175, -322);
  ctx.quadraticCurveTo(288, -300, 290, -200); ctx.lineTo(290, 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(outfit, 0.86);
  ctx.beginPath(); ctx.moveTo(-74, -322); ctx.lineTo(0, -196); ctx.lineTo(74, -322); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(outfit, -0.25); ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-74, -322); ctx.lineTo(-20, -150); ctx.moveTo(74, -322); ctx.lineTo(20, -150); ctx.stroke();
  if (a.accent) { ctx.fillStyle = a.accent; ctx.beginPath(); ctx.arc(-170 * dir, -235, 16, 0, 6.283); ctx.fill(); }
  ctx.restore();

  // Cou
  ctx.fillStyle = shade(skin, -0.12);
  rrect(ctx, -50, -420 + bob * 0.5, 100, 130, 30); ctx.fill();

  // Tête
  ctx.save(); ctx.translate(0, -560 + bob); ctx.rotate(tilt);
  ctx.fillStyle = shade(skin, -0.05);
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 142, 12, 26, 38, 0, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 0, 146, 172, 0, 0, 6.283); ctx.fill();
  // Joues
  ctx.fillStyle = 'rgba(232,110,110,0.16)';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 86, 48, 28, 0, 6.283); ctx.fill(); }
  // Barbe
  if (cfg.beard) {
    ctx.fillStyle = hairC;
    ctx.beginPath(); ctx.moveTo(-142, 15); ctx.bezierCurveTo(-132, 150, -64, 192, 0, 192); ctx.bezierCurveTo(64, 192, 132, 150, 142, 15);
    ctx.bezierCurveTo(112, 92, 62, 108, 0, 108); ctx.bezierCurveTo(-62, 108, -112, 92, -142, 15); ctx.closePath(); ctx.fill();
  }
  // Yeux
  const look = dir * 4 + Math.sin(t * 0.9) * 2;
  for (const sx of [-1, 1]) {
    if (blink) { ctx.strokeStyle = '#2A1F1D'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx * 52 - 14, -8); ctx.quadraticCurveTo(sx * 52, -2, sx * 52 + 14, -8); ctx.stroke(); }
    else {
      ctx.fillStyle = '#231B1A'; ctx.beginPath(); ctx.ellipse(sx * 52 + look, -10, 13, 17, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(sx * 52 + look + 4, -15, 4.5, 0, 6.283); ctx.fill();
    }
  }
  // Sourcils
  ctx.fillStyle = shade(hairC, -0.1);
  for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 54, -56 - raise); ctx.rotate(sx * -0.08); rrect(ctx, -30, -6, 60, 12, 6); ctx.fill(); ctx.restore(); }
  // Nez
  ctx.strokeStyle = shade(skin, -0.22); ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-4, 12); ctx.quadraticCurveTo(2, 44, 14, 44); ctx.stroke();
  // Bouche
  const my = 84;
  if (talk < 0.06) {
    ctx.strokeStyle = '#6E2F2B'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, my - 22, 32, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  } else {
    const w = 30 + 14 * talk + Math.sin(t * 11) * 3 * talk, h = 7 + 36 * talk;
    ctx.fillStyle = '#4A1E1E'; ctx.beginPath(); ctx.ellipse(0, my, w, h, 0, 0, 6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, my, w, h, 0, 0, 6.283); ctx.clip();
    ctx.fillStyle = '#F4F1EE'; ctx.fillRect(-w, my - h, w * 2, Math.min(10, h * 0.45));
    ctx.fillStyle = '#C8615E'; ctx.beginPath(); ctx.ellipse(0, my + h * 0.75, w * 0.6, h * 0.5, 0, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  // Cheveux avant
  ctx.fillStyle = hairC;
  if (cfg.hair === 'rase') {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 147, 173, 0, 0, 6.283); ctx.clip();
    ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(0, -150, 190, 120, 0, 0, 6.283); ctx.fill(); ctx.restore();
  } else if (cfg.hair === 'court' || cfg.hair === 'chignon' || cfg.hair === 'boucles') {
    ctx.beginPath(); ctx.moveTo(-152, -10); ctx.bezierCurveTo(-166, -150, -66, -205, 10, -198); ctx.bezierCurveTo(112, -196, 168, -126, 152, -10);
    ctx.bezierCurveTo(134, -82, 76, -116, 18, -112); ctx.bezierCurveTo(-30, -126, -112, -98, -152, -10); ctx.closePath(); ctx.fill();
    if (cfg.hair === 'boucles') for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-120 + i * 40, -118 - Math.sin(i) * 10, 34, 0, 6.283); ctx.fill(); }
  } else {
    ctx.beginPath(); ctx.moveTo(-158, 30); ctx.bezierCurveTo(-176, -150, -40, -218, 34, -202); ctx.bezierCurveTo(146, -190, 180, -76, 160, 50);
    ctx.bezierCurveTo(146, -54, 96, -108, 26, -120); ctx.bezierCurveTo(-36, -108, -112, -62, -158, 30); ctx.closePath(); ctx.fill();
  }
  // Lunettes
  if (cfg.glasses) {
    ctx.strokeStyle = '#1A1A1E'; ctx.lineWidth = 7;
    rrect(ctx, -98, -40, 84, 58, 20); ctx.stroke(); rrect(ctx, 14, -40, 84, 58, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -16); ctx.quadraticCurveTo(0, -24, 14, -16); ctx.stroke();
  }
  if (cfg.earrings) { ctx.fillStyle = '#E8B84A'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 144, 58, 10, 0, 6.283); ctx.fill(); } }
  ctx.restore();

  // Bras qui fait le geste (devant le torse)
  const g = clamp(a.gesture || 0);
  if (g > 0.02) {
    ctx.save(); ctx.scale(dir, 1);
    const sx = 215, sy = -282 + breathe * 0.4;
    const a1 = (96 - 46 * g) * Math.PI / 180, a2 = (92 - 108 * g + Math.sin(t * 3) * 7 * g) * Math.PI / 180;
    const ex = sx + Math.cos(a1) * 210, ey = sy + Math.sin(a1) * 210;
    const hx = ex + Math.cos(a2) * 185, hy = ey + Math.sin(a2) * 185;
    ctx.strokeStyle = shade(outfit, -0.12); ctx.lineWidth = 92;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx + Math.cos(a2) * 30, hy + Math.sin(a2) * 30, 46, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
