/**
 * Cadence — Worker Cloudflare
 * Sert l'application (public/) et l'API : accès protégé, clients (chartes
 * graphiques), projets vidéo et historique des exports, stockés dans D1.
 * Le rendu vidéo se fait dans le navigateur (WebCodecs) : le Worker reste léger.
 */
const MAX_ROW = 1_900_000;
const SESSION_DAYS = 30;
const COOKIE = 'cadence_session';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS attempts (ip TEXT PRIMARY KEY, fails INTEGER NOT NULL, window_start INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, client_id TEXT, name TEXT NOT NULL, format TEXT NOT NULL, data TEXT NOT NULL, thumb TEXT, duration REAL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS projects_updated ON projects(updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, kind TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, chunks INTEGER NOT NULL, name TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS media_chunks (media_id TEXT NOT NULL, idx INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (media_id, idx))`,
  `CREATE TABLE IF NOT EXISTS avatars (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ai_jobs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL, status_url TEXT, response_url TEXT, result_media TEXT, result_meta TEXT, cost REAL, error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS music (id TEXT PRIMARY KEY, name TEXT NOT NULL, media_id TEXT NOT NULL, duration REAL, size INTEGER, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS exports (id TEXT PRIMARY KEY, project_id TEXT, project_name TEXT, client_id TEXT, format TEXT, quality TEXT, duration REAL, size INTEGER, created_at INTEGER NOT NULL)`,
];
let ready = null;
const ensure = (db) => (ready ||= db.batch(SCHEMA.map((s) => db.prepare(s))).catch((e) => { ready = null; throw e; }));

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
const fail = (msg, status = 400) => json({ error: msg }, status);
class HttpError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const randomHex = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
const uid = () => crypto.randomUUID();
function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const isHash = (h) => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h);

async function body(req) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_ROW + 50_000) throw new HttpError('Contenu trop volumineux (2 Mo maximum par projet). Allège les images.', 413);
  try { return await req.json(); } catch { throw new HttpError('Requête invalide', 400); }
}
function cookie(req, name) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}
const setCookie = (token, maxAge) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

async function setting(db, key) { return (await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first())?.value ?? null; }
async function putSetting(db, key, value) { await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, value).run(); }

async function session(req, db) {
  const tok = cookie(req, COOKIE);
  if (!tok || !/^[0-9a-f]{64}$/.test(tok)) return null;
  const row = await db.prepare('SELECT expires_at FROM sessions WHERE token_hash = ?').bind(await sha256(tok)).first();
  return row && row.expires_at > Date.now() ? tok : null;
}
async function newSession(db) {
  const tok = randomHex(32), now = Date.now();
  await db.batch([
    db.prepare('INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)').bind(await sha256(tok), now, now + SESSION_DAYS * 864e5),
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ]);
  return setCookie(tok, SESSION_DAYS * 86400);
}
async function throttle(db, ip) {
  const r = await db.prepare('SELECT fails, window_start FROM attempts WHERE ip = ?').bind(ip).first();
  if (r && r.fails >= 8 && Date.now() - r.window_start < 15 * 60e3) throw new HttpError('Trop d’essais. Réessaie dans 15 minutes.', 429);
}
async function failed(db, ip) {
  const now = Date.now();
  await db.prepare(`INSERT INTO attempts (ip, fails, window_start) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET
    fails = CASE WHEN ? - window_start > 900000 THEN 1 ELSE fails + 1 END,
    window_start = CASE WHEN ? - window_start > 900000 THEN ? ELSE window_start END`).bind(ip, now, now, now, now).run();
}

/* ---------- Validation ---------- */
const FORMATS = ['16:9', '9:16', '1:1', '4:5'];
function str(v, max, label) { const s = String(v ?? '').trim(); if (!s) throw new HttpError(`${label} requis`, 400); if (s.length > max) throw new HttpError(`${label} trop long`, 400); return s; }
function payload(v) { const s = JSON.stringify(v ?? {}); if (s.length > MAX_ROW) throw new HttpError('Projet trop volumineux (2 Mo maximum). Réduis la taille ou le nombre d’images.', 413); return s; }
function thumbOk(t) { if (t == null) return null; if (typeof t !== 'string' || !t.startsWith('data:image/') || t.length > 200_000) throw new HttpError('Miniature invalide', 400); return t; }

/* ---------- Médias (stockés en morceaux dans D1) ---------- */
const CHUNK = 900_000;
const MAX_MEDIA = 60_000_000;
async function storeMedia(db, bytes, mime, kind, name = '') {
  if (bytes.byteLength > MAX_MEDIA) throw new HttpError('Fichier trop volumineux (60 Mo maximum)', 413);
  const id = uid(), u8 = new Uint8Array(bytes), n = Math.max(1, Math.ceil(u8.length / CHUNK));
  const stmts = [db.prepare('INSERT INTO media (id, kind, mime, size, chunks, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, kind, mime, u8.length, n, String(name).slice(0, 120), Date.now())];
  for (let i = 0; i < n; i++) stmts.push(db.prepare('INSERT INTO media_chunks (media_id, idx, data) VALUES (?, ?, ?)').bind(id, i, u8.subarray(i * CHUNK, (i + 1) * CHUNK)));
  for (let i = 0; i < stmts.length; i += 20) await db.batch(stmts.slice(i, i + 20));
  return { id, size: u8.length, mime, kind };
}
async function readMedia(db, id) {
  const m = await db.prepare('SELECT * FROM media WHERE id = ?').bind(id).first();
  if (!m) return null;
  const out = new Uint8Array(m.size); let off = 0;
  for (let i = 0; i < m.chunks; i++) {
    const r = await db.prepare('SELECT data FROM media_chunks WHERE media_id = ? AND idx = ?').bind(id, i).first();
    const part = r.data instanceof ArrayBuffer ? new Uint8Array(r.data) : new Uint8Array(r.data);
    out.set(part, off); off += part.length;
  }
  return { meta: m, bytes: out };
}
async function hmacHex(secret, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}
async function mediaSecret(db) { let s = await setting(db, 'media_secret'); if (!s) { s = randomHex(32); await putSetting(db, 'media_secret', s); } return s; }
/** URL publique temporaire (2 h) pour que le fournisseur d'IA puisse lire un fichier. */
async function mediaUrl(db, origin, id) {
  if (/\/\/(localhost|127\.0\.0\.1)/.test(origin)) {
    const m = await readMedia(db, id); if (!m) throw new HttpError('Fichier introuvable', 404);
    let s = ''; for (let i = 0; i < m.bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, m.bytes.subarray(i, i + 0x8000));
    return `data:${m.meta.mime};base64,${btoa(s)}`;
  }
  const exp = Date.now() + 2 * 3600e3;
  return `${origin}/api/media/${id}?exp=${exp}&sig=${await hmacHex(await mediaSecret(db), `${id}.${exp}`)}`;
}

/* ---------- Fournisseur d'IA : fal.ai ---------- */
const AI_MODELS = {
  'avatar-standard': { endpoint: 'fal-ai/kling-video/ai-avatar/v2/standard', perSecond: 0.0562, label: 'Kling Avatar v2 Standard' },
  'avatar-pro': { endpoint: 'fal-ai/kling-video/ai-avatar/v2/pro', perSecond: 0.115, label: 'Kling Avatar v2 Pro' },
  'tts': { endpoint: 'fal-ai/elevenlabs/tts/multilingual-v2', perKChar: 0.1, label: 'ElevenLabs Multilingual v2' },
};
async function falKey(env, db) { return env.FAL_KEY || (await setting(db, 'fal_key')) || null; }
async function falFetch(key, url, init = {}) {
  const r = await fetch(url, { ...init, headers: { authorization: `Key ${key}`, 'content-type': 'application/json', accept: 'application/json' } });
  let d = null; try { d = await r.json(); } catch { /* rien */ }
  if (!r.ok && r.status !== 202) {
    const msg = typeof d?.detail === 'string' ? d.detail : Array.isArray(d?.detail) ? d.detail.map((x) => x.msg).join(', ') : d?.error || d?.message || `Erreur ${r.status}`;
    throw new HttpError(`Fournisseur d’IA : ${msg}`, r.status === 401 || r.status === 403 ? 400 : 502);
  }
  return d;
}
async function advanceJob(env, db, job) {
  if (job.status === 'done' || job.status === 'error') return job;
  const key = await falKey(env, db);
  const st = await falFetch(key, job.status_url);
  const s = st?.status;
  if (s === 'COMPLETED') {
    let res;
    try { res = await falFetch(key, job.response_url); }
    catch (e) {
      await db.prepare("UPDATE ai_jobs SET status = 'error', error = ?, updated_at = ? WHERE id = ?").bind(e.message, Date.now(), job.id).run();
      return { ...job, status: 'error', error: e.message };
    }
    const file = job.kind === 'tts' ? res?.audio : res?.video;
    if (!file?.url) throw new HttpError('Réponse du fournisseur sans fichier', 502);
    const r = await fetch(file.url);
    if (!r.ok) throw new HttpError('Téléchargement du résultat impossible', 502);
    const bytes = await r.arrayBuffer();
    const mime = r.headers.get('content-type')?.split(';')[0] || (job.kind === 'tts' ? 'audio/mpeg' : 'video/mp4');
    const m = await storeMedia(db, bytes, mime, job.kind === 'tts' ? 'audio' : 'video', job.kind === 'tts' ? 'voix-ia' : 'avatar-ia');
    await db.prepare("UPDATE ai_jobs SET status = 'done', result_media = ?, updated_at = ? WHERE id = ?").bind(m.id, Date.now(), job.id).run();
    return { ...job, status: 'done', result_media: m.id };
  }
  const status = s === 'IN_PROGRESS' ? 'running' : 'queued';
  if (status !== job.status) await db.prepare('UPDATE ai_jobs SET status = ?, updated_at = ? WHERE id = ?').bind(status, Date.now(), job.id).run();
  return { ...job, status, queue_position: st?.queue_position };
}
const publicJob = (j) => ({ id: j.id, kind: j.kind, model: j.model, status: j.status, media: j.result_media, cost: j.cost, error: j.error, queuePosition: j.queue_position ?? null, meta: j.result_meta ? JSON.parse(j.result_meta) : null, createdAt: j.created_at });

/* ---------- Routes ---------- */
async function api(req, env, url) {
  const db = env.DB;
  if (!db) return fail('Base de données non configurée (binding DB manquant)', 503);
  await ensure(db);
  const path = url.pathname.replace(/\/+$/, '');
  const m = req.method;
  const ip = req.headers.get('cf-connecting-ip') || 'local';

  // --- Authentification
  if (path === '/api/auth/status') {
    let salt = await setting(db, 'auth_salt');
    if (!salt) { salt = randomHex(16); await putSetting(db, 'auth_salt', salt); }
    const configured = !!(await setting(db, 'auth_hash'));
    return json({ configured, authed: configured && !!(await session(req, db)), salt, studio: (await setting(db, 'studio_name')) || 'Cadence', needsCode: !configured && !!env.SETUP_CODE });
  }
  if (path === '/api/auth/setup' && m === 'POST') {
    const b = await body(req);
    if (!isHash(b.hash)) return fail('Mot de passe invalide');
    if (env.SETUP_CODE && b.code !== env.SETUP_CODE) return fail('Code d’installation incorrect', 403);
    const res = await db.prepare("INSERT INTO settings (key, value) VALUES ('auth_hash', ?) ON CONFLICT(key) DO NOTHING").bind(await sha256(b.hash)).run();
    if (!res.meta.changes) return fail('Le studio est déjà configuré', 409);
    if (b.studio) await putSetting(db, 'studio_name', String(b.studio).slice(0, 60));
    return json({ ok: true }, 201, { 'set-cookie': await newSession(db) });
  }
  if (path === '/api/auth/login' && m === 'POST') {
    await throttle(db, ip);
    const b = await body(req);
    const stored = await setting(db, 'auth_hash');
    if (!stored || !isHash(b.hash) || !safeEqual(await sha256(b.hash), stored)) { await failed(db, ip); return fail('Mot de passe incorrect', 401); }
    await db.prepare('DELETE FROM attempts WHERE ip = ?').bind(ip).run();
    return json({ ok: true }, 200, { 'set-cookie': await newSession(db) });
  }
  if (path === '/api/auth/logout' && m === 'POST') {
    const tok = cookie(req, COOKIE);
    if (tok) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(tok)).run();
    return json({ ok: true }, 200, { 'set-cookie': setCookie('x', 0) });
  }

  // --- Médias : lecture avec session ou avec une URL signée temporaire
  let mm0 = path.match(/^\/api\/media\/([\w-]{8,64})$/);
  if (mm0 && m === 'GET') {
    const id = mm0[1], exp = +url.searchParams.get('exp'), sig = url.searchParams.get('sig') || '';
    const signedOk = exp > Date.now() && safeEqual(sig, await hmacHex(await mediaSecret(db), `${id}.${exp}`));
    if (!signedOk && !(await session(req, db))) return fail('Accès refusé', 401);
    const md = await readMedia(db, id);
    if (!md) return fail('Fichier introuvable', 404);
    return new Response(md.bytes, { headers: { 'content-type': md.meta.mime, 'content-length': String(md.meta.size), 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff' } });
  }

  // --- Tout le reste exige une session
  if (!(await session(req, db))) return fail('Session expirée, reconnecte-toi', 401);

  if (path === '/api/auth/password' && m === 'POST') {
    await throttle(db, ip);
    const b = await body(req);
    const stored = await setting(db, 'auth_hash');
    if (!isHash(b.current) || !isHash(b.next) || !safeEqual(await sha256(b.current), stored)) { await failed(db, ip); return fail('Mot de passe actuel incorrect', 401); }
    await putSetting(db, 'auth_hash', await sha256(b.next));
    await db.prepare('DELETE FROM sessions').run();
    return json({ ok: true }, 200, { 'set-cookie': await newSession(db) });
  }
  if (path === '/api/settings' && m === 'PUT') {
    const b = await body(req);
    if (b.studio !== undefined) await putSetting(db, 'studio_name', str(b.studio, 60, 'Nom du studio'));
    return json({ ok: true });
  }

  // --- Clients
  if (path === '/api/clients') {
    if (m === 'GET') {
      const { results } = await db.prepare('SELECT c.id, c.name, c.data, c.updated_at, (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) AS projects FROM clients c ORDER BY c.name COLLATE NOCASE').all();
      return json(results.map((r) => ({ id: r.id, name: r.name, brand: JSON.parse(r.data), projects: r.projects, updatedAt: r.updated_at })));
    }
    if (m === 'POST') {
      const b = await body(req); const id = uid(), now = Date.now(), name = str(b.name, 80, 'Nom');
      await db.prepare('INSERT INTO clients (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(id, name, payload({ ...b.brand, name }), now, now).run();
      return json({ id }, 201);
    }
  }
  let mm = path.match(/^\/api\/clients\/([\w-]{8,64})$/);
  if (mm) {
    const id = mm[1];
    if (m === 'PUT') {
      const b = await body(req); const name = str(b.name, 80, 'Nom');
      const r = await db.prepare('UPDATE clients SET name = ?, data = ?, updated_at = ? WHERE id = ?').bind(name, payload({ ...b.brand, name }), Date.now(), id).run();
      return r.meta.changes ? json({ ok: true }) : fail('Client introuvable', 404);
    }
    if (m === 'DELETE') {
      await db.batch([db.prepare('DELETE FROM clients WHERE id = ?').bind(id), db.prepare('UPDATE projects SET client_id = NULL WHERE client_id = ?').bind(id)]);
      return json({ ok: true });
    }
  }

  // --- Projets
  if (path === '/api/projects') {
    if (m === 'GET') {
      const { results } = await db.prepare('SELECT id, client_id, name, format, thumb, duration, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT 500').all();
      return json(results.map((r) => ({ id: r.id, clientId: r.client_id, name: r.name, format: r.format, thumb: r.thumb, duration: r.duration, createdAt: r.created_at, updatedAt: r.updated_at })));
    }
    if (m === 'POST') {
      const b = await body(req); const id = uid(), now = Date.now();
      const format = FORMATS.includes(b.format) ? b.format : '16:9';
      await db.prepare('INSERT INTO projects (id, client_id, name, format, data, thumb, duration, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, b.clientId || null, str(b.name, 120, 'Nom'), format, payload(b.data), thumbOk(b.thumb), +b.duration || 0, now, now).run();
      return json({ id, updatedAt: now }, 201);
    }
  }
  mm = path.match(/^\/api\/projects\/([\w-]{8,64})$/);
  if (mm) {
    const id = mm[1];
    if (m === 'GET') {
      const r = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
      if (!r) return fail('Projet introuvable', 404);
      return json({ id: r.id, clientId: r.client_id, name: r.name, format: r.format, data: JSON.parse(r.data), thumb: r.thumb, updatedAt: r.updated_at });
    }
    if (m === 'PUT') {
      const b = await body(req); const now = Date.now();
      const format = FORMATS.includes(b.format) ? b.format : '16:9';
      const r = await db.prepare('UPDATE projects SET client_id = ?, name = ?, format = ?, data = ?, thumb = COALESCE(?, thumb), duration = ?, updated_at = ? WHERE id = ?')
        .bind(b.clientId || null, str(b.name, 120, 'Nom'), format, payload(b.data), thumbOk(b.thumb), +b.duration || 0, now, id).run();
      return r.meta.changes ? json({ ok: true, updatedAt: now }) : fail('Projet introuvable', 404);
    }
    if (m === 'DELETE') { await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run(); return json({ ok: true }); }
  }

  // --- Médias : envoi et suppression
  if (path === '/api/media' && m === 'POST') {
    const kind = url.searchParams.get('kind');
    if (!['audio', 'image', 'video'].includes(kind)) return fail('Type de fichier invalide');
    const mime = (req.headers.get('content-type') || '').split(';')[0];
    if (!mime.startsWith(`${kind}/`) && !(kind === 'audio' && mime === 'video/webm')) return fail('Format de fichier non pris en charge');
    const bytes = await req.arrayBuffer();
    if (!bytes.byteLength) return fail('Fichier vide');
    return json(await storeMedia(db, bytes, mime, kind, url.searchParams.get('name') || ''), 201);
  }
  if (mm0 && m === 'DELETE') {
    await db.batch([db.prepare('DELETE FROM media WHERE id = ?').bind(mm0[1]), db.prepare('DELETE FROM media_chunks WHERE media_id = ?').bind(mm0[1])]);
    return json({ ok: true });
  }

  // --- Avatars
  if (path === '/api/avatars') {
    if (m === 'GET') {
      const { results } = await db.prepare('SELECT * FROM avatars ORDER BY created_at DESC').all();
      return json(results.map((r) => ({ id: r.id, name: r.name, kind: r.kind, data: JSON.parse(r.data), createdAt: r.created_at })));
    }
    if (m === 'POST') {
      const b = await body(req); const id = uid(), now = Date.now();
      if (!['illustre', 'photo'].includes(b.kind)) return fail('Type d’avatar invalide');
      await db.prepare('INSERT INTO avatars (id, name, kind, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, str(b.name, 60, 'Nom'), b.kind, payload(b.data), now, now).run();
      return json({ id }, 201);
    }
  }
  mm = path.match(/^\/api\/avatars\/([\w-]{8,64})$/);
  if (mm) {
    if (m === 'PUT') {
      const b = await body(req);
      const r = await db.prepare('UPDATE avatars SET name = ?, data = ?, updated_at = ? WHERE id = ?').bind(str(b.name, 60, 'Nom'), payload(b.data), Date.now(), mm[1]).run();
      return r.meta.changes ? json({ ok: true }) : fail('Avatar introuvable', 404);
    }
    if (m === 'DELETE') { await db.prepare('DELETE FROM avatars WHERE id = ?').bind(mm[1]).run(); return json({ ok: true }); }
  }

  // --- Intelligence artificielle (fal.ai)
  if (path === '/api/ai/status' && m === 'GET') {
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
    const spent = await db.prepare("SELECT COALESCE(SUM(cost), 0) AS s, COUNT(*) AS n FROM ai_jobs WHERE status != 'error' AND created_at >= ?").bind(month.getTime()).first();
    return json({ configured: !!(await falKey(env, db)), fromEnv: !!env.FAL_KEY, monthSpent: spent.s, monthJobs: spent.n, models: AI_MODELS });
  }
  if (path === '/api/ai/key' && m === 'PUT') {
    const b = await body(req);
    const k = String(b.key || '').trim();
    if (k && !/^[\w:.\-]{20,200}$/.test(k)) return fail('Clé invalide');
    if (k) await putSetting(db, 'fal_key', k); else await db.prepare("DELETE FROM settings WHERE key = 'fal_key'").run();
    return json({ ok: true });
  }
  if (path === '/api/ai/jobs' && m === 'POST') {
    const b = await body(req);
    const key = await falKey(env, db);
    if (!key) return fail('Aucune clé fal.ai configurée. Ajoute-la dans Réglages.', 400);
    const model = AI_MODELS[b.model];
    if (!model) return fail('Modèle inconnu');
    const origin = url.origin;
    let input, cost, kind, meta = {};
    if (b.model === 'tts') {
      const text = str(b.text, 5000, 'Texte');
      input = { text, voice: String(b.voice || 'Aria').slice(0, 60), stability: 0.5 };
      cost = (text.length / 1000) * model.perKChar; kind = 'tts'; meta = { text: text.slice(0, 200), voice: input.voice };
    } else {
      if (!b.imageMedia || !b.audioMedia) return fail('Il faut une photo d’avatar et une voix.');
      const dur = Math.max(1, Math.min(300, +b.duration || 10));
      input = { image_url: await mediaUrl(db, origin, b.imageMedia), audio_url: await mediaUrl(db, origin, b.audioMedia), prompt: String(b.prompt || 'Présentateur naturel et professionnel, regard caméra, sourire léger, gestes mesurés.').slice(0, 500) };
      cost = dur * model.perSecond; kind = 'avatar'; meta = { duration: dur, key: String(b.key || '').slice(0, 120) };
    }
    const q = await falFetch(key, `${env.FAL_BASE || 'https://queue.fal.run'}/${model.endpoint}`, { method: 'POST', body: JSON.stringify(input) });
    if (!q?.status_url || !q?.response_url) return fail('Réponse inattendue du fournisseur d’IA', 502);
    const id = uid(), now = Date.now();
    await db.prepare('INSERT INTO ai_jobs (id, kind, model, status, status_url, response_url, result_meta, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, kind, b.model, 'queued', q.status_url, q.response_url, JSON.stringify(meta), Math.round(cost * 1000) / 1000, now, now).run();
    return json({ id, status: 'queued', cost }, 201);
  }
  mm = path.match(/^\/api\/ai\/jobs\/([\w-]{8,64})$/);
  if (mm && m === 'GET') {
    let job = await db.prepare('SELECT * FROM ai_jobs WHERE id = ?').bind(mm[1]).first();
    if (!job) return fail('Tâche introuvable', 404);
    try { job = await advanceJob(env, db, job); }
    catch (e) {
      if (e instanceof HttpError && e.status !== 502) throw e;
      if (Date.now() - job.created_at > 45 * 60e3) {
        await db.prepare("UPDATE ai_jobs SET status = 'error', error = ?, updated_at = ? WHERE id = ?").bind(e.message, Date.now(), job.id).run();
        job = { ...job, status: 'error', error: e.message };
      }
    }
    return json(publicJob(job));
  }

  // --- Musiques importées
  if (path === '/api/music') {
    if (m === 'GET') {
      const { results } = await db.prepare('SELECT * FROM music ORDER BY created_at DESC').all();
      return json(results.map((r) => ({ id: r.id, name: r.name, media: r.media_id, duration: r.duration, size: r.size, createdAt: r.created_at })));
    }
    if (m === 'POST') {
      const b = await body(req);
      const md = await db.prepare('SELECT size, kind FROM media WHERE id = ?').bind(String(b.media || '')).first();
      if (!md || md.kind !== 'audio') return fail('Fichier audio introuvable');
      const id = uid();
      await db.prepare('INSERT INTO music (id, name, media_id, duration, size, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, str(b.name, 120, 'Nom'), b.media, +b.duration || 0, md.size, Date.now()).run();
      return json({ id }, 201);
    }
  }
  mm = path.match(/^\/api\/music\/([\w-]{8,64})$/);
  if (mm && m === 'DELETE') {
    const r = await db.prepare('SELECT media_id FROM music WHERE id = ?').bind(mm[1]).first();
    if (r) await db.batch([db.prepare('DELETE FROM music WHERE id = ?').bind(mm[1]), db.prepare('DELETE FROM media WHERE id = ?').bind(r.media_id), db.prepare('DELETE FROM media_chunks WHERE media_id = ?').bind(r.media_id)]);
    return json({ ok: true });
  }

  // --- Exports (historique)
  if (path === '/api/exports') {
    if (m === 'GET') {
      const { results } = await db.prepare('SELECT * FROM exports ORDER BY created_at DESC LIMIT 100').all();
      return json(results);
    }
    if (m === 'POST') {
      const b = await body(req);
      await db.prepare('INSERT INTO exports (id, project_id, project_name, client_id, format, quality, duration, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(uid(), b.projectId || null, String(b.projectName || '').slice(0, 120), b.clientId || null, String(b.format || '').slice(0, 8), String(b.quality || '').slice(0, 8), +b.duration || 0, Math.round(+b.size || 0), Date.now()).run();
      return json({ ok: true }, 201);
    }
  }
  return fail('Route inconnue', 404);
}

/* ---------- Voix gratuites : relais et cache des modèles Piper ---------- */
const PIPER_BASE = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main';
const PIPER_PATH = /^(voices\.json|[a-z]{2}\/[a-z]{2}_[A-Z]{2}\/[\w-]+\/[\w-]+\/[\w.-]+\.onnx(\.json)?)$/;
async function piperVoice(req, env, url, ctx) {
  const path = decodeURIComponent(url.pathname.replace(/^\/voix-piper\//, ''));
  if (!PIPER_PATH.test(path) || req.method !== 'GET') return fail('Voix introuvable', 404);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(url.origin + '/voix-piper/' + path);
  const hit = cache && (await cache.match(key));
  if (hit) return hit;
  const r = await fetch(`${env.PIPER_BASE || PIPER_BASE}/${path}`, { redirect: 'follow', cf: { cacheEverything: true, cacheTtl: 2592000 } });
  if (!r.ok) return fail('Voix indisponible pour le moment', 502);
  const res = new Response(r.body, { headers: {
    'content-type': path.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/octet-stream',
    'cache-control': 'public, max-age=2592000, immutable', 'x-content-type-options': 'nosniff',
    ...(r.headers.get('content-length') ? { 'content-length': r.headers.get('content-length') } : {}),
  } });
  if (cache && ctx?.waitUntil) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/voix-piper/')) return piperVoice(req, env, url, ctx);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.get('origin');
      if (origin && origin !== url.origin) return fail('Origine non autorisée', 403);
    }
    try { return await api(req, env, url); }
    catch (e) {
      if (e instanceof HttpError) return fail(e.message, e.status);
      console.error(e);
      return fail('Erreur serveur', 500);
    }
  },
};
