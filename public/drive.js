/* Cadence — Google Drive
 * Les vidéos partent directement du navigateur vers le Google Drive de la personne connectée.
 * Autorisation demandée : drive.file (Cadence ne voit que les fichiers qu'elle a créés).
 * Aucun fichier vidéo ne transite par le serveur Cadence.
 */
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const D = { clientId: '', base: 'https://www.googleapis.com', test: false, token: '', exp: 0, user: null, folder: null, gisReady: null };

export function configureDrive(cfg = {}) {
  D.clientId = cfg.clientId || '';
  if (cfg.base) { D.base = cfg.base.replace(/\/$/, ''); D.test = true; }
  if (D.clientId && !D.test) loadGis();
}
export const driveAvailable = () => !!D.clientId;
export const driveConnected = () => !!D.token && Date.now() < D.exp;
export const driveUser = () => D.user;

function loadGis() {
  if (D.gisReady) return D.gisReady;
  D.gisReady = new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(); s.onerror = () => { D.gisReady = null; rej(new Error('Impossible de charger la connexion Google.')); };
    document.head.append(s);
  });
  return D.gisReady;
}

/** À appeler depuis un clic : ouvre la fenêtre Google si nécessaire. */
export async function connectDrive({ silent = false } = {}) {
  if (!D.clientId) throw new Error('Google Drive n’est pas configuré sur ce studio.');
  if (driveConnected()) return D.user;
  if (D.test) { D.token = 'test'; D.exp = Date.now() + 3600e3; }
  else {
    await loadGis();
    await new Promise((res, rej) => {
      const tc = window.google.accounts.oauth2.initTokenClient({
        client_id: D.clientId, scope: SCOPE,
        callback: (r) => { if (r.error) return rej(new Error(r.error === 'access_denied' ? 'Accès refusé dans la fenêtre Google.' : `Google : ${r.error}`)); D.token = r.access_token; D.exp = Date.now() + (Math.max(60, +r.expires_in || 3600) - 60) * 1000; res(); },
        error_callback: (e) => rej(new Error(e?.type === 'popup_closed' ? 'Fenêtre Google fermée avant la fin.' : e?.type === 'popup_failed_to_open' ? 'Le navigateur a bloqué la fenêtre Google : autorise les fenêtres pour ce site.' : 'Connexion Google interrompue.')),
      });
      tc.requestAccessToken({ prompt: silent ? '' : (D.user ? '' : 'consent') });
    });
  }
  try { const a = await gapi('GET', '/drive/v3/about?fields=user(displayName,emailAddress,photoLink),storageQuota(limit,usage)'); D.user = { name: a.user?.displayName || '', email: a.user?.emailAddress || '', quota: a.storageQuota || null }; }
  catch { D.user = { name: '', email: '' }; }
  return D.user;
}
export function disconnectDrive() {
  if (D.token && !D.test && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(D.token, () => {});
  Object.assign(D, { token: '', exp: 0, user: null, folder: null });
}

async function gapi(method, path, body, extraHeaders = {}) {
  if (!driveConnected()) throw new Error('Connexion Google Drive expirée : reconnecte-toi.');
  const r = await fetch(D.base + path, { method, headers: { Authorization: `Bearer ${D.token}`, ...(body ? { 'Content-Type': 'application/json; charset=UTF-8' } : {}), ...extraHeaders }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 204) return null;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) { D.token = ''; throw new Error('Connexion Google Drive expirée : reconnecte-toi.'); }
    if (r.status === 403 && /storageQuota/i.test(JSON.stringify(data))) throw new Error('Ton Google Drive est plein.');
    throw new Error(data?.error?.message ? `Google Drive : ${data.error.message}` : `Google Drive : erreur ${r.status}`);
  }
  return data;
}

async function cadenceFolder() {
  if (D.folder) return D.folder;
  const q = encodeURIComponent("name = 'Cadence' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const found = await gapi('GET', `/drive/v3/files?q=${q}&fields=files(id)&spaces=drive&pageSize=1`);
  D.folder = found?.files?.[0]?.id || (await gapi('POST', '/drive/v3/files?fields=id', { name: 'Cadence', mimeType: 'application/vnd.google-apps.folder' })).id;
  return D.folder;
}

/**
 * Envoie un fichier dans le dossier « Cadence » du Drive, par morceaux de 8 Mo (reprise possible).
 * Renvoie { id, webViewLink }.
 */
export async function uploadToDrive(blob, name, { onProgress, signal } = {}) {
  const parent = await cadenceFolder();
  const mime = blob.type || 'video/mp4';
  const init = await fetch(`${D.base}/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink`, {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${D.token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(blob.size) },
    body: JSON.stringify({ name, parents: [parent], mimeType: mime, description: 'Créé avec Cadence' }),
  });
  if (!init.ok) { const t = await init.text(); throw new Error(/storageQuota/i.test(t) ? 'Ton Google Drive est plein.' : `Google Drive : envoi refusé (${init.status}).`); }
  const session = init.headers.get('Location');
  if (!session) throw new Error('Google Drive n’a pas renvoyé d’adresse d’envoi.');
  const CHUNK = 8 * 1024 * 1024;
  let start = 0;
  for (let attempt = 0; ;) {
    const end = Math.min(blob.size, start + CHUNK);
    const res = await new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('PUT', session);
      x.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${blob.size}`);
      x.upload.onprogress = (e) => onProgress?.((start + e.loaded) / blob.size);
      x.onload = () => resolve({ status: x.status, range: x.getResponseHeader('Range'), text: x.responseText });
      x.onerror = () => reject(new Error('réseau'));
      if (signal) signal.addEventListener('abort', () => { x.abort(); reject(new DOMException('Envoi annulé', 'AbortError')); }, { once: true });
      x.send(blob.slice(start, end));
    }).catch((e) => { if (e.name === 'AbortError') throw e; return { status: 0 }; });
    if (res.status === 200 || res.status === 201) { onProgress?.(1); return JSON.parse(res.text || '{}'); }
    if (res.status === 308) { start = res.range ? +res.range.split('-')[1] + 1 : end; attempt = 0; continue; }
    if (++attempt > 5) throw new Error('L’envoi vers Google Drive a échoué après plusieurs essais.');
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    // Demande à Drive où reprendre
    const st = await new Promise((resolve) => { const x = new XMLHttpRequest(); x.open('PUT', session); x.setRequestHeader('Content-Range', `bytes */${blob.size}`); x.onload = () => resolve({ status: x.status, range: x.getResponseHeader('Range'), text: x.responseText }); x.onerror = () => resolve({ status: 0 }); x.send(); });
    if (st.status === 200 || st.status === 201) return JSON.parse(st.text || '{}');
    if (st.status === 308) start = st.range ? +st.range.split('-')[1] + 1 : 0;
  }
}
/** Rend le fichier lisible par toute personne qui a le lien. */
export async function shareDriveFile(id) { await gapi('POST', `/drive/v3/files/${encodeURIComponent(id)}/permissions?fields=id`, { role: 'reader', type: 'anyone' }); }
export async function unshareDriveFile(id) { await gapi('DELETE', `/drive/v3/files/${encodeURIComponent(id)}/permissions/anyoneWithLink`).catch(() => {}); }
export async function deleteDriveFile(id) { await gapi('DELETE', `/drive/v3/files/${encodeURIComponent(id)}`); }
export const driveViewUrl = (id) => `https://drive.google.com/file/d/${id}/view`;
export const drivePreviewUrl = (id) => `https://drive.google.com/file/d/${id}/preview`;
