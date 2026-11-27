/**
 * AURUM figure — "The Principal".
 * A gradient-shaded gentleman in a midnight suit with gold accents:
 * cylinder-shaded tapered limbs, polished joints, rim light, silver hair,
 * slim gold-rimmed glasses, floor reflection. No hand-inked boil — smooth,
 * quiet, expensive. Deliberately unlike the K-Shaped ink-fill host.
 *
 * All coordinates are LOCAL units (origin = ground under the figure, y up is
 * negative). drawStickman applies the world transform.
 */

import { PALETTE, rgba, hexLerp } from './theme';
import { clamp01, clamp, lerp, springTo, hashStr, hash01, easeOutCubic, easeInOutSine } from './easing';

// ── rig constants ────────────────────────────────────────────────────────────
const U_LEG = 58, L_LEG = 52, TORSO = 86, NECK = 11;
const U_ARM = 54, L_ARM = 50;
const HEAD_R = 26.2; // 72% of the shoulder line — the head must carry the face at phone size (C-02)
// AUDIT C-06 — proportion re-balance: shoulders 30→34, hips 13→11. The
// coat-hanger silhouette (wide flat bar over a hook) becomes a V-case —
// the tailored-jacket read the premium tier lives on.
const SHOULDER_HW = 34, HIP_HW = 11;

const SUIT = { lit: '#43598A', mid: '#2C3B63', dark: '#161F3A', ink: '#0E1426' };
/** Phase 1 — the ONE ink: every silhouette in the frame (figure, props,
 *  glowLine charts) shares this contour weight and colour. */
const INK = 'rgba(14,20,38,0.92)';

/** Phase 1 — designed skull silhouette: egg base with a brow-ridge shelf
 *  over the eye line and a slight nose projection at the bottom centre, so
 *  the head reads as architecture, not an ellipse. */
function skullPath(ctx: CanvasRenderingContext2D, R: number): void {
  ctx.beginPath();
  ctx.moveTo(-R * 0.86, -R * 0.1);
  ctx.quadraticCurveTo(-R * 0.85, -R * 0.72, -R * 0.4, -R * 0.94); // left temple → crown
  ctx.quadraticCurveTo(0, -R * 1.06, R * 0.4, -R * 0.94);          // crown → right temple
  ctx.quadraticCurveTo(R * 0.85, -R * 0.72, R * 0.86, -R * 0.1);   // right side
  ctx.quadraticCurveTo(R * 0.85, R * 0.3, R * 0.62, R * 0.6);      // right cheek
  // jaw — one clean curve (the nose PROFILE is the drawn two-plane form; the
  // brow RIDGE is the shaded shelf; the silhouette stays tailored)
  ctx.quadraticCurveTo(R * 0.4, R * 0.78, 0, R * 0.8);
  ctx.quadraticCurveTo(-R * 0.4, R * 0.78, -R * 0.62, R * 0.6);    // left cheek
  ctx.quadraticCurveTo(-R * 0.85, R * 0.3, -R * 0.86, -R * 0.1);   // left side close
  ctx.closePath();
}
const SKIN = { lit: '#EFE3CF', dark: '#C6B296', deep: '#A08B70' };
const HAIR = { lit: '#A7B0C0', dark: '#5F6B80' };
const SHOE = { lit: '#1C2438', dark: '#0B101E' };

// ── pose contract ────────────────────────────────────────────────────────────
export interface Pose {
  rootY: number;
  lean: number;        // torso sway, deg (+ = screen right)
  torsoTilt: number;   // forward hunch, deg
  headTilt: number;
  headNod: number;     // 0..1
  shoulderTilt: number;
  pelvisTilt: number;
  rAU: number; rAL: number;
  lAU: number; lAL: number;
  rKnee: number; rAnkle: number;
  lKnee: number; lAnkle: number;
  brow: number;        // -1 concerned .. 1 raised
  browAsym: number;    // U2.6 — extra lift for the LEADING brow on word strikes
  lid: number;
  smile: number;       // -0.5 .. 1
  surprise: number;
  blink: number;       // external 0..1 override
  mouth: number;       // computed talk envelope 0..1
  hand: 'open' | 'point' | 'cup'; // near-hand shape — point = data contact, cup = cradling palm (S-04)
  walkPhase: number;   // <0 = standing
  walkSpeed: number;
  look: number;        // -1..1 gaze
}

export function basePose(): Pose {
  return {
    rootY: 0, lean: 0, torsoTilt: 0, headTilt: 0, headNod: 0, shoulderTilt: 0, pelvisTilt: 0,
    rAU: 6, rAL: 8, lAU: -6, lAL: 8,
    rKnee: 4, rAnkle: 0, lKnee: 4, lAnkle: 0,
    brow: 0, browAsym: 0, lid: 0, smile: 0.08, surprise: 0, blink: 0, mouth: 0,
    hand: 'open',
    walkPhase: -1, walkSpeed: 0, look: 0,
  };
}

// ── angles: degrees from vertical-down, + rotates toward screen right ────────
const D2R = Math.PI / 180;
function pt(x: number, y: number, angDeg: number, len: number): { x: number; y: number } {
  const a = angDeg * D2R;
  return { x: x + Math.sin(a) * len, y: y + Math.cos(a) * len };
}

/** closed-form 2-bone IK → { aU, aL } degrees. aL is the RELATIVE forearm
 *  bend (= 180° − elbow interior angle) so that forearm = aU + aL lands the
 *  wrist exactly on the target (fixed: the old chain never closed the
 *  triangle — the wrist fell ~70px short). bend=1 drops the elbow below the
 *  shoulder→target line (natural arm carriage). */
export function armIk(sx: number, sy: number, tx: number, ty: number, lenU: number, lenL: number, bend: 1 | -1 = 1): { aU: number; aL: number } {
  const dx = tx - sx, dy = ty - sy;
  let d = Math.hypot(dx, dy);
  d = Math.min(d, (lenU + lenL) * 0.985);
  const base = Math.atan2(dx, dy) / D2R; // angle from vertical-down
  const cosA = clamp((lenU * lenU + d * d - lenL * lenL) / (2 * lenU * d), -1, 1);
  const a1 = Math.acos(cosA) / D2R;
  const cosElbow = clamp((lenU * lenU + lenL * lenL - d * d) / (2 * lenU * lenL), -1, 1);
  const elbowInterior = Math.acos(cosElbow) / D2R;   // interior elbow angle
  const aU = base - a1 * bend;
  const aL = (180 - elbowInterior) * bend;           // relative forearm bend — closes the triangle
  return { aU, aL };
}

// ── shaded tapered bone ──────────────────────────────────────────────────────
interface BoneOpts {
  w0: number; w1: number;
  lit: string; dark: string;
  rim?: number;          // rim-light stroke alpha on lit edge
  far?: boolean;
  ink?: number;          // Phase 1 — the shared ink contour (2.2px at 1080p)
}
function bone(
  ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number,
  bow: number, o: BoneOpts
): void {
  const dx = ex - sx, dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  // C-09 — ONE global light. The lit normal is the one pointing toward the key
  // light L = (−0.55, −0.85) (upper-left), chosen by dot product for every
  // bone, so the lit edge can never flip sides between limbs.
  let nSign = (nx * -0.55 + ny * -0.85) >= 0 ? 1 : -1;
  const cx1 = sx + dx * 0.5 + nx * nSign * bow;
  const cy1 = sy + dy * 0.5 + ny * nSign * bow;
  const steps = 10;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const bx = quadPt(sx, cx1, ex, p), by = quadPt(sy, cy1, ey, p);
    const w = lerp(o.w0, o.w1, p) / 2;
    const px = bx + nx * nSign * w, py = by + ny * nSign * w;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const p = i / steps;
    const bx = quadPt(sx, cx1, ex, p), by = quadPt(sy, cy1, ey, p);
    const w = lerp(o.w0, o.w1, p) / 2;
    const px = bx - nx * nSign * w, py = by - ny * nSign * w;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  const lit = o.far ? hexLerp(o.lit, o.dark, 0.5) : o.lit;
  const dark = o.far ? hexLerp(o.dark, '#05080F', 0.25) : o.dark;
  const g = ctx.createLinearGradient(
    sx + nx * nSign * o.w0, sy + ny * nSign * o.w0,
    sx - nx * nSign * o.w0, sy - ny * nSign * o.w0
  );
  g.addColorStop(0, lit);
  g.addColorStop(0.55, o.far ? hexLerp(lit, dark, 0.45) : hexLerp(lit, dark, 0.25));
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  // Phase 1 — the ink contour joins every silhouette to one line system
  if (o.ink) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = o.ink;
    ctx.stroke();
  }
  if (o.rim) {
    // rim light along the lit edge
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const bx = quadPt(sx, cx1, ex, p), by = quadPt(sy, cy1, ey, p);
      const w = lerp(o.w0, o.w1, p) / 2;
      const px = bx + nx * nSign * w, py = by + ny * nSign * w;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = rgba('#F4E5BF', o.rim);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}
function quadPt(a: number, c: number, b: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * a + 2 * mt * t * c + t * t * b;
}

/** C-03 — shoulder sleeve cap: a rounded deltoid pad that overlaps the torso
 *  edge and the arm root. Replaces the polished floating sphere — the shoulder
 *  now reads as one tailored silhouette. */
function sleeveCap(ctx: CanvasRenderingContext2D, sx: number, sy: number, angDeg: number, w: number, far: boolean, ink = 0): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate((angDeg + 90) * D2R); // local +x along the arm axis
  const litC = far ? hexLerp(SUIT.mid, SUIT.dark, 0.45) : SUIT.mid;
  const darkC = far ? hexLerp(SUIT.dark, '#05080F', 0.3) : SUIT.dark;
  const g = ctx.createLinearGradient(-w * 0.6, -w * 0.5, w * 0.7, w * 0.55);
  g.addColorStop(0, hexLerp(litC, '#F4E5BF', 0.12));
  g.addColorStop(0.55, litC);
  g.addColorStop(1, darkC);
  // extends back over the torso edge and forward over the bone root
  roundRectPath(ctx, -w * 0.78, -w * 0.56, w * 1.72, w * 1.12, w * 0.54);
  ctx.fillStyle = g;
  ctx.fill();
  if (ink > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = ink;
    ctx.stroke();
  }
  ctx.restore();
}

/** C-08 — cloth fold at elbow/knee: a soft darker crease on the bend side.
 *  No outline, no highlight dot — sleeve cloth, not a hinge pin. */
function clothCrease(ctx: CanvasRenderingContext2D, x: number, y: number, axisDeg: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, (90 - axisDeg - 42) * D2R, (90 - axisDeg + 42) * D2R);
  ctx.strokeStyle = 'rgba(5,8,16,0.34)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ── talk + viseme ────────────────────────────────────────────────────────────
export function talkAt(t: number, wordTimes: number[]): number {
  let m = 0;
  for (const wt of wordTimes) {
    const dt = t - wt;
    if (dt < -20 || dt > 260) continue;
    const p = clamp01(dt / 260);
    m = Math.max(m, Math.sin(Math.PI * Math.min(1, p * 1.35)));
  }
  return m;
}
export type Viseme = 'A' | 'E' | 'O' | 'M' | 'F' | 'L' | 'S' | 'X';
export function visemeAt(t: number, wordTimes: number[], words: string[]): Viseme {
  for (let i = wordTimes.length - 1; i >= 0; i--) {
    if (t >= wordTimes[i] && t < wordTimes[i] + 300) {
      const w = (words[i] || '').toLowerCase().replace(/[^a-z]/g, '');
      const c = w[0] || '';
      if ('mbp'.includes(c)) return 'M';
      if (c === 'f' || c === 'v') return 'F';
      if ('tdlgkn'.includes(c)) return 'L';
      if ('csxz'.includes(c)) return 'S';
      if ('ao'.includes(c)) return 'O';
      if ('eiy'.includes(c)) return 'E';
      return 'A';
    }
  }
  return 'X';
}

// ── gestures ─────────────────────────────────────────────────────────────────
interface Gesture {
  name: string;
  rAU: number; rAL: number; lAU: number; lAL: number;
  lean: number; torsoTilt: number; shoulderTilt: number; headTilt: number;
  brow: number; smile: number;
}
const GESTURES: Gesture[] = [
  { name: 'present',   rAU: 42, rAL: 22, lAU: -14, lAL: 14, lean: 1.5, torsoTilt: 1, shoulderTilt: 2, headTilt: 1.5, brow: 0.2, smile: 0.16 },
  { name: 'explain',   rAU: 30, rAL: 44, lAU: -10, lAL: 26, lean: 1, torsoTilt: 2.5, shoulderTilt: 3, headTilt: 2, brow: 0.1, smile: 0.12 },
  { name: 'open',      rAU: 26, rAL: 18, lAU: -26, lAL: -16, lean: 0.5, torsoTilt: 0.5, shoulderTilt: 0, headTilt: 0, brow: 0.35, smile: 0.2 },
  { name: 'count',     rAU: 52, rAL: 66, lAU: -8, lAL: 10, lean: 2, torsoTilt: 2, shoulderTilt: 4, headTilt: 2.5, brow: 0.15, smile: 0.12 },
  { name: 'weigh',     rAU: 34, rAL: 30, lAU: -34, lAL: 28, lean: 0.5, torsoTilt: 1.5, shoulderTilt: 1, headTilt: -1.5, brow: 0.05, smile: 0.15 },
  { name: 'chin',      rAU: 64, rAL: 118, lAU: -6, lAL: 8, lean: -1, torsoTilt: 3, shoulderTilt: 2, headTilt: 4, brow: -0.15, smile: 0.1 },
  { name: 'rest',      rAU: 8, rAL: 10, lAU: -8, lAL: 10, lean: 0, torsoTilt: 0.5, shoulderTilt: 0, headTilt: 0, brow: 0, smile: 0.08 },
  { name: 'sweep',     rAU: 60, rAL: 34, lAU: -30, lAL: -34, lean: 2.5, torsoTilt: 1, shoulderTilt: 3, headTilt: 2, brow: 0.3, smile: 0.18 },
];

const STOPWORDS = new Set(['the', 'and', 'a', 'an', 'of', 'to', 'in', 'is', 'it', 'that', 'you', 'your', 'for', 'on', 'with', 'as', 'are', 'this', 'but', 'not', 'at', 'be', 'we', 'so', 'if', 'one', 'what']);

/**
 * applyMood — the face is an instrument keyed to the narration (D6, U2.6).
 * Exact report mappings: 'reveal' → brows +0.6, lids 0.15, smile 0;
 * 'urgent' → brows −0.4, FASTER blink cycle, lean +1;
 * 'calm' → neutral smile 0.08; 'quote' → gaze ±0.5 with a head tilt.
 * `t` + `seed` enable the urgent blink-cycle and the alternating quote gaze.
 * Called by host scenes AFTER poseAt, BEFORE gesture overrides.
 */
export function applyMood(p: Pose, voStyle?: string, t?: number, seed = 0): void {
  switch (voStyle) {
    case 'reveal':
      p.brow = 0.6; p.lid = 0.15; p.smile = 0; p.surprise = 0.14;
      break;
    case 'urgent':
      p.brow = -0.4; p.lid = 0.2; p.smile = -0.12; p.lean += 1;
      if (t != null) p.blink = Math.max(p.blink, blinkCycleAt(t, 2400, seed * 0.37 + 11));
      break;
    case 'quote':
      p.brow = 0.16; p.lid = 0.1; p.smile = 0.08;
      p.look = t != null ? (Math.floor(t / 9000 + seed) % 2 === 0 ? 0.5 : -0.5) : 0.5;
      p.headTilt += 2.5;
      break;
    case 'calm':
      p.brow = 0.04; p.lid = 0.06; p.smile = 0.08;
      break;
    default: // neutral — quiet, professional rest; the grin is gone
      p.brow = 0.02; p.lid = 0.04; p.smile = 0.07;
      break;
  }
}

/** blink envelope over one cycle (U2.6) — extracted so 'urgent' voStyle can
 *  re-run it on a faster period. 0 = eyes open, 1 = fully closed. */
export function blinkCycleAt(t: number, periodMs: number, seed = 0): number {
  const bt = (t + (seed * 700) % 900) % periodMs;
  if (bt >= 150) return 0;
  if (bt < 60) return 0.5 * (1 - Math.cos((bt / 60) * Math.PI));
  if (bt < 90) return 1;
  return 0.5 * (1 + Math.cos(((bt - 90) / 60) * Math.PI));
}

function sentenceHash(id: string): number {
  return hashStr(id || 'x');
}
function accentEnv(t: number, wordTimes: number[], words: string[]): number {
  // content-word strike: −0.4 windup 80ms → strike → recoil settle 440ms
  for (let i = wordTimes.length - 1; i >= 0; i--) {
    const wt = wordTimes[i];
    const age = t - wt;
    if (age < -80 || age > 440) continue;
    const w = (words[i] || '');
    const content = w.length >= 3 && !STOPWORDS.has(w.toLowerCase());
    const amp = content ? 1 : 0.3;
    if (age < 0) return -0.4 * amp * (-age / 80);
    if (age < 90) return amp * Math.sin((age / 90) * Math.PI * 0.5) * 1.15;
    const p = clamp01((age - 90) / 350);
    return amp * (1 - p) * Math.cos(p * Math.PI * 0.6);
  }
  return 0;
}

/** U2.4 — reusable anticipation. M-02 (§6.3) + AUDIT C-09: the rise/hold/
 * release window is now RISE 104ms → HOLD 100ms (two+ frames at the extreme —
 * the classic animator's beat) → release, and the magnitude cap is 18°.
 * Applied ONLY to the shoulder and elbow channels — hips and torso sway stay
 * quiet, or the figure reads as nervous rather than intentional. */
function anticipation(from: number, to: number, st: number, mag = 18): number {
  const WINDOW = 204, HOLD = 100;
  const d = to - from;
  const amp = Math.min(mag, Math.abs(d) * 0.45);
  if (amp < 0.35 || st < 0) return 0;
  let k: number;
  if (st < WINDOW - HOLD) k = Math.sin((st / (WINDOW - HOLD)) * Math.PI * 0.5);
  else if (st < WINDOW) k = 1;
  else k = Math.max(0, 1 - (st - WINDOW) / 90); // release — recoil into the gesture
  return -Math.sign(d) * amp * k;
}

/**
 * poseAt — the life system. Pure function of (sentenceId, sentenceT, wordTimes, t).
 * Gestures spring between on sentence boundaries; word accents strike the right
 * forearm; idle breath/weight always runs underneath.
 */
export function poseAt(
  sentenceId: string, sentenceT: number, t: number,
  wordTimes: number[], wordTexts: string[],
  prevSentenceId?: string,
  gestureOverride?: string,
): Pose {
  const p = basePose();
  const h = sentenceHash(sentenceId);
  // AUDIT R-04 — script-level gesture beats the hash pick: when the playing
  // sentence carries a `gestures` entry naming a pool gesture, the body
  // MEANS the sentence instead of decorating it. Unknown names fall through
  // to the sentenceHash pick, so old behaviour is the default.
  const oi = gestureOverride ? GESTURES.findIndex((x) => x.name === gestureOverride) : -1;
  const g = oi >= 0 ? GESTURES[oi] : GESTURES[Math.floor(h * GESTURES.length) % GESTURES.length];
  const gPrev = prevSentenceId ? GESTURES[Math.floor(sentenceHash(prevSentenceId) * GESTURES.length) % GESTURES.length] : g;

  // gesture spring per channel (150ms behind sentence start handled by spring time)
  const st = Math.max(0, sentenceT);
  const sp = (from: number, to: number, stiff = 150, damp = 13.5) => springTo(from, to, Math.min(st, 900), stiff, damp);
  p.rAU = sp(gPrev.rAU, g.rAU);
  p.rAL = sp(gPrev.rAL, g.rAL);
  p.lAU = sp(gPrev.lAU, g.lAU);
  p.lAL = sp(gPrev.lAL, g.lAL);
  p.lean = sp(gPrev.lean, g.lean, 120, 12);
  p.torsoTilt = sp(gPrev.torsoTilt, g.torsoTilt);
  p.shoulderTilt = sp(gPrev.shoulderTilt, g.shoulderTilt);
  // the head trails the torso: same target, lower stiffness — the classic
  // overlapping-action tell (U2.4b)
  p.headTilt = sp(gPrev.headTilt, g.headTilt, 105, 10);
  p.brow = g.brow;
  p.smile = g.smile;

  // anticipation — arm channels counter-move first (with the 100ms hold),
  // then commit (AUDIT C-09: cap raised to 18°, shoulder+elbow channels only —
  // the torso sway no longer anticipates, hips stay quiet)
  p.rAU += anticipation(gPrev.rAU, g.rAU, st);
  p.rAL += anticipation(gPrev.rAL, g.rAL, st);
  p.lAU += anticipation(gPrev.lAU, g.lAU, st);
  p.lAL += anticipation(gPrev.lAL, g.lAL, st);
  p.shoulderTilt += anticipation(gPrev.shoulderTilt, g.shoulderTilt, st);

  // word accent strikes the right forearm (and counter-leans the torso)
  const acc = accentEnv(t, wordTimes, wordTexts);
  p.rAL += acc * 26;
  p.rAU += acc * 10;
  p.lean += acc * 2.2;
  p.shoulderTilt += acc * 4;
  p.headNod = Math.max(0, acc * 0.35);
  // the face leads the strike — brows lift on content words, lids narrow;
  // the LEADING brow takes the extra 2px (U2.6)
  p.brow += acc * 0.5;
  p.browAsym = Math.max(0, acc) * 0.4;
  p.lid += Math.max(0, acc) * 0.18;

  // idle life
  const br = Math.sin(t / 2400);
  p.torsoTilt += br * 0.6;
  p.rootY = Math.sin(t / 2400 + 1.2) * 1.6 + Math.sin(t / 4600) * 2.4; // weight shift
  p.lean += Math.sin(t / 6200) * 0.9;
  p.headTilt += Math.sin(t / 5100 + 1.7) * 1.1;
  p.rAU += Math.sin(t / 3100 + 0.5) * 1.6;
  p.lAU -= Math.sin(t / 3400 + 1.9) * 1.6;
  p.rAL += Math.sin(t / 2900) * 2;
  p.lAL += Math.sin(t / 3300 + 2) * 2;
  // shoulder counter-motion
  p.shoulderTilt -= p.lean * 0.5;

  // M-05 — dual blink cadences with a 10% double-blink (real eyes never march
  // in step), and a gaze that SNAPS to a new hold every ~3.4s (80ms saccade)
  // and only drifts after it settles — no more pendulum
  const bl1 = blinkCycleAt(t, 4300, h);
  const bl2 = blinkCycleAt(t, 6100, h + 1);
  const blinkPhase = (t + (h * 700) % 900) % 4300;
  const dbl = hash01(Math.floor((t + (h * 700) % 900) / 4300) + h) < 0.10
    ? blinkCycleAt(t - 150, 4300, h)
    : 0;
  p.blink = Math.max(p.blink, bl1, bl2, dbl);
  const gazeOff = h * 917;
  const seg = Math.floor((t + gazeOff) / 3400);
  const segAge = (t + gazeOff) % 3400;
  const gazeTgt = (hash01(seg * 7.31 + h * 3.7) - 0.5) * 1.1;
  p.look = gazeTgt * easeOutCubic(clamp01(segAge / 80)) + Math.sin(segAge / 900) * 0.05;

  p.mouth = talkAt(t, wordTimes);
  return p;
}

/** smooth walk cycle — pose for a walk phase 0..1.
 * Anatomy (U2.5): support leg STRAIGHT through stance (knee → ~0 at the pass
 * position), deep knee flexion mid-swing, pelvis high at mid-stance and low at
 * double support with a 4 px drop onto the support leg at contact. */
export function walkPose(phase: number, speed: number): Pose {
  const p = basePose();
  const ph = phase % 1;
  const pp = ph * Math.PI * 2;
  const s = Math.sin(pp);
  const s2 = Math.sin(pp + Math.PI); // other leg
  // arm carriage: swing with the stride, elbows easing as the arm passes the body
  // M-01 — arm counter-swing ±30° with a REAL elbow flex of 8–26° across the
  // cycle (speed-independent — the old 14..30·speed read as straight tubes)
  p.rAU = 8 + s * 30 * speed;
  p.rAL = 26 - 18 * (0.5 + 0.5 * s);
  p.lAU = -8 + s2 * 30 * speed;
  p.lAL = 26 - 18 * (0.5 + 0.5 * s2);
  // (legs are driven from walkPhase inside legDraw — same phase, same source of truth)
  // swing = fraction of the cycle this leg is OFF the ground (cos < 0); the
  // support leg stays straight, the swing leg flexes deeply (U2.5 fix — the
  // old formula was inverted and bent the stance leg 46°)
  p.rKnee = Math.max(0, -Math.cos(pp)) * 44 * speed + 5;
  p.lKnee = Math.max(0, Math.cos(pp)) * 44 * speed + 5;
  p.rAnkle = 0; p.lAnkle = 0;
  // pelvis height: HIGH at mid-stance (ph 0/.5), LOW at double support —
  // AUDIT C-09 — the hip drop at contact is 6px so the weight-shift actually
  // registers on film at 1080p
  const contact = Math.max(0, -Math.cos(pp * 2));
  p.rootY = (-6 * (0.5 + 0.5 * Math.cos(pp * 2)) + 6 * contact) * speed;
  p.lean = 1.5 * speed;
  p.torsoTilt = 1.5 * speed;
  // AUDIT C-09 — shoulder counter-rotation 7° (was 4° — buried; 7° reads as a
  // real shoulder girdle rotation at rig scales 1.4–2.6)
  p.shoulderTilt = -s * 7;
  p.pelvisTilt = s * 3 * speed;
  p.walkPhase = ph;
  p.walkSpeed = speed;
  p.headTilt = 0.5 * speed;
  p.smile = 0.08;
  return p;
}

// ── face ─────────────────────────────────────────────────────────────────────
// AUDIT FIX C1 · C2 · C3 · C13 — the premium face rebuild. Design law:
//  • ORDER: skull → jaw shade → brow ridge (BEFORE the hair, so no shading
//    line can ever smear across the hair) → hair → ears → brows → eyes →
//    nose → mouth → glasses;
//  • every feature constant is scaled by k = R / 26.2, so the rig proportion
//    reset (C9) rescales the whole face automatically;
//  • the silver strands are CLIPPED to the hair silhouette — no geometry
//    escapes the outline (C1);
//  • detail 'lo' (head < ~55px on screen) drops fine detail and floors the
//    stroke widths so the face stays a face at data-scene scale (C13).
function drawFace(
  ctx: CanvasRenderingContext2D, hx: number, hy: number, tiltDeg: number,
  p: Pose, t: number, faceScale: number, wordTexts: string[], wordTimes: number[], beatT: number, look: number, quiffLag = 0, inkW = 0,
  detail: 'hi' | 'lo' = 'hi'
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tiltDeg * D2R);
  const fs = faceScale;
  ctx.scale(fs, fs);

  const R = HEAD_R;
  const k = R / 26.2;               // feature scale — tracks the rig proportions (C9)
  const lo = detail === 'lo';
  const sw = (w: number): number => Math.max(lo ? 1.25 : 1.05, w * (lo ? 1.3 : 1)); // stroke floor

  // C-01 — skin reads shaded, not cream: a small off-centre hot spot on the
  // lit cheek, mid-tones pulled dark early, one shadow side into the jaw
  const g = ctx.createRadialGradient(-R * 0.42, -R * 0.05, R * 0.14, 0, 0, R * 1.32);
  g.addColorStop(0, hexLerp(SKIN.lit, SKIN.dark, 0.16));
  g.addColorStop(0.42, hexLerp(SKIN.lit, SKIN.dark, 0.42));
  g.addColorStop(0.8, SKIN.dark);
  g.addColorStop(1, SKIN.deep);
  ctx.beginPath();
  skullPath(ctx, R);
  ctx.fillStyle = g;
  ctx.fill();
  if (inkW > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW;
    ctx.stroke();
  }

  const eyeY = -R * 0.18;
  const eyeX = R * 0.36;
  const lid = clamp01(p.lid + p.blink);
  const surprise = p.surprise;

  // jaw shade + FIX C2 brow ridge — one clip, drawn BEFORE the hair: the shelf
  // sits between hairline and brows, and its lit top edge can never paint a
  // smear across the hair again. Alpha 0.20→0.13: architecture, not eye-bags.
  ctx.save();
  ctx.beginPath();
  skullPath(ctx, R);
  ctx.clip();
  const sh = ctx.createLinearGradient(0, R * 0.1, 0, R);
  sh.addColorStop(0, 'rgba(120,95,70,0)');
  sh.addColorStop(1, rgba('#7A5F46', 0.28));
  ctx.fillStyle = sh;
  ctx.fillRect(-R, -R, R * 2, R * 2.4);
  const ridge = ctx.createLinearGradient(0, eyeY - 14 * k, 0, eyeY - 3 * k);
  ridge.addColorStop(0, 'rgba(126,99,72,0.03)');
  ridge.addColorStop(0.55, 'rgba(112,88,64,0.13)');
  ridge.addColorStop(1, 'rgba(92,72,52,0.05)');
  ctx.fillStyle = ridge;
  ctx.fillRect(-R * 0.66, eyeY - 14 * k, R * 1.32, 11 * k);
  if (!lo) {
    ctx.strokeStyle = 'rgba(232,208,178,0.22)';
    ctx.lineWidth = sw(1.1 * k);
    ctx.beginPath();
    ctx.moveTo(-R * 0.54, eyeY - 12.6 * k);
    ctx.quadraticCurveTo(0, eyeY - 14.6 * k, R * 0.54, eyeY - 12.6 * k);
    ctx.stroke();
  }
  ctx.restore(); // skull clip

  // C-01 — designed hair: a closed swept-back shape with a left parting, three
  // silhouette notches against the sky, a tapered temple and a nape at the
  // back. NOT clipped to the skull — the silhouette breaks the head outline.
  // FIX C2 — the front hairline sits a full band ABOVE the brows: clear skin
  // separates hair from brows, so neither reads through the other.
  ctx.save();
  ctx.rotate(quiffLag * 0.35 * D2R);
  const hg = ctx.createLinearGradient(-R * 0.5, -R * 1.05, R * 0.4, -R * 0.2);
  hg.addColorStop(0, HAIR.lit);
  hg.addColorStop(0.6, hexLerp(HAIR.lit, HAIR.dark, 0.55));
  hg.addColorStop(1, HAIR.dark);
  const hairPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.88, R * 0.14);
    ctx.quadraticCurveTo(-R * 1.06, -R * 0.52, -R * 0.62, -R * 0.98);
    ctx.quadraticCurveTo(-R * 0.34, -R * 1.14, -R * 0.02, -R * 1.12); // parting peak
    ctx.quadraticCurveTo(R * 0.34, -R * 1.16, R * 0.62, -R * 1.0);    // notch 1
    ctx.quadraticCurveTo(R * 0.78, -R * 1.08, R * 0.9, -R * 0.86);    // notch 2
    ctx.quadraticCurveTo(R * 1.04, -R * 0.62, R * 0.96, -R * 0.4);    // notch 3 dip
    ctx.quadraticCurveTo(R * 1.02, -R * 0.2, R * 0.9, R * 0.02);      // temple taper
    ctx.quadraticCurveTo(R * 0.66, -R * 0.32, R * 0.3, -R * 0.46);    // front hairline (raised)
    ctx.quadraticCurveTo(-R * 0.18, -R * 0.60, -R * 0.58, -R * 0.42); // parting fall
    ctx.quadraticCurveTo(-R * 0.8, -R * 0.22, -R * 0.88, R * 0.14);   // nape close
    ctx.closePath();
  };
  ctx.fillStyle = hg;
  hairPath();
  ctx.fill();
  // Phase 1 — the hair silhouette joins the ink system
  if (inkW > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  // sideburn into the ear line
  ctx.beginPath();
  ctx.moveTo(-R * 0.88, R * 0.14);
  ctx.quadraticCurveTo(-R * 0.9, R * 0.3, -R * 0.82, R * 0.42);
  ctx.lineTo(-R * 0.72, R * 0.3);
  ctx.closePath();
  ctx.fillStyle = HAIR.dark;
  ctx.fill();
  // FIX C1 — silver strand highlights: CLIPPED to the hair path and run ALONG
  // the sweep with tips INSIDE the crown (old tips reached −1.32R vs crown
  // −1.16R and floated above the head like antennae). Nothing escapes now.
  if (!lo) {
    ctx.save();
    hairPath();
    ctx.clip();
    ctx.strokeStyle = rgba('#D7DEEA', 0.40);
    ctx.lineWidth = sw(1.0);
    ctx.lineCap = 'round';
    for (const [ox, len] of [[-0.60, 0.40], [-0.30, 0.48]] as const) {
      ctx.beginPath();
      ctx.moveTo(R * ox, -R * 0.48);
      ctx.quadraticCurveTo(R * (ox + 0.05), -R * (0.48 + len * 0.66), R * (ox + 0.08), -R * (0.48 + len));
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore(); // hair transform

  // FIX C3 — ears: small, tucked, darker, two-thirds up the skull with the
  // lobe at the jaw line — a hint of ear, not two headphone pads.
  ctx.fillStyle = SKIN.dark;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * R * 0.845, R * 0.06, R * 0.095, R * 0.15, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba('#7A5F46', 0.4);
    ctx.lineWidth = sw(0.8 * k);
    ctx.beginPath();
    ctx.arc(s * R * 0.845, R * 0.05, R * 0.055, s > 0 ? Math.PI * 1.15 : Math.PI * 1.35, s > 0 ? Math.PI * 1.75 : Math.PI * 1.95);
    ctx.stroke();
  }

  // brows — thin tapered strokes above the glasses line (the old filled blobs
  // vanished against the ridge shelf). The LEADING brow takes the word strike.
  const browLift = p.brow * 4.6 * k;
  ctx.strokeStyle = rgba('#3E4A62', 0.96);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const liftS = browLift + (s === 1 ? (p.browAsym ?? 0) * 4.6 * k : 0);
    const bx = s * eyeX;
    const by = eyeY - 7.4 * k - liftS + (p.brow < 0 ? p.brow * 2.2 * k : 0);
    ctx.lineWidth = sw(2.4 * k);
    ctx.beginPath();
    ctx.moveTo(bx - s * 6.2 * k, by + 1.1 * k);
    ctx.quadraticCurveTo(bx, by - 2.3 * k, bx + s * 6.4 * k, by + 0.4 * k);
    ctx.stroke();
  }

  // eyes — confident, subtle iris, glint
  const gaze = look * 2.6;
  for (const s of [-1, 1]) {
    const ex = s * eyeX + gaze * 0.6;
    const openH = R * 0.155 * (1 - lid * 0.92) * (1 + surprise * 0.5);
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, R * 0.165, Math.max(0.6, openH), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F4F2EC';
    ctx.fill();
    if (lid < 0.85) {
      ctx.beginPath();
      ctx.arc(ex + gaze, eyeY, R * 0.085 * (1 + surprise * 0.25), 0, Math.PI * 2);
      ctx.fillStyle = '#2E3B55';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + gaze, eyeY, R * 0.038, 0, Math.PI * 2);
      ctx.fillStyle = '#0C1220';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + gaze - R * 0.03, eyeY - R * 0.035, R * 0.022, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
    // lids as FILLED shapes with a dark lash edge on the rim
    if (lid > 0.08) {
      const lidH = Math.max(0.6, openH);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, R * 0.165, lidH, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = hexLerp(hexLerp(SKIN.lit, SKIN.dark, 0.45), SKIN.deep, lid * 0.4);
      ctx.fillRect(ex - R * 0.2, eyeY - lidH - 2, R * 0.4, lidH * 0.95 * (0.5 + lid * 0.5) + lid * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(ex - R * 0.16, eyeY - lidH * 0.16);
      ctx.quadraticCurveTo(ex, eyeY + lidH * 0.14, ex + R * 0.16, eyeY - lidH * 0.16);
      ctx.strokeStyle = 'rgba(70,56,42,0.85)';
      ctx.lineWidth = sw(2.2 * k);
      ctx.stroke();
    }
  }

  // nose — PROFILE FORM (shadow plane away from the key, lit plane toward it,
  // ball tip). Nostril hints only at detail 'hi' (they smudge at 'lo').
  const noseY = eyeY + 3 * k;
  ctx.beginPath();
  ctx.moveTo(0.6 * k, noseY);
  ctx.quadraticCurveTo(R * 0.10, noseY + 6 * k, R * 0.082, noseY + 11 * k);
  ctx.quadraticCurveTo(0.25 * k, noseY + 12.6 * k, 0, noseY + 12.8 * k);
  ctx.closePath();
  ctx.fillStyle = 'rgba(116,90,66,0.32)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.4 * k, noseY);
  ctx.quadraticCurveTo(-R * 0.082, noseY + 6 * k, -R * 0.068, noseY + 11 * k);
  ctx.quadraticCurveTo(-0.3 * k, noseY + 13.2 * k, 0, noseY + 13.2 * k);
  ctx.closePath();
  ctx.fillStyle = 'rgba(228,206,180,0.30)';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, noseY + 11.2 * k, R * 0.082, R * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(150,116,86,0.36)';
  ctx.fill();
  if (!lo) {
    ctx.fillStyle = 'rgba(74,56,40,0.5)';
    ctx.beginPath(); ctx.ellipse(-R * 0.052, noseY + 12.4 * k, R * 0.023, R * 0.016, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(R * 0.052, noseY + 12.4 * k, R * 0.023, R * 0.016, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  // mouth — viseme-driven talk; resting = a SHORT composed line, not a wide
  // grin arc (FIX C3). Corner ticks appear only on a real smile.
  const talk = p.mouth;
  const v = visemeAt(beatT, wordTimes, wordTexts);
  const mx = 0, my = R * 0.52;
  const smile = p.smile;
  ctx.save();
  if (talk > 0.14 && v !== 'X') {
    const jaw = Math.max(0, talk - 0.18) * R * 0.15;
    const myJ = my + jaw;
    let mw = R * 0.52, mh = R * 0.38 * talk, round = 1;
    if (v === 'M') { mw = R * 0.16; mh = R * 0.05; }
    else if (v === 'F') { mw = R * 0.30; mh = R * 0.10; round = 0.2; }
    else if (v === 'E') { mw = R * 0.72; mh = R * 0.18 * talk + 1.5; }
    else if (v === 'O') { mw = R * 0.34; mh = R * 0.52 * talk; }
    else if (v === 'L') { mw = R * 0.42; mh = R * 0.30 * talk; }
    else if (v === 'S') { mw = R * 0.56; mh = R * 0.20 * talk; }
    ctx.beginPath();
    ctx.ellipse(mx, myJ, mw, Math.max(1.2, mh), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4A2E28';
    ctx.fill();
    if (mh > R * 0.16) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(mx, myJ, mw, mh, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(240,232,220,0.85)';
      ctx.fillRect(mx - mw, myJ - mh, mw * 2, mh * 0.7);
      ctx.fillStyle = 'rgba(120,40,40,0.35)';
      ctx.beginPath(); ctx.ellipse(mx, myJ + mh * 0.7, mw * 0.7, mh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else {
    const mw = R * 0.115 + smile * R * 0.045;
    const drop = 1.1 * k + smile * 3.0 * k;
    ctx.beginPath();
    ctx.moveTo(-mw, my - 1.2 * k - smile * 1.4 * k);
    ctx.quadraticCurveTo(0, my + drop, mw, my - 1.2 * k - smile * 1.4 * k);
    ctx.strokeStyle = 'rgba(74,46,40,0.85)';
    ctx.lineWidth = sw(2.0 * k);
    ctx.lineCap = 'round';
    ctx.stroke();
    if (smile >= 0.25) {
      ctx.fillStyle = 'rgba(74,46,40,0.7)';
      ctx.beginPath(); ctx.arc(-mw, my - 1.2 * k - smile * 1.4 * k, 1.0 * k, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mw, my - 1.2 * k - smile * 1.4 * k, 1.0 * k, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // glasses — FIX C3: REAL spectacles. Full thin rims around each lens, a
  // bridge over the nose, temples running to the ears, and one restrained
  // gold accent line on the top rim — legible as eyewear at every scale,
  // not a floating wire.
  const lensW = R * 0.20, lensH = R * 0.155;
  ctx.strokeStyle = 'rgba(14,20,38,0.88)';
  ctx.lineWidth = sw(1.9 * k);
  for (const s of [-1, 1]) {
    const ex = s * eyeX + gaze * 0.6;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY - R * 0.01, lensW, lensH, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // bridge
  ctx.beginPath();
  ctx.moveTo(-eyeX + lensW + gaze * 0.6, eyeY - R * 0.045);
  ctx.quadraticCurveTo(gaze * 0.6, eyeY - R * 0.115, eyeX - lensW + gaze * 0.6, eyeY - R * 0.045);
  ctx.stroke();
  // temples to the ears
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * (eyeX + lensW) + gaze * 0.6, eyeY - R * 0.02);
    ctx.lineTo(s * R * 0.82, eyeY - R * 0.03);
    ctx.stroke();
  }
  // the restrained gold accent on the top rims
  ctx.strokeStyle = 'rgba(233,196,106,0.55)';
  ctx.lineWidth = sw(1.0 * k);
  for (const s of [-1, 1]) {
    const ex = s * eyeX + gaze * 0.6;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY - R * 0.01, lensW, lensH, 0, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── ground shadow + reflection ───────────────────────────────────────────────
export function groundShadow(ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale: number, k = 1): void {
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale * k, scale);
  // C-10 — weight: a tight dark contact core under the feet plus a wider
  // ambient pool; the two-layer falloff reads as the figure PLANTED on the
  // floor, not hovering over a glow line.
  const core = ctx.createRadialGradient(-5, 3, 1, -5, 3, 40);
  core.addColorStop(0, 'rgba(2,4,9,0.62)');
  core.addColorStop(0.45, 'rgba(2,4,9,0.34)');
  core.addColorStop(1, 'rgba(2,4,9,0)');
  ctx.beginPath();
  ctx.ellipse(-5, 4, 44, 8.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();
  const amb = ctx.createRadialGradient(-8, 6, 4, -8, 6, 88);
  amb.addColorStop(0, 'rgba(2,4,9,0.20)');
  amb.addColorStop(0.6, 'rgba(2,4,9,0.09)');
  amb.addColorStop(1, 'rgba(2,4,9,0)');
  ctx.beginPath();
  ctx.ellipse(-8, 6, 88, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = amb;
  ctx.fill();
  ctx.restore();
}

/** mirror reflection (C-10) — sampled from the figure's own palette, alpha
 *  banded by distance from the floor plane, and faded out with a gradient
 *  overlay so it reads as a polished-floor mirror, not a flat smear. */
export function drawReflection(
  ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale: number,
  p: Pose, t: number, seed: number
): void {
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, -scale * 0.96);
  // legs (nearest the floor → strongest)
  ctx.globalAlpha = 0.12;
  const hipY = -U_LEG - L_LEG + p.rootY;
  const leanR = p.lean * D2R;
  const neckX = Math.sin(leanR) * TORSO, neckY = hipY - Math.cos(leanR) * TORSO;
  const suitRef = hexLerp(SUIT.mid, '#05080F', 0.32);
  const suitRefDark = hexLerp(SUIT.dark, '#05080F', 0.3);
  // torso
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = suitRef;
  ctx.beginPath();
  ctx.moveTo(-SHOULDER_HW * 0.9, neckY + 6);
  ctx.quadraticCurveTo(0, neckY - 12, SHOULDER_HW * 0.9, neckY + 6);
  ctx.lineTo(HIP_HW + 6, hipY + 8);
  ctx.quadraticCurveTo(0, hipY + 14, -HIP_HW - 6, hipY + 8);
  ctx.closePath();
  ctx.fill();
  // legs — same FK as the figure above (the mirror tells the truth, D2)
  for (const s of [-1, 1] as const) {
    const near = s === 1;
    const hipX = s * HIP_HW * 0.72;
    let thighAng: number, kneeBend: number;
    if (p.walkPhase >= 0) {
      const wph = p.walkPhase * Math.PI * 2 + (near ? 0 : Math.PI);
      thighAng = Math.sin(wph) * 26 * p.walkSpeed + (near ? 0.5 : -0.5);
      const swingFrac = Math.max(0, -Math.cos(wph));
      kneeBend = swingFrac * 44 * p.walkSpeed + (1 - swingFrac) * 5 * p.walkSpeed + 2;
    } else {
      thighAng = s * 2.2 + (near ? p.rKnee * 0.06 : -p.lKnee * 0.06);
      kneeBend = near ? p.rKnee : p.lKnee;
    }
    const knee = pt(hipX, hipY, thighAng, U_LEG);
    const ankle = pt(knee.x, knee.y, thighAng + kneeBend, L_LEG);
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(ankle.x, ankle.y);
    ctx.lineWidth = 11;
    ctx.strokeStyle = suitRefDark;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // head (deepest in the mirror → faintest)
  ctx.globalAlpha = 0.075;
  ctx.beginPath();
  ctx.ellipse(neckX, neckY - NECK - HEAD_R * 0.9, HEAD_R * 0.82, HEAD_R, 0, 0, Math.PI * 2);
  ctx.fillStyle = hexLerp(SKIN.deep, '#05080F', 0.45);
  ctx.fill();
  ctx.restore();
  // fade-out gradient — the mirror dies with distance from the floor plane
  const fadeH = (TORSO + NECK + HEAD_R * 2.1) * scale * 0.96;
  const fg = ctx.createLinearGradient(0, groundY - 2, 0, groundY + fadeH);
  fg.addColorStop(0, 'rgba(8,12,24,0)');
  fg.addColorStop(0.55, 'rgba(8,12,24,0.30)');
  fg.addColorStop(1, 'rgba(8,12,24,0.88)');
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = fg;
  ctx.fillRect(cx - 78 * scale, groundY - 2, 156 * scale, fadeH);
  ctx.restore();
}

// ── the figure ───────────────────────────────────────────────────────────────
export interface RenderOpts {
  pose: Pose;
  alpha?: number;
  flip?: boolean;
  faceScale?: number;
  shadow?: boolean;
  reflection?: boolean;
  wordTimes?: number[];
  wordTexts?: string[];
  beatT?: number;
  scale?: number;
  rimBoost?: number;
  /** finite-difference velocities (per ~90ms) — drive head lag, tie pendulum,
   *  wrist follow-through. Compute as pose(t) − pose(t−90) in the scene (D4). */
  vel?: { lean?: number; rootY?: number; rAL?: number; rAU?: number };
  /** M-03 — absolute time (same base as `t`) of a prop IMPACT (gap-bar catch,
   *  stamp slam, bar landing): the body compresses to sy≈0.895 and recoils. */
  impactT?: number;
  /** AUDIT C-08 — continuous mirror scale for the paper turn (−1..1);
   *  overrides `flip` when present. */
  flipScale?: number;
}

export function drawStickman(
  ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale: number,
  t: number, r: RenderOpts, seed = 0
): void {
  const p = r.pose;
  const alpha = r.alpha ?? 1;
  if (alpha <= 0.01) return;
  const rim = 0.34 + (r.rimBoost ?? 0);

  if (r.shadow !== false) {
    // AUDIT §2.4 — the ground shadow tightens 20% for 150ms after an impact
    const landAge = r.impactT != null ? t - r.impactT : Infinity;
    groundShadow(ctx, cx, groundY, scale, landAge >= 0 && landAge < 150 ? 0.8 : 1);
  }
  if (r.reflection) drawReflection(ctx, cx, groundY, scale, p, t, seed);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, groundY);
  // AUDIT C-08 — the paper turn: flipScale animates continuously from −1→1
  // over the turn window (scenes-host drives it), replacing the single-frame
  // mirror pop. flip stays as the boolean shorthand for a static mirror.
  const flipScale = r.flipScale ?? (r.flip ? -1 : 1);
  if (flipScale !== 1) ctx.scale(flipScale, 1);
  ctx.scale(scale, scale);
  // squash & stretch (U2.3) — root transform, pivot at the feet (the origin),
  // so the shoes stay planted. Two components:
  //  (1) stride events — contact squashes, push-off stretches (walk phase);
  //  (2) analytic vertical velocity — scaleY = 1 + k·vy with k ≈ 0.0009 px⁻¹
  //      (vy in px/s from the finite-difference vel), volume-preserved as
  //      scaleX = 1 − k·vy·0.6.
  let sy = 1;
  if (p.walkPhase >= 0) {
    // M-01 — the two-frame contact squash no longer scales away with walkSpeed
    const sqSpd = Math.max(0.62, p.walkSpeed);
    const contact = Math.max(0, -Math.cos(p.walkPhase * Math.PI * 4));
    const push = Math.max(0, Math.cos(p.walkPhase * Math.PI * 4));
    sy += -contact * 0.05 * sqSpd + push * 0.03 * sqSpd;
  }
  // vel is pose(t) − pose(t−90ms); rootY up is negative, so upward motion
  // (push-off) is vy < 0 → stretch, downward motion (landing) → squash
  const vyPS = (r.vel?.rootY ?? 0) * (1000 / 90);
  sy += clamp(-0.0009 * vyPS, -0.05, 0.05);
  // M-03 + AUDIT C-09 — impact squash at FILM-visible amplitude: a 2-frame
  // rise to 9%, a 2-frame overshoot to 10.5%, then a damped recoil (stretch
  // up to 6%) into settle. The old 6% cap was also being clipped by the
  // sy clamp at 0.92 — the clamp now moves to 0.885..1.10 so the full
  // compress actually reaches the screen.
  let impactAmp = 0;
  if (r.impactT != null) {
    const age = t - r.impactT;
    if (age >= 0 && age < 900) {
      let a: number;
      if (age < 66) a = 0.09 * (age / 66);                       // rise to 9%
      else if (age < 100) a = 0.09 + 0.015 * ((age - 66) / 34);  // overshoot 10.5%
      else a = 0.105 * Math.exp(-(age - 100) / 210) * Math.cos((age - 100) / 160);
      impactAmp = Math.max(0, a);
      sy -= Math.max(-0.06, a);
    }
  }
  sy = clamp(sy, 0.885, 1.10);
  const sx = 1 - (sy - 1) * 0.6;
  ctx.scale(sx, sy);

  // Phase 1 — one ink weight for every silhouette (≈2.2px at 1080p)
  const inkW = 2.2 / scale;
  const breath = 1 + 0.006 * Math.sin(t / 2400);
  const hipY = -(U_LEG + L_LEG) + p.rootY;
  const leanR = p.lean * D2R;
  const tiltR = p.torsoTilt * D2R;

  // ── legs (far first, then near) ──
  const legDraw = (side: -1 | 1) => {
    const near = side === 1;
    const hipX = side * HIP_HW * 0.72;
    let thighAng: number, kneeBend: number, ankleAng: number;
    if (p.walkPhase >= 0) {
      const wph = p.walkPhase * Math.PI * 2 + (side === 1 ? 0 : Math.PI);
      const sp = ((wph / (Math.PI * 2)) % 1 + 1) % 1;
      thighAng = Math.sin(wph) * 26 * p.walkSpeed + (near ? 0.5 : -0.5);
      // knee: deep flexion mid-swing (foot clears the floor), STRAIGHT support
      // through stance — knee bend → ~0 at the pass position (U2.5; the old
      // formula was inverted: the stance leg bent 46° while the swing leg
      // stayed straight, the exact opposite of a walk)
      const swingFrac = Math.max(0, -Math.cos(wph));
      kneeBend = swingFrac * 44 * p.walkSpeed + (1 - swingFrac) * 5 * p.walkSpeed + 2;
      // M-01 — ±22° heel-toe roll (was −12°..+14° ≈ 1–2px of toe travel at
      // rig scale): heel strike → roll through foot-flat → toe-off → reach
      let footPitch: number;
      if (sp < 0.06) footPitch = lerp(-14, -22, sp / 0.06);
      else if (sp < 0.38) footPitch = lerp(-22, 0, (sp - 0.06) / 0.32);
      else if (sp < 0.48) footPitch = lerp(0, 22, (sp - 0.38) / 0.10);
      else if (sp < 0.62) footPitch = lerp(22, -10, (sp - 0.48) / 0.14);
      else footPitch = lerp(-10, -14, (sp - 0.62) / 0.38);
      ankleAng = footPitch * p.walkSpeed;
    } else {
      thighAng = side * 2.2 + (near ? p.rKnee * 0.06 : -p.lKnee * 0.06);
      kneeBend = near ? p.rKnee : p.lKnee;
      ankleAng = near ? p.rAnkle : p.lAnkle;
    }
    const knee = pt(hipX, hipY, thighAng, U_LEG);
    const knee2 = pt(knee.x, knee.y, thighAng + kneeBend, L_LEG);
    const foot = pt(knee2.x, knee2.y, thighAng + kneeBend + 90 + ankleAng, 7.5);
    const W = near ? 15.6 : 13.3; // AUDIT C-06 — thigh width +15%: legs read as trousered limbs, not 2px sticks
    bone(ctx, hipX, hipY, knee.x, knee.y, 2.5, { w0: W, w1: W * 0.82, lit: SUIT.lit, dark: SUIT.dark, rim: near ? rim * 0.7 : 0, far: !near, ink: inkW });
    // C-08 — sleeved knee: the shin starts 2.5px inside the joint (cloth
    // overlaps the joint) and a soft crease replaces the polished sphere
    const kSx = knee.x - Math.sin(thighAng * D2R) * 2.5, kSy = knee.y - Math.cos(thighAng * D2R) * 2.5;
    bone(ctx, kSx, kSy, knee2.x, knee2.y, 2, { w0: W * 0.8, w1: W * 0.6, lit: SUIT.lit, dark: SUIT.dark, rim: near ? rim * 0.5 : 0, far: !near, ink: inkW });
    clothCrease(ctx, knee.x + Math.sin((thighAng + kneeBend) * D2R) * 2.5, knee.y + Math.cos((thighAng + kneeBend) * D2R) * 2.5, thighAng + kneeBend - 90, W * 0.5);
    // shoe — tailored profile: heel, vamp, toe cap, sole line, gold welt (D2).
    // No more gold-outlined ellipse: the 'hoverboard ring' read is dead.
    ctx.save();
    ctx.translate(knee2.x + side * 1.1, knee2.y);
    ctx.rotate(Math.atan2(foot.y - knee2.y, foot.x - knee2.x));
    const sg = ctx.createLinearGradient(0, -5, 12, 5);
    sg.addColorStop(0, SHOE.lit);
    sg.addColorStop(1, SHOE.dark);
    ctx.beginPath();
    ctx.moveTo(-3, -4.2);
    ctx.quadraticCurveTo(6, -5.4, 11, -3.2);
    ctx.quadraticCurveTo(15.5, -1.4, 15.5, 1.2);
    ctx.quadraticCurveTo(15.5, 3.4, 12, 3.6);
    ctx.lineTo(-4.5, 3.9);
    ctx.quadraticCurveTo(-6.5, 3.8, -6, 1.5);
    ctx.quadraticCurveTo(-5.5, -2.5, -3, -4.2);
    ctx.closePath();
    ctx.fillStyle = sg;
    ctx.fill();
    // Phase 1 — shoe silhouette joins the ink system
    ctx.strokeStyle = INK;
    ctx.lineWidth = inkW;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(5,8,16,0.8)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-6, 3.2);
    ctx.lineTo(15, 2.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(212,175,55,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5.5, 1.6);
    ctx.lineTo(14.8, 1.3);
    ctx.stroke();
    ctx.restore();
  };
  legDraw(-1);
  legDraw(1);

  // pelvis block (C-06) — kept high and narrow so the tailored hem fully
  // covers it: no peacoat-over-shorts silhouette
  ctx.save();
  ctx.rotate(p.pelvisTilt * D2R * 0.4);
  const pg = ctx.createLinearGradient(0, hipY - 8, 0, hipY + 8);
  pg.addColorStop(0, SUIT.mid);
  pg.addColorStop(1, SUIT.dark);
  ctx.beginPath();
  ctx.ellipse(0, hipY - 1, HIP_HW + 3, 7.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.restore();

  // ── torso ──
  // gesture strikes key a 2–3% squash on the torso (U2.3): the whole upper
  // body settles a touch on content-word impacts, pivoting from the hips
  const strike = Math.max(0, accentEnv(r.beatT ?? t, r.wordTimes ?? [], r.wordTexts ?? []));
  ctx.save();
  ctx.translate(0, hipY);
  // AUDIT C-09 — the torso ANSWERS prop impacts: a damped 2.5% compress
  // riding on the same impact envelope as the root squash (the upper body
  // settles when something lands, not just the scale)
  ctx.scale(1 + (sx - 1) * 0.4, 1 - strike * 0.028 - impactAmp * 0.24);
  ctx.translate(0, -hipY);
  const shX = Math.sin(leanR + tiltR) * TORSO;
  const shY = hipY - Math.cos(leanR + tiltR) * TORSO;
  const shW = SHOULDER_HW * breath;
  ctx.save();
  ctx.rotate(p.lean * D2R * 0.22);
  const tg = ctx.createLinearGradient(-shW, shY - 10, shW * 0.8, hipY);
  tg.addColorStop(0, SUIT.lit);
  tg.addColorStop(0.42, SUIT.mid);
  tg.addColorStop(1, SUIT.dark);
  ctx.beginPath();
  ctx.moveTo(-shW * 0.92, shY + 4);
  ctx.quadraticCurveTo(-shW * 1.04, shY - 9, -shW * 0.62, shY - 13);
  ctx.quadraticCurveTo(0, shY - 17, shW * 0.62, shY - 13);
  ctx.quadraticCurveTo(shW * 1.04, shY - 9, shW * 0.92, shY + 4);
  // straight-cut sides — tailoring, not a corset (D7)
  // C-06 — tailored hem: straight cut with a 2px centre drop and two vent
  // lines; no skirt flare over the pelvis
  ctx.lineTo(shW * 0.86, shY + (hipY - shY) * 0.52);
  ctx.lineTo(HIP_HW + 10, hipY + 7);
  ctx.lineTo(5, hipY + 9);
  ctx.lineTo(-HIP_HW - 10, hipY + 7);
  ctx.lineTo(-shW * 0.86, shY + (hipY - shY) * 0.52);
  ctx.closePath();
  ctx.fillStyle = tg;
  ctx.fill();
  // Phase 1 — the jacket joins the ink system
  ctx.strokeStyle = INK;
  ctx.lineWidth = inkW;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // hem vents — two short darker cuts (tailoring read, C-06)
  ctx.strokeStyle = 'rgba(5,8,16,0.45)';
  ctx.lineWidth = 1.4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * (HIP_HW + 2), hipY + 7.5);
    ctx.lineTo(s * (HIP_HW * 0.55), hipY - 2);
    ctx.stroke();
  }

  // AUDIT C-09 — coat-hem secondary motion: two trailing cloth flaps hang from
  // the hem and lag the walk cycle by ~90ms (phase-shifted), so the jacket
  // visibly answers the stride. Frozen when standing; scaled by walk speed.
  if (p.walkPhase >= 0 && p.walkSpeed > 0.05) {
    const lag = -Math.sin(p.walkPhase * Math.PI * 2 + 0.9);
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * (HIP_HW + 5), hipY + 6);
      ctx.rotate(lag * 2.6 * D2R * p.walkSpeed * s);
      ctx.beginPath();
      ctx.moveTo(-3.2, 0);
      ctx.quadraticCurveTo(-1.6, 7, -2.6, 12);
      ctx.lineTo(3.2, 11);
      ctx.quadraticCurveTo(4.6, 5, 3.6, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(10,15,28,0.55)';
      ctx.fill();
      ctx.restore();
    }
  }

  // rim light along the lit edge (upper-left)
  ctx.beginPath();
  ctx.moveTo(-shW * 0.92, shY + 4);
  ctx.quadraticCurveTo(-shW * 1.04, shY - 9, -shW * 0.62, shY - 13);
  ctx.quadraticCurveTo(0, shY - 17, shW * 0.62, shY - 13);
  ctx.quadraticCurveTo(shW * 0.8, shY - 11, shW * 0.9, shY - 6);
  ctx.strokeStyle = rgba('#F4E5BF', rim * 0.85);
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // shirt V + tie (premium detail) — AUDIT C-05: the V widens ×1.3 (±9→±12,
  // depth 26→30) so the dress shirt reads at phone size instead of vanishing
  // into the jacket slab
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, shY - 10);
  ctx.lineTo(12, shY - 10);
  ctx.lineTo(0, shY + 30);
  ctx.closePath();
  ctx.fillStyle = 'rgba(226,232,242,0.92)';
  ctx.fill();
  // tie — FIX C4: ONE-PIECE silk. The old 2-segment pendulum hinged at a hard
  // corner and dislocated at ordinary gesture velocities (the snapped-tie
  // read). The whole tie now sways with the torso and the blade BENDS as
  // cloth — a quadratic skew capped at ±14°, fully deterministic.
  const velLean = r.vel?.lean ?? 0;
  const velBob = r.vel?.rootY ?? 0;
  const tieSwayDeg = clamp(velLean * -3.2 + velBob * -1.8, -24, 24);
  const tieBendDeg = clamp(tieSwayDeg * 0.45 + velBob * -1.2, -14, 14);
  // Phase 1 — burgundy silk: gold is reserved for the pocket-watch chain,
  // the one signature accessory of the gentleman arbitrageur
  const tieG = ctx.createLinearGradient(0, 0, 0, TORSO * 0.8);
  tieG.addColorStop(0, '#6E2430');
  tieG.addColorStop(1, '#3A121B');
  ctx.save();
  ctx.translate(0, shY - 8);
  ctx.rotate(tieSwayDeg * D2R);
  // AUDIT C-05 — the knot: a proper kite above the blade (width ×1.25), with
  // a dimple shade — the tie reads as silk, not a red sliver
  ctx.beginPath();
  ctx.moveTo(-5.0, -9);
  ctx.lineTo(5.0, -9);
  ctx.lineTo(6.2, -2);
  ctx.lineTo(0, 1.5);
  ctx.lineTo(-6.2, -2);
  ctx.closePath();
  ctx.fillStyle = hexLerp('#6E2430', '#3A121B', 0.3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1.3, -8);
  ctx.quadraticCurveTo(0, -4.5, 1.3, -8); // dimple
  ctx.strokeStyle = 'rgba(110,87,22,0.55)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // the blade — ONE path from under the knot to the tip. The tip skews by
  // sin(bend)·length and the mid by 55% of that, so the silk curves instead
  // of hinging. Length tracks the torso (ends at the button stance — C9-safe).
  const BL = TORSO * 0.8;
  const tipX = Math.sin(tieBendDeg * D2R) * BL;
  const midX = tipX * 0.55;
  ctx.beginPath();
  ctx.moveTo(-4.6, 0.5);
  ctx.quadraticCurveTo(midX - 6.0, BL * 0.5, tipX - 3.2, BL * 0.82);
  ctx.quadraticCurveTo(tipX - 1.6, BL * 0.94, tipX, BL);
  ctx.quadraticCurveTo(tipX + 1.6, BL * 0.94, tipX + 3.2, BL * 0.82);
  ctx.quadraticCurveTo(midX + 6.0, BL * 0.5, 4.6, 0.5);
  ctx.closePath();
  ctx.fillStyle = tieG;
  ctx.fill();
  ctx.restore();
  // collar
  ctx.beginPath();
  ctx.moveTo(-10, shY - 12); ctx.lineTo(-3, shY - 8); ctx.lineTo(-6.5, shY - 2); ctx.closePath();
  ctx.fillStyle = 'rgba(240,244,250,0.95)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, shY - 12); ctx.lineTo(3, shY - 8); ctx.lineTo(6.5, shY - 2); ctx.closePath();
  ctx.fill();
  // C-05 — pocket square: a stitched pocket slit with a small silk triangle
  // peeking from it (no more floating name-badge parallelogram)
  ctx.save();
  ctx.translate(shW * 0.38, shY + 18);
  ctx.rotate(-0.06 + tieSwayDeg * 0.35 * D2R); // M-04 — pocket-square lag 3.5×
  // pocket slit
  ctx.strokeStyle = 'rgba(5,8,16,0.55)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(11, 0);
  ctx.stroke();
  // cloth fold under the slit
  ctx.strokeStyle = 'rgba(244,229,191,0.14)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-11, 1.6);
  ctx.lineTo(11, 1.6);
  ctx.stroke();
  // the silk — a small triangle peeking above the slit
  ctx.beginPath();
  ctx.moveTo(-4.6, 0);
  ctx.lineTo(4.6, 0);
  ctx.lineTo(1.4, -6.2);
  ctx.lineTo(-1.6, -5.4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(234,228,214,0.94)'; // ivory silk — gold reserved for the chain
  ctx.fill();
  ctx.strokeStyle = 'rgba(118,108,88,0.45)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
  // AUDIT C-03 / FIX C5 — the pocket-watch chain as a TRUE catenary drawn as
  // ONE continuous tapered ribbon: a filled crescent along the drape with a
  // highlight edge on the lit side. The old 12 stroked rings rendered as a
  // bead necklace at rig scale — the ribbon reads as gold watch chain.
  ctx.save();
  ctx.translate(-shW * 0.42, shY + 16);
  ctx.rotate(tieSwayDeg * 0.4 * D2R);
  const cx2 = 8, cy2 = 46;  // watch pocket (button stance)
  const sagCX = 14, sagCY = 26; // catenary control — a real outward drape
  const CHN = 14;
  const chPts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= CHN; i++) {
    const q = i / CHN;
    chPts.push({ x: quadPt(0, sagCX, cx2, q), y: quadPt(0, sagCY, cy2, q) });
  }
  const chainHalfW = (q: number): number => 2.0 - 0.7 * q; // tapers toward the pocket
  const chainNorm = (i: number): { x: number; y: number } => {
    const a = chPts[Math.max(0, i - 1)], b = chPts[Math.min(CHN, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: -dy / l, y: dx / l };
  };
  ctx.beginPath();
  for (let i = 0; i <= CHN; i++) {
    const n = chainNorm(i), w = chainHalfW(i / CHN);
    const px = chPts[i].x + n.x * w, py = chPts[i].y + n.y * w;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  for (let i = CHN; i >= 0; i--) {
    const n = chainNorm(i), w = chainHalfW(i / CHN);
    ctx.lineTo(chPts[i].x - n.x * w, chPts[i].y - n.y * w);
  }
  ctx.closePath();
  const chg = ctx.createLinearGradient(0, 0, cx2, cy2);
  chg.addColorStop(0, PALETTE.goldBright);
  chg.addColorStop(1, PALETTE.goldDeep);
  ctx.fillStyle = chg;
  ctx.fill();
  // highlight along the lit (upper-left) edge of the ribbon
  ctx.strokeStyle = 'rgba(255,243,214,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i <= CHN; i++) {
    const n = chainNorm(i), w = chainHalfW(i / CHN) * 0.45;
    const px = chPts[i].x + n.x * w, py = chPts[i].y + n.y * w;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // the fob — a small gold ring into a 6.4px medallion at the pocket
  ctx.beginPath();
  ctx.arc(cx2, cy2, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.goldBright;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx2, cy2 + 4.4, 3.2, 0, Math.PI * 2);
  const fg = ctx.createRadialGradient(cx2 - 1, cy2 + 3.2, 0.5, cx2, cy2 + 4.4, 3.4);
  fg.addColorStop(0, PALETTE.goldPale);
  fg.addColorStop(0.6, PALETTE.goldBright);
  fg.addColorStop(1, PALETTE.goldDeep);
  ctx.fillStyle = fg;
  ctx.fill();
  // rim light on the medallion's lit edge (one light, upper-left)
  ctx.strokeStyle = 'rgba(255,243,214,0.85)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(cx2, cy2 + 4.4, 2.6, Math.PI * 0.8, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
  ctx.restore(); // torso detail

  // lapels — the suit's tailoring signature (D7) — AUDIT C-05: fill 0.5→0.75,
  // edge brightened to the ivory family at 0.35, panels extended to the button
  // stance so the lapels read as cut cloth instead of dark smudges
  const lapel = (s: -1 | 1) => {
    ctx.beginPath();
    ctx.moveTo(s * 10, shY - 11);
    ctx.lineTo(s * (shW * 0.46), shY - 4);
    ctx.lineTo(s * (shW * 0.30), shY + 44);
    ctx.lineTo(s * 5.5, shY + 6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(13,19,36,0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,229,191,0.35)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  };
  lapel(-1);
  lapel(1);
  ctx.restore(); // torso

  // ── arms ──
  const armDraw = (side: -1 | 1) => {
    const near = side === 1;
    const aU = near ? p.rAU : p.lAU;
    const aL = near ? p.rAL : p.lAL;
    const shX2 = shX + side * shW * 0.74;
    const shY2 = shY + 2;
    const elbow = pt(shX2, shY2, aU, U_ARM);
    const wrist = pt(elbow.x, elbow.y, aU + aL, L_ARM);
    const W = near ? 12.4 : 10.4;
    bone(ctx, shX2, shY2, elbow.x, elbow.y, 2.2, { w0: W, w1: W * 0.8, lit: SUIT.lit, dark: SUIT.dark, rim: near ? rim * 0.75 : 0, far: !near, ink: inkW });
    // C-03 — deltoid sleeve cap over the arm root: overlaps the torso edge and
    // the bone root, so the shoulder reads as one tailored silhouette
    sleeveCap(ctx, shX2 + Math.sin(aU * D2R) * 5, shY2 + Math.cos(aU * D2R) * 5, aU, W * 1.18, !near, inkW);
    // C-08 — sleeved elbow: the forearm starts 2.5px inside the joint and a
    // soft cloth crease replaces the polished sphere
    const eSx = elbow.x - Math.sin(aU * D2R) * 2.5, eSy = elbow.y - Math.cos(aU * D2R) * 2.5;
    bone(ctx, eSx, eSy, wrist.x, wrist.y, 1.6, { w0: W * 0.78, w1: W * 0.52, lit: SUIT.lit, dark: SUIT.dark, rim: near ? rim * 0.5 : 0, far: !near, ink: inkW });
    clothCrease(ctx, elbow.x + Math.sin((aU + aL) * D2R) * 2.5, elbow.y + Math.cos((aU + aL) * D2R) * 2.5, aU + aL - Math.sign(aL || 1) * 90, W * 0.44);
    // (C-07 — the cuff moved INSIDE drawHand: parented to the hand transform)
    // (Phase 1 — the wrist gold dot retired; the pocket-watch chain is the
    // one gold accessory)
    // hand — wrist follow-through: the hand keeps moving after the forearm
    // settles (D4), and points when the scene asks it to touch data (D1)
    const handAng = aU + aL - (near ? (r.vel?.rAL ?? 0) * 0.9 : 0);
    // AUDIT C-02 — hands ×1.4 (7.2→10.0 near, 6.2→8.4 far): fingers resolve as
    // fingers at 1080p instead of a cream smudge
    drawHand(ctx, wrist.x, wrist.y, handAng, near ? 10.0 : 8.4, near, p.hand ?? 'open', W, inkW);
    // AUDIT C-01 — the presentation pointer: a slim rod parented to the point
    // hand, ~200px on screen at ANY rig scale (length is scale-compensated),
    // ink shaft with a gold tip. Extends the reach contract so mid-distance
    // targets are TOUCHED, not gestured at; beyond even the pointer, the data
    // scenes draw the sight line (scenes-figure).
    if (near && (p.hand ?? 'open') === 'point') {
      const pLen = clamp(200 / scale, 70, 150);
      const tipP = pt(wrist.x, wrist.y, handAng, pLen);
      const buttP = pt(wrist.x, wrist.y, handAng, -5);
      ctx.lineCap = 'round';
      // butt counterweight
      ctx.strokeStyle = 'rgba(90,110,150,0.9)';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(buttP.x, buttP.y);
      ctx.lineTo(wrist.x, wrist.y);
      ctx.stroke();
      // ink shaft
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(wrist.x + Math.sin(handAng * D2R) * 3, wrist.y + Math.cos(handAng * D2R) * 3);
      ctx.lineTo(tipP.x, tipP.y);
      ctx.stroke();
      // gold business end — the light-catching tip
      const gTip = pt(wrist.x, wrist.y, handAng, pLen - 12);
      ctx.strokeStyle = rgba(PALETTE.goldBright, 0.95);
      ctx.lineWidth = 2.7;
      ctx.beginPath();
      ctx.moveTo(gTip.x, gTip.y);
      ctx.lineTo(tipP.x, tipP.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tipP.x, tipP.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.goldPale;
      ctx.fill();
    }
    return { wrist: { x: wrist.x, y: wrist.y } };
  };
  armDraw(-1);
  armDraw(1);

  // ── neck + head ──
  const neckX2 = shX, neckY2 = shY - 2;
  bone(ctx, neckX2, neckY2, neckX2, neckY2 - NECK, 0, { w0: 9.5, w1: 8.5, lit: hexLerp(SKIN.lit, SKIN.dark, 0.35), dark: SKIN.deep, rim: rim * 0.4, ink: inkW });
  const headY = neckY2 - NECK - HEAD_R * 0.92 + p.headNod * -3;
  // overlapping action (D4): the head trails the torso — it arrives ~80ms late,
  // which is the classic animator's tell that the body has weight
  const lagLean = p.lean - (r.vel?.lean ?? 0) * 5.6; // M-04 — head lag 3.5×
  const headX = neckX2 + Math.sin((p.headTilt + lagLean) * D2R) * 6;

  // (C-03 — the old floating shoulder spheres are gone; the deltoid sleeve
  // caps are now drawn inside armDraw, overlapping torso edge and arm root)

  drawFace(ctx, headX, headY, p.headTilt * 0.6 + lagLean * 0.4, p, t, r.faceScale ?? 1, r.wordTexts ?? [], r.wordTimes ?? [], r.beatT ?? 0, p.look, lagLean, 2.2 / (scale * (r.faceScale ?? 1)));

  ctx.restore(); // upper-body strike squash
  ctx.restore();
}

/** tailored hand (C-07) — palm + four tapered capsule fingers + an opposing
 *  thumb, with the shirt cuff parented to the hand transform so it can never
 *  detach from the wrist again. mode 'point' (D1) extends the index so the
 *  figure can actually touch what it narrates. */
function drawHand(
  ctx: CanvasRenderingContext2D, x: number, y: number, angDeg: number,
  size: number, near: boolean, mode: 'open' | 'point' | 'cup' = 'open', sleeveW = 12, ink = 0
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angDeg + 90) * D2R); // local +x = along the arm axis
  // cuff FIRST — parented to this transform, aligned with the hand whatever
  // the follow-through angle does (C-07)
  ctx.beginPath();
  ctx.moveTo(-size * 0.62, -sleeveW * 0.52);
  ctx.lineTo(-size * 0.62, sleeveW * 0.52);
  ctx.strokeStyle = 'rgba(226,232,242,0.92)';
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.stroke();
  const g = ctx.createLinearGradient(-size * 0.5, 0, size * 0.8, 0);
  g.addColorStop(0, hexLerp(SKIN.lit, SKIN.dark, 0.22));
  g.addColorStop(1, SKIN.dark);
  ctx.fillStyle = g;
  // palm — rounded slab
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, -size * 0.46);
  ctx.quadraticCurveTo(size * 0.42, -size * 0.58, size * 0.62, -size * 0.34);
  ctx.lineTo(size * 0.62, size * 0.3);
  ctx.quadraticCurveTo(size * 0.34, size * 0.6, -size * 0.36, size * 0.52);
  ctx.quadraticCurveTo(-size * 0.62, size * 0.26, -size * 0.5, -size * 0.46);
  ctx.closePath();
  ctx.fill();
  // Phase 1 — the hand joins the ink system
  if (ink > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = ink;
    ctx.stroke();
  }
  const fk = hexLerp(SKIN.lit, SKIN.dark, near ? 0.3 : 0.55);
  ctx.strokeStyle = fk;
  ctx.lineCap = 'round';
  if (mode === 'cup') {
    // S-04 — fingers curled UP under the object: the cradling palm. Tips pull
    // back toward the palm line so a resting prop reads as held, not hovered.
    const fingersC: Array<[number, number]> = [
      [-0.34, 0.62], [-0.1, 0.72], [0.14, 0.76], [0.38, 0.64],
    ];
    for (const [fy, fl] of fingersC) {
      ctx.lineWidth = size * (0.26 + fl * 0.06);
      ctx.beginPath();
      ctx.moveTo(size * 0.5, fy * size * 0.9);
      ctx.quadraticCurveTo(size * (0.5 + fl * 0.9), fy * size * 1.02, size * (0.5 + fl * 0.5), fy * size * 0.22);
      ctx.stroke();
    }
    // thumb wraps across the near edge (AUDIT C-02 — thickened so the wrap
    // reads as a gripping thumb at phone size)
    ctx.lineWidth = size * 0.40;
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.44);
    ctx.quadraticCurveTo(size * 0.2, -size * 0.8, size * 0.56, -size * 0.4);
    ctx.stroke();
  } else if (mode === 'point') {
    // AUDIT C-02 — the index is TWO segments with a 12° knuckle bend: the
    // pointing read becomes a gesture with a real joint, not a straight spike
    const seg1 = size * 0.95, seg2 = size * 0.82;
    const knX = size * 0.5 + seg1, knY = -size * 0.20;
    const bendR = 12 * D2R;
    const tipX2 = knX + Math.cos(bendR) * seg2, tipY2 = knY + Math.sin(bendR) * seg2;
    ctx.lineWidth = size * 0.30;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, -size * 0.18);
    ctx.lineTo(knX, knY);
    ctx.stroke();
    ctx.lineWidth = size * 0.24;
    ctx.beginPath();
    ctx.moveTo(knX, knY);
    ctx.quadraticCurveTo(knX + seg2 * 0.6, knY + seg2 * 0.08, tipX2, tipY2);
    ctx.stroke();
    // folded middle/ring/pinky + thumb wrapped across the palm
    ctx.fillStyle = fk;
    ctx.beginPath();
    ctx.ellipse(size * 0.4, size * 0.2, size * 0.32, size * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = size * 0.28;
    ctx.beginPath();
    ctx.moveTo(size * 0.02, -size * 0.36);
    ctx.quadraticCurveTo(size * 0.46, -size * 0.74, size * 0.58, -size * 0.34);
    ctx.stroke();
  } else {
    // C-07 — four tapered capsules fanned from the palm edge + opposing thumb
    const fingers: Array<[number, number, number]> = [
      [-0.34, 0.78, -0.16], // pinky: y, length, spread
      [-0.1, 0.92, -0.05],
      [0.14, 0.98, 0.06],
      [0.38, 0.8, 0.18],    // index
    ];
    for (const [fy, fl, spread] of fingers) {
      ctx.lineWidth = size * (0.24 + fl * 0.08);
      const tipX = size * (0.62 + fl), tipY = fy * size * 1.28 + spread * size * 0.9;
      ctx.beginPath();
      ctx.moveTo(size * 0.52, fy * size * 0.92);
      ctx.quadraticCurveTo(size * (0.62 + fl * 0.6), fy * size * 1.15 + spread * size * 0.4, tipX, tipY);
      ctx.stroke();
    }
    // thumb — a thicker capsule from the near edge crossing the palm
    // (AUDIT C-02 — thickened to 0.40 so the opposing thumb survives phone size)
    ctx.lineWidth = size * 0.40;
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, -size * 0.42);
    ctx.quadraticCurveTo(size * 0.16, -size * 0.78, size * 0.52, -size * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// ── walk helper ──────────────────────────────────────────────────────────────
/** trapezoid-eased walk from→to. Stride is phase-locked to the VISUAL stride
 *  (2·sin(thigh swing)·leg length in px) so the feet track the ground exactly —
 *  zero slide (D5). Returns pose + phase. */
export function walkIn(
  t: number, fromX: number, toX: number, durMs: number,
  rigScale = 1, seed = 0
): { x: number; pose: Pose; walking: boolean; phase: number } {
  const p = clamp01(t / durMs);
  const ease = p < 0.22 ? easeInOutSine(p / 0.22) * 0.22 : p > 0.8 ? 0.22 + easeInOutSine((p - 0.8) / 0.2) * 0.78 : 0.22 + (p - 0.22) / 0.58 * 0.78;
  const dist = Math.abs(toX - fromX);
  const stride = 2 * Math.sin(26 * D2R) * (U_LEG + L_LEG) * rigScale;
  const walking = p > 0.02 && p < 0.985 && dist > 4;
  const speed = walking ? clamp01(dist / 320 + 0.55) : 0;
  const phase = ((ease * dist) / stride) % 1;
  const pose = walking ? walkPose(phase, speed) : poseAt(`arrive-${seed}`, t, t, [], []);
  const x = fromX + (toX - fromX) * ease;
  return { x, pose, walking, phase };
}

// ── D1: the companion contract ───────────────────────────────────────────────
/** Aim the near hand at a scene prop with 2-bone IK and lead the gaze to it.
 *  Target is in SCENE pixels; the rig math is done in local units. This is what
 *  makes the figure touch the data it narrates instead of gesturing into air. */
export function companionArm(
  pose: Pose, px: number, groundY: number, rigScale: number,
  target: { x: number; y: number }, mode: 'point' | 'present' = 'point'
): void {
  const shx = px + Math.sin((pose.lean + pose.torsoTilt) * D2R) * TORSO * rigScale;
  const shy = groundY + (-(U_LEG + L_LEG) + pose.rootY - TORSO) * rigScale;
  const dx = (target.x - shx) / rigScale;
  const dy = (target.y - shy) / rigScale;
  const ik = armIk(0, 0, dx, dy, U_ARM, L_ARM, 1);
  pose.rAU = ik.aU;
  pose.rAL = ik.aL;
  pose.hand = mode === 'point' ? 'point' : 'open';
  // the eyes and head lead the hand to the prop
  pose.look = clamp((target.x - px) / 420, -1, 1);
  pose.headTilt += clamp((target.y - shy * rigScale) / 900, -2, 2);
}

/** U3.1 — the weigh contract: the FAR arm joins the scene. Mirrored 2-bone IK
 *  through the same armIk(), angles negated for the left side. */
export function companionArmL(
  pose: Pose, px: number, groundY: number, rigScale: number,
  target: { x: number; y: number }, mode: 'point' | 'present' = 'present'
): void {
  const shx = px + Math.sin((pose.lean + pose.torsoTilt) * D2R) * TORSO * rigScale;
  const shy = groundY + (-(U_LEG + L_LEG) + pose.rootY - TORSO) * rigScale;
  const dx = (target.x - shx) / rigScale;
  const dy = (target.y - shy) / rigScale;
  const ik = armIk(0, 0, -dx, dy, U_ARM, L_ARM, 1);
  pose.lAU = -ik.aU;
  pose.lAL = -ik.aL;
  if (mode !== 'point') pose.hand = 'open';
}

/** S-01..S-04 support — where a named hand ACTUALLY is on screen, using the
 *  same forward kinematics as drawStickman's armDraw. Companion props anchor
 *  to this so "resting on the palm" is geometrically true instead of
 *  aspirational: the prop is placed on the rendered hand, whatever the IK
 *  did with the arm. `extra` extends the point past the palm along the hand
 *  axis (AUDIT C-01 — the pointer tip lives 200/rigScale px past the palm). */
export function palmPosition(
  pose: Pose, side: 1 | -1, cx: number, groundY: number, scale: number,
  extra = 0
): { x: number; y: number } {
  const hipY = -(U_LEG + L_LEG) + pose.rootY;
  const leanR = pose.lean * D2R, tiltR = pose.torsoTilt * D2R;
  const shX = Math.sin(leanR + tiltR) * TORSO + side * SHOULDER_HW * 0.74;
  const shY = hipY - Math.cos(leanR + tiltR) * TORSO + 2;
  // armDraw uses the stored angles directly (left-side angles are sign-carried)
  const aU = side === 1 ? pose.rAU : pose.lAU;
  const aL = side === 1 ? pose.rAL : pose.lAL;
  const elbow = pt(shX, shY, aU, U_ARM);
  const wrist = pt(elbow.x, elbow.y, aU + aL, L_ARM);
  // the palm centre rides ~5 local units past the wrist along the hand axis
  const palm = pt(wrist.x, wrist.y, aU + aL, 5 + extra);
  return { x: cx + palm.x * scale, y: groundY + palm.y * scale };
}

// ── AUDIT C-01 — reach-contract helpers ─────────────────────────────────────
/** Screen-space shoulder position of the near arm (the same math companionArm
 *  uses to aim the IK, so sight-line geometry matches the aiming geometry). */
export function shoulderScreen(
  pose: Pose, px: number, groundY: number, rigScale: number
): { x: number; y: number } {
  const shx = px + Math.sin((pose.lean + pose.torsoTilt) * D2R) * TORSO * rigScale;
  const shy = groundY + (-(U_LEG + L_LEG) + pose.rootY - TORSO) * rigScale;
  return { x: shx, y: shy };
}
/** Maximum honest reach of the near arm in screen px: full arm extension
 *  (the armIk clamp) plus the presentation pointer's 200px when carried. */
export function armReachPx(rigScale: number, pointerPx = 0): number {
  return (U_ARM + L_ARM) * 0.985 * rigScale + pointerPx;
}
