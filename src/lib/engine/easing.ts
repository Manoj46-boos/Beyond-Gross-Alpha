/**
 * AURUM engine — time primitives.
 * Every animated quantity in the film is a pure function of (t, seed) so the
 * render is exact under scrubbing, offline QA and full renders alike.
 */

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const clamp01 = (v: number): number => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const mix = lerp;
export const invLerp = (a: number, b: number, v: number): number => (b === a ? 0 : (v - a) / (b - a));

// ── easings ──────────────────────────────────────────────────────────────────
export const easeLinear = (t: number): number => clamp01(t);
export const easeInQuad = (t: number): number => { t = clamp01(t); return t * t; };
export const easeOutQuad = (t: number): number => { t = clamp01(t); return 1 - (1 - t) * (1 - t); };
export const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeInCubic = (t: number): number => { t = clamp01(t); return t * t * t; };
export const easeOutCubic = (t: number): number => { t = clamp01(t); return 1 - Math.pow(1 - t, 3); };
export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutQuart = (t: number): number => { t = clamp01(t); return 1 - Math.pow(1 - t, 4); };
export const easeInOutQuart = (t: number): number => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(t)));
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
export const easeOutBack = (t: number): number => {
  const c = 1.55;
  const u = clamp01(t) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

/** rise → hold → fall smooth window (trapezoid with sine shoulders) */
export function window4(t: number, a: number, b: number, c: number, d: number): number {
  if (t <= a || t >= d) return 0;
  if (t < b) return easeInOutSine((t - a) / Math.max(1, b - a));
  if (t <= c) return 1;
  return 1 - easeInOutSine((t - c) / Math.max(1, d - c));
}

/** closed-form under-damped spring — anticipation, overshoot, settle */
export function springTo(from: number, to: number, tMs: number, stiffness = 170, damping = 21): number {
  if (tMs <= 0) return from;
  const t = tMs / 1000;
  const x = to - from;
  const w = Math.sqrt(stiffness);
  const z = damping / (2 * Math.sqrt(stiffness));
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    const env = Math.exp(-z * w * t);
    return to - x * env * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }
  return to - x * Math.exp(-w * t) * (1 + w * t);
}

/** pop-in with overshoot: {s, a} */
export function popIn(t: number, dur = 560): { s: number; a: number } {
  const s = t <= 0 ? 0 : springTo(0.72, 1, Math.min(t, dur), 200, 17);
  return { s: t <= 0 ? 0.72 : s, a: clamp01(t / 140) };
}

/** staggered child entrance */
export function stagger(
  t: number, i: number, per = 110, dur = 560, start = 0, fn = easeOutCubic
): number {
  return fn((t - start - i * per) / dur);
}

// ── deterministic variation ──────────────────────────────────────────────────
export function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
export function seededRandom(seed: number): () => number {
  let s = Math.floor(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
export function hashPick<T>(seed: number, arr: T[]): T {
  return arr[Math.floor(hash01(seed) * arr.length) % arr.length];
}
export function hashRange(seed: number, a: number, b: number): number {
  return a + hash01(seed) * (b - a);
}
/** 1-D value noise */
export function noise1(x: number): number {
  const xi = Math.floor(x);
  const xf = x - xi;
  const u = xf * xf * (3 - 2 * xf);
  return lerp(hash01(xi), hash01(xi + 1), u);
}
/** layered slow drift — organic camera/float motion */
export function drift(t: number, seed = 0): number {
  return (
    Math.sin(t / 8300 + seed * 12.9) * 0.55 +
    Math.sin(t / 3600 + seed * 7.3) * 0.3 +
    Math.sin(t / 15500 + seed * 3.1) * 0.15
  );
}

// ── number formatting ────────────────────────────────────────────────────────
export function fmtMoney(v: number, decimals = 1, trimZeros = false): string {
  const neg = v < 0;
  const a = Math.abs(v);
  let s: string;
  if (a >= 1e9) s = `$${(a / 1e9).toFixed(1)}B`;
  else if (a >= 1e6) {
    const m = a / 1e6;
    s = `$${m.toFixed(decimals)}M`;
    if (trimZeros) s = s.replace(/\.0+M/, 'M');
  } else if (a >= 1e3) s = `$${Math.round(a / 1e3)}K`;
  else s = `$${a.toFixed(0)}`;
  return neg ? `−${s}` : s;
}
export function fmtComma(v: number): string {
  return Math.round(v).toLocaleString('en-US');
}
export function fmtPct(v: number, decimals = 0): string {
  return `${v.toFixed(decimals)}%`;
}
export function fmtCountUp(target: number, p: number, decimals = 0, prefix = '', suffix = ''): string {
  const v = target * clamp01(p);
  return `${prefix}${v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

/** punctuation-aware pause after a sentence (ms) — real narrators breathe */
export function gapAfter(sentence: string): number {
  const s = sentence.replace(/[""''\u201d\u2019]+$/u, '').trim();
  let gap = 110;
  if (/[.!?]/.test(s.slice(-2))) gap += 260;
  else if (/[,;:\u2014\u2013]/.test(s.slice(-2))) gap += 90;
  if (/[.!?]$/.test(s) && /\b(paradox|cost|gone|destroyed|silence|kept|nothing|arithmetic|fact|brochure|worship|million|advice)\b/i.test(s)) {
    gap += 240;
  }
  return gap;
}

/** split VO text into sentences (abbreviation-guarded) */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const parts = text.split(/(?<=[.!?])\s+(?=[""A-Z0-9$])/u);
  for (const raw of parts) {
    const s = raw.trim();
    if (!s) continue;
    if (out.length && out[out.length - 1].split(/\s+/).length < 3) {
      out[out.length - 1] += ` ${s}`;
    } else {
      out.push(s);
    }
  }
  return out.length ? out : [text.trim()];
}
