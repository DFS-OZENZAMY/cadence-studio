/* Cadence — moteur de rendu vidéo
 * Chaque image est calculée de façon déterministe à partir du temps :
 * l'aperçu et l'export produisent exactement la même chose.
 */
import { Muxer, ArrayBufferTarget } from './vendor/mp4-muxer.mjs';
import { drawCharacter, synthTalk, DEFAULT_CHAR } from './avatar.js';
import { renderTrack, bufferToWav, TRACKS as MUSIC_TRACKS } from './music.js';
import { renderSfx } from './sfx.js';
export { MUSIC_TRACKS };
export { DEFAULT_CHAR };
export const VOICE_DELAY = 0.5;
/** Décalage de la voix dans sa scène (réglable dans la timeline audio). */
export const voiceDelayOf = (scene) => { const v = scene?.props?.voiceDelay; return v == null ? VOICE_DELAY : Math.max(0, +v); };
/** Réglages effectifs de la musique : position dans la vidéo, fin, fondus, volume. */
/* Clips audio libres (voix off, morceaux de musique découpés) */
let NARR = [];
function narrTalk(T) {
  for (const n of NARR) {
    const lt = T - n.at;
    if (lt >= 0 && lt < n.dur) return envAt(n.env, lt + n.offset);
  }
  return null;
}
export const audioClipsOf = (project) => (project.audio || []).filter((c) => c && (c.media || c.track) && !c.hidden);
export function musicSettings(project, total) {
  const m = project.music || {};
  const at = clamp(+m.at || 0, 0, Math.max(0, total - 0.5));
  const end = m.end == null ? total : clamp(+m.end, at + 0.5, total);
  return { at, end, offset: Math.max(0, +m.offset || 0), volume: m.volume ?? 0.6, duck: m.duck !== false, fadeIn: m.fadeIn ?? 0.6, fadeOut: m.fadeOut ?? 1.8 };
}

/* ---------------------------------------------------------------
   Formats, polices, ambiances
   --------------------------------------------------------------- */
export const FORMATS = {
  '16:9': { w: 1920, h: 1080, label: 'Paysage', hint: 'YouTube, site web, présentation' },
  '9:16': { w: 1080, h: 1920, label: 'Vertical', hint: 'Reels, TikTok, Stories, Shorts' },
  '1:1': { w: 1080, h: 1080, label: 'Carré', hint: 'Feed Instagram, LinkedIn, Facebook' },
  '4:5': { w: 1080, h: 1350, label: 'Portrait', hint: 'Feed Instagram et LinkedIn' },
};
export const QUALITIES = {
  hd: { label: 'HD 720p', short: 720 },
  fhd: { label: 'Full HD 1080p', short: 1080 },
  qhd: { label: '2K 1440p', short: 1440 },
  uhd: { label: '4K 2160p', short: 2160 },
};
export const FONTS = {
  moderne: { label: 'Moderne', display: 'Inter Tight', dw: 800, body: 'Inter Tight', bw: 500, upper: false, track: -0.02 },
  elegant: { label: 'Élégant', display: 'Playfair Display', dw: 700, body: 'Inter Tight', bw: 400, upper: false, track: -0.01 },
  tech: { label: 'Tech', display: 'Space Grotesk', dw: 700, body: 'Space Grotesk', bw: 400, upper: false, track: -0.03 },
  impact: { label: 'Impact', display: 'Anton', dw: 400, body: 'Inter Tight', bw: 600, upper: true, track: 0.01 },
  chaleureux: { label: 'Chaleureux', display: 'Fraunces', dw: 700, body: 'Inter Tight', bw: 400, upper: false, track: -0.02 },
};
/** Polices disponibles pendant l'édition (Google Fonts, chargées à la demande). */
export const FONT_LIBRARY = {
  'Inter Tight': { cat: 'Sans-serif', dw: 800, bw: 500 },
  'Manrope': { cat: 'Sans-serif', dw: 800, bw: 500 },
  'Montserrat': { cat: 'Sans-serif', dw: 800, bw: 400 },
  'Poppins': { cat: 'Sans-serif', dw: 800, bw: 400 },
  'Raleway': { cat: 'Sans-serif', dw: 800, bw: 400 },
  'Nunito': { cat: 'Arrondie', dw: 800, bw: 400 },
  'Space Grotesk': { cat: 'Géométrique', dw: 700, bw: 400 },
  'Syne': { cat: 'Géométrique', dw: 800, bw: 400 },
  'Playfair Display': { cat: 'Serif', dw: 700, bw: 400 },
  'DM Serif Display': { cat: 'Serif', dw: 400, bw: 400 },
  'Lora': { cat: 'Serif', dw: 700, bw: 400 },
  'Fraunces': { cat: 'Serif', dw: 700, bw: 400 },
  'Roboto Slab': { cat: 'Serif', dw: 700, bw: 400 },
  'Anton': { cat: 'Impact', dw: 400, bw: 400, upper: true, track: 0.01 },
  'Bebas Neue': { cat: 'Impact', dw: 400, bw: 400, upper: true, track: 0.02 },
  'Oswald': { cat: 'Impact', dw: 700, bw: 400, upper: true },
  'Archivo Black': { cat: 'Impact', dw: 400, bw: 400 },
  'Caveat': { cat: 'Manuscrite', dw: 700, bw: 400, track: 0 },
  'Pacifico': { cat: 'Manuscrite', dw: 400, bw: 400, track: 0 },
};
/** Police et tailles effectives : charte du client, puis réglages de la vidéo, puis ceux de la scène. */
export function resolveText(brand, projText = {}, sceneText = {}) {
  const base = FONTS[normBrand(brand).font] || FONTS.moderne;
  const pick = (k) => (sceneText?.[k] ?? projText?.[k] ?? null);
  const F = { ...base };
  const d = pick('display'), bo = pick('body');
  if (d && FONT_LIBRARY[d]) { const L0 = FONT_LIBRARY[d]; Object.assign(F, { display: d, dw: L0.dw, upper: !!L0.upper, track: L0.track ?? -0.01 }); }
  if (bo && FONT_LIBRARY[bo]) Object.assign(F, { body: bo, bw: FONT_LIBRARY[bo].bw });
  const ts = (projText?.titleScale || 1) * (sceneText?.titleScale || 1);
  const bs = (projText?.bodyScale || 1) * (sceneText?.bodyScale || 1);
  return { F, ts, bs };
}
let TS = 1, BS = 1;
const sz = (v, display = false) => v * (display ? TS : BS);

export const AMBIANCES = {
  aurore: { label: 'Aurore', hint: 'Halos de couleur en mouvement' },
  trame: { label: 'Trame', hint: 'Halos et grille de points' },
  epure: { label: 'Épuré', hint: 'Aplat et forme géométrique' },
};
export const TRANSITIONS = {
  fondu: 'Fondu', glisse: 'Glissement', zoom: 'Zoom', volet: 'Volet coloré', aucune: 'Coupe franche',
};
export const BACKGROUNDS = {
  auto: 'Automatique', sombre: 'Sombre', clair: 'Clair', principale: 'Couleur principale', secondaire: 'Couleur secondaire',
};
export const DEMO_BRAND = {
  name: 'Atelier Nova', tagline: 'Design et stratégie', website: 'ateliernova.fr',
  colors: { primary: '#5A3DF0', secondary: '#FF8A3D', dark: '#14121F', light: '#F6F4FF' },
  font: 'moderne', ambiance: 'aurore', logo: null, logoPlate: false,
};

/* ---------------------------------------------------------------
   Outils : temps, courbes, couleurs, texte
   --------------------------------------------------------------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, start, dur) => clamp((t - start) / dur);
export const E = {
  lin: (x) => x,
  outCubic: (x) => 1 - (1 - x) ** 3,
  outQuint: (x) => 1 - (1 - x) ** 5,
  outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  outBack: (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; },
  inCubic: (x) => x * x * x,
  spring: (x) => (x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(11 * x)),
};
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export function hexToRgb(hex) {
  let h = String(hex || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex, a = 1) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function lum(hex) {
  const c = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
export const onColor = (hex) => (lum(hex) > 0.45 ? '#111111' : '#FFFFFF');

function setFont(ctx, family, weight, size) {
  ctx.font = `${weight} ${Math.max(1, Math.round(size * 10) / 10)}px "${family}", "Segoe UI", system-ui, sans-serif`;
}
function setTrack(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; }
function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (cur && ctx.measureText(test).width > maxW) { out.push(cur); cur = w; } else cur = test;
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [''];
}
/** Trouve la plus grande taille de texte qui tient dans maxW sur maxLines lignes. */
function fit(S, text, { display = true, size, maxW, maxLines = 3, min = 0.3 }) {
  const { ctx, F } = S;
  const family = display ? F.display : F.body, weight = display ? F.dw : F.bw;
  const raw = (display && F.upper ? String(text || '').toUpperCase() : String(text || '')).trim();
  size *= display ? TS : BS;
  let s = size;
  for (let k = 0; k < 40; k++) {
    setFont(ctx, family, weight, s); setTrack(ctx, display ? s * F.track : 0);
    const lines = wrap(ctx, raw, maxW);
    const tooWide = raw.split(/\s+/).some((w) => ctx.measureText(w).width > maxW);
    if ((lines.length <= maxLines && !tooWide) || s <= size * min) return { lines, size: s, family, weight, track: display ? s * F.track : 0 };
    s *= 0.93;
  }
  return { lines: [raw], size: s, family, weight, track: 0 };
}
function useFit(S, T) { setFont(S.ctx, T.family, T.weight, T.size); setTrack(S.ctx, T.track); }

/** Lignes qui montent derrière un masque, en cascade. */
function revealLines(S, T, x, y, { lh = 1.08, align = 'left', start = 0, stagger = 0.1, dur = 0.85, color }) {
  const { ctx, W } = S;
  const lineH = T.size * lh;
  useFit(S, T);
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  T.lines.forEach((line, i) => {
    const p = E.outExpo(prog(S.t, start + i * stagger, dur));
    if (p <= 0) return;
    const base = y + T.size * 0.88 + i * lineH;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, base - T.size * 1.02, W, T.size * 1.32); ctx.clip();
    ctx.translate(0, (1 - p) * T.size * 1.15);
    ctx.fillText(line, x, base);
    ctx.restore();
  });
  return T.lines.length * lineH;
}
function fadeText(S, T, x, y, { lh = 1.35, align = 'left', start = 0, dur = 0.7, color, rise = 24 }) {
  const { ctx, u } = S;
  const p = E.outCubic(prog(S.t, start, dur));
  if (p <= 0) return T.lines.length * T.size * lh;
  useFit(S, T);
  ctx.save(); ctx.globalAlpha *= p; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  T.lines.forEach((line, i) => ctx.fillText(line, x, y + T.size * 0.88 + i * T.size * lh + (1 - p) * rise * u));
  ctx.restore();
  return T.lines.length * T.size * lh;
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function kicker(S, text, x, y, { align = 'left', start = 0, color }) {
  if (!text) return 0;
  const { ctx, u, F } = S;
  const p = E.outCubic(prog(S.t, start, 0.6));
  if (p <= 0) return 64 * u;
  const size = 30 * u;
  setFont(ctx, F.body, 700, sz(size)); setTrack(ctx, size * 0.18);
  ctx.save(); ctx.globalAlpha *= p; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  const txt = String(text).toUpperCase();
  const w = ctx.measureText(txt).width;
  const dash = 46 * u;
  if (align === 'left') { ctx.fillRect(x, y + size * 0.55, dash * p, 4 * u); ctx.fillText(txt, x + dash + 18 * u, y + size * 0.88); }
  else { ctx.fillText(txt, x, y + size * 0.88); ctx.fillRect(x - w / 2, y + size * 1.5, w * p, 3 * u); }
  ctx.restore(); setTrack(ctx, 0);
  return 64 * u;
}

/* ---------------------------------------------------------------
   Logo
   --------------------------------------------------------------- */
function drawLogo(S, cx, cy, box, alpha = 1) {
  const { ctx, b, assets, F } = S;
  if (box <= 0 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const img = assets?.logo;
  if (img) {
    const r = Math.min(box / img.width, box / img.height);
    const w = img.width * r, h = img.height * r;
    if (b.logoPlate) {
      const pad = box * 0.16;
      ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = box * 0.15; ctx.shadowOffsetY = box * 0.04;
      rrect(ctx, cx - w / 2 - pad, cy - h / 2 - pad, w + pad * 2, h + pad * 2, box * 0.14); ctx.fill();
      ctx.shadowColor = 'transparent';
    }
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = S.accent; ctx.beginPath(); ctx.arc(cx, cy, box / 2, 0, Math.PI * 2); ctx.fill();
    setFont(ctx, F.display, F.dw, box * 0.46); setTrack(ctx, 0);
    ctx.fillStyle = onColor(S.accent); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((b.name || '?').trim().charAt(0).toUpperCase(), cx, cy + box * 0.03);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

/* ---------------------------------------------------------------
   Fonds
   --------------------------------------------------------------- */
function palette(b, mode) {
  const c = b.colors;
  let base, fg;
  if (mode === 'clair') { base = c.light; fg = c.dark; }
  else if (mode === 'principale') { base = c.primary; fg = onColor(c.primary) === '#FFFFFF' ? '#FFFFFF' : c.dark; }
  else if (mode === 'secondaire') { base = c.secondary; fg = onColor(c.secondary) === '#FFFFFF' ? '#FFFFFF' : c.dark; }
  else { base = c.dark; fg = c.light; }
  if (contrast(base, fg) < 3) fg = onColor(base);
  const cands = [c.secondary, c.primary, mode === 'principale' ? c.light : null, mode === 'secondaire' ? c.dark : null].filter(Boolean);
  let accent = cands[0], best = 0;
  for (const k of cands) { const r = contrast(base, k); if (r > best + 0.6) { best = r; accent = k; } }
  if (best < 1.8) accent = fg;
  const glowA = mode === 'principale' ? c.secondary : c.primary;
  const glowB = mode === 'secondaire' ? c.primary : c.secondary;
  return { base, fg, accent, muted: rgba(fg, 0.72), glowA, glowB, dark: lum(base) < 0.35 };
}
function paintBackground(S) {
  const { ctx, W, H, u, b, T, pal, seed } = S;
  ctx.fillStyle = pal.base; ctx.fillRect(0, 0, W, H);
  const amb = b.ambiance || 'aurore';
  const R = rng(seed);
  const big = Math.max(W, H);
  if (amb !== 'epure') {
    const blobs = [
      { c: pal.glowA, a: pal.dark ? 0.55 : 0.28 },
      { c: pal.glowB, a: pal.dark ? 0.4 : 0.22 },
      { c: pal.glowA, a: pal.dark ? 0.28 : 0.16 },
    ];
    blobs.forEach((bl, i) => {
      const ph = R() * 6.28, sp = 0.12 + R() * 0.1;
      const x = W * (0.5 + 0.42 * Math.cos(T * sp + ph + i * 2.1));
      const y = H * (0.5 + 0.38 * Math.sin(T * sp * 1.3 + ph * 1.7 + i));
      const r = big * (0.55 + 0.12 * Math.sin(T * 0.3 + i));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(bl.c, bl.a)); g.addColorStop(1, rgba(bl.c, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
  }
  if (amb === 'trame') {
    const step = 54 * u, off = (T * 6 * u) % step;
    ctx.fillStyle = rgba(pal.fg, pal.dark ? 0.09 : 0.08);
    for (let y = -step + off; y < H + step; y += step)
      for (let x = 0; x < W + step; x += step) { ctx.beginPath(); ctx.arc(x, y, 2.4 * u, 0, 6.283); ctx.fill(); }
  }
  if (amb === 'epure') {
    ctx.save();
    ctx.translate(W * 0.86, H * 0.16); ctx.rotate(0.35 + T * 0.04);
    ctx.fillStyle = rgba(pal.accent, pal.dark ? 0.16 : 0.14);
    rrect(ctx, -big * 0.2, -big * 0.2, big * 0.4, big * 0.4, big * 0.06); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgba(pal.fg, 0.1); ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.arc(W * 0.08, H * 0.92, big * 0.18 + Math.sin(T * 0.5) * 8 * u, 0, 6.283); ctx.stroke();
  }
  if (pal.dark) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, big * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
}

/* ---------------------------------------------------------------
   Scènes
   --------------------------------------------------------------- */
const pad = (S) => Math.round(Math.min(S.W, S.H) * (S.portrait ? 0.085 : 0.1));
const num = (v) => { const m = String(v ?? '').match(/^([^\d-]*)(-?[\d\s.,  ]*\d)(.*)$/); if (!m) return null; const raw = m[2].replace(/[\s  ]/g, ''); const dec = (raw.split(/[.,]/)[1] || '').length; return { pre: m[1], val: parseFloat(raw.replace(',', '.')) || 0, dec, suf: m[3] }; };
const fmtNum = (n, dec) => n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/[  ]/g, ' ');

/* --- Outils du présentateur --- */
function envAt(v, lt) {
  if (!v?.env || lt < 0) return 0;
  const i = lt * v.rate, i0 = Math.floor(i);
  if (i0 >= v.env.length - 1) return 0;
  const f = i - i0; return v.env[i0] * (1 - f) + v.env[i0 + 1] * f;
}
function captionChunks(text) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const out = []; let cur = [];
  for (const w of words) { cur.push(w); if (cur.length >= 7 || (/[.!?;:,…]$/.test(w) && cur.length >= 3)) { out.push(cur.join(' ')); cur = []; } }
  if (cur.length) out.push(cur.join(' '));
  return out;
}
function activeCaption(text, lt, dur) {
  const ch = captionChunks(text);
  if (!ch.length || lt < 0 || lt > dur) return null;
  const total = ch.reduce((a, c) => a + c.length + 8, 0); let acc = 0;
  for (const c of ch) { const st = (acc / total) * dur; acc += c.length + 8; const en = (acc / total) * dur; if (lt >= st && lt < en) return { text: c, st, en }; }
  return null;
}
function coverDraw(ctx, src, x, y, w, h, ay = 0.35, zoom = 1) {
  const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
  if (!sw || !sh) return false;
  const k = Math.max(w / sw, h / sh) * zoom, dw = sw * k, dh = sh * k;
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) * ay, dw, dh);
  return true;
}

export const SCENES = {
  intro: {
    label: 'Ouverture', hint: 'Logo, titre et accroche', bg: 'sombre', duration: 4.5,
    fields: [
      { k: 'kicker', type: 'text', label: 'Surtitre', placeholder: 'Nouveau' },
      { k: 'title', type: 'textarea', label: 'Titre', rows: 2 },
      { k: 'subtitle', type: 'textarea', label: 'Accroche', rows: 2 },
      { k: 'showLogo', type: 'toggle', label: 'Afficher le logo' },
    ],
    defaults: { kicker: '', title: 'Votre titre ici', subtitle: 'Une phrase qui donne envie de regarder la suite', showLogo: true },
    draw(S) {
      const { ctx, W, H, u, t, p, pal } = S;
      const P = pad(S), maxW = W - P * 2, cx = W / 2;
      const logo = p.showLogo ? (S.portrait ? 240 : 190) * u : 0;
      const T = fit(S, p.title, { size: (S.portrait ? 128 : 136) * u, maxW, maxLines: S.portrait ? 4 : 3 });
      const sub = p.subtitle ? fit(S, p.subtitle, { display: false, size: (S.portrait ? 50 : 44) * u, maxW: Math.min(maxW, 1300 * u), maxLines: 3 }) : null;
      const kick = p.kicker ? 64 * u : 0;
      const h = (logo ? logo + 64 * u : 0) + kick + T.lines.length * T.size * 1.06 + (sub ? 56 * u + sub.lines.length * sub.size * 1.35 : 0);
      let y = (H - h) / 2;
      if (logo) {
        const lp = E.outBack(prog(t, 0.1, 0.9));
        const rp = prog(t, 0.25, 1.4);
        if (rp > 0 && rp < 1) {
          ctx.strokeStyle = rgba(pal.accent, 0.55 * (1 - rp)); ctx.lineWidth = 5 * u;
          ctx.beginPath(); ctx.arc(cx, y + logo / 2, logo * (0.55 + 0.9 * E.outCubic(rp)), 0, 6.283); ctx.stroke();
        }
        drawLogo(S, cx, y + logo / 2, logo * lp, prog(t, 0.1, 0.35));
        y += logo + 64 * u;
      }
      if (kick) { kicker(S, p.kicker, cx, y, { align: 'center', start: 0.35, color: pal.accent }); y += kick; }
      y += revealLines(S, T, cx, y, { align: 'center', start: 0.45, stagger: 0.12, color: pal.fg, lh: 1.06 });
      const lp = E.outExpo(prog(t, 1.0, 0.9));
      ctx.fillStyle = pal.accent; rrect(ctx, cx - 70 * u * lp, y + 22 * u, 140 * u * lp, 7 * u, 4 * u); ctx.fill();
      if (sub) fadeText(S, sub, cx, y + 56 * u, { align: 'center', start: 1.15, color: pal.muted });
    },
  },

  titre: {
    label: 'Titre choc', hint: 'Des mots qui apparaissent un à un', bg: 'principale', duration: 3.5,
    fields: [
      { k: 'kicker', type: 'text', label: 'Surtitre' },
      { k: 'text', type: 'textarea', label: 'Texte', rows: 3 },
      { k: 'highlight', type: 'text', label: 'Mot mis en avant', placeholder: 'Un mot du texte' },
    ],
    defaults: { kicker: '', text: 'Le changement commence maintenant', highlight: 'maintenant' },
    draw(S) {
      const { ctx, W, H, u, t, p, pal } = S;
      const P = pad(S), maxW = W - P * 2;
      const T = fit(S, p.text, { size: (S.portrait ? 150 : 170) * u, maxW, maxLines: S.portrait ? 5 : 3 });
      const lh = T.size * 1.08;
      const kick = p.kicker ? 70 * u : 0;
      let y0 = (H - (T.lines.length * lh + kick)) / 2;
      if (kick) { kicker(S, p.kicker, W / 2, y0, { align: 'center', start: 0.1, color: pal.fg }); y0 += kick; }
      useFit(S, T); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const hl = String(p.highlight || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      const space = ctx.measureText(' ').width;
      let k = 0;
      T.lines.forEach((line, i) => {
        const words = line.split(' ');
        const widths = words.map((w) => ctx.measureText(w).width);
        const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
        let x = (W - total) / 2;
        const base = y0 + T.size * 0.88 + i * lh;
        words.forEach((w, j) => {
          const st = 0.15 + k * 0.085; k++;
          const pp = prog(t, st, 0.6);
          if (pp > 0) {
            const isHl = hl && w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === hl;
            const cxw = x + widths[j] / 2;
            ctx.save();
            ctx.translate(cxw, base - T.size * 0.35 + (1 - E.outCubic(pp)) * 40 * u);
            const sc = 0.72 + 0.28 * E.outBack(pp); ctx.scale(sc, sc);
            ctx.globalAlpha *= E.outCubic(prog(t, st, 0.25));
            let col = pal.fg;
            if (isHl) {
              const mp = E.outExpo(prog(t, st + 0.3, 0.7));
              const padX = T.size * 0.12;
              ctx.fillStyle = pal.accent;
              rrect(ctx, -widths[j] / 2 - padX, -T.size * 0.62, (widths[j] + padX * 2) * mp, T.size * 1.02, T.size * 0.12); ctx.fill();
              if (mp > 0.5) col = onColor(pal.accent);
            }
            ctx.fillStyle = col; ctx.textAlign = 'center';
            ctx.fillText(w, 0, T.size * 0.35);
            ctx.restore();
          }
          x += widths[j] + space;
        });
      });
    },
  },

  chiffres: {
    label: 'Chiffres clés', hint: 'Compteurs animés', bg: 'sombre', duration: 5,
    fields: [
      { k: 'title', type: 'text', label: 'Titre' },
      { k: 'items', type: 'items', label: 'Chiffres', max: 4, add: 'Ajouter un chiffre', item: [{ k: 'value', label: 'Valeur', placeholder: '+120 %' }, { k: 'label', label: 'Libellé', placeholder: 'de croissance' }] },
    ],
    defaults: { title: 'En quelques chiffres', items: [{ value: '+250', label: 'clients accompagnés' }, { value: '98 %', label: 'de satisfaction' }, { value: '12', label: 'ans d’expertise' }] },
    draw(S) {
      const { ctx, W, H, u, t, p, pal } = S;
      const P = pad(S), items = (p.items || []).slice(0, 4), n = Math.max(1, items.length);
      const vertical = S.portrait || (S.square && n > 2);
      const titleH = p.title ? 140 * u : 0;
      if (p.title) kicker(S, p.title, vertical ? P : W / 2, vertical ? P + 40 * u : H * 0.2, { align: vertical ? 'left' : 'center', start: 0.1, color: pal.accent });
      const gap = (vertical ? 50 : 60) * u;
      const areaTop = vertical ? P + titleH + 20 * u : H * 0.2 + titleH * 0.6;
      const areaH = vertical ? H - areaTop - P : H - areaTop - H * 0.16;
      const colW = vertical ? W - P * 2 : (W - P * 2 - gap * (n - 1)) / n;
      const rowH = vertical ? (areaH - gap * (n - 1)) / n : areaH;
      items.forEach((it, i) => {
        const x = vertical ? P : P + i * (colW + gap);
        const y = vertical ? areaTop + i * (rowH + gap) : areaTop + (areaH - 340 * u) / 2;
        const st = 0.35 + i * 0.22;
        const lp = E.outExpo(prog(t, st, 0.9));
        ctx.fillStyle = rgba(pal.fg, 0.18); ctx.fillRect(x, y, colW, 3 * u);
        ctx.fillStyle = pal.accent; ctx.fillRect(x, y, colW * lp, 3 * u);
        const nv = num(it.value);
        const final = nv ? `${nv.pre}${fmtNum(nv.val, nv.dec)}${nv.suf}` : String(it.value || '');
        const NT = fit(S, final, { size: (vertical ? 190 : 200) * u, maxW: colW, maxLines: 1, min: 0.2 });
        const cp = E.outExpo(prog(t, st, 1.8));
        const shown = nv ? `${nv.pre}${fmtNum(nv.val * cp, nv.dec)}${nv.suf}` : final;
        const ap = E.outCubic(prog(t, st, 0.4));
        useFit(S, NT); ctx.save(); ctx.globalAlpha *= ap; ctx.fillStyle = pal.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(shown, x, y + 40 * u + NT.size * 0.9 + (1 - ap) * 30 * u); ctx.restore();
        const L = fit(S, it.label || '', { display: false, size: (vertical ? 44 : 40) * u, maxW: colW, maxLines: 2 });
        fadeText(S, L, x, y + 70 * u + NT.size, { start: st + 0.35, color: pal.muted });
      });
    },
  },

  liste: {
    label: 'Points forts', hint: 'Liste d’avantages cochés', bg: 'clair', duration: 5.5,
    fields: [
      { k: 'title', type: 'textarea', label: 'Titre', rows: 2 },
      { k: 'items', type: 'items', label: 'Points', max: 5, add: 'Ajouter un point', item: [{ k: 'text', label: 'Texte', placeholder: 'Un avantage concret' }] },
    ],
    defaults: { title: 'Pourquoi nous choisir', items: [{ text: 'Livraison en 48 heures' }, { text: 'Accompagnement personnalisé' }, { text: 'Satisfait ou remboursé' }] },
    draw(S) {
      const { ctx, W, H, u, t, p, pal } = S;
      const P = pad(S), maxW = W - P * 2, items = (p.items || []).slice(0, 5);
      const T = fit(S, p.title, { size: (S.portrait ? 110 : 100) * u, maxW: S.portrait ? maxW : maxW * 0.8, maxLines: 3 });
      const r = (S.portrait ? 34 : 30) * u;
      const rows = items.map((it) => fit(S, it.text || '', { display: false, size: (S.portrait ? 54 : 50) * u, maxW: maxW - r * 2 - 36 * u, maxLines: 2 }));
      const rowsH = rows.reduce((a, R) => a + Math.max(r * 2, R.lines.length * R.size * 1.3) + 34 * u, 0);
      const h = T.lines.length * T.size * 1.08 + 70 * u + rowsH;
      let y = Math.max(P, (H - h) / 2);
      y += revealLines(S, T, P, y, { start: 0.1, color: pal.fg }) + 70 * u;
      rows.forEach((R, i) => {
        const st = 0.6 + i * 0.28, rowH = Math.max(r * 2, R.lines.length * R.size * 1.3);
        const cy = y + rowH / 2, cx = P + r;
        const cp = E.outBack(prog(t, st, 0.5));
        if (cp > 0) {
          ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, r * cp, 0, 6.283); ctx.fill();
          const kp = E.outCubic(prog(t, st + 0.2, 0.4));
          if (kp > 0) {
            ctx.strokeStyle = onColor(pal.accent); ctx.lineWidth = 5.5 * u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            const pts = [[cx - r * 0.42, cy + r * 0.02], [cx - r * 0.1, cy + r * 0.32], [cx + r * 0.45, cy - r * 0.3]];
            const segs = [Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1])];
            let left = (segs[0] + segs[1]) * kp;
            ctx.beginPath(); ctx.moveTo(...pts[0]);
            for (let s = 0; s < 2 && left > 0; s++) { const f = Math.min(1, left / segs[s]); ctx.lineTo(pts[s][0] + (pts[s + 1][0] - pts[s][0]) * f, pts[s][1] + (pts[s + 1][1] - pts[s][1]) * f); left -= segs[s]; }
            ctx.stroke();
          }
        }
        const tp = E.outExpo(prog(t, st + 0.1, 0.8));
        if (tp > 0) {
          ctx.save(); ctx.globalAlpha *= clamp(tp * 1.4); ctx.translate((1 - tp) * -60 * u, 0);
          useFit(S, R); ctx.fillStyle = pal.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          const th = R.lines.length * R.size * 1.3;
          R.lines.forEach((l, j) => ctx.fillText(l, cx + r + 36 * u, cy - th / 2 + R.size * 0.95 + j * R.size * 1.3));
          ctx.restore();
        }
        y += rowH + 34 * u;
      });
    },
  },

  temoignage: {
    label: 'Témoignage', hint: 'Citation d’un client satisfait', bg: 'sombre', duration: 6,
    fields: [
      { k: 'quote', type: 'textarea', label: 'Citation', rows: 4 },
      { k: 'author', type: 'text', label: 'Nom' },
      { k: 'role', type: 'text', label: 'Fonction, entreprise' },
      { k: 'rating', type: 'select', label: 'Étoiles', options: { 0: 'Aucune', 3: '3', 4: '4', 5: '5' } },
    ],
    defaults: { quote: 'Une équipe réactive et créative. Nos ventes ont progressé dès le premier mois.', author: 'Camille Martin', role: 'Directrice, Maison Lumière', rating: '5' },
    draw(S) {
      const { ctx, W, H, u, t, p, pal, F } = S;
      const P = pad(S), maxW = W - P * 2;
      const Q = fit(S, p.quote, { size: (S.portrait ? 76 : 70) * u, maxW: S.portrait ? maxW : maxW * 0.86, maxLines: S.portrait ? 8 : 5 });
      const qh = Q.lines.length * Q.size * 1.18;
      const markS = 260 * u;
      const h = markS * 0.55 + qh + 150 * u;
      let y = (H - h) / 2;
      const mp = E.outBack(prog(t, 0.05, 0.8));
      if (mp > 0) {
        ctx.save(); ctx.translate(P + markS * 0.22, y + markS * 0.3); ctx.scale(mp, mp);
        setFont(ctx, 'Playfair Display', 700, sz(markS)); setTrack(ctx, 0); ctx.fillStyle = pal.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('“', 0, markS * 0.28); ctx.restore(); ctx.textBaseline = 'alphabetic';
      }
      y += markS * 0.55;
      y += revealLines(S, Q, P, y, { start: 0.35, stagger: 0.14, color: pal.fg, lh: 1.18 }) + 50 * u;
      const ap = E.outCubic(prog(t, 0.6 + Q.lines.length * 0.14, 0.7));
      ctx.save(); ctx.globalAlpha *= ap; ctx.translate(0, (1 - ap) * 20 * u);
      ctx.fillStyle = pal.accent; ctx.fillRect(P, y + 8 * u, 50 * u, 4 * u);
      setFont(ctx, F.body, 700, sz(42 * u)); setTrack(ctx, 0); ctx.fillStyle = pal.fg; ctx.textAlign = 'left';
      ctx.fillText(p.author || '', P + 74 * u, y + 24 * u);
      setFont(ctx, F.body, F.bw, sz(34 * u)); ctx.fillStyle = pal.muted; ctx.fillText(p.role || '', P + 74 * u, y + 72 * u);
      ctx.restore();
      const stars = +p.rating || 0;
      for (let i = 0; i < stars; i++) {
        const sp = E.outBack(prog(t, 1.4 + Q.lines.length * 0.14 + i * 0.1, 0.5));
        if (sp <= 0) continue;
        const sx = W - P - (stars - i - 0.5) * 56 * u, sy = y + 30 * u, R = 22 * u * sp;
        ctx.fillStyle = pal.accent; ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? R * 0.45 : R; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
      }
    },
  },

  image: {
    label: 'Image plein écran', hint: 'Photo avec zoom lent et légende', bg: 'sombre', duration: 4.5,
    fields: [
      { k: 'image', type: 'image', label: 'Image' },
      { k: 'title', type: 'textarea', label: 'Légende', rows: 2 },
      { k: 'subtitle', type: 'text', label: 'Sous-titre' },
      { k: 'motion', type: 'select', label: 'Mouvement', options: { avant: 'Zoom avant', arriere: 'Zoom arrière', gauche: 'Glissement vers la gauche' } },
    ],
    defaults: { image: '', title: 'Un savoir-faire unique', subtitle: '', motion: 'avant' },
    draw(S) {
      const { ctx, W, H, u, t, d, p, pal } = S;
      const img = p.image && S.assets?.images?.[p.image];
      const k = E.inOutCubic(clamp(t / d));
      if (img) {
        let sc = 1.0, dx = 0;
        if (p.motion === 'arriere') sc = 1.14 - 0.14 * k; else if (p.motion === 'gauche') { sc = 1.12; dx = (0.5 - k) * W * 0.08; } else sc = 1 + 0.14 * k;
        const r = Math.max(W / img.width, H / img.height) * sc;
        const w = img.width * r, h = img.height * r;
        ctx.drawImage(img, (W - w) / 2 + dx, (H - h) / 2, w, h);
      } else {
        ctx.strokeStyle = rgba(pal.fg, 0.35); ctx.lineWidth = 3 * u; ctx.setLineDash([16 * u, 12 * u]);
        rrect(ctx, W * 0.1, H * 0.1, W * 0.8, H * 0.8, 30 * u); ctx.stroke(); ctx.setLineDash([]);
        setFont(ctx, S.F.body, 600, sz(38 * u)); ctx.fillStyle = rgba(pal.fg, 0.6); ctx.textAlign = 'center';
        ctx.fillText('Ajoute une image dans le panneau de droite', W / 2, H * 0.3);
      }
      if (!p.title && !p.subtitle) return;
      const g = ctx.createLinearGradient(0, H * 0.4, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.78)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const P = pad(S);
      const T = fit(S, p.title || '', { size: (S.portrait ? 104 : 96) * u, maxW: W - P * 2, maxLines: 3 });
      const sub = p.subtitle ? fit(S, p.subtitle, { display: false, size: 40 * u, maxW: W - P * 2, maxLines: 2 }) : null;
      const th = T.lines.length * T.size * 1.06 + (sub ? 30 * u + sub.lines.length * sub.size * 1.35 : 0);
      let y = H - P - th;
      y += revealLines(S, T, P, y, { start: 0.4, color: '#FFFFFF', lh: 1.06 });
      if (sub) fadeText(S, sub, P, y + 30 * u, { start: 0.9, color: 'rgba(255,255,255,.82)' });
    },
  },

  graphique: {
    label: 'Graphique', hint: 'Barres qui montent avec les valeurs', bg: 'clair', duration: 5.5,
    fields: [
      { k: 'title', type: 'text', label: 'Titre' },
      { k: 'unit', type: 'text', label: 'Unité', placeholder: 'k€, %, clients…' },
      { k: 'items', type: 'items', label: 'Barres', max: 7, add: 'Ajouter une barre', item: [{ k: 'label', label: 'Libellé', placeholder: '2025' }, { k: 'value', label: 'Valeur', placeholder: '120' }] },
    ],
    defaults: { title: 'Chiffre d’affaires', unit: 'k€', items: [{ label: '2022', value: '120' }, { label: '2023', value: '185' }, { label: '2024', value: '260' }, { label: '2025', value: '410' }] },
    draw(S) {
      const { ctx, W, H, u, t, p, pal, F } = S;
      const P = pad(S), items = (p.items || []).slice(0, 7), n = Math.max(1, items.length);
      const T = fit(S, p.title || '', { size: (S.portrait ? 96 : 84) * u, maxW: W - P * 2, maxLines: 2 });
      let y = P + (S.portrait ? H * 0.06 : 0);
      y += revealLines(S, T, P, y, { start: 0.1, color: pal.fg }) + 60 * u;
      const baseY = H - P - 70 * u, top = y + 80 * u, ch = baseY - top;
      const vals = items.map((it) => num(it.value)?.val || 0);
      const max = Math.max(1, ...vals);
      const gap = (W - P * 2) / n, bw = Math.min(gap * 0.62, 220 * u);
      const ap = E.outExpo(prog(t, 0.3, 1));
      ctx.fillStyle = rgba(pal.fg, 0.35); ctx.fillRect(P, baseY, (W - P * 2) * ap, 3 * u);
      const best = vals.indexOf(max);
      items.forEach((it, i) => {
        const st = 0.55 + i * 0.13;
        const gp = E.outCubic(prog(t, st, 1.1));
        const h = (vals[i] / max) * ch * gp;
        const x = P + gap * i + (gap - bw) / 2;
        ctx.fillStyle = i === best ? pal.accent : rgba(pal.fg, 0.2);
        rrect(ctx, x, baseY - h, bw, h, Math.min(16 * u, h / 2)); ctx.fill();
        if (gp > 0) {
          const nv = num(it.value);
          setFont(ctx, F.display, F.dw, sz(Math.min(56 * u, bw * 0.38), true)); setTrack(ctx, 0);
          ctx.fillStyle = pal.fg; ctx.textAlign = 'center'; ctx.globalAlpha = clamp(gp * 2);
          ctx.fillText(`${nv ? fmtNum(nv.val * gp, nv.dec) : it.value}${p.unit ? ` ${p.unit}` : ''}`, x + bw / 2, baseY - h - 18 * u);
          setFont(ctx, F.body, 600, sz(Math.min(34 * u, gap * 0.22))); ctx.fillStyle = pal.muted;
          ctx.fillText(it.label || '', x + bw / 2, baseY + 50 * u); ctx.globalAlpha = 1;
        }
      });
    },
  },

  etapes: {
    label: 'Étapes', hint: 'Un processus en 2 à 4 temps', bg: 'sombre', duration: 6,
    fields: [
      { k: 'title', type: 'text', label: 'Titre' },
      { k: 'items', type: 'items', label: 'Étapes', max: 4, add: 'Ajouter une étape', item: [{ k: 'label', label: 'Étape', placeholder: 'Diagnostic' }, { k: 'desc', label: 'Détail', placeholder: 'On analyse vos besoins' }] },
    ],
    defaults: { title: 'Comment ça marche', items: [{ label: 'Échange', desc: 'On écoute vos objectifs' }, { label: 'Création', desc: 'On conçoit votre projet' }, { label: 'Lancement', desc: 'On vous accompagne' }] },
    draw(S) {
      const { ctx, W, H, u, t, p, pal, F } = S;
      const P = pad(S), items = (p.items || []).slice(0, 4), n = Math.max(1, items.length);
      const vertical = S.portrait || S.square;
      const T = fit(S, p.title || '', { size: 88 * u, maxW: W - P * 2, maxLines: 2 });
      const r = (vertical ? 46 : 52) * u;
      const lineStart = 0.5, lineDur = 0.5 + n * 0.45;
      const lp = E.inOutCubic(prog(t, lineStart, lineDur));
      if (!vertical) {
        let y = H * 0.18;
        revealLines(S, T, W / 2, y, { align: 'center', start: 0.1, color: pal.fg });
        const cy = H * 0.5, gap = (W - P * 2) / n, x0 = P + gap / 2, x1 = P + gap * (n - 0.5);
        ctx.strokeStyle = rgba(pal.fg, 0.2); ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
        ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x0 + (x1 - x0) * lp, cy); ctx.stroke();
        items.forEach((it, i) => {
          const cx = x0 + gap * i, reach = n === 1 ? 0 : i / (n - 1);
          const st = lineStart + lineDur * reach;
          stepDot(S, cx, cy, r, i + 1, prog(t, st - 0.1, 0.5));
          const L = fit(S, it.label || '', { size: 52 * u, maxW: gap * 0.86, maxLines: 2 });
          const D = fit(S, it.desc || '', { display: false, size: 32 * u, maxW: gap * 0.86, maxLines: 3 });
          const ly = cy + r + 44 * u;
          fadeText(S, L, cx, ly, { align: 'center', start: st + 0.1, color: pal.fg, lh: 1.1 });
          fadeText(S, D, cx, ly + L.lines.length * L.size * 1.1 + 16 * u, { align: 'center', start: st + 0.25, color: pal.muted });
        });
      } else {
        let y = P + 20 * u;
        y += revealLines(S, T, P, y, { start: 0.1, color: pal.fg }) + 80 * u;
        const cx = P + r, rowH = Math.min(340 * u, (H - y - P) / n), y0 = y + r, y1 = y + r + rowH * (n - 1);
        ctx.strokeStyle = rgba(pal.fg, 0.2); ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke();
        ctx.strokeStyle = pal.accent; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y0 + (y1 - y0) * lp); ctx.stroke();
        items.forEach((it, i) => {
          const cy = y0 + rowH * i, st = lineStart + lineDur * (n === 1 ? 0 : i / (n - 1));
          stepDot(S, cx, cy, r, i + 1, prog(t, st - 0.1, 0.5));
          const tx = cx + r + 44 * u, mw = W - tx - P;
          const L = fit(S, it.label || '', { size: 60 * u, maxW: mw, maxLines: 2 });
          const D = fit(S, it.desc || '', { display: false, size: 38 * u, maxW: mw, maxLines: 3 });
          fadeText(S, L, tx, cy - r * 0.9, { start: st + 0.1, color: pal.fg, lh: 1.1 });
          fadeText(S, D, tx, cy - r * 0.9 + L.lines.length * L.size * 1.1 + 12 * u, { start: st + 0.25, color: pal.muted });
        });
      }
      function stepDot(S2, x, y, rad, label, q) {
        const e = E.outBack(q); if (e <= 0) return;
        ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(x, y, rad * e, 0, 6.283); ctx.fill();
        setFont(ctx, F.display, F.dw, sz(rad * 0.95 * e, true)); setTrack(ctx, 0); ctx.fillStyle = onColor(pal.accent);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(label), x, y + rad * 0.04); ctx.textBaseline = 'alphabetic';
      }
    },
  },

  libre: {
    label: 'Scène libre', hint: 'Un fond vide : ajoute tes textes, images, vidéos et avatars', bg: 'sombre', duration: 5,
    fields: [], defaults: {},
    draw() {},
  },

  offre: {
    label: 'Offre et prix', hint: 'Prix, prix barré, badge et avantages', bg: 'sombre', duration: 5,
    fields: [
      { k: 'kicker', type: 'text', label: 'Surtitre', placeholder: 'Offre du moment' },
      { k: 'product', type: 'text', label: 'Produit ou formule' },
      { k: 'price', type: 'text', label: 'Prix', placeholder: '29,90 €' },
      { k: 'oldPrice', type: 'text', label: 'Ancien prix (barré)', placeholder: 'Facultatif' },
      { k: 'unit', type: 'text', label: 'Unité', placeholder: '/ mois, / personne…' },
      { k: 'badge', type: 'text', label: 'Badge', placeholder: '-25 %, Nouveau…' },
      { k: 'items', type: 'items', label: 'Inclus', max: 4, add: 'Ajouter un avantage', item: [{ k: 'text', label: 'Texte', placeholder: 'Sans engagement' }] },
      { k: 'image', type: 'image', label: 'Image (facultative)' },
    ],
    defaults: { kicker: 'Offre du moment', product: 'Formule découverte', price: '29,90 €', oldPrice: '39,90 €', unit: '', badge: '-25 %', items: [{ text: 'Sans engagement' }, { text: 'Satisfait ou remboursé' }], image: '' },
    draw(S) {
      const { ctx, W, H, u, t, d, p, pal, F } = S;
      const P = pad(S);
      const img = p.image && S.assets?.images?.[p.image];
      const side = img && !S.portrait;
      if (img) {
        const k = E.inOutCubic(clamp(t / d));
        const ix = P * 0.7, iy = S.portrait ? P * 0.7 : P * 0.7, iw = side ? W * 0.5 - P : W - P * 1.4, ih = side ? H - P * 1.4 : H * 0.4;
        ctx.save(); ctx.globalAlpha *= prog(t, 0, 0.5); rrect(ctx, ix, iy, iw, ih, 30 * u); ctx.clip();
        coverDraw(ctx, img, ix, iy, iw, ih, 0.5, 1.04 + 0.08 * k); ctx.restore();
      }
      const cw = side ? W * 0.5 - P * 1.2 : Math.min(W - P * 2, 980 * u);
      const cx = side ? W * 0.5 + P * 0.2 : (W - cw) / 2;
      const inner = cw - 100 * u;
      const K = p.kicker ? 70 * u : 0;
      const T = fit(S, p.product || '', { size: (S.portrait ? 84 : 76) * u, maxW: inner, maxLines: 2 });
      const PR = fit(S, p.price || '', { size: (S.portrait ? 190 : 170) * u, maxW: inner * 0.82, maxLines: 1, min: 0.25 });
      const items = (p.items || []).filter((i) => i.text).slice(0, 4);
      const rows = items.map((it) => fit(S, it.text, { display: false, size: 38 * u, maxW: inner - 50 * u, maxLines: 1, min: 0.6 }));
      const ch = 60 * u + K + T.lines.length * T.size * 1.08 + 40 * u + PR.size * 1.1 + (p.oldPrice ? 50 * u : 0) + (rows.length ? 40 * u + rows.length * 58 * u : 0) + 50 * u;
      const top = side ? (H - ch) / 2 : img ? H * 0.4 + P * 1.2 : (H - ch) / 2;
      const cy = Math.min(top, H - ch - P * 0.6);
      const ep = E.outCubic(prog(t, 0.1, 0.7));
      ctx.save(); ctx.globalAlpha *= ep; ctx.translate(0, (1 - ep) * 50 * u);
      ctx.fillStyle = mix(pal.base, pal.fg, pal.dark ? 0.08 : 0.04); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 60 * u; ctx.shadowOffsetY = 24 * u;
      rrect(ctx, cx, cy, cw, ch, 34 * u); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = rgba(pal.fg, 0.12); ctx.lineWidth = 2 * u; rrect(ctx, cx, cy, cw, ch, 34 * u); ctx.stroke();
      ctx.restore();
      const x = cx + 50 * u; let y = cy + 60 * u;
      if (K) { kicker(S, p.kicker, x, y - 20 * u, { start: 0.3, color: pal.accent }); y += K; }
      y += revealLines(S, T, x, y, { start: 0.35, color: pal.fg }) + 40 * u;
      if (p.oldPrice) {
        const op = E.outCubic(prog(t, 0.6, 0.5));
        setFont(ctx, F.body, 600, sz(44 * u)); setTrack(ctx, 0);
        ctx.save(); ctx.globalAlpha *= op; ctx.fillStyle = pal.muted; ctx.textAlign = 'left'; ctx.fillText(p.oldPrice, x, y + 36 * u);
        const ow = ctx.measureText(p.oldPrice).width, sp = E.outExpo(prog(t, 0.9, 0.5));
        ctx.strokeStyle = S.b.colors.secondary; ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.moveTo(x - 6 * u, y + 22 * u); ctx.lineTo(x - 6 * u + (ow + 12 * u) * sp, y + 18 * u); ctx.stroke();
        ctx.restore(); y += 50 * u;
      }
      const pp = E.outBack(prog(t, 0.95, 0.7));
      if (pp > 0) {
        useFit(S, PR); const pw = ctx.measureText(PR.lines[0]).width;
        ctx.save(); ctx.translate(x, y + PR.size * 0.9); ctx.scale(pp, pp); ctx.fillStyle = pal.accent; ctx.textAlign = 'left'; ctx.fillText(PR.lines[0], 0, 0); ctx.restore();
        if (p.unit) { setFont(ctx, F.body, 600, sz(40 * u)); ctx.fillStyle = pal.muted; ctx.globalAlpha = clamp(pp); ctx.fillText(p.unit, x + pw + 16 * u, y + PR.size * 0.9); ctx.globalAlpha = 1; }
      }
      y += PR.size * 1.1 + 40 * u;
      rows.forEach((R, i) => {
        const q = E.outCubic(prog(t, 1.3 + i * 0.18, 0.5)); if (q <= 0) return;
        ctx.save(); ctx.globalAlpha *= q; ctx.translate((1 - q) * 30 * u, 0);
        ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(x + 14 * u, y + i * 58 * u + 20 * u, 14 * u, 0, 6.283); ctx.fill();
        ctx.strokeStyle = onColor(pal.accent); ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.moveTo(x + 7 * u, y + i * 58 * u + 20 * u); ctx.lineTo(x + 12 * u, y + i * 58 * u + 26 * u); ctx.lineTo(x + 21 * u, y + i * 58 * u + 14 * u); ctx.stroke();
        useFit(S, R); ctx.fillStyle = pal.fg; ctx.textAlign = 'left'; ctx.fillText(R.lines[0], x + 50 * u, y + i * 58 * u + 34 * u);
        ctx.restore();
      });
      if (p.badge) {
        const bp = E.outBack(prog(t, 1.15, 0.6));
        if (bp > 0) {
          const r = 92 * u, bx = cx + cw - r * 0.55, by = cy + r * 0.25;
          ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.22 + Math.sin(t * 2.2) * 0.04); ctx.scale(bp, bp);
          ctx.fillStyle = S.b.colors.secondary; ctx.beginPath();
          for (let k2 = 0; k2 < 24; k2++) { const a2 = (k2 / 24) * Math.PI * 2, rr2 = k2 % 2 ? r * 0.9 : r; ctx.lineTo(Math.cos(a2) * rr2, Math.sin(a2) * rr2); }
          ctx.closePath(); ctx.fill();
          let B = fit(S, p.badge, { size: 54 * u, maxW: r * 1.45, maxLines: 1, min: 0.55 });
          if (B.size <= 54 * u * 0.55 + 0.01) B = fit(S, p.badge, { size: 48 * u, maxW: r * 1.4, maxLines: 2, min: 0.4 });
          useFit(S, B); ctx.fillStyle = onColor(S.b.colors.secondary); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          B.lines.forEach((l, j) => ctx.fillText(l, 0, (j - (B.lines.length - 1) / 2) * B.size * 1.05));
          ctx.restore(); ctx.textBaseline = 'alphabetic';
        }
      }
    },
  },

  avantapres: {
    label: 'Avant / Après', hint: 'Un volet qui révèle la transformation', bg: 'sombre', duration: 5,
    fields: [
      { k: 'before', type: 'image', label: 'Photo avant' },
      { k: 'after', type: 'image', label: 'Photo après' },
      { k: 'title', type: 'textarea', label: 'Légende', rows: 2 },
      { k: 'labelBefore', type: 'text', label: 'Étiquette avant' },
      { k: 'labelAfter', type: 'text', label: 'Étiquette après' },
    ],
    defaults: { before: '', after: '', title: 'Le résultat parle de lui-même', labelBefore: 'Avant', labelAfter: 'Après' },
    draw(S) {
      const { ctx, W, H, u, t, d, p, pal, F } = S;
      const after = p.after && S.assets?.images?.[p.after];
      const before = p.before && S.assets?.images?.[p.before];
      const z = 1.02 + 0.04 * E.inOutCubic(clamp(t / d));
      if (!after) {
        ctx.strokeStyle = rgba(pal.fg, 0.35); ctx.lineWidth = 3 * u; ctx.setLineDash([16 * u, 12 * u]);
        rrect(ctx, W * 0.1, H * 0.1, W * 0.8, H * 0.8, 30 * u); ctx.stroke(); ctx.setLineDash([]);
        setFont(ctx, F.body, 600, sz(38 * u)); ctx.fillStyle = rgba(pal.fg, 0.6); ctx.textAlign = 'center';
        ctx.fillText('Ajoute les photos avant et après', W / 2, H * 0.3);
        return;
      }
      coverDraw(ctx, after, 0, 0, W, H, 0.5, z);
      const wipe = E.inOutCubic(prog(t, 0.7, 1.2));
      const split = W * (1 - 0.5 * wipe) + (t > 1.9 ? Math.sin((t - 1.9) * 1.6) * W * 0.06 : 0);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, split, H); ctx.clip();
      if (before) coverDraw(ctx, before, 0, 0, W, H, 0.5, z);
      else { if ('filter' in ctx) ctx.filter = 'grayscale(1) brightness(0.82) contrast(0.9)'; coverDraw(ctx, after, 0, 0, W, H, 0.5, z); ctx.filter = 'none'; }
      ctx.restore();
      if (wipe > 0 && split < W) {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(split - 3 * u, 0, 6 * u, H);
        const hy = H * 0.5, hr = 38 * u;
        ctx.beginPath(); ctx.arc(split, hy, hr, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 5 * u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(split - 8 * u, hy - 12 * u); ctx.lineTo(split - 18 * u, hy); ctx.lineTo(split - 8 * u, hy + 12 * u);
        ctx.moveTo(split + 8 * u, hy - 12 * u); ctx.lineTo(split + 18 * u, hy); ctx.lineTo(split + 8 * u, hy + 12 * u); ctx.stroke();
      }
      const pill = (txt, x, y, align, q) => {
        if (!txt || q <= 0) return;
        setFont(ctx, F.body, 800, sz(30 * u)); setTrack(ctx, 3 * u);
        const tw = ctx.measureText(txt.toUpperCase()).width + 44 * u, bx = align === 'left' ? x : x - tw;
        ctx.save(); ctx.globalAlpha *= q; ctx.fillStyle = 'rgba(0,0,0,.6)'; rrect(ctx, bx, y, tw, 58 * u, 29 * u); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(txt.toUpperCase(), bx + 22 * u, y + 39 * u); ctx.restore(); setTrack(ctx, 0);
      };
      const P = pad(S);
      pill(p.labelBefore, P * 0.6, P * 0.6, 'left', E.outCubic(prog(t, 0.3, 0.5)));
      pill(p.labelAfter, W - P * 0.6, P * 0.6, 'right', E.outCubic(prog(t, 1.2, 0.5)));
      if (p.title) {
        const g = ctx.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)');
        ctx.fillStyle = g; ctx.fillRect(0, H * 0.55, W, H * 0.45);
        const T = fit(S, p.title, { size: (S.portrait ? 92 : 84) * u, maxW: W - P * 2, maxLines: 2 });
        revealLines(S, T, W / 2, H - P - T.lines.length * T.size * 1.08, { align: 'center', start: 1.4, color: '#FFFFFF' });
      }
    },
  },

  fiche: {
    label: 'Fiche', hint: 'Photo et caractéristiques : bien, produit, véhicule', bg: 'clair', duration: 6,
    fields: [
      { k: 'image', type: 'image', label: 'Photo' },
      { k: 'subtitle', type: 'text', label: 'Surtitre', placeholder: 'Lieu, catégorie…' },
      { k: 'title', type: 'textarea', label: 'Titre', rows: 2 },
      { k: 'price', type: 'text', label: 'Prix', placeholder: 'Facultatif' },
      { k: 'items', type: 'items', label: 'Caractéristiques', max: 4, add: 'Ajouter une caractéristique', item: [{ k: 'value', label: 'Valeur', placeholder: '98 m²' }, { k: 'label', label: 'Libellé', placeholder: 'Surface' }] },
    ],
    defaults: { image: '', subtitle: 'Lyon 6e', title: 'Appartement lumineux avec balcon', price: '495 000 €', items: [{ value: '98 m²', label: 'Surface' }, { value: '3', label: 'Chambres' }, { value: '12 m²', label: 'Balcon' }, { value: 'B', label: 'Énergie' }] },
    draw(S) {
      const { ctx, W, H, u, t, d, p, pal, F } = S;
      const P = pad(S), img = p.image && S.assets?.images?.[p.image];
      const vertical = S.portrait || S.square;
      const ir = vertical ? { x: P * 0.7, y: P * 0.7, w: W - P * 1.4, h: H * (S.square ? 0.4 : 0.42) } : { x: P * 0.7, y: P * 0.7, w: W * 0.52, h: H - P * 1.4 };
      const ip = E.outCubic(prog(t, 0, 0.7));
      ctx.save(); ctx.globalAlpha *= ip;
      ctx.translate(ir.x + ir.w / 2, ir.y + ir.h / 2); ctx.scale(0.94 + 0.06 * ip, 0.94 + 0.06 * ip); ctx.translate(-(ir.x + ir.w / 2), -(ir.y + ir.h / 2));
      rrect(ctx, ir.x, ir.y, ir.w, ir.h, 30 * u); ctx.clip();
      if (img) coverDraw(ctx, img, ir.x, ir.y, ir.w, ir.h, 0.5, 1.03 + 0.07 * E.inOutCubic(clamp(t / d)));
      else { ctx.fillStyle = mix(pal.base, pal.accent, 0.25); ctx.fillRect(ir.x, ir.y, ir.w, ir.h); setFont(ctx, F.body, 600, sz(32 * u)); ctx.fillStyle = pal.muted; ctx.textAlign = 'center'; ctx.fillText('Ajoute une photo', ir.x + ir.w / 2, ir.y + ir.h / 2); }
      ctx.restore();
      const cx = vertical ? P : ir.x + ir.w + P * 0.8, cw = vertical ? W - P * 2 : W - cx - P;
      const items = (p.items || []).filter((i) => i.value || i.label).slice(0, 4);
      const T = fit(S, p.title || '', { size: (vertical ? 78 : 72) * u, maxW: cw, maxLines: 3 });
      const cols = 2, gap = 20 * u, cellW = (cw - gap) / cols, cellH = 140 * u;
      const gridH = Math.ceil(items.length / cols) * (cellH + gap);
      const h = (p.subtitle ? 64 * u : 0) + T.lines.length * T.size * 1.08 + (p.price ? 100 * u : 30 * u) + gridH;
      let y = vertical ? ir.y + ir.h + P * 0.7 : Math.max(P, (H - h) / 2);
      if (p.subtitle) { kicker(S, p.subtitle, cx, y, { start: 0.4, color: pal.accent }); y += 64 * u; }
      y += revealLines(S, T, cx, y, { start: 0.5, color: pal.fg });
      if (p.price) {
        const pp = E.outBack(prog(t, 0.95, 0.6));
        setFont(ctx, F.display, F.dw, sz(70 * u, true)); setTrack(ctx, 0);
        ctx.save(); ctx.globalAlpha *= clamp(pp); ctx.fillStyle = pal.accent; ctx.textAlign = 'left'; ctx.fillText(p.price, cx, y + 80 * u); ctx.restore();
        y += 110 * u;
      } else y += 30 * u;
      items.forEach((it, i) => {
        const q = E.outBack(prog(t, 1.2 + i * 0.15, 0.55)); if (q <= 0) return;
        const x = cx + (i % cols) * (cellW + gap), yy = y + Math.floor(i / cols) * (cellH + gap);
        ctx.save(); ctx.translate(x + cellW / 2, yy + cellH / 2); ctx.scale(q, q); ctx.translate(-(x + cellW / 2), -(yy + cellH / 2));
        ctx.fillStyle = mix(pal.base, pal.fg, pal.dark ? 0.1 : 0.06); rrect(ctx, x, yy, cellW, cellH, 20 * u); ctx.fill();
        const V = fit(S, it.value || '', { size: 56 * u, maxW: cellW - 40 * u, maxLines: 1, min: 0.4 });
        useFit(S, V); ctx.fillStyle = pal.fg; ctx.textAlign = 'left'; ctx.fillText(V.lines[0], x + 22 * u, yy + 22 * u + V.size * 0.9);
        setFont(ctx, F.body, 600, sz(28 * u)); setTrack(ctx, 0); ctx.fillStyle = pal.muted; ctx.fillText(it.label || '', x + 22 * u, yy + cellH - 26 * u);
        ctx.restore();
      });
    },
  },

  evenement: {
    label: 'Événement', hint: 'Calendrier animé : date, heure et lieu', bg: 'sombre', duration: 5.5,
    fields: [
      { k: 'kicker', type: 'text', label: 'Surtitre' },
      { k: 'title', type: 'textarea', label: 'Nom de l’événement', rows: 2 },
      { k: 'date', type: 'text', label: 'Date', placeholder: 'Samedi 14 décembre' },
      { k: 'time', type: 'text', label: 'Heure', placeholder: '19 h 30' },
      { k: 'place', type: 'text', label: 'Lieu', placeholder: 'Adresse ou « En ligne »' },
      { k: 'button', type: 'text', label: 'Bouton', placeholder: 'Facultatif' },
    ],
    defaults: { kicker: 'À noter dans l’agenda', title: 'Soirée de lancement', date: 'Samedi 14 décembre', time: '19 h 30', place: 'Le Grand Atelier, Paris', button: 'Je réserve ma place' },
    draw(S) {
      const { ctx, W, H, u, t, p, pal, F } = S;
      const P = pad(S), vertical = S.portrait || S.square;
      const dateS = String(p.date || '');
      const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
      const low = dateS.toLowerCase();
      const day = (dateS.match(/\b(\d{1,2})\b/) || [])[1] || '';
      const month = MONTHS.find((m) => low.includes(m)) || '';
      const wd = DAYS.find((x) => low.includes(x)) || '';
      const cw = (vertical ? 420 : 400) * u, chh = cw * 1.12;
      const cxp = vertical ? (W - cw) / 2 : P + 20 * u, cyp = vertical ? P * 1.1 : (H - chh) / 2;
      const cp = E.outBack(prog(t, 0.1, 0.8));
      if (cp > 0) {
        ctx.save(); ctx.translate(cxp + cw / 2, cyp + chh / 2); ctx.rotate(-0.06 * cp + Math.sin(t * 1.4) * 0.008); ctx.scale(cp, cp); ctx.translate(-cw / 2, -chh / 2);
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 60 * u; ctx.shadowOffsetY = 26 * u;
        ctx.fillStyle = '#FFFFFF'; rrect(ctx, 0, 0, cw, chh, 34 * u); ctx.fill(); ctx.shadowColor = 'transparent';
        ctx.save(); rrect(ctx, 0, 0, cw, chh, 34 * u); ctx.clip(); ctx.fillStyle = pal.accent; ctx.fillRect(0, 0, cw, chh * 0.27); ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,.25)'; for (const rx of [cw * 0.28, cw * 0.72]) { ctx.beginPath(); ctx.arc(rx, chh * 0.04, 12 * u, 0, 6.283); ctx.fill(); }
        setFont(ctx, F.body, 800, sz(40 * u)); setTrack(ctx, 6 * u); ctx.fillStyle = onColor(pal.accent); ctx.textAlign = 'center';
        ctx.fillText((month || 'Agenda').toUpperCase(), cw / 2, chh * 0.18); setTrack(ctx, 0);
        const dn = E.outExpo(prog(t, 0.5, 0.9));
        setFont(ctx, F.display, F.dw, sz(230 * u, true)); ctx.fillStyle = '#16141F';
        ctx.save(); ctx.globalAlpha *= dn; ctx.fillText(day || '★', cw / 2, chh * 0.74 + (1 - dn) * 30 * u); ctx.restore();
        setFont(ctx, F.body, 700, sz(36 * u)); ctx.fillStyle = '#6A6878'; ctx.fillText(wd ? wd.charAt(0).toUpperCase() + wd.slice(1) : '', cw / 2, chh * 0.9);
        ctx.restore();
      }
      const tx = vertical ? P : cxp + cw + P * 0.9, tw = vertical ? W - P * 2 : W - tx - P;
      const T = fit(S, p.title || '', { size: (vertical ? 92 : 96) * u, maxW: tw, maxLines: 3 });
      const rows = [['clock', p.time], ['pin', p.place], ['cal', vertical ? '' : dateS]].filter((r) => r[1]);
      const h = (p.kicker ? 64 * u : 0) + T.lines.length * T.size * 1.08 + 40 * u + rows.length * 70 * u + (p.button ? 140 * u : 0);
      let y = vertical ? cyp + chh + P * 0.8 : (H - h) / 2;
      const al = vertical ? 'center' : 'left', ax = vertical ? W / 2 : tx;
      if (p.kicker) { kicker(S, p.kicker, ax, y, { align: al, start: 0.5, color: pal.accent }); y += 64 * u; }
      y += revealLines(S, T, ax, y, { align: al, start: 0.6, color: pal.fg }) + 40 * u;
      rows.forEach(([icn, txt], i) => {
        const q = E.outCubic(prog(t, 1.2 + i * 0.2, 0.5)); if (q <= 0) return;
        setFont(ctx, F.body, 600, sz(42 * u)); setTrack(ctx, 0);
        const w = ctx.measureText(txt).width + 64 * u, x0 = vertical ? W / 2 - w / 2 : tx;
        ctx.save(); ctx.globalAlpha *= q; ctx.translate((1 - q) * 30 * u, 0);
        const ix = x0 + 20 * u, iy = y + i * 70 * u + 22 * u;
        ctx.strokeStyle = pal.accent; ctx.fillStyle = pal.accent; ctx.lineWidth = 5 * u; ctx.lineCap = 'round';
        if (icn === 'clock') { ctx.beginPath(); ctx.arc(ix, iy, 18 * u, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ix, iy - 10 * u); ctx.lineTo(ix, iy); ctx.lineTo(ix + 8 * u, iy + 6 * u); ctx.stroke(); }
        else if (icn === 'pin') { ctx.beginPath(); ctx.arc(ix, iy - 6 * u, 15 * u, Math.PI, 0); ctx.lineTo(ix, iy + 20 * u); ctx.closePath(); ctx.fill(); ctx.fillStyle = pal.base; ctx.beginPath(); ctx.arc(ix, iy - 6 * u, 6 * u, 0, 6.283); ctx.fill(); }
        else { ctx.strokeRect(ix - 17 * u, iy - 14 * u, 34 * u, 32 * u); ctx.beginPath(); ctx.moveTo(ix - 17 * u, iy - 4 * u); ctx.lineTo(ix + 17 * u, iy - 4 * u); ctx.stroke(); }
        ctx.fillStyle = pal.fg; ctx.textAlign = 'left'; ctx.fillText(txt, x0 + 64 * u, y + i * 70 * u + 37 * u);
        ctx.restore();
      });
      y += rows.length * 70 * u + 40 * u;
      if (p.button) {
        const bp = E.outBack(prog(t, 1.8, 0.6));
        if (bp > 0) {
          setFont(ctx, F.body, 700, sz(40 * u)); setTrack(ctx, 0);
          const bw = ctx.measureText(p.button).width + 100 * u, bh = 96 * u, bx = vertical ? W / 2 : tx + bw / 2;
          ctx.save(); ctx.translate(bx, y + bh / 2); ctx.scale(bp, bp); ctx.fillStyle = pal.accent; rrect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
          ctx.fillStyle = onColor(pal.accent); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.button, 0, 2 * u); ctx.restore(); ctx.textBaseline = 'alphabetic';
        }
      }
    },
  },

  presentateur: {
    label: 'Présentateur', hint: 'Un avatar qui parle, avec voix et sous-titres', bg: 'sombre', duration: 8,
    fields: [
      { k: 'avatar', type: 'avatar', label: 'Avatar' },
      { k: 'script', type: 'textarea', label: 'Texte prononcé', rows: 4, placeholder: 'Ce que dit l’avatar. Sert aux sous-titres et à la voix IA.' },
      { k: 'voice', type: 'voice', label: 'Voix' },
      { k: 'layout', type: 'select', label: 'Mise en page', options: { cote: 'Avatar à côté du contenu', medaillon: 'Avatar en médaillon', plein: 'Avatar plein cadre' } },
      { k: 'side', type: 'select', label: 'Côté de l’avatar', options: { gauche: 'Gauche', droite: 'Droite' } },
      { k: 'title', type: 'textarea', label: 'Titre affiché', rows: 2 },
      { k: 'items', type: 'items', label: 'Points affichés pendant qu’il parle', max: 4, add: 'Ajouter un point', item: [{ k: 'text', label: 'Texte', placeholder: 'Un argument clé' }] },
      { k: 'captions', type: 'toggle', label: 'Sous-titres' },
    ],
    defaults: {
      avatar: null, script: 'Bonjour ! En moins d’une minute, je vous montre comment nous pouvons vous aider à grandir.', voice: '', video: '', videoKey: '', model: 'avatar-standard',
      layout: 'cote', side: 'gauche', title: 'Ce que nous vous apportons',
      items: [{ text: 'Un accompagnement sur mesure' }, { text: 'Des résultats mesurables' }, { text: 'Une équipe à votre écoute' }], captions: true,
    },
    draw(S) {
      const { ctx, W, H, u, t, d, p, pal, b } = S;
      const P = pad(S);
      const av = p.avatar || { kind: 'illustre', config: DEFAULT_CHAR };
      const voice = p.voice ? S.assets?.voices?.[p.voice] : null;
      const vd = p.voiceDelay == null ? VOICE_DELAY : Math.max(0, +p.voiceDelay);
      const lt = t - vd;
      const vdur = voice ? voice.duration : Math.max(1, d - vd - 0.6);
      const speaking = lt >= 0 && lt <= vdur;
      const nt = voice ? null : narrTalk(S.T);
      const talk = voice ? envAt(voice, lt) : nt != null ? nt : (p.script && speaking ? synthTalk(lt) : 0);
      const act = voice ? (envAt(voice, lt - 0.4) + envAt(voice, lt) + envAt(voice, lt + 0.4)) / 3 : nt != null ? ((narrTalk(S.T - 0.4) || 0) + nt + (narrTalk(S.T + 0.4) || 0)) / 3 : (speaking && p.script ? 0.55 : 0);
      const gesture = speaking ? clamp(Math.sin(lt * 0.8 + 0.6) * 1.7 - 0.4) * clamp(act * 2) : 0;
      const left = p.side !== 'droite';
      const layout = p.layout || 'cote';
      const enter = E.outBack(prog(t, 0.05, 0.85)), fade = prog(t, 0.05, 0.4);
      const isPhoto = av.kind === 'photo';
      const vid = p.video ? S.assets?.videos?.[p.video] : null;
      const photo = isPhoto ? S.assets?.photos?.[av.photo] : null;
      const anim = { t, talk, gesture, dir: left ? 1 : -1, outfit: b.colors.primary, accent: b.colors.secondary };

      const realSrc = vid && vid.readyState >= 2 ? vid : photo;
      const badge = (x, y) => {
        if (!S.assets?.preview || !isPhoto || vid) return;
        setFont(ctx, S.F.body, 700, sz(24 * u)); setTrack(ctx, 0);
        const txt = 'Aperçu : vidéo IA à générer', w = ctx.measureText(txt).width + 36 * u;
        ctx.fillStyle = 'rgba(0,0,0,.65)'; rrect(ctx, x, y, w, 46 * u, 23 * u); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(txt, x + 18 * u, y + 31 * u);
      };
      const cfgA = av.kind === 'illustre' ? (av.config || {}) : {};
      const tall = (cfgA.style === 'mascotte' ? 1.08 : 1) * (cfgA.species && cfgA.species !== 'humain' ? 1.07 : 1) * (cfgA.hat === 'bonnet' || cfgA.hair === 'crete' || cfgA.hair === 'afro' ? 1.05 : 1);
      const drawIllustrated = (cx, bottom, h) => {
        const sc = h / (820 * tall);
        const g = ctx.createRadialGradient(cx, bottom - 560 * sc, 0, cx, bottom - 560 * sc, 470 * sc);
        g.addColorStop(0, rgba(pal.accent, 0.38 * fade)); g.addColorStop(1, rgba(pal.accent, 0));
        ctx.fillStyle = g; ctx.fillRect(cx - 500 * sc, bottom - 1100 * sc, 1000 * sc, 1100 * sc);
        drawCharacter(ctx, av.kind === 'illustre' ? av.config : DEFAULT_CHAR, cx, bottom + (1 - enter) * h * 0.4, sc, anim);
      };
      const drawInRect = (x, y, w, h, r) => {
        ctx.save();
        const sc = 0.92 + 0.08 * enter; ctx.globalAlpha *= fade;
        ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 50 * u; ctx.shadowOffsetY = 20 * u;
        ctx.fillStyle = mix(pal.base, pal.accent, 0.25); rrect(ctx, x, y, w, h, r); ctx.fill(); ctx.shadowColor = 'transparent';
        rrect(ctx, x, y, w, h, r); ctx.clip();
        if (realSrc) coverDraw(ctx, realSrc, x, y, w, h, 0.3, vid ? 1 : 1.03 + 0.02 * Math.sin(t * 0.6));
        else drawIllustrated(x + w / 2, y + h, h * 0.92);
        ctx.restore();
        badge(x + 18 * u, y + 18 * u);
      };
      const drawInCircle = (cx, cy, r) => {
        const pulse = r + 8 * u + talk * 12 * u;
        ctx.save(); ctx.globalAlpha *= fade;
        ctx.strokeStyle = rgba(pal.accent, 0.5); ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.arc(cx, cy, pulse * enter, 0, 6.283); ctx.stroke();
        ctx.fillStyle = mix(pal.base, pal.accent, 0.35); ctx.beginPath(); ctx.arc(cx, cy, r * enter, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r * enter, 0, 6.283); ctx.clip();
        if (realSrc) coverDraw(ctx, realSrc, cx - r, cy - r, r * 2, r * 2, 0.22);
        else drawCharacter(ctx, av.kind === 'illustre' ? av.config : DEFAULT_CHAR, cx, cy + r * 1.05, (r * 2.15) / 820, anim);
        ctx.restore();
        badge(cx - r, cy - r - 60 * u);
      };

      let content = null;
      if (layout === 'plein') {
        if (isPhoto) {
          ctx.save(); ctx.globalAlpha *= fade;
          if (realSrc) coverDraw(ctx, realSrc, 0, 0, W, H, 0.3, vid ? 1 : 1.04 + 0.03 * clamp(t / d));
          else drawIllustrated(W / 2, H, H * 0.86);
          ctx.restore(); badge(P, P);
          const g = ctx.createLinearGradient(0, 0, 0, H * 0.3); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.3);
        } else drawIllustrated(W / 2, H, H * (S.portrait ? 0.6 : 0.84));
        if (p.title) kicker(S, p.title, P, P, { start: 0.4, color: isPhoto ? '#FFFFFF' : pal.accent });
      } else if (layout === 'medaillon') {
        const r = Math.min(W, H) * (S.portrait ? 0.25 : 0.2);
        const cx = left ? P + r : W - P - r, cy = H - P - r;
        drawInCircle(cx, cy, r);
        content = S.portrait ? { x: P, y: P, w: W - P * 2, h: H - r * 2 - P * 3 } : { x: left ? P * 1.6 + r * 2 : P, y: P, w: W - P * 2.6 - r * 2, h: H - P * 2 };
      } else if (S.portrait) {
        const top = H * 0.47;
        if (isPhoto) drawInRect(P * 0.7, top, W - P * 1.4, H - top - P * 0.7, 36 * u); else drawIllustrated(W / 2, H, (H - top) * 0.98);
        content = { x: P, y: P, w: W - P * 2, h: top - P * 1.3 };
      } else {
        const half = W * 0.47;
        const ax = left ? 0 : W - half;
        if (isPhoto) drawInRect(ax + P * 0.7, P * 0.7, half - P * 1.1, H - P * 1.4, 36 * u);
        else drawIllustrated(ax + half / 2, H, H * 0.9);
        content = { x: left ? half + P * 0.5 : P, y: P, w: W - half - P * 1.5, h: H - P * 2 };
      }

      if (content) {
        const T = p.title ? fit(S, p.title, { size: (S.portrait ? 92 : 84) * u, maxW: content.w, maxLines: 3 }) : null;
        const items = (p.items || []).filter((i) => i.text).slice(0, 4);
        const rows = items.map((it) => fit(S, it.text, { display: false, size: (S.portrait ? 46 : 42) * u, maxW: content.w - 48 * u, maxLines: 2 }));
        const th = T ? T.lines.length * T.size * 1.08 : 0;
        const rh = rows.reduce((a, R) => a + R.lines.length * R.size * 1.3 + 26 * u, 0);
        let y = content.y + Math.max(0, (content.h - th - (rows.length ? 50 * u + rh : 0)) / 2);
        if (T) y += revealLines(S, T, content.x, y, { start: 0.35, color: pal.fg }) + 50 * u;
        rows.forEach((R, i) => {
          const st = vd + 0.3 + (vdur * 0.8 * i) / Math.max(1, rows.length);
          const q = E.outExpo(prog(t, st, 0.7));
          if (q > 0) {
            ctx.save(); ctx.globalAlpha *= clamp(q * 1.5); ctx.translate((1 - q) * 40 * u, 0);
            ctx.fillStyle = pal.accent; rrect(ctx, content.x, y + R.size * 0.32, 18 * u, 18 * u, 5 * u); ctx.fill();
            useFit(S, R); ctx.fillStyle = pal.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            R.lines.forEach((l, j) => ctx.fillText(l, content.x + 48 * u, y + R.size * 0.95 + j * R.size * 1.3));
            ctx.restore();
          }
          y += R.lines.length * R.size * 1.3 + 26 * u;
        });
      }

      if (p.captions && p.script) {
        const c = activeCaption(p.script, lt, vdur);
        if (c) {
          const C = fit(S, c.text, { display: false, size: (S.portrait ? 50 : 42) * u, maxW: Math.min(W * 0.78, 1400 * u), maxLines: 2 });
          setFont(ctx, C.family, 700, C.size); setTrack(ctx, 0);
          const lw = Math.max(...C.lines.map((l) => ctx.measureText(l).width));
          const bw = lw + 60 * u, bh = C.lines.length * C.size * 1.3 + 32 * u;
          const bx = (W - bw) / 2, by = H - P * (S.portrait ? 1.6 : 0.75) - bh;
          const q = E.outCubic(prog(lt, c.st, 0.18));
          ctx.save(); ctx.globalAlpha *= q; ctx.translate(0, (1 - q) * 10 * u);
          ctx.fillStyle = 'rgba(0,0,0,.68)'; rrect(ctx, bx, by, bw, bh, 16 * u); ctx.fill();
          ctx.fillStyle = pal.accent; ctx.fillRect(bx + 16 * u, by + bh - 6 * u, (bw - 32 * u) * clamp((lt - c.st) / (c.en - c.st)), 3 * u);
          ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          C.lines.forEach((l, j) => ctx.fillText(l, W / 2, by + 16 * u + C.size * 0.98 + j * C.size * 1.3));
          ctx.restore();
        }
      }
    },
  },

  final: {
    label: 'Appel à l’action', hint: 'Conclusion avec bouton et site', bg: 'principale', duration: 5,
    fields: [
      { k: 'title', type: 'textarea', label: 'Message', rows: 2 },
      { k: 'button', type: 'text', label: 'Bouton' },
      { k: 'website', type: 'text', label: 'Site ou contact', placeholder: 'Reprend le site du client si vide' },
      { k: 'showLogo', type: 'toggle', label: 'Afficher le logo' },
    ],
    defaults: { title: 'Prêt à passer à la vitesse supérieure ?', button: 'Prendre rendez-vous', website: '', showLogo: true },
    draw(S) {
      const { ctx, W, H, u, t, p, pal, F, b } = S;
      const P = pad(S), cx = W / 2, maxW = W - P * 2;
      const logo = p.showLogo ? 130 * u : 0;
      const T = fit(S, p.title, { size: (S.portrait ? 116 : 112) * u, maxW, maxLines: S.portrait ? 4 : 3 });
      const site = p.website || b.website || '';
      const btnH = p.button ? 116 * u : 0;
      const h = (logo ? logo + 70 * u : 0) + T.lines.length * T.size * 1.06 + (btnH ? 70 * u + btnH : 0) + (site ? 90 * u : 0);
      let y = (H - h) / 2;
      if (logo) { drawLogo(S, cx, y + logo / 2, logo * E.outBack(prog(t, 0.05, 0.7)), prog(t, 0.05, 0.3)); y += logo + 70 * u; }
      y += revealLines(S, T, cx, y, { align: 'center', start: 0.25, stagger: 0.12, color: pal.fg, lh: 1.06 });
      if (btnH) {
        y += 70 * u;
        setFont(ctx, F.body, 700, sz(46 * u)); setTrack(ctx, 0);
        const bw = ctx.measureText(p.button).width + 120 * u;
        const bp = E.outBack(prog(t, 0.95, 0.7));
        if (bp > 0) {
          const pulse = (t * 0.7) % 1;
          if (t > 1.6) {
            ctx.strokeStyle = rgba(pal.accent, 0.5 * (1 - pulse)); ctx.lineWidth = 4 * u;
            const g = 26 * u * pulse; rrect(ctx, cx - bw / 2 - g, y - g, bw + g * 2, btnH + g * 2, btnH / 2 + g); ctx.stroke();
          }
          ctx.save(); ctx.translate(cx, y + btnH / 2); ctx.scale(bp, bp);
          ctx.fillStyle = pal.accent; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 14 * u;
          rrect(ctx, -bw / 2, -btnH / 2, bw, btnH, btnH / 2); ctx.fill(); ctx.shadowColor = 'transparent';
          ctx.fillStyle = onColor(pal.accent); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(p.button, 0, 2 * u); ctx.restore(); ctx.textBaseline = 'alphabetic';
        }
        y += btnH;
      }
      if (site) {
        const sp = E.outCubic(prog(t, 1.4, 0.7));
        setFont(ctx, F.body, 600, sz(40 * u)); setTrack(ctx, 2 * u);
        ctx.save(); ctx.globalAlpha *= sp; ctx.fillStyle = pal.fg; ctx.textAlign = 'center';
        ctx.fillText(site, cx, y + 70 * u + (1 - sp) * 16 * u); ctx.restore(); setTrack(ctx, 0);
      }
    },
  },
};

/* ---------------------------------------------------------------
   Modèles de vidéos
   --------------------------------------------------------------- */
const sc = (type, props = {}, extra = {}) => ({ type, props: { ...structuredClone(SCENES[type].defaults), ...props }, duration: SCENES[type].duration, transition: 'fondu', bg: 'auto', ...extra });
export const TEMPLATES = {
  lancement: {
    label: 'Lancement de produit', hint: 'Présenter une nouveauté avec impact',
    scenes: () => [
      sc('intro', { kicker: 'Nouveau', title: 'Découvrez notre nouvelle offre', subtitle: 'Pensée pour vous faire gagner du temps, chaque jour' }),
      sc('titre', { text: 'Plus simple. Plus rapide. Plus malin.', highlight: 'malin' }, { transition: 'volet' }),
      sc('liste', { title: 'Ce qui change pour vous' }, { transition: 'glisse' }),
      sc('chiffres', {}, { transition: 'zoom' }),
      sc('final', { title: 'Disponible dès aujourd’hui', button: 'Découvrir l’offre' }, { transition: 'volet' }),
    ],
  },
  promo: {
    label: 'Offre promotionnelle', hint: 'Une promo courte et percutante',
    scenes: () => [
      sc('titre', { kicker: 'Offre limitée', text: '-30 % sur toute la collection', highlight: '-30' }, { duration: 3 }),
      sc('liste', { title: 'Jusqu’au 30 novembre', items: [{ text: 'Livraison offerte' }, { text: 'Retours gratuits' }, { text: 'Paiement en 3 fois' }] }, { transition: 'glisse' }),
      sc('final', { title: 'N’attendez pas', button: 'J’en profite' }, { transition: 'zoom' }),
    ],
  },
  temoignage: {
    label: 'Témoignage client', hint: 'La preuve sociale qui rassure',
    scenes: () => [
      sc('intro', { kicker: 'Ils nous font confiance', title: 'Ce que disent nos clients', subtitle: '' }),
      sc('temoignage', {}, { transition: 'volet' }),
      sc('chiffres', { title: 'Nos résultats', items: [{ value: '4,9/5', label: 'note moyenne' }, { value: '+300', label: 'avis clients' }] }, { transition: 'glisse' }),
      sc('final', { title: 'Rejoignez-les', button: 'Demander un devis' }, { transition: 'fondu' }),
    ],
  },
  entreprise: {
    label: 'Présentation d’entreprise', hint: 'Qui vous êtes, ce que vous faites',
    scenes: () => [
      sc('intro', { kicker: 'Bienvenue', title: 'Nous créons des expériences qui marquent', subtitle: 'Depuis 2014, aux côtés des entreprises ambitieuses' }),
      sc('etapes', {}, { transition: 'glisse' }),
      sc('image', {}, { transition: 'zoom' }),
      sc('chiffres', {}, { transition: 'volet' }),
      sc('final', { title: 'Parlons de votre projet', button: 'Nous contacter' }, { transition: 'fondu' }),
    ],
  },
  resultats: {
    label: 'Résultats et chiffres', hint: 'Bilan annuel, rapport, levée de fonds',
    scenes: () => [
      sc('titre', { kicker: 'Bilan 2025', text: 'Une année record', highlight: 'record' }),
      sc('graphique', {}, { transition: 'volet' }),
      sc('chiffres', { title: 'Les temps forts' }, { transition: 'glisse' }),
      sc('final', { title: 'Merci pour votre confiance', button: 'Voir le rapport complet' }, { transition: 'fondu' }),
    ],
  },
  presentation: {
    label: 'Présentation avec avatar', hint: 'Un présentateur qui parle à vos clients',
    scenes: () => [
      sc('intro', { kicker: 'Présentation', title: 'Découvrez ce que nous faisons pour vous', subtitle: '' }),
      sc('presentateur', {}, { transition: 'volet', duration: 9 }),
      sc('chiffres', {}, { transition: 'glisse' }),
      sc('presentateur', { layout: 'medaillon', side: 'droite', script: 'Et le plus simple, c’est d’en parler ensemble. Je vous attends.', title: 'Prenons rendez-vous', items: [{ text: '30 minutes, sans engagement' }, { text: 'Un plan d’action concret' }] }, { transition: 'zoom', duration: 6 }),
      sc('final', { title: 'Parlons de votre projet', button: 'Prendre rendez-vous' }, { transition: 'fondu' }),
    ],
  },
  vierge: {
    label: 'Projet vierge', hint: 'Une ouverture et une conclusion, à toi de jouer',
    scenes: () => [sc('intro'), sc('final', {}, { transition: 'volet' })],
  },
};
/* --- Modèles par secteur --- */
export const DOMAINS = {
  general: 'Général', restauration: 'Restauration', immobilier: 'Immobilier', beaute: 'Beauté et bien-être', sport: 'Sport et coaching',
  ecommerce: 'E-commerce et mode', formation: 'Formation', sante: 'Santé', tech: 'Tech et SaaS', evenementiel: 'Événementiel',
  artisans: 'Artisans et BTP', finance: 'Finance et assurance', tourisme: 'Tourisme et hôtellerie', auto: 'Automobile',
};
const L = (...t) => t.map((text) => ({ text }));
const N = (...p) => p.map(([value, label]) => ({ value, label }));
const DOMAIN_TEMPLATES = {
  /* Restauration */
  'resto-plat': { domain: 'restauration', label: 'Plat du jour', hint: 'Le plat et la formule du midi', scenes: () => [
    sc('titre', { kicker: 'Aujourd’hui à la carte', text: 'Le plat du jour est servi', highlight: 'servi' }, { duration: 3 }),
    sc('image', { title: 'Suprême de volaille, écrasé de pommes de terre', subtitle: 'Fait maison, produits du marché', motion: 'avant' }, { transition: 'zoom' }),
    sc('offre', { kicker: 'Formule midi', product: 'Entrée, plat, dessert', price: '18,90 €', oldPrice: '', badge: 'Fait maison', items: L('Café offert', 'Servi en 45 minutes') }, { transition: 'glisse' }),
    sc('final', { title: 'On vous garde une table ?', button: 'Réserver' }, { transition: 'volet' }),
  ] },
  'resto-ouverture': { domain: 'restauration', label: 'Ouverture du restaurant', hint: 'Annoncer une ouverture ou une réouverture', scenes: () => [
    sc('intro', { kicker: 'Grande ouverture', title: 'Une nouvelle adresse gourmande', subtitle: 'Cuisine de saison et produits locaux' }),
    sc('evenement', { kicker: 'Soirée d’inauguration', title: 'Venez fêter l’ouverture avec nous', date: 'Vendredi 6 décembre', time: 'Dès 18 h', place: '12 rue des Halles', button: '' }, { transition: 'volet' }),
    sc('liste', { title: 'Ce qui vous attend', items: L('Une cuisine 100 % maison', 'Des producteurs à moins de 50 km', 'Une terrasse chauffée') }, { transition: 'glisse' }),
    sc('final', { title: 'Réservez dès maintenant', button: 'Réserver une table' }, { transition: 'zoom' }),
  ] },
  /* Immobilier */
  'immo-bien': { domain: 'immobilier', label: 'Bien à vendre', hint: 'Fiche du bien, photos et visite', scenes: () => [
    sc('intro', { kicker: 'Exclusivité', title: 'Votre futur chez-vous vous attend', subtitle: 'Découvrez ce bien en avant-première' }),
    sc('fiche', {}, { transition: 'glisse', duration: 6.5 }),
    sc('image', { title: 'Une pièce de vie baignée de lumière', subtitle: 'Exposition sud, vue dégagée', motion: 'gauche' }, { transition: 'zoom' }),
    sc('presentateur', { layout: 'medaillon', side: 'droite', script: 'Ce bien ne restera pas longtemps sur le marché. Je vous le fais visiter quand vous voulez.', title: 'Visite sur rendez-vous', items: L('Disponible dès cette semaine', 'Visite virtuelle possible') }, { transition: 'volet', duration: 7 }),
    sc('final', { title: 'Planifiez votre visite', button: 'Je visite' }, { transition: 'fondu' }),
  ] },
  'immo-vendu': { domain: 'immobilier', label: 'Vendu !', hint: 'Valoriser une vente réussie', scenes: () => [
    sc('titre', { kicker: 'Mission accomplie', text: 'Vendu en 12 jours', highlight: 'Vendu' }, { duration: 3 }),
    sc('chiffres', { title: 'Les chiffres de la vente', items: N(['12', 'jours de mise en vente'], ['3', 'offres reçues'], ['+4 %', 'au-dessus du prix estimé']).map((x) => ({ value: x.value, label: x.label })) }, { transition: 'glisse' }),
    sc('temoignage', { quote: 'Une estimation juste, des visites qualifiées et une vente sereine. Je recommande sans hésiter.', author: 'Julien et Marie', role: 'Vendeurs à Nantes', rating: '5' }, { transition: 'volet' }),
    sc('final', { title: 'Et votre bien, combien vaut-il ?', button: 'Estimation gratuite' }, { transition: 'zoom' }),
  ] },
  /* Beauté et bien-être */
  'beaute-transfo': { domain: 'beaute', label: 'Transformation', hint: 'Avant / après et soin à la une', scenes: () => [
    sc('titre', { kicker: 'Résultat réel', text: 'La transformation qui fait du bien', highlight: 'transformation' }, { duration: 3 }),
    sc('avantapres', { title: 'Un soin, une nouvelle énergie' }, { transition: 'volet' }),
    sc('offre', { kicker: 'Soin signature', product: 'Rituel éclat du visage', price: '59 €', oldPrice: '75 €', unit: '/ 1 h', badge: 'Nouveau', items: L('Diagnostic de peau offert', 'Produits naturels') }, { transition: 'glisse' }),
    sc('final', { title: 'Offrez-vous ce moment', button: 'Prendre rendez-vous' }, { transition: 'zoom' }),
  ] },
  'beaute-institut': { domain: 'beaute', label: 'Présentation de l’institut', hint: 'Ambiance, soins et avis', scenes: () => [
    sc('intro', { kicker: 'Bienvenue', title: 'Un lieu pensé pour votre bien-être', subtitle: '' }),
    sc('image', { title: 'Un cocon de calme en plein centre-ville', subtitle: '', motion: 'avant' }, { transition: 'zoom' }),
    sc('etapes', { title: 'Votre parcours bien-être', items: [{ label: 'Accueil', desc: 'Un thé et un échange' }, { label: 'Soin', desc: 'Adapté à vos besoins' }, { label: 'Conseils', desc: 'Pour prolonger les effets' }] }, { transition: 'glisse' }),
    sc('temoignage', { quote: 'Je ressors à chaque fois apaisée. L’équipe est aux petits soins.', author: 'Clara', role: 'Cliente fidèle', rating: '5' }, { transition: 'volet' }),
    sc('final', { title: 'Réservez votre parenthèse', button: 'Réserver' }, { transition: 'fondu' }),
  ] },
  /* Sport et coaching */
  'sport-programme': { domain: 'sport', label: 'Programme de coaching', hint: 'Méthode, résultats et tarif', scenes: () => [
    sc('titre', { kicker: 'Programme', text: '8 semaines pour reprendre le contrôle', highlight: '8' }, { duration: 3.5 }),
    sc('etapes', { title: 'La méthode', items: [{ label: 'Bilan', desc: 'Forme, objectifs, rythme' }, { label: 'Entraînement', desc: '3 séances par semaine' }, { label: 'Suivi', desc: 'Ajustements chaque semaine' }] }, { transition: 'glisse' }),
    sc('chiffres', { title: 'En moyenne, nos membres gagnent', items: N(['+40 %', 'd’endurance'], ['-5 kg', 'en 8 semaines'], ['94 %', 'vont au bout']).map((x) => ({ value: x.value, label: x.label })) }, { transition: 'zoom' }),
    sc('offre', { kicker: 'Coaching', product: 'Programme 8 semaines', price: '49 €', unit: '/ mois', oldPrice: '', badge: '1re séance offerte', items: L('Application de suivi incluse', 'Sans engagement') }, { transition: 'volet' }),
    sc('final', { title: 'Votre première séance est offerte', button: 'Je commence' }, { transition: 'fondu' }),
  ] },
  'sport-cours': { domain: 'sport', label: 'Cours collectif', hint: 'Annoncer un cours ou un stage', scenes: () => [
    sc('evenement', { kicker: 'Nouveau cours', title: 'Cardio Boxe en plein air', date: 'Samedi 12 avril', time: '10 h', place: 'Parc de la Tête d’Or', button: '' }),
    sc('liste', { title: 'Au programme', items: L('45 minutes intenses', 'Tous niveaux bienvenus', 'Matériel fourni') }, { transition: 'glisse' }),
    sc('final', { title: 'Places limitées à 20 personnes', button: 'Je réserve' }, { transition: 'zoom' }),
  ] },
  /* E-commerce et mode */
  'ecom-collection': { domain: 'ecommerce', label: 'Nouvelle collection', hint: 'Lancement produit et prix', scenes: () => [
    sc('intro', { kicker: 'Nouvelle collection', title: 'Automne, en toute douceur', subtitle: 'Des matières naturelles, des coupes intemporelles' }),
    sc('image', { title: 'Le pull en laine mérinos', subtitle: 'Tricoté au Portugal', motion: 'avant' }, { transition: 'zoom' }),
    sc('fiche', { subtitle: 'Pull col rond', title: 'Laine mérinos extra-fine', price: '89 €', items: N(['100 %', 'Mérinos'], ['6', 'Coloris'], ['XS–XXL', 'Tailles'], ['30 j', 'Pour changer d’avis']) }, { transition: 'glisse' }),
    sc('final', { title: 'Disponible en ligne et en boutique', button: 'Découvrir' }, { transition: 'volet' }),
  ] },
  'ecom-soldes': { domain: 'ecommerce', label: 'Soldes et promo flash', hint: 'Urgence, réduction et date de fin', scenes: () => [
    sc('titre', { kicker: 'Vente flash', text: 'Jusqu’à -50 % ce week-end', highlight: '-50' }, { duration: 3 }),
    sc('offre', { kicker: 'Coup de cœur', product: 'Sac cabas en cuir', price: '79 €', oldPrice: '159 €', badge: '-50 %', items: L('Livraison offerte', 'Retours gratuits') }, { transition: 'glisse' }),
    sc('evenement', { kicker: 'Fin de l’offre', title: 'Plus que quelques jours', date: 'Dimanche 30 novembre', time: 'Minuit', place: 'Sur notre site', button: '' }, { transition: 'volet' }),
    sc('final', { title: 'Ne passez pas à côté', button: 'J’en profite' }, { transition: 'zoom' }),
  ] },
  /* Formation */
  'formation-programme': { domain: 'formation', label: 'Programme de formation', hint: 'Modules, résultats et inscription', scenes: () => [
    sc('intro', { kicker: 'Formation', title: 'Maîtrisez le marketing digital en 6 semaines', subtitle: 'En ligne, à votre rythme' }),
    sc('presentateur', { script: 'Je suis votre formatrice. En six semaines, je vous emmène de zéro à une stratégie complète, avec des cas concrets.', title: 'Ce que vous allez apprendre', items: L('Construire une stratégie', 'Créer du contenu qui convertit', 'Mesurer vos résultats') }, { transition: 'volet', duration: 9 }),
    sc('etapes', { title: 'Le parcours', items: [{ label: 'Bases', desc: 'Semaines 1 et 2' }, { label: 'Pratique', desc: 'Semaines 3 et 4' }, { label: 'Projet', desc: 'Semaines 5 et 6' }] }, { transition: 'glisse' }),
    sc('offre', { kicker: 'Inscription', product: 'Formation complète', price: '390 €', badge: 'Certifiante', items: L('Accès à vie', 'Accompagnement personnalisé') }, { transition: 'zoom' }),
    sc('final', { title: 'Prochaine session le 3 février', button: 'Je m’inscris' }, { transition: 'fondu' }),
  ] },
  'formation-webinaire': { domain: 'formation', label: 'Webinaire', hint: 'Inviter à un événement en ligne', scenes: () => [
    sc('evenement', { kicker: 'Webinaire gratuit', title: '5 erreurs qui freinent votre croissance', date: 'Jeudi 23 janvier', time: '12 h 30', place: 'En ligne', button: 'Je m’inscris' }),
    sc('liste', { title: 'En 45 minutes, vous saurez', items: L('Repérer ce qui bloque', 'Prioriser vos actions', 'Passer à l’action dès le lendemain') }, { transition: 'glisse' }),
    sc('final', { title: 'Inscription gratuite, places limitées', button: 'Réserver ma place' }, { transition: 'volet' }),
  ] },
  /* Santé */
  'sante-cabinet': { domain: 'sante', label: 'Présentation du cabinet', hint: 'Équipe, soins et prise de rendez-vous', scenes: () => [
    sc('intro', { kicker: 'Cabinet', title: 'Une équipe à votre écoute', subtitle: 'Consultations sur rendez-vous, du lundi au samedi' }),
    sc('liste', { title: 'Nos consultations', items: L('Bilan et suivi personnalisé', 'Prise en charge des enfants', 'Téléconsultation possible') }, { transition: 'glisse' }),
    sc('etapes', { title: 'Prendre rendez-vous', items: [{ label: 'En ligne', desc: '24 h sur 24' }, { label: 'Confirmation', desc: 'Par SMS' }, { label: 'Consultation', desc: 'Au cabinet ou à distance' }] }, { transition: 'volet' }),
    sc('final', { title: 'Prenez rendez-vous en 1 minute', button: 'Prendre rendez-vous' }, { transition: 'fondu' }),
  ] },
  'sante-conseil': { domain: 'sante', label: 'Conseil prévention', hint: 'Un conseil simple, présenté par un avatar', scenes: () => [
    sc('titre', { kicker: 'Le conseil de la semaine', text: 'Bien dormir, ça s’apprend', highlight: 'dormir' }, { duration: 3 }),
    sc('presentateur', { layout: 'cote', script: 'Trois habitudes simples améliorent déjà beaucoup la qualité du sommeil. Les voici.', title: '3 habitudes à adopter', items: L('Des horaires réguliers', 'Pas d’écran avant de dormir', 'Une chambre fraîche') }, { transition: 'volet', duration: 8 }),
    sc('final', { title: 'Une question ? Parlons-en en consultation', button: 'Prendre rendez-vous' }, { transition: 'fondu' }),
  ] },
  /* Tech et SaaS */
  'saas-demo': { domain: 'tech', label: 'Démo produit', hint: 'Problème, solution, tarif', scenes: () => [
    sc('titre', { kicker: 'Le problème', text: 'Vos équipes perdent 5 heures par semaine', highlight: '5' }, { duration: 3.5 }),
    sc('presentateur', { script: 'Notre outil centralise vos tâches, vos documents et vos échanges. Tout est enfin au même endroit.', title: 'Une seule plateforme', items: L('Tâches et projets', 'Documents partagés', 'Messagerie intégrée') }, { transition: 'volet', duration: 8.5 }),
    sc('chiffres', { title: 'Nos clients constatent', items: N(['-30 %', 'de réunions'], ['x2', 'de projets livrés à temps'], ['4,8/5', 'de satisfaction']).map((x) => ({ value: x.value, label: x.label })) }, { transition: 'glisse' }),
    sc('offre', { kicker: 'Tarif', product: 'Offre Pro', price: '19 €', unit: '/ utilisateur / mois', badge: '14 jours offerts', items: L('Sans carte bancaire', 'Support en français') }, { transition: 'zoom' }),
    sc('final', { title: 'Essayez gratuitement', button: 'Démarrer l’essai' }, { transition: 'fondu' }),
  ] },
  'saas-nouveaute': { domain: 'tech', label: 'Nouvelle fonctionnalité', hint: 'Annoncer une mise à jour', scenes: () => [
    sc('intro', { kicker: 'Nouveauté', title: 'Les rapports automatiques sont arrivés', subtitle: 'Disponible dès aujourd’hui pour tous' }),
    sc('liste', { title: 'Ce qui change', items: L('Un rapport chaque lundi, sans effort', 'Des graphiques prêts à partager', 'Export PDF en un clic') }, { transition: 'glisse' }),
    sc('graphique', { title: 'Temps passé sur le reporting', unit: 'h', items: [{ label: 'Avant', value: '6' }, { label: 'Après', value: '1' }] }, { transition: 'volet' }),
    sc('final', { title: 'Activez-les dans vos réglages', button: 'Découvrir' }, { transition: 'fondu' }),
  ] },
  /* Événementiel */
  'event-invitation': { domain: 'evenementiel', label: 'Invitation', hint: 'Date, programme et réservation', scenes: () => [
    sc('intro', { kicker: 'Vous êtes invités', title: 'La soirée de l’année approche', subtitle: '' }),
    sc('evenement', {}, { transition: 'volet', duration: 6 }),
    sc('etapes', { title: 'Le programme', items: [{ label: '19 h 30', desc: 'Accueil et cocktail' }, { label: '20 h 30', desc: 'Conférence' }, { label: '22 h', desc: 'Soirée dansante' }] }, { transition: 'glisse' }),
    sc('final', { title: 'Confirmez votre présence', button: 'Je réserve ma place' }, { transition: 'zoom' }),
  ] },
  'event-bilan': { domain: 'evenementiel', label: 'Retour sur l’événement', hint: 'Remercier et partager les temps forts', scenes: () => [
    sc('titre', { kicker: 'Merci', text: 'Quelle soirée !', highlight: 'soirée' }, { duration: 3 }),
    sc('chiffres', { title: 'L’édition 2026 en chiffres', items: N(['850', 'participants'], ['24', 'intervenants'], ['98 %', 'veulent revenir']).map((x) => ({ value: x.value, label: x.label })) }, { transition: 'glisse' }),
    sc('image', { title: 'Merci à toutes et à tous', subtitle: 'Rendez-vous l’année prochaine', motion: 'arriere' }, { transition: 'zoom' }),
    sc('final', { title: 'Restez informés de la prochaine édition', button: 'S’abonner' }, { transition: 'volet' }),
  ] },
  /* Artisans et BTP */
  'btp-chantier': { domain: 'artisans', label: 'Chantier réalisé', hint: 'Avant / après et devis', scenes: () => [
    sc('titre', { kicker: 'Rénovation', text: 'Une cuisine transformée en 3 semaines', highlight: '3' }, { duration: 3.5 }),
    sc('avantapres', { title: 'Rénovation complète, livrée dans les délais' }, { transition: 'volet' }),
    sc('etapes', { title: 'Comment nous travaillons', items: [{ label: 'Visite', desc: 'Gratuite, sous 48 h' }, { label: 'Devis', desc: 'Clair et détaillé' }, { label: 'Chantier', desc: 'Propre et suivi' }] }, { transition: 'glisse' }),
    sc('chiffres', { title: 'Notre expérience', items: N(['25 ans', 'de métier'], ['600', 'chantiers'], ['10 ans', 'de garantie']).map((x) => ({ value: x.value, label: x.label })) }, { transition: 'zoom' }),
    sc('final', { title: 'Votre projet mérite le meilleur', button: 'Devis gratuit' }, { transition: 'fondu' }),
  ] },
  'artisan-savoirfaire': { domain: 'artisans', label: 'Savoir-faire', hint: 'Raconter le métier et la qualité', scenes: () => [
    sc('intro', { kicker: 'Fait main', title: 'Le geste juste, depuis trois générations', subtitle: '' }),
    sc('image', { title: 'Chaque pièce est unique', subtitle: 'Façonnée dans notre atelier', motion: 'avant' }, { transition: 'zoom' }),
    sc('liste', { title: 'Nos engagements', items: L('Des matériaux locaux et durables', 'Un travail 100 % artisanal', 'Une réparation à vie') }, { transition: 'glisse' }),
    sc('temoignage', { quote: 'Un travail d’une précision remarquable, et un accueil chaleureux à l’atelier.', author: 'Thomas', role: 'Client', rating: '5' }, { transition: 'volet' }),
    sc('final', { title: 'Venez nous rencontrer à l’atelier', button: 'Nous contacter' }, { transition: 'fondu' }),
  ] },
  /* Finance et assurance */
  'finance-epargne': { domain: 'finance', label: 'Offre d’épargne', hint: 'Pédagogie, graphique et conseiller', scenes: () => [
    sc('titre', { kicker: 'Épargne', text: 'Faites travailler votre argent', highlight: 'travailler' }, { duration: 3 }),
    sc('graphique', { title: 'Exemple : 100 € par mois', unit: 'k€', items: [{ label: '5 ans', value: '6,6' }, { label: '10 ans', value: '14' }, { label: '15 ans', value: '22,5' }, { label: '20 ans', value: '32' }] }, { transition: 'glisse' }),
    sc('presentateur', { layout: 'cote', script: 'Ces chiffres sont des exemples, pas une promesse. Je vous aide à construire une épargne adaptée à votre situation.', title: 'Un conseiller dédié', items: L('Bilan gratuit', 'Sans engagement') }, { transition: 'volet', duration: 8 }),
    sc('final', { title: 'Parlons de vos projets', button: 'Prendre rendez-vous' }, { transition: 'fondu' }),
  ] },
  'assurance-simple': { domain: 'finance', label: 'Assurance simplifiée', hint: 'Souscription en quelques étapes', scenes: () => [
    sc('intro', { kicker: 'Assurance habitation', title: 'Assuré en 3 minutes, vraiment', subtitle: '' }),
    sc('etapes', { title: 'Comment ça marche', items: [{ label: 'Devis', desc: 'En ligne, immédiat' }, { label: 'Signature', desc: 'Électronique' }, { label: 'Attestation', desc: 'Reçue par e-mail' }] }, { transition: 'glisse' }),
    sc('offre', { kicker: 'À partir de', product: 'Assurance habitation', price: '6 €', unit: '/ mois', badge: '1er mois offert', items: L('Résiliable à tout moment', 'Assistance 24 h sur 24') }, { transition: 'volet' }),
    sc('final', { title: 'Obtenez votre devis', button: 'Faire un devis' }, { transition: 'zoom' }),
  ] },
  /* Tourisme et hôtellerie */
  'tourisme-sejour': { domain: 'tourisme', label: 'Séjour à la une', hint: 'Destination, fiche et prix', scenes: () => [
    sc('intro', { kicker: 'Évasion', title: 'Une semaine au bout du monde', subtitle: 'Soleil, plages et nature préservée' }),
    sc('image', { title: 'Des eaux turquoise à perte de vue', subtitle: '', motion: 'gauche' }, { transition: 'zoom' }),
    sc('fiche', { subtitle: 'Séjour tout compris', title: 'Hôtel 4 étoiles en bord de mer', price: 'Dès 890 €', items: N(['7', 'Nuits'], ['✈', 'Vol inclus'], ['Pension', 'Complète'], ['4,7/5', 'Avis']) }, { transition: 'glisse' }),
    sc('final', { title: 'Réservez avant le 31 mars', button: 'Voir les dates' }, { transition: 'volet' }),
  ] },
  'hotel-offre': { domain: 'tourisme', label: 'Offre de l’hôtel', hint: 'Week-end, prestations et réservation', scenes: () => [
    sc('titre', { kicker: 'Week-end', text: 'Offrez-vous une vraie pause', highlight: 'pause' }, { duration: 3 }),
    sc('liste', { title: 'Votre séjour comprend', items: L('Une nuit en chambre supérieure', 'Le petit-déjeuner gourmand', 'L’accès au spa') }, { transition: 'glisse' }),
    sc('offre', { kicker: 'Offre spéciale', product: 'Escapade bien-être pour deux', price: '219 €', oldPrice: '269 €', badge: 'Week-end', items: L('Départ tardif offert') }, { transition: 'volet' }),
    sc('final', { title: 'Réservez votre escapade', button: 'Réserver' }, { transition: 'zoom' }),
  ] },
  /* Automobile */
  'auto-vehicule': { domain: 'auto', label: 'Véhicule à la vente', hint: 'Fiche technique, prix et essai', scenes: () => [
    sc('intro', { kicker: 'Arrivage', title: 'Disponible dès maintenant en concession', subtitle: '' }),
    sc('fiche', { subtitle: 'Occasion récente', title: 'SUV hybride, première main', price: '27 900 €', items: N(['2023', 'Année'], ['18 500 km', 'Kilométrage'], ['Hybride', 'Motorisation'], ['Auto', 'Boîte']) }, { transition: 'glisse', duration: 6.5 }),
    sc('liste', { title: 'Inclus', items: L('Garantie 12 mois', 'Révision effectuée', 'Reprise de votre véhicule') }, { transition: 'volet' }),
    sc('final', { title: 'Venez l’essayer', button: 'Réserver un essai' }, { transition: 'zoom' }),
  ] },
  'auto-entretien': { domain: 'auto', label: 'Offre d’entretien', hint: 'Révision, prix et rendez-vous', scenes: () => [
    sc('titre', { kicker: 'Atelier', text: 'Votre voiture mérite un check-up', highlight: 'check-up' }, { duration: 3 }),
    sc('offre', { kicker: 'Forfait', product: 'Révision complète', price: '149 €', oldPrice: '189 €', badge: 'Ce mois-ci', items: L('Vidange et filtres', 'Contrôle 40 points', 'Véhicule de prêt') }, { transition: 'glisse' }),
    sc('final', { title: 'Prenez rendez-vous en ligne', button: 'Prendre rendez-vous' }, { transition: 'volet' }),
  ] },
};
for (const t of Object.values(TEMPLATES)) t.domain ||= 'general';
Object.assign(TEMPLATES, DOMAIN_TEMPLATES);
export const newScene = (type) => sc(type);

/* ---------------------------------------------------------------
   Chronologie et rendu d'une image
   --------------------------------------------------------------- */
export const TR = 0.6;
export function timeline(project) {
  let t = 0; const items = [];
  (project.scenes || []).forEach((s, i) => {
    const d = Math.max(1.5, +s.duration || 4);
    const tr = i === 0 || s.transition === 'aucune' ? 0 : Math.min(TR, d / 3);
    const start = Math.max(0, t - tr);
    items.push({ scene: s, index: i, start, end: start + d, tr });
    t = start + d;
  });
  return { items, total: t };
}

export function normBrand(b) {
  const B = { ...DEMO_BRAND, ...(b || {}) };
  B.colors = { ...DEMO_BRAND.colors, ...(b?.colors || {}) };
  if (!FONTS[B.font]) B.font = 'moderne';
  return B;
}

function makeS(ctx, W, H, item, localT, brand, assets, globalT, projText) {
  const s = item.scene, def = SCENES[s.type] || SCENES.libre;
  const mode = s.bg && s.bg !== 'auto' ? s.bg : def.bg;
  const S = {
    ctx, W, H, u: Math.min(W, H) / 1080, t: localT, d: +s.duration || 4, T: globalT,
    p: s.props || {}, b: brand, F: null, assets,
    portrait: H > W * 1.15, square: Math.abs(W - H) / Math.max(W, H) < 0.22,
    pal: palette(brand, mode), seed: hashStr(s.id || item.index),
  };
  S.accent = S.pal.accent;
  const RT = resolveText(brand, projText, s.text);
  S.F = RT.F; TS = RT.ts; BS = RT.bs;
  S.sceneVoice = s.props?.voice ? assets?.voices?.[s.props.voice] : null;
  S.voiceDelay = voiceDelayOf(s);
  return S;
}
function drawScene(ctx, W, H, item, localT, brand, assets, globalT, projText, hits) {
  const s = item.scene, def = SCENES[s.type];
  if (!def) return;
  const mode = s.bg && s.bg !== 'auto' ? s.bg : def.bg;
  const b = brand;
  const S = {
    ctx, W, H, u: Math.min(W, H) / 1080, t: localT, d: +s.duration || 4, T: globalT,
    p: s.props || {}, b, F: null, assets,
    portrait: H > W * 1.15, square: Math.abs(W - H) / Math.max(W, H) < 0.22,
    pal: palette(b, mode), seed: hashStr(s.id || item.index),
  };
  S.accent = S.pal.accent;
  const RT = resolveText(b, projText, s.text);
  S.F = RT.F; TS = RT.ts; BS = RT.bs;
  S.sceneVoice = s.props?.voice ? assets?.voices?.[s.props.voice] : null;
  S.voiceDelay = voiceDelayOf(s);
  ctx.save();
  paintBackground(S);
  def.draw(S);
  ctx.restore();
  setTrack(ctx, 0);
  if (s.elements?.length) { TS = 1; BS = 1; drawElements(S, s.elements, localT, S.d, hits); }
}

/* ---------------------------------------------------------------
   Éléments libres : texte, logo, image, vidéo, forme, avatar
   Chaque scène peut en contenir ; les éléments globaux s'affichent
   sur toute la vidéo. Coordonnées normalisées (0..1), centre de l'élément.
   --------------------------------------------------------------- */
export const ELEMENT_TYPES = { text: 'Texte', logo: 'Logo', image: 'Image', video: 'Vidéo', shape: 'Forme ou icône', avatar: 'Avatar' };
export const ANIM_IN = {
  none: 'Aucune', fade: 'Fondu', slideUp: 'Monte', slideDown: 'Descend', slideLeft: 'Glisse depuis la gauche', slideRight: 'Glisse depuis la droite',
  enterLeft: 'Entre par la gauche', enterRight: 'Entre par la droite', enterTop: 'Entre par le haut', enterBottom: 'Entre par le bas',
  pop: 'Pop', scale: 'Zoom avant', blur: 'Flou vers net', typewriter: 'Machine à écrire', words: 'Mot par mot', letters: 'Lettre par lettre', mask: 'Masque balayé', highlight: 'Surlignage balayé',
};
export const TEXT_ONLY_ANIMS = ['typewriter', 'words', 'letters', 'mask', 'highlight'];
export const ANIM_OUT = { none: 'Aucune', fade: 'Fondu', slideUp: 'Monte', slideDown: 'Descend', exitLeft: 'Sort par la gauche', exitRight: 'Sort par la droite', exitTop: 'Sort par le haut', exitBottom: 'Sort par le bas', scaleOut: 'Zoom arrière', blur: 'Net vers flou' };
export const ANIM_EMPH = { none: 'Aucune', pulse: 'Pulsation', float: 'Flottement', wiggle: 'Balancement' };
export const EASINGS = { outCubic: 'Doux', outExpo: 'Rapide', outBack: 'Rebond', spring: 'Ressort', inOutCubic: 'Progressif', lin: 'Linéaire' };
export const SHAPES = { rect: 'Rectangle', circle: 'Cercle', line: 'Ligne', arrow: 'Flèche', star: 'Étoile', check: 'Coche', heart: 'Cœur', pin: 'Repère' };
export const GESTURES = { auto: 'Selon la parole', idle: 'Au repos', wave: 'Salue', pointLeft: 'Montre à gauche', pointRight: 'Montre à droite' };

let elCount = 0;
export function newElement(type, extra = {}) {
  const base = { id: `el_${Date.now().toString(36)}${(elCount++).toString(36)}${Math.random().toString(36).slice(2, 6)}`, type, x: 0.5, y: 0.5, w: 0.5, rot: 0, opacity: 1, start: 0, end: null, hidden: false, locked: false,
    anim: { in: 'fade', inDur: 0.6, inDelay: 0, ease: 'outCubic', out: 'none', outDur: 0.4, emph: 'none', sfx: '', sfxVol: 0.7 } };
  const by = {
    text: { text: 'Votre texte', font: 'titre', size: 84, weight: 0, color: 'auto', align: 'center', spacing: 0, lineHeight: 1.12, upper: false, shadow: false, stroke: '', bg: '', w: 0.7, anim: { ...base.anim, in: 'slideUp' } },
    logo: { w: 0.16, plate: false, x: 0.88, y: 0.12, anim: { ...base.anim, in: 'pop', ease: 'outBack' } },
    image: { media: '', ar: 0.66, fit: 'cover', radius: 24, shadow: true, w: 0.4 },
    video: { media: '', ar: 0.5625, fit: 'cover', radius: 0, shadow: false, w: 1, trimIn: 0, trimOut: null, speed: 1, volume: 1, muted: false, srcDur: 0 },
    shape: { kind: 'rect', fill: 'accent', ar: 0.3, radius: 20, w: 0.3 },
    avatar: { avatar: null, frame: 'none', gesture: 'auto', talk: 'voice', w: 0.32, x: 0.8, y: 0.62, anim: { ...base.anim, in: 'enterRight', inDur: 0.9, ease: 'outCubic' } },
  }[type] || {};
  return { ...base, ...by, ...extra, anim: { ...(by.anim || base.anim), ...(extra.anim || {}) } };
}
const elEnd = (el, d) => (el.end == null ? d : Math.min(d, el.end));
const colorOf = (S, c) => (c === 'auto' || !c ? S.pal.fg : c === 'accent' ? S.pal.accent : c === 'primary' ? S.b.colors.primary : c === 'secondary' ? S.b.colors.secondary : c);

function animState(S, el, lt, d, bw, bh, cx, cy) {
  const A = el.anim || {}, W = S.W, H = S.H, u = S.u;
  const start = +el.start || 0, end = elEnd(el, d);
  const ease = E[A.ease] || E.outCubic;
  const pr = A.in && A.in !== 'none' ? prog(lt, start + (+A.inDelay || 0), Math.max(0.05, +A.inDuration || +A.inDur || 0.6)) : 1;
  const pin = ease(pr), po = A.out && A.out !== 'none' ? E.inOutCubic(prog(lt, end - (+A.outDur || 0.4), Math.max(0.05, +A.outDur || 0.4))) : 0;
  const st = { alpha: el.opacity ?? 1, dx: 0, dy: 0, sc: 1, blur: 0, rev: 1, raw: pr };
  const off = (axis, sign, k) => (axis === 'x' ? (sign < 0 ? cx + bw / 2 + 30 * u : W - cx + bw / 2 + 30 * u) : (sign < 0 ? cy + bh / 2 + 30 * u : H - cy + bh / 2 + 30 * u)) * k * sign;
  switch (A.in) {
    case 'fade': st.alpha *= pin; break;
    case 'slideUp': st.dy += (1 - pin) * 70 * u; st.alpha *= Math.min(1, pr * 1.6); break;
    case 'slideDown': st.dy -= (1 - pin) * 70 * u; st.alpha *= Math.min(1, pr * 1.6); break;
    case 'slideLeft': st.dx -= (1 - pin) * 110 * u; st.alpha *= Math.min(1, pr * 1.6); break;
    case 'slideRight': st.dx += (1 - pin) * 110 * u; st.alpha *= Math.min(1, pr * 1.6); break;
    case 'enterLeft': st.dx += off('x', -1, 1 - pin); break;
    case 'enterRight': st.dx += off('x', 1, 1 - pin); break;
    case 'enterTop': st.dy += off('y', -1, 1 - pin); break;
    case 'enterBottom': st.dy += off('y', 1, 1 - pin); break;
    case 'pop': st.sc *= 0.35 + 0.65 * E.outBack(pr); st.alpha *= Math.min(1, pr * 3); break;
    case 'scale': st.sc *= 0.7 + 0.3 * pin; st.alpha *= pin; break;
    case 'blur': st.blur = (1 - pin) * 22 * u; st.alpha *= pin; break;
    case 'typewriter': case 'words': case 'letters': case 'mask': case 'highlight': st.rev = el.type === 'text' ? pin : 1; if (el.type !== 'text') st.alpha *= pin; break;
    default: break;
  }
  switch (A.out) {
    case 'fade': st.alpha *= 1 - po; break;
    case 'slideUp': st.dy -= po * 70 * u; st.alpha *= 1 - po; break;
    case 'slideDown': st.dy += po * 70 * u; st.alpha *= 1 - po; break;
    case 'exitLeft': st.dx += off('x', -1, E.inCubic(po)); break;
    case 'exitRight': st.dx += off('x', 1, E.inCubic(po)); break;
    case 'exitTop': st.dy += off('y', -1, E.inCubic(po)); break;
    case 'exitBottom': st.dy += off('y', 1, E.inCubic(po)); break;
    case 'scaleOut': st.sc *= 1 - 0.35 * po; st.alpha *= 1 - po; break;
    case 'blur': st.blur += po * 22 * u; st.alpha *= 1 - po; break;
    default: break;
  }
  if (A.emph === 'pulse') st.sc *= 1 + 0.035 * Math.sin((lt - start) * 4);
  else if (A.emph === 'float') st.dy += Math.sin((lt - start) * 1.6) * 8 * u;
  else if (A.emph === 'wiggle') st.rot = Math.sin((lt - start) * 3) * 0.035;
  return st;
}

/** Texte : mise en page par mots, avec *mots en couleur d'accent*. */
function textLayout(S, el) {
  const { ctx, u, F } = S;
  const fam = el.font === 'titre' || !el.font ? F.display : el.font === 'texte' ? F.body : el.font;
  const lib = FONT_LIBRARY[fam];
  const weight = el.weight || (el.font === 'texte' ? F.bw : el.font === 'titre' || !el.font ? F.dw : (lib?.dw || 700));
  const size = Math.max(6, (+el.size || 72) * u);
  setFont(ctx, fam, weight, size);
  const track = (+el.spacing || 0) * size / 100; setTrack(ctx, track);
  const raw = String(el.text || '');
  const words = [];
  raw.split('\n').forEach((para, pi) => {
    para.split(/\s+/).filter(Boolean).forEach((w, i) => {
      const acc = /^\*.+\*[.,!?;:]*$/.test(w);
      let t = acc ? w.replace(/^\*/, '').replace(/\*([.,!?;:]*)$/, '$1') : w;
      if (el.upper || (lib?.upper && el.font !== 'texte')) t = t.toUpperCase();
      words.push({ t, acc, br: i === 0 && pi > 0 });
    });
  });
  const maxW = Math.max(40, (el.w || 0.6) * S.W);
  const space = ctx.measureText(' ').width;
  const lines = []; let cur = [], cw = 0;
  for (const wd of words) {
    wd.w = ctx.measureText(wd.t).width;
    if (cur.length && (wd.br || cw + space + wd.w > maxW)) { lines.push({ words: cur, w: cw }); cur = []; cw = 0; }
    cw += (cur.length ? space : 0) + wd.w; cur.push(wd);
  }
  if (cur.length) lines.push({ words: cur, w: cw });
  const lh = size * (+el.lineHeight || 1.12);
  return { fam, weight, size, track, lines, lh, space, maxW, h: Math.max(lh, lines.length * lh), count: words.length, chars: words.reduce((a, w) => a + w.t.length, 0) };
}
function drawTextEl(S, el, L, st, lt, x0, y0) {
  const { ctx, u } = S;
  setFont(ctx, L.fam, L.weight, L.size); setTrack(ctx, L.track);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const acc = S.pal.accent;
  const bgCol = el.bg ? colorOf(S, el.bg) : null;
  const color = (el.color === 'auto' || !el.color) && bgCol && bgCol.startsWith('#') ? onColor(bgCol) : colorOf(S, el.color);
  const mode = (el.anim || {}).in;
  const elT = lt - (+el.start || 0) - (+(el.anim || {}).inDelay || 0);
  const wt = Array.isArray(el.wordTimes) && el.wordTimes.length ? el.wordTimes : null;
  if (el.shadow) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 18 * u; ctx.shadowOffsetY = 6 * u; }
  let wi = 0, ci = 0;
  const nCh = Math.max(1, L.chars), nW = Math.max(1, L.count);
  L.lines.forEach((line, li) => {
    const lx = el.align === 'left' ? x0 : el.align === 'right' ? x0 + L.maxW - line.w : x0 + (L.maxW - line.w) / 2;
    const base = y0 + li * L.lh + L.size * 0.86 + (L.lh - L.size * 1.12) / 2;
    if (el.bg || mode === 'highlight') {
      const bgc = el.bg ? colorOf(S, el.bg) : acc, padX = L.size * 0.18;
      const k = mode === 'highlight' ? clamp(st.rev * L.lines.length - li) : 1;
      if (k > 0) { ctx.save(); ctx.shadowColor = 'transparent'; ctx.fillStyle = bgc; rrect(ctx, lx - padX, base - L.size * 0.86, (line.w + padX * 2) * k, L.size * 1.12, L.size * 0.14); ctx.fill(); ctx.restore(); }
    }
    if (mode === 'mask') { ctx.save(); ctx.beginPath(); ctx.rect(lx - 10, base - L.size * 1.1, (line.w + 20) * clamp(st.rev * L.lines.length - li), L.size * 1.5); ctx.clip(); }
    let x = lx;
    for (const wd of line.words) {
      let a = 1, dy = 0, txt = wd.t;
      if (mode === 'words') {
        const p = wt ? E.outCubic(prog(elT, wt[wi] ?? 0, 0.22)) : clamp(st.rev * nW - wi);
        a = p; dy = (1 - p) * 0.3 * L.size;
      } else if (mode === 'typewriter') {
        const show = Math.floor(st.rev * nCh) - ci;
        txt = show <= 0 ? '' : wd.t.slice(0, show);
      }
      const fill = wd.acc ? acc : color;
      if (mode === 'letters') {
        let cx2 = x;
        for (const ch of wd.t) {
          const p = clamp(st.rev * nCh * 1.15 - ci); ci++;
          if (p > 0) { ctx.globalAlpha = st.alpha * p; if (el.stroke) { ctx.strokeStyle = el.stroke; ctx.lineWidth = 5 * u; ctx.strokeText(ch, cx2, base + (1 - p) * 0.25 * L.size); } ctx.fillStyle = fill; ctx.fillText(ch, cx2, base + (1 - p) * 0.25 * L.size); }
          cx2 += ctx.measureText(ch).width;
        }
        ci--; 
      } else if (txt && a > 0) {
        ctx.globalAlpha = st.alpha * a;
        if (el.stroke) { ctx.strokeStyle = el.stroke; ctx.lineWidth = 5 * u; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, base + dy); }
        ctx.fillStyle = fill; ctx.fillText(txt, x, base + dy);
      }
      if (mode !== 'letters') ci += wd.t.length; else ci++;
      x += wd.w + L.space; wi++;
    }
    if (mode === 'typewriter' && st.rev < 1 && li === L.lines.length - 1 && Math.floor(lt * 2.5) % 2 === 0) { ctx.globalAlpha = st.alpha; ctx.fillStyle = color; ctx.fillRect(x - L.space + 4 * u, base - L.size * 0.8, 4 * u, L.size * 0.9); }
    if (mode === 'mask') ctx.restore();
  });
  ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'; setTrack(ctx, 0);
}
function shapePath(ctx, kind, x, y, w, h, r) {
  ctx.beginPath();
  if (kind === 'circle') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 6.283);
  else if (kind === 'star') { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr2 = k % 2 ? 0.42 : 1; ctx.lineTo(x + w / 2 + Math.cos(a) * (w / 2) * rr2, y + h / 2 + Math.sin(a) * (h / 2) * rr2); } ctx.closePath(); }
  else if (kind === 'heart') { const cx = x + w / 2; ctx.moveTo(cx, y + h * 0.95); ctx.bezierCurveTo(x - w * 0.15, y + h * 0.45, x + w * 0.15, y - h * 0.1, cx, y + h * 0.28); ctx.bezierCurveTo(x + w * 0.85, y - h * 0.1, x + w * 1.15, y + h * 0.45, cx, y + h * 0.95); ctx.closePath(); }
  else if (kind === 'pin') { const cx = x + w / 2, r2 = w / 2; ctx.arc(cx, y + r2, r2, Math.PI * 0.85, Math.PI * 0.15); ctx.lineTo(cx, y + h); ctx.closePath(); }
  else { rrect(ctx, x, y, w, h, Math.min(r, w / 2, h / 2)); }
}
function drawOneElement(S, el, lt, d, hits) {
  if (el.hidden || lt < (+el.start || 0) - 1e-3 || lt > elEnd(el, d) + 1e-3) return;
  const { ctx, W, H, u, assets } = S;
  const cx = (el.x ?? 0.5) * W, cy = (el.y ?? 0.5) * H;
  let bw = Math.max(4, (el.w || 0.3) * W), bh, L = null, media = null;
  if (el.type === 'text') { L = textLayout(S, el); bh = L.h; bw = L.maxW; }
  else if (el.type === 'logo') { const lg = assets?.logo; bh = lg ? bw * (lg.height / lg.width) : bw; }
  else if (el.type === 'image') { media = assets?.media?.[el.media]; bh = bw * (el.fit === 'contain' && media ? media.height / media.width : (+el.ar || 0.66)); }
  else if (el.type === 'video') { media = assets?.videos?.[el.media]; bh = bw * (+el.ar || 0.5625); }
  else if (el.type === 'shape') bh = el.kind === 'line' || el.kind === 'arrow' ? Math.max(8 * u, bw * 0.06) : ['circle', 'star', 'heart', 'check', 'pin'].includes(el.kind) && !el.ar ? bw : bw * (+el.ar || 0.3);
  else if (el.type === 'avatar') bh = bw * 1.15;
  else return;
  const st = animState(S, el, lt, d, bw, bh, cx, cy);
  if (st.alpha <= 0.002) return;
  ctx.save();
  ctx.translate(cx + st.dx, cy + st.dy);
  if (el.rot || st.rot) ctx.rotate(((+el.rot || 0) * Math.PI) / 180 + (st.rot || 0));
  if (st.sc !== 1) ctx.scale(st.sc, st.sc);
  if (st.blur > 0.3 && 'filter' in ctx) ctx.filter = `blur(${st.blur.toFixed(1)}px)`;
  ctx.globalAlpha = clamp(st.alpha);
  const x0 = -bw / 2, y0 = -bh / 2;
  if (el.type === 'text') drawTextEl(S, el, L, st, lt, x0, y0);
  else if (el.type === 'logo') {
    const lg = assets?.logo;
    if (lg) {
      if (el.plate) { ctx.fillStyle = '#fff'; rrect(ctx, x0 - bw * 0.1, y0 - bw * 0.1, bw * 1.2, bh + bw * 0.2, bw * 0.12); ctx.fill(); }
      ctx.drawImage(lg, x0, y0, bw, bh);
    } else drawLogo(S, 0, 0, Math.min(bw, bh), 1);
  } else if (el.type === 'image' || el.type === 'video') {
    if (el.shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 16 * u; ctx.fillStyle = '#000'; rrect(ctx, x0, y0, bw, bh, +el.radius * u || 0); ctx.fill(); ctx.restore(); }
    ctx.save(); rrect(ctx, x0, y0, bw, bh, (+el.radius || 0) * u); ctx.clip();
    const ready = media && (el.type === 'image' || media.readyState >= 2);
    if (ready) { if (el.fit === 'contain') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x0, y0, bw, bh); const sw = media.videoWidth || media.width, sh = media.videoHeight || media.height, k = Math.min(bw / sw, bh / sh); ctx.drawImage(media, -sw * k / 2, -sh * k / 2, sw * k, sh * k); } else coverDraw(ctx, media, x0, y0, bw, bh, 0.5); }
    else { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x0, y0, bw, bh); if (assets?.preview) { setFont(ctx, S.F.body, 700, 26 * u); setTrack(ctx, 0); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.textAlign = 'center'; ctx.fillText(el.media ? 'Chargement…' : el.type === 'video' ? 'Choisis une vidéo' : 'Choisis une image', 0, 9 * u); } }
    ctx.restore();
  } else if (el.type === 'shape') {
    const fill = colorOf(S, el.fill || 'accent');
    if (el.kind === 'line' || el.kind === 'arrow') {
      ctx.strokeStyle = fill; ctx.lineWidth = bh; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0 + bh / 2, 0); ctx.lineTo(-x0 - (el.kind === 'arrow' ? bh * 2 : bh / 2), 0); ctx.stroke();
      if (el.kind === 'arrow') { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(-x0, 0); ctx.lineTo(-x0 - bh * 4, -bh * 2.4); ctx.lineTo(-x0 - bh * 4, bh * 2.4); ctx.closePath(); ctx.fill(); }
    } else if (el.kind === 'check') {
      ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(0, 0, Math.min(bw, bh) / 2, 0, 6.283); ctx.fill();
      ctx.strokeStyle = onColor(fill.startsWith('#') ? fill : '#5A3DF0'); ctx.lineWidth = bw * 0.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-bw * 0.2, 0); ctx.lineTo(-bw * 0.05, bw * 0.16); ctx.lineTo(bw * 0.23, -bw * 0.14); ctx.stroke();
    } else { ctx.fillStyle = fill; shapePath(ctx, el.kind, x0, y0, bw, bh, (+el.radius || 0) * u); ctx.fill(); }
  } else if (el.type === 'avatar') {
    const av = el.avatar?.kind === 'illustre' ? el.avatar.config : DEFAULT_CHAR;
    const sp = S.sceneVoice;
    let talk = 0, act = 0;
    if (el.talk === 'voice' && sp) { const vl = lt - (S.voiceDelay ?? VOICE_DELAY); talk = envAt(sp, vl); act = (envAt(sp, vl - 0.4) + talk + envAt(sp, vl + 0.4)) / 3; }
    else if (el.talk === 'voice' && narrTalk(S.T) != null) { talk = narrTalk(S.T); act = ((narrTalk(S.T - 0.4) || 0) + talk + (narrTalk(S.T + 0.4) || 0)) / 3; }
    else if (el.talk === 'mime' || (el.talk === 'voice' && !sp)) { const on = el.talk === 'mime'; talk = on ? synthTalk(lt) : 0; act = on ? 0.55 : 0; }
    const g = el.gesture || 'auto';
    const gesture = g === 'idle' ? 0 : g === 'wave' ? 0.75 + 0.25 * Math.sin(lt * 7) : g === 'pointLeft' || g === 'pointRight' ? 1 : clamp(Math.sin(lt * 0.8 + 0.6) * 1.7 - 0.4) * clamp(act * 2);
    const dir = g === 'pointLeft' ? -1 : g === 'pointRight' ? 1 : (el.x ?? 0.5) > 0.5 ? -1 : 1;
    if (el.frame === 'circle' || el.frame === 'card') {
      ctx.save(); ctx.fillStyle = mix(S.pal.base, S.pal.accent, 0.35);
      if (el.frame === 'circle') { ctx.beginPath(); ctx.arc(0, 0, Math.min(bw, bh) / 2, 0, 6.283); } else rrect(ctx, x0, y0, bw, bh, 28 * u);
      ctx.fill(); ctx.clip();
      drawCharacter(ctx, av, 0, el.frame === 'circle' ? Math.min(bw, bh) / 2 * 1.05 : bh / 2, (el.frame === 'circle' ? Math.min(bw, bh) * 1.05 : bh * 0.95) / 820, { t: lt, talk, gesture, dir, outfit: S.b.colors.primary, accent: S.b.colors.secondary });
      ctx.restore();
    } else drawCharacter(ctx, av, 0, bh / 2, (bh * 0.95) / 820, { t: lt, talk, gesture, dir, outfit: S.b.colors.primary, accent: S.b.colors.secondary });
  }
  ctx.restore();
  ctx.filter = 'none';
  if (hits) hits.push({ id: el.id, x: cx + st.dx - bw / 2 * st.sc, y: cy + st.dy - bh / 2 * st.sc, w: bw * st.sc, h: bh * st.sc, rot: +el.rot || 0, cx: cx, cy: cy, bw, bh });
}
/**
 * Estime l'instant de début de chaque segment (mot ou phrase) dans une voix,
 * en répartissant le texte sur les passages parlés détectés (pauses respectées).
 * Renvoie des temps en secondes depuis le début de la voix. C'est une estimation,
 * pas une reconnaissance vocale.
 */
export function estimateTimes(voice, weights) {
  const env = voice?.env, rate = voice?.rate || 100;
  const n = env?.length || 0, tot = weights.reduce((a, b) => a + b, 0) || 1;
  if (n < 10) { let acc = 0; return weights.map((w) => { const t = (acc / tot) * (voice?.duration || 1); acc += w; return t; }); }
  const on = new Uint8Array(n);
  for (let i = 0; i < n; i++) on[i] = env[i] > 0.1 ? 1 : 0;
  for (let i = 0, gap = 0; i < n; i++) { if (on[i]) { if (gap > 0 && gap < 0.14 * rate) for (let k = i - gap; k < i; k++) on[k] = 1; gap = 0; } else gap++; }
  const cum = new Float32Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + on[i];
  const voiced = cum[n];
  if (voiced < 0.3 * rate) { let acc = 0; return weights.map((w) => { const t = (acc / tot) * voice.duration; acc += w; return t; }); }
  let acc = 0;
  return weights.map((w) => {
    const target = (acc / tot) * voiced; acc += w;
    let lo = 0, hi = n;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid + 1] > target) hi = mid; else lo = mid + 1; }
    while (lo < n && !on[lo]) lo++;
    return Math.min(lo, n - 1) / rate;
  });
}
export function drawElements(S, list, lt, d, hits) { for (const el of list || []) drawOneElement(S, el, lt, d, hits); }

const buffers = new WeakMap();
function bufFor(ctx, W, H) {
  let b = buffers.get(ctx);
  if (!b || b.a.width !== W || b.a.height !== H) {
    const mk = () => { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H }); return c; };
    b = { a: mk(), b: mk() };
    buffers.set(ctx, b);
  }
  return b;
}

/** Dessine l'image du projet au temps `time` (en secondes). */
export function renderFrame(ctx, W, H, project, brand, assets, time, opts = {}) {
  const hits = opts.hits || null;
  NARR = [];
  if (assets?.clipEnv) for (const c of audioClipsOf(project)) { if (c.kind === 'voice' && c.media && assets.clipEnv[c.media]) NARR.push({ at: +c.at || 0, dur: +c.dur || 0, offset: +c.offset || 0, env: assets.clipEnv[c.media] }); }
  const B = normBrand(brand);
  const { items, total } = timeline(project);
  if (!items.length) { ctx.fillStyle = B.colors.dark; ctx.fillRect(0, 0, W, H); return; }
  const t = clamp(time, 0, Math.max(0, total - 1e-4));
  const active = items.filter((it) => t >= it.start && t < it.end);
  if (!active.length) active.push(items[items.length - 1]);
  if (active.length === 1) {
    drawScene(ctx, W, H, active[0], t - active[0].start, B, assets, t, project.text, hits);
  } else {
    const [A, N] = active.slice(-2);
    const q = clamp((t - N.start) / (N.tr || TR));
    const e = E.inOutCubic(q);
    const buf = bufFor(ctx, W, H);
    const ca = buf.a.getContext('2d'), cb = buf.b.getContext('2d');
    drawScene(ca, W, H, A, t - A.start, B, assets, t, project.text);
    drawScene(cb, W, H, N, t - N.start, B, assets, t, project.text, hits);
    const kind = N.scene.transition;
    ctx.save();
    if (kind === 'glisse') {
      ctx.drawImage(buf.a, -W * e, 0); ctx.drawImage(buf.b, W * (1 - e), 0);
    } else if (kind === 'zoom') {
      ctx.drawImage(buf.a, 0, 0);
      ctx.globalAlpha = e; const s = 1.18 - 0.18 * E.outCubic(q);
      ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.drawImage(buf.b, -W / 2, -H / 2);
    } else if (kind === 'volet') {
      ctx.drawImage(buf.a, 0, 0);
      const span = W + H * 0.6, x = -H * 0.6 + span * e;
      const band = Math.min(W, H) * 0.08;
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x + H * 0.6, 0); ctx.lineTo(x, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
      ctx.drawImage(buf.b, 0, 0); ctx.restore();
      if (q > 0 && q < 1) {
        ctx.fillStyle = B.colors.secondary;
        ctx.beginPath(); ctx.moveTo(x + H * 0.6, 0); ctx.lineTo(x + H * 0.6 + band, 0); ctx.lineTo(x + band, H); ctx.lineTo(x, H); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.drawImage(buf.a, 0, 0); ctx.globalAlpha = e; ctx.drawImage(buf.b, 0, 0);
    }
    ctx.restore();
  }
  // Éléments globaux : par-dessus toute la vidéo, une seule fois même pendant les transitions
  const globals = project.globals || [];
  if (globals.length) {
    const cur = active[active.length - 1];
    const S = makeS(ctx, W, H, cur, t - cur.start, B, assets, t, project.text);
    TS = 1; BS = 1;
    const list = globals.filter((g) => !(g.exclude || []).includes(cur.scene.id));
    drawElements(S, list, t, total, hits ? hits.globals || (hits.globals = []) : null);
  }
  if (project.fadeOut !== false && t > total - 0.5) {
    ctx.fillStyle = `rgba(0,0,0,${E.inOutCubic(clamp((t - (total - 0.5)) / 0.5))})`; ctx.fillRect(0, 0, W, H);
  }
  if (project.fadeIn && t < 0.4) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.4})`; ctx.fillRect(0, 0, W, H); }
}

/* ---------------------------------------------------------------
   Ressources : polices, logo, images
   --------------------------------------------------------------- */
export function loadFont(family) {
  const L0 = FONT_LIBRARY[family]; if (!L0) return Promise.resolve();
  return Promise.all([document.fonts.load(`${L0.dw} 100px "${family}"`), document.fonts.load(`${L0.bw} 100px "${family}"`), document.fonts.load(`700 100px "${family}"`)].map((p) => p.catch(() => null)));
}
export async function ensureFonts(brand, project = null) {
  if (project) {
    const fams = new Set();
    for (const tx of [project.text, ...(project.scenes || []).map((x) => x.text)]) { if (tx?.display) fams.add(tx.display); if (tx?.body) fams.add(tx.body); }
    await Promise.all([...fams].map(loadFont));
  }
  const F = FONTS[normBrand(brand).font];
  await Promise.all([
    document.fonts.load(`${F.dw} 100px "${F.display}"`), document.fonts.load(`${F.bw} 100px "${F.body}"`),
    document.fonts.load(`700 100px "${F.body}"`), document.fonts.load(`600 100px "${F.body}"`),
    document.fonts.load('700 100px "Playfair Display"'),
  ].map((p) => p.catch(() => null)));
}
const bitmapCache = new Map();
export async function loadBitmap(src) {
  if (!src) return null;
  if (bitmapCache.has(src)) return bitmapCache.get(src);
  const pr = (async () => {
    try { const blob = await (await fetch(src)).blob(); return await createImageBitmap(blob); }
    catch { return null; }
  })();
  bitmapCache.set(src, pr);
  if (bitmapCache.size > 60) bitmapCache.delete(bitmapCache.keys().next().value);
  return pr;
}
const mediaCache = new Map();
const cachedMedia = (key, fn) => {
  if (!mediaCache.has(key)) mediaCache.set(key, fn().catch((e) => { mediaCache.delete(key); console.warn('Média illisible', key, e); return null; }));
  return mediaCache.get(key);
};
let decodeCtx = null;
async function decodeAudio(ab) { decodeCtx ||= new (window.AudioContext || window.webkitAudioContext)(); return decodeCtx.decodeAudioData(ab); }
/** Enveloppe d'intensité de la voix, 100 valeurs par seconde, normalisée entre 0 et 1. */
function envelope(buf) {
  const rate = 100, hop = Math.floor(buf.sampleRate / rate), n = Math.floor(buf.length / hop);
  const ch = [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : null];
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = i * hop; j < (i + 1) * hop; j += 2) { const v = ch[1] ? (ch[0][j] + ch[1][j]) / 2 : ch[0][j]; sum += v * v; }
    raw[i] = Math.sqrt(sum / (hop / 2));
  }
  const sorted = Float32Array.from(raw).sort();
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const out = new Float32Array(n); let prev = 0;
  for (let i = 0; i < n; i++) {
    let e = clamp(raw[i] / ref); if (e < 0.12) e = 0;
    prev = e > prev ? prev + (e - prev) * 0.65 : prev + (e - prev) * 0.28;
    out[i] = prev;
  }
  return { env: out, rate };
}
export function loadVoice(id, loader) {
  return cachedMedia(`voice:${id}`, async () => {
    const blob = await loader(id);
    const buffer = await decodeAudio(await blob.arrayBuffer());
    const el = new Audio(URL.createObjectURL(blob)); el.preload = 'auto';
    return { id, buffer, duration: buffer.duration, ...envelope(buffer), el };
  });
}
function loadPhoto(id, loader) { return cachedMedia(`photo:${id}`, async () => createImageBitmap(await loader(id))); }
function loadVideo(id, loader) {
  return cachedMedia(`video:${id}`, async () => {
    const blob = await loader(id);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(blob);
    await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('Vidéo trop longue à charger')), 20000); v.addEventListener('loadeddata', () => { clearTimeout(to); res(); }, { once: true }); v.addEventListener('error', () => { clearTimeout(to); rej(new Error('Vidéo illisible')); }, { once: true }); });
    return v;
  });
}
/** Tous les éléments (scènes + globaux) avec leur décalage temporel absolu. */
export function allElements(project) {
  const out = [];
  const { items, total } = timeline(project);
  for (const it of items) for (const el of it.scene.elements || []) out.push({ el, offset: it.start, d: +it.scene.duration || 4, item: it, global: false });
  for (const el of project.globals || []) out.push({ el, offset: 0, d: total, item: null, global: true });
  return out;
}
/** opts : { media(id) → Promise<Blob>, preview: booléen } */
export async function prepareAssets(project, brand, opts = {}) {
  const B = normBrand(brand);
  await ensureFonts(B, project);
  const images = {};
  const lib = project.assets || {};
  await Promise.all(Object.entries(lib).map(async ([id, src]) => { images[id] = await loadBitmap(src); }));
  const res = { logo: await loadBitmap(B.logo), images, voices: {}, photos: {}, videos: {}, preview: !!opts.preview };
  if (opts.media) {
    const tasks = [];
    for (const s of project.scenes || []) {
      if (s.type !== 'presentateur') continue;
      const p = s.props || {};
      if (p.voice) tasks.push(loadVoice(p.voice, opts.media).then((v) => { if (v) res.voices[p.voice] = v; }));
      if (p.avatar?.kind === 'photo' && p.avatar.photo) tasks.push(loadPhoto(p.avatar.photo, opts.media).then((b) => { if (b) res.photos[p.avatar.photo] = b; }));
      if (p.video) tasks.push(loadVideo(p.video, opts.media).then((v) => { if (v) res.videos[p.video] = v; }));
    }
    await Promise.all(tasks);
  }
  // Éléments : images et vidéos importées, effets sonores, son des clips
  res.media = {}; res.sfx = {}; res.clipAudio = {};
  {
    const tasks = [];
    for (const { el } of allElements(project)) {
      if (el.hidden) continue;
      if (el.type === 'image' && el.media && opts.media) tasks.push(loadPhoto(el.media, opts.media).then((b) => { if (b) res.media[el.media] = b; }));
      if (el.type === 'video' && el.media && opts.media) {
        tasks.push(loadVideo(el.media, opts.media).then((v) => { if (v) res.videos[el.media] = v; }));
        if (!opts.preview && !el.muted) tasks.push(cachedMedia(`vaudio:${el.media}`, async () => decodeAudio(await (await opts.media(el.media)).arrayBuffer())).then((b) => { if (b) res.clipAudio[el.media] = b; }));
      }
      if (el.anim?.sfx) tasks.push(renderSfx(el.anim.sfx).then((b) => { if (b) res.sfx[el.anim.sfx] = b; }));
    }
    await Promise.all(tasks);
  }
  res.audioClips = {}; res.clipEnv = {};
  {
    const total = timeline(project).total, tasks = [];
    for (const c of audioClipsOf(project)) {
      if (c.media && opts.media) tasks.push(cachedMedia(`aclip:${c.media}`, async () => decodeAudio(await (await opts.media(c.media)).arrayBuffer())).then((b) => {
        if (!b) return; res.audioClips[c.media] = b;
        if (c.kind === 'voice') res.clipEnv[c.media] = { ...envelope(b), duration: b.duration };
      }));
      else if (c.track && MUSIC_TRACKS[c.track]) tasks.push(renderTrack(c.track, Math.max(total, (+c.offset || 0) + (+c.dur || 0)) + 2).then((b) => { res.audioClips[`track:${c.track}`] = b; }));
    }
    await Promise.all(tasks);
  }
  const mus = project.music;
  if (mus && (mus.track || mus.media)) {
    let buf = null, key = '';
    try {
      if (mus.kind === 'library' && MUSIC_TRACKS[mus.track]) { buf = await renderTrack(mus.track, timeline(project).total + 2); key = `${mus.track}:${buf.length}`; }
      else if (mus.media && opts.media) { buf = await cachedMedia(`music:${mus.media}`, async () => decodeAudio(await (await opts.media(mus.media)).arrayBuffer())); key = mus.media; }
    } catch (e) { console.warn('Musique illisible', e); }
    if (buf) {
      res.music = { buffer: buf, volume: mus.volume ?? 0.6, offset: Math.max(0, +mus.offset || 0), duck: mus.duck !== false };
      if (opts.preview) res.music.el = await cachedMedia(`musicel:${key}`, async () => { const a = new Audio(URL.createObjectURL(mus.kind === 'library' ? bufferToWav(buf) : await opts.media(mus.media))); a.preload = 'auto'; return a; });
    }
  }
  return res;
}

/** Cale les vidéos d'avatar sur l'image exacte à exporter. */
function clipTarget(el, lt, v) {
  const end = el.trimOut != null ? +el.trimOut : (v.duration || 0);
  return clamp((+el.trimIn || 0) + (lt - (+el.start || 0)) * (+el.speed || 1), 0, Math.max(0, Math.min(end, (v.duration || 0)) - 0.04));
}
export async function seekVideos(project, assets, time, fps = 30) {
  if (!assets?.videos || !Object.keys(assets.videos).length) return;
  const jobs = [];
  for (const { el, offset, d } of allElements(project)) {
    if (el.type !== 'video' || el.hidden) continue;
    const v = assets.videos[el.media]; if (!v) continue;
    const lt = time - offset;
    if (lt < (+el.start || 0) - 0.05 || lt > elEnd(el, d) + 0.05) continue;
    const target = clipTarget(el, lt, v);
    if (Math.abs(v.currentTime - target) < 0.4 / fps && !v.seeking) continue;
    jobs.push(new Promise((res) => {
      let fin = false; const done = () => { if (fin) return; fin = true; clearTimeout(to); res(); };
      const to = setTimeout(done, 3000);
      v.addEventListener('seeked', () => { if (v.requestVideoFrameCallback) { v.requestVideoFrameCallback(done); setTimeout(done, 60); } else done(); }, { once: true });
      v.currentTime = target;
    }));
  }
  for (const it of timeline(project).items) {
    if (time < it.start || time >= it.end) continue;
    const v = it.scene.props?.video && assets.videos[it.scene.props.video];
    if (!v) continue;
    const target = clamp(time - it.start - voiceDelayOf(it.scene), 0, Math.max(0, (v.duration || 0) - 0.04));
    if (Math.abs(v.currentTime - target) < 0.4 / fps && !v.seeking) continue;
    jobs.push(new Promise((res) => {
      let fin = false; const done = () => { if (fin) return; fin = true; clearTimeout(to); res(); };
      const to = setTimeout(done, 3000);
      v.addEventListener('seeked', () => { if (v.requestVideoFrameCallback) { v.requestVideoFrameCallback(done); setTimeout(done, 60); } else done(); }, { once: true });
      v.currentTime = target;
    }));
  }
  await Promise.all(jobs);
}
/** Lecture de l'aperçu : voix et vidéos d'avatar synchronisées sur la tête de lecture. */
export function syncPreview(project, assets, time, playing, onSeeked) {
  if (!assets) return;
  const actV = new Set(), actA = new Set();
  let voiceOn = false;
  for (const it of timeline(project).items) {
    if (it.scene.type !== 'presentateur') continue;
    const p = it.scene.props || {}, lt = time - it.start - voiceDelayOf(it.scene), inScene = time >= it.start && time < it.end;
    const v = p.video && assets.videos?.[p.video];
    if (v && inScene) {
      actV.add(v);
      const target = clamp(lt, 0, Math.max(0, (v.duration || 0) - 0.04));
      if (playing && lt >= 0 && lt < v.duration) {
        if (v.paused) { v.currentTime = target; v.play().catch(() => {}); } else if (Math.abs(v.currentTime - target) > 0.25) v.currentTime = target;
      } else {
        if (!v.paused) v.pause();
        if (Math.abs(v.currentTime - target) > 0.03 && !v.seeking) { v.addEventListener('seeked', onSeeked, { once: true }); v.currentTime = target; }
      }
    }
    const vo = p.voice && assets.voices?.[p.voice];
    if (vo && inScene && lt >= 0 && lt < vo.duration) voiceOn = true;
    if (vo && inScene) {
      actA.add(vo.el);
      vo.el.volume = clamp(p.voiceVol ?? 1);
      if (playing && lt >= 0 && lt < vo.duration) {
        if (vo.el.paused) { vo.el.currentTime = lt; vo.el.play().catch(() => {}); } else if (Math.abs(vo.el.currentTime - lt) > 0.3) vo.el.currentTime = lt;
      } else if (!vo.el.paused) vo.el.pause();
    }
  }
  for (const { el, offset, d } of allElements(project)) {
    if (el.type !== 'video' || el.hidden) continue;
    const v = assets.videos?.[el.media]; if (!v) continue;
    const lt = time - offset, on = lt >= (+el.start || 0) && lt <= elEnd(el, d);
    if (!on) continue;
    actV.add(v);
    const target = clipTarget(el, lt, v);
    v.muted = !!el.muted; v.volume = clamp(+el.volume || 0); v.playbackRate = clamp(+el.speed || 1, 0.25, 4);
    if (playing) { if (v.paused) { v.currentTime = target; v.play().catch(() => {}); } else if (Math.abs(v.currentTime - target) > 0.3) v.currentTime = target; }
    else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - target) > 0.03 && !v.seeking) { v.addEventListener('seeked', onSeeked, { once: true }); v.currentTime = target; } }
  }
  const mu = assets.music;
  if (mu?.el) {
    const total = timeline(project).total, ms = musicSettings(project, total);
    const el = mu.el, target = time - ms.at + ms.offset;
    const inRange = time >= ms.at && time < ms.end;
    if (playing && inRange && el.duration && target < el.duration) {
      if (el.paused) { el.currentTime = target; el.play().catch(() => {}); } else if (Math.abs(el.currentTime - target) > 0.3) el.currentTime = target;
    } else if (!el.paused) el.pause();
    const fade = inRange ? Math.min(1, ms.fadeIn > 0 ? (time - ms.at) / ms.fadeIn : 1, ms.fadeOut > 0 ? Math.max(0, (ms.end - time) / ms.fadeOut) : 1) : 0;
    el.volume = clamp(ms.volume * (ms.duck && voiceOn ? 0.25 : 1) * fade, 0, 1);
  }
  for (const v of Object.values(assets.videos || {})) if (!actV.has(v) && !v.paused) v.pause();
  for (const vo of Object.values(assets.voices || {})) if (!actA.has(vo.el) && !vo.el.paused) vo.el.pause();
}

/* ---------------------------------------------------------------
   Export MP4 (WebCodecs + mp4-muxer)
   --------------------------------------------------------------- */
export function exportSize(format, quality) {
  const f = FORMATS[format] || FORMATS['16:9'];
  const q = QUALITIES[quality] || QUALITIES.fhd;
  const k = q.short / Math.min(f.w, f.h);
  const even = (v) => Math.round(v / 2) * 2;
  return { w: even(f.w * k), h: even(f.h * k) };
}
export function supportsExport() { return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'; }

async function pickVideoConfig(w, h, fps) {
  const bitrate = Math.min(60e6, Math.round(w * h * fps * 0.2));
  const cands = [
    ['avc', 'avc1.640033'], ['avc', 'avc1.4d0033'], ['avc', 'avc1.42e033'], ['avc', 'avc1.640028'],
    ['vp9', 'vp09.00.51.08'], ['av1', 'av01.0.12M.08'],
  ];
  for (const [kind, codec] of cands) {
    for (const hw of ['prefer-hardware', 'no-preference']) {
      const cfg = { codec, width: w, height: h, bitrate, framerate: fps, hardwareAcceleration: hw, latencyMode: 'quality', ...(kind === 'avc' ? { avc: { format: 'avc' } } : {}) };
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return { kind, cfg: r.config || cfg }; } catch { /* suivant */ }
    }
  }
  throw new Error('Ce navigateur ne sait pas encoder de vidéo. Utilise Chrome ou Edge à jour.');
}
async function pickAudioConfig(sampleRate) {
  for (const [kind, codec] of [['aac', 'mp4a.40.2'], ['opus', 'opus']]) {
    const cfg = { codec, sampleRate, numberOfChannels: 2, bitrate: 192000 };
    try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) return { kind, cfg }; } catch { /* suivant */ }
  }
  return null;
}
/** Mixe la musique et les voix ; la musique baisse automatiquement quand quelqu'un parle. */
async function mixAudio({ music, musicBuffer = null, offset = 0, duck = true, volume = 0.8, voices, total, sfx = [], clips = [], at = 0, end = null, fadeIn = 0.6, fadeOut = 1.8, aclips = [] }) {
  end = end == null ? total : Math.min(end, total);
  const sr = 48000;
  const off = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
  const vs = [...voices].sort((x, y) => x.at - y.at);
  if (music || musicBuffer) {
    const decoded = musicBuffer || await decodeAudio(await music.arrayBuffer());
    const src = off.createBufferSource(); src.buffer = decoded; src.loop = decoded.duration - offset < end - at;
    if (src.loop) { src.loopStart = Math.min(offset, Math.max(0, decoded.duration - 1)); src.loopEnd = decoded.duration; }
    const g = off.createGain(); const duckLevel = duck ? volume * 0.25 : volume;
    let level = 0, last = 0;
    const hold = (time) => { time = Math.max(time, last); g.gain.setValueAtTime(level, time); last = time; };
    const ramp = (time, v) => { time = Math.max(time, last + 0.01); g.gain.linearRampToValueAtTime(v, time); last = time; level = v; };
    g.gain.setValueAtTime(0, 0); hold(at); ramp(at + Math.max(0.01, Math.min(fadeIn, (end - at) / 3)), volume);
    for (const v of vs) { if (v.end < at || v.at > end) continue; hold(v.at - 0.35); ramp(v.at, duckLevel); hold(v.end); ramp(v.end + 0.45, volume); }
    hold(end - Math.max(0.01, Math.min(fadeOut, (end - at) / 2))); ramp(end, 0);
    src.connect(g); g.connect(off.destination); src.start(at, Math.min(offset, Math.max(0, decoded.duration - 0.1))); src.stop(end + 0.05);
  }
  for (const v of vs) { const src = off.createBufferSource(); src.buffer = v.buffer; const g = off.createGain(); g.gain.value = clamp(v.vol ?? 1, 0, 1.5); src.connect(g); g.connect(off.destination); src.start(Math.max(0, v.at)); }
  const voiceSpans = [...vs.map((v) => [v.at, v.end]), ...aclips.filter((c) => c.kind === 'voice').map((c) => [c.at, c.at + c.dur])].sort((a, b) => a[0] - b[0]);
  for (const c of aclips) {
    if (!c.buffer || c.at >= total) continue;
    const st = Math.max(0, c.at), dur = Math.min(c.dur, total - st, c.buffer.duration - c.offset);
    if (dur <= 0.02) continue;
    const src = off.createBufferSource(); src.buffer = c.buffer;
    const g = off.createGain(), vol = clamp(c.volume ?? 1, 0, 1.5);
    const fi = Math.min(Math.max(0.005, c.fadeIn || 0.005), dur / 2), fo = Math.min(Math.max(0.005, c.fadeOut || 0.005), dur / 2);
    let level = 0, last = 0;
    const hold = (t) => { t = Math.max(t, last); g.gain.setValueAtTime(level, t); last = t; };
    const ramp = (t, v) => { t = Math.max(t, last + 0.004); g.gain.linearRampToValueAtTime(v, t); last = t; level = v; };
    g.gain.setValueAtTime(0, st); last = st; ramp(st + fi, vol);
    if (c.kind === 'music' && c.duck !== false) {
      for (const [a, b] of voiceSpans) { if (b < st || a > st + dur) continue; hold(a - 0.3); ramp(Math.max(a, last + 0.01), vol * 0.25); hold(b); ramp(b + 0.4, vol); }
    }
    hold(st + dur - fo); ramp(st + dur, 0);
    src.connect(g); g.connect(off.destination); src.start(st, Math.max(0, c.offset)); src.stop(st + dur + 0.02);
  }
  for (const e of sfx) { if (!e.buffer || e.at >= total) continue; const src = off.createBufferSource(); src.buffer = e.buffer; const g = off.createGain(); g.gain.value = clamp(e.vol ?? 0.7); src.connect(g); g.connect(off.destination); src.start(Math.max(0, e.at)); }
  for (const c of clips) {
    if (!c.buffer || c.at >= total) continue;
    const src = off.createBufferSource(); src.buffer = c.buffer; src.playbackRate.value = c.rate || 1;
    const g = off.createGain(); g.gain.setValueAtTime(0, Math.max(0, c.at)); g.gain.linearRampToValueAtTime(c.vol, Math.max(0, c.at) + 0.05);
    g.gain.setValueAtTime(c.vol, Math.max(0, c.at + c.dur - 0.06)); g.gain.linearRampToValueAtTime(0, Math.max(0, c.at + c.dur));
    src.connect(g); g.connect(off.destination); src.start(Math.max(0, c.at), Math.max(0, c.offset), Math.max(0.05, c.dur * (c.rate || 1)));
  }
  return off.startRendering();
}

/**
 * Exporte la vidéo et renvoie un Blob MP4.
 * opts : { project, brand, assets, format, quality, fps, music: File|null, volume, onProgress(p, canvas), signal }
 */
export async function exportVideo(opts) {
  const { project, brand, assets, format, quality = 'fhd', fps = 30, music = null, volume = 0.8, onProgress, signal } = opts;
  if (!supportsExport()) throw new Error('L’export nécessite Chrome, Edge ou un navigateur récent compatible WebCodecs.');
  const { w, h } = exportSize(format, quality);
  const { total } = timeline(project);
  const frames = Math.max(1, Math.round(total * fps));
  const video = await pickVideoConfig(w, h, fps);
  let audioBuf = null, audio = null;
  const voices = timeline(project).items
    .filter((it) => it.scene.type === 'presentateur' && it.scene.props?.voice && assets?.voices?.[it.scene.props.voice])
    .map((it) => { const v = assets.voices[it.scene.props.voice]; const at = it.start + voiceDelayOf(it.scene); return { buffer: v.buffer, at, end: Math.min(it.end, at + v.duration), vol: it.scene.props.voiceVol ?? 1 }; });
  const am = assets?.music;
  const sfxEv = [], clips = [];
  for (const { el, offset, d } of allElements(project)) {
    if (el.hidden) continue;
    if (el.anim?.sfx && assets?.sfx?.[el.anim.sfx]) sfxEv.push({ buffer: assets.sfx[el.anim.sfx], at: offset + (+el.start || 0) + (+el.anim.inDelay || 0) + (+el.anim.sfxOffset || 0), vol: el.anim.sfxVol ?? 0.7 });
    if (el.type === 'video' && !el.muted && assets?.clipAudio?.[el.media]) {
      const st = +el.start || 0, dur = elEnd(el, d) - st, buf = assets.clipAudio[el.media];
      const maxDur = ((el.trimOut != null ? +el.trimOut : buf.duration) - (+el.trimIn || 0)) / (+el.speed || 1);
      clips.push({ buffer: buf, at: offset + st, offset: +el.trimIn || 0, dur: Math.max(0.05, Math.min(dur, maxDur)), rate: +el.speed || 1, vol: clamp(+el.volume ?? 1) });
    }
  }
  const aclips = audioClipsOf(project).map((c) => ({ ...c, at: +c.at || 0, dur: +c.dur || 0, offset: +c.offset || 0, buffer: assets?.audioClips?.[c.media || `track:${c.track}`] })).filter((c) => c.buffer);
  if (music || am || voices.length || sfxEv.length || clips.length || aclips.length) {
    onProgress?.({ phase: 'prepare', progress: 0 });
    const ms = musicSettings(project, frames / fps);
    audioBuf = await mixAudio(music ? { music, volume, voices, total: frames / fps, sfx: sfxEv, clips, aclips } : { musicBuffer: am?.buffer, offset: ms.offset, duck: ms.duck, volume: ms.volume, at: ms.at, end: ms.end, fadeIn: ms.fadeIn, fadeOut: ms.fadeOut, voices, total: frames / fps, sfx: sfxEv, clips, aclips });
    audio = await pickAudioConfig(audioBuf.sampleRate);
  }
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target, fastStart: 'in-memory', firstTimestampBehavior: 'offset',
    video: { codec: video.kind, width: w, height: h, frameRate: fps },
    ...(audio ? { audio: { codec: audio.kind, numberOfChannels: 2, sampleRate: audioBuf.sampleRate } } : {}),
  });
  let failure = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { failure = e; } });
  venc.configure(video.cfg);
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d', { alpha: false });
  const B = normBrand(brand);
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) {
    if (signal?.aborted) { try { venc.close(); } catch { /* rien */ } throw new DOMException('Export annulé', 'AbortError'); }
    if (failure) throw failure;
    await seekVideos(project, assets, f / fps, fps);
    renderFrame(ctx, w, h, project, B, assets, f / fps);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) });
    venc.encode(vf, { keyFrame: f % (fps * 2) === 0 });
    vf.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
    if (f % 4 === 0) {
      const el = (performance.now() - t0) / 1000, done = (f + 1) / frames;
      onProgress?.({ phase: 'video', progress: done * (audio ? 0.94 : 0.98), eta: done > 0.03 ? el / done - el : null, frame: f + 1, frames, canvas });
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  await venc.flush(); venc.close();
  if (failure) throw failure;
  if (audio) {
    onProgress?.({ phase: 'audio', progress: 0.96 });
    if (!audio) throw new Error('Ce navigateur ne sait pas encoder l’audio.');
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { failure = e; } });
    aenc.configure(audio.cfg);
    const sr = audioBuf.sampleRate, len = audioBuf.length, chunk = 4096;
    const L = audioBuf.getChannelData(0), R = audioBuf.getChannelData(1);
    for (let i = 0; i < len; i += chunk) {
      const n = Math.min(chunk, len - i);
      const data = new Float32Array(n * 2); data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / sr) * 1e6), data });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush(); aenc.close();
    if (failure) throw failure;
  }
  muxer.finalize();
  onProgress?.({ phase: 'done', progress: 1 });
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), width: w, height: h, duration: frames / fps, codec: video.kind };
}

/** Miniature JPEG d'un projet ou d'une scène. */
export function snapshot(project, brand, assets, time, width = 480, format) {
  const f = FORMATS[format || project.format] || FORMATS['16:9'];
  const h = Math.round((width * f.h) / f.w);
  const c = document.createElement('canvas'); c.width = width; c.height = h;
  renderFrame(c.getContext('2d'), width, h, project, brand, assets, time);
  return c;
}
