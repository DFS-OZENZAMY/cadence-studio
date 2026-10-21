/* Cadence — application */
import * as V from './engine.js';
import { drawCharacter, SKINS, FURS, HAIR_COLORS, EYE_COLORS, OUTFIT_COLORS, OPTIONS, PRESETS, DEFAULT_CHAR, normChar, randomChar } from './avatar.js';
const { FORMATS, QUALITIES, FONTS, AMBIANCES, TRANSITIONS, BACKGROUNDS, SCENES, TEMPLATES, DEMO_BRAND, DOMAINS, FONT_LIBRARY, MUSIC_TRACKS } = V;
import { renderTrack } from './music.js';
import * as D from './drive.js';
import * as R from './recorder.js';
import { SFX, SFX_FOR_ANIM, renderSfx } from './sfx.js';
const { ELEMENT_TYPES, ANIM_IN, ANIM_OUT, ANIM_EMPH, EASINGS, SHAPES, GESTURES, TEXT_ONLY_ANIMS } = V;

/* =========================================================
   Utilitaires
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';
const fmtTime = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`; };
const fmtDur = (t) => (t >= 60 ? `${Math.floor(t / 60)} min ${String(Math.round(t % 60)).padStart(2, '0')}` : `${Math.round(t)} s`);
const fmtBytes = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(n / 1e3))} Ko`);
function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 50) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  if (s < 86400 * 7) return `il y a ${Math.round(s / 86400)} j`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: new Date(ts).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}
const plural = (n, a, b) => `${n} ${n > 1 ? b : a}`;
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = () => { clearTimeout(t); return fn(); }; d.cancel = () => clearTimeout(t); return d; };

const ICONS = {
  projects: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9.5 4.5 2.5-4.5 2.5z"/>',
  clients: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="10" r="1.3"/><path d="M12 21a3 3 0 0 1 0-6h1.5a2 2 0 0 0 0-4"/>',
  templates: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
  exports: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  wand: '<path d="m4 20 11-11M14 4v3M17.5 5.5l-2 2M20 9h-3M12.5 6.5 15 9"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  loop: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  rec: '<circle cx="12" cy="12" r="5"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  start: '<path d="M6 5v14M18 6l-9 6 9 6z"/>',
  avatars: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  musicnav: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  record: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  shape: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><circle cx="17" cy="17" r="4"/><path d="m17 3 4 7h-8z"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  logo: '<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8.5 20 20M8.5 15.5 20 4"/>',
  tracks: '<path d="M3 6h18M3 12h12M3 18h16"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${n === 'play' || n === 'pause' || n === 'rec' || n === 'stop' ? 'fill' : ''} ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#5A3DF0"/><path d="M11 9.5v13l11-6.5z" fill="#fff"/><circle cx="24.5" cy="8.5" r="3" fill="#FF8A3D"/></svg>`;

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = (kind === 'ok' ? ic('check') : '') + `<span>${esc(msg)}</span>`;
  $('#toasts').append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 250); }, kind === 'error' ? 4500 : 2600);
}

const modal = $('#modal');
function openModal(html, { size = '', onMount, onClose } = {}) {
  if (modal.open) modal.close();
  modal.className = size;
  modal.innerHTML = html;
  modal._onClose = onClose;
  modal.showModal();
  onMount?.(modal);
  modal.querySelector('[autofocus]')?.focus();
}
function closeModal() { if (modal.open) modal.close(); }
modal.addEventListener('close', () => { if (modal.open) return; const f = modal._onClose; modal._onClose = null; f?.(); modal.innerHTML = ''; });
modal.addEventListener('mousedown', (e) => { if (e.target === modal && !modal.dataset.locked) closeModal(); });
modal.addEventListener('cancel', (e) => { if (modal.dataset.locked) e.preventDefault(); });
function confirmBox({ title, text, ok = 'Confirmer', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    openModal(`<form class="dlg" data-local><div class="dlg-head"><div><h2>${esc(title)}</h2><p>${esc(text)}</p></div></div>
      <div class="dlg-foot"><button class="btn" type="button" data-close>Annuler</button><button class="btn ${danger ? 'rec' : 'primary'}" autofocus>${esc(ok)}</button></div></form>`, {
      onMount: (m) => m.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); done = true; closeModal(); resolve(true); }),
      onClose: () => { if (!done) resolve(false); },
    });
  });
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { e.preventDefault(); closeModal(); } });

/* =========================================================
   API
   ========================================================= */
async function api(path, { method = 'GET', body } = {}) {
  let r;
  try {
    r = await fetch(path, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error('Serveur injoignable. Vérifie ta connexion.'); }
  let d = null; try { d = await r.json(); } catch { /* rien */ }
  if (r.status === 401 && !path.startsWith('/api/auth/')) { authScreen('login', 'Ta session a expiré. Reconnecte-toi.'); throw new Error('Session expirée'); }
  if (!r.ok) throw new Error(d?.error || `Erreur ${r.status}`);
  return d;
}
const mediaBlobs = new Map(), mediaUrls = new Map();
function fetchMedia(id) {
  if (!mediaBlobs.has(id)) mediaBlobs.set(id, fetch(`/api/media/${id}`, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw new Error('Fichier introuvable'); return r.blob(); }).catch((e) => { mediaBlobs.delete(id); throw e; }));
  return mediaBlobs.get(id);
}
async function mediaSrc(id) { if (!mediaUrls.has(id)) mediaUrls.set(id, URL.createObjectURL(await fetchMedia(id))); return mediaUrls.get(id); }
async function uploadMedia(blob, kind, name = '') {
  const r = await fetch(`/api/media?kind=${kind}&name=${encodeURIComponent(name)}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': blob.type || `${kind}/octet-stream` }, body: blob });
  let d = null; try { d = await r.json(); } catch { /* rien */ }
  if (!r.ok) throw new Error(d?.error || 'Envoi du fichier impossible');
  mediaBlobs.set(d.id, Promise.resolve(blob));
  return d.id;
}
/** Convertit un audio en WAV mono 24 kHz, normalisé et sans silences au début et à la fin. */
async function toWav(blob, sr = 24000) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ac.decodeAudioData(await blob.arrayBuffer()); ac.close();
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * sr)), sr);
  const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start();
  const data = (await off.startRendering()).getChannelData(0);
  let peak = 0; for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const thr = peak * 0.06; let a = 0, b = data.length - 1;
  while (a < b && Math.abs(data[a]) < thr) a++; while (b > a && Math.abs(data[b]) < thr) b--;
  a = Math.max(0, a - Math.round(sr * 0.12)); b = Math.min(data.length - 1, b + Math.round(sr * 0.25));
  const pcm = data.subarray(a, b + 1), g = peak > 0 ? Math.min(6, 0.92 / peak) : 1;
  const out = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(out);
  const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, clamp(pcm[i] * g, -1, 1) * 0x7fff, true);
  return new Blob([out], { type: 'audio/wav' });
}
const fmtUsd = (n) => `${(+n || 0).toFixed(2).replace('.', ',')} $`;
/* Voix gratuites : Piper, calculé dans le navigateur */
const FREE_LANGS = { fr: 'Français', en: 'English', ar: 'العربية' };
const FREE_VOICES = [
  { key: 'fr_FR-siwis-medium#0', lang: 'fr', label: 'Siwis, voix féminine', size: '63 Mo', credit: 'Siwis, CC BY 4.0' },
  { key: 'fr_FR-upmc-medium#0', lang: 'fr', label: 'Jessica, voix féminine', size: '74 Mo', credit: 'UPMC, CC BY-SA 4.0' },
  { key: 'fr_FR-upmc-medium#1', lang: 'fr', label: 'Pierre, voix masculine', size: '74 Mo', credit: 'UPMC, CC BY-SA 4.0' },
  { key: 'fr_FR-gilles-low#0', lang: 'fr', label: 'Gilles, voix masculine (légère)', size: '27 Mo', credit: 'Gilles, CC0' },
  { key: 'fr_FR-siwis-low#0', lang: 'fr', label: 'Siwis, voix féminine (légère)', size: '27 Mo', credit: 'Siwis, CC BY 4.0' },
  { key: 'en_US-kristin-medium#0', lang: 'en', label: 'Kristin, féminine (américain)', size: '63 Mo', credit: 'Kristin, domaine public' },
  { key: 'en_US-joe-medium#0', lang: 'en', label: 'Joe, masculine (américain)', size: '63 Mo', credit: 'Joe, CC0' },
  { key: 'en_GB-cori-medium#0', lang: 'en', label: 'Cori, féminine (britannique)', size: '63 Mo', credit: 'Cori, domaine public' },
  { key: 'en_GB-alba-medium#0', lang: 'en', label: 'Alba, féminine (écossais)', size: '63 Mo', credit: 'Alba, CC BY 4.0' },
  { key: 'en_GB-northern_english_male-medium#0', lang: 'en', label: 'Northern, masculine (britannique)', size: '63 Mo', credit: 'Northern English Male, CC BY-SA 4.0' },
  { key: 'ar_JO-kareem-medium#0', lang: 'ar', label: 'Kareem, masculine (arabe de Jordanie)', size: '63 Mo', credit: 'Kareem, licence non précisée', warn: true },
];
const voiceLang = (key) => (FREE_VOICES.find((v) => v.key === key) || FREE_VOICES[0]).lang;
const LANG_HINT = {
  ar: 'Arabe : ajoute les voyelles (harakat) pour une meilleure prononciation. Licence de cette voix non précisée : pour une vidéo commerciale, préfère la voix IA premium, qui parle aussi arabe.',
  en: 'Anglais : écris le texte directement en anglais.',
  fr: '',
};
let piperMod = null, piperVoiceLoaded = null;
async function freeTts(text, voiceKey, speed, onProgress) {
  const [voiceId, spk] = voiceKey.split('#');
  piperMod ||= await import('./vendor/piper/piper-tts.mjs');
  globalThis.__piperOpts = { speakerId: +spk || 0, lengthScale: 1 / (speed || 1) };
  if (piperVoiceLoaded !== voiceId) piperMod.TtsSession._instance = null;
  const session = await piperMod.TtsSession.create({
    voiceId,
    progress: (p) => onProgress?.({ phase: 'download', ratio: p.total ? p.loaded / p.total : 0, url: p.url }),
    wasmPaths: { onnxWasm: '/vendor/ort/', piperData: '/vendor/piper/piper_phonemize.data', piperWasm: '/vendor/piper/piper_phonemize.wasm' },
  });
  piperVoiceLoaded = voiceId;
  onProgress?.({ phase: 'synth' });
  return session.predict(text);
}

const TTS_VOICES = { 'Voix féminines': ['Aria', 'Sarah', 'Laura', 'Charlotte', 'Alice', 'Matilda', 'Jessica', 'Lily'], 'Voix masculines': ['George', 'Roger', 'Charlie', 'Callum', 'Liam', 'Will', 'Eric', 'Chris', 'Brian', 'Daniel', 'Bill'] };

async function passHash(pw, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/../g), (h) => parseInt(h, 16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210000 }, key, 256));
}

/* =========================================================
   Aperçus animés (canvas vivants)
   ========================================================= */
let demoImage = null;
function getDemoImage() {
  if (demoImage) return demoImage;
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1000;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1600, 1000); g.addColorStop(0, '#2B2250'); g.addColorStop(0.55, '#7A4FD9'); g.addColorStop(1, '#FFB06B');
  x.fillStyle = g; x.fillRect(0, 0, 1600, 1000);
  for (let i = 0; i < 9; i++) {
    x.fillStyle = `rgba(255,255,255,${0.05 + (i % 3) * 0.04})`;
    x.beginPath(); x.moveTo(100 + i * 170, 1000); x.lineTo(260 + i * 170, 220 + (i % 4) * 90); x.lineTo(380 + i * 170, 1000); x.fill();
  }
  const sun = x.createRadialGradient(1180, 300, 0, 1180, 300, 260); sun.addColorStop(0, 'rgba(255,240,220,.9)'); sun.addColorStop(1, 'rgba(255,240,220,0)');
  x.fillStyle = sun; x.fillRect(0, 0, 1600, 1000);
  demoImage = c; return c;
}
function sizeCanvas(c, aspect, maxW = 1280) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = Math.max(40, c.clientWidth || c.parentElement?.clientWidth || 320);
  c.width = Math.min(maxW, Math.round(w * dpr));
  c.height = Math.round(c.width / aspect);
}
function demoize(s) {
  if (s.type === 'image' || s.type === 'fiche') s.props.image ||= 'demo';
  if (s.type === 'avantapres') s.props.after ||= 'demo';
  return s;
}
const domainCounts = () => Object.values(TEMPLATES).reduce((a, t) => ({ ...a, [t.domain]: (a[t.domain] || 0) + 1 }), {});
function domainChips(cur) {
  const c = domainCounts();
  return `<div class="chips domain-chips"><button type="button" class="chip ${cur === 'all' ? 'on' : ''}" data-domain="all">Tous <span class="count">${Object.keys(TEMPLATES).length}</span></button>${Object.entries(DOMAINS).filter(([k]) => c[k]).map(([k, l]) => `<button type="button" class="chip ${cur === k ? 'on' : ''}" data-domain="${k}">${esc(l)} <span class="count">${c[k]}</span></button>`).join('')}</div>`;
}
function tplCard(k, t, attrs = '') {
  const tl = V.timeline({ scenes: t.scenes() });
  return `<button class="tpl-card" data-hover data-tpl="${k}" ${attrs}><div class="thumb"><canvas></canvas><span class="badge fmt">${esc(DOMAINS[t.domain] || '')}</span><span class="badge dur">${fmtDur(tl.total)}</span></div>
    <div class="card-body"><strong>${esc(t.label)}</strong><span class="card-meta">${esc(t.hint)}, ${plural(tl.items.length, 'scène', 'scènes')}</span></div></button>`;
}
function previewProject(tplKey) {
  const scenes = TEMPLATES[tplKey].scenes();
  scenes.forEach((s, i) => { s.id = `${tplKey}-${i}`; demoize(s); });
  return { scenes, fadeOut: false };
}
const lives = new Set();
let liveRaf = 0;
function live(canvas, { project, brand, assets, format = '16:9', hoverOnly = false, hero = 1.6 }) {
  const L = { canvas, project, brand, assets, format, hoverOnly, hover: false, t0: performance.now(), total: V.timeline(project).total, hero };
  const aspect = FORMATS[format].w / FORMATS[format].h;
  sizeCanvas(canvas, aspect);
  const still = () => V.renderFrame(canvas.getContext('2d'), canvas.width, canvas.height, project, brand, L.assets, hero);
  still();
  if (hoverOnly) {
    const host = canvas.closest('[data-hover]') || canvas;
    host.addEventListener('mouseenter', () => { L.hover = true; L.t0 = performance.now() - hero * 1000; kick(); });
    host.addEventListener('mouseleave', () => { L.hover = false; still(); });
  }
  lives.add(L); kick();
  return L;
}
function kick() { if (!liveRaf) liveRaf = requestAnimationFrame(liveLoop); }
function liveLoop(ts) {
  liveRaf = 0;
  let any = false;
  for (const L of lives) {
    if (!L.canvas.isConnected) { lives.delete(L); continue; }
    if (L.hoverOnly && !L.hover) continue;
    any = true;
    const t = ((ts - L.t0) / 1000) % Math.max(0.1, L.total);
    V.renderFrame(L.canvas.getContext('2d'), L.canvas.width, L.canvas.height, L.project, L.brand, L.assets, t);
  }
  if (any) liveRaf = requestAnimationFrame(liveLoop);
}
async function brandAssets(brand) {
  const B = V.normBrand(brand);
  await V.ensureFonts(B);
  return { logo: await V.loadBitmap(B.logo), images: { demo: getDemoImage() } };
}

/* =========================================================
   État global
   ========================================================= */
const state = { studio: 'Cadence', clients: [], projects: [], avatars: [], music: [], recordings: [], ai: { configured: false, monthSpent: 0 }, filter: 'all', salt: '', authed: false };
const clientById = (id) => state.clients.find((c) => c.id === id);
const brandOf = (clientId) => { const c = clientById(clientId); return c ? V.normBrand({ ...c.brand, name: c.name }) : V.normBrand(DEMO_BRAND); };

/* =========================================================
   Accès (installation et connexion)
   ========================================================= */
async function boot() {
  try {
    const s = await api('/api/auth/status');
    state.salt = s.salt; state.studio = s.studio; state.needsCode = s.needsCode;
    D.configureDrive(s.google || {});
    if (!s.configured) return authScreen('setup');
    if (!s.authed) return authScreen('login');
    await loadAll();
    state.authed = true;
    route();
  } catch (e) {
    $('#root').innerHTML = `<div class="empty" style="min-height:100vh;align-content:center"><strong>Impossible de joindre le serveur</strong><p>${esc(e.message)}</p><button class="btn primary" id="retryBtn">Réessayer</button></div>`;
    $('#retryBtn').addEventListener('click', () => location.reload());
  }
}
function authScreen(mode, message = '') {
  stopEditor();
  state.authed = false;
  closeModal();
  const setup = mode === 'setup';
  $('#root').innerHTML = `<div class="auth">
    <div class="auth-stage"><canvas id="authCanvas"></canvas><span class="credit">Aperçu en direct, rendu par le moteur de Cadence</span></div>
    <div class="auth-panel"><div class="auth-card">
      <div class="wordmark">${LOGO}Cadence</div>
      <div style="display:grid;gap:10px"><h1>${setup ? 'Ton studio vidéo est prêt' : `Bon retour sur ${esc(state.studio)}`}</h1>
      <p class="lead">${setup ? 'Choisis le nom de ton studio et un mot de passe. Toi seul pourras y accéder.' : 'Entre ton mot de passe pour retrouver tes projets et tes clients.'}</p></div>
      <form id="authForm" novalidate>
        ${setup && state.needsCode ? '<label class="field"><span>Code d’installation</span><input name="code" autocomplete="off" spellcheck="false"></label>' : ''}
        ${setup ? '<label class="field"><span>Nom du studio</span><input name="studio" value="Mon studio" autocomplete="organization"></label>' : ''}
        <label class="field"><span>Mot de passe</span><input name="pw" type="password" autocomplete="${setup ? 'new-password' : 'current-password'}" autofocus></label>
        ${setup ? '<label class="field"><span>Confirme le mot de passe</span><input name="pw2" type="password" autocomplete="new-password"></label>' : ''}
        <p class="form-error" id="authErr" role="alert">${esc(message)}</p>
        <button class="btn primary lg block" id="authBtn">${setup ? 'Créer mon studio' : 'Se connecter'}</button>
      </form>
    </div></div></div>`;
  const c = $('#authCanvas');
  requestAnimationFrame(async () => {
    const proj = previewProject('lancement');
    const assets = await brandAssets(DEMO_BRAND);
    const r = c.parentElement.getBoundingClientRect();
    live(c, { project: proj, brand: V.normBrand(DEMO_BRAND), assets, format: r.height > r.width ? '9:16' : '16:9' });
  });
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, err = $('#authErr'), btn = $('#authBtn');
    err.textContent = '';
    if (f.pw.value.length < (setup ? 10 : 1)) { err.textContent = setup ? 'Choisis au moins 10 caractères.' : 'Entre ton mot de passe.'; return; }
    if (setup && f.pw.value !== f.pw2.value) { err.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
    btn.disabled = true; btn.textContent = 'Vérification…';
    try {
      const hash = await passHash(f.pw.value, state.salt);
      if (setup) { await api('/api/auth/setup', { method: 'POST', body: { hash, studio: f.studio.value.trim() || 'Mon studio', code: f.code?.value.trim() } }); state.studio = f.studio.value.trim() || 'Mon studio'; }
      else await api('/api/auth/login', { method: 'POST', body: { hash } });
      await loadAll();
      state.authed = true;
      if (!location.hash || location.hash === '#/') history.replaceState(null, '', '#/projets');
      route();
      if (setup) toast('Studio créé. Commence par ajouter un client.', 'ok');
    } catch (ex) {
      btn.disabled = false; btn.textContent = setup ? 'Créer mon studio' : 'Se connecter';
      err.textContent = ex.message; f.pw.select();
    }
  });
}
async function loadAll() {
  const [clients, projects, avatars, ai, music, recordings] = await Promise.all([api('/api/clients'), api('/api/projects'), api('/api/avatars'), api('/api/ai/status').catch(() => state.ai), api('/api/music').catch(() => []), api('/api/recordings').catch(() => [])]);
  state.clients = clients; state.projects = projects; state.avatars = avatars; state.ai = ai; state.music = music; state.recordings = recordings;
}

/* =========================================================
   Navigation
   ========================================================= */
const NAV = [['projets', 'Projets', 'projects'], ['clients', 'Clients', 'clients'], ['avatars', 'Avatars', 'avatars'], ['enregistrements', 'Enregistrements', 'record'], ['musique', 'Musique', 'musicnav'], ['modeles', 'Modèles', 'templates'], ['exports', 'Exports', 'exports'], ['reglages', 'Réglages', 'settings']];
function route() {
  if (!state.authed) return;
  const h = location.hash.replace(/^#\/?/, '');
  const [page, id] = h.split('/');
  if (page === 'editeur' && id) return openEditor(id);
  stopEditor();
  const p = NAV.some(([k]) => k === page) ? page : 'projets';
  const counts = { projets: state.projects.length, clients: state.clients.length, avatars: state.avatars.length, musique: state.music.length || null, enregistrements: state.recordings.length || null };
  $('#root').innerHTML = `<div class="shell">
    <nav class="rail" aria-label="Navigation principale">
      <div class="wordmark">${LOGO}Cadence</div>
      <button class="btn primary rail-cta" data-act="newVideo">${ic('plus')}Nouvelle vidéo</button>
      <div class="nav">${NAV.map(([k, l, i]) => `<a href="#/${k}" ${k === p ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${counts[k] ? `<span class="count">${counts[k]}</span>` : ''}</a>`).join('')}</div>
      <div class="rail-foot"><div class="studio"><b>${esc(state.studio)}</b>Studio vidéo</div>
        <button class="btn ghost" data-act="logout" style="justify-content:flex-start">${ic('logout')}<span>Déconnexion</span></button></div>
    </nav>
    <main id="view"><div class="page">${PAGES[p]()}</div></main></div>`;
  AFTER[p]?.();
}
addEventListener('hashchange', () => route());
const PAGES = {}, AFTER = {};
async function refreshProjects() {
  if (!state.authed) return;
  try {
    const [clients, projects] = await Promise.all([api('/api/clients'), api('/api/projects')]);
    const changed = JSON.stringify(projects) !== JSON.stringify(state.projects) || clients.length !== state.clients.length;
    state.clients = clients; state.projects = projects;
    if (changed && !ed && !modal.open && /^#\/(projets)?$|^$/.test(location.hash)) route();
  } catch { /* rien */ }
}

/* =========================================================
   Page : Projets
   ========================================================= */
PAGES.projets = () => {
  const f = state.filter;
  const list = state.projects.filter((p) => f === 'all' || (f === 'none' ? !p.clientId : p.clientId === f));
  const used = state.clients.filter((c) => state.projects.some((p) => p.clientId === c.id));
  return `<header class="page-head"><div><h1>Projets</h1><p class="sub">${state.projects.length ? `${plural(state.projects.length, 'vidéo', 'vidéos')} pour ${plural(state.clients.length, 'client', 'clients')}.` : 'Ta première vidéo est à deux clics.'}</p></div>
      <button class="btn primary lg" data-act="newVideo">${ic('plus')}Nouvelle vidéo</button></header>
    ${used.length ? `<div class="toolbar"><div class="chips">
      <button class="chip ${f === 'all' ? 'on' : ''}" data-act="filter" data-f="all">Tous</button>
      ${used.map((c) => `<button class="chip ${f === c.id ? 'on' : ''}" data-act="filter" data-f="${c.id}"><i class="dot" style="background:${esc(c.brand.colors?.primary)}"></i>${esc(c.name)}</button>`).join('')}
      ${state.projects.some((p) => !p.clientId) ? `<button class="chip ${f === 'none' ? 'on' : ''}" data-act="filter" data-f="none">Sans client</button>` : ''}</div></div>` : ''}
    <div class="grid">
      <button class="new-card" data-act="newVideo"><span class="plus">${ic('plus')}</span>Nouvelle vidéo</button>
      ${list.map(projectCard).join('')}
    </div>
    ${!state.projects.length && !state.clients.length ? `<div class="panel" style="margin-top:24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><h3>Commence par un client</h3><p class="muted">Ajoute son logo et ses couleurs une fois : toutes ses vidéos les reprendront automatiquement.</p></div><a class="btn" href="#/clients">${ic('clients')}Ajouter un client</a></div>` : ''}`;
};
function projectCard(p) {
  const c = clientById(p.clientId);
  return `<article class="card">
    <a class="card-open" href="#/editeur/${p.id}">
      <div class="thumb">${p.thumb ? `<img src="${p.thumb}" alt="" loading="lazy">` : ''}<span class="badge fmt">${esc(p.format)}</span>${p.duration ? `<span class="badge dur">${fmtDur(p.duration)}</span>` : ''}</div>
      <div class="card-body"><strong>${esc(p.name)}</strong>
        <span class="card-meta">${c ? `<i class="dot" style="background:${esc(c.brand.colors?.primary)}"></i>${esc(c.name)}` : 'Sans client'}, ${esc(timeAgo(p.updatedAt))}</span></div>
    </a>
    <div class="card-menu"><button class="icon-btn" data-act="dupProject" data-id="${p.id}" aria-label="Dupliquer" title="Dupliquer">${ic('copy')}</button>
      <button class="icon-btn" data-act="delProject" data-id="${p.id}" aria-label="Supprimer" title="Supprimer">${ic('trash')}</button></div>
  </article>`;
}

function newVideoDialog(preset = null) {
  const st = { domain: preset ? TEMPLATES[preset].domain : (state.tplDomain || 'all'), tpl: preset || 'lancement', client: state.filter !== 'all' && state.filter !== 'none' ? state.filter : (state.clients[0]?.id || ''), format: '16:9', step: preset ? 2 : 1 };
  const draw = () => {
    if (st.step === 1) {
      modal.innerHTML = `<div class="dlg">
        <div class="dlg-head"><div><h2>Choisis un modèle</h2><p>Filtre par secteur, survole pour voir l’animation. Tout reste modifiable ensuite.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
        ${domainChips(st.domain)}
        <div class="grid tpl-scroll" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${Object.entries(TEMPLATES).filter(([, t]) => st.domain === 'all' || t.domain === st.domain).map(([k, t]) => tplCard(k, t, `aria-pressed="${st.tpl === k}"`)).join('')}</div>
        <div class="dlg-foot"><div class="steps-ind"><i class="on"></i><i></i></div><span class="spacer"></span><button class="btn" data-close>Annuler</button><button class="btn primary" data-next>Continuer</button></div></div>`;
      mountTplPreviews(modal, st.client);
      $$('[data-domain]', modal).forEach((b) => b.addEventListener('click', () => { st.domain = b.dataset.domain; const first = Object.entries(TEMPLATES).find(([, t]) => st.domain === 'all' || t.domain === st.domain); if (first && st.domain !== 'all' && TEMPLATES[st.tpl].domain !== st.domain) st.tpl = first[0]; draw(); }));
      $$('[data-tpl]', modal).forEach((b) => b.addEventListener('click', () => { st.tpl = b.dataset.tpl; $$('[data-tpl]', modal).forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
      $$('[data-tpl]', modal).forEach((b) => b.addEventListener('dblclick', () => { st.step = 2; draw(); }));
      $('[data-next]', modal).addEventListener('click', () => { st.step = 2; draw(); });
    } else {
      modal.innerHTML = `<form class="dlg" data-local>
        <div class="dlg-head"><div><h2>${esc(TEMPLATES[st.tpl].label)}</h2><p>Pour quel client, et dans quel format ?</p></div><button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
        <label class="field"><span>Nom de la vidéo</span><input name="name" value="${esc(TEMPLATES[st.tpl].label)}" required autofocus></label>
        <label class="field"><span>Client</span><select name="client"><option value="">Sans client (charte de démonstration)</option>
          ${state.clients.map((c) => `<option value="${c.id}" ${st.client === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        ${state.clients.length ? '' : '<p class="hint">Astuce : crée un client dans l’onglet Clients pour appliquer automatiquement son logo et ses couleurs.</p>'}
        <div class="field"><span>Format</span>${fmtOptions('radio', [st.format])}</div>
        <div class="dlg-foot"><div class="steps-ind"><i class="on"></i><i class="on"></i></div><span class="spacer"></span>
          ${preset ? '<button class="btn" type="button" data-close>Annuler</button>' : '<button class="btn" type="button" data-back>Retour</button>'}
          <button class="btn primary">${ic('plus')}Créer la vidéo</button></div></form>`;
      $('[data-back]', modal)?.addEventListener('click', () => { st.step = 1; draw(); });
      $('form', modal).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target, btn = f.querySelector('.btn.primary'); btn.disabled = true;
        const scenes = TEMPLATES[st.tpl].scenes().map((s) => ({ ...s, id: uid() }));
        const format = f.querySelector('input[name="fmt"]:checked')?.value || '16:9';
        try {
          const body = { name: f.name.value.trim() || 'Nouvelle vidéo', clientId: f.client.value || null, format, data: { scenes, assets: {}, fadeOut: true, fadeIn: false }, duration: V.timeline({ scenes }).total };
          const r = await api('/api/projects', { method: 'POST', body });
          state.projects.unshift({ id: r.id, clientId: body.clientId, name: body.name, format, thumb: null, duration: body.duration, createdAt: Date.now(), updatedAt: Date.now() });
          closeModal();
          location.hash = `#/editeur/${r.id}`;
        } catch (ex) { btn.disabled = false; toast(ex.message, 'error'); }
      });
      modal.querySelector('[autofocus]')?.focus();
    }
  };
  openModal('', { size: 'wide' });
  draw();
}
function fmtOptions(type, checked) {
  return `<div class="fmt-options">${Object.entries(FORMATS).map(([k, f]) => {
    const s = 34 / Math.max(f.w, f.h);
    return `<label class="fmt-opt" title="${esc(f.hint)}"><input type="${type}" name="fmt" value="${k}" ${checked.includes(k) ? 'checked' : ''}>
      <span class="shape" style="width:${Math.round(f.w * s)}px;height:${Math.round(f.h * s)}px"></span>${k}<small>${esc(f.label)}</small></label>`;
  }).join('')}</div>`;
}
async function mountTplPreviews(root, clientId) {
  const brand = brandOf(clientId);
  const assets = await brandAssets(brand);
  $$('[data-tpl]', root).forEach((b) => {
    const c = b.querySelector('canvas'); if (!c) return;
    live(c, { project: previewProject(b.dataset.tpl), brand, assets, hoverOnly: true, hero: 1.7 });
  });
}

/* =========================================================
   Page : Clients
   ========================================================= */
PAGES.clients = () => `
  <header class="page-head"><div><h1>Clients</h1><p class="sub">Une charte par client : logo, couleurs et typographie appliqués à toutes ses vidéos.</p></div>
    <button class="btn primary lg" data-act="newClient">${ic('plus')}Nouveau client</button></header>
  <div class="grid">
    <button class="new-card" data-act="newClient"><span class="plus">${ic('plus')}</span>Nouveau client</button>
    ${state.clients.map((c) => {
      const b = V.normBrand(c.brand);
      return `<article class="card brand-card"><button class="card-open" data-act="editClient" data-id="${c.id}">
        <div class="thumb" style="background:${esc(b.colors.dark)}">
          ${b.logo ? `<div class="logo-box ${b.logoPlate ? 'plate' : ''}"><img src="${b.logo}" alt=""></div>` : `<div class="brand-initial" style="background:${esc(b.colors.primary)};color:${V.onColor(b.colors.primary)}">${esc(c.name.charAt(0).toUpperCase())}</div>`}</div>
        <div class="card-body"><strong>${esc(c.name)}</strong>
          <span class="card-meta"><span class="swatches">${['primary', 'secondary', 'dark', 'light'].map((k) => `<i style="background:${esc(b.colors[k])}"></i>`).join('')}</span>${esc(FONTS[b.font].label)}, ${plural(c.projects || 0, 'vidéo', 'vidéos')}</span></div>
      </button></article>`;
    }).join('')}
  </div>`;

function brandDialog(id = null) {
  const c = id ? clientById(id) : null;
  const b = structuredClone(V.normBrand(c ? { ...c.brand, name: c.name } : { ...DEMO_BRAND, name: '', logo: null, tagline: '', website: '' }));
  let liveRef = null;
  const proj = { scenes: [
    { id: 'b1', type: 'intro', duration: 4, transition: 'fondu', bg: 'auto', props: { kicker: '', title: '', subtitle: '', showLogo: true } },
    { id: 'b2', type: 'titre', duration: 3, transition: 'volet', bg: 'auto', props: { text: 'Votre message en grand', highlight: 'grand' } },
    { id: 'b3', type: 'final', duration: 4, transition: 'fondu', bg: 'auto', props: { title: 'Passez à l’action', button: 'Nous contacter', website: '', showLogo: true } },
  ], fadeOut: false };
  const syncProj = () => { proj.scenes[0].props.title = b.name || 'Nom du client'; proj.scenes[0].props.subtitle = b.tagline || 'Votre slogan ici'; };
  const refresh = async () => {
    syncProj();
    if (!liveRef) return;
    liveRef.brand = V.normBrand(b);
    await V.ensureFonts(liveRef.brand);
    liveRef.assets = { logo: await V.loadBitmap(b.logo), images: {} };
  };
  const colorField = (k, label) => `<label class="color-field"><span>${label}</span><span class="color-pick"><input type="color" data-color="${k}" value="${esc(b.colors[k])}" aria-label="${label}"><input type="text" data-hex="${k}" value="${esc(b.colors[k])}" maxlength="7" spellcheck="false" aria-label="${label}, code hexadécimal"></span></label>`;
  openModal(`<form class="dlg" data-local autocomplete="off">
    <div class="dlg-head"><div><h2>${c ? esc(c.name) : 'Nouveau client'}</h2><p>L’aperçu à droite montre le rendu réel de ses vidéos.</p></div><button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="brand-editor">
      <div style="display:grid;gap:16px;align-content:start">
        <label class="field"><span>Nom du client</span><input name="name" value="${esc(c?.name || '')}" placeholder="Boulangerie Martin" required ${c ? '' : 'autofocus'}></label>
        <div class="field"><span>Logo</span>
          <div class="logo-drop" id="logoDrop"><div class="prev" id="logoPrev">${b.logo ? `<img src="${b.logo}" alt="">` : ic('image')}</div>
            <div style="display:grid;gap:8px;flex:1"><div class="row" style="flex-wrap:wrap">
              <button class="btn" type="button" data-pick-logo>${b.logo ? 'Remplacer' : 'Choisir un fichier'}</button>
              <button class="btn ghost" type="button" data-extract ${b.logo ? '' : 'hidden'}>${ic('wand')}Extraire les couleurs</button>
              <button class="btn ghost danger" type="button" data-remove-logo ${b.logo ? '' : 'hidden'}>Retirer</button></div>
              <span class="hint">PNG ou SVG avec fond transparent, idéalement. Glisse-dépose aussi possible.</span></div></div>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" id="logoFile" hidden>
          <label class="switch" style="margin-top:6px"><input type="checkbox" name="plate" ${b.logoPlate ? 'checked' : ''}>Pastille blanche derrière le logo</label>
        </div>
        <div class="field"><span>Couleurs</span><div class="color-row">${colorField('primary', 'Principale')}${colorField('secondary', 'Accent')}${colorField('dark', 'Sombre')}${colorField('light', 'Clair')}</div></div>
        <div class="field"><span>Typographie</span><div class="font-options">${Object.entries(FONTS).map(([k, f]) => `<button type="button" class="font-opt" data-font="${k}" aria-pressed="${b.font === k}"><b style="font-family:'${f.display}';font-weight:${f.dw}">${f.upper ? 'AA' : 'Aa'}</b><span>${f.label}</span></button>`).join('')}</div></div>
        <div class="field"><span>Ambiance des fonds</span><div class="segmented">${Object.entries(AMBIANCES).map(([k, a]) => `<button type="button" data-amb="${k}" aria-pressed="${b.ambiance === k}" title="${esc(a.hint)}">${a.label}</button>`).join('')}</div></div>
        <div class="grid-2"><label class="field"><span>Slogan</span><input name="tagline" value="${esc(b.tagline || '')}" placeholder="Le goût du vrai"></label>
          <label class="field"><span>Site web</span><input name="website" value="${esc(b.website || '')}" placeholder="exemple.fr"></label></div>
      </div>
      <div class="brand-preview"><div class="stage-box"><canvas id="brandCanvas"></canvas></div><p class="hint">Ouverture, titre choc et appel à l’action, avec cette charte.</p></div>
    </div>
    <p class="form-error" id="brandErr" role="alert"></p>
    <div class="dlg-foot">${c ? `<button class="btn ghost danger" type="button" data-del-client>${ic('trash')}Supprimer</button>` : ''}<span class="spacer"></span>
      <button class="btn" type="button" data-close>Annuler</button><button class="btn primary">${c ? 'Enregistrer' : 'Créer le client'}</button></div>
  </form>`, {
    size: 'wide',
    onMount: async (m) => {
      const form = $('form', m);
      syncProj();
      const assets = { logo: await V.loadBitmap(b.logo), images: {} };
      await V.ensureFonts(b);
      liveRef = live($('#brandCanvas', m), { project: proj, brand: V.normBrand(b), assets });
      const setLogo = async (src) => {
        b.logo = src;
        $('#logoPrev', m).innerHTML = src ? `<img src="${src}" alt="">` : ic('image');
        $('[data-extract]', m).hidden = !src; $('[data-remove-logo]', m).hidden = !src;
        $('[data-pick-logo]', m).textContent = src ? 'Remplacer' : 'Choisir un fichier';
        await refresh();
      };
      const takeFile = async (file) => {
        if (!file || !/^image\//.test(file.type)) { toast('Choisis une image (PNG, JPG, WebP ou SVG).', 'error'); return; }
        try { const src = await processLogo(file); await setLogo(src); if (!c || !c.brand.logo) await applyExtract(); }
        catch { toast('Impossible de lire ce logo.', 'error'); }
      };
      const applyExtract = async () => {
        const cols = await extractColors(b.logo); if (!cols) { toast('Pas assez de couleurs dans ce logo.', 'error'); return; }
        Object.assign(b.colors, cols);
        for (const k of Object.keys(cols)) { $(`[data-color="${k}"]`, m).value = cols[k]; $(`[data-hex="${k}"]`, m).value = cols[k]; }
        await refresh(); toast('Couleurs extraites du logo', 'ok');
      };
      $('[data-pick-logo]', m).addEventListener('click', () => $('#logoFile', m).click());
      $('#logoFile', m).addEventListener('change', (e) => takeFile(e.target.files[0]));
      const drop = $('#logoDrop', m);
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drag'); takeFile(e.dataTransfer.files[0]); });
      $('[data-extract]', m).addEventListener('click', applyExtract);
      $('[data-remove-logo]', m).addEventListener('click', () => setLogo(null));
      form.addEventListener('input', async (e) => {
        const el = e.target;
        if (el.dataset.color) { b.colors[el.dataset.color] = el.value; $(`[data-hex="${el.dataset.color}"]`, m).value = el.value.toUpperCase(); }
        else if (el.dataset.hex) { const v = el.value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) { b.colors[el.dataset.hex] = v; $(`[data-color="${el.dataset.hex}"]`, m).value = v; } }
        else if (el.name === 'name') b.name = el.value;
        else if (el.name === 'tagline') b.tagline = el.value;
        else if (el.name === 'website') b.website = el.value;
        else if (el.name === 'plate') b.logoPlate = el.checked;
        await refresh();
      });
      form.addEventListener('click', async (e) => {
        const fb = e.target.closest('[data-font]'), ab = e.target.closest('[data-amb]');
        if (fb) { b.font = fb.dataset.font; $$('[data-font]', m).forEach((x) => x.setAttribute('aria-pressed', x === fb)); await refresh(); }
        if (ab) { b.ambiance = ab.dataset.amb; $$('[data-amb]', m).forEach((x) => x.setAttribute('aria-pressed', x === ab)); await refresh(); }
        if (e.target.closest('[data-del-client]')) {
          if (!(await confirmBox({ title: `Supprimer ${c.name} ?`, text: 'Sa charte sera supprimée. Ses vidéos sont conservées et passent en « Sans client ».', ok: 'Supprimer', danger: true }))) return;
          try { await api(`/api/clients/${c.id}`, { method: 'DELETE' }); await loadAll(); route(); toast('Client supprimé'); } catch (ex) { toast(ex.message, 'error'); }
        }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.name.value.trim();
        if (!name) { $('#brandErr', m).textContent = 'Donne un nom à ce client.'; form.name.focus(); return; }
        const btn = form.querySelector('.btn.primary'); btn.disabled = true;
        const brand = { ...b, name };
        try {
          if (c) await api(`/api/clients/${c.id}`, { method: 'PUT', body: { name, brand } });
          else {
            const r = await api('/api/clients', { method: 'POST', body: { name, brand } });
            if (ed && !P().clientId && r?.id) { beforeChange(); P().clientId = r.id; changed({ film: true }); }
          }
          await loadAll(); closeModal();
          if (!location.hash.startsWith('#/editeur')) route(); else editorBrandChanged();
          toast(c ? 'Charte enregistrée' : `${name} ajouté`, 'ok');
        } catch (ex) { btn.disabled = false; $('#brandErr', m).textContent = ex.message; }
      });
    },
  });
}
async function readImage(file) {
  if (file.type === 'image/svg+xml') {
    const txt = await file.text();
    const img = new Image(); img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(txt)))}`;
    await img.decode();
    return { src: img, w: img.naturalWidth || 800, h: img.naturalHeight || 800 };
  }
  const bmp = await createImageBitmap(file);
  return { src: bmp, w: bmp.width, h: bmp.height };
}
async function processLogo(file) {
  const { src, w, h } = await readImage(file);
  for (const max of [800, 600, 420]) {
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    if (file.type === 'image/svg+xml') { const k2 = max / Math.max(w, h); c.width = Math.round(w * k2); c.height = Math.round(h * k2); }
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    let url = c.toDataURL('image/webp', 0.92);
    if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');
    if (url.length < 300_000) return url;
  }
  throw new Error('Logo trop lourd');
}
async function extractColors(src) {
  const bmp = await V.loadBitmap(src); if (!bmp) return null;
  const c = document.createElement('canvas'); c.width = 72; c.height = 72;
  const x = c.getContext('2d', { willReadFrequently: true });
  const k = Math.min(72 / bmp.width, 72 / bmp.height);
  x.drawImage(bmp, 0, 0, bmp.width * k, bmp.height * k);
  const d = x.getImageData(0, 0, 72, 72).data, buckets = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const r = d[i], g = d[i + 1], bl = d[i + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    const l = (mx + mn) / 510, s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
    if (s < 0.22 || l < 0.12 || l > 0.92) continue;
    const key = `${r >> 4},${g >> 4},${bl >> 4}`;
    const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += r; e.g += g; e.b += bl; buckets.set(key, e);
  }
  const cols = [...buckets.values()].sort((a, b) => b.n - a.n).map((e) => '#' + [e.r / e.n, e.g / e.n, e.b / e.n].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''));
  if (!cols.length) return null;
  const dist = (a, b) => { const A = V.hexToRgb(a), B = V.hexToRgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  const primary = cols[0];
  const secondary = cols.find((x) => dist(x, primary) > 90) || V.mix(primary, '#FFB347', 0.6);
  return { primary: primary.toUpperCase(), secondary: secondary.toUpperCase(), dark: V.mix(primary, '#05050A', 0.84).toUpperCase(), light: V.mix(primary, '#FFFFFF', 0.94).toUpperCase() };
}

/* =========================================================
   Page : Avatars
   ========================================================= */
const avatarData = (a) => (a ? (a.kind === 'photo' ? { id: a.id, kind: 'photo', name: a.name, photo: a.data.photo } : { id: a.id, kind: 'illustre', name: a.name, config: a.data.config }) : null);
function drawAvatarThumb(c, av, brand, t = 1.2) {
  const B = V.normBrand(brand), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, V.mix(B.colors.dark, B.colors.primary, 0.35)); g.addColorStop(1, B.colors.dark);
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  drawCharacter(x, av?.config || DEFAULT_CHAR, c.width / 2, c.height * 1.02, (c.height * 1.05) / 820, { t, talk: 0, dir: 1, outfit: B.colors.primary, accent: B.colors.secondary });
}
function presenterPreview(av, layout = 'plein', script = 'Bonjour ! Je suis votre présentateur. Je parle aux couleurs de vos clients.', captions = true) {
  return { scenes: [{ id: 'av-prev', type: 'presentateur', duration: 7, transition: 'fondu', bg: 'auto', props: { ...structuredClone(V.SCENES.presentateur.defaults), avatar: av, layout, script, title: layout === 'plein' ? '' : 'Votre message', captions } }], fadeOut: false };
}
PAGES.avatars = () => `
  <header class="page-head"><div><h1>Avatars</h1><p class="sub">Les présentateurs qui parlent dans tes vidéos. Les illustrés sont gratuits ; les avatars photo s’animent par IA.</p></div>
    <div class="row" style="flex-wrap:wrap"><button class="btn lg" data-act="newPhotoAvatar">${ic('spark')}Avatar photo réaliste</button><button class="btn lg" data-act="newIllustrated">${ic('edit')}Créer de zéro</button><button class="btn primary lg" data-act="gallery">${ic('avatars')}Galerie de personnages</button></div></header>
  <div class="grid">
    <button class="new-card" data-act="gallery"><span class="plus">${ic('avatars')}</span>Choisir dans la galerie<span class="hint">${PRESETS.length} personnages cartoon, gratuits et personnalisables</span></button>
    ${state.avatars.map((a) => `<article class="card"><button class="card-open" data-act="editAvatar" data-id="${a.id}" data-hover>
      <div class="thumb">${a.kind === 'photo' ? `<img data-media="${a.data.photo}" alt="">` : '<canvas></canvas>'}<span class="badge fmt">${a.kind === 'photo' ? 'Réaliste, IA' : 'Illustré'}</span></div>
      <div class="card-body"><strong>${esc(a.name)}</strong><span class="card-meta">${a.kind === 'photo' ? 'Vidéo générée par fal.ai, environ 0,06 $ par seconde' : `${esc(OPTIONS.species[normChar(a.data.config).species])}, style ${esc(OPTIONS.style[normChar(a.data.config).style].toLowerCase())}`}</span></div></button></article>`).join('')}
  </div>
  ${!state.ai.configured ? `<div class="panel" style="margin-top:24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><h3>Avatars réalistes et voix IA</h3><p class="muted">Ajoute une clé fal.ai dans les Réglages pour faire parler une photo et générer des voix à partir d’un texte. Tu ne paies que ce que tu génères.</p></div><a class="btn" href="#/reglages">${ic('settings')}Configurer</a></div>` : ''}`;
AFTER.avatars = async () => {
  const brand = brandOf(state.clients[0]?.id);
  await V.ensureFonts(brand);
  $$('[data-act="editAvatar"]').forEach((b) => {
    const a = state.avatars.find((x) => x.id === b.dataset.id);
    const c = b.querySelector('canvas');
    if (c) live(c, { project: presenterPreview(avatarData(a), 'plein', undefined, false), brand, assets: { logo: null, images: {} }, hoverOnly: true, hero: 1.2 });
  });
  $$('img[data-media]').forEach(async (img) => { try { img.src = await mediaSrc(img.dataset.media); } catch { /* rien */ } });
};

const SPECIES_SKIN = { humain: '#DDA67F', robot: '#9AA7B8', chat: '#F2A65A', renard: '#E07B39', ours: '#8C5A3C' };
const CHAR_TABS = [['perso', 'Personnage'], ['visage', 'Visage'], ['cheveux', 'Cheveux'], ['tenue', 'Tenue'], ['acc', 'Accessoires']];
function charControls(cfg, tab) {
  const human = cfg.species === 'humain', robot = cfg.species === 'robot';
  const chips = (k) => `<div class="chips">${Object.entries(OPTIONS[k]).map(([v, l]) => `<button type="button" class="chip ${cfg[k] === v ? 'on' : ''}" data-opt="${k}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
  const sw = (k, list) => `<div class="swatch-row">${list.map((c) => `<button type="button" class="swatch" style="--sc:${c}" data-opt="${k}" data-v="${c}" aria-pressed="${cfg[k] === c}" aria-label="${c}"></button>`).join('')}</div>`;
  const tog = (k, l) => `<label class="switch"><input type="checkbox" data-tog="${k}" ${cfg[k] ? 'checked' : ''}>${l}</label>`;
  const F = (label, html) => `<div class="field"><span>${label}</span>${html}</div>`;
  if (tab === 'perso') return F('Espèce', chips('species')) + F('Style de dessin', chips('style')) + F(human ? 'Teint' : robot ? 'Métal' : 'Pelage', sw('skin', human ? SKINS : FURS));
  if (tab === 'visage') return (human ? F('Forme du visage', chips('face')) : '') + (robot ? '' : F('Yeux', chips('eyes'))) + F(robot ? 'Couleur des écrans' : 'Couleur des yeux', sw('eyeColor', EYE_COLORS))
    + (robot ? '' : F('Sourcils', chips('brows')) + (human ? F('Nez', chips('nose')) : '') + F('Bouche au repos', chips('mouth')) + `<div class="row" style="gap:18px;flex-wrap:wrap">${tog('blush', 'Joues roses')}${human ? tog('freckles', 'Taches de rousseur') : ''}</div>`);
  if (tab === 'cheveux') return human ? F('Coiffure', chips('hair')) + F('Couleur', sw('hairColor', HAIR_COLORS)) : '<p class="muted">Pas de cheveux pour les mascottes, mais elles peuvent porter un bonnet, une casquette ou un casque dans Accessoires.</p>';
  if (tab === 'tenue') return F('Vêtement', chips('outfitType')) + F('Couleur', `<div class="row" style="flex-wrap:wrap;gap:8px"><button type="button" class="chip ${cfg.outfit === 'marque' ? 'on' : ''}" data-opt="outfit" data-v="marque">Couleurs du client</button>${OUTFIT_COLORS.map((c) => `<button type="button" class="swatch" style="--sc:${c}" data-outfit-color="${c}" aria-pressed="${cfg.outfit !== 'marque' && cfg.outfitColor === c}" aria-label="${c}"></button>`).join('')}</div>`)
    + '<p class="hint">« Couleurs du client » habille le personnage avec la charte de chaque vidéo.</p>';
  return F('Lunettes', chips('glasses')) + F('Sur la tête', chips('hat')) + (human ? F('Barbe', chips('beard')) + tog('earrings', 'Boucles d’oreilles') : '');
}
function illustratedDialog(id = null, onSaved, preset = null) {
  const a = id ? state.avatars.find((x) => x.id === id) : null;
  const cfg = normChar(structuredClone(a?.data.config || preset?.config || DEFAULT_CHAR));
  const brand = brandOf(ed ? P().clientId : state.clients[0]?.id);
  let tab = 'perso', L = null;
  openModal(`<form class="dlg" data-local autocomplete="off">
    <div class="dlg-head"><div><h2>${a ? esc(a.name) : preset ? `Personnaliser ${esc(preset.name)}` : 'Créer un personnage'}</h2><p>Gratuit et illimité. Il bouge, cligne des yeux, fait des gestes et parle au rythme de la voix.</p></div><button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="brand-editor">
      <div style="display:grid;gap:14px;align-content:start;min-width:0">
        <div class="row"><label class="field" style="flex:1"><span>Nom</span><input name="name" value="${esc(a?.name || preset?.name || 'Présentateur')}" required></label>
          <button type="button" class="btn" data-random style="align-self:flex-end" title="Tirer un personnage au hasard">${ic('spark')}Aléatoire</button></div>
        <div class="segmented char-tabs" role="tablist">${CHAR_TABS.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div>
        <div class="char-panel" id="charPanel">${charControls(cfg, tab)}</div>
      </div>
      <div class="brand-preview"><div class="stage-box"><canvas id="charCanvas"></canvas></div><p class="hint">Aperçu en mouvement, aux couleurs de ${esc(brand.name)}.</p>
        <div class="segmented" id="prevLayout"><button type="button" data-pl="plein" aria-pressed="true">Plein cadre</button><button type="button" data-pl="cote" aria-pressed="false">À côté du contenu</button><button type="button" data-pl="medaillon" aria-pressed="false">Médaillon</button></div></div>
    </div>
    <div class="dlg-foot">${a ? `<button class="btn ghost danger" type="button" data-del-avatar>${ic('trash')}Supprimer</button>` : ''}<span class="spacer"></span><button class="btn" type="button" data-close>Annuler</button><button class="btn primary">${a ? 'Enregistrer' : 'Ajouter à mes avatars'}</button></div>
  </form>`, {
    size: 'wide',
    onMount: async (m) => {
      await V.ensureFonts(brand);
      let layout = 'plein';
      const prev = () => presenterPreview({ kind: 'illustre', config: { ...cfg } }, layout);
      L = live($('#charCanvas', m), { project: prev(), brand, assets: { logo: null, images: {} } });
      const upd = (panel = false) => { L.project = prev(); if (panel) $('#charPanel', m).innerHTML = charControls(cfg, tab); };
      const form = $('form', m);
      form.addEventListener('click', async (e) => {
        const o = e.target.closest('[data-opt]'), tb = e.target.closest('[data-tab]'), oc = e.target.closest('[data-outfit-color]'), pl = e.target.closest('[data-pl]');
        if (o) {
          const k = o.dataset.opt, v = o.dataset.v;
          cfg[k] = v;
          if (k === 'species') { cfg.skin = SPECIES_SKIN[v]; if (v !== 'humain') { cfg.brows = 'aucun'; cfg.beard = 'aucune'; cfg.earrings = false; } else if (cfg.brows === 'aucun') cfg.brows = 'fins'; if (v === 'robot') cfg.eyeColor = '#4CD3FF'; }
          upd(true);
        }
        if (oc) { cfg.outfit = 'perso'; cfg.outfitColor = oc.dataset.outfitColor; upd(true); }
        if (tb) { tab = tb.dataset.tab; $$('[data-tab]', m).forEach((x) => x.setAttribute('aria-pressed', x === tb)); upd(true); }
        if (pl) { layout = pl.dataset.pl; $$('[data-pl]', m).forEach((x) => x.setAttribute('aria-pressed', x === pl)); upd(); }
        if (e.target.closest('[data-random]')) { Object.assign(cfg, randomChar()); upd(true); }
        if (e.target.closest('[data-del-avatar]')) {
          if (!(await confirmBox({ title: `Supprimer ${a.name} ?`, text: 'Les scènes qui l’utilisent garderont son apparence actuelle.', ok: 'Supprimer', danger: true }))) return;
          await api(`/api/avatars/${a.id}`, { method: 'DELETE' }); await loadAll(); if (!ed) route(); toast('Avatar supprimé');
        }
      });
      form.addEventListener('change', (e) => { if (e.target.dataset.tog) { cfg[e.target.dataset.tog] = e.target.checked; upd(); } });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.name.value.trim() || 'Présentateur', btn = form.querySelector('.btn.primary'); btn.disabled = true;
        try {
          let newId = a?.id;
          if (a) await api(`/api/avatars/${a.id}`, { method: 'PUT', body: { name, data: { config: cfg } } });
          else newId = (await api('/api/avatars', { method: 'POST', body: { name, kind: 'illustre', data: { config: cfg } } })).id;
          await loadAll(); closeModal(); if (!ed) route();
          onSaved?.(state.avatars.find((x) => x.id === newId));
          toast(a ? 'Personnage enregistré' : `${name} a rejoint tes avatars`, 'ok');
        } catch (ex) { btn.disabled = false; toast(ex.message, 'error'); }
      });
    },
  });
}
function galleryDialog(onAdded) {
  const sel = new Set();
  const brand = brandOf(ed ? P().clientId : state.clients[0]?.id);
  openModal(`<div class="dlg">
    <div class="dlg-head"><div><h2>Galerie de personnages</h2><p>Sélectionne un ou plusieurs personnages : ils rejoignent tes avatars, prêts à être utilisés et personnalisés. Survole pour les voir parler.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="gal-grid">${PRESETS.map((p, i) => `<div class="gal-card" data-hover>
      <button type="button" class="gal-pick" data-pick="${i}" aria-pressed="false" aria-label="Sélectionner ${esc(p.name)}"><canvas></canvas><span class="gal-check">${ic('check')}</span></button>
      <div class="gal-meta"><div><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></div><button type="button" class="btn ghost" data-custom="${i}" title="Personnaliser avant d’ajouter">${ic('edit')}</button></div></div>`).join('')}</div>
    <div class="dlg-foot"><button class="btn ghost" data-all>Tout sélectionner</button><span class="spacer"></span><button class="btn" data-close>Annuler</button><button class="btn primary" data-add disabled>Choisis des personnages</button></div></div>`, {
    size: 'wide',
    onMount: async (m) => {
      await V.ensureFonts(brand);
      $$('.gal-card', m).forEach((card, i) => live(card.querySelector('canvas'), { project: presenterPreview({ kind: 'illustre', config: PRESETS[i].config }, 'plein', 'Bonjour, je suis ' + PRESETS[i].name + ' !', false), brand, assets: { logo: null, images: {} }, hoverOnly: true, hero: 1.4, format: '1:1' }));
      const addBtn = $('[data-add]', m);
      const refresh = () => {
        $$('[data-pick]', m).forEach((b) => b.setAttribute('aria-pressed', sel.has(+b.dataset.pick)));
        addBtn.disabled = !sel.size; addBtn.textContent = sel.size ? `Ajouter ${plural(sel.size, 'personnage', 'personnages')}` : 'Choisis des personnages';
      };
      m.querySelector('.dlg').addEventListener('click', async (e) => {
        const pk = e.target.closest('[data-pick]'), cu = e.target.closest('[data-custom]');
        if (pk) { const i = +pk.dataset.pick; sel.has(i) ? sel.delete(i) : sel.add(i); refresh(); }
        if (cu) illustratedDialog(null, onAdded, PRESETS[+cu.dataset.custom]);
        if (e.target.closest('[data-all]')) { if (sel.size === PRESETS.length) sel.clear(); else PRESETS.forEach((_, i) => sel.add(i)); refresh(); }
        if (e.target.closest('[data-add]') && sel.size) {
          addBtn.disabled = true; addBtn.textContent = 'Ajout…';
          try {
            const ids = [];
            for (const i of [...sel].sort((x, y) => x - y)) {
              const p = PRESETS[i];
              ids.push((await api('/api/avatars', { method: 'POST', body: { name: p.name, kind: 'illustre', data: { config: p.config } } })).id);
            }
            await loadAll(); closeModal(); if (!ed) route();
            onAdded?.(state.avatars.find((x) => x.id === ids[0]));
            toast(`${plural(ids.length, 'personnage ajouté', 'personnages ajoutés')} à tes avatars`, 'ok');
          } catch (ex) { toast(ex.message, 'error'); refresh(); }
        }
      });
    },
  });
}
function photoAvatarDialog(id = null, onSaved) {
  const a = id ? state.avatars.find((x) => x.id === id) : null;
  const brand = brandOf(ed ? P().clientId : state.clients[0]?.id);
  let file = null, bitmap = null, L = null;
  openModal(`<form class="dlg" data-local autocomplete="off">
    <div class="dlg-head"><div><h2>${a ? esc(a.name) : 'Avatar photo réaliste'}</h2><p>Une photo devient un présentateur qui parle, grâce à l’IA (fal.ai, Kling Avatar).</p></div><button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="brand-editor">
      <div style="display:grid;gap:16px;align-content:start">
        <label class="field"><span>Nom</span><input name="name" value="${esc(a?.name || '')}" placeholder="Camille, conseillère" required ${a ? '' : 'autofocus'}></label>
        <div class="field"><span>Photo</span>
          <div class="logo-drop" id="photoDrop"><div class="prev" id="photoPrev" style="width:84px;height:84px">${ic('image')}</div>
            <div style="display:grid;gap:8px;flex:1"><button class="btn" type="button" id="photoPick" style="justify-self:start">${a ? 'Remplacer la photo' : 'Choisir une photo'}</button>
            <span class="hint">De face, buste visible, bien éclairée, fond simple. JPG ou PNG.</span></div></div>
          <input type="file" accept="image/jpeg,image/png,image/webp" id="photoFile" hidden></div>
        <label class="row" style="align-items:flex-start;gap:10px;font-size:13.5px"><input type="checkbox" name="consent" ${a ? 'checked' : ''} style="margin-top:3px">J’ai l’accord de la personne représentée pour l’animer et la faire parler par IA, et je le signalerai si la vidéo l’exige.</label>
        ${state.ai.configured ? '' : '<p class="hint" style="color:var(--rec)">Aucune clé fal.ai configurée : tu pourras créer l’avatar, mais pas encore générer sa vidéo. Ajoute la clé dans Réglages.</p>'}
      </div>
      <div class="brand-preview"><div class="stage-box"><canvas id="photoCanvas"></canvas></div><p class="hint">Mise en page « à côté du contenu ». La photo s’animera après génération.</p></div>
    </div>
    <p class="form-error" id="paErr"></p>
    <div class="dlg-foot">${a ? `<button class="btn ghost danger" type="button" data-del-avatar>${ic('trash')}Supprimer</button>` : ''}<span class="spacer"></span><button class="btn" type="button" data-close>Annuler</button><button class="btn primary">${a ? 'Enregistrer' : 'Créer l’avatar'}</button></div>
  </form>`, {
    size: 'wide',
    onMount: async (m) => {
      await V.ensureFonts(brand);
      const assets = { logo: null, images: {}, photos: {}, preview: true };
      const setBitmap = async (bmp, src) => {
        bitmap = bmp; assets.photos.tmp = bmp;
        $('#photoPrev', m).innerHTML = `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover">`;
        if (L) L.project = presenterPreview({ kind: 'photo', photo: 'tmp' }, 'cote');
      };
      L = live($('#photoCanvas', m), { project: presenterPreview({ kind: 'photo', photo: 'tmp' }, 'cote'), brand, assets });
      if (a) { try { const src = await mediaSrc(a.data.photo); setBitmap(await createImageBitmap(await fetchMedia(a.data.photo)), src); } catch { /* rien */ } }
      const take = async (f) => {
        if (!f || !/^image\//.test(f.type)) return;
        try {
          const { src, w, h } = await readImage(f);
          const k = Math.min(1, 1280 / Math.max(w, h));
          const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
          file = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
          await setBitmap(await createImageBitmap(c), c.toDataURL('image/jpeg', 0.6));
        } catch { toast('Photo illisible.', 'error'); }
      };
      $('#photoPick', m).addEventListener('click', () => $('#photoFile', m).click());
      $('#photoFile', m).addEventListener('change', (e) => take(e.target.files[0]));
      const drop = $('#photoDrop', m);
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drag'); take(e.dataTransfer.files[0]); });
      const form = $('form', m);
      form.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-del-avatar]')) return;
        if (!(await confirmBox({ title: `Supprimer ${a.name} ?`, text: 'Les vidéos déjà générées restent dans tes projets.', ok: 'Supprimer', danger: true }))) return;
        await api(`/api/avatars/${a.id}`, { method: 'DELETE' }); await loadAll(); if (!ed) route(); toast('Avatar supprimé');
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#paErr', m); err.textContent = '';
        const name = form.name.value.trim();
        if (!name) { err.textContent = 'Donne un nom à cet avatar.'; return; }
        if (!a && !file) { err.textContent = 'Choisis une photo.'; return; }
        if (!form.consent.checked) { err.textContent = 'Confirme avoir l’accord de la personne représentée.'; return; }
        const btn = form.querySelector('.btn.primary'); btn.disabled = true; btn.textContent = 'Envoi…';
        try {
          const photo = file ? await uploadMedia(file, 'image', name) : a.data.photo;
          let newId = a?.id;
          if (a) await api(`/api/avatars/${a.id}`, { method: 'PUT', body: { name, data: { photo } } });
          else newId = (await api('/api/avatars', { method: 'POST', body: { name, kind: 'photo', data: { photo } } })).id;
          await loadAll(); closeModal(); if (!ed) route();
          onSaved?.(state.avatars.find((x) => x.id === newId));
          toast(`${name} est prêt`, 'ok');
        } catch (ex) { btn.disabled = false; btn.textContent = a ? 'Enregistrer' : 'Créer l’avatar'; err.textContent = ex.message; }
      });
    },
  });
}

/* =========================================================
   Enregistrements d'écran (façon Loom) et Google Drive
   ========================================================= */
function driveCard() {
  if (!D.driveAvailable()) return `<div class="drive-card off"><span class="drive-ic">${ic('cloud')}</span><div><strong>Google Drive n’est pas encore configuré</strong><p class="muted">Sans Drive, tes enregistrements se téléchargent sur ton ordinateur. Voir Réglages pour l’activer.</p></div><a class="btn" href="#/reglages">Réglages</a></div>`;
  if (!D.driveConnected()) return `<div class="drive-card"><span class="drive-ic">${ic('cloud')}</span><div><strong>Connecte ton Google Drive</strong><p class="muted">Tes vidéos iront dans un dossier « Cadence » de ton Drive, pas sur la plateforme. Cadence ne voit que les fichiers qu’elle crée.</p></div><button class="btn primary" data-act="driveConnect">${ic('cloud')}Connecter Google Drive</button></div>`;
  const u = D.driveUser() || {}, q = u.quota;
  const quota = q?.limit ? `, ${fmtBytes(+q.usage)} utilisés sur ${fmtBytes(+q.limit)}` : '';
  return `<div class="drive-card on"><span class="drive-ic">${ic('check')}</span><div><strong>Google Drive connecté</strong><p class="muted">${esc(u.email || u.name || 'Compte Google')}${quota}. Les vidéos vont dans le dossier « Cadence ».</p></div><button class="btn ghost" data-act="driveDisconnect">Déconnecter</button></div>`;
}
const recShareUrl = (r) => `${location.origin}/v/${r.id}`;
PAGES.enregistrements = () => `
  <header class="page-head"><div><h1>Enregistrements</h1><p class="sub">Enregistre ton écran, ta caméra et ta voix, comme avec Loom, puis partage un lien. Les vidéos sont stockées sur ton Google Drive.</p></div>
    <button class="btn rec lg" data-act="newRecording">${ic('record')}Nouvel enregistrement</button></header>
  ${driveCard()}
  ${state.recordings.length ? `<div class="rec-grid">${state.recordings.map((r) => `<article class="rec-card">
      <a class="rec-thumb" ${r.driveId ? `href="${esc(r.driveUrl || D.driveViewUrl(r.driveId))}" target="_blank" rel="noopener"` : ''}>${r.thumb ? `<img src="${r.thumb}" alt="">` : `<span>${ic('record')}</span>`}<em>${fmtDur(r.duration || 0)}</em></a>
      <div class="rec-body"><strong title="${esc(r.title)}">${esc(r.title)}</strong>
        <span class="muted">${new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}, ${fmtBytes(r.size || 0)}${r.driveId ? ', sur Google Drive' : ', sur ton ordinateur'}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          ${r.driveId ? `<button class="btn ${r.shared ? '' : 'primary'}" data-act="recShare" data-id="${r.id}">${ic('link')}${r.shared ? 'Copier le lien' : 'Partager'}</button>
            <a class="btn ghost" href="${esc(r.driveUrl || D.driveViewUrl(r.driveId))}" target="_blank" rel="noopener">Drive</a>` : ''}
          ${r.shared ? `<button class="btn ghost" data-act="recUnshare" data-id="${r.id}">Arrêter le partage</button>` : ''}
          <span class="spacer"></span>
          <button class="icon-btn" data-act="recRename" data-id="${r.id}" aria-label="Renommer" title="Renommer">${ic('edit')}</button>
          <button class="icon-btn" data-act="recDelete" data-id="${r.id}" aria-label="Supprimer" title="Supprimer">${ic('trash')}</button>
        </div></div></article>`).join('')}</div>`
    : `<div class="empty"><strong>Aucun enregistrement pour l’instant</strong><p>Clique sur « Nouvel enregistrement » : choisis ton écran, active ta caméra et ton micro, et c’est parti.</p></div>`}`;

async function driveConnectFlow() {
  try { await D.connectDrive(); toast('Google Drive connecté', 'ok'); return true; }
  catch (e) { toast(e.message, 'error'); return false; }
  finally { if (!ed) route(); }
}

/* ---------- Réglage puis enregistrement ---------- */
let recCtl = null, pipWin = null;
async function recordingDialog() {
  if (!R.supportsRecording()) return toast('Ce navigateur ne permet pas d’enregistrer l’écran. Utilise Chrome ou Edge sur ordinateur.', 'error');
  const devs = await R.listDevices();
  const st = { mode: 'screencam', micId: devs.mics[0]?.deviceId || '', camId: devs.cams[0]?.deviceId || '', systemAudio: false, bubble: { pos: 'bl', size: 'm' } };
  let camPrev = null;
  const stopPrev = () => { camPrev?.getTracks().forEach((t) => t.stop()); camPrev = null; };
  openModal(`<div class="dlg"><div class="dlg-head"><div><h2>Nouvel enregistrement</h2><p>Choisis ce que tu veux enregistrer. Au clic sur « Démarrer », le navigateur te demandera quel écran, quelle fenêtre ou quel onglet partager.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="segmented" id="recMode">${Object.entries(R.REC_MODES).map(([k, l]) => `<button data-mode="${k}" aria-pressed="${k === st.mode}">${l}</button>`).join('')}</div>
    <div class="rec-setup">
      <div class="rec-cam" id="recCamBox"><video id="recCamPrev" muted playsinline autoplay></video><span class="hint" id="recCamHint">Aperçu de la caméra</span></div>
      <div style="display:grid;gap:12px;align-content:start">
        <label class="field" id="camField"><span>Caméra</span><select id="recCam">${devs.cams.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `Caméra ${i + 1}`)}</option>`).join('') || '<option value="">Caméra par défaut</option>'}</select></label>
        <label class="field"><span>Micro</span><select id="recMic">${devs.mics.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `Micro ${i + 1}`)}</option>`).join('')}<option value="none">Sans micro</option></select></label>
        <div class="field" id="bubbleField"><span>Position de la bulle</span><div class="segmented" id="recPos">${[['bl', '↙ Bas gauche'], ['br', 'Bas droite ↘'], ['tl', '↖ Haut'], ['tr', 'Haut ↗']].map(([k, l]) => `<button data-pos="${k}" aria-pressed="${k === 'bl'}">${l}</button>`).join('')}</div></div>
        <div class="field" id="sizeField"><span>Taille de la bulle</span><div class="segmented" id="recSize">${[['s', 'Petite'], ['m', 'Moyenne'], ['l', 'Grande']].map(([k, l]) => `<button data-size="${k}" aria-pressed="${k === 'm'}">${l}</button>`).join('')}</div></div>
        <label class="switch"><input type="checkbox" id="recSys">Inclure le son de l’ordinateur (onglet ou écran partagé)</label>
      </div>
    </div>
    <p class="hint">${D.driveConnected() ? `${ic('check')} La vidéo ira sur ton Google Drive (${esc(D.driveUser()?.email || 'connecté')}).` : D.driveAvailable() ? 'Astuce : connecte ton Google Drive pour y envoyer la vidéo en un clic à la fin.' : 'La vidéo sera téléchargée sur ton ordinateur à la fin.'}</p>
    <p class="form-error" id="recErr"></p>
    <div class="dlg-foot"><button class="btn" data-close>Annuler</button><button class="btn rec" id="recGo">${ic('record')}Démarrer l’enregistrement</button></div></div>`, {
    size: 'wide',
    onClose: stopPrev,
    onMount: async (m) => {
      const prev = $('#recCamPrev', m);
      const showCam = async () => {
        stopPrev();
        const on = st.mode !== 'screen';
        $('#recCamBox', m).classList.toggle('off', !on); $('#camField', m).hidden = !on;
        $('#bubbleField', m).hidden = $('#sizeField', m).hidden = st.mode !== 'screencam';
        if (!on) { prev.srcObject = null; $('#recCamHint', m).textContent = 'Caméra désactivée'; return; }
        try { camPrev = await navigator.mediaDevices.getUserMedia({ video: { deviceId: st.camId ? { exact: st.camId } : undefined }, audio: false }); prev.srcObject = camPrev; $('#recCamHint', m).textContent = ''; }
        catch { $('#recCamHint', m).textContent = 'Caméra inaccessible : autorise-la dans le navigateur.'; }
      };
      showCam();
      $('#recMode', m).addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (!b) return; st.mode = b.dataset.mode; $$('#recMode button', m).forEach((x) => x.setAttribute('aria-pressed', x === b)); showCam(); });
      $('#recPos', m).addEventListener('click', (e) => { const b = e.target.closest('[data-pos]'); if (!b) return; st.bubble.pos = b.dataset.pos; $$('#recPos button', m).forEach((x) => x.setAttribute('aria-pressed', x === b)); });
      $('#recSize', m).addEventListener('click', (e) => { const b = e.target.closest('[data-size]'); if (!b) return; st.bubble.size = b.dataset.size; $$('#recSize button', m).forEach((x) => x.setAttribute('aria-pressed', x === b)); });
      $('#recCam', m).addEventListener('change', (e) => { st.camId = e.target.value; showCam(); });
      $('#recMic', m).addEventListener('change', (e) => { st.micId = e.target.value; });
      $('#recSys', m).addEventListener('change', (e) => { st.systemAudio = e.target.checked; });
      $('#recGo', m).addEventListener('click', async () => {
        const go = $('#recGo', m); go.disabled = true; go.innerHTML = '<span class="spinner"></span>Choix de l’écran…';
        stopPrev();
        try { recCtl = await R.startSession(st); }
        catch (e) {
          go.disabled = false; go.innerHTML = `${ic('record')}Démarrer l’enregistrement`;
          $('#recErr', m).textContent = e.name === 'NotAllowedError' ? 'Partage refusé. Réessaie et choisis un écran, une fenêtre ou un onglet.' : e.name === 'NotFoundError' ? 'Caméra ou micro introuvable.' : `Impossible de démarrer : ${e.message}`;
          return;
        }
        closeModal(); recordingHud();
      });
    },
  });
}

/* Barre de contrôle pendant l'enregistrement (+ fenêtre flottante si le navigateur le permet) */
function recordingHud() {
  const hud = document.createElement('div'); hud.className = 'rec-hud'; hud.id = 'recHud';
  hud.innerHTML = `<span class="rec-dot"></span><b id="recTime">00:00</b><span class="rec-lvl"><i id="recLvl"></i></span>
    <button class="btn" id="recPause">${ic('pause')}Pause</button><button class="btn rec" id="recStop">${ic('stop')}Terminer</button><button class="icon-btn" id="recCancel" title="Abandonner" aria-label="Abandonner">${ic('trash')}</button>
    ${window.documentPictureInPicture ? `<button class="icon-btn" id="recPip" title="Contrôles flottants, visibles par-dessus les autres fenêtres" aria-label="Contrôles flottants">${ic('layers')}</button>` : ''}`;
  document.body.append(hud);
  let timer = 0;
  const upd = () => {
    if (!recCtl) return;
    const t = fmtTime(recCtl.elapsed()).slice(0, 5);
    for (const doc of [document, pipWin?.document].filter(Boolean)) {
      const el = doc.getElementById('recTime'); if (el) el.textContent = t;
      const lv = doc.getElementById('recLvl'); if (lv) lv.style.width = `${Math.min(100, recCtl.level() * 160)}%`;
    }
    timer = setTimeout(upd, 250);
  };
  upd();
  const finish = async (save) => {
    clearTimeout(timer); hud.remove(); $('#recCamFloat')?.remove(); try { pipWin?.close(); } catch { /* rien */ } pipWin = null;
    const ctl = recCtl; recCtl = null; if (!ctl) return;
    if (!save) { ctl.cancel(); toast('Enregistrement abandonné'); return; }
    const res = await ctl.stop();
    reviewDialog(res);
  };
  const togglePause = () => {
    if (!recCtl) return;
    if (recCtl.paused()) recCtl.resume(); else recCtl.pause();
    for (const doc of [document, pipWin?.document].filter(Boolean)) { const b = doc.getElementById('recPause'); if (b) b.innerHTML = recCtl.paused() ? `${ic('play')}Reprendre` : `${ic('pause')}Pause`; doc.getElementById('recHud')?.classList.toggle('paused', recCtl.paused()); }
  };
  hud.querySelector('#recPause').onclick = togglePause;
  hud.querySelector('#recStop').onclick = () => finish(true);
  hud.querySelector('#recCancel').onclick = () => finish(false);
  recCtl.onEnded = () => finish(true);
  // Fenêtre flottante toujours visible (Chrome, Edge) : minuteur, pause, terminer
  const openPip = () => {
    if (!window.documentPictureInPicture || pipWin) return;
    const hasCam = !!recCtl?.camStream;
    documentPictureInPicture.requestWindow({ width: 340, height: hasCam ? 396 : 84 }).then((w) => {
      pipWin = w;
      [...document.styleSheets].forEach((ss) => { try { const s = w.document.createElement('style'); s.textContent = [...ss.cssRules].map((r) => r.cssText).join('\n'); w.document.head.append(s); } catch { /* feuille externe */ } });
      w.document.body.className = `pip-body${hasCam ? ' with-cam' : ''}`;
      w.document.body.innerHTML = `${hasCam ? '<div class="pip-cam"><video id="pipCam" muted playsinline autoplay></video></div>' : ''}<div class="rec-hud pip" id="recHud">${hud.innerHTML}</div>`;
      const pv = w.document.getElementById('pipCam');
      if (pv && recCtl?.camStream) { pv.srcObject = recCtl.camStream; pv.play().catch(() => {}); }
      w.document.getElementById('recPause').onclick = togglePause;
      w.document.getElementById('recStop').onclick = () => finish(true);
      w.document.getElementById('recCancel').onclick = () => finish(false);
      w.document.getElementById('recPip')?.remove();
      w.addEventListener('pagehide', () => { pipWin = null; });
    }).catch(() => {});
  };
  hud.querySelector('#recPip')?.addEventListener('click', openPip);
  openPip();
  // Navigateur sans fenêtre flottante (Firefox, Safari) : aperçu de la caméra dans la page
  if (!window.documentPictureInPicture && recCtl?.camStream) {
    const f = document.createElement('video'); f.className = 'rec-cam-float'; f.id = 'recCamFloat'; f.muted = true; f.playsInline = true; f.autoplay = true; f.srcObject = recCtl.camStream;
    document.body.append(f); f.play().catch(() => {});
  }
  if (recCtl?.surface === 'monitor' && recCtl.camStream && window.documentPictureInPicture) toast('Tu partages tout l’écran : la fenêtre flottante peut apparaître dans la vidéo. Partage plutôt une fenêtre ou un onglet pour n’avoir que la bulle ronde.');
}

/* Après l'enregistrement : revoir, nommer, envoyer sur Drive ou télécharger */
function reviewDialog({ blob, duration, thumb }) {
  const url = URL.createObjectURL(blob);
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const defTitle = `Enregistrement du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  let saved = null, ctrl = null;
  openModal(`<div class="dlg"><div class="dlg-head"><div><h2>Ton enregistrement</h2><p>${fmtDur(duration)}, ${fmtBytes(blob.size)} (${ext.toUpperCase()}).</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="rec-review"><video src="${url}" controls playsinline></video></div>
    <label class="field"><span>Titre</span><input id="rvTitle" value="${esc(defTitle)}" maxlength="160"></label>
    <div id="rvProg" class="rv-prog" hidden><div class="bar"><i id="rvBar"></i></div><span id="rvTxt"></span></div>
    <div id="rvDone"></div>
    <div class="dlg-foot" id="rvFoot">
      <button class="btn ghost danger" id="rvDiscard">${ic('trash')}Supprimer</button><span class="spacer"></span>
      <button class="btn" id="rvDownload">${ic('exports')}Télécharger</button>
      <button class="btn" id="rvToCadence" title="Importe la vidéo dans un nouveau projet (stockée sur la plateforme)">${ic('video')}Monter dans Cadence</button>
      ${D.driveAvailable() ? `<button class="btn primary" id="rvDrive">${ic('cloud')}Enregistrer sur Google Drive</button>` : ''}
    </div></div>`, {
    size: 'wide',
    onClose: () => { ctrl?.abort(); setTimeout(() => URL.revokeObjectURL(url), 30_000); if (!ed) route(); },
    onMount: (m) => {
      const title = () => $('#rvTitle', m).value.trim() || defTitle;
      $('#rvDiscard', m).onclick = async () => { if (saved || await confirmBox({ title: 'Supprimer cet enregistrement ?', text: 'Il n’a été envoyé nulle part : il sera perdu.', ok: 'Supprimer', danger: true })) closeModal(); };
      $('#rvDownload', m).onclick = async () => {
        download(url, `${slug(title())}.${ext}`);
        if (!saved) { const r = await api('/api/recordings', { method: 'POST', body: { title: title(), duration, size: blob.size, mime: blob.type, thumb } }); saved = { id: r.id }; await loadRecs(); }
        toast('Téléchargement lancé', 'ok');
      };
      $('#rvToCadence', m).onclick = async () => {
        if (blob.size > 58e6) return toast('Trop lourd pour la plateforme (58 Mo maximum). Envoie-la sur Drive ou télécharge-la.', 'error');
        const b = $('#rvToCadence', m); b.disabled = true; b.innerHTML = '<span class="spinner"></span>Import…';
        try {
          const v = document.createElement('video'); v.src = url; await new Promise((r) => { v.onloadedmetadata = r; setTimeout(r, 4000); });
          const ar = v.videoHeight && v.videoWidth ? v.videoHeight / v.videoWidth : 0.5625;
          const media = await uploadMedia(blob, 'video', `${title()}.${ext}`);
          const sc = V.newScene('libre'); sc.id = uid(); sc.duration = Math.min(60, Math.max(2, Math.round(duration * 10) / 10));
          sc.elements = [V.newElement('video', { media, ar, natAr: ar, w: 1, srcDur: duration, trimIn: 0, trimOut: duration, anim: { ...V.newElement('video').anim, in: 'none' } })];
          const p = await api('/api/projects', { method: 'POST', body: { name: title(), clientId: null, data: { format: '16:9', scenes: [sc] } } });
          closeModal(); await loadAll(); openEditor(p.id);
          toast('Projet créé avec ton enregistrement', 'ok');
        } catch (e) { toast(e.message, 'error'); b.disabled = false; b.innerHTML = `${ic('video')}Monter dans Cadence`; }
      };
      const dBtn = $('#rvDrive', m);
      if (dBtn) dBtn.onclick = async () => {
        if (!D.driveConnected()) { try { await D.connectDrive(); } catch (e) { return toast(e.message, 'error'); } }
        dBtn.disabled = true; dBtn.innerHTML = '<span class="spinner"></span>Envoi…';
        $('#rvProg', m).hidden = false; ctrl = new AbortController();
        try {
          const f = await D.uploadToDrive(blob, `${title()}.${ext}`, { signal: ctrl.signal, onProgress: (p) => { $('#rvBar', m).style.width = `${Math.round(p * 100)}%`; $('#rvTxt', m).textContent = `Envoi vers Google Drive, ${Math.round(p * 100)} %`; } });
          const body = { title: title(), duration, size: blob.size, mime: blob.type, thumb, driveId: f.id, driveUrl: f.webViewLink || D.driveViewUrl(f.id) };
          if (saved) await api(`/api/recordings/${saved.id}`, { method: 'DELETE' });
          const r = await api('/api/recordings', { method: 'POST', body }); saved = { id: r.id, driveId: f.id };
          await loadRecs();
          $('#rvTxt', m).textContent = 'Enregistrée sur ton Google Drive, dossier « Cadence ».';
          $('#rvDone', m).innerHTML = `<div class="rv-share"><b>${ic('check')}Vidéo sur Google Drive</b><span class="spacer"></span><a class="btn ghost" href="${esc(body.driveUrl)}" target="_blank" rel="noopener">Ouvrir dans Drive</a><button class="btn primary" id="rvShare">${ic('link')}Copier le lien de partage</button></div>`;
          $('#rvShare', m).onclick = () => shareRecording(saved.id);
          dBtn.remove(); toast('Vidéo enregistrée sur Google Drive', 'ok');
        } catch (e) {
          if (e.name === 'AbortError') return;
          dBtn.disabled = false; dBtn.innerHTML = `${ic('cloud')}Réessayer l’envoi`; $('#rvTxt', m).textContent = e.message; toast(e.message, 'error');
        }
      };
    },
  });
}
async function loadRecs() { state.recordings = await api('/api/recordings').catch(() => state.recordings); }
async function shareRecording(id) {
  const r = state.recordings.find((x) => x.id === id); if (!r?.driveId) return;
  try {
    if (!r.shared) {
      if (!D.driveConnected()) await D.connectDrive();
      await D.shareDriveFile(r.driveId);
      await api(`/api/recordings/${id}`, { method: 'PATCH', body: { shared: true } }); await loadRecs();
    }
    const link = recShareUrl(r);
    await navigator.clipboard.writeText(link).catch(() => {});
    toast(`Lien copié : ${link}`, 'ok');
  } catch (e) { toast(e.message, 'error'); }
  if (!ed && !modal.open) route();
}

/* =========================================================
   Musique : écoute, import, page
   ========================================================= */
const listen = { ctx: null, src: null, el: null, key: null, btn: null };
function stopListen() {
  try { listen.src?.stop(); } catch { /* rien */ }
  listen.el?.pause();
  if (listen.btn) listen.btn.innerHTML = ic('play');
  Object.assign(listen, { src: null, el: null, key: null, btn: null });
}
async function toggleListen(btn, kind, id) {
  const key = `${kind}:${id}`;
  if (listen.key === key) return stopListen();
  stopListen();
  listen.key = key; listen.btn = btn; btn.innerHTML = '<span class="spinner"></span>';
  try {
    if (kind === 'library') {
      const buf = await renderTrack(id, 18);
      if (listen.key !== key) return;
      listen.ctx ||= new AudioContext(); await listen.ctx.resume();
      const src = listen.ctx.createBufferSource(); src.buffer = buf;
      const g = listen.ctx.createGain(); g.gain.setValueAtTime(0, listen.ctx.currentTime); g.gain.linearRampToValueAtTime(0.9, listen.ctx.currentTime + 0.3);
      src.connect(g); g.connect(listen.ctx.destination); src.start(); src.onended = () => { if (listen.key === key) stopListen(); };
      listen.src = src;
    } else {
      const el = new Audio(await mediaSrc(id)); if (listen.key !== key) return;
      listen.el = el; el.onended = () => { if (listen.key === key) stopListen(); }; await el.play();
    }
    btn.innerHTML = ic('pause');
  } catch (e) { console.error(e); stopListen(); toast('Écoute impossible.', 'error'); }
}
async function importMusic(file) {
  if (!file) return null;
  if (!/^audio\//.test(file.type) && !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)) { toast('Choisis un fichier audio (MP3, WAV, M4A…).', 'error'); return null; }
  if (file.size > 55e6) { toast('Fichier trop lourd (55 Mo maximum).', 'error'); return null; }
  let duration = 0;
  try { const ac = new AudioContext(); duration = (await ac.decodeAudioData(await file.arrayBuffer())).duration; ac.close(); }
  catch { toast('Ce fichier audio est illisible.', 'error'); return null; }
  toast('Import de la musique…');
  const blob = file.type ? file : new Blob([file], { type: 'audio/mpeg' });
  const media = await uploadMedia(blob, 'audio', file.name);
  const name = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 120) || 'Ma musique';
  const r = await api('/api/music', { method: 'POST', body: { name, media, duration } });
  await loadAll();
  toast(`${name} ajoutée à tes musiques`, 'ok');
  return state.music.find((x) => x.id === r.id);
}
const trackCard = (id, t, extra = '') => `<div class="track-card" style="--tc:${t.color}">
  <button class="track-play" data-listen="library" data-id="${id}" aria-label="Écouter ${esc(t.name)}">${ic('play')}</button>
  <div class="track-info"><strong>${esc(t.name)}</strong><span>${esc(t.mood)}, ${t.bpm} BPM</span><span class="track-tags">${t.tags.map((x) => `<i>${esc(x)}</i>`).join('')}</span></div>${extra}</div>`;
const myMusicRow = (mu, extra = '') => `<div class="track-card mine">
  <button class="track-play" data-listen="upload" data-id="${mu.media}" aria-label="Écouter ${esc(mu.name)}">${ic('play')}</button>
  <div class="track-info"><strong>${esc(mu.name)}</strong><span>${fmtDur(mu.duration || 0)}, ${fmtBytes(mu.size || 0)}</span></div>${extra}</div>`;
PAGES.musique = () => `
  <header class="page-head"><div><h1>Musique</h1><p class="sub">Une bibliothèque de morceaux libres de droits, et tes propres musiques, prêtes à glisser dans tes vidéos.</p></div>
    <button class="btn primary lg" data-act="importMusic">${ic('upload')}Importer une musique</button></header>
  <section class="music-sec"><div class="music-head"><h2>Bibliothèque Cadence</h2><p class="muted">${Object.keys(MUSIC_TRACKS).length} morceaux originaux composés par Cadence : libres de droits, sans crédit à mentionner, et ajustés automatiquement à la durée de chaque vidéo.</p></div>
    <div class="track-grid">${Object.entries(MUSIC_TRACKS).map(([id, t]) => trackCard(id, t)).join('')}</div></section>
  <section class="music-sec"><div class="music-head"><h2>Mes musiques</h2><p class="muted">MP3, WAV ou M4A, 55 Mo maximum. Vérifie que tu as le droit d’utiliser la musique dans des vidéos commerciales.</p></div>
    <div class="drop-zone" id="musicDrop">${state.music.length ? `<div class="track-grid">${state.music.map((mu) => myMusicRow(mu, `<button class="icon-btn" data-act="delMusic" data-id="${mu.id}" aria-label="Supprimer" title="Supprimer">${ic('trash')}</button>`)).join('')}</div>`
      : `<div class="empty" style="padding:36px 20px"><strong>Glisse un fichier audio ici</strong><p>ou clique sur « Importer une musique ». Elle sera disponible dans toutes tes vidéos.</p></div>`}</div></section>`;
AFTER.musique = () => {
  const dz = $('#musicDrop');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', async (e) => { e.preventDefault(); dz.classList.remove('drag'); for (const f of e.dataTransfer.files) await importMusic(f).catch((x) => toast(x.message, 'error')); route(); });
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-listen]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  toggleListen(b, b.dataset.listen, b.dataset.id);
}, true);
const pickAudioFile = () => new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac'; i.onchange = () => res(i.files[0] || null); i.click(); });

/* =========================================================
   Page : Modèles
   ========================================================= */
PAGES.modeles = () => {
  const d = state.tplDomain || 'all';
  const list = Object.entries(TEMPLATES).filter(([, t]) => d === 'all' || t.domain === d);
  return `<header class="page-head"><div><h1>Modèles</h1><p class="sub">${Object.keys(TEMPLATES).length} structures de vidéo, classées par secteur. Survole pour voir l’animation${state.clients[0] ? ` aux couleurs de ${esc(state.clients[0].name)}` : ''}.</p></div></header>
  <div class="toolbar">${domainChips(d)}</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${list.map(([k, t]) => tplCard(k, t, 'data-act="useTpl"')).join('')}</div>`;
};
AFTER.modeles = () => {
  $$('[data-domain]').forEach((b) => b.addEventListener('click', () => { state.tplDomain = b.dataset.domain; route(); }));
  mountTplPreviews($('#view'), state.clients[0]?.id);
};

/* =========================================================
   Page : Exports
   ========================================================= */
PAGES.exports = () => `<header class="page-head"><div><h1>Exports</h1><p class="sub">L’historique des vidéos rendues. Les fichiers sont enregistrés sur ton ordinateur.</p></div></header>
  <div class="panel" id="exportsBox"><div class="empty"><span>Chargement…</span></div></div>`;
AFTER.exports = async () => {
  try {
    const rows = await api('/api/exports');
    $('#exportsBox').innerHTML = rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Vidéo</th><th>Client</th><th>Format</th><th>Qualité</th><th>Durée</th><th>Taille</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(new Date(r.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }))}</td>
        <td>${r.project_id && state.projects.some((p) => p.id === r.project_id) ? `<a href="#/editeur/${r.project_id}">${esc(r.project_name)}</a>` : esc(r.project_name)}</td>
        <td>${esc(clientById(r.client_id)?.name || '—')}</td><td><span class="badge">${esc(r.format)}</span></td><td>${esc(QUALITIES[r.quality]?.label || r.quality)}</td>
        <td class="num">${fmtDur(r.duration)}</td><td class="num">${fmtBytes(r.size)}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty"><strong>Aucun export pour l’instant</strong><p>Ouvre un projet et clique sur « Exporter » pour obtenir ton premier MP4.</p></div>`;
  } catch (e) { $('#exportsBox').innerHTML = `<div class="empty"><span>${esc(e.message)}</span></div>`; }
};

/* =========================================================
   Page : Réglages
   ========================================================= */
PAGES.reglages = () => `<header class="page-head"><div><h1>Réglages</h1><p class="sub">Ton studio, ton accès et la compatibilité de ce navigateur.</p></div></header>
  <div style="display:grid;gap:18px;max-width:760px">
    <section class="panel" style="display:grid;gap:12px"><h2>Google Drive</h2>
      ${D.driveAvailable() ? `${driveCard()}<p class="hint">Chaque personne connecte son propre compte Google dans son navigateur. Ses enregistrements et ses exports vont sur son Drive, dans un dossier « Cadence ». La plateforme ne garde qu’une fiche (titre, durée, lien).</p>`
        : `<p>Pour que les vidéos aillent sur le Google Drive de chaque personne plutôt que sur la plateforme, il faut un identifiant client Google (gratuit, environ 10 minutes) :</p>
        <ol class="steps-list"><li>Sur <b>console.cloud.google.com</b>, crée un projet, puis active <b>Google Drive API</b>.</li>
          <li>Dans <b>Écran de consentement OAuth</b> : type « Externe », ajoute l’autorisation <code>drive.file</code>, puis publie l’application (ou ajoute les comptes testeurs).</li>
          <li>Dans <b>Identifiants</b>, crée un <b>ID client OAuth</b> de type « Application Web », avec comme origine JavaScript autorisée : <code>${esc(location.origin)}</code></li>
          <li>Dans Cloudflare, ajoute la variable <code>GOOGLE_CLIENT_ID</code> au Worker avec cet identifiant, puis redéploie.</li></ol>`}
    </section>
    <form class="panel" data-local id="studioForm" style="display:grid;gap:14px"><h2>Studio</h2>
      <div class="row" style="align-items:flex-end"><label class="field" style="flex:1"><span>Nom du studio</span><input name="studio" value="${esc(state.studio)}" maxlength="60"></label><button class="btn">Enregistrer</button></div></form>
    <form class="panel" data-local id="pwForm" style="display:grid;gap:14px"><h2>Mot de passe</h2>
      <div class="grid-2"><label class="field"><span>Actuel</span><input type="password" name="cur" autocomplete="current-password"></label>
      <label class="field"><span>Nouveau, 10 caractères minimum</span><input type="password" name="next" autocomplete="new-password"></label></div>
      <p class="form-error" id="pwErr"></p><div><button class="btn">Changer le mot de passe</button></div></form>
    <form class="panel" data-local id="aiForm" style="display:grid;gap:14px"><div><h2>Intelligence artificielle</h2><p class="muted" style="margin-top:6px">Avatars photo réalistes et voix à partir d’un texte, via fal.ai. Tu ne paies que ce que tu génères, directement à fal.ai.</p></div>
      <div class="row" style="flex-wrap:wrap;gap:8px 18px">${state.ai.configured ? `<span style="color:var(--ok);display:flex;gap:6px;align-items:center;font-weight:700">${ic('check')}Clé configurée${state.ai.fromEnv ? ' (variable Cloudflare)' : ''}</span>` : '<span class="muted">Aucune clé configurée</span>'}
        <span class="muted">Ce mois-ci : <b style="color:var(--ink)">${fmtUsd(state.ai.monthSpent)}</b> pour ${plural(state.ai.monthJobs || 0, 'génération', 'générations')} (estimation)</span></div>
      ${state.ai.fromEnv ? '' : `<div class="row" style="align-items:flex-end"><label class="field" style="flex:1"><span>Clé d’API fal.ai</span><input name="key" type="password" placeholder="${state.ai.configured ? 'Nouvelle clé pour remplacer l’actuelle' : 'Colle ta clé ici'}" autocomplete="off"></label><button class="btn">Enregistrer</button>${state.ai.configured ? '<button class="btn ghost danger" type="button" id="aiRemove">Retirer</button>' : ''}</div>
      <p class="hint">Crée ta clé sur fal.ai, rubrique API Keys de ton tableau de bord. Elle reste sur ton serveur Cloudflare et n’est jamais renvoyée au navigateur. Pour plus de sécurité, tu peux aussi la définir comme secret <b>FAL_KEY</b> dans les réglages du Worker.</p>`}
      <p class="hint">Tarifs indicatifs : voix IA ≈ 0,10 $ pour 1 000 caractères ; avatar Standard ≈ 0,056 $ par seconde, Pro ≈ 0,115 $ par seconde.</p></form>
    <section class="panel" style="display:grid;gap:12px"><h2>Compatibilité de ce navigateur</h2><div id="compat" class="muted">Vérification…</div></section>
  </div>`;
AFTER.reglages = async () => {
  $('#studioForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('/api/settings', { method: 'PUT', body: { studio: e.target.studio.value } }); state.studio = e.target.studio.value.trim(); route(); toast('Nom du studio enregistré', 'ok'); } catch (ex) { toast(ex.message, 'error'); }
  });
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; $('#pwErr').textContent = '';
    if (f.next.value.length < 10) { $('#pwErr').textContent = 'Choisis au moins 10 caractères.'; return; }
    try {
      await api('/api/auth/password', { method: 'POST', body: { current: await passHash(f.cur.value, state.salt), next: await passHash(f.next.value, state.salt) } });
      f.reset(); toast('Mot de passe changé. Les autres appareils sont déconnectés.', 'ok');
    } catch (ex) { $('#pwErr').textContent = ex.message; }
  });
  $('#aiForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const k = e.target.key?.value.trim(); if (!k) return;
    try { await api('/api/ai/key', { method: 'PUT', body: { key: k } }); await loadAll(); route(); toast('Clé fal.ai enregistrée', 'ok'); } catch (ex) { toast(ex.message, 'error'); }
  });
  $('#aiRemove')?.addEventListener('click', async () => { await api('/api/ai/key', { method: 'PUT', body: { key: '' } }); await loadAll(); route(); toast('Clé retirée'); });
  const box = $('#compat');
  if (!V.supportsExport()) { box.innerHTML = '<b style="color:var(--rec)">Export indisponible.</b> Utilise Google Chrome ou Microsoft Edge à jour pour exporter tes vidéos.'; return; }
  const checks = [];
  for (const [label, w, h] of [['Full HD 1080p', 1920, 1080], ['4K 2160p', 3840, 2160]]) {
    let ok = false;
    try { ok = (await VideoEncoder.isConfigSupported({ codec: 'avc1.640033', width: w, height: h, bitrate: 2e7, framerate: 30 })).supported; } catch { /* non */ }
    checks.push(`<div class="row">${ok ? `<span style="color:var(--ok)">${ic('check')}</span>` : `<span style="color:var(--rec)">${ic('x')}</span>`}<span>MP4 H.264 en ${label}${ok ? '' : ' : non pris en charge, un autre codec sera utilisé'}</span></div>`);
  }
  let audio = false; try { audio = (await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 })).supported; } catch { /* non */ }
  checks.push(`<div class="row">${audio ? `<span style="color:var(--ok)">${ic('check')}</span>` : `<span style="color:var(--muted)">${ic('x')}</span>`}<span>Musique en AAC${audio ? '' : ' : sera encodée en Opus'}</span></div>`);
  box.innerHTML = checks.join('');
};

/* =========================================================
   Actions globales
   ========================================================= */
const ACT = {
  newVideo: () => newVideoDialog(),
  filter: (el) => { state.filter = el.dataset.f; route(); },
  newClient: () => brandDialog(),
  editClient: (el) => brandDialog(el.dataset.id),
  useTpl: (el) => newVideoDialog(el.dataset.tpl),
  newRecording: () => recordingDialog(),
  driveConnect: () => driveConnectFlow(),
  driveDisconnect: () => { D.disconnectDrive(); toast('Google Drive déconnecté de ce navigateur'); route(); },
  recShare: (el) => shareRecording(el.dataset.id),
  recUnshare: async (el) => {
    const r = state.recordings.find((x) => x.id === el.dataset.id); if (!r) return;
    try { if (!D.driveConnected()) await D.connectDrive(); await D.unshareDriveFile(r.driveId); } catch (e) { toast(e.message, 'error'); return; }
    await api(`/api/recordings/${r.id}`, { method: 'PATCH', body: { shared: false } }); await loadRecs(); route(); toast('Partage arrêté : le lien ne fonctionne plus');
  },
  recRename: async (el) => {
    const r = state.recordings.find((x) => x.id === el.dataset.id); if (!r) return;
    const t = prompt('Nouveau titre', r.title); if (!t || !t.trim()) return;
    await api(`/api/recordings/${r.id}`, { method: 'PATCH', body: { title: t.trim() } }); await loadRecs(); route();
  },
  recDelete: async (el) => {
    const r = state.recordings.find((x) => x.id === el.dataset.id); if (!r) return;
    const alsoDrive = !!r.driveId;
    if (!(await confirmBox({ title: `Supprimer « ${r.title} » ?`, text: alsoDrive ? 'La vidéo sera aussi supprimée de ton Google Drive (corbeille comprise), et le lien de partage ne fonctionnera plus.' : 'La fiche sera retirée de la liste. Le fichier téléchargé reste sur ton ordinateur.', ok: 'Supprimer', danger: true }))) return;
    if (alsoDrive) { try { if (!D.driveConnected()) await D.connectDrive(); await D.deleteDriveFile(r.driveId); } catch (e) { if (!/404|not found/i.test(e.message)) { toast(e.message, 'error'); return; } } }
    await api(`/api/recordings/${r.id}`, { method: 'DELETE' }); await loadRecs(); route(); toast('Enregistrement supprimé');
  },
  importMusic: async () => { const f = await pickAudioFile(); if (!f) return; try { await importMusic(f); } catch (e) { toast(e.message, 'error'); } if (!ed) route(); },
  delMusic: async (el) => {
    const mu = state.music.find((x) => x.id === el.dataset.id); if (!mu) return;
    if (!(await confirmBox({ title: `Supprimer « ${mu.name} » ?`, text: 'Les vidéos qui l’utilisent n’auront plus de musique.', ok: 'Supprimer', danger: true }))) return;
    stopListen(); await api(`/api/music/${mu.id}`, { method: 'DELETE' }); await loadAll(); route(); toast('Musique supprimée');
  },
  newIllustrated: () => illustratedDialog(),
  gallery: () => galleryDialog(),
  newPhotoAvatar: () => photoAvatarDialog(),
  editAvatar: (el) => { const a = state.avatars.find((x) => x.id === el.dataset.id); if (a?.kind === 'photo') photoAvatarDialog(a.id); else illustratedDialog(el.dataset.id); },
  logout: async () => { try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* rien */ } history.replaceState(null, '', location.pathname); authScreen('login'); },
  dupProject: async (el) => {
    try {
      const p = await api(`/api/projects/${el.dataset.id}`);
      await api('/api/projects', { method: 'POST', body: { name: `${p.name} (copie)`, clientId: p.clientId, format: p.format, data: p.data, thumb: p.thumb, duration: V.timeline(p.data).total } });
      await loadAll(); route(); toast('Projet dupliqué', 'ok');
    } catch (e) { toast(e.message, 'error'); }
  },
  delProject: async (el) => {
    const p = state.projects.find((x) => x.id === el.dataset.id); if (!p) return;
    if (!(await confirmBox({ title: `Supprimer « ${p.name} » ?`, text: 'Le projet sera définitivement supprimé. Les MP4 déjà exportés restent sur ton ordinateur.', ok: 'Supprimer', danger: true }))) return;
    try { await api(`/api/projects/${p.id}`, { method: 'DELETE' }); await loadAll(); route(); toast('Projet supprimé'); } catch (e) { toast(e.message, 'error'); }
  },
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !ACT[el.dataset.act]) return;
  e.preventDefault();
  ACT[el.dataset.act](el, e);
});

/* =========================================================
   Éditeur
   ========================================================= */
let ed = null;
function stopEditor() {
  if (!ed) return;
  const pending = ed.save.flush?.();
  Promise.resolve(pending).then(() => setTimeout(refreshProjects, 400));
  cancelAnimationFrame(ed.raf); ed.ro?.disconnect(); clearInterval(ed.jobTimer);
  Object.values(ed.assets.voices || {}).forEach((v) => v.el.pause());
  Object.values(ed.assets.videos || {}).forEach((v) => v.pause());
  ed.assets?.music?.el?.pause(); stopListen(); stopClipAudio();
  removeEventListener('keydown', ed.onKey);
  ed = null;
}
async function openEditor(id) {
  if (ed?.id === id) return;
  stopEditor();
  $('#root').innerHTML = `<div class="editor"><div class="ed-top"><a class="btn ghost" href="#/projets">${ic('back')}Projets</a></div><div class="ed-stage"><span style="color:var(--stage-muted)">Ouverture du projet…</span></div></div>`;
  let p;
  try { p = await api(`/api/projects/${id}`); } catch (e) { toast(e.message, 'error'); location.hash = '#/projets'; return; }
  p.data.scenes ||= []; p.data.assets ||= {};
  p.data.scenes.forEach((s) => { s.id ||= uid(); });
  ed = {
    id, project: p, brand: brandOf(p.clientId), assets: { logo: null, images: {} },
    time: 0, playing: false, loop: true, sel: 0, tab: 'scene', raf: 0, last: 0, dirty: true,
    history: [], future: [], lastThumb: 0, saveState: 'saved',
  };
  ed.save = debounce(saveProject, 900);
  renderEditor();
  await reloadAssets();
  ed.dirty = true;
  ed.raf = requestAnimationFrame(loop);
  ed.jobTimer = setInterval(pollJobs, 5000); pollJobs();
}
const P = () => ed.project;
const scenesOf = () => P().data.scenes;
const curScene = () => scenesOf()[ed.sel];
const projForRender = () => ({ ...P().data, format: P().format });

async function reloadAssets() {
  if (!ed) return;
  const a = await V.prepareAssets(P().data, ed.brand, { media: fetchMedia, preview: true });
  if (!ed) return;
  Object.values(ed.assets.voices || {}).forEach((v) => { if (!Object.values(a.voices).includes(v)) v.el.pause(); });
  ed.assets = a; ed.dirty = true; renderFilm();
  if (ed.showAudio) renderAudio();
  if (ed.showTracks) renderTracks();
}
function editorBrandChanged() {
  if (!ed) return;
  ed.brand = brandOf(P().clientId);
  const sel = $('.ed-client'); if (sel) sel.innerHTML = clientOptions();
  reloadAssets(); renderInspector();
}
const clientOptions = () => `<option value="">Sans client</option>${state.clients.map((c) => `<option value="${c.id}" ${P().clientId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="__new">+ Nouveau client…</option>`;

function renderEditor() {
  const p = P();
  $('#root').innerHTML = `<div class="editor">
    <header class="ed-top">
      <a class="btn ghost" href="#/projets" title="Retour aux projets">${ic('back')}<span class="hide-sm">Projets</span></a>
      <input class="ed-name" id="edName" value="${esc(p.name)}" aria-label="Nom de la vidéo" maxlength="120">
      <select class="ed-client hide-sm" id="edClient" aria-label="Client">${clientOptions()}</select>
      <span class="ed-status hide-sm" id="edStatus" data-s="saved"><i></i><span>Enregistré</span></span>
      <span class="ed-spacer"></span>
      <button class="icon-btn hide-sm" data-ed="undo" title="Annuler (Ctrl+Z)" aria-label="Annuler">${ic('undo')}</button>
      <button class="icon-btn hide-sm" data-ed="redo" title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir">${ic('redo')}</button>
      <div class="segmented" role="group" aria-label="Format">${Object.keys(FORMATS).map((k) => `<button data-ed="format" data-f="${k}" aria-pressed="${p.format === k}" title="${esc(FORMATS[k].hint)}">${k}</button>`).join('')}</div>
      <button class="btn rec" data-ed="export" title="Exporter en MP4 (Ctrl+E)">${ic('rec')}Exporter</button>
    </header>
    <div class="ed-main">
      <div class="ed-center">
        <div class="ed-stage" id="edStage"><div class="stage-tools"><button class="btn primary" data-ed="addElement" data-scope="scene">${ic('plus')}Ajouter un élément</button></div>
          <div class="canvas-wrap" id="canvasWrap"><canvas id="edCanvas"></canvas><div class="sel-layer" id="selLayer"></div></div></div>
        <div class="ed-transport">
          <button class="icon-btn" data-ed="toStart" title="Revenir au début (Début)" aria-label="Revenir au début">${ic('start')}</button>
          <button class="play-btn" data-ed="play" id="playBtn" aria-label="Lecture">${ic('play')}</button>
          <span class="timecode" id="timecode">00:00.0 <span>/ 00:00.0</span></span>
          <div class="scrub" id="scrub" role="slider" aria-label="Position" tabindex="0"><div class="scrub-track" id="scrubTrack"></div><div class="scrub-fill" id="scrubFill"></div><div class="scrub-knob" id="scrubKnob"></div></div>
 <button class="atl-btn ${ed.showAudio ? 'on' : ''}" data-ed="toggleAudio" id="audioBtn" title="Timeline audio : voix, musique, bruitages">${ic('speaker')}<span>Audio</span></button>
 <button class="icon-btn" data-ed="toggleTracks" id="tracksBtn" title="Pistes de la scène" aria-label="Pistes de la scène" style="color:${ed.showTracks ? '#fff' : ''}">${ic('tracks')}</button>
 <button class="music-chip" data-ed="music" id="musicChip" title="Musique de la vidéo">${ic('musicnav')}<span>${esc(musicLabel())}</span></button>
          <button class="icon-btn" data-ed="loop" id="loopBtn" title="Lecture en boucle" aria-label="Boucle" style="color:${ed.loop ? '#fff' : ''}">${ic('loop')}</button>
        </div>
        <div class="atl" id="atl" ${ed.showAudio ? '' : 'hidden'}></div>
        <div class="tracks" id="tracks" ${ed.showTracks ? '' : 'hidden'}></div>
        <div class="film" id="film"></div>
      </div>
      <aside class="ed-side">
        <div class="ed-tabs" role="tablist"><button role="tab" data-ed="tab" data-t="scene" aria-selected="${ed.tab === 'scene'}">Scène</button><button role="tab" data-ed="tab" data-t="video" aria-selected="${ed.tab === 'video'}">Vidéo</button></div>
        <div class="inspector" id="inspector"></div>
      </aside>
    </div>
    <input type="file" id="imgFile" accept="image/*" hidden>
  </div>`;
  ed.ro = new ResizeObserver(fitCanvas); ed.ro.observe($('#edStage'));
  fitCanvas(); renderFilm(); renderInspector(); renderScrub();
  bindEditor();
}
function fitCanvas() {
  if (!ed) return;
  const st = $('#edStage'), c = $('#edCanvas'); if (!st || !c) return;
  const f = FORMATS[P().format];
  const aw = st.clientWidth - 48, ah = st.clientHeight - 48;
  const k = Math.min(aw / f.w, ah / f.h);
  const cw = Math.max(80, Math.floor(f.w * k)), ch = Math.max(80, Math.floor(f.h * k));
  c.style.width = `${cw}px`; c.style.height = `${ch}px`;
  const wrap = $('#canvasWrap'); if (wrap) { wrap.style.width = `${cw}px`; wrap.style.height = `${ch}px`; }
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = Math.min(f.w, Math.round(cw * dpr)); c.height = Math.round(c.width * f.h / f.w);
  ed.dirty = true;
}
function loop(ts) {
  if (!ed) return;
  const dt = ed.last ? (ts - ed.last) / 1000 : 0; ed.last = ts;
  const total = V.timeline(projForRender()).total;
  if (ed.playing) {
    playSfxBetween(ed.time, ed.time + dt);
    ed.time += dt;
    if (ed.time >= total) { if (ed.loop) { ed.time = 0; startClipAudio(0); } else { ed.time = total; setPlaying(false); } }
    ed.dirty = true;
  }
  V.syncPreview(projForRender(), ed.assets, ed.time, ed.playing, () => { if (ed) ed.dirty = true; });
  if (ed.dirty) {
    const c = $('#edCanvas');
    if (c) { const hits = []; V.renderFrame(c.getContext('2d'), c.width, c.height, projForRender(), ed.brand, ed.assets, ed.time, { hits }); ed.hits = hits; }
    updateTransport(total);
    drawSelection(); updatePlayheadTracks(); updateAudioPlayhead();
    ed.dirty = false;
  }
  ed.raf = requestAnimationFrame(loop);
}
function updateTransport(total) {
  const tc = $('#timecode'); if (tc) tc.innerHTML = `${fmtTime(ed.time)} <span>/ ${fmtTime(total)}</span>`;
  const pct = total ? (ed.time / total) * 100 : 0;
  const f = $('#scrubFill'), k = $('#scrubKnob');
  if (f) f.style.width = `${pct}%`; if (k) k.style.left = `${pct}%`;
  if (ed.playing) {
    const { items } = V.timeline(projForRender());
    const cur = items.findLast((it) => ed.time >= it.start)?.index ?? 0;
    $$('.clip').forEach((el) => el.classList.toggle('live', +el.dataset.i === cur));
  }
}
function setPlaying(v) {
  ed.playing = v;
  const total = V.timeline(projForRender()).total;
  if (v && ed.time >= total - 0.05) ed.time = 0;
  if (v) startClipAudio(ed.time); else stopClipAudio();
  const b = $('#playBtn'); if (b) { b.innerHTML = ic(v ? 'pause' : 'play'); b.setAttribute('aria-label', v ? 'Pause' : 'Lecture'); }
  ed.last = 0;
}
function seek(t) { const total = V.timeline(projForRender()).total; ed.time = clamp(t, 0, total); ed.dirty = true; if (ed.playing) startClipAudio(ed.time); }
function seekScene(i) { const it = V.timeline(projForRender()).items[i]; if (it) seek(it.start + (it.tr || 0) + Math.min(1.6, (+it.scene.duration || 4) * 0.4)); }

function renderScrub() {
  const { items, total } = V.timeline(projForRender());
  const tr = $('#scrubTrack'); if (!tr) return;
  tr.innerHTML = items.map((it, i) => `<i class="${i === ed.sel ? 'sel' : ''}" style="width:${(((items[i + 1]?.start ?? it.end) - it.start) / (total || 1)) * 100}%"></i>`).join('');
}
function renderFilm() {
  const film = $('#film'); if (!film || !ed) return;
  const f = FORMATS[P().format], aspect = f.w / f.h;
  const th = 64, tw = Math.round(th * aspect);
  film.innerHTML = scenesOf().map((s, i) => `<div class="clip" draggable="true" data-i="${i}" aria-selected="${i === ed.sel}" role="button" tabindex="0" title="${esc(SCENES[s.type]?.label)}">
      ${i > 0 && s.transition !== 'aucune' ? `<span class="clip-tr" title="Transition : ${esc(TRANSITIONS[s.transition] || '')}"></span>` : ''}
      <canvas width="${tw * 2}" height="${th * 2}" style="width:${Math.max(tw, Math.round((+s.duration || 4) * 26))}px;object-fit:cover"></canvas>
      <div class="clip-meta"><span>${esc(SCENES[s.type]?.label || s.type)}</span><small>${(+s.duration).toFixed(1).replace('.', ',')} s</small></div></div>`).join('')
    + `<button class="add-clip" data-ed="addScene">${ic('plus')}Ajouter<br>une scène</button>`;
  $$('.clip canvas', film).forEach((c, i) => drawClip(c, i));
  renderScrub();
}
function drawClip(c, i) {
  const s = scenesOf()[i]; if (!s || !c) return;
  const hero = Math.min((+s.duration || 4) * 0.62, 2.6);
  V.renderFrame(c.getContext('2d'), c.width, c.height, { scenes: [s], fadeOut: false, assets: P().data.assets, text: P().data.text }, ed.brand, ed.assets, hero);
}
const redrawAllClips = debounce(() => { $$('.clip canvas').forEach((c, i) => drawClip(c, i)); }, 200);
const redrawClip = debounce((i) => { const c = $(`.clip[data-i="${i}"] canvas`); if (c) drawClip(c, i); }, 250);

/* ---------- Inspecteur ---------- */
function renderInspector() {
  const box = $('#inspector'); if (!box || !ed) return;
  $$('.ed-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === ed.tab));
  if (ed.selEl && selElement()) { box.innerHTML = elementPanel(); hydrateInspector(); return; }
  if (ed.tab === 'video') { box.innerHTML = videoPanel(); hydrateInspector(); return; }
  const s = curScene();
  if (!s) { box.innerHTML = `<div class="empty"><span>Ajoute une première scène avec le bouton « Ajouter une scène ».</span></div>`; return; }
  const def = SCENES[s.type];
  box.innerHTML = `
    <div class="insp-head"><div><h2>${esc(def.label)}</h2><p>Scène ${ed.sel + 1} sur ${scenesOf().length}. ${esc(def.hint)}.</p></div>
      <div class="row" style="gap:2px"><button class="icon-btn" data-ed="dupScene" title="Dupliquer (Ctrl+D)" aria-label="Dupliquer la scène">${ic('copy')}</button>
      <button class="icon-btn" data-ed="delScene" title="Supprimer (Suppr)" aria-label="Supprimer la scène">${ic('trash')}</button></div></div>
    ${elementsList('scene')}
    ${def.fields.map((f) => fieldHtml(f, s.props)).join('')}
    ${aiVideoSection(s)}
    ${textSection('scene', s)}
    <div class="insp-sec"><div class="label">Rythme et transition</div>
      <div class="field"><span>Durée</span><div class="range-row"><input type="range" min="1.5" max="${s.type === 'presentateur' ? 60 : 15}" step="0.5" value="${s.duration}" data-common="duration" aria-label="Durée en secondes"><output id="durOut">${(+s.duration).toFixed(1).replace('.', ',')} s</output></div></div>
      <label class="field"><span>Transition d’entrée</span><select data-common="transition" ${ed.sel === 0 ? 'disabled' : ''}>${Object.entries(TRANSITIONS).map(([k, l]) => `<option value="${k}" ${s.transition === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Fond</span><select data-common="bg">${Object.entries(BACKGROUNDS).map(([k, l]) => `<option value="${k}" ${(s.bg || 'auto') === k ? 'selected' : ''}>${l}${k === 'auto' ? ` (${esc(BACKGROUNDS[def.bg].toLowerCase())})` : ''}</option>`).join('')}</select></label>
    </div>`;
  hydrateInspector();
}
const videoKey = (p) => `${p.avatar?.photo || ''}|${p.voice || ''}`;
function fieldHtml(f, props) {
  const v = props[f.k];
  if (f.type === 'avatar') {
    return `<div class="field"><span>${esc(f.label)}</span><div class="av-pick">
      <button class="av-opt" data-ed="pickAvatar" data-id="" aria-pressed="${!v}"><canvas data-av=""></canvas><span>Par défaut</span></button>
      ${state.avatars.map((a) => `<button class="av-opt" data-ed="pickAvatar" data-id="${a.id}" aria-pressed="${v?.id === a.id}">${a.kind === 'photo' ? `<img data-media="${a.data.photo}" alt="">` : `<canvas data-av="${a.id}"></canvas>`}<span>${esc(a.name)}</span>${a.kind === 'photo' ? '<i class="av-ia">IA</i>' : ''}</button>`).join('')}
      <button class="av-opt add" data-ed="newAvatar"><span class="plus">${ic('plus')}</span><span>Nouveau</span></button></div></div>`;
  }
  if (f.type === 'voice') {
    const sc = curScene(), vo = v && ed.assets.voices?.[v], job = sc.props.voiceJob;
    const chars = (sc.props.script || '').length;
    return `<div class="field"><span>${esc(f.label)}</span><div class="voice-box">
      ${job ? '<div class="job"><span class="spinner"></span><span id="voiceJobStatus">Génération de la voix…</span></div>'
        : v ? `<div class="row"><button class="icon-btn" data-ed="playVoice" aria-label="Écouter la voix">${ic('play')}</button><span style="flex:1;font-weight:700">Voix prête${vo ? `, ${vo.duration.toFixed(1).replace('.', ',')} s` : ''}</span><button class="btn ghost" data-ed="removeVoice">Retirer</button></div>`
        : '<p class="hint" style="color:var(--stage-muted)">Sans voix, l’avatar mime la parole pendant que les sous-titres défilent. Ajoute une voix pour qu’il parle vraiment.</p>'}
      <div class="row" style="flex-wrap:wrap"><button class="btn" data-ed="recordVoice">${ic('mic')}Enregistrer</button><button class="btn" data-ed="uploadVoice">${ic('upload')}Importer</button></div>
      <div class="row"><select data-tts-voice aria-label="Voix IA" style="flex:1">${Object.entries(TTS_VOICES).map(([g, l]) => `<optgroup label="${g}">${l.map((n) => `<option ${(sc.props.ttsVoice || 'Aria') === n ? 'selected' : ''}>${n}</option>`).join('')}</optgroup>`).join('')}</select>
        <button class="btn" data-ed="ttsVoice" ${state.ai.configured && !job && chars ? '' : 'disabled'}>${ic('spark')}Voix IA</button></div>
      <span class="hint" style="color:var(--stage-muted)">${state.ai.configured ? `Voix IA premium, en français, anglais, arabe et 26 autres langues (elle suit la langue du texte) : environ ${fmtUsd(Math.max(0.01, (chars / 1000) * 0.1))}.` : 'Voix IA premium : ajoute une clé fal.ai dans Réglages.'}</span>
      ${v ? `<button class="btn" data-ed="syncTitles" style="justify-self:start">${ic('text')}Créer des titres synchronisés avec la voix</button>` : ''}
      <div class="free-tts">
        <div class="label" style="display:flex;justify-content:space-between"><span>Voix gratuite</span><span class="badge-free">Gratuit, illimité</span></div>
        <div class="segmented" style="margin-bottom:2px">${Object.entries(FREE_LANGS).map(([k, l]) => `<button data-ed="freeLang" data-lang="${k}" aria-pressed="${voiceLang(sc.props.freeVoice || FREE_VOICES[0].key) === k}">${l}</button>`).join('')}</div>
        <div class="row"><select data-free-voice aria-label="Voix gratuite" style="flex:1">${FREE_VOICES.filter((fv) => fv.lang === voiceLang(sc.props.freeVoice || FREE_VOICES[0].key)).map((fv) => `<option value="${fv.key}" ${(sc.props.freeVoice || FREE_VOICES[0].key) === fv.key ? 'selected' : ''}>${esc(fv.label)}</option>`).join('')}</select>
          <button class="btn primary" data-ed="freeVoice" ${chars && !job ? '' : 'disabled'}>${ic('play')}Générer</button></div>
        <div class="range-row"><span class="hint" style="color:var(--stage-muted)">Vitesse</span><input type="range" min="0.75" max="1.35" step="0.05" value="${sc.props.freeSpeed || 1}" data-free-speed aria-label="Vitesse de la voix"><output id="freeSpeedOut">×${(+(sc.props.freeSpeed || 1)).toFixed(2).replace('.', ',')}</output></div>
        ${LANG_HINT[voiceLang(sc.props.freeVoice || FREE_VOICES[0].key)] ? `<p class="hint" style="color:${FREE_VOICES.find((x) => x.key === sc.props.freeVoice)?.warn ? '#F2B54A' : 'var(--stage-muted)'}">${LANG_HINT[voiceLang(sc.props.freeVoice || FREE_VOICES[0].key)]}</p>` : ''}
        <div id="freeStatus" class="hint" style="color:var(--stage-muted)">Lit le texte prononcé, calculé sur ton ordinateur. Au premier usage, la voix se télécharge une fois (${esc((FREE_VOICES.find((fv) => fv.key === (sc.props.freeVoice || FREE_VOICES[0].key)) || FREE_VOICES[0]).size)}), ensuite c’est instantané.</div>
      </div>
    </div></div>`;
  }
  if (f.type === 'text') return `<label class="field"><span>${esc(f.label)}</span><input data-k="${f.k}" value="${esc(v ?? '')}" placeholder="${esc(f.placeholder || '')}"></label>`;
  if (f.type === 'textarea') return `<label class="field"><span>${esc(f.label)}</span><textarea dir="auto" data-k="${f.k}" rows="${f.rows || 2}" placeholder="${esc(f.placeholder || '')}">${esc(v ?? '')}</textarea></label>`;
  if (f.type === 'toggle') return `<label class="switch"><input type="checkbox" data-k="${f.k}" ${v ? 'checked' : ''}>${esc(f.label)}</label>`;
  if (f.type === 'select') return `<label class="field"><span>${esc(f.label)}</span><select data-k="${f.k}">${Object.entries(f.options).map(([k, l]) => `<option value="${k}" ${String(v) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  if (f.type === 'image') {
    const src = v && P().data.assets[v];
    return `<div class="field"><span>${esc(f.label)}</span><div class="img-field"><div class="prev" style="${src ? `background-image:url('${src}')` : ''}"></div>
      <div style="display:grid;gap:6px"><button class="btn" data-ed="pickImage" data-k="${f.k}">${ic('image')}${src ? 'Remplacer' : 'Choisir une image'}</button>
      ${src ? `<button class="btn ghost" data-ed="removeImage" data-k="${f.k}">Retirer</button>` : '<span class="hint" style="color:var(--stage-muted)">JPG ou PNG, compressée automatiquement</span>'}</div></div></div>`;
  }
  if (f.type === 'items') {
    const items = Array.isArray(v) ? v : [];
    return `<div class="field"><span>${esc(f.label)}</span><div class="items">${items.map((it, i) => `<div class="item"><span class="item-num">${i + 1}</span>
        ${f.item.map((sf) => `<label class="field"><span>${esc(sf.label)}</span><input data-item="${i}" data-items="${f.k}" data-ik="${sf.k}" value="${esc(it[sf.k] ?? '')}" placeholder="${esc(sf.placeholder || '')}"></label>`).join('')}
        ${items.length > 1 ? `<button class="icon-btn" data-ed="delItem" data-k="${f.k}" data-i="${i}" aria-label="Retirer">${ic('x')}</button>` : ''}</div>`).join('')}
      ${items.length < f.max ? `<button class="btn ghost" data-ed="addItem" data-k="${f.k}" style="justify-self:start">${ic('plus')}${esc(f.add)}</button>` : ''}</div></div>`;
  }
  return '';
}
function aiVideoSection(s) {
  const p = s.props;
  if (s.type !== 'presentateur' || p.avatar?.kind !== 'photo') return '';
  const vo = p.voice && ed.assets.voices?.[p.voice];
  const model = p.model || 'avatar-standard', rate = model === 'avatar-pro' ? 0.115 : 0.0562;
  const ready = p.video && p.videoKey === videoKey(p);
  let body;
  if (p.videoJob) body = '<div class="job"><span class="spinner"></span><span id="videoJobStatus">Génération en file d’attente…</span></div><p class="hint" style="color:var(--stage-muted)">Compte souvent 3 à 10 minutes. Tu peux continuer à travailler, ou fermer la vidéo et revenir plus tard.</p>';
  else if (!p.voice) body = '<p class="hint" style="color:var(--stage-muted)">Ajoute d’abord une voix : l’IA anime la photo sur cette voix.</p>';
  else body = `${ready ? `<div class="job ok">${ic('check')}Vidéo réaliste prête</div>` : ''}
    <label class="field"><span>Qualité</span><select data-k="model"><option value="avatar-standard" ${model === 'avatar-standard' ? 'selected' : ''}>Standard, environ 0,056 $ par seconde</option><option value="avatar-pro" ${model === 'avatar-pro' ? 'selected' : ''}>Pro 1080p, environ 0,115 $ par seconde</option></select></label>
    <button class="btn ${ready ? '' : 'primary'}" data-ed="genVideo" ${state.ai.configured && vo ? '' : 'disabled'} style="justify-self:start">${ic('spark')}${ready ? 'Régénérer' : 'Générer la vidéo réaliste'}${vo ? `, environ ${fmtUsd(vo.duration * rate)}` : ''}</button>
    ${state.ai.configured ? '' : '<span class="hint" style="color:var(--stage-muted)">Ajoute une clé fal.ai dans Réglages pour générer.</span>'}`;
  return `<div class="insp-sec"><div class="label">Vidéo IA de l’avatar</div>${body}</div>`;
}
/* =========================================================
   Clips audio libres : aperçu, découpe, menu contextuel, ajout de voix
   ========================================================= */
const clipPlayer = { ctx: null, nodes: [] };
function stopClipAudio() { for (const n of clipPlayer.nodes) { try { n.stop(); } catch { /* rien */ } } clipPlayer.nodes = []; }
function startClipAudio(t0) {
  stopClipAudio();
  if (!ed) return;
  const proj = projForRender(), clips = V.audioClipsOf(proj);
  if (!clips.length) return;
  const ctx = clipPlayer.ctx ||= new AudioContext(); ctx.resume();
  const now = ctx.currentTime + 0.04;
  const spans = clips.filter((c) => c.kind === 'voice').map((c) => [+c.at, +c.at + +c.dur]);
  for (const it of V.timeline(proj).items) { const p = it.scene.props || {}; const vo = p.voice && ed.assets.voices?.[p.voice]; if (vo) { const a = it.start + V.voiceDelayOf(it.scene); spans.push([a, a + vo.duration]); } }
  spans.sort((x, y) => x[0] - y[0]);
  for (const c of clips) {
    const buf = ed.assets.audioClips?.[c.media || `track:${c.track}`]; if (!buf) continue;
    const st = +c.at || 0, en = st + (+c.dur || 0); if (en <= t0 + 0.01) continue;
    const from = Math.max(st, t0), wait = from - t0, offs = (+c.offset || 0) + (from - st), len = Math.min(en - from, buf.duration - offs);
    if (len <= 0.01) continue;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(), vol = clamp(c.volume ?? 1, 0, 1.5), T0 = now + wait;
    const fi = from === st ? Math.min(Math.max(0.005, c.fadeIn || 0.005), len / 2) : 0.01, fo = Math.min(Math.max(0.005, c.fadeOut || 0.005), len / 2);
    g.gain.setValueAtTime(0, T0); g.gain.linearRampToValueAtTime(vol, T0 + fi);
    let last = T0 + fi;
    if (c.kind === 'music' && c.duck !== false) for (const [a, b] of spans) {
      if (b < from || a > en) continue;
      const A0 = Math.max(last + 0.01, now + (a - t0) - 0.3), A1 = Math.max(A0 + 0.01, now + (a - t0)), B0 = Math.max(A1 + 0.01, now + (b - t0)), B1 = B0 + 0.4;
      g.gain.setValueAtTime(vol, A0); g.gain.linearRampToValueAtTime(vol * 0.25, A1); g.gain.setValueAtTime(vol * 0.25, B0); g.gain.linearRampToValueAtTime(vol, B1); last = B1;
    }
    g.gain.setValueAtTime(vol, Math.max(last + 0.005, T0 + len - fo)); g.gain.linearRampToValueAtTime(0, Math.max(last + 0.01, T0 + len));
    src.connect(g); g.connect(ctx.destination); src.start(T0, offs, len + 0.01);
    clipPlayer.nodes.push(src);
  }
}

const XF = 0.03;
/** Coupe un élément audio (ou un clip vidéo) à l'instant t de la vidéo, avec un micro-fondu de chaque côté. */
function splitAudioAt(kind, id, t) {
  if (kind === 'presenter' || kind === 'music') { const nid = convertToClip(kind, id); if (!nid) return; kind = 'aclip'; id = nid; }
  if (kind === 'aclip') {
    const list = P().data.audio || [], c = list.find((x) => x.id === id); if (!c) return;
    const st = +c.at, en = st + +c.dur;
    if (t <= st + 0.1 || t >= en - 0.1) { toast('Place la coupe à l’intérieur du morceau.'); return; }
    beforeChange();
    const right = { ...structuredClone(c), id: uid(), at: Math.round(t * 1000) / 1000, dur: Math.round((en - t) * 1000) / 1000, offset: Math.round(((+c.offset || 0) + (t - st)) * 1000) / 1000, fadeIn: XF };
    c.dur = Math.round((t - st) * 1000) / 1000; c.fadeOut = XF;
    list.splice(list.indexOf(c) + 1, 0, right);
    ed.audioSel = { kind: 'aclip', id: right.id };
    reloadAssets().then(() => { changed({ inspector: true }); renderAudio(); });
    toast('Coupé. Les deux morceaux se déplacent et se règlent séparément.', 'ok');
    return;
  }
  if (kind === 'clip') {
    for (const [i, sc] of scenesOf().entries()) {
      const el = (sc.elements || []).find((x) => x.id === id); if (!el) continue;
      const it = V.timeline(projForRender()).items[i], lt = t - it.start, st0 = +el.start || 0, en0 = el.end == null ? +sc.duration : el.end;
      if (lt <= st0 + 0.1 || lt >= en0 - 0.1) { toast('Place la coupe à l’intérieur du clip.'); return; }
      beforeChange();
      const c = structuredClone(el); c.id = V.newElement('video').id;
      el.end = Math.round(lt * 100) / 100; c.start = el.end; c.trimIn = Math.round(((+el.trimIn || 0) + (lt - st0) * (el.speed || 1)) * 100) / 100;
      c.anim = { ...c.anim, in: 'none', inDelay: 0 }; el.anim = { ...el.anim, out: 'none' };
      sc.elements.push(c); ed.audioSel = { kind: 'clip', id: c.id };
      changed({ film: true, inspector: true }); renderTracks(); renderAudio(); toast('Clip vidéo coupé en deux', 'ok');
      return;
    }
  }
}
/** Transforme la voix d'un présentateur ou la musique globale en clips libres (pour les couper). */
function convertToClip(kind, id) {
  const audio = (P().data.audio ||= []);
  if (kind === 'presenter') {
    const it = V.timeline(projForRender()).items.find((x) => x.scene.id === id); if (!it) return null;
    const p = it.scene.props, vo = ed.assets.voices?.[p.voice]; if (!vo) return null;
    beforeChange();
    const c = { id: uid(), kind: 'voice', media: p.voice, name: `Voix de la scène ${it.index + 1}`, at: Math.round((it.start + V.voiceDelayOf(it.scene)) * 1000) / 1000, dur: Math.round(vo.duration * 1000) / 1000, offset: 0, volume: p.voiceVol ?? 1, fadeIn: 0.01, fadeOut: 0.05 };
    audio.push(c); p.voice = ''; delete p.voiceDelay; delete p.voiceVol;
    return c.id;
  }
  const m = P().data.music; if (!m) return null;
  beforeChange();
  const ms = V.musicSettings(projForRender(), V.timeline(projForRender()).total);
  const c = { id: uid(), kind: 'music', ...(m.kind === 'library' ? { track: m.track } : { media: m.media }), name: musicLabel(), at: ms.at, dur: Math.round((ms.end - ms.at) * 1000) / 1000, offset: ms.offset, volume: ms.volume, fadeIn: ms.fadeIn, fadeOut: ms.fadeOut, duck: ms.duck };
  audio.push(c); delete P().data.music;
  return c.id;
}
function deleteAudioItem(kind, id) {
  beforeChange();
  if (kind === 'aclip') P().data.audio = (P().data.audio || []).filter((c) => c.id !== id);
  else if (kind === 'presenter') { const sc = scenesOf().find((x) => x.id === id); if (sc) { sc.props.voice = ''; sc.props.video = ''; } }
  else if (kind === 'music') delete P().data.music;
  else if (kind === 'sfx') { const el = V.allElements(projForRender()).find((x) => x.el.id === id)?.el; if (el) el.anim.sfx = ''; }
  else if (kind === 'clip') for (const sc of scenesOf()) sc.elements = (sc.elements || []).filter((x) => x.id !== id);
  ed.audioSel = null;
  reloadAssets().then(() => { refreshMusicChip(); changed({ film: true, inspector: true }); renderAudio(); renderTracks(); });
}
function contextMenu(x, y, items) {
  closeContextMenu();
  const m = document.createElement('div'); m.className = 'ctx-menu'; m.id = 'ctxMenu';
  m.innerHTML = items.map((it, i) => (it === '-' ? '<hr>' : `<button data-i="${i}" ${it.danger ? 'class="danger"' : ''}>${it.icon ? ic(it.icon) : '<i></i>'}<span>${esc(it.label)}</span>${it.key ? `<kbd>${it.key}</kbd>` : ''}</button>`)).join('');
  document.body.append(m);
  const r = m.getBoundingClientRect();
  m.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`; m.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
  m.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; closeContextMenu(); items[+b.dataset.i].run(); });
  setTimeout(() => addEventListener('pointerdown', closeOnOutside, true), 0);
}
function closeOnOutside(e) { if (!e.target.closest('#ctxMenu')) closeContextMenu(); }
function closeContextMenu() { $('#ctxMenu')?.remove(); removeEventListener('pointerdown', closeOnOutside, true); }
function audioMenu(e, kind, id, t) {
  const tt = Math.round(t * 100) / 100;
  const cut = { icon: 'scissors', label: `Couper ici (${fmtTime(tt)})`, key: 'Ctrl+B', run: () => splitAudioAt(kind === 'voice' ? 'presenter' : kind, id, tt) };
  const listenHere = { icon: 'play', label: 'Écouter à partir d’ici', run: () => { setPlaying(false); seek(Math.max(0, tt - 0.3)); setPlaying(true); } };
  const del = { icon: 'trash', label: 'Supprimer', danger: true, run: () => deleteAudioItem(kind === 'voice' ? 'presenter' : kind, id) };
  let items = null;
  if (kind === 'aclip') {
    const c = (P().data.audio || []).find((x) => x.id === id); if (!c) return;
    items = [cut, listenHere, '-',
      { icon: 'copy', label: 'Dupliquer à la suite', run: () => { beforeChange(); const d = { ...structuredClone(c), id: uid(), at: Math.round((+c.at + +c.dur) * 1000) / 1000 }; P().data.audio.push(d); ed.audioSel = { kind: 'aclip', id: d.id }; changed({}); renderAudio(); } },
      { icon: 'speaker', label: (c.fadeIn || 0) > 0.1 ? 'Retirer le fondu d’entrée' : 'Fondu d’entrée (0,5 s)', run: () => { beforeChange(); c.fadeIn = (c.fadeIn || 0) > 0.1 ? XF : 0.5; changed({}); renderAudio(); } },
      { icon: 'speaker', label: (c.fadeOut || 0) > 0.1 ? 'Retirer le fondu de sortie' : 'Fondu de sortie (0,8 s)', run: () => { beforeChange(); c.fadeOut = (c.fadeOut || 0) > 0.1 ? XF : 0.8; changed({}); renderAudio(); } },
      { icon: 'start', label: 'Caler le début sur la tête de lecture', run: () => { beforeChange(); c.at = Math.round(ed.time * 100) / 100; changed({}); renderAudio(); } },
      '-', del];
  } else if (kind === 'voice') items = [cut, listenHere, '-', { icon: 'layers', label: 'Détacher en voix libre', run: () => { if (convertToClip('presenter', id)) reloadAssets().then(() => { changed({ inspector: true }); renderAudio(); toast('La voix est maintenant un clip libre de la timeline', 'ok'); }); } }, '-', del];
  else if (kind === 'music') items = [cut, listenHere, '-', { icon: 'layers', label: 'Transformer en morceau libre', run: () => { if (convertToClip('music')) reloadAssets().then(() => { refreshMusicChip(); changed({ inspector: true }); renderAudio(); }); } }, '-', del];
  else if (kind === 'clip') {
    const el = V.allElements(projForRender()).find((x) => x.el.id === id)?.el; if (!el) return;
    items = [cut, listenHere, '-', { icon: 'speaker', label: el.muted ? 'Rétablir le son du clip' : 'Couper le son du clip', run: () => { beforeChange(); el.muted = !el.muted; reloadAssets(); changed({ inspector: true }); renderAudio(); } }, '-', { ...del, label: 'Supprimer le clip vidéo' }];
  } else if (kind === 'sfx') items = [{ icon: 'play', label: 'Écouter', run: () => { const el = V.allElements(projForRender()).find((x) => x.el.id === id)?.el; if (el?.anim?.sfx) renderSfx(el.anim.sfx).then((b) => playBuffer(b, el.anim.sfxVol ?? 0.7)); } }, '-', { ...del, label: 'Retirer le bruitage' }];
  if (items) contextMenu(e.clientX, e.clientY, items);
}

/* Ajouter une voix libre (sans présentateur) */
function addVoiceDialog() {
  const at = Math.round(ed.time * 100) / 100;
  let busy = false;
  openModal(`<div class="dlg"><div class="dlg-head"><div><h2>Ajouter une voix off</h2><p>Elle sera posée sur la timeline audio à ${fmtTime(at)}, à la tête de lecture. Tu pourras ensuite la déplacer, la couper et la régler.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="segmented" id="vSrc"><button data-src="free" aria-pressed="true">${ic('text')}Depuis un texte (gratuit)</button><button data-src="rec" aria-pressed="false">${ic('mic')}Enregistrer</button><button data-src="file" aria-pressed="false">${ic('upload')}Importer</button></div>
    <div style="display:grid;gap:12px">
      <label class="field"><span>Texte à dire</span><textarea dir="auto" id="vText" rows="4" placeholder="Bonjour ! Découvrez aujourd’hui…"></textarea></label>
      <div class="segmented" id="vLang">${Object.entries(FREE_LANGS).map(([k, l], i) => `<button data-lang="${k}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>
      <p class="hint" id="vLangHint" style="display:none"></p>
      <div class="grid-2"><label class="field"><span>Voix</span><select id="vVoice">${FREE_VOICES.filter((fv) => fv.lang === 'fr').map((fv) => `<option value="${fv.key}">${esc(fv.label)}</option>`).join('')}</select></label>
        <label class="field"><span>Vitesse</span><select id="vSpeed">${[0.85, 0.95, 1, 1.1, 1.2].map((x) => `<option value="${x}" ${x === 1 ? 'selected' : ''}>×${String(x).replace('.', ',')}</option>`).join('')}</select></label></div>
      <label class="switch"><input type="checkbox" id="vSubs" checked>Créer les sous-titres synchronisés (éléments globaux, modifiables)</label>
      <p class="hint" id="vStatus">Calculée sur ton ordinateur, gratuite et illimitée. Le premier usage télécharge la voix une fois.</p>
    </div>
    <p class="form-error" id="vErr"></p>
    <div class="dlg-foot"><button class="btn" data-close>Annuler</button><button class="btn primary" id="vGo">${ic('play')}Générer et ajouter</button></div></div>`, {
    size: 'mid',
    onMount: (m) => {
      const go = $('#vGo', m);
      $('#vLang', m).addEventListener('click', (e) => {
        const b = e.target.closest('[data-lang]'); if (!b) return;
        $$('#vLang button', m).forEach((x) => x.setAttribute('aria-pressed', x === b));
        $('#vVoice', m).innerHTML = FREE_VOICES.filter((fv) => fv.lang === b.dataset.lang).map((fv) => `<option value="${fv.key}">${esc(fv.label)}</option>`).join('');
        const hint = $('#vLangHint', m); hint.textContent = LANG_HINT[b.dataset.lang] || ''; hint.style.display = LANG_HINT[b.dataset.lang] ? '' : 'none'; hint.style.color = b.dataset.lang === 'ar' ? '#B87900' : '';
        $('#vText', m).placeholder = b.dataset.lang === 'ar' ? 'مرحبًا! اكتشفوا اليوم عرضنا الجديد…' : b.dataset.lang === 'en' ? 'Hello! Discover our new offer today…' : 'Bonjour ! Découvrez aujourd’hui…';
      });
      $('#vSrc', m).addEventListener('click', async (e) => {
        const b = e.target.closest('[data-src]'); if (!b || busy || b.dataset.src === 'free') return;
        if (b.dataset.src === 'rec') { closeModal(); const wav = await recordDialog(''); if (wav) await addVoiceClip(wav, 'Voix enregistrée', at); }
        else { const f = await pickAudioFile(); if (!f) return; closeModal(); try { toast('Préparation de l’audio…'); await addVoiceClip(await toWav(f), f.name.replace(/\.[a-z0-9]+$/i, ''), at); } catch { toast('Fichier audio illisible.', 'error'); } }
      });
      go.addEventListener('click', async () => {
        const text = $('#vText', m).value.trim(); if (!text) { $('#vErr', m).textContent = 'Écris le texte à faire dire.'; return; }
        busy = true; go.disabled = true; go.innerHTML = '<span class="spinner"></span>Génération…';
        const key = $('#vVoice', m).value, subs = $('#vSubs', m).checked;
        try {
          const blob = await freeTts(text, key, +$('#vSpeed', m).value, (p) => { const st = $('#vStatus'); if (st) st.textContent = p.phase === 'download' ? `Téléchargement de la voix, ${Math.round(p.ratio * 100)} % (une seule fois)…` : 'Synthèse de la voix…'; });
          const fv = FREE_VOICES.find((x) => x.key === key);
          closeModal();
          await addVoiceClip(await toWav(blob), `Voix ${fv?.label.split(',')[0] || ''}`.trim(), at, subs ? text : '');
          if (fv?.warn) toast('Voix Kareem : licence non précisée, à éviter pour un usage commercial.');
        } catch (err) { console.error(err); busy = false; go.disabled = false; go.innerHTML = `${ic('play')}Générer et ajouter`; $('#vErr', m).textContent = 'La voix n’a pas pu être générée. Vérifie ta connexion au premier usage.'; }
      });
    },
  });
}
async function addVoiceClip(wav, name, at, subtitleText = '') {
  try {
    const media = await uploadMedia(wav, 'audio', name);
    const ac = new AudioContext(); const buf = await ac.decodeAudioData(await wav.arrayBuffer()); ac.close();
    if (!ed) return;
    beforeChange();
    const total = V.timeline(projForRender()).total;
    const c = { id: uid(), kind: 'voice', media, name, at: Math.min(at, Math.max(0, total - 0.5)), dur: Math.round(buf.duration * 1000) / 1000, offset: 0, volume: 1, fadeIn: 0.01, fadeOut: 0.05 };
    if (subtitleText) c.text = subtitleText;
    (P().data.audio ||= []).push(c);
    ed.audioSel = { kind: 'aclip', id: c.id };
    if (!ed.showAudio) { ed.showAudio = true; $('#atl').hidden = false; $('#audioBtn')?.classList.add('on'); fitCanvas(); }
    await reloadAssets();
    if (subtitleText) {
      const env = ed.assets.clipEnv?.[media];
      const sentences = subtitleText.match(/[^.!?…؟]+[.!?…؟]*/g)?.map((x) => x.trim()).filter(Boolean) || [subtitleText];
      const times = env ? V.estimateTimes(env, sentences.map((x) => x.length + 4)) : sentences.map((_, i) => (i * buf.duration) / sentences.length);
      sentences.forEach((txt, i) => {
        const st = c.at + times[i], en = i < sentences.length - 1 ? c.at + times[i + 1] - 0.05 : c.at + c.dur + 0.2;
        (P().data.globals ||= []).push(V.newElement('text', { text: txt, font: 'texte', weight: 700, size: 46, w: 0.8, y: 0.88, bg: '#111111', color: 'auto', start: Math.round(st * 100) / 100, end: Math.round(en * 100) / 100, anim: { ...V.newElement('text').anim, in: 'fade', inDur: 0.2, out: 'fade', outDur: 0.15 } }));
      });
    }
    if (c.at + c.dur > total) toast('La voix dépasse la fin de la vidéo : allonge la dernière scène pour l’entendre en entier.');
    changed({ inspector: true }); renderAudio();
    toast(subtitleText ? 'Voix off ajoutée avec ses sous-titres' : 'Voix off ajoutée', 'ok');
  } catch (e) { console.error(e); toast(e.message || 'Ajout de la voix impossible.', 'error'); }
}

/* =========================================================
   Timeline audio : voix, musique, bruitages, son des clips

   ========================================================= */
const peaksCache = new WeakMap();
function peaksOf(buf, n = 600) {
  let c = peaksCache.get(buf); if (c && c.length === n) return c;
  const d = buf.getChannelData(0), step = Math.max(1, Math.floor(d.length / n)), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step, e = Math.min(d.length, (i + 1) * step); j < e; j += 4) { const v = Math.abs(d[j]); if (v > m) m = v; } out[i] = m; }
  let mx = 0; for (const v of out) mx = Math.max(mx, v); if (mx > 0) for (let i = 0; i < n; i++) out[i] /= mx;
  peaksCache.set(buf, out); return out;
}
function drawWave(canvas, values, color) {
  if (!canvas || !values?.length) return;
  const w = Math.max(10, canvas.clientWidth), h = Math.max(10, canvas.clientHeight);
  canvas.width = Math.round(w * 2); canvas.height = Math.round(h * 2);
  const x = canvas.getContext('2d'); x.scale(2, 2); x.fillStyle = color;
  for (let i = 0; i < w; i++) { const v = values[Math.floor((i / w) * values.length)] || 0; const bh = Math.max(1, v * (h - 4)); x.fillRect(i, (h - bh) / 2, 1, bh); }
}
function audioItems() {
  const proj = projForRender(), { items, total } = V.timeline(proj);
  const out = { total, scenes: items, voices: [], sfx: [], clips: [], music: null };
  items.forEach((it) => {
    const p = it.scene.props || {};
    if (it.scene.type === 'presentateur' && p.voice) {
      const vo = ed.assets.voices?.[p.voice];
      const vd = V.voiceDelayOf(it.scene);
      out.voices.push({ id: it.scene.id, idx: it.index, at: it.start + vd, dur: vo?.duration || 3, vo, vol: p.voiceVol ?? 1, sceneStart: it.start, sceneEnd: it.end });
    }
  });
  for (const { el, offset, d, item, global } of V.allElements(proj)) {
    if (el.hidden) continue;
    if (el.anim?.sfx) out.sfx.push({ id: el.id, global, idx: item?.index, at: offset + (+el.start || 0) + (+el.anim.inDelay || 0) + (+el.anim.sfxOffset || 0), base: offset + (+el.start || 0) + (+el.anim.inDelay || 0), name: SFX[el.anim.sfx]?.name || el.anim.sfx, el });
    if (el.type === 'video') { const st = offset + (+el.start || 0), en = offset + (el.end == null ? d : Math.min(d, el.end)); out.clips.push({ id: el.id, global, idx: item?.index, at: st, dur: en - st, el }); }
  }
  if (proj.music) { const ms = V.musicSettings(proj, total); out.music = { ...ms, name: musicLabel() }; }
  out.aclips = V.audioClipsOf(proj).map((c) => ({ ...c, at: +c.at || 0, dur: +c.dur || 0, buf: ed.assets.audioClips?.[c.media || `track:${c.track}`] }));
  return out;
}
function renderAudio() {
  const box = $('#atl'); if (!box || !ed || box.hidden) return;
  const A = audioItems(), T = A.total || 1, z = ed.audioZoom || 1;
  const pc = (t) => `${(t / T) * 100}%`;
  const ticks = []; const stepT = T / z > 40 ? 5 : T / z > 15 ? 2 : 1; for (let t = 0; t <= T + 1e-6; t += stepT) ticks.push(t);
  const sel = ed.audioSel;
  const isSel = (k, id) => sel && sel.kind === k && (sel.id || '') === (id || '');
  box.innerHTML = `<div class="atl-top"><span class="atl-title">${ic('speaker')}Timeline audio</span>
      <span class="hint">Glisse les blocs pour caler le son sur l’image. Clique un bloc pour le régler.</span><span class="spacer"></span>
      <button class="icon-btn" data-atl="zoomOut" aria-label="Dézoomer" title="Dézoomer">−</button><span class="atl-zoom">${Math.round(z * 100)} %</span><button class="icon-btn" data-atl="zoomIn" aria-label="Zoomer" title="Zoomer">+</button></div>
    <div class="atl-body"><div class="atl-labels"><span></span>
        <span>Scènes</span><span>${ic('speaker')}Voix</span><span>${ic('musicnav')}Musique</span><span>${ic('spark')}Bruitages</span><span>${ic('video')}Clips</span></div>
      <div class="atl-scroll" id="atlScroll"><div class="atl-inner" id="atlInner" style="width:${z * 100}%">
        <div class="atl-ruler" data-atl-ruler>${ticks.map((t) => `<i style="left:${pc(t)}">${Math.round(t)} s</i>`).join('')}</div>
        <div class="atl-lane scenes">${A.scenes.map((it) => `<div class="atl-scene ${it.index === ed.sel ? 'on' : ''}" data-atl-scene="${it.index}" style="left:${pc(it.start)};width:${pc(it.end - it.start)}">${it.index + 1}. ${esc(SCENES[it.scene.type]?.label || '')}</div>`).join('')}</div>
        <div class="atl-lane">${A.voices.map((v) => `<div class="atl-blk voice ${isSel('voice', v.id) ? 'sel' : ''}" data-atl-kind="voice" data-atl-id="${v.id}" style="left:${pc(v.at)};width:${pc(v.dur)}"><canvas data-wave="voice" data-id="${v.id}"></canvas><span>Présentateur ${v.idx + 1}${v.vol !== 1 ? `, ${Math.round(v.vol * 100)} %` : ''}</span></div>`).join('')}
          ${A.aclips.filter((c) => c.kind === 'voice').map((c) => aclipBlock(c, pc, isSel)).join('')}
          ${A.voices.length || A.aclips.some((c) => c.kind === 'voice') ? '' : '<span class="atl-empty">Pas encore de voix.</span>'}
          <button class="atl-plus" data-atl="addVoice" title="Ajouter une voix off à la tête de lecture">${ic('plus')}Voix</button></div>
        <div class="atl-lane">${A.aclips.filter((c) => c.kind === 'music').map((c) => aclipBlock(c, pc, isSel)).join('')}${A.music ? `<div class="atl-blk music ${isSel('music') ? 'sel' : ''}" data-atl-kind="music" style="left:${pc(A.music.at)};width:${pc(A.music.end - A.music.at)}"><span class="g l" data-atl-grip="l"></span><canvas data-wave="music"></canvas><span>${esc(A.music.name)}, ${Math.round(A.music.volume * 100)} %</span><i class="fade in" style="width:${pc(A.music.fadeIn * T / (A.music.end - A.music.at))}"></i><i class="fade out" style="width:${pc(A.music.fadeOut * T / (A.music.end - A.music.at))}"></i><span class="g r" data-atl-grip="r"></span></div>`
          : A.aclips.some((c) => c.kind === 'music') ? '' : '<button class="atl-empty atl-add" data-ed="music">+ Ajouter une musique</button>'}</div>
        <div class="atl-lane">${A.sfx.map((x) => `<div class="atl-sfx ${isSel('sfx', x.id) ? 'sel' : ''}" data-atl-kind="sfx" data-atl-id="${x.id}" style="left:${pc(x.at)}" title="${esc(x.name)}"><b></b><span>${esc(x.name)}</span></div>`).join('') || '<span class="atl-empty">Pas de bruitage. Onglet Vidéo : « Ajouter les bruitages automatiquement ».</span>'}</div>
        <div class="atl-lane">${A.clips.map((c) => `<div class="atl-blk clip ${c.el.muted ? 'muted' : ''} ${isSel('clip', c.id) ? 'sel' : ''}" data-atl-kind="clip" data-atl-id="${c.id}" style="left:${pc(c.at)};width:${pc(c.dur)}"><span>${c.el.muted ? 'Son coupé' : `Son du clip, ${Math.round((c.el.volume ?? 1) * 100)} %`}</span></div>`).join('') || '<span class="atl-empty">Pas de clip vidéo.</span>'}</div>
        <b class="atl-ph" id="atlPh"></b>
      </div></div></div>
    <div class="atl-props" id="atlProps">${audioProps(A)}</div>`;
  $$('#atl canvas[data-wave="aclip"]').forEach((c) => {
    const a = A.aclips.find((x) => x.id === c.dataset.id); if (!a?.buf) return;
    const pk = peaksOf(a.buf, 1200), from = Math.floor((a.offset / a.buf.duration) * pk.length), to = Math.ceil(((a.offset + a.dur) / a.buf.duration) * pk.length);
    drawWave(c, pk.subarray(Math.max(0, from), Math.min(pk.length, Math.max(from + 1, to))), 'rgba(255,255,255,.6)');
  });
  $$('#atl canvas[data-wave]').forEach((c) => {
    if (c.dataset.wave === 'music' && ed.assets.music?.buffer) drawWave(c, peaksOf(ed.assets.music.buffer), 'rgba(255,255,255,.55)');
    if (c.dataset.wave === 'voice') { const v = A.voices.find((x) => x.id === c.dataset.id); if (v?.vo) drawWave(c, v.vo.env, 'rgba(255,255,255,.6)'); }
  });
  const sc = $('#atlScroll'); if (sc && ed.audioScroll) sc.scrollLeft = ed.audioScroll;
  updateAudioPlayhead();
}
function aclipBlock(c, pc, isSel) {
  const fi = ((c.fadeIn || 0) / Math.max(0.01, c.dur)) * 100, fo = ((c.fadeOut || 0) / Math.max(0.01, c.dur)) * 100;
  return `<div class="atl-blk ${c.kind === 'music' ? 'music' : 'voice free'} ${isSel('aclip', c.id) ? 'sel' : ''}" data-atl-kind="aclip" data-atl-id="${c.id}" style="left:${pc(c.at)};width:${pc(c.dur)}">
    <span class="g l" data-atl-grip="l"></span><canvas data-wave="aclip" data-id="${c.id}"></canvas><span>${esc(c.name || (c.kind === 'music' ? 'Musique' : 'Voix'))}${(c.volume ?? 1) !== 1 ? `, ${Math.round(c.volume * 100)} %` : ''}</span>
    ${fi > 2 ? `<i class="fade in" style="width:${fi}%"></i>` : ''}${fo > 2 ? `<i class="fade out" style="width:${fo}%"></i>` : ''}<span class="g r" data-atl-grip="r"></span></div>`;
}
function audioProps(A) {
  const s = ed.audioSel; if (!s) return '<span class="hint">Clique un bloc pour le régler, clic droit pour le couper, le dupliquer ou le supprimer. Ctrl+B coupe à la tête de lecture.</span>';
  if (s.kind === 'aclip') {
    const c = A.aclips.find((x) => x.id === s.id); if (!c) return '';
    const R = (k, label, v, min, max, step, fmt) => `<label class="atl-f"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-atlk="${k}"><output data-atlo="${k}">${fmt(v)}</output></label>`;
    const p2 = (v) => `${Math.round(v * 100)} %`, s2 = (v) => `${(+v).toFixed(2).replace('.', ',')} s`;
    return `<b>${esc(c.name || '')}</b>${R('aVol', 'Volume', c.volume ?? 1, 0, 1.5, 0.05, p2)}${R('aFadeIn', 'Fondu d’entrée', c.fadeIn || 0, 0, Math.max(0.05, Math.min(5, c.dur / 2)), 0.05, s2)}${R('aFadeOut', 'Fondu de sortie', c.fadeOut || 0, 0, Math.max(0.05, Math.min(6, c.dur / 2)), 0.05, s2)}
      ${c.kind === 'music' ? `<label class="switch"><input type="checkbox" data-atlk="aDuck" ${c.duck !== false ? 'checked' : ''}>Baisser pendant les voix</label>` : ''}
      <button class="btn ghost" data-atl="cut">${ic('scissors')}Couper à la tête de lecture</button><button class="btn ghost danger" data-atl="aDel">${ic('trash')}Supprimer</button>`;
  }

  const R = (k, label, v, min, max, step, fmt) => `<label class="atl-f"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-atlk="${k}"><output data-atlo="${k}">${fmt(v)}</output></label>`;
  const pct2 = (v) => `${Math.round(v * 100)} %`, s2 = (v) => `${(+v).toFixed(2).replace('.', ',')} s`;
  if (s.kind === 'voice') {
    const v = A.voices.find((x) => x.id === s.id); if (!v) return '';
    const maxD = Math.max(0, (v.sceneEnd - v.sceneStart) - v.dur);
    return `<b>Voix de la scène ${v.idx + 1}</b>${R('voiceVol', 'Volume', v.vol, 0, 1.5, 0.05, pct2)}${R('voiceDelay', 'Départ dans la scène', v.at - v.sceneStart, 0, Math.max(0.1, maxD), 0.05, s2)}
      <button class="btn ghost" data-atl="fitScene">Ajuster la scène à la voix</button><button class="btn ghost" data-atl="listen">${ic('play')}Écouter</button>`;
  }
  if (s.kind === 'music') {
    const m = A.music; if (!m) return '';
    const mu = P().data.music, srcDur = mu?.kind === 'upload' ? (state.music.find((x) => x.media === mu.media)?.duration || 0) : 0;
    return `<b>Musique</b>${R('mVolume', 'Volume', m.volume, 0.05, 1, 0.05, pct2)}${R('mAt', 'Début dans la vidéo', m.at, 0, Math.max(0.1, A.total - 1), 0.1, s2)}${R('mEnd', 'Fin dans la vidéo', m.end, m.at + 0.5, A.total, 0.1, s2)}
      ${R('mFadeIn', 'Fondu d’entrée', m.fadeIn, 0, 5, 0.1, s2)}${R('mFadeOut', 'Fondu de sortie', m.fadeOut, 0, 6, 0.1, s2)}
      ${srcDur > 5 ? R('mOffset', 'Départ dans le morceau', m.offset, 0, Math.floor(srcDur - 3), 0.5, s2) : ''}
      <label class="switch"><input type="checkbox" data-atlk="mDuck" ${m.duck ? 'checked' : ''}>Baisser pendant les voix</label>`;
  }
  if (s.kind === 'sfx') {
    const x = A.sfx.find((y) => y.id === s.id); if (!x) return '';
    return `<b>Bruitage</b><label class="atl-f"><span>Son</span><select data-atlk="sfxType">${Object.entries(SFX).map(([k, v]) => `<option value="${k}" ${x.el.anim.sfx === k ? 'selected' : ''}>${esc(v.cat)} : ${esc(v.name)}</option>`).join('')}</select></label>
      ${R('sfxVol', 'Volume', x.el.anim.sfxVol ?? 0.7, 0, 1, 0.05, pct2)}${R('sfxOffset', 'Décalage / apparition', x.el.anim.sfxOffset || 0, -1.5, 2, 0.05, (v) => `${v > 0 ? '+' : ''}${(+v).toFixed(2).replace('.', ',')} s`)}
      <button class="btn ghost" data-atl="listen">${ic('play')}Écouter</button><button class="btn ghost danger" data-atl="sfxDel">${ic('trash')}Retirer</button>`;
  }
  if (s.kind === 'clip') {
    const c = A.clips.find((y) => y.id === s.id); if (!c) return '';
    return `<b>Son du clip vidéo</b>${R('clipVol', 'Volume', c.el.volume ?? 1, 0, 1, 0.05, pct2)}<label class="switch"><input type="checkbox" data-atlk="clipMute" ${c.el.muted ? 'checked' : ''}>Couper le son</label>`;
  }
  return '';
}
function audioTarget() {
  const s = ed.audioSel; if (!s) return null;
  if (s.kind === 'voice') return scenesOf().find((x) => x.id === s.id);
  if (s.kind === 'aclip') return (P().data.audio || []).find((x) => x.id === s.id);
  if (s.kind === 'sfx' || s.kind === 'clip') return V.allElements(projForRender()).find((x) => x.el.id === s.id)?.el;
  return P().data.music;
}
function updateAudioPlayhead() {
  const ph = $('#atlPh'); if (!ph || !ed) return;
  const T = V.timeline(projForRender()).total || 1;
  ph.style.left = `${(ed.time / T) * 100}%`;
}
function bindAudio() {
  const box = $('#atl'); if (!box) return;
  let drag = null;
  const secPerPx = () => { const inner = $('#atlInner'); return (V.timeline(projForRender()).total || 1) / (inner?.clientWidth || 1); };
  box.addEventListener('scroll', () => {}, true);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-atl]'); if (!b) return;
    const k = b.dataset.atl;
    if (k === 'zoomIn' || k === 'zoomOut') { ed.audioZoom = clamp((ed.audioZoom || 1) * (k === 'zoomIn' ? 1.5 : 1 / 1.5), 1, 12); renderAudio(); return; }
    const t = audioTarget(); const A = audioItems();
    if (k === 'listen') {
      if (ed.audioSel.kind === 'sfx' && t?.anim?.sfx) renderSfx(t.anim.sfx).then((buf) => playBuffer(buf, t.anim.sfxVol ?? 0.7));
      if (ed.audioSel.kind === 'voice') { const v = A.voices.find((x) => x.id === ed.audioSel.id); if (v) { setPlaying(false); seek(v.at - 0.2); setPlaying(true); } }
    }
    if (k === 'addVoice') { addVoiceDialog(); return; }
    if (k === 'cut' && ed.audioSel) { splitAudioAt(ed.audioSel.kind === 'voice' ? 'presenter' : ed.audioSel.kind, ed.audioSel.id, ed.time); return; }
    if (k === 'aDel' && ed.audioSel) { deleteAudioItem('aclip', ed.audioSel.id); return; }
    if (k === 'sfxDel' && t) { beforeChange(); t.anim.sfx = ''; ed.audioSel = null; changed({ film: true, inspector: true }); }
    if (k === 'fitScene' && t) { const v = A.voices.find((x) => x.id === t.id); if (v) { beforeChange(); t.duration = clamp(Math.ceil((v.at - v.sceneStart + v.dur + 0.8) * 2) / 2, 2, 60); changed({ film: true, inspector: true, scrub: true }); } }
  });
  box.addEventListener('pointerdown', (e) => {
    const ruler = e.target.closest('[data-atl-ruler]');
    if (ruler) { const r = $('#atlInner').getBoundingClientRect(); setPlaying(false); seek(clamp((e.clientX - r.left) / r.width, 0, 1) * V.timeline(projForRender()).total); return; }
    const sc = e.target.closest('[data-atl-scene]');
    if (sc) { selectScene(+sc.dataset.atlScene, true); renderAudio(); return; }
    const blk = e.target.closest('[data-atl-kind]'); if (!blk) return;
    ed.audioSel = { kind: blk.dataset.atlKind, id: blk.dataset.atlId || '' };
    const t = audioTarget(); if (!t) return;
    renderAudio();
    if (e.button === 2) return;
    if (ed.audioSel.kind === 'clip') return;
    beforeChange();
    const A = audioItems(), grip = e.target.dataset.atlGrip || 'move';
    drag = { kind: ed.audioSel.kind, id: ed.audioSel.id, grip, x0: e.clientX, spp: secPerPx(), t, A,
      v0: ed.audioSel.kind === 'voice' ? V.voiceDelayOf(t) : ed.audioSel.kind === 'sfx' ? (+t.anim.sfxOffset || 0) : null,
      m0: A.music ? { ...A.music } : null, c0: ed.audioSel.kind === 'aclip' ? { ...t } : null };
    box.setPointerCapture(e.pointerId); e.preventDefault();
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dt = (e.clientX - drag.x0) * drag.spp, snap = (v) => Math.round(v * 20) / 20;
    if (drag.kind === 'voice') {
      const v = drag.A.voices.find((x) => x.id === drag.id), maxD = Math.max(0, (v.sceneEnd - v.sceneStart) - v.dur);
      drag.t.props.voiceDelay = clamp(snap(drag.v0 + dt), 0, Math.max(0, maxD));
    } else if (drag.kind === 'sfx') {
      drag.t.anim.sfxOffset = clamp(snap(drag.v0 + dt), -1.5, 2);
    } else if (drag.kind === 'aclip') {
      const c = drag.t, c0 = drag.c0, T = drag.A.total, ph = ed.time;
      const sn = (v) => (Math.abs(v - ph) < 0.12 ? ph : snap(v));
      const buf = ed.assets.audioClips?.[c.media || `track:${c.track}`], srcLen = buf ? buf.duration : 1e9;
      if (drag.grip === 'l') { const nAt = clamp(sn(c0.at + dt), Math.max(0, c0.at - c0.offset), c0.at + c0.dur - 0.1); c.offset = Math.round((c0.offset + (nAt - c0.at)) * 1000) / 1000; c.dur = Math.round((c0.dur - (nAt - c0.at)) * 1000) / 1000; c.at = Math.round(nAt * 1000) / 1000; }
      else if (drag.grip === 'r') { const nEnd = clamp(sn(c0.at + c0.dur + dt), c0.at + 0.1, Math.min(T + 30, c0.at + (srcLen - c0.offset))); c.dur = Math.round((nEnd - c0.at) * 1000) / 1000; }
      else c.at = Math.round(clamp(sn(c0.at + dt), 0, Math.max(0, T - 0.1)) * 1000) / 1000;
    } else if (drag.kind === 'music') {
      const m = P().data.music, T = drag.A.total, m0 = drag.m0;
      if (drag.grip === 'l') m.at = clamp(snap(m0.at + dt), 0, m0.end - 0.5);
      else if (drag.grip === 'r') { const en = clamp(snap(m0.end + dt), m0.at + 0.5, T); m.end = en >= T - 0.05 ? null : en; }
      else { const len = m0.end - m0.at; const at = clamp(snap(m0.at + dt), 0, T - len); m.at = at; m.end = at + len >= T - 0.05 ? null : at + len; }
    }
    ed.dirty = true; renderAudio();
  });
  const end = () => { if (!drag) return; const k = drag.kind; drag = null; changed({ inspector: false }); if (k === 'voice') renderTracks(); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('input', (e) => {
    const el = e.target, k = el.dataset.atlk; if (!k) return;
    const t = audioTarget(); if (!t) return;
    const v = el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? el.value : +el.value;
    beforeChange();
    const m = P().data.music;
    switch (k) {
      case 'voiceVol': t.props.voiceVol = v; break;
      case 'voiceDelay': t.props.voiceDelay = v; break;
      case 'mVolume': m.volume = v; break;
      case 'mAt': m.at = v; if (m.end != null && m.end < v + 0.5) m.end = v + 0.5; break;
      case 'mEnd': m.end = v >= V.timeline(projForRender()).total - 0.05 ? null : v; break;
      case 'mFadeIn': m.fadeIn = v; break;
      case 'mFadeOut': m.fadeOut = v; break;
      case 'mOffset': m.offset = v; break;
      case 'mDuck': m.duck = v; break;
      case 'sfxType': t.anim.sfx = v; reloadAssets().then(() => renderSfx(v).then((buf) => playBuffer(buf, t.anim.sfxVol ?? 0.7))); break;
      case 'sfxVol': t.anim.sfxVol = v; break;
      case 'sfxOffset': t.anim.sfxOffset = v; break;
      case 'clipVol': t.volume = v; break;
      case 'clipMute': t.muted = v; break;
      case 'aVol': t.volume = v; break;
      case 'aFadeIn': t.fadeIn = v; break;
      case 'aFadeOut': t.fadeOut = v; break;
      case 'aDuck': t.duck = v; break;
      default: break;
    }
    const o = $(`[data-atlo="${k}"]`);
    if (o) o.textContent = /Vol|Volume/.test(k) ? `${Math.round(v * 100)} %` : k === 'sfxOffset' ? `${v > 0 ? '+' : ''}${(+v).toFixed(2).replace('.', ',')} s` : `${(+v).toFixed(2).replace('.', ',')} s`;
    if (k === 'mOffset') reloadAssets();
    ed.dirty = true; setStatus('saving'); ed.save();
    if (el.type !== 'range') renderAudio(); else clearTimeout(ed.atlT), (ed.atlT = setTimeout(renderAudio, 350));
  });
  box.addEventListener('scroll', (e) => { if (e.target.id === 'atlScroll') ed.audioScroll = e.target.scrollLeft; }, true);
  box.addEventListener('contextmenu', (e) => {
    const blk = e.target.closest('[data-atl-kind]'); if (!blk) return;
    e.preventDefault();
    const r = $('#atlInner').getBoundingClientRect(), T = V.timeline(projForRender()).total || 1;
    let t = clamp((e.clientX - r.left) / r.width, 0, 1) * T;
    if (Math.abs(t - ed.time) < 0.15) t = ed.time;
    ed.audioSel = { kind: blk.dataset.atlKind, id: blk.dataset.atlId || '' }; renderAudio();
    audioMenu(e, blk.dataset.atlKind, blk.dataset.atlId || '', t);
  });
}

/* =========================================================
   Éléments libres : sélection, propriétés, ajout, pistes
   ========================================================= */
const EL_ICON = { text: 'text', logo: 'logo', image: 'image', video: 'video', shape: 'shape', avatar: 'avatars' };
const elList = (scope) => { if (scope === 'global') return (P().data.globals ||= []); const sc = curScene(); return sc ? (sc.elements ||= []) : []; };
function selElement() { if (!ed?.selEl || !curScene()) return null; return elList(ed.selEl.scope).find((e) => e.id === ed.selEl.id) || null; }
function selectEl(scope, id) {
  ed.selEl = id ? { scope, id } : null;
  renderInspector(); renderTracks(); ed.dirty = true;
}
const elLabel = (el) => (el.type === 'text' ? (String(el.text || '').replace(/\*/g, '').slice(0, 32) || 'Texte') : el.type === 'avatar' ? (el.avatar?.name || 'Avatar') : el.type === 'shape' ? SHAPES[el.kind] || 'Forme' : ELEMENT_TYPES[el.type]);
const sceneDur = () => +curScene()?.duration || 4;
const scopeDur = (scope) => (scope === 'global' ? V.timeline(projForRender()).total : sceneDur());

function elementsList(scope) {
  const list = scope === 'global' ? (P().data.globals || []) : (curScene()?.elements || []);
  return `<div class="insp-sec el-sec"><div class="label" style="display:flex;justify-content:space-between;align-items:center">${scope === 'global' ? 'Éléments globaux (toute la vidéo)' : 'Éléments de la scène'}
      <button class="btn ghost" data-ed="addElement" data-scope="${scope}" style="height:26px;padding:0 8px;font-size:12px">${ic('plus')}Ajouter</button></div>
    ${list.length ? `<div class="el-list">${[...list].reverse().map((el) => `<div class="el-row ${ed.selEl?.id === el.id ? 'on' : ''}" data-ed="selEl" data-scope="${scope}" data-id="${el.id}">
        <span class="el-ic">${ic(EL_ICON[el.type])}</span><span class="el-name">${esc(elLabel(el))}</span>
        ${el.anim?.sfx ? `<span class="el-flag" title="Son : ${esc(SFX[el.anim.sfx]?.name || '')}">${ic('speaker')}</span>` : ''}
        <button class="icon-btn" data-ed="elHide" data-scope="${scope}" data-id="${el.id}" aria-label="${el.hidden ? 'Afficher' : 'Masquer'}" title="${el.hidden ? 'Afficher' : 'Masquer'}">${ic(el.hidden ? 'eyeOff' : 'eye')}</button>
        <button class="icon-btn" data-ed="elLock" data-scope="${scope}" data-id="${el.id}" aria-label="${el.locked ? 'Déverrouiller' : 'Verrouiller'}" title="${el.locked ? 'Déverrouiller' : 'Verrouiller'}">${ic(el.locked ? 'lock' : 'unlock')}</button></div>`).join('')}</div>`
      : `<p class="hint" style="color:var(--stage-muted)">${scope === 'global' ? 'Un logo, un slogan ou un mot-clé qui reste visible sur toutes les scènes.' : 'Ajoute des textes, ton logo, des images, des vidéos, des formes ou un avatar, où tu veux sur la scène.'}</p>`}
  </div>`;
}

/* ---------- Panneau de propriétés ---------- */
const COLOR_CHOICES = [['auto', 'Auto'], ['accent', 'Accent'], ['primary', 'Principale'], ['secondary', 'Secondaire'], ['#FFFFFF', 'Blanc'], ['#111111', 'Noir']];
function colorRow(k, cur, withNone = false) {
  const swatchOf = (v) => (v === 'auto' ? 'linear-gradient(135deg,#fff 50%,#111 50%)' : v === 'accent' ? ed.brand.colors.secondary : v === 'primary' ? ed.brand.colors.primary : v === 'secondary' ? ed.brand.colors.secondary : v);
  const custom = cur && cur.startsWith('#') && !COLOR_CHOICES.some(([v]) => v === cur);
  return `<div class="color-chips">${withNone ? `<button class="cchip ${!cur ? 'on' : ''}" data-elset="${k}" data-v="" title="Aucun">${ic('x')}</button>` : ''}${COLOR_CHOICES.filter(([v]) => !(withNone && v === 'auto')).map(([v, l]) => `<button class="cchip ${cur === v ? 'on' : ''}" data-elset="${k}" data-v="${v}" title="${l}" style="background:${swatchOf(v)}"></button>`).join('')}
    <label class="cchip custom ${custom ? 'on' : ''}" title="Couleur personnalisée" style="background:${custom ? cur : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'}"><input type="color" data-elk="${k}" value="${custom ? cur : '#ff8a3d'}"></label></div>`;
}
const rng = (k, label, v, min, max, step, fmt) => `<div class="field"><span>${label}</span><div class="range-row"><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-elk="${k}" data-num="1"><output data-elout="${k}">${fmt(v)}</output></div></div>`;
const sel = (k, label, opts, v) => `<label class="field"><span>${label}</span><select data-elk="${k}">${Object.entries(opts).map(([a, b]) => `<option value="${a}" ${String(v) === a ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
const tog = (k, label, v) => `<label class="switch"><input type="checkbox" data-elk="${k}" ${v ? 'checked' : ''}>${label}</label>`;
const pct = (v) => `${Math.round(v * 100)} %`, sec = (v) => `${(+v).toFixed(1).replace('.', ',')} s`;

function elementPanel() {
  const el = selElement(), scope = ed.selEl.scope, D = scopeDur(scope), a = el.anim || {};
  const fonts = { titre: 'Police des titres', texte: 'Police du texte', ...Object.fromEntries(Object.keys(FONT_LIBRARY).map((f) => [f, f])) };
  let content = '';
  if (el.type === 'text') content = `
    <label class="field"><span>Texte</span><textarea dir="auto" data-elk="text" rows="3">${esc(el.text || '')}</textarea></label>
    <p class="hint" style="color:var(--stage-muted)">Astuce : entoure un mot d’astérisques, *comme ceci*, pour le mettre en couleur d’accent.</p>
    ${sel('font', 'Police', fonts, el.font || 'titre')}
    ${rng('size', 'Taille', el.size || 72, 16, 320, 2, (v) => `${v} px`)}
    <div class="grid-2">${sel('weight', 'Graisse', { 0: 'Automatique', 400: 'Normale', 500: 'Moyenne', 700: 'Grasse', 800: 'Très grasse' }, el.weight || 0)}
      <div class="field"><span>Alignement</span><div class="segmented">${[['left', 'Gauche'], ['center', 'Centre'], ['right', 'Droite']].map(([v, l]) => `<button data-elset="align" data-v="${v}" aria-pressed="${(el.align || 'center') === v}">${l}</button>`).join('')}</div></div></div>
    <div class="field"><span>Couleur</span>${colorRow('color', el.color || 'auto')}</div>
    <div class="field"><span>Fond surligné</span>${colorRow('bg', el.bg || '', true)}</div>
    ${rng('spacing', 'Espacement des lettres', el.spacing || 0, -10, 40, 1, (v) => `${v}`)}
    ${rng('lineHeight', 'Interligne', el.lineHeight || 1.12, 0.8, 2, 0.02, (v) => (+v).toFixed(2))}
    <div class="row" style="flex-wrap:wrap;gap:14px">${tog('upper', 'Majuscules', el.upper)}${tog('shadow', 'Ombre', el.shadow)}</div>
    <div class="field"><span>Contour</span><div class="segmented">${[['', 'Aucun'], ['#FFFFFF', 'Blanc'], ['#111111', 'Noir']].map(([v, l]) => `<button data-elset="stroke" data-v="${v}" aria-pressed="${(el.stroke || '') === v}">${l}</button>`).join('')}</div></div>
    ${curScene()?.props?.voice && scope === 'scene' ? `<button class="btn" data-ed="syncWords" style="justify-self:start">${ic('speaker')}Caler mot par mot sur la voix</button><p class="hint" style="color:var(--stage-muted)">Estimation à partir des pauses de la voix. Ajuste ensuite dans les pistes si besoin.</p>` : ''}`;
  else if (el.type === 'logo') content = `${tog('plate', 'Pastille blanche derrière le logo', el.plate)}<p class="hint" style="color:var(--stage-muted)">Le logo vient de la charte du client.</p>`;
  else if (el.type === 'image' || el.type === 'video') {
    const ratios = { 1: 'Carré', 0.75: '4:3', 0.5625: '16:9', 1.7778: '9:16', 1.25: '4:5' };
    content = `<button class="btn" data-ed="replaceMedia" style="justify-self:start">${ic(el.type === 'video' ? 'video' : 'image')}${el.media ? 'Remplacer' : 'Choisir'} ${el.type === 'video' ? 'la vidéo' : 'l’image'}</button>
      <div class="field"><span>Cadrage</span><div class="segmented">${[['cover', 'Remplir'], ['contain', 'Entière']].map(([v, l]) => `<button data-elset="fit" data-v="${v}" aria-pressed="${(el.fit || 'cover') === v}">${l}</button>`).join('')}</div></div>
      <div class="field"><span>Format du cadre</span><div class="chips">${Object.entries(ratios).map(([v, l]) => `<button class="chip ${Math.abs((el.ar || 0) - +v) < 0.01 ? 'on' : ''}" data-elset="ar" data-v="${v}" data-num="1">${l}</button>`).join('')}${el.natAr ? `<button class="chip ${Math.abs((el.ar || 0) - el.natAr) < 0.01 ? 'on' : ''}" data-elset="ar" data-v="${el.natAr}" data-num="1">Original</button>` : ''}</div></div>
      ${rng('radius', 'Arrondi des coins', el.radius || 0, 0, 120, 2, (v) => `${v}`)}
      ${tog('shadow', 'Ombre portée', el.shadow)}
      ${el.type === 'video' ? `<div class="insp-sub">Clip vidéo</div>
        ${rng('trimIn', 'Début du clip', el.trimIn || 0, 0, Math.max(0.1, (el.srcDur || 10) - 0.5), 0.1, sec)}
        ${rng('trimOut', 'Fin du clip', el.trimOut ?? el.srcDur ?? 10, 0.5, Math.max(0.6, el.srcDur || 10), 0.1, sec)}
        ${sel('speed', 'Vitesse', { 0.5: '×0,5 (ralenti)', 0.75: '×0,75', 1: '×1', 1.25: '×1,25', 1.5: '×1,5', 2: '×2 (accéléré)' }, el.speed || 1)}
        ${tog('muted', 'Couper le son du clip', el.muted)}
        ${el.muted ? '' : rng('volume', 'Volume du clip', el.volume ?? 1, 0, 1, 0.05, pct)}
        <div class="row" style="flex-wrap:wrap"><button class="btn" data-ed="fitClip">Durée = longueur du clip</button><button class="btn" data-ed="splitClip">${ic('scissors')}Scinder à la tête de lecture</button></div>` : ''}`;
  } else if (el.type === 'shape') content = `
    <div class="field"><span>Forme</span><div class="chips">${Object.entries(SHAPES).map(([v, l]) => `<button class="chip ${el.kind === v ? 'on' : ''}" data-elset="kind" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="field"><span>Couleur</span>${colorRow('fill', el.fill || 'accent')}</div>
    ${el.kind === 'rect' ? rng('ar', 'Hauteur', el.ar || 0.3, 0.05, 2, 0.01, (v) => (+v).toFixed(2)) + rng('radius', 'Arrondi', el.radius || 0, 0, 200, 2, (v) => `${v}`) : ''}`;
  else if (el.type === 'avatar') content = `
    <div class="field"><span>Personnage</span><div class="av-pick">
      <button class="av-opt" data-ed="elAvatar" data-id="" aria-pressed="${!el.avatar}"><canvas data-av=""></canvas><span>Par défaut</span></button>
      ${state.avatars.filter((x) => x.kind === 'illustre').map((x) => `<button class="av-opt" data-ed="elAvatar" data-id="${x.id}" aria-pressed="${el.avatar?.id === x.id}"><canvas data-av="${x.id}"></canvas><span>${esc(x.name)}</span></button>`).join('')}</div></div>
    ${sel('frame', 'Cadre', { none: 'Aucun (détouré)', circle: 'Cercle', card: 'Carte arrondie' }, el.frame || 'none')}
    ${sel('gesture', 'Geste', GESTURES, el.gesture || 'auto')}
    ${sel('talk', 'Bouche', { voice: 'Suit la voix de la scène', mime: 'Mime la parole', none: 'Fermée' }, el.talk || 'voice')}
    <p class="hint" style="color:var(--stage-muted)">Gestes disponibles : repos, salut, montrer à gauche ou à droite, et gestes automatiques pendant la parole.</p>`;

  const inOpts = el.type === 'text' ? ANIM_IN : Object.fromEntries(Object.entries(ANIM_IN).filter(([k]) => !TEXT_ONLY_ANIMS.includes(k)));
  const sfxOpts = { '': 'Aucun', ...Object.fromEntries(Object.entries(SFX).map(([k, v]) => [k, `${v.cat} : ${v.name}`])) };
  const posBtns = [[0.15, 0.15], [0.5, 0.15], [0.85, 0.15], [0.15, 0.5], [0.5, 0.5], [0.85, 0.5], [0.15, 0.85], [0.5, 0.85], [0.85, 0.85]];
  const isGlobalHiddenHere = scope === 'global' && (el.exclude || []).includes(curScene().id);
  return `<div class="insp-head"><div><button class="btn ghost" data-ed="selEl" data-id="" style="height:26px;padding:0 6px;margin:-4px 0 6px -6px;font-size:12px">${ic('back')}${scope === 'global' ? 'Vidéo' : 'Scène'}</button>
      <h2 style="display:flex;gap:8px;align-items:center">${ic(EL_ICON[el.type])}${esc(ELEMENT_TYPES[el.type])}${scope === 'global' ? ' <span class="badge-glob">global</span>' : ''}</h2></div>
      <div class="row" style="gap:2px"><button class="icon-btn" data-ed="elDup" title="Dupliquer (Ctrl+D)" aria-label="Dupliquer">${ic('copy')}</button><button class="icon-btn" data-ed="elDel" title="Supprimer (Suppr)" aria-label="Supprimer">${ic('trash')}</button></div></div>
    <div class="insp-sec" style="border-top:0;padding-top:0">${content}</div>
    <div class="insp-sec"><div class="label">Position et taille</div>
      <div class="pos-grid">${posBtns.map(([x, y]) => `<button data-ed="elPos" data-x="${x}" data-y="${y}" aria-label="Placer"></button>`).join('')}</div>
      ${['image', 'video', 'avatar', 'shape'].includes(el.type) ? `<button class="btn" data-ed="elFull" style="justify-self:start">Plein cadre</button>` : ''}
      ${rng('x', 'Horizontal', el.x ?? 0.5, -0.2, 1.2, 0.005, pct)}${rng('y', 'Vertical', el.y ?? 0.5, -0.2, 1.2, 0.005, pct)}
      ${rng('w', 'Largeur', el.w || 0.3, 0.03, 1.5, 0.005, pct)}${rng('rot', 'Rotation', el.rot || 0, -180, 180, 1, (v) => `${v}°`)}${rng('opacity', 'Opacité', el.opacity ?? 1, 0, 1, 0.05, pct)}
      <p class="hint" style="color:var(--stage-muted)">Tu peux aussi déplacer l’élément directement sur l’image et le redimensionner avec la poignée.</p></div>
    <div class="insp-sec"><div class="label">Apparition</div>
      ${rng('start', 'Début', el.start || 0, 0, Math.max(0.1, D - 0.1), 0.05, sec)}${rng('end', 'Fin', el.end ?? D, 0.1, D, 0.05, sec)}
      <p class="hint" style="color:var(--stage-muted)">${scope === 'global' ? 'Temps comptés depuis le début de la vidéo.' : 'Temps comptés depuis le début de la scène.'} Glisse aussi la barre dans les pistes.</p></div>
    <div class="insp-sec"><div class="label">Animation</div>
      ${sel('anim.in', 'Entrée', inOpts, a.in || 'none')}
      <div class="grid-2">${rng('anim.inDur', 'Durée', a.inDur || 0.6, 0.1, 3, 0.05, sec)}${rng('anim.inDelay', 'Délai', a.inDelay || 0, 0, 3, 0.05, sec)}</div>
      ${sel('anim.ease', 'Courbe', EASINGS, a.ease || 'outCubic')}
      ${sel('anim.emph', 'Pendant l’affichage', ANIM_EMPH, a.emph || 'none')}
      ${sel('anim.out', 'Sortie', ANIM_OUT, a.out || 'none')}
      ${a.out && a.out !== 'none' ? rng('anim.outDur', 'Durée de sortie', a.outDur || 0.4, 0.1, 3, 0.05, sec) : ''}
      <button class="btn" data-ed="elReplay" style="justify-self:start">${ic('play')}Revoir l’animation</button></div>
    <div class="insp-sec"><div class="label">Son à l’apparition</div>
      <div class="row">${sel('anim.sfx', 'Effet', sfxOpts, a.sfx || '').replace('<label class="field">', '<label class="field" style="flex:1">')}<button class="icon-btn" data-ed="sfxPlay" aria-label="Écouter" title="Écouter" style="align-self:flex-end">${ic('play')}</button></div>
      ${a.sfx ? rng('anim.sfxVol', 'Volume de l’effet', a.sfxVol ?? 0.7, 0, 1, 0.05, pct) : ''}
      ${a.in && SFX_FOR_ANIM[a.in] && a.sfx !== SFX_FOR_ANIM[a.in] ? `<button class="btn ghost" data-ed="sfxSuggest" style="justify-self:start">${ic('speaker')}Suggestion : ${esc(SFX[SFX_FOR_ANIM[a.in]].name)}</button>` : ''}</div>
    <div class="insp-sec"><div class="label">Portée</div>
      ${scope === 'scene' ? `<div class="row" style="flex-wrap:wrap"><button class="btn" data-ed="elToGlobal">${ic('globe')}Afficher sur toute la vidéo</button><button class="btn" data-ed="elCopyAll">${ic('copy')}Copier dans toutes les scènes</button></div>`
      : `<label class="switch"><input type="checkbox" data-ed-exclude ${isGlobalHiddenHere ? 'checked' : ''}>Masquer dans la scène ${ed.sel + 1}</label>
         <button class="btn" data-ed="elToScene" style="justify-self:start">Transformer en élément de cette scène</button>
         <p class="hint" style="color:var(--stage-muted)">Pour modifier cet élément dans une seule scène : masque-le ici, puis copie-le dans la scène avec « Dupliquer » une fois transformé.</p>`}</div>`;
}

/* ---------- Canevas : sélection, déplacement, redimensionnement ---------- */
function canvasScale() { const c = $('#edCanvas'); return c ? c.clientWidth / c.width : 1; }
function allHits() { return [...(ed.hits?.globals || []).map((h) => ({ ...h, scope: 'global' })), ...[...(ed.hits || [])].reverse().map((h) => ({ ...h, scope: 'scene' }))]; }
function drawSelection() {
  const layer = $('#selLayer'); if (!layer || !ed) return;
  const el = selElement();
  const h = el && (ed.selEl.scope === 'global' ? ed.hits?.globals : ed.hits)?.find((x) => x.id === el.id);
  if (!h) { layer.innerHTML = ed.guides ? ed.guides : ''; return; }
  const k = canvasScale();
  layer.innerHTML = `${ed.guides || ''}<div class="sel-box ${el.locked ? 'locked' : ''}" style="left:${h.x * k}px;top:${h.y * k}px;width:${h.w * k}px;height:${h.h * k}px;transform:rotate(${h.rot}deg)">
    ${el.locked ? '' : '<span class="sel-handle" data-handle="1"></span>'}<span class="sel-tag">${esc(elLabel(el))}</span></div>`;
}
function bindCanvas() {
  const wrap = $('#canvasWrap'); if (!wrap) return;
  let drag = null;
  wrap.addEventListener('pointerdown', (e) => {
    const r = wrap.getBoundingClientRect(), k = canvasScale();
    const px = (e.clientX - r.left) / k, py = (e.clientY - r.top) / k;
    const c = $('#edCanvas'); const W = c.width, H = c.height;
    const cur = selElement();
    if (e.target.dataset.handle && cur) {
      beforeChange(); drag = { mode: 'resize', el: cur, w0: cur.w, x0: e.clientX, W, k };
      wrap.setPointerCapture(e.pointerId); e.preventDefault(); return;
    }
    const hit = allHits().find((h) => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h);
    if (!hit) { if (ed.selEl) selectEl(null, null); return; }
    if (ed.selEl?.id !== hit.id) { setPlaying(false); selectEl(hit.scope, hit.id); }
    const el = selElement(); if (!el || el.locked) return;
    beforeChange();
    drag = { mode: 'move', el, sx: e.clientX, sy: e.clientY, x0: el.x ?? 0.5, y0: el.y ?? 0.5, W, H, k };
    wrap.setPointerCapture(e.pointerId); e.preventDefault();
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.mode === 'move') {
      let nx = drag.x0 + (e.clientX - drag.sx) / drag.k / drag.W, ny = drag.y0 + (e.clientY - drag.sy) / drag.k / drag.H;
      const gx = Math.abs(nx - 0.5) < 0.012, gy = Math.abs(ny - 0.5) < 0.012;
      if (gx) nx = 0.5; if (gy) ny = 0.5;
      ed.guides = `${gx ? '<i class="guide v"></i>' : ''}${gy ? '<i class="guide h"></i>' : ''}`;
      drag.el.x = Math.round(nx * 1000) / 1000; drag.el.y = Math.round(ny * 1000) / 1000;
    } else {
      const dw = ((e.clientX - drag.x0) / drag.k / drag.W) * 2;
      drag.el.w = Math.max(0.03, Math.round((drag.w0 + dw) * 1000) / 1000);
    }
    ed.dirty = true;
  });
  const end = () => {
    if (!drag) return;
    drag = null; ed.guides = ''; ed.dirty = true;
    changed({ clip: ed.selEl?.scope === 'scene' ? ed.sel : null, film: ed.selEl?.scope === 'global' });
    renderInspector();
  };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('dblclick', () => { const el = selElement(); if (el?.type === 'text') setTimeout(() => $('#inspector textarea[data-elk="text"]')?.focus(), 30); });
}

/* ---------- Pistes de la scène ---------- */
function renderTracks() {
  const box = $('#tracks'); if (!box || !ed || box.hidden) return;
  const s = curScene(); if (!s) { box.innerHTML = ''; return; }
  const D = sceneDur(), els = s.elements || [];
  const vo = s.props?.voice && ed.assets.voices?.[s.props.voice];
  const ticks = []; for (let t = 0; t <= D + 1e-6; t += D > 12 ? 2 : 1) ticks.push(t);
  box.innerHTML = `<div class="tr-head"><span class="tr-label">Scène ${ed.sel + 1}, ${sec(D)}</span><div class="tr-ruler" data-ruler>${ticks.map((t) => `<i style="left:${(t / D) * 100}%">${Math.round(t)} s</i>`).join('')}<b class="tr-ph" id="trPh"></b></div></div>
    ${vo ? `<div class="tr-row"><span class="tr-label">${ic('speaker')}Voix</span><div class="tr-lane"><canvas class="tr-wave" id="trWave" style="left:${(V.voiceDelayOf(s) / D) * 100}%;width:${Math.min(100, (vo.duration / D) * 100)}%"></canvas></div></div>` : ''}
    ${[...els].reverse().map((el) => {
      const st = +el.start || 0, en = el.end == null ? D : Math.min(D, el.end);
      return `<div class="tr-row ${ed.selEl?.id === el.id ? 'on' : ''}"><span class="tr-label" data-ed="selEl" data-scope="scene" data-id="${el.id}">${ic(EL_ICON[el.type])}${esc(elLabel(el))}</span>
        <div class="tr-lane"><div class="tr-bar t-${el.type} ${el.hidden ? 'off' : ''}" data-bar="${el.id}" style="left:${(st / D) * 100}%;width:${Math.max(0.5, ((en - st) / D) * 100)}%">
          <span class="tr-grip l" data-grip="l"></span><span class="tr-txt">${el.anim?.sfx ? '♪ ' : ''}${esc(ANIM_IN[el.anim?.in] || '')}</span><span class="tr-grip r" data-grip="r"></span></div></div></div>`;
    }).join('')}
    ${els.length ? '' : '<p class="hint tr-empty">Aucun élément dans cette scène. Utilise « Ajouter un élément » au-dessus de l’image.</p>'}`;
  const wave = $('#trWave');
  if (wave && vo) {
    const w = wave.clientWidth || 300, h = 26; wave.width = w * 2; wave.height = h * 2;
    const x = wave.getContext('2d'); x.fillStyle = '#8B76FF';
    const n = vo.env.length;
    for (let i = 0; i < w; i++) { const v = vo.env[Math.floor((i / w) * n)] || 0; const bh = Math.max(1, v * h * 1.8); x.fillRect(i * 2, h - bh, 1.4, bh * 2); }
  }
  updatePlayheadTracks();
}
function updatePlayheadTracks() {
  const ph = $('#trPh'); if (!ph || !ed) return;
  const it = V.timeline(projForRender()).items[ed.sel]; if (!it) return;
  const lt = ed.time - it.start, D = sceneDur();
  ph.style.display = lt >= 0 && lt <= D ? '' : 'none'; ph.style.left = `${(lt / D) * 100}%`;
}
function bindTracks() {
  const box = $('#tracks'); if (!box) return;
  let drag = null;
  box.addEventListener('pointerdown', (e) => {
    const ruler = e.target.closest('[data-ruler]');
    if (ruler) { const r = ruler.getBoundingClientRect(); const it = V.timeline(projForRender()).items[ed.sel]; setPlaying(false); seek(it.start + clamp((e.clientX - r.left) / r.width, 0, 1) * sceneDur()); return; }
    const bar = e.target.closest('[data-bar]'); if (!bar) return;
    const el = (curScene().elements || []).find((x) => x.id === bar.dataset.bar); if (!el) return;
    if (ed.selEl?.id !== el.id) selectEl('scene', el.id);
    if (el.locked) return;
    const lane = bar.parentElement.getBoundingClientRect(), D = sceneDur();
    beforeChange();
    drag = { el, mode: e.target.dataset.grip || 'move', x0: e.clientX, pps: lane.width / D, s0: +el.start || 0, e0: el.end == null ? D : Math.min(D, el.end), D };
    box.setPointerCapture(e.pointerId); e.preventDefault();
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dt = (e.clientX - drag.x0) / drag.pps, D = drag.D, snap = (v) => { const it = V.timeline(projForRender()).items[ed.sel]; const ph = ed.time - it.start; if (Math.abs(v - ph) < 0.12) return ph; return Math.round(v * 20) / 20; };
    if (drag.mode === 'move') { const len = drag.e0 - drag.s0; let st = clamp(snap(drag.s0 + dt), 0, D - len); drag.el.start = Math.round(st * 100) / 100; drag.el.end = drag.e0 >= D - 1e-3 && dt >= 0 ? null : Math.round((st + len) * 100) / 100; if (drag.el.end != null && drag.el.end >= D - 0.01) drag.el.end = null; }
    else if (drag.mode === 'l') drag.el.start = Math.round(clamp(snap(drag.s0 + dt), 0, drag.e0 - 0.1) * 100) / 100;
    else { const en = clamp(snap(drag.e0 + dt), drag.s0 + 0.1, D); drag.el.end = en >= D - 0.01 ? null : Math.round(en * 100) / 100; }
    ed.dirty = true; renderTracks();
  });
  const end = () => { if (!drag) return; drag = null; changed({ clip: ed.sel }); renderInspector(); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('click', (e) => { const b = e.target.closest('[data-ed="selEl"]'); if (b) { e.stopPropagation(); selectEl('scene', b.dataset.id); } });
}

/* ---------- Effets sonores dans l'aperçu ---------- */
function playSfxBetween(t0, t1) {
  if (!ed?.assets?.sfx) return;
  for (const { el, offset } of V.allElements(projForRender())) {
    if (el.hidden || !el.anim?.sfx) continue;
    const at = offset + (+el.start || 0) + (+el.anim.inDelay || 0) + (+el.anim.sfxOffset || 0);
    if (at >= t0 && at < t1) playBuffer(ed.assets.sfx[el.anim.sfx], el.anim.sfxVol ?? 0.7);
  }
}
let sfxCtx = null;
function playBuffer(buf, vol = 0.7) {
  if (!buf) return;
  sfxCtx ||= new AudioContext(); sfxCtx.resume();
  const src = sfxCtx.createBufferSource(); src.buffer = buf; const g = sfxCtx.createGain(); g.gain.value = vol;
  src.connect(g); g.connect(sfxCtx.destination); src.start();
}

/* ---------- Ajout d'éléments ---------- */
const TEXT_PRESETS = {
  titre: { label: 'Titre', make: () => ({ text: 'Votre titre', size: 110, font: 'titre', anim: { in: 'slideUp' } }) },
  soustitre: { label: 'Sous-titre', make: () => ({ text: 'Une phrase d’accroche', size: 52, font: 'texte', weight: 500, y: 0.62, anim: { in: 'fade', inDelay: 0.3 } }) },
  motcle: { label: 'Mot-clé', make: () => ({ text: 'MALIN', size: 120, font: 'titre', bg: 'accent', color: 'auto', w: 0.5, anim: { in: 'pop', ease: 'outBack' }, emph: 'pulse' }) },
  mots: { label: 'Mot par mot', make: () => ({ text: 'Stop au hasard. *Place à la méthode.*', size: 96, anim: { in: 'words', inDur: 1.4 } }) },
  machine: { label: 'Machine à écrire', make: () => ({ text: 'Tapez votre message…', size: 72, font: 'texte', anim: { in: 'typewriter', inDur: 1.6 } }) },
  legende: { label: 'Légende', make: () => ({ text: 'Votre légende ici', size: 44, font: 'texte', weight: 600, bg: '#111111', color: '#FFFFFF', y: 0.86, w: 0.8, anim: { in: 'slideUp' } }) },
};
function addElementDialog(scope = 'scene') {
  openModal(`<div class="dlg"><div class="dlg-head"><div><h2>Ajouter un élément</h2><p>${scope === 'global' ? 'Il apparaîtra sur toutes les scènes de la vidéo.' : `Dans la scène ${ed.sel + 1}. Tu pourras le déplacer, l’animer et le chronométrer.`}</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <label class="switch"><input type="checkbox" id="addGlobal" ${scope === 'global' ? 'checked' : ''}>Afficher sur toute la vidéo (élément global)</label>
    <div class="label">Texte</div>
    <div class="add-grid">${Object.entries(TEXT_PRESETS).map(([k, p]) => `<button class="add-tile" data-add-text="${k}">${ic('text')}<span>${p.label}</span></button>`).join('')}</div>
    <div class="label">Médias et visuels</div>
    <div class="add-grid">
      <button class="add-tile" data-add="logo">${ic('logo')}<span>Logo du client</span></button>
      <button class="add-tile" data-add="image">${ic('image')}<span>Image</span><small>PNG, JPG, WebP, SVG</small></button>
      <button class="add-tile" data-add="video">${ic('video')}<span>Vidéo</span><small>MP4, MOV, WebM</small></button>
      <button class="add-tile" data-add="avatar">${ic('avatars')}<span>Avatar</span></button>
      ${['rect', 'circle', 'arrow', 'star', 'check', 'line', 'heart', 'pin'].map((k) => `<button class="add-tile" data-add-shape="${k}">${ic('shape')}<span>${SHAPES[k]}</span></button>`).join('')}
    </div></div>`, {
    size: 'mid',
    onMount: (m) => m.querySelector('.dlg').addEventListener('click', async (e) => {
      const t = e.target.closest('[data-add-text]'), a = e.target.closest('[data-add]'), sh = e.target.closest('[data-add-shape]');
      const sc = $('#addGlobal', m).checked ? 'global' : 'scene';
      if (t) { const p = TEXT_PRESETS[t.dataset.addText].make(); insertElement(sc, V.newElement('text', { ...p, anim: { ...V.newElement('text').anim, ...p.anim, emph: p.emph || 'none' } })); }
      else if (sh) insertElement(sc, V.newElement('shape', { kind: sh.dataset.addShape, ar: ['rect'].includes(sh.dataset.addShape) ? 0.3 : undefined, w: ['line', 'arrow'].includes(sh.dataset.addShape) ? 0.35 : 0.14 }));
      else if (a?.dataset.add === 'logo') insertElement(sc, V.newElement('logo'));
      else if (a?.dataset.add === 'avatar') insertElement(sc, V.newElement('avatar', { avatar: avatarData(state.avatars.find((x) => x.kind === 'illustre')) }));
      else if (a?.dataset.add === 'image' || a?.dataset.add === 'video') {
        const kind = a.dataset.add; closeModal();
        const el = await pickElementMedia(kind); if (el) insertElement(sc, el);
      }
    }),
  });
}
function insertElement(scope, el) {
  if (!el) return;
  beforeChange();
  if (scope === 'global') { el.start = 0; el.end = null; }
  elList(scope).push(el);
  closeModal();
  ed.selEl = { scope, id: el.id };
  reloadAssets().then(() => { changed({ clip: ed.sel, film: scope === 'global', inspector: true }); renderTracks(); });
  if (!ed.playing) { const it = V.timeline(projForRender()).items[ed.sel]; if (it && scope === 'scene') seek(it.start + Math.min(sceneDur() - 0.05, (+el.start || 0) + 1.2)); }
}
async function pickElementMedia(kind, existing = null) {
  const inp = document.createElement('input'); inp.type = 'file';
  inp.accept = kind === 'video' ? 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm' : 'image/png,image/jpeg,image/webp,image/svg+xml';
  const file = await new Promise((r) => { inp.onchange = () => r(inp.files[0] || null); inp.click(); });
  if (!file) return null;
  try {
    if (kind === 'video') {
      if (file.size > 58e6) { toast('Vidéo trop lourde : 58 Mo maximum. Compresse-la ou coupe-la avant import.', 'error'); return null; }
      const url = URL.createObjectURL(file), v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = url;
      await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('format')); setTimeout(() => rej(new Error('délai')), 15000); });
      const ar = v.videoHeight / v.videoWidth || 0.5625, dur = v.duration || 5; URL.revokeObjectURL(url);
      toast('Import de la vidéo…');
      const media = await uploadMedia(file.type ? file : new Blob([file], { type: 'video/mp4' }), 'video', file.name);
      const c = $('#edCanvas'), canvasAr = c ? c.height / c.width : 0.5625;
      const props = { media, natAr: Math.round(ar * 10000) / 10000, ar: Math.round(ar * 10000) / 10000, srcDur: Math.round(dur * 100) / 100, trimIn: 0, trimOut: Math.round(dur * 100) / 100 };
      if (existing) return props;
      const full = Math.abs(ar - canvasAr) < 0.2;
      return V.newElement('video', { ...props, w: full ? 1 : 0.6, ar: full ? canvasAr : props.ar, end: Math.min(sceneDur(), dur), anim: { ...V.newElement('video').anim, in: full ? 'none' : 'scale' } });
    }
    const { src, w, h } = await readImage(file);
    const k = Math.min(1, 2200 / Math.max(w, h));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
    let blob = await new Promise((r) => cv.toBlob(r, 'image/webp', 0.9));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    const media = await uploadMedia(blob, 'image', file.name);
    const ar = Math.round((cv.height / cv.width) * 10000) / 10000;
    if (existing) return { media, natAr: ar, ar };
    return V.newElement('image', { media, ar, natAr: ar, fit: 'cover' });
  } catch (e) { console.error(e); toast(kind === 'video' ? 'Vidéo illisible dans ce navigateur. Essaie un MP4 (H.264).' : 'Image illisible.', 'error'); return null; }
}
function setPath(o, path, v) { const ks = path.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]] ||= {}; x[ks[ks.length - 1]] = v; }

/* ---------- Musique de la vidéo ---------- */
function musicLabel() {
  const m = ed?.project?.data?.music;
  const parts = (ed?.project?.data?.audio || []).filter((c) => c.kind === 'music').length;
  if (!m && parts) return `Musique en ${plural(parts, 'morceau', 'morceaux')}`;
  if (!m) return 'Ajouter une musique';
  return m.kind === 'library' ? (MUSIC_TRACKS[m.track]?.name || 'Musique') : (m.name || 'Ma musique');
}
function refreshMusicChip() { const c = $('#musicChip span'); if (c) c.textContent = musicLabel(); }
function musicSection() {
  const m = P().data.music;
  if (!m) return `<div class="insp-sec"><div class="label">Musique</div><button class="btn" data-ed="music" style="justify-self:start">${ic('musicnav')}Ajouter une musique</button></div>`;
  const mu = m.kind === 'upload' ? state.music.find((x) => x.media === m.media) : null;
  const maxOff = mu ? Math.max(0, Math.floor((mu.duration || 0) - 5)) : 0;
  return `<div class="insp-sec"><div class="label">Musique</div>
    <div class="row" style="padding:10px;border-radius:10px;background:var(--stage-2);border:1px solid var(--stage-line)">${ic('musicnav')}<span style="flex:1;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(musicLabel())}</span>
      <button class="btn ghost" data-ed="music">Changer</button><button class="icon-btn" data-ed="musicRemove" aria-label="Retirer la musique" title="Retirer">${ic('x')}</button></div>
    <div class="field"><span>Volume</span><div class="range-row"><input type="range" min="0.05" max="1" step="0.05" value="${m.volume ?? 0.6}" data-music="volume" aria-label="Volume de la musique"><output data-music-out="volume">${Math.round((m.volume ?? 0.6) * 100)} %</output></div></div>
    ${maxOff > 0 ? `<div class="field"><span>Commencer le morceau à</span><div class="range-row"><input type="range" min="0" max="${maxOff}" step="1" value="${m.offset || 0}" data-music="offset" aria-label="Début du morceau"><output data-music-out="offset">${fmtTime(m.offset || 0).slice(0, 5)}</output></div></div>` : ''}
    <label class="switch"><input type="checkbox" data-music="duck" ${m.duck !== false ? 'checked' : ''}>Baisser la musique quand un personnage parle</label>
  </div>`;
}
function musicDialog() {
  const cur = P().data.music;
  const pick = async (music) => {
    stopListen(); beforeChange();
    if (P().data.audio?.some((c) => c.kind === 'music')) P().data.audio = P().data.audio.filter((c) => c.kind !== 'music');
    if (music) P().data.music = { volume: cur?.volume ?? 0.6, duck: cur?.duck ?? true, ...music };
    else delete P().data.music;
    closeModal();
    if (music?.kind === 'library') toast('Composition de la musique…');
    await reloadAssets(); if (!ed) return;
    refreshMusicChip(); changed({ inspector: ed.tab === 'video' });
    toast(music ? `Musique « ${musicLabel()} » ajoutée` : 'Musique retirée', 'ok');
  };
  const draw = (m) => {
    $('#musicMine', m).innerHTML = state.music.length ? state.music.map((mu) => myMusicRow(mu, `<button class="btn ${cur?.media === mu.media ? '' : 'primary'}" data-use-mine="${mu.id}">${cur?.media === mu.media ? 'Utilisée' : 'Utiliser'}</button>`)).join('')
      : '<p class="muted" style="padding:6px 2px">Aucune musique importée pour l’instant.</p>';
  };
  openModal(`<div class="dlg">
    <div class="dlg-head"><div><h2>Musique de la vidéo</h2><p>Écoute avec ▶, puis choisis. La musique s’adapte à la durée de la vidéo, avec un fondu à la fin.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="music-head"><h3>Bibliothèque Cadence <span class="badge-free">Libre de droits</span></h3></div>
    <div class="track-grid compact">${Object.entries(MUSIC_TRACKS).map(([id, t]) => trackCard(id, t, `<button class="btn ${cur?.kind === 'library' && cur.track === id ? '' : 'primary'}" data-use-lib="${id}">${cur?.kind === 'library' && cur.track === id ? 'Utilisée' : 'Utiliser'}</button>`)).join('')}</div>
    <div class="music-head" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3>Mes musiques</h3><button class="btn" data-import-music>${ic('upload')}Importer un fichier</button></div>
    <div class="track-grid compact" id="musicMine"></div>
    <div class="dlg-foot">${cur ? '<button class="btn ghost danger" data-no-music>Retirer la musique</button>' : ''}<span class="spacer"></span><button class="btn" data-close>Fermer</button></div></div>`, {
    size: 'wide',
    onClose: () => stopListen(),
    onMount: (m) => {
      draw(m);
      m.querySelector('.dlg').addEventListener('click', async (e) => {
        const lib = e.target.closest('[data-use-lib]'), mine = e.target.closest('[data-use-mine]');
        if (lib) pick({ kind: 'library', track: lib.dataset.useLib });
        if (mine) { const mu = state.music.find((x) => x.id === mine.dataset.useMine); if (mu) pick({ kind: 'upload', media: mu.media, name: mu.name, offset: 0 }); }
        if (e.target.closest('[data-no-music]')) pick(null);
        if (e.target.closest('[data-import-music]')) {
          const f = await pickAudioFile(); if (!f) return;
          try { const mu = await importMusic(f); if (mu) pick({ kind: 'upload', media: mu.media, name: mu.name, offset: 0 }); } catch (x) { toast(x.message, 'error'); }
        }
      });
    },
  });
}

/* ---------- Polices et tailles ---------- */
function textTarget(scope) { return scope === 'scene' ? (curScene().text ||= {}) : (P().data.text ||= {}); }
function textSection(scope, s = null) {
  const own = scope === 'scene' ? (s.text || {}) : (P().data.text || {});
  const eff = V.resolveText(ed.brand, P().data.text, scope === 'scene' ? s.text : {});
  const inherited = scope === 'scene' ? V.resolveText(ed.brand, P().data.text, {}).F : V.resolveText(ed.brand, {}, {}).F;
  const from = scope === 'scene' ? 'Comme la vidéo' : 'Selon la charte du client';
  const fontBtn = (role) => {
    const fam = role === 'display' ? eff.F.display : eff.F.body, isOwn = !!own[role];
    return `<button class="font-btn" data-ed="pickFont" data-role="${role}" data-scope="${scope}"><b style="font-family:'${esc(fam)}';font-weight:${role === 'display' ? eff.F.dw : eff.F.bw}">${esc(fam)}</b><small>${isOwn ? 'Choisie pour ' + (scope === 'scene' ? 'cette scène' : 'la vidéo') : esc(from)}</small></button>`;
  };
  const range = (k, label) => {
    const v = own[k] || 1;
    return `<div class="field"><span>${label}</span><div class="range-row"><input type="range" min="0.5" max="1.8" step="0.05" value="${v}" data-textscale="${k}" data-scope="${scope}" aria-label="${label}"><output data-out="${scope}-${k}">${Math.round(v * 100)} %</output></div></div>`;
  };
  const changedAny = own.display || own.body || (own.titleScale && own.titleScale !== 1) || (own.bodyScale && own.bodyScale !== 1);
  return `<div class="insp-sec"><div class="label" style="display:flex;justify-content:space-between;align-items:center">${scope === 'scene' ? 'Texte de cette scène' : 'Texte de toute la vidéo'}
      ${changedAny ? `<button class="btn ghost" data-ed="resetText" data-scope="${scope}" style="height:26px;padding:0 8px;font-size:12px">Réinitialiser</button>` : ''}</div>
    <div class="field"><span>Police des titres</span>${fontBtn('display')}</div>
    ${range('titleScale', 'Taille des titres')}
    <div class="field"><span>Police du texte</span>${fontBtn('body')}</div>
    ${range('bodyScale', 'Taille du texte')}
    ${scope === 'scene' ? '<p class="hint" style="color:var(--stage-muted)">Ces réglages s’ajoutent à ceux de l’onglet Vidéo. Les textes restent toujours dans le cadre : s’ils sont trop grands, ils passent à la ligne.</p>' : '<p class="hint" style="color:var(--stage-muted)">S’applique à toutes les scènes, sauf celles qui ont leurs propres réglages.</p>'}
  </div>`;
}
function fontDialog({ role, scope }) {
  const target = textTarget(scope);
  const current = target[role] || null;
  const inheritF = scope === 'scene' ? V.resolveText(ed.brand, P().data.text, {}).F : V.resolveText(ed.brand, {}, {}).F;
  const inheritFam = role === 'display' ? inheritF.display : inheritF.body;
  const sample = role === 'display' ? 'Votre titre ici' : 'Un texte clair et lisible, aux couleurs de votre marque.';
  const cats = [...new Set(Object.values(FONT_LIBRARY).map((f) => f.cat))];
  let cat = 'all';
  const card = (fam, label, sub, selected) => {
    const L0 = FONT_LIBRARY[fam] || { dw: 700, bw: 400 };
    return `<button type="button" class="font-card" data-fam="${esc(label === null ? '' : fam)}" aria-pressed="${selected}">
      <span class="font-sample" style="font-family:'${esc(fam)}';font-weight:${role === 'display' ? L0.dw : L0.bw};${L0.upper && role === 'display' ? 'text-transform:uppercase;' : ''}${role === 'display' ? 'font-size:30px' : 'font-size:16px'}">${esc(sample)}</span>
      <span class="font-name">${esc(label ?? fam)}<small>${esc(sub)}</small></span></button>`;
  };
  const draw = () => {
    $('#fontGrid').innerHTML = card(inheritFam, scope === 'scene' ? 'Comme la vidéo' : 'Selon la charte', inheritFam, !current)
      + Object.entries(FONT_LIBRARY).filter(([, f]) => cat === 'all' || f.cat === cat).map(([fam, f]) => card(fam, undefined, f.cat, current === fam)).join('');
  };
  openModal(`<div class="dlg"><div class="dlg-head"><div><h2>${role === 'display' ? 'Police des titres' : 'Police du texte'}</h2><p>${scope === 'scene' ? 'Pour cette scène uniquement.' : 'Pour toute la vidéo.'} Clique sur une police pour l’appliquer.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="chips" id="fontCats"><button type="button" class="chip on" data-cat="all">Toutes</button>${cats.map((c) => `<button type="button" class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="font-grid" id="fontGrid"></div></div>`, {
    size: 'wide',
    onMount: (m) => {
      draw();
      Object.keys(FONT_LIBRARY).forEach((f) => V.loadFont(f));
      $('#fontCats', m).addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; $$('#fontCats .chip', m).forEach((x) => x.classList.toggle('on', x === b)); draw(); });
      $('#fontGrid', m).addEventListener('click', async (e) => {
        const b = e.target.closest('[data-fam]'); if (!b || !ed) return;
        const fam = b.dataset.fam || null;
        beforeChange();
        const t = textTarget(scope);
        if (fam) t[role] = fam; else delete t[role];
        closeModal();
        if (fam) await V.loadFont(fam);
        if (!ed) return;
        changed(scope === 'scene' ? { clip: ed.sel, inspector: true } : { film: true, inspector: true });
        toast(fam ? `Police ${fam} appliquée` : 'Police par défaut rétablie', 'ok');
      });
    },
  });
}
function hydrateInspector() {
  const brand = ed.brand;
  $$('#inspector canvas[data-av]').forEach((c) => {
    const a = state.avatars.find((x) => x.id === c.dataset.av);
    c.width = 120; c.height = 120; drawAvatarThumb(c, a ? avatarData(a) : null, brand);
  });
  $$('#inspector img[data-media]').forEach(async (img) => { try { img.src = await mediaSrc(img.dataset.media); } catch { /* rien */ } });
}
function videoPanel() {
  const p = P(), c = clientById(p.clientId);
  const { total, items } = V.timeline(projForRender());
  return `<div class="insp-head"><div><h2>Vidéo</h2><p>${plural(items.length, 'scène', 'scènes')}, ${fmtDur(total)} au total.</p></div></div>
    <div class="field"><span>Charte graphique</span>
      <div class="row" style="padding:10px;border-radius:10px;background:var(--stage-2);border:1px solid var(--stage-line)">
        <span class="swatches">${['primary', 'secondary', 'dark', 'light'].map((k) => `<i style="background:${esc(ed.brand.colors[k])}"></i>`).join('')}</span>
        <span style="flex:1;font-weight:700">${esc(c ? c.name : 'Démonstration')}</span>
        ${c ? `<button class="btn ghost" data-ed="editBrand">${ic('edit')}Modifier</button>` : `<button class="btn ghost" data-ed="newBrand">${ic('plus')}Créer</button>`}</div></div>
    ${elementsList('global')}
    <div class="insp-sec"><div class="label">Sound design</div><button class="btn" data-ed="autoSfx" style="justify-self:start">${ic('speaker')}Ajouter les bruitages automatiquement</button>
      <p class="hint" style="color:var(--stage-muted)">Ajoute un son adapté à chaque élément animé qui n’en a pas encore (pop, whoosh, clic…). Tout reste modifiable.</p></div>
    ${musicSection()}
    ${textSection('video')}
    <label class="switch"><input type="checkbox" data-video="fadeIn" ${p.data.fadeIn ? 'checked' : ''}>Fondu au noir en ouverture</label>
    <label class="switch"><input type="checkbox" data-video="fadeOut" ${p.data.fadeOut !== false ? 'checked' : ''}>Fondu au noir en fin de vidéo</label>
    <div class="insp-sec"><div class="label">Raccourcis clavier</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 12px;font-size:13px;color:var(--stage-muted)">
        <span><kbd>Espace</kbd></span><span>Lecture, pause</span><span><kbd>←</kbd> <kbd>→</kbd></span><span>Image par image (Maj : 1 s)</span>
        <span><kbd>Ctrl</kbd> <kbd>Z</kbd></span><span>Annuler</span><span><kbd>Ctrl</kbd> <kbd>D</kbd></span><span>Dupliquer la scène</span>
        <span><kbd>Suppr</kbd></span><span>Supprimer la scène</span><span><kbd>Ctrl</kbd> <kbd>E</kbd></span><span>Exporter</span></div></div>`;
}

/* ---------- Historique et enregistrement ---------- */
const snap = () => JSON.stringify({ data: P().data, format: P().format });
let pendingSnap = null, snapTimer = 0;
function beforeChange() {
  if (pendingSnap === null) pendingSnap = snap();
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => { if (pendingSnap !== null && ed) { ed.history.push(pendingSnap); if (ed.history.length > 80) ed.history.shift(); ed.future = []; } pendingSnap = null; }, 500);
}
function changed({ film = false, clip = null, inspector = false, scrub = false } = {}) {
  ed.dirty = true;
  if (ed.showTracks) setTimeout(renderTracks, 0);
  if (ed.showAudio) setTimeout(renderAudio, 0);
  if (ed.playing) { clearTimeout(ed.clipRestart); ed.clipRestart = setTimeout(() => { if (ed?.playing) startClipAudio(ed.time); }, 120); }
  if (film) renderFilm(); else if (clip !== null) redrawClip(clip);
  if (inspector) renderInspector();
  if (scrub) renderScrub();
  setStatus('saving'); ed.save();
}
function restore(json) {
  const s = JSON.parse(json); P().data = s.data; P().format = s.format;
  ed.sel = clamp(ed.sel, 0, Math.max(0, scenesOf().length - 1));
  $$('[data-ed="format"]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === P().format));
  fitCanvas(); reloadAssets(); renderInspector(); renderFilm(); setStatus('saving'); ed.save();
}
function undo() { if (pendingSnap !== null) { ed.history.push(pendingSnap); pendingSnap = null; clearTimeout(snapTimer); } const h = ed.history.pop(); if (!h) return toast('Rien à annuler'); ed.future.push(snap()); restore(h); }
function redo() { const f = ed.future.pop(); if (!f) return; ed.history.push(snap()); restore(f); }
function setStatus(s, msg) {
  const el = $('#edStatus'); if (!el) return;
  el.dataset.s = s; el.querySelector('span').textContent = msg || (s === 'saving' ? 'Modifications…' : s === 'error' ? 'Non enregistré' : 'Enregistré');
}
async function saveProject() {
  if (!ed) return;
  const e = ed, p = e.project;
  const used = new Set(p.data.scenes.flatMap((s) => Object.values(s.props || {}).filter((v) => typeof v === 'string' && v.startsWith('img_'))));
  for (const k of Object.keys(p.data.assets)) if (!used.has(k)) delete p.data.assets[k];
  let thumb;
  if (Date.now() - e.lastThumb > 4000) {
    try {
      const first = V.timeline(p.data).items[0];
      const c = V.snapshot({ ...p.data, fadeOut: false }, e.brand, e.assets, first ? first.start + Math.min(2.2, first.scene.duration * 0.55) : 0, 480, p.format);
      thumb = c.toDataURL('image/jpeg', 0.74); e.lastThumb = Date.now();
    } catch { /* rien */ }
  }
  setStatus('saving', 'Enregistrement…');
  try {
    await api(`/api/projects/${p.id}`, { method: 'PUT', body: { name: p.name, clientId: p.clientId, format: p.format, data: p.data, thumb, duration: V.timeline(p.data).total } });
    if (ed === e) setStatus('saved');
    const row = state.projects.find((x) => x.id === p.id);
    if (row) Object.assign(row, { name: p.name, clientId: p.clientId, format: p.format, updatedAt: Date.now(), duration: V.timeline(p.data).total, ...(thumb ? { thumb } : {}) });
  } catch (err) { if (ed === e) setStatus('error', 'Non enregistré'); toast(err.message, 'error'); }
}

/* ---------- Interactions ---------- */
function bindEditor() {
  const root = $('.editor');
  root.addEventListener('click', onEdClick);
  $('#inspector').addEventListener('input', onInspector);
  $('#inspector').addEventListener('change', onInspector);
  $('#edName').addEventListener('input', (e) => { P().name = e.target.value; setStatus('saving'); ed.save(); });
  $('#edClient').addEventListener('change', (e) => {
    if (e.target.value === '__new') { e.target.value = P().clientId || ''; brandDialog(); return; }
    beforeChange(); P().clientId = e.target.value || null; editorBrandChanged(); changed({ film: true });
  });
  $('#imgFile').addEventListener('change', onImagePicked);
  // Barre de lecture
  const scrub = $('#scrub');
  const at = (e) => { const r = scrub.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * V.timeline(projForRender()).total); };
  scrub.addEventListener('pointerdown', (e) => { scrub.setPointerCapture(e.pointerId); ed.wasPlaying = ed.playing; setPlaying(false); at(e); });
  scrub.addEventListener('pointermove', (e) => { if (scrub.hasPointerCapture(e.pointerId)) at(e); });
  scrub.addEventListener('pointerup', (e) => { scrub.releasePointerCapture(e.pointerId); if (ed.wasPlaying) setPlaying(true); });
  // Pellicule : sélection et glisser-déposer
  const film = $('#film');
  film.addEventListener('click', (e) => { const c = e.target.closest('.clip'); if (c) selectScene(+c.dataset.i, true); });
  film.addEventListener('keydown', (e) => { const c = e.target.closest('.clip'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectScene(+c.dataset.i, true); } });
  let dragFrom = null;
  film.addEventListener('dragstart', (e) => { const c = e.target.closest('.clip'); if (!c) return; dragFrom = +c.dataset.i; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); });
  film.addEventListener('dragend', () => { dragFrom = null; $$('.clip', film).forEach((c) => c.classList.remove('dragging', 'drop-before', 'drop-after')); });
  film.addEventListener('dragover', (e) => {
    const c = e.target.closest('.clip'); if (dragFrom === null || !c) return;
    e.preventDefault();
    const r = c.getBoundingClientRect(), after = e.clientX > r.left + r.width / 2;
    $$('.clip', film).forEach((x) => x.classList.remove('drop-before', 'drop-after'));
    c.classList.add(after ? 'drop-after' : 'drop-before');
  });
  film.addEventListener('drop', (e) => {
    const c = e.target.closest('.clip'); if (dragFrom === null || !c) return;
    e.preventDefault();
    const r = c.getBoundingClientRect(); let to = +c.dataset.i + (e.clientX > r.left + r.width / 2 ? 1 : 0);
    if (to > dragFrom) to--;
    if (to === dragFrom) return;
    beforeChange();
    const arr = scenesOf(); const [m] = arr.splice(dragFrom, 1); arr.splice(to, 0, m);
    ed.sel = to; changed({ film: true, inspector: true });
  });
  ed.onKey = onEdKey; addEventListener('keydown', ed.onKey);
  bindCanvas(); bindTracks(); bindAudio();
}
function selectScene(i, doSeek = false) {
  if (ed.sel !== i) ed.selEl = ed.selEl?.scope === 'global' ? ed.selEl : null;
  ed.sel = clamp(i, 0, scenesOf().length - 1);
  setTimeout(renderTracks, 0);
  $$('.clip').forEach((c) => c.setAttribute('aria-selected', +c.dataset.i === ed.sel));
  if (ed.tab !== 'scene') ed.tab = 'scene';
  renderInspector(); renderScrub();
  if (doSeek && !ed.playing) seekScene(ed.sel);
}
function onEdClick(e) {
  const setb = e.target.closest('[data-elset]');
  if (setb) {
    const it = selElement(); if (!it) return;
    beforeChange(); const k = setb.dataset.elset; setPath(it, k, setb.dataset.num ? +setb.dataset.v : setb.dataset.v);
    changed({ clip: ed.sel, inspector: true }); return;
  }
  const b = e.target.closest('[data-ed]'); if (!b) return;
  const a = b.dataset.ed, s = curScene();
  if (a === 'play') setPlaying(!ed.playing);
  else if (a === 'toStart') { seek(0); }
  else if (a === 'loop') { ed.loop = !ed.loop; b.style.color = ed.loop ? '#fff' : ''; toast(ed.loop ? 'Lecture en boucle' : 'Lecture simple'); }
  else if (a === 'tab') { ed.tab = b.dataset.t; renderInspector(); }
  else if (a === 'undo') undo();
  else if (a === 'redo') redo();
  else if (a === 'format') {
    if (P().format === b.dataset.f) return;
    beforeChange(); P().format = b.dataset.f;
    $$('[data-ed="format"]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    ed.lastThumb = 0; fitCanvas(); changed({ film: true });
  }
  else if (a === 'export') exportDialog();
  else if (a === 'addScene') sceneDialog();
  else if (a === 'dupScene' && s) { beforeChange(); const c = structuredClone(s); c.id = uid(); scenesOf().splice(ed.sel + 1, 0, c); ed.sel++; changed({ film: true, inspector: true }); seekScene(ed.sel); }
  else if (a === 'delScene' && s) {
    if (scenesOf().length <= 1) return toast('Une vidéo doit garder au moins une scène.');
    beforeChange(); scenesOf().splice(ed.sel, 1); ed.sel = Math.min(ed.sel, scenesOf().length - 1); changed({ film: true, inspector: true });
    toast('Scène supprimée. Ctrl+Z pour annuler.');
  }
  else if (a === 'addItem' && s) {
    const f = SCENES[s.type].fields.find((x) => x.k === b.dataset.k);
    beforeChange(); (s.props[f.k] ||= []).push(Object.fromEntries(f.item.map((x) => [x.k, ''])));
    changed({ clip: ed.sel, inspector: true });
    setTimeout(() => $$(`[data-items="${f.k}"]`).at(-f.item.length)?.focus(), 0);
  }
  else if (a === 'delItem' && s) { beforeChange(); s.props[b.dataset.k].splice(+b.dataset.i, 1); changed({ clip: ed.sel, inspector: true }); }
  else if (a === 'pickImage') { ed.imgKey = b.dataset.k; $('#imgFile').click(); }
  else if (a === 'removeImage' && s) { beforeChange(); s.props[b.dataset.k] = ''; changed({ clip: ed.sel, inspector: true }); }
  else if (a === 'pickAvatar' && s) {
    const av = b.dataset.id ? avatarData(state.avatars.find((x) => x.id === b.dataset.id)) : null;
    if ((s.props.avatar?.id || null) === (av?.id || null)) return;
    beforeChange(); s.props.avatar = av;
    if (s.props.video && s.props.videoKey !== videoKey(s.props)) { s.props.video = ''; toast('La vidéo IA a été retirée : l’avatar a changé.'); }
    reloadAssets().then(() => changed({ clip: ed.sel, inspector: true }));
  }
  else if (a === 'newAvatar') {
    const onSaved = (av) => { if (!av || !ed) return; beforeChange(); curScene().props.avatar = avatarData(av); reloadAssets().then(() => changed({ clip: ed.sel, inspector: true })); };
    openModal(`<div class="dlg"><div class="dlg-head"><div><h2>Nouvel avatar</h2><p>Quel type de présentateur ?</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
      <div class="source-row three"><button class="source-btn" data-kind="galerie">${ic('avatars')}Galerie<span>${PRESETS.length} personnages cartoon prêts à l’emploi</span></button>
      <button class="source-btn" data-kind="illustre">${ic('edit')}Créer de zéro<span>Espèce, visage, cheveux, tenue, accessoires</span></button>
      <button class="source-btn" data-kind="photo">${ic('spark')}Photo réaliste<span>Une vraie personne qui parle, par IA</span></button></div></div>`, {
      size: 'mid',
      onMount: (m) => $$('[data-kind]', m).forEach((x) => x.addEventListener('click', () => (x.dataset.kind === 'photo' ? photoAvatarDialog(null, onSaved) : x.dataset.kind === 'galerie' ? galleryDialog(onSaved) : illustratedDialog(null, onSaved)))),
    });
  }
  else if (a === 'recordVoice' && s) { const sid = s.id; recordDialog(s.props.script).then(async (wav) => { if (wav) await storeVoice(sid, wav, 'voix-enregistree'); }); }
  else if (a === 'uploadVoice' && s) {
    const sid = s.id, inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { toast('Préparation de l’audio…'); await storeVoice(sid, await toWav(f), f.name); } catch { toast('Fichier audio illisible.', 'error'); } };
    inp.click();
  }
  else if (a === 'removeVoice' && s) { beforeChange(); s.props.voice = ''; s.props.video = ''; reloadAssets().then(() => changed({ clip: ed.sel, inspector: true })); }
  else if (a === 'playVoice' && s) {
    const vo = ed.assets.voices?.[s.props.voice]; if (!vo) return;
    if (!vo.el.paused) { vo.el.pause(); b.innerHTML = ic('play'); return; }
    setPlaying(false); vo.el.currentTime = 0; vo.el.play(); b.innerHTML = ic('pause');
    vo.el.onended = () => { b.innerHTML = ic('play'); };
  }
  else if (a === 'freeLang' && s) { beforeChange(); s.props.freeVoice = FREE_VOICES.find((fv) => fv.lang === b.dataset.lang).key; changed({ inspector: true }); }
  else if (a === 'freeVoice' && s) {
    const text = (s.props.script || '').trim(); if (!text) return toast('Écris d’abord le texte prononcé.');
    const sid = s.id, key = s.props.freeVoice || FREE_VOICES[0].key, speed = s.props.freeSpeed || 1;
    b.disabled = true; b.innerHTML = '<span class="spinner"></span>Génération…';
    const st = $('#freeStatus');
    const t0 = performance.now();
    freeTts(text, key, speed, (p) => {
      const el = $('#freeStatus'); if (!el) return;
      el.textContent = p.phase === 'download' ? `Téléchargement de la voix, ${Math.round(p.ratio * 100)} %. Ça n’arrive qu’une fois.` : 'Synthèse de la voix…';
    }).then(async (blob) => {
      const wav = await toWav(blob);
      const fv = FREE_VOICES.find((x) => x.key === key);
      await storeVoice(sid, wav, `voix-gratuite-${(fv?.label || 'piper').split(',')[0].toLowerCase()}`);
      const el = $('#freeStatus'); if (el) el.textContent = `Voix générée en ${Math.max(1, Math.round((performance.now() - t0) / 1000))} s. Crédit : ${fv?.credit}.`;
    }).catch((err) => {
      console.error(err);
      toast('La voix gratuite n’a pas pu être générée. Vérifie ta connexion au premier usage, puis réessaie.', 'error');
      const el = $('#freeStatus'); if (el) el.textContent = `Échec : ${err.message || err}`;
      const btn = $('[data-ed="freeVoice"]'); if (btn) { btn.disabled = false; btn.innerHTML = `${ic('play')}Générer`; }
    });
  }
  else if (a === 'ttsVoice' && s) startJob(s, 'voiceJob', { model: 'tts', text: s.props.script, voice: s.props.ttsVoice || 'Aria' });
  else if (a === 'genVideo' && s) {
    const vo = ed.assets.voices?.[s.props.voice]; if (!vo) return;
    const model = s.props.model || 'avatar-standard', cost = vo.duration * (model === 'avatar-pro' ? 0.115 : 0.0562);
    confirmBox({ title: 'Générer la vidéo réaliste ?', text: `La photo de ${s.props.avatar?.name || 'l’avatar'} va être animée sur ${vo.duration.toFixed(1).replace('.', ',')} s de voix. Coût estimé : ${fmtUsd(cost)}, facturé par fal.ai.`, ok: `Générer pour ${fmtUsd(cost)}` })
      .then((ok) => { if (ok) startJob(s, 'videoJob', { model, imageMedia: s.props.avatar.photo, audioMedia: s.props.voice, duration: vo.duration, key: videoKey(s.props) }); });
  }
  else if (a === 'addElement') addElementDialog(b.dataset.scope || (ed.tab === 'video' && !ed.selEl ? 'global' : ed.selEl?.scope || 'scene'));
  else if (a === 'selEl') { if (e.target.closest('[data-ed="elHide"],[data-ed="elLock"]')) return; if (b.dataset.id) { setPlaying(false); selectEl(b.dataset.scope, b.dataset.id); const el = selElement(); const it = V.timeline(projForRender()).items[ed.sel]; if (el && it && b.dataset.scope === 'scene') seek(it.start + Math.min(sceneDur() - 0.05, (+el.start || 0) + (+el.anim?.inDelay || 0) + (+el.anim?.inDur || 0.6) + 0.1)); } else selectEl(null, null); }
  else if (a === 'elHide' || a === 'elLock') { e.stopPropagation(); const el = elList(b.dataset.scope).find((x) => x.id === b.dataset.id); if (!el) return; beforeChange(); if (a === 'elHide') el.hidden = !el.hidden; else el.locked = !el.locked; changed({ clip: ed.sel, inspector: true }); renderTracks(); }
  else if (a === 'elDel') { const list = elList(ed.selEl.scope), i = list.findIndex((x) => x.id === ed.selEl.id); if (i < 0) return; beforeChange(); list.splice(i, 1); ed.selEl = null; changed({ clip: ed.sel, film: true, inspector: true }); renderTracks(); toast('Élément supprimé. Ctrl+Z pour annuler.'); }
  else if (a === 'elDup') { const el = selElement(); if (!el) return; beforeChange(); const c = structuredClone(el); c.id = V.newElement(el.type).id; c.x = Math.min(1, (c.x ?? 0.5) + 0.03); c.y = Math.min(1, (c.y ?? 0.5) + 0.03); elList(ed.selEl.scope).push(c); ed.selEl = { scope: ed.selEl.scope, id: c.id }; changed({ clip: ed.sel, inspector: true }); renderTracks(); }
  else if (a === 'elPos') { const el = selElement(); if (!el) return; beforeChange(); el.x = +b.dataset.x; el.y = +b.dataset.y; changed({ clip: ed.sel, inspector: true }); }
  else if (a === 'elFull') { const el = selElement(); if (!el) return; beforeChange(); const c = $('#edCanvas'); el.x = 0.5; el.y = 0.5; el.w = 1; el.rot = 0; if (el.type === 'image' || el.type === 'video' || el.type === 'shape') { el.ar = c.height / c.width; el.radius = 0; if (el.type === 'shape') el.kind = 'rect'; } if (el.type === 'avatar') { el.w = 0.75; el.y = 0.55; } changed({ clip: ed.sel, inspector: true }); }
  else if (a === 'elReplay') { const el = selElement(); if (!el) return; const it = V.timeline(projForRender()).items[ed.sel]; const base = ed.selEl.scope === 'global' ? 0 : it.start; seek(Math.max(0, base + (+el.start || 0) - 0.05)); setPlaying(true); }
  else if (a === 'elAvatar') { const el = selElement(); if (!el) return; beforeChange(); el.avatar = b.dataset.id ? avatarData(state.avatars.find((x) => x.id === b.dataset.id)) : null; changed({ clip: ed.sel, inspector: true }); }
  else if (a === 'replaceMedia') { const el = selElement(); if (!el) return; pickElementMedia(el.type, el).then((props) => { if (!props || !ed) return; beforeChange(); Object.assign(el, props); reloadAssets().then(() => changed({ clip: ed.sel, inspector: true })); }); }
  else if (a === 'fitClip') { const el = selElement(); if (!el) return; beforeChange(); const len = ((el.trimOut ?? el.srcDur ?? 5) - (el.trimIn || 0)) / (el.speed || 1); const D = scopeDur(ed.selEl.scope); el.end = Math.min(D, (+el.start || 0) + len); if (el.end >= D - 0.01) el.end = null; changed({ clip: ed.sel, inspector: true }); renderTracks(); toast(len > D - (+el.start || 0) ? 'Le clip est plus long que la scène : allonge la durée de la scène pour tout voir.' : 'Durée ajustée au clip'); }
  else if (a === 'splitClip') {
    const el = selElement(); if (!el || ed.selEl.scope !== 'scene') return;
    const it = V.timeline(projForRender()).items[ed.sel], lt = ed.time - it.start, st = +el.start || 0, en = el.end == null ? sceneDur() : el.end;
    if (lt <= st + 0.1 || lt >= en - 0.1) return toast('Place la tête de lecture au milieu du clip pour le scinder.');
    beforeChange(); const c = structuredClone(el); c.id = V.newElement('video').id;
    el.end = Math.round(lt * 100) / 100; c.start = el.end; c.trimIn = Math.round(((+el.trimIn || 0) + (lt - st) * (el.speed || 1)) * 100) / 100; c.anim = { ...c.anim, in: 'none', inDelay: 0 }; el.anim = { ...el.anim, out: 'none' };
    elList('scene').push(c); ed.selEl = { scope: 'scene', id: c.id }; changed({ clip: ed.sel, inspector: true }); renderTracks(); toast('Clip scindé en deux');
  }
  else if (a === 'sfxPlay') { const el = selElement(); const id = el?.anim?.sfx || (el?.anim?.in && SFX_FOR_ANIM[el.anim.in]); if (id) renderSfx(id).then((buf) => playBuffer(buf, el.anim?.sfxVol ?? 0.7)); }
  else if (a === 'sfxSuggest') { const el = selElement(); if (!el) return; beforeChange(); el.anim.sfx = SFX_FOR_ANIM[el.anim.in]; reloadAssets().then(() => { changed({ clip: ed.sel, inspector: true }); renderTracks(); renderSfx(el.anim.sfx).then((buf) => playBuffer(buf, el.anim.sfxVol ?? 0.7)); }); }
  else if (a === 'autoSfx') {
    beforeChange(); let n = 0;
    for (const { el } of V.allElements(projForRender())) if (!el.anim?.sfx && el.anim?.in && SFX_FOR_ANIM[el.anim.in]) { el.anim.sfx = SFX_FOR_ANIM[el.anim.in]; el.anim.sfxVol ??= 0.6; n++; }
    reloadAssets().then(() => { changed({ film: true, inspector: true }); renderTracks(); });
    toast(n ? `${plural(n, 'bruitage ajouté', 'bruitages ajoutés')}. Ctrl+Z pour annuler.` : 'Tous les éléments animés ont déjà un son, ou aucun élément n’est animé.', n ? 'ok' : '');
  }
  else if (a === 'elToGlobal' || a === 'elCopyAll') {
    const el = selElement(); if (!el) return; beforeChange();
    if (a === 'elToGlobal') { const i = elList('scene').indexOf(el); elList('scene').splice(i, 1); const it = V.timeline(projForRender()).items[ed.sel]; el.start = 0; el.end = null; (P().data.globals ||= []).push(el); ed.selEl = { scope: 'global', id: el.id }; toast('L’élément apparaît maintenant sur toute la vidéo', 'ok'); }
    else { let n = 0; scenesOf().forEach((sc, i) => { if (i === ed.sel) return; const c = structuredClone(el); c.id = V.newElement(el.type).id; (sc.elements ||= []).push(c); n++; }); toast(`Copié dans ${plural(n, 'autre scène', 'autres scènes')}`, 'ok'); }
    changed({ film: true, inspector: true }); renderTracks();
  }
  else if (a === 'elToScene') { const el = selElement(); if (!el) return; beforeChange(); const g = elList('global'); g.splice(g.indexOf(el), 1); el.start = 0; el.end = null; delete el.exclude; elList('scene').push(el); ed.selEl = { scope: 'scene', id: el.id }; changed({ film: true, inspector: true }); renderTracks(); }
  else if (a === 'syncWords') {
    const el = selElement(), vo = ed.assets.voices?.[curScene().props.voice]; if (!el || !vo) return;
    const words = String(el.text || '').split(/\s+/).filter(Boolean);
    const times = V.estimateTimes(vo, words.map((w) => w.replace(/\*/g, '').length + 2));
    beforeChange(); el.start = Math.max(0, Math.round((V.voiceDelayOf(curScene()) + times[0] - 0.05) * 100) / 100);
    el.anim = { ...el.anim, in: 'words', inDelay: 0, inDur: 0.4 }; el.wordTimes = times.map((t) => Math.round((t - times[0]) * 100) / 100);
    changed({ clip: ed.sel, inspector: true }); renderTracks(); toast(`${plural(words.length, 'mot calé', 'mots calés')} sur la voix (estimation)`, 'ok');
  }
  else if (a === 'syncTitles') {
    const s = curScene(), vo = ed.assets.voices?.[s.props.voice]; if (!vo) return;
    const sentences = String(s.props.script || '').match(/[^.!?…؟]+[.!?…؟]*/g)?.map((x) => x.trim()).filter(Boolean) || [];
    if (!sentences.length) return toast('Écris d’abord le texte prononcé.');
    const times = V.estimateTimes(vo, sentences.map((x) => x.length + 4));
    beforeChange();
    sentences.forEach((txt, i) => {
      const vd = V.voiceDelayOf(s), st = vd + times[i], en = i < sentences.length - 1 ? vd + times[i + 1] - 0.05 : Math.min(sceneDur(), vd + vo.duration + 0.3);
      (s.elements ||= []).push(V.newElement('text', { text: txt, font: 'titre', size: 64, w: 0.8, y: 0.82, start: Math.round(st * 100) / 100, end: Math.round(en * 100) / 100, shadow: true, anim: { ...V.newElement('text').anim, in: 'slideUp', inDur: 0.4, out: 'fade', outDur: 0.25 } }));
    });
    if (s.props.captions) s.props.captions = false;
    changed({ clip: ed.sel, inspector: true }); ed.showTracks = true; $('#tracks').hidden = false; renderTracks();
    toast(`${plural(sentences.length, 'titre synchronisé', 'titres synchronisés')} avec la voix. Ajuste-les dans les pistes.`, 'ok');
  }
  else if (a === 'toggleAudio') { ed.showAudio = !ed.showAudio; $('#atl').hidden = !ed.showAudio; b.classList.toggle('on', ed.showAudio); renderAudio(); fitCanvas(); }
  else if (a === 'toggleTracks') { ed.showTracks = !ed.showTracks; $('#tracks').hidden = !ed.showTracks; b.style.color = ed.showTracks ? '#fff' : ''; renderTracks(); fitCanvas(); }
  else if (a === 'music') musicDialog();
  else if (a === 'musicRemove') { beforeChange(); delete P().data.music; reloadAssets().then(() => { refreshMusicChip(); changed({ inspector: true }); }); }
  else if (a === 'pickFont') fontDialog({ role: b.dataset.role, scope: b.dataset.scope });
  else if (a === 'resetText') {
    beforeChange();
    if (b.dataset.scope === 'scene') delete curScene().text; else delete P().data.text;
    changed(b.dataset.scope === 'scene' ? { clip: ed.sel, inspector: true } : { film: true, inspector: true });
  }
  else if (a === 'editBrand') brandDialog(P().clientId);
  else if (a === 'newBrand') brandDialog();
}
function onInspector(e) {
  const el = e.target, s = curScene();
  if (el.dataset.ttsVoice !== undefined) { if (s) { s.props.ttsVoice = el.value; changed(); } return; }
  if (el.dataset.freeVoice !== undefined) { if (s && e.type === 'change') { s.props.freeVoice = el.value; changed(); const fv = FREE_VOICES.find((x) => x.key === el.value); const st = $('#freeStatus'); if (st && fv) st.textContent = `Voix ${fv.label}. Téléchargement unique au premier usage : ${fv.size}.`; } return; }
  if (el.dataset.freeSpeed !== undefined) { if (s) { s.props.freeSpeed = +el.value; $('#freeSpeedOut').textContent = `×${(+el.value).toFixed(2).replace('.', ',')}`; if (e.type === 'change') changed(); } return; }
  if (el.dataset.elk !== undefined || el.dataset.edExclude !== undefined) {
    const it = selElement(); if (!it) return;
    if (el.dataset.edExclude !== undefined) { if (e.type !== 'change') return; beforeChange(); const ex = new Set(it.exclude || []); if (el.checked) ex.add(curScene().id); else ex.delete(curScene().id); it.exclude = [...ex]; changed(); return; }
    const k = el.dataset.elk;
    let v = el.type === 'checkbox' ? el.checked : el.dataset.num || el.type === 'range' ? +el.value : el.value;
    if (k === 'end' && v >= scopeDur(ed.selEl.scope) - 0.01) v = null;
    if (k === 'weight' || k === 'speed') v = +v;
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color') { if (e.type !== 'change' && el.type !== 'color') return; }
    else if (e.type === 'change' && el.tagName !== 'TEXTAREA') { renderTracks(); return; }
    beforeChange(); setPath(it, k, v);
    const o = $(`[data-elout="${k}"]`); if (o) { const fmts = { size: (x) => `${x} px`, rot: (x) => `${x}°`, spacing: (x) => `${x}`, lineHeight: (x) => (+x).toFixed(2), radius: (x) => `${x}`, ar: (x) => (+x).toFixed(2) }; o.textContent = fmts[k] ? fmts[k](v) : /start|end|Dur|Delay|trim/.test(k) ? sec(v ?? scopeDur(ed.selEl.scope)) : pct(v); }
    if (k === 'font' && FONT_LIBRARY[v]) V.loadFont(v).then(() => { if (ed) ed.dirty = true; });
    const structural = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color';
    if (k === 'anim.sfx') reloadAssets().then(() => { if (v) renderSfx(v).then((buf) => playBuffer(buf, it.anim.sfxVol ?? 0.7)); });
    if (k.startsWith('trim') || k === 'muted' || k === 'volume' || k === 'speed') reloadAssets();
    changed({ clip: ed.selEl.scope === 'scene' ? ed.sel : null, inspector: structural });
    return;
  }
  if (el.dataset.music) {
    const mu = P().data.music; if (!mu) return;
    const k = el.dataset.music;
    if (k === 'duck') { if (e.type !== 'change') return; beforeChange(); mu.duck = el.checked; }
    else { beforeChange(); mu[k] = +el.value; const o = $(`[data-music-out="${k}"]`); if (o) o.textContent = k === 'volume' ? `${Math.round(el.value * 100)} %` : fmtTime(+el.value).slice(0, 5); }
    if (ed.assets.music) { ed.assets.music.volume = mu.volume ?? 0.6; ed.assets.music.offset = mu.offset || 0; ed.assets.music.duck = mu.duck !== false; }
    setStatus('saving'); ed.save(); return;
  }
  if (el.dataset.textscale) {
    if (e.type === 'change') return;
    const sc = el.dataset.scope; if (sc === 'scene' && !s) return;
    beforeChange();
    const t = textTarget(sc), v = Math.round(+el.value * 100) / 100;
    if (v === 1) delete t[el.dataset.textscale]; else t[el.dataset.textscale] = v;
    const o = $(`[data-out="${sc}-${el.dataset.textscale}"]`); if (o) o.textContent = `${Math.round(v * 100)} %`;
    if (sc === 'scene') changed({ clip: ed.sel }); else { ed.dirty = true; redrawAllClips(); setStatus('saving'); ed.save(); }
    return;
  }
  if (el.dataset.video) { beforeChange(); P().data[el.dataset.video] = el.checked; changed(); return; }
  if (!s) return;
  if (el.dataset.k && el.type !== 'file') {
    if (e.type === 'change' && el.tagName !== 'SELECT' && el.type !== 'checkbox') return;
    beforeChange(); s.props[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; changed({ clip: ed.sel });
  } else if (el.dataset.items) {
    if (e.type === 'change') return;
    beforeChange(); s.props[el.dataset.items][+el.dataset.item][el.dataset.ik] = el.value; changed({ clip: ed.sel });
  } else if (el.dataset.common) {
    const k = el.dataset.common;
    if (k === 'duration') { if (e.type === 'change') return; beforeChange(); s.duration = +el.value; $('#durOut').textContent = `${(+el.value).toFixed(1).replace('.', ',')} s`; changed({ film: true }); }
    else if (e.type === 'change') { beforeChange(); s[k] = el.value; changed({ film: true }); }
  }
}
async function onImagePicked(e) {
  const file = e.target.files[0]; e.target.value = '';
  if (!file || !ed) return;
  try {
    const { src, w, h } = await readImage(file);
    let url = '';
    for (const [max, q] of [[1920, 0.84], [1600, 0.8], [1280, 0.76]]) {
      const k = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      url = c.toDataURL('image/jpeg', q);
      if (url.length < 420_000) break;
    }
    const total = JSON.stringify(P().data).length + url.length;
    if (total > 1_750_000) { toast('Ce projet contient déjà trop d’images (2 Mo maximum). Retire une image avant d’en ajouter.', 'error'); return; }
    beforeChange();
    const id = `img_${uid().slice(0, 8)}`;
    P().data.assets[id] = url;
    curScene().props[ed.imgKey || 'image'] = id;
    await reloadAssets();
    changed({ clip: ed.sel, inspector: true });
  } catch { toast('Impossible de lire cette image.', 'error'); }
}
function onEdKey(e) {
  if (!ed || modal.open) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { if (typing && !e.shiftKey && document.activeElement.tagName !== 'SELECT') return; e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); ed.save.flush(); return; }
  if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); exportDialog(); return; }
  if (mod && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    if (ed.audioSel && ed.showAudio) splitAudioAt(ed.audioSel.kind === 'voice' ? 'presenter' : ed.audioSel.kind, ed.audioSel.id, ed.time);
    else if (ed.selEl && selElement()?.type === 'video') splitAudioAt('clip', ed.selEl.id, ed.time);
    else toast('Sélectionne un morceau dans la timeline audio, ou un clip vidéo, pour le couper.');
    return;
  }
  if (typing) return;
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); (ed.selEl ? $('[data-ed="elDup"]') : $('[data-ed="dupScene"]'))?.click(); return; }
  if (ed.selEl && selElement()) {
    const it = selElement();
    if (e.key === 'Escape') { selectEl(null, null); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); $('[data-ed="elDel"]')?.click(); return; }
    if (e.key.startsWith('Arrow') && !it.locked) {
      e.preventDefault(); beforeChange(); const st = e.shiftKey ? 0.02 : 0.004;
      if (e.key === 'ArrowLeft') it.x -= st; if (e.key === 'ArrowRight') it.x += st; if (e.key === 'ArrowUp') it.y -= st; if (e.key === 'ArrowDown') it.y += st;
      changed({ clip: ed.sel }); return;
    }
  }
  if (e.key === ' ') { e.preventDefault(); setPlaying(!ed.playing); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); seek(ed.time + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : 1 / 30)); }
  else if (e.key === 'Home') { seek(0); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement?.closest('.film')) { e.preventDefault(); $('[data-ed="delScene"]')?.click(); }
}

/* ---------- Voix et tâches d'IA ---------- */
const sceneById = (id) => scenesOf().find((x) => x.id === id);
async function storeVoice(sceneId, wav, name) {
  try {
    const id = await uploadMedia(wav, 'audio', name);
    if (!ed) return;
    const sc = sceneById(sceneId); if (!sc) return;
    await applyVoice(sc, id);
    toast('Voix ajoutée', 'ok');
  } catch (e) { toast(e.message, 'error'); }
}
async function applyVoice(sc, mediaId) {
  beforeChange();
  sc.props.voice = mediaId; delete sc.props.voiceJob;
  if (sc.props.video) { sc.props.video = ''; toast('La vidéo IA a été retirée : la voix a changé.'); }
  await reloadAssets();
  if (!ed) return;
  const vo = ed.assets.voices?.[mediaId];
  if (vo) sc.duration = clamp(Math.ceil((vo.duration + V.voiceDelayOf(sc) + 0.9) * 2) / 2, 2, 60);
  changed({ film: true, inspector: true, scrub: true });
}
async function startJob(sc, field, body) {
  try {
    const r = await api('/api/ai/jobs', { method: 'POST', body });
    beforeChange(); sc.props[field] = r.id; changed({ inspector: true });
    toast(field === 'voiceJob' ? 'Génération de la voix lancée' : 'Génération de la vidéo lancée. Ça peut prendre plusieurs minutes.', 'ok');
    ed.save.flush();
  } catch (e) { toast(e.message, 'error'); }
}
let polling = false;
async function pollJobs() {
  if (!ed || polling) return;
  const pending = scenesOf().flatMap((sc) => ['voiceJob', 'videoJob'].filter((f) => sc.props?.[f]).map((f) => ({ sc, f, id: sc.props[f] })));
  if (!pending.length) return;
  polling = true;
  try {
    for (const { sc, f, id } of pending) {
      let j; try { j = await api(`/api/ai/jobs/${id}`); } catch { continue; }
      if (!ed) return;
      const label = j.status === 'running' ? 'Génération en cours…' : `En file d’attente${j.queuePosition ? `, position ${j.queuePosition}` : ''}…`;
      const st = $(f === 'voiceJob' ? '#voiceJobStatus' : '#videoJobStatus'); if (st) st.textContent = `${label} (${fmtDur((Date.now() - j.createdAt) / 1000)})`;
      if (j.status === 'done' && j.media) {
        if (f === 'voiceJob') { await applyVoice(sc, j.media); toast('Voix IA prête', 'ok'); }
        else {
          beforeChange(); sc.props.video = j.media; sc.props.videoKey = j.meta?.key || videoKey(sc.props); delete sc.props.videoJob;
          await reloadAssets(); changed({ clip: scenesOf().indexOf(sc), inspector: true });
          toast('Vidéo de l’avatar prête', 'ok');
        }
        loadAll().catch(() => {});
      } else if (j.status === 'error') {
        beforeChange(); delete sc.props[f]; changed({ inspector: true });
        toast(`Génération échouée : ${j.error || 'erreur inconnue'}`, 'error');
      }
    }
  } finally { polling = false; }
}
function recordDialog(script) {
  return new Promise((resolve) => {
    let rec = null, stream = null, ac = null, raf = 0, timer = 0, t0 = 0, take = null, result = null;
    const cleanup = () => { cancelAnimationFrame(raf); clearInterval(timer); try { rec?.state === 'recording' && rec.stop(); } catch { /* rien */ } stream?.getTracks().forEach((t) => t.stop()); ac?.close().catch(() => {}); stream = null; };
    openModal(`<div class="dlg"><div class="dlg-head"><div><h2>Enregistrer la voix</h2><p>Parle naturellement, à environ 20 cm du micro. Les silences au début et à la fin sont coupés automatiquement.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
      ${script ? `<div class="script-box"><span class="label">À lire</span><p>${esc(script)}</p></div>` : ''}
      <div class="rec-panel"><span class="rec-time" id="recTime">00:00</span><div class="progress" style="flex:1"><i id="recLevel" style="background:var(--ok);transition:width .05s"></i></div></div>
      <audio id="recAudio" controls hidden style="width:100%"></audio>
      <p class="form-error" id="recErr"></p>
      <div class="dlg-foot"><button class="btn" data-close>Annuler</button><button class="btn rec" id="recBtn">${ic('rec')}Démarrer</button><button class="btn primary" id="recUse" hidden>${ic('check')}Utiliser cette prise</button></div></div>`, {
      size: 'mid',
      onClose: () => { cleanup(); resolve(result); },
      onMount: (m) => {
        const btn = $('#recBtn', m);
        btn.addEventListener('click', async () => {
          if (rec?.state === 'recording') { rec.stop(); return; }
          $('#recErr', m).textContent = '';
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
          catch { $('#recErr', m).textContent = 'Accès au micro refusé. Autorise-le dans la barre d’adresse puis réessaie.'; return; }
          ac = new AudioContext(); const an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(stream).connect(an);
          const buf = new Uint8Array(an.fftSize);
          const meter = () => { an.getByteTimeDomainData(buf); let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v - 128)); $('#recLevel', m).style.width = `${Math.min(100, (pk / 128) * 160)}%`; raf = requestAnimationFrame(meter); };
          meter();
          const chunks = [];
          rec = new MediaRecorder(stream);
          rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
          rec.onstop = async () => {
            cleanup(); btn.innerHTML = `${ic('rec')}Recommencer`; $('#recLevel', m).style.width = '0';
            try {
              take = await toWav(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
              const au = $('#recAudio', m); au.src = URL.createObjectURL(take); au.hidden = false; $('#recUse', m).hidden = false;
            } catch { $('#recErr', m).textContent = 'Enregistrement vide ou illisible. Réessaie.'; }
          };
          rec.start(); t0 = Date.now();
          btn.innerHTML = `${ic('stop')}Arrêter`; $('#recUse', m).hidden = true; $('#recAudio', m).hidden = true;
          timer = setInterval(() => { const sec = Math.floor((Date.now() - t0) / 1000); $('#recTime', m).textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; if (sec >= 180) rec.stop(); }, 250);
        });
        $('#recUse', m).addEventListener('click', () => { result = take; closeModal(); });
      },
    });
  });
}

/* ---------- Ajout de scène ---------- */
function sceneDialog() {
  openModal(`<div class="dlg"><div class="dlg-head"><div><h2>Ajouter une scène</h2><p>Elle sera insérée après la scène sélectionnée, aux couleurs du client.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="scene-grid">${Object.entries(SCENES).map(([k, s]) => `<button class="scene-tile" data-hover data-scene="${k}"><canvas></canvas><strong>${esc(s.label)}</strong><span>${esc(s.hint)}</span></button>`).join('')}</div></div>`, {
    size: 'wide',
    onMount: (m) => {
      $$('[data-scene]', m).forEach((b) => {
        const sc = demoize(V.newScene(b.dataset.scene)); sc.id = `pick-${b.dataset.scene}`;
        const assets = { ...ed.assets, images: { ...ed.assets.images, demo: getDemoImage() } };
        live(b.querySelector('canvas'), { project: { scenes: [sc], fadeOut: false }, brand: ed.brand, assets, hoverOnly: true, hero: Math.min(sc.duration * 0.62, 2.6) });
        b.addEventListener('click', () => {
          beforeChange();
          const s = V.newScene(b.dataset.scene); s.id = uid();
          if (s.type === 'libre') s.elements = [V.newElement('text', { text: 'Votre titre', size: 110 })];
          const at = scenesOf().length ? ed.sel + 1 : 0;
          scenesOf().splice(at, 0, s); ed.sel = at;
          closeModal(); changed({ film: true, inspector: true }); seekScene(at);
          setTimeout(() => $('#inspector input, #inspector textarea')?.focus(), 50);
        });
      });
    },
  });
}

/* ---------- Export ---------- */
function exportDialog() {
  if (!ed) return;
  setPlaying(false); ed.save.flush();
  const p = P(), c = clientById(p.clientId);
  const ok = V.supportsExport();
  let music = null;
  openModal(`<form class="dlg" data-local id="exportForm">
    <div class="dlg-head"><div><h2>Exporter en MP4</h2><p>Le rendu se fait sur cet ordinateur. Garde l’onglet ouvert pendant l’export.</p></div><button class="icon-btn" type="button" data-close aria-label="Fermer">${ic('x')}</button></div>
    ${ok ? '' : '<p class="form-error">Ce navigateur ne sait pas encoder de vidéo. Ouvre Cadence dans Google Chrome ou Microsoft Edge à jour.</p>'}
    <div class="field"><span>Formats, un fichier par format coché</span>${fmtOptions('checkbox', [p.format])}</div>
    <div class="grid-2">
      <div class="field"><span>Qualité</span><div class="segmented" id="qual">${Object.entries(QUALITIES).map(([k, q]) => `<button type="button" data-q="${k}" aria-pressed="${k === 'fhd'}">${q.label.split(' ')[1]}</button>`).join('')}</div></div>
      <div class="field"><span>Fluidité</span><div class="segmented" id="fps"><button type="button" data-fps="30" aria-pressed="true">30 i/s</button><button type="button" data-fps="60" aria-pressed="false">60 i/s</button></div></div>
    </div>
    <div class="field"><span>Musique</span>
      <div class="row" style="padding:10px 12px;border-radius:10px;background:var(--surface-2)">${ic('music')}<span style="flex:1">${p.data.music ? `<b>${esc(musicLabel())}</b>, volume ${Math.round((p.data.music.volume ?? 0.6) * 100)} %` : 'Aucune musique'}</span><button class="btn ghost" type="button" data-close-music>${p.data.music ? 'Modifier' : 'Ajouter'}</button></div>
    </div>
    <p class="form-error" id="exErr"></p>
    <div class="dlg-foot"><span class="hint">${esc(c?.name || 'Sans client')}, ${fmtDur(V.timeline(p.data).total)}</span><span class="spacer"></span><button class="btn" type="button" data-close>Annuler</button>
      <button class="btn rec" ${ok ? '' : 'disabled'}>${ic('rec')}Lancer l’export</button></div></form>`, {
    size: 'mid',
    onMount: (m) => {
      const form = $('#exportForm', m);
      const seg = (id, attr) => $(`#${id}`, m).addEventListener('click', (e) => { const b = e.target.closest(`[${attr}]`); if (!b) return; $$(`#${id} button`, m).forEach((x) => x.setAttribute('aria-pressed', x === b)); });
      seg('qual', 'data-q'); seg('fps', 'data-fps');
      $('[data-close-music]', m).addEventListener('click', () => { closeModal(); setTimeout(musicDialog, 50); });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formats = $$('input[name="fmt"]:checked', m).map((x) => x.value);
        if (!formats.length) { $('#exErr', m).textContent = 'Coche au moins un format.'; return; }
        runExport({ formats, quality: $('#qual [aria-pressed="true"]', m).dataset.q, fps: +$('#fps [aria-pressed="true"]', m).dataset.fps, music: null, volume: 0.6 });
      });
    },
  });
}
async function runExport({ formats, quality, fps, music, volume }) {
  const p = P(), c = clientById(p.clientId);
  const ctl = new AbortController();
  modal.dataset.locked = '1';
  const results = [];
  modal.innerHTML = `<div class="dlg">
    <div class="dlg-head"><div><h2 id="exTitle"><span class="rec-dot"></span> Rendu en cours</h2><p id="exSub"></p></div></div>
    <div class="export-preview" id="exPrev"><canvas id="exCanvas"></canvas></div>
    <div style="display:grid;gap:8px"><div class="progress"><i id="exBar"></i></div><div class="row" style="justify-content:space-between"><span class="hint" id="exInfo">Préparation…</span><span class="hint" id="exPct">0 %</span></div></div>
    <div id="exResults" style="display:grid;gap:8px"></div>
    <div class="dlg-foot" id="exFoot"><button class="btn" id="exCancel">Annuler l’export</button></div></div>`;
  $('#exCancel').addEventListener('click', () => ctl.abort());
  const pc = $('#exCanvas');
  try {
    $('#exInfo').textContent = 'Chargement des voix et vidéos…';
    const assets = await V.prepareAssets(p.data, ed.brand, { media: fetchMedia });
    for (let i = 0; i < formats.length; i++) {
      const fmt = formats[i], size = V.exportSize(fmt, quality);
      $('#exSub').textContent = `${formats.length > 1 ? `Fichier ${i + 1} sur ${formats.length}, ` : ''}${fmt}, ${size.w}×${size.h}, ${fps} images par seconde`;
      const box = $('#exPrev').getBoundingClientRect();
      const k = Math.min(box.width / size.w, box.height / size.h);
      pc.width = Math.round(size.w * k * Math.min(2, devicePixelRatio)); pc.height = Math.round(size.h * k * Math.min(2, devicePixelRatio));
      pc.style.width = `${Math.round(size.w * k)}px`; pc.style.height = `${Math.round(size.h * k)}px`;
      const res = await V.exportVideo({
        project: { ...p.data }, brand: ed.brand, assets, format: fmt, quality, fps, music, volume, signal: ctl.signal,
        onProgress: (pr) => {
          const tot = (i + pr.progress) / formats.length;
          $('#exBar').style.width = `${tot * 100}%`; $('#exPct').textContent = `${Math.floor(tot * 100)} %`;
          if (pr.phase === 'video') {
            $('#exInfo').textContent = `Image ${pr.frame} sur ${pr.frames}${pr.eta ? `, environ ${fmtDur(pr.eta)} restantes` : ''}`;
            if (pr.canvas) pc.getContext('2d').drawImage(pr.canvas, 0, 0, pc.width, pc.height);
          } else if (pr.phase === 'audio') $('#exInfo').textContent = 'Encodage du son…';
          else if (pr.phase === 'prepare') $('#exInfo').textContent = 'Mixage des voix et de la musique…';
        },
      });
      const name = `${slug(c?.name || 'cadence')}-${slug(p.name)}-${fmt.replace(':', 'x')}-${Math.min(res.width, res.height)}p.mp4`;
      const url = URL.createObjectURL(res.blob);
      results.push({ fmt, url, name, size: res.blob.size, codec: res.codec });
      download(url, name);
      api('/api/exports', { method: 'POST', body: { projectId: p.id, projectName: p.name, clientId: p.clientId, format: fmt, quality, duration: res.duration, size: res.blob.size } }).catch(() => {});
      $('#exResults').insertAdjacentHTML('beforeend', `<div class="result"><span style="color:var(--ok)">${ic('check')}</span><div class="grow"><b>${esc(fmt)}</b> <span class="hint">${esc(name)}, ${fmtBytes(res.blob.size)}${res.codec !== 'avc' ? `, codec ${res.codec.toUpperCase()}` : ''}</span></div><a class="btn" href="${url}" download="${esc(name)}">${ic('exports')}Télécharger</a>${D.driveAvailable() ? `<button class="btn" data-drive-up="${results.length - 1}">${ic('cloud')}Sur Google Drive</button>` : ''}</div>`);
    }
    delete modal.dataset.locked;
    $('#exTitle').innerHTML = `${ic('check')} Vidéo${results.length > 1 ? 's' : ''} prête${results.length > 1 ? 's' : ''}`;
    $('#exSub').textContent = 'Le téléchargement a démarré. Tu peux aussi les retélécharger ci-dessous.';
    $('#exInfo').textContent = 'Terminé'; $('#exPct').textContent = '100 %'; $('#exBar').style.width = '100%';
    const last = results[results.length - 1];
    $('#exPrev').innerHTML = `<video src="${last.url}" controls autoplay muted playsinline></video>`;
    $('#exFoot').innerHTML = '<button class="btn primary" data-close>Terminé</button>';
    $('#exResults').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-drive-up]'); if (!b) return;
      const r = results[+b.dataset.driveUp]; if (!r) return;
      try {
        if (!D.driveConnected()) await D.connectDrive();
        b.disabled = true;
        const blob = await (await fetch(r.url)).blob();
        const f = await D.uploadToDrive(blob, r.name, { onProgress: (p) => { b.innerHTML = `<span class="spinner"></span>${Math.round(p * 100)} %`; } });
        b.outerHTML = `<a class="btn" href="${esc(f.webViewLink || D.driveViewUrl(f.id))}" target="_blank" rel="noopener">${ic('check')}Ouvrir dans Drive</a>`;
        toast('Vidéo enregistrée sur ton Google Drive', 'ok');
      } catch (err) { b.disabled = false; b.innerHTML = `${ic('cloud')}Sur Google Drive`; toast(err.message, 'error'); }
    });
    toast(results.length > 1 ? `${results.length} vidéos exportées` : 'Vidéo exportée', 'ok');
    modal._onClose = () => setTimeout(() => results.forEach((r) => URL.revokeObjectURL(r.url)), 60_000);
  } catch (err) {
    delete modal.dataset.locked;
    if (err.name === 'AbortError') { closeModal(); toast('Export annulé'); return; }
    $('#exTitle').textContent = 'L’export a échoué';
    $('#exSub').textContent = err.message || String(err);
    $('#exFoot').innerHTML = '<button class="btn" data-close>Fermer</button>';
  }
}
function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); }

/* =========================================================
   Démarrage
   ========================================================= */
addEventListener('beforeunload', () => { if (ed) ed.save.flush(); });
boot();
