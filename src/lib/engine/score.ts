/**
 * AURUM score — "The Ledger" bed.
 * 72 BPM, D minor, contemplative private-bank documentary music:
 * warm string pad (detuned saws through a slow lowpass), glass piano
 * (sine + 3rd partial, long decay), sub bass, the ledger bell motif
 * (D–F–A–G, inharmonic partials), noise swells and a soft clock tick.
 * Deliberately unlike the K-Shaped 92-BPM C-major felt-piano arpeggio.
 *
 * Score-as-data: ScoreNote[] per 4-bar loop, rendered at 24 kHz for tiling.
 */

export const BPM = 72;
export const BEAT = 60 / BPM;              // 0.8333 s
export const LOOP_BARS = 4;
export const LOOP_BEATS = LOOP_BARS * 4;
export const LOOP_DUR = LOOP_BEATS * BEAT; // 13.333 s
export const SR_BGM = 24000;
export const LOOP_LEN = Math.round(LOOP_DUR * SR_BGM); // 320000

const A4 = 440;
const mtof = (m: number) => A4 * Math.pow(2, (m - 69) / 12);

// ── harmony (D minor world) ──────────────────────────────────────────────────
// voicings: low root + inner voices
const CHORDS: Record<string, number[]> = {
  Dm9:    [38, 53, 57, 60, 64],
  Bbmaj7: [34, 46, 53, 57, 62],
  Fmaj9:  [41, 53, 57, 60, 64],
  Gm9:    [43, 55, 58, 62, 65],
  Gm7:    [43, 55, 58, 62],
  Cadd9:  [36, 48, 52, 55, 62],
  Asus:   [33, 45, 50, 52, 57],
  D5:     [38, 50, 57, 62],
};

export type Mood = 'sparse' | 'dark' | 'lift' | 'resolve';
const PROGRESSION: Record<Mood, string[]> = {
  sparse:  ['Dm9', 'Bbmaj7', 'Fmaj9', 'Cadd9'],
  dark:    ['Dm9', 'Gm7', 'Bbmaj7', 'Asus'],
  lift:    ['Bbmaj7', 'Fmaj9', 'Gm9', 'D5'],
  resolve: ['Bbmaj7', 'Cadd9', 'Dm9', 'D5'],
};
const LEVEL: Record<Mood, number> = { sparse: 0.5, dark: 0.56, lift: 0.78, resolve: 0.72 };

// the ledger bell motif — D4 F4 A4 G4 (bar 1, eighth positions)
const MOTIF: { m: number; at: number; vel: number }[] = [
  { m: 62, at: 0.0, vel: 0.14 },
  { m: 65, at: 0.75, vel: 0.11 },
  { m: 69, at: 1.5, vel: 0.12 },
  { m: 67, at: 2.6, vel: 0.10 },
];

export interface ScoreNote {
  midi: number;
  atSec: number;
  durSec: number;
  vel: number;
  voice: 'pad' | 'piano' | 'sub' | 'bell' | 'swell' | 'tick';
  pan?: number;
}

/** one deterministic 4-bar loop for a mood/variant */
export function moodScore(mood: Mood, variant: number): ScoreNote[] {
  const notes: ScoreNote[] = [];
  const prog = PROGRESSION[mood];
  const rng = mulberry(variant * 977 + mood.length * 131 + 61);
  for (let bar = 0; bar < LOOP_BARS; bar++) {
    const chord = CHORDS[prog[bar]];
    const root = chord[0];
    const barAt = bar * 4 * BEAT;
    // pad — whole bar
    chord.slice(1).forEach((m, i) => {
      notes.push({ midi: m, atSec: barAt, durSec: 4 * BEAT * 1.04, vel: 0.11 * (i === 0 ? 1.15 : 1), voice: 'pad', pan: (i % 2 === 0 ? -0.3 : 0.3) + (rng() - 0.5) * 0.2 });
    });
    // sub — root, bar start + beat 3
    notes.push({ midi: root, atSec: barAt, durSec: 2.2 * BEAT, vel: 0.17, voice: 'sub', pan: 0 });
    if (mood !== 'sparse') notes.push({ midi: root + 7, atSec: barAt + 2 * BEAT, durSec: 1.6 * BEAT, vel: 0.12, voice: 'sub', pan: 0 });
    // glass piano — sparse low arpeggio on beats 1/3, variant-dependent
    const arpNotes = [chord[1], chord[2], chord[3]];
    const playsArp = variant % 2 === bar % 2 || mood === 'lift';
    if (playsArp && (bar % 2 === 0 || mood === 'lift')) {
      const pick1 = arpNotes[Math.floor(rng() * arpNotes.length)];
      const pick2 = arpNotes[Math.floor(rng() * arpNotes.length)];
      notes.push({ midi: pick1, atSec: barAt + (rng() < 0.3 ? BEAT : 0), durSec: 2.6, vel: 0.13, voice: 'piano', pan: (rng() - 0.5) * 1.4 });
      if (mood === 'lift' || rng() < 0.5) {
        notes.push({ midi: pick2 + 12, atSec: barAt + 2 * BEAT + (rng() < 0.4 ? BEAT * 0.5 : 0), durSec: 2.2, vel: 0.09, voice: 'piano', pan: (rng() - 0.5) * 1.4 });
      }
    }
    // soft clock tick (beats 2 & 4) for momentum moods
    if ((mood === 'lift' || mood === 'resolve') && variant > 0) {
      notes.push({ midi: 0, atSec: barAt + BEAT, durSec: 0.05, vel: 0.5, voice: 'tick', pan: 0.15 });
      notes.push({ midi: 0, atSec: barAt + 3 * BEAT, durSec: 0.05, vel: 0.42, voice: 'tick', pan: -0.15 });
    }
  }
  // ledger bell motif — variant 0 opens the loop, variant 3 answers in bar 4
  if (variant === 0 || variant === 3) {
    const off = variant === 3 ? 3 * 4 * BEAT : 0;
    for (const n of MOTIF) {
      notes.push({ midi: n.m, atSec: off + n.at, durSec: 4.2, vel: n.vel, voice: 'bell', pan: 0.2 });
    }
  }
  // swell at loop head on variant 1
  if (variant === 1) {
    notes.push({ midi: 0, atSec: 0, durSec: 2.4, vel: 0.6, voice: 'swell', pan: 0 });
  }
  return notes;
}

/** the show theme — 8 bars, quoted at the cold open, mid-film, and close */
export function themeScore(bars = 8): ScoreNote[] {
  const notes: ScoreNote[] = [];
  const prog = ['Dm9', 'Bbmaj7', 'Fmaj9', 'Cadd9', 'Dm9', 'Gm7', 'Bbmaj7', 'D5'];
  for (let bar = 0; bar < Math.min(bars, prog.length); bar++) {
    const chord = CHORDS[prog[bar]];
    const barAt = bar * 4 * BEAT;
    chord.slice(1).forEach((m, i) => {
      notes.push({ midi: m, atSec: barAt, durSec: 4 * BEAT * 1.05, vel: 0.10 * (i === 0 ? 1.2 : 1), voice: 'pad', pan: i % 2 ? 0.28 : -0.28 });
    });
    notes.push({ midi: chord[0], atSec: barAt, durSec: 3.4 * BEAT, vel: 0.18, voice: 'sub' });
  }
  // bell melody over the first 4 bars (the motif, then the answer)
  const melody: { m: number; at: number }[] = [
    { m: 62, at: 0 }, { m: 65, at: 0.75 }, { m: 69, at: 1.5 }, { m: 74, at: 3.0 },
    { m: 72, at: 5.0 }, { m: 69, at: 5.75 }, { m: 65, at: 6.5 },
    { m: 62, at: 8.5 }, { m: 67, at: 9.75 }, { m: 69, at: 10.5 }, { m: 74, at: 12.0 },
  ];
  for (const n of melody) {
    notes.push({ midi: n.m, atSec: n.at * BEAT, durSec: 3.8, vel: 0.15, voice: 'bell', pan: 0.18 });
  }
  return notes;
}

export function themeCoda(): ScoreNote[] {
  // bar 8 alone: D5 held + bell D
  return [
    { midi: 38, atSec: 0, durSec: 4 * BEAT, vel: 0.16, voice: 'sub' },
    { midi: 50, atSec: 0, durSec: 4 * BEAT * 1.05, vel: 0.10, voice: 'pad' },
    { midi: 62, atSec: 0, durSec: 4 * BEAT * 1.05, vel: 0.11, voice: 'pad' },
    { midi: 74, atSec: 0.5, durSec: 3.6, vel: 0.14, voice: 'bell', pan: 0.2 },
  ];
}

// ── renderers ────────────────────────────────────────────────────────────────
export function renderNote(
  L: Float32Array, R: Float32Array, note: ScoreNote, sr: number, gain: number, startOffset = 0
): void {
  const at = Math.round((startOffset + note.atSec) * sr);
  if (at >= L.length) return;
  const dur = Math.max(0.05, note.durSec + 0.001);
  const n = Math.min(L.length - at, Math.ceil(dur * sr));
  const pan = note.pan ?? 0;
  const gl = gain * (1 - Math.max(0, pan));
  const gr = gain * (1 + Math.min(0, pan));
  switch (note.voice) {
    case 'pad': {
      const f = mtof(note.midi);
      const det = 0.7; // Hz
      let lpL = 0, lpR = 0, bp = 0.0035 + 0.0012 * Math.sin(at / sr / 3);
      const att = Math.min(1.4, dur * 0.35), rel = Math.min(1.8, dur * 0.4);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.min(1, t / att) * Math.min(1, Math.max(0, (dur - t) / rel));
        const ph = t * f;
        const saw = 2 * (ph - Math.floor(ph + 0.5));
        const sawD = 2 * ((ph + det / f) - Math.floor(ph + det / f + 0.5));
        // one-pole lowpass for warmth
        lpL += bp * (saw * 0.7 + sawD * 0.3 - lpL);
        lpR += bp * (sawD * 0.7 + saw * 0.3 - lpR);
        L[at + i] += lpL * env * note.vel * 2.2 * gl;
        R[at + i] += lpR * env * note.vel * 2.2 * gr;
      }
      break;
    }
    case 'piano': {
      const f = mtof(note.midi);
      const decay = Math.exp(-1.1);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.exp(-t * 1.6) * Math.min(1, t / 0.012);
        const s = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 3.5) + 0.12 * Math.sin(2 * Math.PI * f * 5 * t) * Math.exp(-t * 5);
        const v = s * env * note.vel * 0.5 * decay;
        L[at + i] += v * gl;
        R[at + i] += v * gr;
      }
      break;
    }
    case 'sub': {
      const f = mtof(note.midi);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.min(1, t / 0.06) * Math.exp(-t * 0.7);
        const s = Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 1.8);
        const v = s * env * note.vel * 0.9;
        L[at + i] += v * gl;
        R[at + i] += v * gr;
      }
      break;
    }
    case 'bell': {
      const f = mtof(note.midi);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.exp(-t * 1.05) * Math.min(1, t / 0.006);
        const s = Math.sin(2 * Math.PI * f * t)
          + 0.22 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 2.2)
          + 0.07 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 3.4);
        const v = s * env * note.vel * 0.62;
        L[at + i] += v * gl;
        R[at + i] += v * gr;
      }
      break;
    }
    case 'swell': {
      let seed = 987654321;
      const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const p = t / dur;
        const env = Math.sin(Math.PI * p) * Math.min(1, p * 4);
        const cut = 0.06 + 0.20 * p;
        const x = rand();
        lp += cut * (x - lp);
        const v = lp * env * note.vel * 0.24;
        L[at + i] += v * gl;
        R[at + i] += v * gr;
      }
      break;
    }
    case 'tick': {
      let seed = 24680;
      const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = Math.exp(-t * 300);
        const v = (rand() * 0.4 + Math.sin(2 * Math.PI * 2100 * t) * 0.6) * env * note.vel * 0.2;
        L[at + i] += v * gl;
        R[at + i] += v * gr;
      }
      break;
    }
  }
}

/** full 4-bar mood loop → Float32 pair at 24 kHz */
export function renderMoodLoopDsp(mood: Mood, variant: number, vol: number): { L: Float32Array; R: Float32Array } {
  const L = new Float32Array(LOOP_LEN);
  const R = new Float32Array(LOOP_LEN);
  const notes = moodScore(mood, variant);
  const gain = LEVEL[mood] * vol * 0.5;
  for (const n of notes) renderNote(L, R, n, SR_BGM, gain);
  return { L, R };
}

/** circular reverb — bright chamber (different voice from the old dark plate) */
export function reverbLoopCircular(lp: Float32Array, mix: number): Float32Array {
  const n = lp.length;
  const out = new Float32Array(n);
  const combs = [[1553, 0.80], [1801, 0.78], [2099, 0.76], [2311, 0.74]];
  const allp = [[217, 0.68], [61, 0.64]];
  const wet = new Float32Array(n);
  for (const [d, fb] of combs) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      s = lp[i] + (i >= d ? wet[i - d] * fb : out[n + i - d] ? 0 : 0);
      if (i >= d) wet[i] = s;
      else {
        // wrap tail
        s = lp[i];
      }
    }
    // second pass to fill the head from the tail (seamless tiling)
    for (let i = 0; i < d && i < n; i++) {
      wet[i] = lp[i] + wet[n + i - d] * fb;
    }
    for (let i = 0; i < n; i++) out[i] += wet[i];
  }
  for (const [d, g] of allp) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const x = out[i];
      s = g * s + x - g * (i >= d ? out[i - d] : 0);
      out[i] = s;
    }
  }
  const res = new Float32Array(n);
  for (let i = 0; i < n; i++) res[i] = lp[i] * (1 - mix) + out[i] * mix * 1.4;
  return res;
}

function mulberry(seed: number): () => number {
  let s = Math.floor(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
