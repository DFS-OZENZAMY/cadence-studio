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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
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
