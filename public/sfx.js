/* Cadence — effets sonores
 * Bruitages synthétisés (Web Audio), libres de droits, calculés à la demande.
 */
export const SFX = {
  click: { name: 'Clic', cat: 'Interface' },
  tap: { name: 'Tape', cat: 'Interface' },
  tick: { name: 'Tic', cat: 'Interface' },
  pop: { name: 'Pop', cat: 'Interface' },
  notif: { name: 'Notification', cat: 'Interface' },
  beep: { name: 'Bip numérique', cat: 'Interface' },
  whoosh: { name: 'Whoosh', cat: 'Mouvement' },
  swipe: { name: 'Balayage', cat: 'Mouvement' },
  sweep: { name: 'Souffle', cat: 'Mouvement' },
  reverse: { name: 'Whoosh inversé', cat: 'Mouvement' },
  rise: { name: 'Montée', cat: 'Mouvement' },
  impact: { name: 'Impact léger', cat: 'Cinéma' },
  hit: { name: 'Coup grave', cat: 'Cinéma' },
  riser: { name: 'Riser', cat: 'Cinéma' },
  sub: { name: 'Pulsation grave', cat: 'Cinéma' },
  scan: { name: 'Scan numérique', cat: 'Technologie' },
  glitch: { name: 'Glitch', cat: 'Technologie' },
  confirm: { name: 'Validation', cat: 'Technologie' },
  data: { name: 'Traitement de données', cat: 'Technologie' },
};
/** Son proposé automatiquement pour chaque animation d'entrée. */
export const SFX_FOR_ANIM = {
  pop: 'pop', scale: 'rise', fade: 'sweep', slideUp: 'swipe', slideDown: 'swipe', slideLeft: 'whoosh', slideRight: 'whoosh',
  enterLeft: 'whoosh', enterRight: 'whoosh', enterTop: 'whoosh', enterBottom: 'whoosh', blur: 'sweep',
  typewriter: 'data', words: 'click', letters: 'tick', mask: 'swipe', highlight: 'swipe',
};

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const LEN = { riser: 2.4, rise: 1.2, sub: 1.4, hit: 1.6, impact: 1.1, whoosh: 0.9, reverse: 1.1, swipe: 0.6, sweep: 1.2, scan: 1.2, data: 1.1, glitch: 0.6, notif: 0.9, confirm: 0.8 };

const cache = new Map();
export function renderSfx(id, sr = 44100) {
  if (!SFX[id]) return Promise.resolve(null);
  if (cache.has(id)) return cache.get(id);
  const pr = (async () => {
    const dur = LEN[id] || 0.5;
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr), R = rng(id.length * 977 + id.charCodeAt(0));
    const noise = ctx.createBuffer(1, sr * 3, sr); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
    const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
    const osc = (type, f0, f1, t, d, vol, a = 0.003) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.02);
    };
    const nz = (t, d, vol, type, f0, f1 = f0, q = 0.8, a = 0.002, shape = 'exp') => {
      const s = ctx.createBufferSource(); s.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + d);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      if (shape === 'swell') { g.gain.exponentialRampToValueAtTime(vol, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d); }
      else if (shape === 'rev') { g.gain.exponentialRampToValueAtTime(vol, t + d * 0.92); g.gain.linearRampToValueAtTime(0.0001, t + d); }
      else { g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); }
      s.connect(f); f.connect(g); g.connect(out); s.start(t, R() * 2); s.stop(t + d + 0.02);
    };
    switch (id) {
      case 'click': nz(0, 0.03, 0.8, 'bandpass', 3500, 3500, 2); osc('sine', 1800, 900, 0, 0.025, 0.25); break;
      case 'tap': osc('sine', 420, 180, 0, 0.09, 0.6); nz(0, 0.02, 0.3, 'highpass', 2500); break;
      case 'tick': osc('square', 3200, 3200, 0, 0.018, 0.15); nz(0, 0.012, 0.4, 'highpass', 6000); break;
      case 'pop': osc('sine', 300, 900, 0, 0.09, 0.7); osc('sine', 900, 600, 0.03, 0.06, 0.25); nz(0, 0.02, 0.2, 'bandpass', 1500); break;
      case 'notif': osc('sine', 880, 880, 0, 0.35, 0.35); osc('sine', 1320, 1320, 0.12, 0.6, 0.3); osc('sine', 2640, 2640, 0.12, 0.3, 0.06); break;
      case 'beep': osc('square', 1200, 1200, 0, 0.08, 0.12); osc('square', 1600, 1600, 0.1, 0.08, 0.12); break;
      case 'whoosh': nz(0, 0.85, 0.7, 'bandpass', 500, 3500, 1.4, 0, 'swell'); break;
      case 'swipe': nz(0, 0.55, 0.55, 'bandpass', 2500, 900, 1.8, 0, 'swell'); break;
      case 'sweep': nz(0, 1.15, 0.35, 'lowpass', 300, 5000, 0.7, 0, 'swell'); break;
      case 'reverse': nz(0, 1.05, 0.7, 'bandpass', 4000, 600, 1.2, 0, 'rev'); osc('sine', 60, 200, 0.2, 0.85, 0.2); break;
      case 'rise': osc('sawtooth', 120, 900, 0, 1.15, 0.12, 0.6); nz(0, 1.15, 0.2, 'highpass', 800, 6000, 0.7, 0, 'swell'); break;
      case 'impact': osc('sine', 120, 40, 0, 0.9, 0.9); nz(0, 0.5, 0.5, 'lowpass', 1800, 200, 0.7); break;
      case 'hit': osc('sine', 75, 32, 0, 1.5, 1); osc('triangle', 150, 50, 0, 0.4, 0.4); nz(0, 0.9, 0.45, 'lowpass', 900, 120, 0.7); break;
      case 'riser': osc('sawtooth', 80, 1200, 0, 2.35, 0.1, 2); osc('sawtooth', 81, 1205, 0, 2.35, 0.1, 2); nz(0, 2.35, 0.3, 'bandpass', 400, 8000, 1, 0, 'swell'); break;
      case 'sub': for (let k = 0; k < 2; k++) osc('sine', 55, 48, k * 0.6, 0.7, 0.9, 0.01); break;
      case 'scan': for (let k = 0; k < 10; k++) osc('square', 600 + k * 180, 600 + k * 180, k * 0.1, 0.06, 0.07); nz(0, 1.15, 0.12, 'bandpass', 2000, 6000, 3, 0, 'swell'); break;
      case 'glitch': for (let k = 0; k < 7; k++) { const t = k * 0.07 + R() * 0.03; if (R() < 0.5) osc('square', 200 + R() * 2400, 200 + R() * 2400, t, 0.05, 0.12); else nz(t, 0.05, 0.4, 'bandpass', 1000 + R() * 6000, 1000 + R() * 6000, 4); } break;
      case 'confirm': osc('sine', 660, 660, 0, 0.2, 0.3); osc('sine', 990, 990, 0.1, 0.5, 0.3); break;
      case 'data': for (let k = 0; k < 16; k++) osc('square', 1500 + (R() * 1500 | 0), 1500, k * 0.065, 0.03, 0.06); break;
      default: break;
    }
    return ctx.startRendering();
  })();
  cache.set(id, pr);
  return pr;
}
