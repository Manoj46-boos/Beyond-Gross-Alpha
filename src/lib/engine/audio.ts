/**
 * AURUM mix — VO placement + deep-ducked score + the film's SFX grammar.
 * SFX: paper tick (source chips), sheen riser (transitions — no whooshes),
 * sub boom (stamps), glass ping (number locks), seal (card slams),
 * token flip. Mastering: glue compressor + −14 LUFS.
 */

import { Timeline } from './timeline';
import { CHAPTER_MOODS } from './timeline';
import { renderMoodLoopDsp, Mood, SR_BGM, LOOP_LEN, renderNote, themeScore, themeCoda, BEAT, ScoreNote } from './score';

const SR_OUT = 48000;
const BED_REF_VOL = 0.5;

export interface MixInput {
  timeline: Timeline;
  voBuffers: Map<string, AudioBuffer>;
  bgmVolume: number;
  voVolume: number;
  onProgress?: (frac: number, label: string) => void;
}

function getSharedAudioContext(): AudioContext {
  const w = globalThis as any;
  if (!w.__sharedAudioCtx) {
    w.__sharedAudioCtx = new (w.AudioContext || w.webkitAudioContext)();
  }
  return w.__sharedAudioCtx;
}

/** VO chain: rumble cut + presence lift — keep the measured narrator upfront */
function makeVoShelf(): (x: number) => number {
  let lp = 0, hp = 0;
  return (x: number) => {
    lp += 0.0085 * (x - lp);
    const xv = x - lp;
    hp += 0.24 * (xv - hp);
    return xv + 0.32 * hp;
  };
}

// ── SFX (all hand-drawn DSP at 48 kHz) ───────────────────────────────────────
function addPaperTick(L: Float32Array, R: Float32Array, startSec: number, gain: number): void {
  // the script's "receipt" tick — a tiny filtered crackle + soft tick tone
  const start = Math.floor(startSec * SR_OUT);
  let seed = 13579;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
  const dur = 0.09;
  let bp = 0, bp2 = 0;
  for (let i = 0; i < dur * SR_OUT; i++) {
    const t = i / SR_OUT;
    const env = Math.exp(-t * 90) * Math.min(1, t / 0.002);
    const x = rand();
    bp += 0.28 * (x - bp); // crude band-pass
    bp2 += 0.12 * (x - bp2);
    const v = (bp - bp2) * env * gain * 0.5;
    const at = start + i;
    if (at < L.length) { L[at] += v * 0.9; R[at] += v * 1.1; }
  }
  // soft tick body
  for (let i = 0; i < 0.05 * SR_OUT; i++) {
    const t = i / SR_OUT;
    const v = Math.sin(2 * Math.PI * 1980 * t) * Math.exp(-t * 110) * gain * 0.10;
    const at = start + i + 30;
    if (at < L.length) { L[at] += v; R[at] += v; }
  }
}

function addSheen(L: Float32Array, R: Float32Array, startSec: number, gain: number): void {
  // transition riser: band-passed shimmer sweeping up — elegant, not a whoosh
  const start = Math.floor(startSec * SR_OUT);
  const dur = 0.85;
  let seed = 246813;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
  let lp = 0;
  for (let i = 0; i < dur * SR_OUT; i++) {
    const t = i / SR_OUT;
    const p = t / dur;
    const cut = 0.05 + 0.55 * p * p;
    const x = rand();
    lp += cut * (x - lp);
    const env = Math.min(1, p * 4) * Math.pow(Math.max(0, 1 - p * p * p), 1.5);
    // shimmer partials
    const sh = Math.sin(2 * Math.PI * (1400 + 900 * p) * t) * 0.3 * Math.exp(-t * 1.2) * Math.sin(Math.PI * p);
    const v = (lp * 0.7 + sh * 0.5) * env * gain * 0.11;
    const at = start + i;
    if (at < L.length) {
      L[at] += v * (0.6 + 0.4 * p);
      R[at] += v * (1.0 - 0.4 * p);
    }
  }
}

function addBoom(L: Float32Array, R: Float32Array, startSec: number, gain: number): void {
  // sub boom for stamps/reveals
  const start = Math.floor(startSec * SR_OUT);
  const dur = 0.9;
  let seed = 555111;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
  let lp = 0;
  for (let i = 0; i < dur * SR_OUT; i++) {
    const t = i / SR_OUT;
    const f = 88 * Math.exp(-t * 6) + 36;
    const env = Math.exp(-t * 5.5) * Math.min(1, t / 0.004);
    const x = rand();
    lp += 0.015 * (x - lp);
    const v = (Math.sin(2 * Math.PI * f * t) * 0.9 + lp * 2.2) * env * gain * 0.34;
    const at = start + i;
    if (at < L.length) { L[at] += v; R[at] += v; }
  }
}

function addGlassPing(L: Float32Array, R: Float32Array, startSec: number, gain: number, freq = 1568): void {
  const start = Math.floor(startSec * SR_OUT);
  const dur = 1.1;
  for (let i = 0; i < dur * SR_OUT; i++) {
    const t = i / SR_OUT;
    const env = Math.exp(-t * 5.2) * Math.min(1, t / 0.004);
    const s = Math.sin(2 * Math.PI * freq * t)
      + 0.2 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t * 4)
      + 0.08 * Math.sin(2 * Math.PI * freq * 5.4 * t) * Math.exp(-t * 6);
    const v = s * env * gain * 0.22;
    const at = start + i;
    if (at < L.length) {
      L[at] += v * 0.85;
      R[at] += v * 1.15;
    }
  }
}

function addSeal(L: Float32Array, R: Float32Array, startSec: number, gain: number): void {
  // stamp slam: descending noise + 70 Hz thud
  const start = Math.floor(startSec * SR_OUT);
  const dur = 0.5;
  let seed = 90210;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
  let lp = 0;
  for (let i = 0; i < dur * SR_OUT; i++) {
    const t = i / SR_OUT;
    const p = t / dur;
    const cut = 0.5 - 0.36 * p;
    const x = rand();
    lp += cut * (x - lp);
    const env = Math.pow(Math.max(0, 1 - p), 1.4);
    let v = lp * env * gain * 0.20;
    if (t > 0.04) {
      v += Math.sin(2 * Math.PI * 70 * (t - 0.04)) * Math.exp(-(t - 0.04) * 16) * gain * 0.18;
    }
    const at = start + i;
    if (at < L.length) { L[at] += v; R[at] += v; }
  }
}

function addTokenFlip(L: Float32Array, R: Float32Array, startSec: number, gain: number): void {
  const start = Math.floor(startSec * SR_OUT);
  for (const [dt, f] of [[0, 2400], [0.045, 3120]] as [number, number][]) {
    const s0 = start + Math.floor(dt * SR_OUT);
    for (let i = 0; i < 0.16 * SR_OUT; i++) {
      const t = i / SR_OUT;
      const env = Math.exp(-t * 26);
      const v = Math.sin(2 * Math.PI * f * t) * env * gain * 0.12;
      const at = s0 + i;
      if (at < L.length) { L[at] += v * 0.9; R[at] += v * 1.1; }
    }
  }
}

// ── theme statements ─────────────────────────────────────────────────────────
function renderThemeNotes(L: Float32Array, R: Float32Array, notes: ScoreNote[], startSec: number, gain: number): void {
  for (const n of notes) renderNote(L, R, n, SR_OUT, gain, startSec);
}

// ── mastering ────────────────────────────────────────────────────────────────
function masterGlue(L: Float32Array, R: Float32Array): void {
  const GRID = 96;
  const threshold = 0.25, ratio = 2.5;
  let env = 0;
  const attC = 0.85, relC = 0.55;
  for (let i = 0; i < L.length; i++) {
    const peak = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    const target = peak > threshold ? threshold + (peak - threshold) / ratio : peak;
    env += (peak > env ? attC : relC) * (target - env);
    const gain = peak > 0 ? env / peak : 1;
    const makeup = 1.35;
    L[i] = Math.tanh(L[i] * gain * makeup) * 0.92;
    R[i] = Math.tanh(R[i] * gain * makeup) * 0.92;
    void GRID;
  }
}

function normalizeLufs(L: Float32Array, R: Float32Array, sr: number, targetLufs = -14): void {
  let sum = 0, count = 0;
  const stride = 977;
  let hpL = 0, hpR = 0;
  for (let i = 0; i < L.length; i += stride) {
    const l = L[i] - (hpL += 0.02 * (L[i] - hpL));
    const r = R[i] - (hpR += 0.02 * (R[i] - hpR));
    sum += (l * l + r * r) / 2;
    count++;
  }
  const meanSq = sum / Math.max(1, count);
  const lufs = -0.691 + 10 * Math.log10(Math.max(1e-9, meanSq));
  let gainDb = Math.min(12, Math.max(-12, targetLufs - lufs));
  const gain = Math.pow(10, gainDb / 10);
  let peak = 0;
  for (let i = 0; i < L.length; i++) {
    L[i] *= gain; R[i] *= gain;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  if (peak > 0.985) {
    const k = 0.985 / peak;
    for (let i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k; }
  }
  void sr;
}

// ── main mix ─────────────────────────────────────────────────────────────────
export async function renderMix(input: MixInput): Promise<AudioBuffer> {
  const { timeline: tl, voBuffers, bgmVolume, voVolume, onProgress } = input;
  const ac = getSharedAudioContext();
  const totalLen = Math.ceil(((tl.durationMs + 1000) / 1000) * SR_OUT);
  const L = new Float32Array(totalLen);
  const R = new Float32Array(totalLen);

  onProgress?.(0.02, 'composing the ledger score');

  // ── BGM beds: tile mood loops per chapter, rotating variants ──
  const loopCache = new Map<string, { L: Float32Array; R: Float32Array }>();
  const getLoop = (mood: Mood, variant: number) => {
    const k = `${mood}-${variant}`;
    if (!loopCache.has(k)) {
      const raw = renderMoodLoopDsp(mood, variant, bgmVolume);
      // circular reverb pass for space
      const revL = circularReverb(raw.L, 0.22);
      const revR = circularReverb(raw.R, 0.22);
      loopCache.set(k, { L: revL, R: revR });
    }
    return loopCache.get(k)!;
  };

  const base = Math.max(0.02, bgmVolume * 0.5);
  const ducked = base * 0.12; // the script's −22 LUFS-style deep duck
  const gapLvl = Math.min(1, base * 1.5);

  // duck control grid, 5 ms
  const gridSec = 0.005;
  const gridN = Math.ceil(totalLen / (gridSec * SR_OUT)) + 2;
  const levels = new Float32Array(gridN).fill(base);

  // apply VO intervals: duck to 12% inside [start−0.18, end+0.32]
  for (const v of tl.voIntervals) {
    const i0 = Math.max(0, Math.floor((v.start - 0.18) / gridSec));
    const i1 = Math.min(gridN - 1, Math.ceil((v.end + 0.32) / gridSec));
    for (let i = i0; i <= i1; i++) levels[i] = ducked;
  }
  // music-out windows: near silence
  for (const s of tl.silenceWindows) {
    const i0 = Math.max(0, Math.floor((s.start - 0.05) / gridSec));
    const i1 = Math.min(gridN - 1, Math.ceil((s.end + 0.12) / gridSec));
    for (let i = i0; i <= i1; i++) levels[i] = Math.min(levels[i], Math.max(0.012, ducked * 0.12));
  }
  // inter-sentence gaps breathe up
  for (let b = 0; b < tl.beats.length; b++) {
    const beat = tl.beats[b];
    const g0 = (beat.startMs + beat.speakEndMs) / 1000;
    const g1 = (b + 1 < tl.beats.length ? tl.beats[b + 1].startMs : tl.durationMs) / 1000;
    const i0 = Math.max(0, Math.floor(g0 / gridSec));
    const i1 = Math.min(gridN - 1, Math.ceil(g1 / gridSec));
    for (let i = i0; i <= i1; i++) levels[i] = Math.min(levels[i], gapLvl);
  }
  // intro fade-in / final fade-out
  const fadeIn = 2.0, fadeOut = 4.0;
  for (let i = 0; i < gridN; i++) {
    const t = i * gridSec;
    if (t < fadeIn) levels[i] *= 0.35 + 0.65 * (t / fadeIn);
    const tEnd = totalLen / SR_OUT;
    if (t > tEnd - fadeOut) levels[i] *= Math.max(0, (tEnd - t) / fadeOut);
  }

  // tile the loops
  let chapterIdx = 0;
  let variant = 0;
  let pos = 0;
  while (pos < totalLen / SR_OUT) {
    const ch = tl.chapters[chapterIdx];
    const mood = CHAPTER_MOODS[Math.min(chapterIdx, CHAPTER_MOODS.length - 1)];
    const loop = getLoop(mood, variant % 4);
    // stop the loop at the chapter end (crossfade 0.45s at boundary)
    const chEnd = ch ? ch.endMs / 1000 + 0.45 : totalLen / SR_OUT;
    const writeEnd = Math.min(totalLen / SR_OUT, chEnd, pos + LOOP_LEN / SR_BGM);
    for (let t = Math.floor(pos * SR_OUT); t < Math.floor(writeEnd * SR_OUT); t++) {
      const local = (t - Math.floor(pos * SR_OUT)) / SR_OUT * SR_BGM;
      const i0 = Math.floor(local) % LOOP_LEN;
      const fr = local - Math.floor(local);
      const sL = loop.L[i0] * (1 - fr) + loop.L[(i0 + 1) % LOOP_LEN] * fr;
      const sR = loop.R[i0] * (1 - fr) + loop.R[(i0 + 1) % LOOP_LEN] * fr;
      const gridIdx = Math.min(gridN - 1, Math.floor(t / (gridSec * SR_OUT)));
      const gA = Math.min(gridN - 1, gridIdx + 1);
      const fr2 = (t / (gridSec * SR_OUT)) - gridIdx;
      const lvl = levels[gridIdx] * (1 - fr2) + levels[gA] * fr2;
      L[t] += sL * (lvl / BED_REF_VOL);
      R[t] += sR * (lvl / BED_REF_VOL);
    }
    if (writeEnd >= chEnd - 0.001) { chapterIdx++; variant = 0; } else variant++;
    pos = writeEnd;
    if (chapterIdx >= tl.chapters.length) break;
  }
  onProgress?.(0.35, 'placing the narration');

  // ── VO placement ──
  const shelf = makeVoShelf();
  let placed = 0;
  for (const beat of tl.beats) {
    for (const s of beat.sentences) {
      const buf = voBuffers.get(s.lineId);
      if (!buf) continue;
      const src = buf.getChannelData(0);
      const srcRate = buf.sampleRate;
      const ratio = srcRate / SR_OUT;
      const startIdx = Math.floor((s.startMs / 1000) * SR_OUT);
      const outN = Math.floor(src.length / ratio);
      for (let i = 0; i < outN; i++) {
        const at = startIdx + i;
        if (at >= totalLen) break;
        const si = i * ratio;
        const i0 = Math.floor(si);
        const fr = si - i0;
        const v0 = src[i0] ?? 0;
        const v1 = src[i0 + 1] ?? v0;
        const v = (v0 * (1 - fr) + v1 * fr);
        const shaped = shelf(v) * voVolume;
        L[at] += shaped;
        R[at] += shaped;
      }
      placed++;
      if (placed % 24 === 0) onProgress?.(0.35 + 0.2 * (placed / Math.max(1, voBuffers.size)), `placing narration ${placed}`);
    }
  }

  onProgress?.(0.6, 'designing the sound');

  // ── SFX grammar ──
  // sheen at every hard cut (tiered gain: part card > type change > same)
  for (const ct of tl.cutTimes) {
    const beat = tl.beats.find((b) => Math.abs(b.startMs - ct) < 1);
    const isCard = tl.chapterCards.some((c) => Math.abs(c.startMs - ct) < 1);
    const g = isCard ? 1.0 : beat ? 0.62 : 0.4;
    addSheen(L, R, ct / 1000 - 0.42, g * (0.5 + bgmVolume * 0.5));
    if (isCard) addGlassPing(L, R, ct / 1000 + 0.55, 0.8, 1568);
  }
  // paper ticks at source chips
  for (const sc of tl.sourceChips) {
    addPaperTick(L, R, sc.time / 1000, 0.9);
  }
  // glass pings when data settles
  for (const dt of tl.dataDingTimes) {
    addGlassPing(L, R, dt / 1000, 0.55, 1318.5);
  }
  // booms at statement/stamp scenes + seal at stampCard
  for (const b of tl.beats) {
    const type = b.beat.scene.type;
    if (type === 'stampCard' || type === 'secCase') {
      addBoom(L, R, (b.startMs + 120) / 1000, 1.0);
      addSeal(L, R, (b.startMs + 660) / 1000, 0.9);
    } else if (type === 'statement' || type === 'bigText') {
      addBoom(L, R, (b.startMs + 160) / 1000, 0.6);
    } else if (type === 'signatureCurve') {
      addGlassPing(L, R, (b.startMs + 2400) / 1000, 0.7, 1046.5);
      addBoom(L, R, (b.startMs + 100) / 1000, 0.5);
    }
  }
  // theme statements: cold-open end, mid-film (after SEC), close
  const themeGain = Math.max(0.3, bgmVolume * 0.55);
  const coldOpenEnd = tl.chapters[1]?.startMs;
  if (coldOpenEnd != null) renderThemeNotes(L, R, themeScore(4), coldOpenEnd / 1000 - 1.2, themeGain * 0.8);
  const lastChapter = tl.chapters[tl.chapters.length - 1];
  if (lastChapter) {
    renderThemeNotes(L, R, themeScore(8), lastChapter.startMs / 1000 - 0.8, themeGain * 0.9);
    renderThemeNotes(L, R, themeCoda(), (tl.durationMs - 7000) / 1000, themeGain);
  }
  // token flips on TLH mechanic beats
  for (const b of tl.beats) {
    if (b.beat.scene.type === 'tlhMechanic' && b.beatIndex === 0) {
      addTokenFlip(L, R, (b.startMs + b.speakStartMs + 1200) / 1000, 0.8);
      addTokenFlip(L, R, (b.startMs + b.speakStartMs + 2600) / 1000, 0.6);
    }
  }

  onProgress?.(0.85, 'mastering to −14 LUFS');
  masterGlue(L, R);
  normalizeLufs(L, R, SR_OUT, -14);

  // into an AudioBuffer
  const out = ac.createBuffer(2, totalLen, SR_OUT);
  out.copyToChannel(L, 0);
  out.copyToChannel(R, 1);
  onProgress?.(1, 'mix complete');
  return out;
}

/** helper — circular reverb with tail wrap (works on any length loop) */
function circularReverb(inp: Float32Array, mix: number): Float32Array {
  const n = inp.length;
  const out = new Float32Array(n);
  const combs = [[1553, 0.80], [1801, 0.78], [2099, 0.76], [2311, 0.74]];
  const wet = new Float32Array(n);
  for (const [d0, fb] of combs) {
    const d = Math.min(d0, Math.floor(n / 2));
    for (let i = 0; i < n; i++) {
      const prev = wet[(i - d + n) % n];
      wet[i] += inp[i] + prev * fb * 0.25;
    }
  }
  for (let i = 0; i < n; i++) out[i] = inp[i] * (1 - mix) + wet[i] * mix * 0.9;
  return out;
}

export { SR_OUT, BEAT };
