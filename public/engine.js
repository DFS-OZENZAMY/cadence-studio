/* Cadence — moteur de rendu vidéo
 * Chaque image est calculée de façon déterministe à partir du temps :
 * l'aperçu et l'export produisent exactement la même chose.
 */
import { Muxer, ArrayBufferTarget } from './vendor/mp4-muxer.mjs';
import { drawCharacter, synthTalk, DEFAULT_CHAR } from './avatar.js';
export { DEFAULT_CHAR };
export const VOICE_DELAY = 0.5;

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
  setFont(ctx, F.body, 700, size); setTrack(ctx, size * 0.18);
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
        setFont(ctx, 'Playfair Display', 700, markS); setTrack(ctx, 0); ctx.fillStyle = pal.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('“', 0, markS * 0.28); ctx.restore(); ctx.textBaseline = 'alphabetic';
      }
      y += markS * 0.55;
      y += revealLines(S, Q, P, y, { start: 0.35, stagger: 0.14, color: pal.fg, lh: 1.18 }) + 50 * u;
      const ap = E.outCubic(prog(t, 0.6 + Q.lines.length * 0.14, 0.7));
      ctx.save(); ctx.globalAlpha *= ap; ctx.translate(0, (1 - ap) * 20 * u);
      ctx.fillStyle = pal.accent; ctx.fillRect(P, y + 8 * u, 50 * u, 4 * u);
      setFont(ctx, F.body, 700, 42 * u); setTrack(ctx, 0); ctx.fillStyle = pal.fg; ctx.textAlign = 'left';
      ctx.fillText(p.author || '', P + 74 * u, y + 24 * u);
      setFont(ctx, F.body, F.bw, 34 * u); ctx.fillStyle = pal.muted; ctx.fillText(p.role || '', P + 74 * u, y + 72 * u);
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
        setFont(ctx, S.F.body, 600, 38 * u); ctx.fillStyle = rgba(pal.fg, 0.6); ctx.textAlign = 'center';
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
          setFont(ctx, F.display, F.dw, Math.min(56 * u, bw * 0.38)); setTrack(ctx, 0);
          ctx.fillStyle = pal.fg; ctx.textAlign = 'center'; ctx.globalAlpha = clamp(gp * 2);
          ctx.fillText(`${nv ? fmtNum(nv.val * gp, nv.dec) : it.value}${p.unit ? ` ${p.unit}` : ''}`, x + bw / 2, baseY - h - 18 * u);
          setFont(ctx, F.body, 600, Math.min(34 * u, gap * 0.22)); ctx.fillStyle = pal.muted;
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
        setFont(ctx, F.display, F.dw, rad * 0.95 * e); setTrack(ctx, 0); ctx.fillStyle = onColor(pal.accent);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(label), x, y + rad * 0.04); ctx.textBaseline = 'alphabetic';
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
      const lt = t - VOICE_DELAY;
      const vdur = voice ? voice.duration : Math.max(1, d - VOICE_DELAY - 0.6);
      const speaking = lt >= 0 && lt <= vdur;
      const talk = voice ? envAt(voice, lt) : (p.script && speaking ? synthTalk(lt) : 0);
      const act = voice ? (envAt(voice, lt - 0.4) + envAt(voice, lt) + envAt(voice, lt + 0.4)) / 3 : (speaking && p.script ? 0.55 : 0);
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
        setFont(ctx, S.F.body, 700, 24 * u); setTrack(ctx, 0);
        const txt = 'Aperçu : vidéo IA à générer', w = ctx.measureText(txt).width + 36 * u;
        ctx.fillStyle = 'rgba(0,0,0,.65)'; rrect(ctx, x, y, w, 46 * u, 23 * u); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(txt, x + 18 * u, y + 31 * u);
      };
      const drawIllustrated = (cx, bottom, h) => {
        const sc = h / 820;
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
          const st = VOICE_DELAY + 0.3 + (vdur * 0.8 * i) / Math.max(1, rows.length);
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
        setFont(ctx, F.body, 700, 46 * u); setTrack(ctx, 0);
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
        setFont(ctx, F.body, 600, 40 * u); setTrack(ctx, 2 * u);
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

function drawScene(ctx, W, H, item, localT, brand, assets, globalT) {
  const s = item.scene, def = SCENES[s.type];
  if (!def) return;
  const mode = s.bg && s.bg !== 'auto' ? s.bg : def.bg;
  const b = brand;
  const S = {
    ctx, W, H, u: Math.min(W, H) / 1080, t: localT, d: +s.duration || 4, T: globalT,
    p: s.props || {}, b, F: FONTS[b.font] || FONTS.moderne, assets,
    portrait: H > W * 1.15, square: Math.abs(W - H) / Math.max(W, H) < 0.22,
    pal: palette(b, mode), seed: hashStr(s.id || item.index),
  };
  S.accent = S.pal.accent;
  ctx.save();
  paintBackground(S);
  def.draw(S);
  ctx.restore();
  setTrack(ctx, 0);
}

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
export function renderFrame(ctx, W, H, project, brand, assets, time) {
  const B = normBrand(brand);
  const { items, total } = timeline(project);
  if (!items.length) { ctx.fillStyle = B.colors.dark; ctx.fillRect(0, 0, W, H); return; }
  const t = clamp(time, 0, Math.max(0, total - 1e-4));
  const active = items.filter((it) => t >= it.start && t < it.end);
  if (!active.length) active.push(items[items.length - 1]);
  if (active.length === 1) {
    drawScene(ctx, W, H, active[0], t - active[0].start, B, assets, t);
  } else {
    const [A, N] = active.slice(-2);
    const q = clamp((t - N.start) / (N.tr || TR));
    const e = E.inOutCubic(q);
    const buf = bufFor(ctx, W, H);
    const ca = buf.a.getContext('2d'), cb = buf.b.getContext('2d');
    drawScene(ca, W, H, A, t - A.start, B, assets, t);
    drawScene(cb, W, H, N, t - N.start, B, assets, t);
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
  if (project.fadeOut !== false && t > total - 0.5) {
    ctx.fillStyle = `rgba(0,0,0,${E.inOutCubic(clamp((t - (total - 0.5)) / 0.5))})`; ctx.fillRect(0, 0, W, H);
  }
  if (project.fadeIn && t < 0.4) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.4})`; ctx.fillRect(0, 0, W, H); }
}

/* ---------------------------------------------------------------
   Ressources : polices, logo, images
   --------------------------------------------------------------- */
export async function ensureFonts(brand) {
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
/** opts : { media(id) → Promise<Blob>, preview: booléen } */
export async function prepareAssets(project, brand, opts = {}) {
  const B = normBrand(brand);
  await ensureFonts(B);
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
  return res;
}

/** Cale les vidéos d'avatar sur l'image exacte à exporter. */
export async function seekVideos(project, assets, time, fps = 30) {
  if (!assets?.videos || !Object.keys(assets.videos).length) return;
  const jobs = [];
  for (const it of timeline(project).items) {
    if (time < it.start || time >= it.end) continue;
    const v = it.scene.props?.video && assets.videos[it.scene.props.video];
    if (!v) continue;
    const target = clamp(time - it.start - VOICE_DELAY, 0, Math.max(0, (v.duration || 0) - 0.04));
    if (Math.abs(v.currentTime - target) < 0.4 / fps && !v.seeking) continue;
    jobs.push(new Promise((res) => {
      const done = () => { clearTimeout(to); res(); };
      const to = setTimeout(done, 3000);
      v.addEventListener('seeked', () => (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(done) : done()), { once: true });
      v.currentTime = target;
    }));
  }
  await Promise.all(jobs);
}
/** Lecture de l'aperçu : voix et vidéos d'avatar synchronisées sur la tête de lecture. */
export function syncPreview(project, assets, time, playing, onSeeked) {
  if (!assets) return;
  const actV = new Set(), actA = new Set();
  for (const it of timeline(project).items) {
    if (it.scene.type !== 'presentateur') continue;
    const p = it.scene.props || {}, lt = time - it.start - VOICE_DELAY, inScene = time >= it.start && time < it.end;
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
    if (vo && inScene) {
      actA.add(vo.el);
      if (playing && lt >= 0 && lt < vo.duration) {
        if (vo.el.paused) { vo.el.currentTime = lt; vo.el.play().catch(() => {}); } else if (Math.abs(vo.el.currentTime - lt) > 0.3) vo.el.currentTime = lt;
      } else if (!vo.el.paused) vo.el.pause();
    }
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
async function mixAudio({ music, volume = 0.8, voices, total }) {
  const sr = 48000;
  const off = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
  const vs = [...voices].sort((x, y) => x.at - y.at);
  if (music) {
    const decoded = await decodeAudio(await music.arrayBuffer());
    const src = off.createBufferSource(); src.buffer = decoded; src.loop = decoded.duration < total;
    const g = off.createGain(); const duck = volume * 0.25;
    let level = 0, last = 0;
    const hold = (time) => { time = Math.max(time, last); g.gain.setValueAtTime(level, time); last = time; };
    const ramp = (time, v) => { time = Math.max(time, last + 0.01); g.gain.linearRampToValueAtTime(v, time); last = time; level = v; };
    g.gain.setValueAtTime(0, 0); ramp(Math.min(0.6, total / 4), volume);
    for (const v of vs) { hold(v.at - 0.35); ramp(v.at, duck); hold(v.end); ramp(v.end + 0.45, volume); }
    hold(total - 1.8); ramp(total, 0);
    src.connect(g); g.connect(off.destination); src.start(0);
  }
  for (const v of vs) { const src = off.createBufferSource(); src.buffer = v.buffer; src.connect(off.destination); src.start(Math.max(0, v.at)); }
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
    .map((it) => { const v = assets.voices[it.scene.props.voice]; const at = it.start + VOICE_DELAY; return { buffer: v.buffer, at, end: Math.min(it.end, at + v.duration) }; });
  if (music || voices.length) {
    onProgress?.({ phase: 'prepare', progress: 0 });
    audioBuf = await mixAudio({ music, volume, voices, total: frames / fps });
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
