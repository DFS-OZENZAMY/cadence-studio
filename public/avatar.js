/* Cadence — personnages cartoon
 * Personnages vectoriels entièrement paramétrables, dessinés image par image :
 * respiration, clignements, mouvements de tête, gestes, bouche pilotée par la voix.
 * Unité locale : le buste mesure environ 820 unités de haut, origine en bas au centre.
 */

/* ---------------------------------------------------------------
   Options
   --------------------------------------------------------------- */
export const SKINS = ['#F7DCC9', '#EEC5A5', '#DDA67F', '#BD8058', '#91603F', '#5F3C28'];
export const FURS = ['#F2A65A', '#E07B39', '#8C5A3C', '#C9B8A6', '#8C8C94', '#3A3A40', '#F4EDE4', '#9AA7B8', '#7FB3D5', '#B39DDB'];
export const HAIR_COLORS = ['#1C1716', '#3E271C', '#7A4E2F', '#B98A52', '#E2C68E', '#A8432C', '#9AA0A8', '#F2F0EC', '#5A3DF0', '#E0559B', '#2FA37A'];
export const EYE_COLORS = ['#3B2A20', '#2F6FB0', '#3E8E5A', '#8A6A2E', '#6A4FFF', '#4CD3FF', '#1C1C1C'];
export const OUTFIT_COLORS = ['#2B2F45', '#1F3B5F', '#3E6B48', '#8E2F3A', '#C27A08', '#5A3DF0', '#E0559B', '#F2F0EC', '#2A2A2A'];

export const OPTIONS = {
  species: { humain: 'Humain', robot: 'Robot', chat: 'Chat', renard: 'Renard', ours: 'Ours' },
  style: { classique: 'Classique', mascotte: 'Mascotte', contour: 'Contour BD' },
  face: { ovale: 'Ovale', rond: 'Rond', carre: 'Carré' },
  eyes: { rond: 'Ronds', amande: 'Amande', grands: 'Grands', joyeux: 'Rieurs', points: 'Points' },
  brows: { fins: 'Fins', epais: 'Épais', aucun: 'Aucun' },
  nose: { courbe: 'Courbé', point: 'Discret', aucun: 'Aucun' },
  mouth: { sourire: 'Sourire', grand: 'Grand sourire', neutre: 'Neutre' },
  hair: { court: 'Court', meches: 'Mèche', crete: 'Banane', long: 'Long', carre: 'Carré', queue: 'Queue', chignon: 'Chignon', boucles: 'Bouclé', afro: 'Afro', rase: 'Rasé', chauve: 'Chauve' },
  outfitType: { veste: 'Veste', chemise: 'Chemise et cravate', sweat: 'Sweat à capuche', tshirt: 'T-shirt', colroule: 'Col roulé' },
  glasses: { aucune: 'Aucune', rondes: 'Rondes', carrees: 'Carrées', soleil: 'Solaires' },
  hat: { aucun: 'Aucun', casquette: 'Casquette', bonnet: 'Bonnet', casque: 'Casque audio' },
  beard: { aucune: 'Aucune', courte: 'Courte', pleine: 'Pleine', moustache: 'Moustache' },
};
// Compatibilité avec la première version
export const HAIR_STYLES = OPTIONS.hair;

export const DEFAULT_CHAR = {
  species: 'humain', style: 'classique', skin: '#DDA67F',
  face: 'ovale', eyes: 'rond', eyeColor: '#3B2A20', brows: 'fins', nose: 'courbe', mouth: 'sourire', blush: true, freckles: false,
  hair: 'court', hairColor: '#3E271C',
  outfitType: 'veste', outfit: 'marque', outfitColor: '#2B2F45',
  glasses: 'aucune', hat: 'aucun', beard: 'aucune', earrings: false,
};
export function normChar(c) {
  const x = { ...DEFAULT_CHAR, ...(c || {}) };
  if (x.glasses === true) x.glasses = 'carrees'; else if (x.glasses === false) x.glasses = 'aucune';
  if (x.beard === true) x.beard = 'pleine'; else if (x.beard === false) x.beard = 'aucune';
  for (const k of Object.keys(OPTIONS)) if (!OPTIONS[k][x[k]]) x[k] = DEFAULT_CHAR[k];
  return x;
}

/* ---------------------------------------------------------------
   Personnages prêts à l'emploi
   --------------------------------------------------------------- */
const H = (o) => ({ ...DEFAULT_CHAR, ...o });
export const PRESETS = [
  { name: 'Léa', role: 'Conseillère', config: H({ skin: '#EEC5A5', hair: 'long', hairColor: '#A8432C', eyes: 'grands', eyeColor: '#3E8E5A', glasses: 'rondes', freckles: true }) },
  { name: 'Karim', role: 'Coach', config: H({ skin: '#91603F', hair: 'crete', hairColor: '#1C1716', beard: 'courte', outfitType: 'sweat', brows: 'epais' }) },
  { name: 'Sofia', role: 'Experte', config: H({ skin: '#DDA67F', hair: 'chignon', hairColor: '#3E271C', eyes: 'amande', earrings: true, outfitType: 'colroule', outfit: 'perso', outfitColor: '#2A2A2A' }) },
  { name: 'Hugo', role: 'Développeur', config: H({ style: 'contour', skin: '#F7DCC9', hair: 'meches', hairColor: '#B98A52', hat: 'casque', glasses: 'carrees', outfitType: 'tshirt' }) },
  { name: 'Amina', role: 'Directrice', config: H({ skin: '#5F3C28', hair: 'afro', hairColor: '#1C1716', eyes: 'grands', earrings: true, face: 'rond' }) },
  { name: 'Théo', role: 'Commercial', config: H({ skin: '#EEC5A5', hair: 'court', hairColor: '#7A4E2F', outfitType: 'chemise', mouth: 'grand', face: 'carre' }) },
  { name: 'Nina', role: 'Créative', config: H({ style: 'mascotte', skin: '#DDA67F', hair: 'queue', hairColor: '#5A3DF0', hat: 'bonnet', eyes: 'joyeux', outfitType: 'sweat', outfit: 'perso', outfitColor: '#E0559B' }) },
  { name: 'Malik', role: 'Consultant', config: H({ skin: '#BD8058', hair: 'rase', hairColor: '#1C1716', beard: 'pleine', glasses: 'carrees', outfitType: 'colroule', face: 'carre', brows: 'epais' }) },
  { name: 'Chloé', role: 'Étudiante', config: H({ skin: '#F7DCC9', hair: 'carre', hairColor: '#E2C68E', eyes: 'grands', eyeColor: '#2F6FB0', outfitType: 'tshirt', outfit: 'perso', outfitColor: '#3E6B48' }) },
  { name: 'Yann', role: 'Fondateur', config: H({ skin: '#EEC5A5', hair: 'chauve', hairColor: '#9AA0A8', beard: 'moustache', glasses: 'rondes', mouth: 'grand' }) },
  { name: 'Rose', role: 'Artisane', config: H({ skin: '#F7DCC9', hair: 'boucles', hairColor: '#9AA0A8', glasses: 'rondes', earrings: true, outfitType: 'colroule', outfit: 'perso', outfitColor: '#8E2F3A', mouth: 'grand' }) },
  { name: 'Inès', role: 'Sportive', config: H({ skin: '#91603F', hair: 'queue', hairColor: '#3E271C', hat: 'casquette', outfitType: 'sweat', eyes: 'amande' }) },
  { name: 'Robo', role: 'Assistant', config: H({ species: 'robot', style: 'mascotte', skin: '#9AA7B8', eyeColor: '#4CD3FF', outfitType: 'tshirt', blush: false }) },
  { name: 'Félix', role: 'Mascotte', config: H({ species: 'chat', style: 'mascotte', skin: '#F2A65A', eyes: 'grands', eyeColor: '#3E8E5A', outfitType: 'chemise', brows: 'aucun' }) },
  { name: 'Rox', role: 'Guide', config: H({ species: 'renard', skin: '#E07B39', eyes: 'amande', eyeColor: '#8A6A2E', outfitType: 'sweat', brows: 'aucun' }) },
  { name: 'Bruno', role: 'Animateur', config: H({ species: 'ours', style: 'mascotte', skin: '#8C5A3C', glasses: 'rondes', outfitType: 'colroule', outfit: 'perso', outfitColor: '#C27A08', brows: 'aucun' }) },
];

export function randomChar() {
  const pick = (o) => { const k = Array.isArray(o) ? o : Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  const species = Math.random() < 0.8 ? 'humain' : pick(['robot', 'chat', 'renard', 'ours']);
  const human = species === 'humain';
  return normChar({
    species, style: pick(OPTIONS.style), skin: human ? pick(SKINS) : pick(FURS),
    face: pick(OPTIONS.face), eyes: pick(OPTIONS.eyes), eyeColor: pick(EYE_COLORS), brows: human ? pick(OPTIONS.brows) : 'aucun',
    nose: pick(OPTIONS.nose), mouth: pick(OPTIONS.mouth), blush: Math.random() < 0.6, freckles: human && Math.random() < 0.25,
    hair: pick(OPTIONS.hair), hairColor: pick(HAIR_COLORS), outfitType: pick(OPTIONS.outfitType),
    outfit: Math.random() < 0.5 ? 'marque' : 'perso', outfitColor: pick(OUTFIT_COLORS),
    glasses: Math.random() < 0.35 ? pick(['rondes', 'carrees', 'soleil']) : 'aucune',
    hat: Math.random() < 0.25 ? pick(['casquette', 'bonnet', 'casque']) : 'aucun',
    beard: human && Math.random() < 0.3 ? pick(['courte', 'pleine', 'moustache']) : 'aucune', earrings: human && Math.random() < 0.3,
  });
}

/* ---------------------------------------------------------------
   Outils de dessin
   --------------------------------------------------------------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function toRgb(col) {
  const m = String(col).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  const n = parseInt(String(col).replace('#', '').slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, k) {
  const c = toRgb(hex).map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const ell = (cx, cy, rx, ry) => { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); return p; };
const circ = (cx, cy, r) => ell(cx, cy, r, r);
function rr(x, y, w, h, r) {
  const p = new Path2D(); r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
  return p;
}
const path = (fn) => { const p = new Path2D(); fn(p); p.closePath(); return p; };

/** Bouche « parlante » simulée quand il n'y a pas d'enregistrement. */
export function synthTalk(t) {
  const word = Math.sin(t * 2.9) * 0.5 + Math.sin(t * 1.3 + 2) * 0.5;
  if (word < -0.55) return 0;
  return clamp(0.25 + 0.75 * Math.abs(Math.sin(t * 13.1)) * (0.55 + 0.45 * Math.abs(Math.sin(t * 4.7 + 1))));
}

/* ---------------------------------------------------------------
   Dessin du personnage
   --------------------------------------------------------------- */
/**
 * @param ctx contexte 2D ; c configuration ; x,y bas du buste (px) ; s pixels par unité
 * @param a animation { t, talk 0..1, gesture 0..1, dir ±1, outfit (couleur client), accent }
 */
export function drawCharacter(ctx, c, x, y, s, a) {
  const cfg = normChar(c);
  const t = a.t || 0, talk = clamp(a.talk || 0), dir = a.dir || 1, g = clamp(a.gesture || 0);
  const human = cfg.species === 'humain', robot = cfg.species === 'robot';
  const chibi = cfg.style === 'mascotte', outline = cfg.style === 'contour';
  const OL = '#1E1B24';
  const outfit = cfg.outfit === 'marque' && a.outfit ? a.outfit : cfg.outfitColor;
  const accent = a.accent || '#FF8A3D';
  const skin = cfg.skin, hairC = cfg.hairColor;
  const tx = chibi ? 0.84 : 1, ty = chibi ? 0.88 : 1, hs = chibi ? 1.3 : 1;
  const shoulderY = -322 * ty;
  const headY = shoulderY - (chibi ? 55 : 70) - 168 * hs;
  const breathe = Math.sin(t * 2.2) * 5;
  const bob = Math.sin(t * 1.3) * 4 - talk * 5 + Math.sin(t * 8.5) * talk * 2.5;
  const tilt = Math.sin(t * 0.65) * 0.035 + Math.sin(t * 6.3) * talk * 0.018 + dir * 0.015 * g;
  const cyc = (t + 0.7) % 3.9;
  const blink = cyc < 0.13 || (cyc > 0.32 && cyc < 0.42 && Math.floor((t + 0.7) / 3.9) % 3 === 1);
  const raise = talk * 9 + Math.max(0, Math.sin(t * 1.7)) * 3;

  const paint = (p, color, lw = 8) => { ctx.fillStyle = color; ctx.fill(p); if (outline) { ctx.strokeStyle = OL; ctx.lineWidth = lw; ctx.stroke(p); } };

  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const head = (fn) => { ctx.save(); ctx.translate(0, headY + bob); ctx.rotate(tilt); ctx.scale(hs, hs); fn(); ctx.restore(); };

  /* ---- Éléments derrière : cheveux longs, queue, afro, capuche ---- */
  if (human) head(() => {
    if (cfg.hair === 'long') paint(rr(-190, -150, 380, 430, 150), hairC);
    else if (cfg.hair === 'carre') paint(rr(-182, -140, 364, 290, 110), hairC);
    else if (cfg.hair === 'chignon') paint(circ(0, -205, 72), hairC);
    else if (cfg.hair === 'afro') { for (let i = 0; i < 14; i++) { const ang = (i / 14) * Math.PI * 2; paint(circ(Math.cos(ang) * 175, -40 + Math.sin(ang) * 165, 82), hairC, 6); } paint(ell(0, -40, 215, 205), hairC); }
    else if (cfg.hair === 'boucles') {
      for (let i = 0; i <= 12; i++) { const ang = Math.PI * (1.02 + i * 0.08); paint(circ(Math.cos(ang) * 168, Math.sin(ang) * 175 + 10, 58), hairC, 6); }
      for (const sx of [-1, 1]) paint(circ(sx * 170, 60, 52), hairC, 6);
    } else if (cfg.hair === 'queue') {
      const sw = Math.sin(t * 1.6) * 12;
      ctx.strokeStyle = outline ? OL : hairC; ctx.lineWidth = outline ? 74 : 60;
      ctx.beginPath(); ctx.moveTo(-dir * 96, -128); ctx.quadraticCurveTo(-dir * 182, -70 + sw * 0.5, -dir * 168 + sw, 110); ctx.stroke();
      if (outline) { ctx.strokeStyle = hairC; ctx.lineWidth = 58; ctx.stroke(); }
      paint(circ(-dir * 112, -132, 30), shade(hairC, -0.15), 5);
    }
  });

  /* ---- Torse et tenue ---- */
  ctx.save(); ctx.translate(0, breathe * 0.4); ctx.scale(tx, ty * (1 + breathe / 900));
  const torso = path((p) => { p.moveTo(-290, 40); p.lineTo(-290, -200); p.quadraticCurveTo(-288, -300, -175, -322); p.lineTo(175, -322); p.quadraticCurveTo(288, -300, 290, -200); p.lineTo(290, 40); });
  paint(torso, outfit, 9);
  const ot = cfg.outfitType;
  if (ot === 'veste') {
    paint(path((p) => { p.moveTo(-74, -322); p.lineTo(0, -196); p.lineTo(74, -322); }), shade(outfit, 0.86), 6);
    ctx.strokeStyle = shade(outfit, -0.28); ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(-74, -322); ctx.lineTo(-20, -150); ctx.moveTo(74, -322); ctx.lineTo(20, -150); ctx.stroke();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(-170 * dir, -235, 15, 0, 6.283); ctx.fill();
  } else if (ot === 'chemise') {
    for (const sx of [-1, 1]) paint(path((p) => { p.moveTo(sx * 84, -326); p.lineTo(sx * 6, -300); p.lineTo(sx * 46, -248); }), shade(outfit, 0.8), 6);
    paint(path((p) => { p.moveTo(-18, -300); p.lineTo(18, -300); p.lineTo(12, -272); p.lineTo(-12, -272); }), shade(accent, -0.15), 5);
    paint(path((p) => { p.moveTo(-12, -272); p.lineTo(12, -272); p.lineTo(26, -130); p.lineTo(0, -100); p.lineTo(-26, -130); }), accent, 5);
  } else if (ot === 'sweat') {
    paint(path((p) => { p.moveTo(-160, -318); p.quadraticCurveTo(0, -250, 160, -318); p.quadraticCurveTo(120, -372, 0, -378); p.quadraticCurveTo(-120, -372, -160, -318); }), shade(outfit, -0.14), 8);
    ctx.strokeStyle = shade(outfit, 0.75); ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(-38, -296); ctx.lineTo(-44, -205); ctx.moveTo(38, -296); ctx.lineTo(44, -205); ctx.stroke();
    ctx.strokeStyle = shade(outfit, -0.25); ctx.lineWidth = 7; ctx.stroke(rr(-150, -120, 300, 140, 40));
  } else if (ot === 'tshirt') {
    paint(path((p) => { p.moveTo(-76, -322); p.quadraticCurveTo(0, -262, 76, -322); }), shade(skin, -0.1), 6);
    ctx.strokeStyle = shade(outfit, -0.22); ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(-80, -320); ctx.quadraticCurveTo(0, -256, 80, -320); ctx.stroke();
  }
  ctx.restore();

  /* ---- Cou ---- */
  if (!robot) paint(rr(-50, shoulderY - 98 + bob * 0.5, 100, 130, 30), shade(skin, -0.12), 7);
  else { ctx.fillStyle = shade(skin, -0.3); ctx.fillRect(-36, shoulderY - 90, 72, 110); ctx.strokeStyle = shade(skin, -0.45); ctx.lineWidth = 6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-36, shoulderY - 70 + i * 26); ctx.lineTo(36, shoulderY - 70 + i * 26); ctx.stroke(); } }
  if (ot === 'colroule') paint(rr(-66, shoulderY - 62, 132, 78, 32), shade(outfit, -0.08), 8);

  /* ---- Tête ---- */
  head(() => {
    const sp = cfg.species;
    let eyeY = -10, mouthY = 84;
    // Oreilles et forme de tête
    if (robot) {
      for (const sx of [-1, 1]) paint(rr(sx * 172 - 22, -40, 44, 90, 18), shade(skin, -0.25));
      ctx.strokeStyle = shade(skin, -0.35); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(0, -218); ctx.stroke();
      paint(circ(0, -228, 20 + talk * 5), accent, 6);
      paint(rr(-165, -152, 330, 300, 78), skin);
      paint(rr(-128, -96, 256, 170, 52), '#151722', 6);
    } else if (sp === 'chat') {
      for (const sx of [-1, 1]) { paint(path((p) => { p.moveTo(sx * 160, -40); p.lineTo(sx * 128, -222); p.lineTo(sx * 30, -130); }), skin); ctx.fillStyle = '#F2A7B5'; ctx.fill(path((p) => { p.moveTo(sx * 132, -80); p.lineTo(sx * 118, -180); p.lineTo(sx * 62, -126); })); }
      paint(ell(0, 10, 168, 152), skin); eyeY = -16; mouthY = 78;
    } else if (sp === 'renard') {
      for (const sx of [-1, 1]) { paint(path((p) => { p.moveTo(sx * 150, -70); p.lineTo(sx * 118, -262); p.lineTo(sx * 36, -140); }), skin); ctx.fillStyle = '#3A2A24'; ctx.fill(path((p) => { p.moveTo(sx * 126, -170); p.lineTo(sx * 118, -240); p.lineTo(sx * 88, -190); })); }
      paint(path((p) => { p.moveTo(-178, 30); p.quadraticCurveTo(-160, -158, 0, -158); p.quadraticCurveTo(160, -158, 178, 30); p.quadraticCurveTo(92, 156, 0, 168); p.quadraticCurveTo(-92, 156, -178, 30); }), skin);
      ctx.fillStyle = '#FFF6EE'; ctx.fill(path((p) => { p.moveTo(-176, 34); p.quadraticCurveTo(-70, 40, 0, 92); p.quadraticCurveTo(70, 40, 176, 34); p.quadraticCurveTo(92, 156, 0, 168); p.quadraticCurveTo(-92, 156, -176, 34); }));
      eyeY = -24; mouthY = 128;
    } else if (sp === 'ours') {
      for (const sx of [-1, 1]) { paint(circ(sx * 128, -122, 54), skin); ctx.fillStyle = shade(skin, 0.35); ctx.fill(circ(sx * 128, -122, 28)); }
      paint(ell(0, 10, 170, 160), skin);
      ctx.fillStyle = shade(skin, 0.45); ctx.fill(ell(0, 74, 84, 62));
      eyeY = -18; mouthY = 104;
    } else {
      for (const sx of [-1, 1]) paint(ell(sx * (cfg.face === 'rond' ? 156 : 142), 12, 26, 38), shade(skin, -0.05), 7);
      const fp = cfg.face === 'rond' ? ell(0, 8, 160, 162) : cfg.face === 'carre' ? rr(-150, -165, 300, 338, 100) : ell(0, 0, 146, 172);
      paint(fp, skin);
    }
    // Joues, taches de rousseur, barbe
    if (!robot && cfg.blush) { ctx.fillStyle = 'rgba(232,110,110,0.17)'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 88, eyeY + 58, 28, 0, 6.283); ctx.fill(); } }
    if (human && cfg.freckles) { ctx.fillStyle = shade(skin, -0.32); for (const sx of [-1, 1]) for (const [fx, fy] of [[70, 40], [90, 52], [104, 38], [82, 64], [60, 58]]) { ctx.beginPath(); ctx.arc(sx * fx, fy, 3.6, 0, 6.283); ctx.fill(); } }
    if (human && cfg.beard !== 'aucune' && cfg.beard !== 'moustache') {
      const bp = path((p) => { p.moveTo(-144, 15); p.bezierCurveTo(-134, 150, -64, 194, 0, 194); p.bezierCurveTo(64, 194, 134, 150, 144, 15); p.bezierCurveTo(112, 94, 62, 110, 0, 110); p.bezierCurveTo(-62, 110, -112, 94, -144, 15); });
      if (cfg.beard === 'courte') { ctx.save(); ctx.globalAlpha = 0.38; ctx.fillStyle = hairC; ctx.fill(bp); ctx.restore(); } else paint(bp, hairC, 6);
    }
    // Yeux
    const look = dir * 4 + Math.sin(t * 0.9) * 2;
    if (robot) {
      for (const sx of [-1, 1]) {
        const h = blink ? 8 : 46;
        ctx.save(); ctx.shadowColor = cfg.eyeColor; ctx.shadowBlur = 24; ctx.fillStyle = cfg.eyeColor;
        ctx.fill(rr(sx * 54 - 24 + look, -40 - h / 2, 48, h, 14)); ctx.restore();
      }
    } else {
      for (const sx of [-1, 1]) {
        const ex = sx * 52 + look, ey = eyeY;
        if (cfg.eyes === 'joyeux') { ctx.strokeStyle = '#2A1F1D'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(sx * 52, ey + 6, 16, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); continue; }
        if (blink) { ctx.strokeStyle = '#2A1F1D'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx * 52 - 16, ey + 2); ctx.quadraticCurveTo(sx * 52, ey + 8, sx * 52 + 16, ey + 2); ctx.stroke(); continue; }
        if (cfg.eyes === 'grands') {
          ctx.fillStyle = '#FFFFFF'; ctx.fill(ell(sx * 52, ey, 27, 31)); if (outline) { ctx.strokeStyle = OL; ctx.lineWidth = 5; ctx.stroke(ell(sx * 52, ey, 27, 31)); }
          ctx.fillStyle = cfg.eyeColor; ctx.fill(circ(ex, ey + 3, 18));
          ctx.fillStyle = '#121014'; ctx.fill(circ(ex, ey + 3, 9));
          ctx.fillStyle = '#FFFFFF'; ctx.fill(circ(ex + 6, ey - 5, 6)); ctx.fill(circ(ex - 6, ey + 10, 3));
        } else if (cfg.eyes === 'amande') {
          ctx.save(); ctx.fillStyle = '#FFFFFF'; const al = ell(sx * 52, ey, 24, 13); ctx.fill(al); ctx.clip(al);
          ctx.fillStyle = cfg.eyeColor; ctx.fill(circ(ex, ey, 12)); ctx.fillStyle = '#121014'; ctx.fill(circ(ex, ey, 6)); ctx.restore();
          ctx.strokeStyle = '#2A1F1D'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(sx * 52, ey, 24, 13, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        } else if (cfg.eyes === 'points') {
          ctx.fillStyle = '#231B1A'; ctx.fill(circ(ex, ey, 9));
        } else {
          ctx.fillStyle = '#231B1A'; ctx.fill(ell(ex, ey, 13, 17));
          ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(circ(ex + 4, ey - 5, 4.5));
        }
      }
    }
    // Sourcils
    if (!robot && cfg.brows !== 'aucun') {
      const bh = cfg.brows === 'epais' ? 20 : 12;
      ctx.fillStyle = human ? shade(hairC, -0.1) : shade(skin, -0.45);
      for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 54, eyeY - 46 - raise); ctx.rotate(sx * -0.08); ctx.fill(rr(-31, -bh / 2, 62, bh, bh / 2)); ctx.restore(); }
    }
    // Nez
    if (sp === 'chat') { ctx.fillStyle = '#E58B9B'; ctx.fill(path((p) => { p.moveTo(-14, 38); p.lineTo(14, 38); p.lineTo(0, 54); })); }
    else if (sp === 'renard' || sp === 'ours') { ctx.fillStyle = '#231B1A'; ctx.fill(ell(0, sp === 'renard' ? 96 : 48, sp === 'renard' ? 18 : 26, sp === 'renard' ? 14 : 18)); }
    else if (human && cfg.nose === 'courbe') { ctx.strokeStyle = shade(skin, -0.22); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-4, 12); ctx.quadraticCurveTo(2, 44, 14, 44); ctx.stroke(); }
    else if (human && cfg.nose === 'point') { ctx.fillStyle = shade(skin, -0.18); ctx.fill(ell(0, 36, 11, 8)); }
    if (sp === 'chat' || sp === 'renard') {
      ctx.strokeStyle = sp === 'chat' ? 'rgba(40,30,30,.55)' : 'rgba(40,30,30,.4)'; ctx.lineWidth = 4;
      for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(sx * 60, (sp === 'chat' ? 60 : 110) + k * 12); ctx.lineTo(sx * 150, (sp === 'chat' ? 50 : 98) + k * 22); ctx.stroke(); }
    }
    // Moustache
    if (human && cfg.beard === 'moustache') paint(path((p) => { p.moveTo(-52, 66); p.quadraticCurveTo(-22, 46, 0, 58); p.quadraticCurveTo(22, 46, 52, 66); p.quadraticCurveTo(26, 76, 0, 68); p.quadraticCurveTo(-26, 76, -52, 66); }), hairC, 5);
    // Bouche
    if (robot) {
      for (let i = 0; i < 7; i++) {
        const lvl = talk > 0.05 ? clamp(0.25 + talk * (0.6 + 0.4 * Math.abs(Math.sin(t * 17 + i * 1.7)))) : 0.12;
        const bh = 8 + lvl * 52;
        ctx.fillStyle = cfg.eyeColor; ctx.globalAlpha = 0.9; ctx.fill(rr(-63 + i * 18, 30 - bh / 2, 12, bh, 5)); ctx.globalAlpha = 1;
      }
    } else if (talk >= 0.06) {
      const sc = human ? 1 : 0.8, w = (30 + 14 * talk + Math.sin(t * 11) * 3 * talk) * sc, h = (7 + 36 * talk) * sc;
      const mp = ell(0, mouthY, w, h);
      ctx.fillStyle = '#4A1E1E'; ctx.fill(mp);
      ctx.save(); ctx.clip(mp);
      ctx.fillStyle = '#F4F1EE'; ctx.fillRect(-w, mouthY - h, w * 2, Math.min(10, h * 0.45));
      ctx.fillStyle = '#C8615E'; ctx.fill(ell(0, mouthY + h * 0.75, w * 0.6, h * 0.5));
      ctx.restore();
    } else if (sp === 'chat') {
      ctx.strokeStyle = '#4A2E2E'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-28, mouthY - 8); ctx.quadraticCurveTo(-14, mouthY + 8, 0, mouthY - 6); ctx.quadraticCurveTo(14, mouthY + 8, 28, mouthY - 8); ctx.stroke();
    } else if (cfg.mouth === 'grand') {
      const mp = path((p) => { p.moveTo(-40, mouthY - 22); p.quadraticCurveTo(0, mouthY - 14, 40, mouthY - 22); p.quadraticCurveTo(36, mouthY + 26, 0, mouthY + 28); p.quadraticCurveTo(-36, mouthY + 26, -40, mouthY - 22); });
      ctx.fillStyle = '#4A1E1E'; ctx.fill(mp); ctx.save(); ctx.clip(mp); ctx.fillStyle = '#F4F1EE'; ctx.fillRect(-42, mouthY - 24, 84, 14); ctx.fillStyle = '#C8615E'; ctx.fill(ell(0, mouthY + 26, 22, 12)); ctx.restore();
    } else if (cfg.mouth === 'neutre') {
      ctx.strokeStyle = '#6E2F2B'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-22, mouthY - 4); ctx.quadraticCurveTo(0, mouthY, 22, mouthY - 4); ctx.stroke();
    } else {
      ctx.strokeStyle = '#6E2F2B'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, mouthY - 22, 32, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    }
    // Cheveux avant
    if (human) {
      const cap = path((p) => { p.moveTo(-152, -10); p.bezierCurveTo(-166, -150, -66, -205, 10, -198); p.bezierCurveTo(112, -196, 168, -126, 152, -10); p.bezierCurveTo(134, -82, 76, -116, 18, -112); p.bezierCurveTo(-30, -126, -112, -98, -152, -10); });
      const hr = cfg.hair;
      if (hr === 'rase') { ctx.save(); ctx.clip(ell(0, 0, 147, 173)); ctx.globalAlpha = 0.55; ctx.fillStyle = hairC; ctx.fill(ell(0, -150, 190, 120)); ctx.restore(); }
      else if (hr === 'chauve') { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill(ell(-52, -118, 40, 22)); }
      else if (hr === 'long' || hr === 'carre') paint(path((p) => { p.moveTo(-158, 30); p.bezierCurveTo(-176, -150, -40, -218, 34, -202); p.bezierCurveTo(146, -190, 180, -76, 160, 50); p.bezierCurveTo(146, -54, 96, -108, 26, -120); p.bezierCurveTo(-36, -108, -112, -62, -158, 30); }), hairC);
      else if (hr === 'meches') {
        paint(cap, hairC);
        paint(path((p) => { p.moveTo(128, -128); p.bezierCurveTo(60, -96, -30, -52, -112, -20); p.bezierCurveTo(-80, -100, 10, -168, 120, -160); }), hairC, 6);
      } else if (hr === 'crete') {
        paint(path((p) => { p.moveTo(-140, -40); p.bezierCurveTo(-150, -150, -60, -200, 10, -196); p.bezierCurveTo(112, -196, 160, -130, 146, -40); p.bezierCurveTo(120, -100, 60, -130, 0, -126); p.bezierCurveTo(-60, -130, -110, -100, -140, -40); }), hairC);
        paint(path((p) => { p.moveTo(-110, -150); p.bezierCurveTo(-90, -270, 80, -300, 140, -210); p.bezierCurveTo(90, -232, 20, -222, -30, -176); }), hairC, 7);
      } else if (hr === 'afro') paint(path((p) => { p.moveTo(-150, -20); p.bezierCurveTo(-150, -140, -70, -180, 0, -180); p.bezierCurveTo(70, -180, 150, -140, 150, -20); p.bezierCurveTo(120, -110, 60, -128, 0, -128); p.bezierCurveTo(-60, -128, -120, -110, -150, -20); }), hairC);
      else {
        paint(cap, hairC);
        if (hr === 'boucles') for (let i = 0; i < 7; i++) paint(circ(-120 + i * 40, -118 - Math.sin(i) * 10, 34), hairC, 5);
      }
    }
    // Lunettes
    if (cfg.glasses !== 'aucune') {
      const gy = eyeY - 2;
      const lens = cfg.glasses === 'rondes' ? [circ(-54, gy, 36), circ(54, gy, 36)] : [rr(-100, gy - 30, 86, 60, 20), rr(14, gy - 30, 86, 60, 20)];
      if (cfg.glasses === 'soleil') { ctx.fillStyle = 'rgba(20,20,26,.9)'; lens.forEach((l) => ctx.fill(l)); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill(rr(-86, gy - 22, 26, 10, 5)); ctx.fill(rr(28, gy - 22, 26, 10, 5)); }
      ctx.strokeStyle = '#1A1A1E'; ctx.lineWidth = 7; lens.forEach((l) => ctx.stroke(l));
      ctx.beginPath(); ctx.moveTo(-16, gy - 6); ctx.quadraticCurveTo(0, gy - 14, 16, gy - 6); ctx.stroke();
    }
    // Couvre-chefs
    const hatC = cfg.outfit === 'marque' ? accent : shade(cfg.outfitColor, 0.15);
    if (cfg.hat === 'casquette') {
      paint(path((p) => { p.moveTo(-162, -62); p.bezierCurveTo(-166, -222, 166, -222, 162, -62); p.quadraticCurveTo(0, -84, -162, -62); }), hatC);
      ctx.save(); ctx.translate(dir * 70, -66); ctx.rotate(dir * 0.06); paint(ell(0, 0, 150, 28), shade(hatC, -0.2)); ctx.restore();
      paint(circ(0, -196, 12), shade(hatC, -0.25), 5);
    } else if (cfg.hat === 'bonnet') {
      paint(path((p) => { p.moveTo(-158, -70); p.bezierCurveTo(-160, -250, 160, -250, 158, -70); }), hatC);
      paint(rr(-170, -110, 340, 64, 30), shade(hatC, -0.15));
      ctx.strokeStyle = shade(hatC, -0.3); ctx.lineWidth = 5; for (let i = -140; i <= 140; i += 28) { ctx.beginPath(); ctx.moveTo(i, -104); ctx.lineTo(i, -52); ctx.stroke(); }
      paint(circ(Math.sin(t * 2) * 4, -248, 36), shade(hatC, 0.5));
    } else if (cfg.hat === 'casque') {
      ctx.strokeStyle = '#2A2A33'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(0, -10, 182, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
      for (const sx of [-1, 1]) { paint(rr(sx * 172 - 30, -50, 60, 116, 26), '#2A2A33'); ctx.fillStyle = accent; ctx.fill(rr(sx * 172 - 12, -24, 24, 64, 12)); }
    }
    if (human && cfg.earrings) { ctx.fillStyle = '#E8B84A'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * (cfg.face === 'rond' ? 158 : 144), 60, 10, 0, 6.283); ctx.fill(); } }
  });

  /* ---- Bras du geste ---- */
  if (g > 0.02) {
    ctx.save(); ctx.scale(dir * tx, ty);
    const sx = 215, sy = -282 + breathe * 0.4;
    const a1 = (96 - 46 * g) * Math.PI / 180, a2 = (92 - 108 * g + Math.sin(t * 3) * 7 * g) * Math.PI / 180;
    const ex = sx + Math.cos(a1) * 210, ey = sy + Math.sin(a1) * 210;
    const hx = ex + Math.cos(a2) * 185, hy = ey + Math.sin(a2) * 185;
    const sleeve = cfg.outfitType === 'tshirt' ? skin : shade(outfit, -0.12);
    if (outline) { ctx.strokeStyle = OL; ctx.lineWidth = 108; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke(); }
    ctx.strokeStyle = shade(outfit, -0.12); ctx.lineWidth = 92;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = sleeve; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    paint(circ(hx + Math.cos(a2) * 30, hy + Math.sin(a2) * 30, 46), robot ? shade(skin, -0.15) : skin, 7);
    ctx.restore();
  }
  ctx.restore();
}
