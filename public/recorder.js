/* Cadence — enregistreur d'écran façon Loom
 * Écran, caméra (bulle en incrustation) et micro, enregistrés dans le navigateur.
 * L'image est composée sur un canevas cadencé par un Worker, pour continuer à
 * enregistrer quand l'onglet Cadence n'est plus au premier plan.
 */
export const REC_MODES = { screencam: 'Écran et caméra', screen: 'Écran seul', cam: 'Caméra seule' };

export function pickMime() {
  const c = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return c.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
}
export async function listDevices() {
  try {
    const d = await navigator.mediaDevices.enumerateDevices();
    return { mics: d.filter((x) => x.kind === 'audioinput'), cams: d.filter((x) => x.kind === 'videoinput') };
  } catch { return { mics: [], cams: [] }; }
}
export const supportsRecording = () => !!(navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder);

function tickWorker(fps) {
  const src = `let t=null;onmessage=(e)=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),1000/e.data)}`;
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  w.postMessage(fps);
  return w;
}
const playing = (stream) => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = stream; v.play().catch(() => {}); return v; };

/**
 * Démarre une session. opts : { mode, micId ('none' pour couper), camId, systemAudio, bubble: { pos, size }, maxHeight }
 * Renvoie un objet de contrôle : { stream (aperçu), pause(), resume(), stop() → Promise<{ blob, duration, thumb }>, cancel(), elapsed(), onEnded }
 */
export async function startSession(opts) {
  const mode = opts.mode || 'screencam';
  const wantScreen = mode !== 'cam', wantCam = mode !== 'screen';
  const tracks = [];
  let screen = null, cam = null, mic = null;
  try {
    if (wantScreen) {
      screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !!opts.systemAudio, selfBrowserSurface: 'include', surfaceSwitching: 'include', systemAudio: opts.systemAudio ? 'include' : 'exclude' });
      tracks.push(...screen.getTracks());
    }
    if (wantCam) { cam = await navigator.mediaDevices.getUserMedia({ video: { deviceId: opts.camId ? { exact: opts.camId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); tracks.push(...cam.getTracks()); }
    if (opts.micId !== 'none') { mic = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: opts.micId ? { exact: opts.micId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); tracks.push(...mic.getTracks()); }
  } catch (e) { tracks.forEach((t) => t.stop()); throw e; }

  // Image : composition écran + bulle (ou piste directe si une seule source)
  const sv = screen ? playing(screen) : null, cv = cam ? playing(cam) : null;
  let videoTrack, canvas = null, ticker = null;
  const maxH = opts.maxHeight || 1080;
  if (screen && cam) {
    const s = screen.getVideoTracks()[0].getSettings();
    const k = Math.min(1, maxH / (s.height || 1080));
    canvas = document.createElement('canvas');
    canvas.width = Math.round(((s.width || 1920) * k) / 2) * 2; canvas.height = Math.round(((s.height || 1080) * k) / 2) * 2;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      if (sv.readyState >= 2) {
        const vw = sv.videoWidth, vh = sv.videoHeight, kk = Math.min(W / vw, H / vh);
        if (vw / vh !== W / H) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
        ctx.drawImage(sv, (W - vw * kk) / 2, (H - vh * kk) / 2, vw * kk, vh * kk);
      }
      if (cv.readyState >= 2 && opts.bubble?.pos !== 'off') {
        const d = Math.round(Math.min(W, H) * ({ s: 0.2, m: 0.27, l: 0.36 }[opts.bubble?.size] || 0.27)), m = Math.round(Math.min(W, H) * 0.035);
        const pos = opts.bubble?.pos || 'bl';
        const x = pos.includes('r') ? W - d - m : m, y = pos.includes('t') ? m : H - d - m;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = d * 0.12; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2 + 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.clip();
        const cw = cv.videoWidth, ch = cv.videoHeight, kc = Math.max(d / cw, d / ch);
        ctx.translate(x + d / 2, y + d / 2); ctx.scale(-1, 1);
        ctx.drawImage(cv, -cw * kc / 2, -ch * kc / 2, cw * kc, ch * kc);
        ctx.restore();
      }
    };
    ticker = tickWorker(30); ticker.onmessage = draw;
    draw();
    videoTrack = canvas.captureStream(30).getVideoTracks()[0];
  } else videoTrack = (screen || cam).getVideoTracks()[0];

  // Son : micro + son de l'ordinateur, mixés
  let ac = null, audioTrack = null, meter = null;
  const audioSrcs = [mic, screen?.getAudioTracks().length ? screen : null].filter(Boolean);
  if (audioSrcs.length) {
    ac = new AudioContext(); await ac.resume().catch(() => {});
    const dest = ac.createMediaStreamDestination();
    meter = ac.createAnalyser(); meter.fftSize = 512;
    for (const st of audioSrcs) { const n = ac.createMediaStreamSource(st); n.connect(dest); if (st === mic) n.connect(meter); }
    audioTrack = dest.stream.getAudioTracks()[0];
  }
  const out = new MediaStream([videoTrack, ...(audioTrack ? [audioTrack] : [])]);
  const mime = pickMime();
  const rec = new MediaRecorder(out, { mimeType: mime || undefined, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  let t0 = performance.now(), pausedAt = 0, pausedTotal = 0, done = null, thumb = null;
  const elapsed = () => ((pausedAt || performance.now()) - t0 - pausedTotal) / 1000;
  const grabThumb = () => {
    try {
      const src = canvas || (sv || cv); const w = 320, h = Math.round(320 * ((src.height || src.videoHeight || 9) / (src.width || src.videoWidth || 16)));
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(src, 0, 0, w, h);
      thumb = c.toDataURL('image/jpeg', 0.72);
    } catch { /* rien */ }
  };
  const thumbTimer = setTimeout(grabThumb, 1200);
  const cleanup = () => { clearTimeout(thumbTimer); ticker?.terminate(); tracks.forEach((t) => t.stop()); videoTrack.stop(); ac?.close().catch(() => {}); [sv, cv].forEach((v) => { if (v) v.srcObject = null; }); };
  const ctl = {
    surface: screen?.getVideoTracks()[0]?.getSettings?.().displaySurface || '', mime: rec.mimeType || mime, preview: canvas ? canvas.captureStream(15) : new MediaStream([videoTrack]), camStream: cam,
    elapsed, paused: () => rec.state === 'paused',
    level: () => { if (!meter) return 0; const a = new Uint8Array(meter.fftSize); meter.getByteTimeDomainData(a); let m = 0; for (const v of a) m = Math.max(m, Math.abs(v - 128)); return m / 128; },
    pause() { if (rec.state === 'recording') { rec.pause(); pausedAt = performance.now(); } },
    resume() { if (rec.state === 'paused') { pausedTotal += performance.now() - pausedAt; pausedAt = 0; rec.resume(); } },
    stop() {
      if (done) return done;
      if (!thumb) grabThumb();
      const duration = elapsed();
      done = new Promise((res) => { rec.onstop = () => { cleanup(); res({ blob: new Blob(chunks, { type: (rec.mimeType || mime || 'video/webm').split(';')[0] }), duration, thumb }); }; });
      if (rec.state !== 'inactive') rec.stop(); else rec.onstop();
      return done;
    },
    cancel() { try { rec.ondataavailable = null; if (rec.state !== 'inactive') rec.stop(); } catch { /* rien */ } cleanup(); },
    onEnded: null,
  };
  // « Arrêter le partage » dans la barre du navigateur : on termine proprement
  screen?.getVideoTracks()[0]?.addEventListener('ended', () => ctl.onEnded?.());
  rec.start(1000); t0 = performance.now();
  return ctl;
}
