/* Cadence — bibliothèque musicale
 * Morceaux originaux composés et joués par un synthétiseur intégré (Web Audio).
 * Aucun fichier à télécharger, aucun droit à payer : la musique est calculée
 * à la demande, à la durée exacte de la vidéo.
 */

export const TRACKS = {
  elan: { name: 'Élan', mood: 'Entreprise, positif', bpm: 118, tags: ['corporate', 'optimiste'], color: '#5A3DF0' },
  lofi: { name: 'Café lo-fi', mood: 'Détendu, chaleureux', bpm: 82, tags: ['lo-fi', 'jazzy'], color: '#C27A08' },
  douce: { name: 'Ambiance douce', mood: 'Calme, bien-être', bpm: 70, tags: ['ambient', 'zen'], color: '#2FA37A' },
  energie: { name: 'Énergie', mood: 'Dynamique, sport', bpm: 128, tags: ['électro', 'motivation'], color: '#E5484D' },
  cinematique: { name: 'Cinématique', mood: 'Épique, émotion', bpm: 90, tags: ['film', 'grandiose'], color: '#1F3B5F' },
  inspiration: { name: 'Inspiration', mood: 'Émouvant, piano', bpm: 100, tags: ['piano', 'cordes'], color: '#8A3FD1' },
  funk: { name: 'Groove funk', mood: 'Fun, entraînant', bpm: 104, tags: ['funk', 'basse'], color: '#E0559B' },
  tech: { name: 'Tech minimal', mood: 'Moderne, startup', bpm: 112, tags: ['synthé', 'arpège'], color: '#0E8BA8' },
  acoustique: { name: 'Acoustique', mood: 'Naturel, artisanal', bpm: 95, tags: ['guitare', 'folk'], color: '#7A4E2F' },
  luxe: { name: 'Lounge luxe', mood: 'Élégant, haut de gamme', bpm: 104, tags: ['deep house', 'chic'], color: '#2A2A2A' },
};

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------------------------------------------------------------
   Instruments
   --------------------------------------------------------------- */
function tools(ctx, seed) {
  const sr = ctx.sampleRate, R = rng(seed);
  const noise = ctx.createBuffer(1, sr * 2, sr);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  // Réverbération : réponse impulsionnelle synthétique
  const ir = ctx.createBuffer(2, Math.floor(sr * 1.9), sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * (1 - i / d.length) ** 2.6; }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.2;
  const master = ctx.createGain(); master.gain.value = 0.8;
  master.connect(comp); comp.connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const verbGain = ctx.createGain(); verbGain.gain.value = 0.28;
  verb.connect(verbGain); verbGain.connect(master);
  const bus = (send = 0) => { const g = ctx.createGain(); g.connect(master); if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(verb); } return g; };
  const B = { drums: bus(0.08), bass: bus(0), keys: bus(0.35), pad: bus(0.5), lead: bus(0.4), fx: bus(0.6) };
  const pan = (dest, p) => { const n = ctx.createStereoPanner(); n.pan.value = p; n.connect(dest); return n; };

  function env(g, t, a, peak, dec, sus = 0.0001, rel = 0.1, hold = 0) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(Math.max(sus, 0.0001), t + a + hold, dec / 3);
    return (end) => { g.gain.cancelScheduledValues(end); g.gain.setTargetAtTime(0.0001, end, rel / 3); };
  }
  function tone({ t, freq, dur, wave = 'sine', vol = 0.3, a = 0.005, d = 0.3, s = 0, r = 0.1, cutoff = 0, q = 0.7, fenv = 0, detune = [0], dest, p = 0 }) {
    const g = ctx.createGain(); g.gain.value = 0;
    let out = g;
    if (cutoff) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
      f.frequency.setValueAtTime(cutoff * (1 + fenv), t); f.frequency.setTargetAtTime(cutoff, t, Math.max(0.02, d / 3));
      f.connect(g); out = f;
    }
    g.connect(p ? pan(dest, p) : dest);
    for (const dt of detune) {
      const o = ctx.createOscillator(); o.type = wave; o.frequency.value = freq; o.detune.value = dt;
      o.connect(out); o.start(t); o.stop(t + dur + r + 0.3);
    }
    const release = env(g, t, a, vol / Math.sqrt(detune.length), d, s * vol, r);
    release(t + dur);
  }
  const noiseHit = ({ t, dur, vol, type = 'highpass', freq = 6000, q = 0.8, dest, p = 0, a = 0.001 }) => {
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); src.connect(f); f.connect(g); g.connect(p ? pan(dest, p) : dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t, R() * 1.5); src.stop(t + dur + 0.05);
  };
  const ks = new Map();
  function guitarBuf(midi) {
    if (ks.has(midi)) return ks.get(midi);
    const f = mtof(midi), N = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * 2.2);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = R() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < len; i++) { const nx = (idx + 1) % N; const v = 0.4985 * (ring[idx] + ring[nx]); d[i] = ring[idx]; ring[idx] = v; idx = nx; }
    ks.set(midi, b); return b;
  }
  const I = {
    kick(t, v = 1) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.95 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g); g.connect(B.drums); o.start(t); o.stop(t + 0.5);
      noiseHit({ t, dur: 0.02, vol: 0.12 * v, type: 'highpass', freq: 3000, dest: B.drums });
    },
    snare(t, v = 1, soft = false) {
      noiseHit({ t, dur: soft ? 0.12 : 0.2, vol: 0.35 * v, type: 'bandpass', freq: soft ? 1400 : 1900, q: 0.9, dest: B.drums });
      tone({ t, freq: 185, dur: 0.05, wave: 'triangle', vol: 0.25 * v, d: 0.08, dest: B.drums });
    },
    clap(t, v = 1) { for (let k = 0; k < 3; k++) noiseHit({ t: t + k * 0.011, dur: 0.11 + k * 0.03, vol: 0.28 * v, type: 'bandpass', freq: 1250, q: 1.2, dest: B.drums }); },
    hat(t, v = 1, open = false) { noiseHit({ t, dur: open ? 0.28 : 0.045, vol: 0.12 * v, type: 'highpass', freq: 8200, dest: B.drums, p: 0.25 }); },
    shaker(t, v = 1) { noiseHit({ t, dur: 0.07, vol: 0.07 * v, type: 'bandpass', freq: 6500, q: 1.5, dest: B.drums, p: -0.3, a: 0.02 }); },
    tom(t, v = 1, f = 110) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f * 1.4, t); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.3);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.8 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g); g.connect(B.drums); o.start(t); o.stop(t + 1);
      noiseHit({ t, dur: 0.25, vol: 0.12 * v, type: 'lowpass', freq: 700, dest: B.drums });
    },
    swell(t, dur, v = 1) {
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * v, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
      src.connect(f); f.connect(g); g.connect(B.fx); src.start(t); src.stop(t + dur + 0.7);
    },
    vinyl(t, dur) {
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = 0.012; src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur);
      for (let x = t; x < t + dur; x += 0.05 + R() * 0.4) noiseHit({ t: x, dur: 0.006, vol: 0.05 * R(), type: 'highpass', freq: 3000, dest: master });
    },
    bass(t, m, dur, v = 1) {
      tone({ t, freq: mtof(m), dur, wave: 'sawtooth', vol: 0.26 * v, a: 0.004, d: 0.25, s: 0.5, r: 0.08, cutoff: 520, fenv: 1.6, q: 2, dest: B.bass });
      tone({ t, freq: mtof(m), dur, wave: 'sine', vol: 0.3 * v, a: 0.004, d: 0.4, s: 0.8, r: 0.08, dest: B.bass });
    },
    sub(t, m, dur, v = 1) { tone({ t, freq: mtof(m), dur, wave: 'sine', vol: 0.42 * v, a: 0.01, d: 0.5, s: 0.85, r: 0.12, dest: B.bass }); },
    slap(t, m, dur, v = 1) {
      tone({ t, freq: mtof(m), dur, wave: 'square', vol: 0.18 * v, a: 0.002, d: 0.18, s: 0.25, r: 0.05, cutoff: 900, fenv: 3, q: 4, dest: B.bass });
      tone({ t, freq: mtof(m), dur, wave: 'sine', vol: 0.3 * v, a: 0.002, d: 0.3, s: 0.6, r: 0.06, dest: B.bass });
    },
    piano(t, m, dur, v = 1, p = 0) {
      const f = mtof(m), dec = 1.6 - Math.min(1, (m - 48) / 48);
      tone({ t, freq: f, dur, wave: 'triangle', vol: 0.2 * v, a: 0.003, d: dec, s: 0, r: 0.3, cutoff: 2600, fenv: 1, dest: B.keys, p });
      tone({ t, freq: f * 2, dur, wave: 'sine', vol: 0.06 * v, a: 0.002, d: dec * 0.6, s: 0, r: 0.2, dest: B.keys, p });
    },
    rhodes(t, m, dur, v = 1, p = 0) {
      const f = mtof(m), g = ctx.createGain(); g.connect(p ? pan(B.keys, p) : B.keys);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.5; lg.gain.value = 0.25;
      const amp = ctx.createGain(); amp.gain.value = 0.75; lfo.connect(lg); lg.connect(amp.gain); amp.connect(g);
      for (const [mul, vol] of [[1, 0.2], [2, 0.05], [3.01, 0.02]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul; const og = ctx.createGain(); og.gain.value = vol * v; o.connect(og); og.connect(amp); o.start(t); o.stop(t + dur + 1.2); }
      lfo.start(t); lfo.stop(t + dur + 1.2);
      env(g, t, 0.006, 1, 1.8, 0.35, 0.6)(t + dur);
    },
    pluck(t, m, dur, v = 1, p = 0) { tone({ t, freq: mtof(m), dur: Math.min(dur, 0.25), wave: 'sawtooth', vol: 0.13 * v, a: 0.002, d: 0.22, s: 0, r: 0.15, cutoff: 1800, fenv: 2.5, q: 3, dest: B.lead, p, detune: [-6, 6] }); },
    bell(t, m, dur, v = 1, p = 0) {
      for (const [mul, vol, d] of [[1, 0.14, 2.2], [2.76, 0.05, 1.2], [5.4, 0.025, 0.6]]) tone({ t, freq: mtof(m) * mul, dur, wave: 'sine', vol: vol * v, a: 0.003, d, s: 0, r: 0.5, dest: B.lead, p });
    },
    clav(t, m, dur, v = 1) { tone({ t, freq: mtof(m), dur: Math.min(dur, 0.12), wave: 'square', vol: 0.09 * v, a: 0.002, d: 0.12, s: 0, r: 0.05, cutoff: 2200, fenv: 1.5, q: 5, dest: B.keys, p: 0.3 }); },
    pad(t, ms, dur, v = 1, bright = 1100) { for (const m of ms) tone({ t, freq: mtof(m), dur, wave: 'sawtooth', vol: 0.06 * v, a: 0.7, d: 1, s: 0.85, r: 1.2, cutoff: bright, q: 0.6, detune: [-9, 0, 9], dest: B.pad }); },
    strings(t, ms, dur, v = 1) { for (const m of ms) tone({ t, freq: mtof(m), dur, wave: 'sawtooth', vol: 0.07 * v, a: 0.45, d: 1, s: 0.9, r: 0.9, cutoff: 1700, q: 0.5, detune: [-7, 7], dest: B.pad }); },
    stab(t, ms, dur, v = 1) { for (const m of ms) tone({ t, freq: mtof(m), dur, wave: 'sawtooth', vol: 0.07 * v, a: 0.003, d: 0.2, s: 0.3, r: 0.1, cutoff: 2400, fenv: 1, q: 1, detune: [-12, 12], dest: B.lead }); },
    guitar(t, m, v = 1, p = 0) {
      const src = ctx.createBufferSource(); src.buffer = guitarBuf(m);
      const g = ctx.createGain(); g.gain.value = 0.32 * v; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
      src.connect(f); f.connect(g); g.connect(p ? pan(B.keys, p) : B.keys); src.start(t);
    },
  };
  const pump = (target, t, beat, depth = 0.65) => { target.gain.setValueAtTime(1 - depth, t); target.gain.linearRampToValueAtTime(1, t + beat * 0.55); };
  return { I, B, R, pump };
}

/* ---------------------------------------------------------------
   Compositions
   --------------------------------------------------------------- */
const C = {
  I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16],
};
const STYLES = {
  elan({ I, B, pump }, s) {
    const prog = [C.I, C.V, C.vi, C.IV], key = 60;
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[b % 4].map((x) => x + key), root = prog[b % 4][0] + key - 24;
      I.pad(t0, ch.map((x) => x - 12), s.bar * 0.98, 0.8);
      const arp = [0, 1, 2, 1, 0, 1, 2, 1];
      if (b >= 1) arp.forEach((k, i) => I.pluck(t0 + i * s.beat / 2, ch[k] + 12, s.beat / 2, i % 2 ? 0.7 : 1, i % 2 ? 0.3 : -0.3));
      if (b >= 2) {
        for (let i = 0; i < 8; i++) I.bass(t0 + i * s.beat / 2, root + (i === 6 ? 12 : 0), s.beat * 0.42, i % 2 ? 0.75 : 1);
        for (let i = 0; i < 4; i++) { I.kick(t0 + i * s.beat, 0.85); pump(B.pad, t0 + i * s.beat, s.beat, 0.4); }
        I.clap(t0 + s.beat); I.clap(t0 + 3 * s.beat);
        for (let i = 0; i < 4; i++) I.hat(t0 + i * s.beat + s.beat / 2, 0.8);
      }
    }
  },
  lofi({ I }, s) {
    const key = 53, prog = [[2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11], [9, 12, 16, 19]];
    const sw = (i) => (i % 2 ? s.beat * 0.09 : 0);
    I.vinyl(0, s.dur);
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[b % 4].map((x) => x + key + 12), root = prog[b % 4][0] + key - 12;
      I.rhodes(t0, ch[0], s.beat * 1.4, 0.9, -0.2); ch.slice(1).forEach((m) => I.rhodes(t0, m, s.beat * 1.4, 0.8, 0.15));
      ch.forEach((m) => I.rhodes(t0 + s.beat * 1.5 + sw(1), m, s.beat * 1.8, 0.6, 0.1));
      I.sub(t0, root, s.beat * 1.2); I.sub(t0 + s.beat * 2.5 + sw(1), root + 7, s.beat * 0.8, 0.8);
      if (b >= 1) {
        I.kick(t0, 0.8); I.kick(t0 + s.beat * 1.5 + sw(1), 0.55); I.kick(t0 + s.beat * 2.5 + sw(1), 0.7);
        I.snare(t0 + s.beat, 0.7, true); I.snare(t0 + s.beat * 3, 0.7, true);
        for (let i = 0; i < 8; i++) I.hat(t0 + i * s.beat / 2 + sw(i), i % 2 ? 0.45 : 0.8);
      }
    }
  },
  douce({ I, R }, s) {
    const key = 57, prog = [C.I, C.iii, C.vi, C.IV], penta = [0, 2, 4, 7, 9];
    for (let b = 0; b < s.bars; b += 2) {
      const t0 = b * s.bar, ch = prog[(b / 2) % 4].map((x) => x + key);
      I.pad(t0, [...ch.map((x) => x - 12), ch[0] - 24], s.bar * 2 * 0.98, 0.9, 900);
      if (b >= 2) for (let i = 0; i < 4; i++) if (R() < 0.7) I.bell(t0 + i * s.beat * 2 + (R() < 0.3 ? s.beat : 0), key + 12 + penta[Math.floor(R() * 5)], s.beat, 0.7, R() - 0.5);
      if (b >= 4) for (let i = 0; i < 16; i++) I.shaker(t0 + i * s.beat / 2, 0.35);
    }
  },
  energie({ I, B, pump }, s) {
    const key = 57, prog = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[b % 4].map((x) => x + key + 12), root = prog[b % 4][0] + key - 24;
      for (let i = 0; i < 4; i++) I.stab(t0 + i * s.beat + s.beat / 2, ch, s.beat * 0.35, b >= 1 ? 1 : 0.6);
      if (b >= 1) for (let i = 0; i < 16; i++) if (i % 4 !== 0) I.bass(t0 + i * s.beat / 4, root, s.beat * 0.2, 0.8);
      if (b >= 2) {
        for (let i = 0; i < 4; i++) { I.kick(t0 + i * s.beat, 1); pump(B.lead, t0 + i * s.beat, s.beat, 0.7); pump(B.bass, t0 + i * s.beat, s.beat, 0.5); I.hat(t0 + i * s.beat + s.beat / 2, 1, true); }
        I.clap(t0 + s.beat, 1.1); I.clap(t0 + s.beat * 3, 1.1);
      }
      if (b % 8 === 7) I.swell(t0, s.bar);
    }
  },
  cinematique({ I }, s) {
    const key = 50, prog = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[b % 4].map((x) => x + key), root = prog[b % 4][0] + key - 12, grow = Math.min(1, b / 8);
      I.strings(t0, [...ch, ch[0] + 12], s.bar * 0.99, 0.7 + 0.4 * grow);
      for (let i = 0; i < 8; i++) I.bass(t0 + i * s.beat / 2, root, s.beat * 0.3, 0.5 + 0.4 * grow);
      if (b >= 2) { I.tom(t0, 0.6 + 0.4 * grow, 90); I.tom(t0 + s.beat * 1.5, 0.5 + 0.3 * grow, 110); I.tom(t0 + s.beat * 2, 0.7 + 0.3 * grow, 80); }
      if (b >= 4 && b % 2) I.tom(t0 + s.beat * 3.5, 0.5, 130);
      if (b % 4 === 3) I.swell(t0 + s.beat, s.bar - s.beat, 1.2);
    }
  },
  inspiration({ I }, s) {
    const key = 55, prog = [C.I, C.V, C.vi, C.IV];
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[b % 4].map((x) => x + key + 12), root = prog[b % 4][0] + key - 12;
      I.piano(t0, root, s.bar, 0.8, -0.3); I.piano(t0 + s.beat * 2, root + 7, s.beat * 2, 0.5, -0.3);
      [0, 1, 2, 1, 2, 0, 1, 2].forEach((k, i) => I.piano(t0 + i * s.beat / 2, ch[k] + (i > 3 ? 12 : 0), s.beat, i === 0 ? 0.75 : 0.5, 0.25));
      if (b >= 4) I.strings(t0, ch.map((x) => x - 12), s.bar * 0.99, 0.6);
      if (b >= 8) { I.kick(t0, 0.5); I.kick(t0 + s.beat * 2, 0.4); I.clap(t0 + s.beat * 3, 0.4); }
    }
  },
  funk({ I }, s) {
    const key = 52, prog = [[0, 3, 7, 10], [5, 9, 12, 15]];
    const bassPat = [[0, 0, 1], [3, 12, 0.6], [6, 0, 0.8], [8, 10, 0.7], [10, 0, 0.9], [11, 3, 0.6], [14, 7, 0.8]];
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[(b >> 1) % 2].map((x) => x + key + 12), root = prog[(b >> 1) % 2][0] + key - 12, q = s.beat / 4;
      bassPat.forEach(([st, iv, v]) => I.slap(t0 + st * q, root + iv, q * 1.3, v));
      for (const st of [2, 6, 10, 14]) ch.forEach((m) => I.clav(t0 + st * q, m, q, 0.9));
      if (b >= 1) {
        I.kick(t0); I.kick(t0 + 3 * q, 0.6); I.kick(t0 + 8 * q, 0.9);
        I.snare(t0 + s.beat); I.snare(t0 + s.beat * 3); I.snare(t0 + 7 * q, 0.25, true); I.snare(t0 + 15 * q, 0.25, true);
        for (let i = 0; i < 16; i++) I.hat(t0 + i * q, i % 4 === 2 ? 0.9 : 0.45);
      }
    }
  },
  tech({ I, B, pump }, s) {
    const key = 48, prog = [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7]];
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[b % 4].map((x) => x + key + 24), root = prog[b % 4][0] + key - 12, q = s.beat / 4;
      const seq = [0, 1, 2, 3, 2, 1, 0, 2, 1, 0, 2, 3, 1, 2, 0, 1];
      seq.forEach((k, i) => I.pluck(t0 + i * q, k === 3 ? ch[0] + 12 : ch[k], q, 0.55 + (i % 4 === 0 ? 0.4 : 0), Math.sin(i) * 0.4));
      if (b >= 1) { I.sub(t0, root, s.beat * 1.8); I.sub(t0 + s.beat * 2.5, root, s.beat * 1.3, 0.8); }
      if (b >= 2) {
        for (let i = 0; i < 4; i++) { I.kick(t0 + i * s.beat, 0.75); pump(B.lead, t0 + i * s.beat, s.beat, 0.35); }
        for (let i = 0; i < 16; i++) I.hat(t0 + i * q, i % 2 ? 0.35 : 0.6);
        I.snare(t0 + s.beat * 3, 0.45, true);
      }
    }
  },
  acoustique({ I }, s) {
    const key = 55, prog = [C.I, C.IV, C.vi, C.V], pat = [[0, 'd'], [2, 'd'], [3, 'u'], [5, 'u'], [6, 'd'], [7, 'u']];
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[b % 4].map((x) => x + key), root = prog[b % 4][0] + key - 12, e = s.beat / 2;
      const voicing = [root, ch[0], ch[1], ch[2], ch[0] + 12, ch[1] + 12];
      pat.forEach(([st, dir]) => {
        const notes = dir === 'd' ? voicing : [...voicing].reverse().slice(0, 4);
        notes.forEach((m, k) => I.guitar(t0 + st * e + k * 0.012, m, dir === 'd' ? 0.9 : 0.55, (k / notes.length - 0.5) * 0.6));
      });
      if (b >= 1) for (let i = 0; i < 8; i++) I.shaker(t0 + i * e, i % 2 ? 1 : 0.6);
      if (b >= 2) { I.kick(t0, 0.6); I.kick(t0 + s.beat * 2, 0.5); I.clap(t0 + s.beat, 0.45); I.clap(t0 + s.beat * 3, 0.45); I.sub(t0, root - 12, s.beat * 1.5, 0.7); I.sub(t0 + s.beat * 2, root - 5, s.beat * 1.5, 0.6); }
    }
  },
  luxe({ I, B, pump }, s) {
    const key = 51, prog = [[0, 4, 7, 11, 14], [5, 9, 12, 16, 19], [2, 5, 9, 12, 16], [7, 11, 14, 17, 21]];
    for (let b = 0; b < s.bars; b++) {
      const t0 = b * s.bar, ch = prog[b % 4].map((x) => x + key + 12), root = prog[b % 4][0] + key - 12;
      for (const st of [0, 1.5, 3]) ch.forEach((m, k) => I.rhodes(t0 + st * s.beat, m, s.beat * 0.9, 0.55, (k - 2) * 0.15));
      I.sub(t0, root, s.beat * 0.9, 0.9); I.sub(t0 + s.beat * 1.5, root, s.beat * 0.5, 0.7); I.sub(t0 + s.beat * 2.5, root + 7, s.beat, 0.8);
      if (b >= 1) {
        for (let i = 0; i < 4; i++) { I.kick(t0 + i * s.beat, 0.7); pump(B.keys, t0 + i * s.beat, s.beat, 0.35); }
        I.clap(t0 + s.beat, 0.5); I.clap(t0 + s.beat * 3, 0.5);
        for (let i = 0; i < 8; i++) I.shaker(t0 + i * s.beat / 2, i % 2 ? 0.9 : 0.5);
        for (let i = 0; i < 4; i++) I.hat(t0 + i * s.beat + s.beat / 2, 0.5, true);
      }
    }
  },
};

/* ---------------------------------------------------------------
   Rendu
   --------------------------------------------------------------- */
const cache = new Map();
/** Calcule le morceau à la durée demandée (secondes). Renvoie un AudioBuffer stéréo. */
export function renderTrack(id, duration, sampleRate = 32000) {
  const meta = TRACKS[id] || TRACKS.elan;
  const dur = Math.max(4, Math.ceil(duration / 5) * 5);
  const key = `${id}:${dur}:${sampleRate}`;
  if (cache.has(key)) return cache.get(key);
  const pr = (async () => {
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
    const T = tools(ctx, [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    const beat = 60 / meta.bpm, bar = beat * 4;
    (STYLES[id] || STYLES.elan)(T, { beat, bar, bars: Math.ceil(dur / bar) + 1, dur });
    const buf = await ctx.startRendering();
    // Normalisation du volume pour que tous les morceaux sonnent pareil
    let peak = 0, sum = 0, n = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i += 4) { const v = Math.abs(d[i]); peak = Math.max(peak, v); sum += v * v; n++; } }
    const rms = Math.sqrt(sum / Math.max(1, n)), g = Math.min(0.2 / Math.max(rms, 1e-4), 0.92 / Math.max(peak, 1e-4));
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; }
    return buf;
  })();
  cache.set(key, pr);
  if (cache.size > 16) cache.delete(cache.keys().next().value);
  return pr;
}

/** AudioBuffer → fichier WAV (pour la lecture dans l'aperçu). */
export function bufferToWav(buf) {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const out = new ArrayBuffer(44 + len * ch * 2), v = new DataView(out);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { v.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 0x7fff, true); o += 2; }
  return new Blob([out], { type: 'audio/wav' });
}
