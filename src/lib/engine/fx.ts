/**
 * AURUM VFX — the cinematic layer.
 * Gold-dust motes, lens bokeh, volumetric god rays, depth-of-field pass,
 * film grain, cinematic vignette, light-blade sweeps, impact rings, bloom,
 * sub-boom shake. All pure functions of (t, seed) — scrub-exact.
 */

import { PALETTE, rgba, roundRect, glowBlob } from './theme';
import { clamp01, easeOutCubic, easeInOutSine, hash01, hashRange } from './easing';

// ── camera state (published by director.ts, consumed here for parallax) ──────
export interface CamState { dx: number; dy: number; scale: number; }
export let camState: CamState = { dx: 0, dy: 0, scale: 1 };
export function setCamState(dx: number, dy: number, scale: number): void { camState = { dx, dy, scale }; }
export function depthShift(depth: number): { dx: number; dy: number; scale: number } {
  // background layers move WITH the camera at reduced rate → parallax
  return { dx: camState.dx * depth, dy: camState.dy * depth, scale: 1 + (camState.scale - 1) * depth };
}

// ── gold dust ────────────────────────────────────────────────────────────────
const DUST_BUDGET = 46;
export function goldDust(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, seed = 7, intensity = 1): void {
  const n = Math.round(DUST_BUDGET * intensity);
  for (let i = 0; i < n; i++) {
    const h1 = hash01(i * 3.7 + seed);
    const h2 = hash01(i * 7.9 + seed + 1);
    const h3 = hash01(i * 13.1 + seed + 2);
    const depth = h3 > 0.66 ? 0.92 : h3 > 0.33 ? 0.6 : 0.32;
    const speed = 5200 + h1 * 4200;
    const p = ((t / speed + h1) % 1);
    const x = (h2 * W + driftCamX(i) + Math.sin(t / (2400 + h1 * 1800) + i) * 26) % (W + 40) - 20;
    const y = H * (1.02 - p * 0.9) - h3 * 60;
    const r = (0.9 + h3 * 2.3) * depth;
    const tw = 0.5 + 0.5 * Math.sin(t / (500 + h1 * 500) + i * 4.7);
    const a = (0.10 + 0.22 * tw) * clamp01(p * 6) * clamp01((1 - p) * 4);
    if (a <= 0.01) continue;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(i % 5 === 0 ? PALETTE.goldPale : PALETTE.gold, a);
    ctx.fill();
    if (i % 7 === 0) {
      glowBlob(ctx, x, y, r * 6, PALETTE.gold, a * 0.5);
    }
  }
}
function driftCamX(i: number): number {
  return camState.dx * 0.5 * (0.3 + 0.7 * hash01(i * 2.3));
}

// ── bokeh field ──────────────────────────────────────────────────────────────
const BOKEH = 9;
export function bokehField(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, seed = 3, gold = true, intensity = 1): void {
  for (let i = 0; i < BOKEH; i++) {
    const h1 = hash01(i * 9.7 + seed);
    const h2 = hash01(i * 4.3 + seed + 8);
    const h3 = hash01(i * 6.1 + seed + 15);
    const depth = 0.25 + h3 * 0.6;
    const x = h1 * W + Math.sin(t / (9000 + h1 * 6000) + i * 2.7) * 60 + camState.dx * depth * 0.4;
    const y = h2 * H * 0.75 + Math.cos(t / (11000 + h2 * 7000) + i) * 40 + camState.dy * depth * 0.4;
    const r = (70 + h3 * 150) * (0.6 + depth);
    const tw = 0.6 + 0.4 * Math.sin(t / (3400 + h1 * 2200) + i * 1.9);
    const a = (gold ? 0.030 : 0.045) * tw * intensity;
    if (a < 0.008) continue;
    const col = gold && i % 3 === 0 ? PALETTE.gold : PALETTE.steel;
    glowBlob(ctx, x, y, r, col, a);
    // ring edge — the lens feel
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(col, a * 0.9);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

// ── volumetric god rays ──────────────────────────────────────────────────────
export function godRays(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number,
  opts: { alpha?: number; x?: number; sway?: number } = {}
): void {
  const { alpha = 0.5, x = W * 0.78, sway = 1 } = opts;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(x, -60);
  ctx.rotate(0.10 + Math.sin(t / 9000) * 0.02 * sway);
  for (let i = 0; i < 5; i++) {
    const h = hash01(i * 11.3 + 2);
    const w = 60 + h * 130;
    const off = (h - 0.5) * 640;
    const a = alpha * (0.16 + 0.10 * Math.sin(t / (3000 + i * 700) + i * 2.2));
    if (a <= 0.01) continue;
    const g = ctx.createLinearGradient(0, 0, 0, H * 1.1);
    g.addColorStop(0, rgba(PALETTE.goldPale, a * 0.9));
    g.addColorStop(0.5, rgba(PALETTE.goldBright, a * 0.5));
    g.addColorStop(1, rgba(PALETTE.gold, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(off - w / 2, 0);
    ctx.lineTo(off + w / 2, 0);
    ctx.lineTo(off + w * 1.35, H * 1.1);
    ctx.lineTo(off - w * 0.6, H * 1.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ── grain (3 tiles, overlay) ─────────────────────────────────────────────────
let grainTiles: any[] | null = null;
/** L-06 — a seeded PRNG (mulberry32): grain tiles are generated from a fixed
 *  seed so two renders of the same frame are pixel-identical — the engine
 *  contract "every animated quantity is a pure function of (t, seed)" holds
 *  for texture too, which is what makes one-shot re-renders and QA diffs
 *  trustworthy. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let s = Math.imul(a ^ (a >>> 15), 1 | a);
    s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}
function makeGrainTiles(): any[] {
  const tiles: any[] = [];
  const anyDoc = typeof document !== 'undefined' ? document : null;
  const mk = () => {
    if (anyDoc?.createElement) {
      const c = anyDoc.createElement('canvas');
      if (c && c.getContext) return c;
    }
    return null;
  };
  const rand = mulberry32(0x5EED1234);
  for (let k = 0; k < 3; k++) {
    const c = mk() as HTMLCanvasElement | null;
    if (!c) { tiles.push(null); continue; }
    c.width = 240; c.height = 240;
    const g = c.getContext('2d')!;
    const img = g.createImageData(240, 240);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + Math.floor(rand() * 20);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    tiles.push(c);
  }
  return tiles;
}
export function drawGrain(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, alpha = 0.10): void {
  if (alpha <= 0.01) return;
  if (!grainTiles) grainTiles = makeGrainTiles();
  if (!grainTiles[0]) return;
  const idx = Math.floor(t / 50) % 3;
  const tile = grainTiles[idx];
  if (!tile) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  for (let x = 0; x < W; x += 240) for (let y = 0; y < H; y += 240) ctx.drawImage(tile, x, y);
  ctx.restore();
}

// ── cinematic vignette ───────────────────────────────────────────────────────
export function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, strength = 1): void {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.42, W / 2, H * 0.5, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.72, `rgba(2,4,10,${0.16 * strength})`);
  g.addColorStop(1, `rgba(1,2,6,${0.52 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ── depth of field (U1.1: cheap gaussian — quarter-size down + full-size up
// twice, applied ONLY to the bottom band 55%→880px so captions stay crisp) ───
let dofBuffer: any = null;
let dofBand: any = null;
export function dofPass(
  ctx: CanvasRenderingContext2D, W: number, H: number, strength: number
): void {
  if (strength <= 0.03) return;
  try {
    const mk = (w: number, h: number): any => {
      const c = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(w, h)
        : (typeof document !== 'undefined' ? document.createElement('canvas') : null);
      if (c && !c.getContext) return null;
      return c;
    };
    if (!dofBuffer) dofBuffer = mk(960, 540);
    if (!dofBuffer) return;
    const bw = Math.max(240, Math.floor(W / 4)), bh = Math.max(135, Math.floor(H / 4));
    if (dofBuffer.width !== bw) { dofBuffer.width = bw; dofBuffer.height = bh; }
    const bctx = dofBuffer.getContext('2d');
    if (!bctx) return;
    // the "down" half of the cheap gaussian
    bctx.clearRect(0, 0, bw, bh);
    bctx.imageSmoothingEnabled = true;
    bctx.drawImage(ctx.canvas, 0, 0, bw, bh);

    if (!dofBand) dofBand = mk(1920, 1080);
    if (!dofBand) return;
    if (dofBand.width !== W) { dofBand.width = W; dofBand.height = H; }
    const fctx = dofBand.getContext('2d');
    if (!fctx) return;
    // draw the quarter buffer back up to full size twice
    fctx.clearRect(0, 0, W, H);
    fctx.imageSmoothingEnabled = true;
    fctx.drawImage(dofBuffer, 0, 0, W, H);
    fctx.drawImage(dofBuffer, 0, 0, W, H);
    // band mask: from 55% of frame height down; the caption strip (below
    // y=880) is skipped entirely, the figure's head/torso stay sharp
    const bandTop = H * 0.55;
    const bandBot = H * (880 / 1080);
    const rampH = Math.max(8, (bandBot - bandTop) * 0.5);
    fctx.globalCompositeOperation = 'destination-in';
    const g = fctx.createLinearGradient(0, bandTop, 0, bandTop + rampH);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    fctx.fillStyle = g;
    fctx.fillRect(0, bandTop, W, rampH);
    fctx.fillStyle = '#000';
    fctx.fillRect(0, bandTop + rampH, W, Math.max(0, bandBot - bandTop - rampH));
    fctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalAlpha = clamp01(strength);
    ctx.drawImage(dofBand, 0, 0);
    ctx.restore();
  } catch { /* headless fallbacks: skip DOF */ }
}

// ── light blade (the AURUM transition) ──────────────────────────────────────
export function lightBlade(ctx: CanvasRenderingContext2D, W: number, H: number, p: number, color = PALETTE.goldBright): void {
  if (p <= 0 || p >= 1) return;
  const x = W * (-0.2 + p * 1.4);
  const w = 130;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(x - w, 0, x + w, H);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.42, rgba(color, 0.16 * Math.sin(Math.PI * p)));
  g.addColorStop(0.5, rgba('#FFF7DC', 0.55 * Math.sin(Math.PI * p)));
  g.addColorStop(0.58, rgba(color, 0.16 * Math.sin(Math.PI * p)));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 2.2, 0);
  ctx.lineTo(x + w * 0.2, 0);
  ctx.lineTo(x + w * 2.4, H);
  ctx.lineTo(x - w * 0.4, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── impact ring / seal burst ─────────────────────────────────────────────────
export function impactRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, t0: number, r = 150, scale = 1, col: string = PALETTE.gold): void {
  const age = t - t0;
  if (age < 0 || age > 620) return;
  const p = clamp01(age / 620);
  const rr = (r * 0.2 + r * easeOutCubic(p)) * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(col, 0.8 * (1 - p));
  ctx.lineWidth = 14 * (1 - p) + 1.5;
  ctx.stroke();
  if (scale > 1.2) {
    ctx.beginPath();
    ctx.arc(cx, cy, rr * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = rgba('#FFF3D6', 0.4 * (1 - p));
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// ── AUDIT §2.4 — contact punctuation ─────────────────────────────────────────
/** On every prop landing (bar catch, stamp slam, column land): a 6-mote gold
 *  dust puff bursts from the contact point while the ground shadow tightens
 *  20% for 150ms — the weight premium viewers feel without being able to
 *  name it. Pure additive pass; safe to drop after any landing draw. */
export function impactPuff(
  ctx: CanvasRenderingContext2D, x: number, y: number, t: number, t0: number,
  opts: { scale?: number } = {},
): void {
  const age = t - t0;
  if (age < 0 || age > 900) return;
  const k = opts.scale ?? 1;
  // the ground pool tightens 20% for the first 150ms, then relaxes
  if (age < 150) {
    const tight = 1 - 0.2 * (1 - age / 150);
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - age / 150);
    ctx.fillStyle = 'rgba(1,2,6,0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 92 * k * tight, 15 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 6 gold motes — an upward fan, each with its own grain and gravity
  for (let i = 0; i < 6; i++) {
    const h = hash01(i * 7.7 + 3.1);
    const ang = -Math.PI * (0.12 + h * 0.76);
    const sp = (0.5 + h * 0.5) * 150 * k;
    const rise = Math.min(1, age / 240);
    const px = x + Math.cos(ang) * sp * rise;
    const py = y + Math.sin(ang) * sp * rise + 46 * k * Math.pow(Math.max(0, age - 140) / 760, 2);
    const a = (1 - age / 900) * 0.85;
    if (a <= 0.02) continue;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = h > 0.5 ? '#FFD97A' : PALETTE.gold;
    ctx.beginPath();
    ctx.arc(px, py, (1.6 + h * 1.9) * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── U3.3 — the focus ping ────────────────────────────────────────────────────
/** A 2-frame gold ring on the scene's NEWEST element, fired at each sentence
 *  boundary so the viewer's eye lands exactly where the narration does. Pass
 *  the current sentenceT (ms since the sentence began); the ring blooms at
 *  ~40ms and is gone by ~340ms. */
export function focusPing(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  sentenceT: number | null | undefined, r = 90, col: string = PALETTE.goldBright
): void {
  if (sentenceT == null || sentenceT < 0 || sentenceT > 340) return;
  impactRing(ctx, x, y, sentenceT, 40, r, 0.85, col);
}

// ── soft bloom (reveal flash) ────────────────────────────────────────────────
export function softBloom(ctx: CanvasRenderingContext2D, W: number, H: number, age: number, dur = 420, strength = 0.16): void {
  if (age < 0 || age > dur) return;
  const p = clamp01(age / dur);
  ctx.fillStyle = rgba('#F2E3B3', strength * (1 - p) * Math.sin(Math.PI * Math.min(1, p * 2.4)));
  ctx.fillRect(0, 0, W, H);
}

// ── micro shake ──────────────────────────────────────────────────────────────
export function microShake(t: number, t0: number, amp = 10): { dx: number; dy: number } {
  const age = t - t0;
  if (age < 0 || age > 380) return { dx: 0, dy: 0 };
  const k = Math.floor(age / 33);
  const decay = (1 - clamp01(age / 380)) ** 1.6;
  return {
    dx: (hash01(k * 3.1 + t0) * 2 - 1) * amp * decay,
    dy: (hash01(k * 7.7 + t0 + 5) * 2 - 1) * amp * 0.6 * decay,
  };
}

// ── scale punch (cut impact) ─────────────────────────────────────────────────
export function scalePunch(age: number, dur = 220, amp = 0.03): number {
  if (age < 0 || age > dur) return 1;
  const p = age / dur;
  return 1 + amp * Math.sin(p * Math.PI) * (1 - p);
}

// ── afloat token (3D-ish spinning coin/token) ────────────────────────────────
export function spinToken(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number,
  face: string, rim: string, glyph = '', speed = 2200, squash = 0.16
): void {  const sx = Math.abs(Math.cos(t / speed));
  const w = Math.max(r * 0.35, r * Math.max(sx, 0.14));
  ctx.save();
  ctx.translate(cx, cy);
  // shadow below
  ctx.beginPath();
  ctx.ellipse(0, r * 1.5 + squash * r, w * 0.9, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.fill();
  // rim
  ctx.beginPath();
  ctx.ellipse(0, 0, w, r, 0, 0, Math.PI * 2);
  const rg = ctx.createLinearGradient(0, -r, 0, r);
  rg.addColorStop(0, rim);
  rg.addColorStop(1, rgba(rim.startsWith('#') ? rim : PALETTE.gold, 0.75));
  ctx.fillStyle = rg;
  ctx.fill();
  // Phase 1 — the token is a prop: it joins the ink system
  ctx.strokeStyle = 'rgba(14,20,38,0.85)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // face
  if (w > r * 0.28) {
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.78, r * 0.8, 0, 0, Math.PI * 2);
    const fg = ctx.createLinearGradient(0, -r, 0, r);
    fg.addColorStop(0, '#F6E7BD');
    fg.addColorStop(0.55, face);
    fg.addColorStop(1, '#A9862B');
    ctx.fillStyle = fg;
    ctx.fill();
    if (glyph && w > r * 0.5) {
      ctx.fillStyle = 'rgba(70,50,10,0.85)';
      ctx.font = `700 ${r * 0.72}px Georgia`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, 0, r * 0.03);
    }
  }
  // specular
  ctx.beginPath();
  ctx.ellipse(-w * 0.25, -r * 0.42, w * 0.3, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,248,220,0.75)';
  ctx.fill();
  ctx.restore();
}

// ── glow stroke helper for premium chart lines ───────────────────────────────
export function glowLine(
  ctx: CanvasRenderingContext2D, path: (c: CanvasRenderingContext2D) => void,
  col: string, width: number, glow: number
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // AUDIT I-01 — one ink system: the casing that made every curve read as
  // "outlined" next to the bars' flat gradient fills is reduced to a 1px
  // hairline at 60% — it still seats the glow, but the two line languages
  // no longer fight.
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = 'rgba(14,20,38,0.6)';
  ctx.lineWidth = width + 1;
  ctx.stroke();
  if (glow > 0) {
    ctx.shadowColor = rgba(col, 0.85);
    ctx.shadowBlur = glow;
  }
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = col;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

// ── exiting light-lift (per-object float) ────────────────────────────────────
export function floatY(t: number, seed = 0, amp = 8, speed = 3600): number {
  return Math.sin(t / speed + seed * 2.4) * amp;
}

export { easeInOutSine, hashRange };
