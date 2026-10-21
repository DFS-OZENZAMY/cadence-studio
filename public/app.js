/* Cadence — application */
import * as V from './engine.js';
import { drawCharacter, SKINS, FURS, HAIR_COLORS, EYE_COLORS, OUTFIT_COLORS, OPTIONS, PRESETS, DEFAULT_CHAR, normChar, randomChar } from './avatar.js';
const { FORMATS, QUALITIES, FONTS, AMBIANCES, TRANSITIONS, BACKGROUNDS, SCENES, TEMPLATES, DEMO_BRAND } = V;

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
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
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
function previewProject(tplKey) {
  const scenes = TEMPLATES[tplKey].scenes();
  scenes.forEach((s, i) => { s.id = `${tplKey}-${i}`; if (s.type === 'image') s.props.image = 'demo'; });
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
const state = { studio: 'Cadence', clients: [], projects: [], avatars: [], ai: { configured: false, monthSpent: 0 }, filter: 'all', salt: '', authed: false };
const clientById = (id) => state.clients.find((c) => c.id === id);
const brandOf = (clientId) => { const c = clientById(clientId); return c ? V.normBrand({ ...c.brand, name: c.name }) : V.normBrand(DEMO_BRAND); };

/* =========================================================
   Accès (installation et connexion)
   ========================================================= */
async function boot() {
  try {
    const s = await api('/api/auth/status');
    state.salt = s.salt; state.studio = s.studio; state.needsCode = s.needsCode;
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
  const [clients, projects, avatars, ai] = await Promise.all([api('/api/clients'), api('/api/projects'), api('/api/avatars'), api('/api/ai/status').catch(() => state.ai)]);
  state.clients = clients; state.projects = projects; state.avatars = avatars; state.ai = ai;
}

/* =========================================================
   Navigation
   ========================================================= */
const NAV = [['projets', 'Projets', 'projects'], ['clients', 'Clients', 'clients'], ['avatars', 'Avatars', 'avatars'], ['modeles', 'Modèles', 'templates'], ['exports', 'Exports', 'exports'], ['reglages', 'Réglages', 'settings']];
function route() {
  if (!state.authed) return;
  const h = location.hash.replace(/^#\/?/, '');
  const [page, id] = h.split('/');
  if (page === 'editeur' && id) return openEditor(id);
  stopEditor();
  const p = NAV.some(([k]) => k === page) ? page : 'projets';
  const counts = { projets: state.projects.length, clients: state.clients.length, avatars: state.avatars.length };
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
  const st = { tpl: preset || 'lancement', client: state.filter !== 'all' && state.filter !== 'none' ? state.filter : (state.clients[0]?.id || ''), format: '16:9', step: preset ? 2 : 1 };
  const draw = () => {
    if (st.step === 1) {
      modal.innerHTML = `<div class="dlg">
        <div class="dlg-head"><div><h2>Choisis un modèle</h2><p>Survole un modèle pour le voir s’animer. Tout reste modifiable ensuite.</p></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${Object.entries(TEMPLATES).map(([k, t]) => `
          <button class="tpl-card" data-hover data-tpl="${k}" aria-pressed="${st.tpl === k}"><div class="thumb"><canvas></canvas></div>
          <div class="card-body"><strong>${esc(t.label)}</strong><span class="card-meta">${esc(t.hint)}</span></div></button>`).join('')}</div>
        <div class="dlg-foot"><div class="steps-ind"><i class="on"></i><i></i></div><span class="spacer"></span><button class="btn" data-close>Annuler</button><button class="btn primary" data-next>Continuer</button></div></div>`;
      mountTplPreviews(modal, st.client);
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
   Page : Modèles
   ========================================================= */
PAGES.modeles = () => `
  <header class="page-head"><div><h1>Modèles</h1><p class="sub">Des structures de vidéo éprouvées. Survole pour voir l’animation${state.clients[0] ? ` aux couleurs de ${esc(state.clients[0].name)}` : ''}.</p></div></header>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${Object.entries(TEMPLATES).map(([k, t]) => {
    const tl = V.timeline({ scenes: t.scenes() });
    return `<button class="tpl-card" data-hover data-tpl="${k}" data-act="useTpl"><div class="thumb"><canvas></canvas><span class="badge dur">${fmtDur(tl.total)}</span></div>
      <div class="card-body"><strong>${esc(t.label)}</strong><span class="card-meta">${esc(t.hint)}, ${plural(tl.items.length, 'scène', 'scènes')}</span></div></button>`;
  }).join('')}</div>`;
AFTER.modeles = () => mountTplPreviews($('#view'), state.clients[0]?.id);

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
        <div class="ed-stage" id="edStage"><canvas id="edCanvas"></canvas></div>
        <div class="ed-transport">
          <button class="icon-btn" data-ed="toStart" title="Revenir au début (Début)" aria-label="Revenir au début">${ic('start')}</button>
          <button class="play-btn" data-ed="play" id="playBtn" aria-label="Lecture">${ic('play')}</button>
          <span class="timecode" id="timecode">00:00.0 <span>/ 00:00.0</span></span>
          <div class="scrub" id="scrub" role="slider" aria-label="Position" tabindex="0"><div class="scrub-track" id="scrubTrack"></div><div class="scrub-fill" id="scrubFill"></div><div class="scrub-knob" id="scrubKnob"></div></div>
          <button class="icon-btn" data-ed="loop" id="loopBtn" title="Lecture en boucle" aria-label="Boucle" style="color:${ed.loop ? '#fff' : ''}">${ic('loop')}</button>
        </div>
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
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = Math.min(f.w, Math.round(cw * dpr)); c.height = Math.round(c.width * f.h / f.w);
  ed.dirty = true;
}
function loop(ts) {
  if (!ed) return;
  const dt = ed.last ? (ts - ed.last) / 1000 : 0; ed.last = ts;
  const total = V.timeline(projForRender()).total;
  if (ed.playing) {
    ed.time += dt;
    if (ed.time >= total) { if (ed.loop) ed.time = 0; else { ed.time = total; setPlaying(false); } }
    ed.dirty = true;
  }
  V.syncPreview(projForRender(), ed.assets, ed.time, ed.playing, () => { if (ed) ed.dirty = true; });
  if (ed.dirty) {
    const c = $('#edCanvas');
    if (c) V.renderFrame(c.getContext('2d'), c.width, c.height, projForRender(), ed.brand, ed.assets, ed.time);
    updateTransport(total);
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
  const b = $('#playBtn'); if (b) { b.innerHTML = ic(v ? 'pause' : 'play'); b.setAttribute('aria-label', v ? 'Pause' : 'Lecture'); }
  ed.last = 0;
}
function seek(t) { const total = V.timeline(projForRender()).total; ed.time = clamp(t, 0, total); ed.dirty = true; }
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
  V.renderFrame(c.getContext('2d'), c.width, c.height, { scenes: [s], fadeOut: false, assets: P().data.assets }, ed.brand, ed.assets, hero);
}
const redrawClip = debounce((i) => { const c = $(`.clip[data-i="${i}"] canvas`); if (c) drawClip(c, i); }, 250);

/* ---------- Inspecteur ---------- */
function renderInspector() {
  const box = $('#inspector'); if (!box || !ed) return;
  $$('.ed-tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === ed.tab));
  if (ed.tab === 'video') { box.innerHTML = videoPanel(); return; }
  const s = curScene();
  if (!s) { box.innerHTML = `<div class="empty"><span>Ajoute une première scène avec le bouton « Ajouter une scène ».</span></div>`; return; }
  const def = SCENES[s.type];
  box.innerHTML = `
    <div class="insp-head"><div><h2>${esc(def.label)}</h2><p>Scène ${ed.sel + 1} sur ${scenesOf().length}. ${esc(def.hint)}.</p></div>
      <div class="row" style="gap:2px"><button class="icon-btn" data-ed="dupScene" title="Dupliquer (Ctrl+D)" aria-label="Dupliquer la scène">${ic('copy')}</button>
      <button class="icon-btn" data-ed="delScene" title="Supprimer (Suppr)" aria-label="Supprimer la scène">${ic('trash')}</button></div></div>
    ${def.fields.map((f) => fieldHtml(f, s.props)).join('')}
    ${aiVideoSection(s)}
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
      <span class="hint" style="color:var(--stage-muted)">${state.ai.configured ? `Lit le texte prononcé avec une voix naturelle, environ ${fmtUsd(Math.max(0.01, (chars / 1000) * 0.1))}.` : 'Voix IA : ajoute une clé fal.ai dans Réglages.'}</span>
    </div></div>`;
  }
  if (f.type === 'text') return `<label class="field"><span>${esc(f.label)}</span><input data-k="${f.k}" value="${esc(v ?? '')}" placeholder="${esc(f.placeholder || '')}"></label>`;
  if (f.type === 'textarea') return `<label class="field"><span>${esc(f.label)}</span><textarea data-k="${f.k}" rows="${f.rows || 2}" placeholder="${esc(f.placeholder || '')}">${esc(v ?? '')}</textarea></label>`;
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
}
function selectScene(i, doSeek = false) {
  ed.sel = clamp(i, 0, scenesOf().length - 1);
  $$('.clip').forEach((c) => c.setAttribute('aria-selected', +c.dataset.i === ed.sel));
  if (ed.tab !== 'scene') ed.tab = 'scene';
  renderInspector(); renderScrub();
  if (doSeek && !ed.playing) seekScene(ed.sel);
}
function onEdClick(e) {
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
  else if (a === 'ttsVoice' && s) startJob(s, 'voiceJob', { model: 'tts', text: s.props.script, voice: s.props.ttsVoice || 'Aria' });
  else if (a === 'genVideo' && s) {
    const vo = ed.assets.voices?.[s.props.voice]; if (!vo) return;
    const model = s.props.model || 'avatar-standard', cost = vo.duration * (model === 'avatar-pro' ? 0.115 : 0.0562);
    confirmBox({ title: 'Générer la vidéo réaliste ?', text: `La photo de ${s.props.avatar?.name || 'l’avatar'} va être animée sur ${vo.duration.toFixed(1).replace('.', ',')} s de voix. Coût estimé : ${fmtUsd(cost)}, facturé par fal.ai.`, ok: `Générer pour ${fmtUsd(cost)}` })
      .then((ok) => { if (ok) startJob(s, 'videoJob', { model, imageMedia: s.props.avatar.photo, audioMedia: s.props.voice, duration: vo.duration, key: videoKey(s.props) }); });
  }
  else if (a === 'editBrand') brandDialog(P().clientId);
  else if (a === 'newBrand') brandDialog();
}
function onInspector(e) {
  const el = e.target, s = curScene();
  if (el.dataset.ttsVoice !== undefined) { if (s) { s.props.ttsVoice = el.value; changed(); } return; }
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
  if (typing) return;
  if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); $('[data-ed="dupScene"]')?.click(); return; }
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
  if (vo) sc.duration = clamp(Math.ceil((vo.duration + V.VOICE_DELAY + 0.9) * 2) / 2, 2, 60);
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
        const sc = V.newScene(b.dataset.scene); sc.id = `pick-${b.dataset.scene}`;
        if (sc.type === 'image') sc.props.image = 'demo';
        const assets = { ...ed.assets, images: { ...ed.assets.images, demo: getDemoImage() } };
        live(b.querySelector('canvas'), { project: { scenes: [sc], fadeOut: false }, brand: ed.brand, assets, hoverOnly: true, hero: Math.min(sc.duration * 0.62, 2.6) });
        b.addEventListener('click', () => {
          beforeChange();
          const s = V.newScene(b.dataset.scene); s.id = uid();
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
    <div class="field"><span>Musique (facultatif)</span>
      <div class="row" style="flex-wrap:wrap"><button class="btn" type="button" id="musicBtn">${ic('music')}Choisir un fichier audio</button><span class="hint" id="musicName">MP3, WAV ou M4A. Fondu automatique au début et à la fin.</span></div>
      <input type="file" accept="audio/*" id="musicFile" hidden>
      <div class="range-row" id="volRow" hidden><span class="hint">Volume</span><input type="range" min="0" max="1" step="0.05" value="0.8" name="volume"><output id="volOut">80 %</output></div>
    </div>
    <p class="form-error" id="exErr"></p>
    <div class="dlg-foot"><span class="hint">${esc(c?.name || 'Sans client')}, ${fmtDur(V.timeline(p.data).total)}</span><span class="spacer"></span><button class="btn" type="button" data-close>Annuler</button>
      <button class="btn rec" ${ok ? '' : 'disabled'}>${ic('rec')}Lancer l’export</button></div></form>`, {
    size: 'mid',
    onMount: (m) => {
      const form = $('#exportForm', m);
      const seg = (id, attr) => $(`#${id}`, m).addEventListener('click', (e) => { const b = e.target.closest(`[${attr}]`); if (!b) return; $$(`#${id} button`, m).forEach((x) => x.setAttribute('aria-pressed', x === b)); });
      seg('qual', 'data-q'); seg('fps', 'data-fps');
      $('#musicBtn', m).addEventListener('click', () => $('#musicFile', m).click());
      $('#musicFile', m).addEventListener('change', (e) => { music = e.target.files[0] || null; $('#musicName', m).textContent = music ? music.name : ''; $('#volRow', m).hidden = !music; });
      form.volume.addEventListener('input', () => { $('#volOut', m).textContent = `${Math.round(form.volume.value * 100)} %`; });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formats = $$('input[name="fmt"]:checked', m).map((x) => x.value);
        if (!formats.length) { $('#exErr', m).textContent = 'Coche au moins un format.'; return; }
        runExport({ formats, quality: $('#qual [aria-pressed="true"]', m).dataset.q, fps: +$('#fps [aria-pressed="true"]', m).dataset.fps, music, volume: +form.volume.value });
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
      $('#exResults').insertAdjacentHTML('beforeend', `<div class="result"><span style="color:var(--ok)">${ic('check')}</span><div class="grow"><b>${esc(fmt)}</b> <span class="hint">${esc(name)}, ${fmtBytes(res.blob.size)}${res.codec !== 'avc' ? `, codec ${res.codec.toUpperCase()}` : ''}</span></div><a class="btn" href="${url}" download="${esc(name)}">${ic('exports')}Télécharger</a></div>`);
    }
    delete modal.dataset.locked;
    $('#exTitle').innerHTML = `${ic('check')} Vidéo${results.length > 1 ? 's' : ''} prête${results.length > 1 ? 's' : ''}`;
    $('#exSub').textContent = 'Le téléchargement a démarré. Tu peux aussi les retélécharger ci-dessous.';
    $('#exInfo').textContent = 'Terminé'; $('#exPct').textContent = '100 %'; $('#exBar').style.width = '100%';
    const last = results[results.length - 1];
    $('#exPrev').innerHTML = `<video src="${last.url}" controls autoplay muted playsinline></video>`;
    $('#exFoot').innerHTML = '<button class="btn primary" data-close>Terminé</button>';
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
