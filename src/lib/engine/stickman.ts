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
const HEAD_R = 23.4; // 64% of the shoulder line — adult gentleman ratio (was 25.5: chibi)
const SHOULDER_HW = 30, HIP_HW = 13;

const SUIT = { lit: '#43598A', mid: '#2C3B63', dark: '#161F3A', ink: '#0E1426' };
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
  lid: number;
  smile: number;       // -0.5 .. 1
  surprise: number;
  blink: number;       // external 0..1 override
  mouth: number;       // computed talk envelope 0..1
  hand: 'open' | 'point'; // near-hand shape — point is the data-contact hand
  walkPhase: number;   // <0 = standing
  walkSpeed: number;
  look: number;        // -1..1 gaze
}

export function basePose(): Pose {
  return {
    rootY: 0, lean: 0, torsoTilt: 0, headTilt: 0, headNod: 0, shoulderTilt: 0, pelvisTilt: 0,
    rAU: 6, rAL: 8, lAU: -6, lAL: 8,
    rKnee: 4, rAnkle: 0, lKnee: 4, lAnkle: 0,
    brow: 0, lid: 0, smile: 0.18, surprise: 0, blink: 0, mouth: 0,
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
}
function bone(
  ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number,
  bow: number, o: BoneOpts
): void {
  const dx = ex - sx, dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // normal (lit side = +n toward upper-left)
  // pick normal direction pointing up-left
  let nSign = 1;
  if (nx * -1 + ny * -1 < 0) nSign = -1; // light comes from upper-left (−x, −y)
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

/** polished joint sphere */
function joint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, far = false, warm = false): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  const c1 = warm ? '#E9C766' : (far ? '#33415F' : '#4E6390');
  g.addColorStop(0, c1);
  g.addColorStop(0.7, far ? '#1B2540' : '#26304F');
  g.addColorStop(1, '#101828');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.36, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244,229,191,0.4)';
    ctx.fill();
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
  { name: 'present',   rAU: 42, rAL: 22, lAU: -14, lAL: 14, lean: 1.5, torsoTilt: 1, shoulderTilt: 2, headTilt: 1.5, brow: 0.2, smile: 0.3 },
  { name: 'explain',   rAU: 30, rAL: 44, lAU: -10, lAL: 26, lean: 1, torsoTilt: 2.5, shoulderTilt: 3, headTilt: 2, brow: 0.1, smile: 0.22 },
  { name: 'open',      rAU: 26, rAL: 18, lAU: -26, lAL: -16, lean: 0.5, torsoTilt: 0.5, shoulderTilt: 0, headTilt: 0, brow: 0.35, smile: 0.42 },
  { name: 'count',     rAU: 52, rAL: 66, lAU: -8, lAL: 10, lean: 2, torsoTilt: 2, shoulderTilt: 4, headTilt: 2.5, brow: 0.15, smile: 0.2 },
  { name: 'weigh',     rAU: 34, rAL: 30, lAU: -34, lAL: 28, lean: 0.5, torsoTilt: 1.5, shoulderTilt: 1, headTilt: -1.5, brow: 0.05, smile: 0.15 },
  { name: 'chin',      rAU: 64, rAL: 118, lAU: -6, lAL: 8, lean: -1, torsoTilt: 3, shoulderTilt: 2, headTilt: 4, brow: -0.15, smile: 0.1 },
  { name: 'rest',      rAU: 8, rAL: 10, lAU: -8, lAL: 10, lean: 0, torsoTilt: 0.5, shoulderTilt: 0, headTilt: 0, brow: 0, smile: 0.2 },
  { name: 'sweep',     rAU: 60, rAL: 34, lAU: -30, lAL: -34, lean: 2.5, torsoTilt: 1, shoulderTilt: 3, headTilt: 2, brow: 0.3, smile: 0.3 },
];

const STOPWORDS = new Set(['the', 'and', 'a', 'an', 'of', 'to', 'in', 'is', 'it', 'that', 'you', 'your', 'for', 'on', 'with', 'as', 'are', 'this', 'but', 'not', 'at', 'be', 'we', 'so', 'if', 'one', 'what']);

/**
 * applyMood — the face is an instrument keyed to the narration (D6).
 * Maps the script's voStyle to a resting expression: 'reveal' opens the face,
 * 'urgent' narrows it, 'calm'/'neutral' quiet the grin to a professional rest.
 * Called by host scenes AFTER poseAt, BEFORE gesture overrides.
 */
export function applyMood(p: Pose, voStyle?: string): void {
  switch (voStyle) {
    case 'reveal':
      p.brow = 0.55; p.lid = 0.12; p.smile = 0.02; p.surprise = 0.14;
      break;
    case 'urgent':
      p.brow = -0.45; p.lid = 0.2; p.smile = -0.14; p.lean += 1.2;
      break;
    case 'quote':
      p.brow = 0.16; p.lid = 0.1; p.smile = 0.08; p.look = 0.45;
      break;
    case 'calm':
      p.brow = 0.04; p.lid = 0.06; p.smile = 0.05;
      break;
    default: // neutral — quiet, professional rest; the grin is gone
      p.brow = 0.02; p.lid = 0.04; p.smile = 0.07;
      break;
  }
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

/**
 * poseAt — the life system. Pure function of (sentenceId, sentenceT, wordTimes, t).
 * Gestures spring between on sentence boundaries; word accents strike the right
 * forearm; idle breath/weight always runs underneath.
 */
export function poseAt(
  sentenceId: string, sentenceT: number, t: number,
  wordTimes: number[], wordTexts: string[],
  prevSentenceId?: string
): Pose {
  const p = basePose();
  const h = sentenceHash(sentenceId);
  const g = GESTURES[Math.floor(h * GESTURES.length) % GESTURES.length];
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
  p.headTilt = sp(gPrev.headTilt, g.headTilt);
  p.brow = g.brow;
  p.smile = g.smile;

  // anticipation — the channels counter-move first, then commit (D4 windup)
  const antBell = st < 140 ? Math.sin((st / 140) * Math.PI) : 0;
  const antic = (to: number, from: number, mag = 6) =>
    -Math.sign(to - from) * Math.min(mag, Math.abs(to - from) * 0.35) * antBell;
  p.rAU += antic(g.rAU, gPrev.rAU);
  p.rAL += antic(g.rAL, gPrev.rAL, 9);
  p.lAU += antic(g.lAU, gPrev.lAU);
  p.lAL += antic(g.lAL, gPrev.lAL, 9);
  p.lean += antic(g.lean, gPrev.lean, 3);
  p.shoulderTilt += antic(g.shoulderTilt, gPrev.shoulderTilt, 4);

  // word accent strikes the right forearm (and counter-leans the torso)
  const acc = accentEnv(t, wordTimes, wordTexts);
  p.rAL += acc * 26;
  p.rAU += acc * 10;
  p.lean += acc * 2.2;
  p.shoulderTilt += acc * 4;
  p.headNod = Math.max(0, acc * 0.35);
  // the face leads the strike — brows lift on content words, lids narrow
  p.brow += acc * 0.5;
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

  // blink cycle
  const bt = (t + (h * 700) % 900) % 4300;
  let blink = 0;
  if (bt < 150) {
    if (bt < 60) blink = 0.5 * (1 - Math.cos((bt / 60) * Math.PI));
    else if (bt < 90) blink = 1;
    else blink = 0.5 * (1 + Math.cos(((bt - 90) / 60) * Math.PI));
  }
  p.blink = Math.max(p.blink, blink);
  // occasional glance
  p.look = Math.sin(t / 7400 + h * 6.2) * 0.35;

  p.mouth = talkAt(t, wordTimes);
  return p;
}

/** smooth walk cycle — pose for a walk phase 0..1.
 * Anatomy: support leg straight through stance (sp 0.25–0.75), deep knee flexion
 * mid-swing, pelvis high at mid-stance and low at double support (D5). */
export function walkPose(phase: number, speed: number): Pose {
  const p = basePose();
  const ph = phase % 1;
  const pp = ph * Math.PI * 2;
  const s = Math.sin(pp);
  const s2 = Math.sin(pp + Math.PI); // other leg
  // arm carriage: swing with the stride, elbows easing as the arm passes the body
  p.rAU = 8 + s * 24 * speed;
  p.rAL = 14 + Math.max(0, -s) * 16 * speed;
  p.lAU = -8 + s2 * 24 * speed;
  p.lAL = 14 + Math.max(0, -s2) * 16 * speed;
  // (legs are driven from walkPhase inside legDraw — same phase, same source of truth)
  p.rKnee = Math.max(0, Math.cos(pp)) * 44 * speed + 5;
  p.lKnee = Math.max(0, -Math.cos(pp)) * 44 * speed + 5;
  p.rAnkle = 0; p.lAnkle = 0;
  // pelvis height: LOW at double support (ph .25/.75), HIGH at mid-stance (ph 0/.5)
  p.rootY = -6 * (0.5 + 0.5 * Math.cos(pp * 2)) * speed;
  p.lean = 1.5 * speed;
  p.torsoTilt = 1.5 * speed;
  p.shoulderTilt = -s * 4 * speed;
  p.pelvisTilt = s * 3 * speed;
  p.walkPhase = ph;
  p.walkSpeed = speed;
  p.headTilt = 0.5 * speed;
  p.smile = 0.2;
  return p;
}

// ── face ─────────────────────────────────────────────────────────────────────
function drawFace(
  ctx: CanvasRenderingContext2D, hx: number, hy: number, tiltDeg: number,
  p: Pose, t: number, faceScale: number, wordTexts: string[], wordTimes: number[], beatT: number, look: number
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tiltDeg * D2R);
  const fs = faceScale;
  ctx.scale(fs, fs);

  const R = HEAD_R;
  // head fill with skin gradient + rim shading
  const g = ctx.createRadialGradient(-R * 0.45, -R * 0.5, R * 0.2, 0, 0, R * 1.45);
  g.addColorStop(0, SKIN.lit);
  g.addColorStop(0.55, hexLerp(SKIN.lit, SKIN.dark, 0.4));
  g.addColorStop(1, SKIN.dark);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.86, R, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // jaw shade (one-light rule)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.86, R, 0, 0, Math.PI * 2);
  ctx.clip();
  const sh = ctx.createLinearGradient(0, R * 0.1, 0, R);
  sh.addColorStop(0, 'rgba(120,95,70,0)');
  sh.addColorStop(1, rgba('#7A5F46', 0.28));
  ctx.fillStyle = sh;
  ctx.fillRect(-R, -R, R * 2, R * 2.4);
  ctx.restore();

  // hair — swept-back silver cap with a subtle quiff
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.86, R, 0, 0, Math.PI * 2);
  ctx.clip();
  const hg = ctx.createLinearGradient(0, -R * 1.1, 0, -R * 0.1);
  hg.addColorStop(0, HAIR.lit);
  hg.addColorStop(1, HAIR.dark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(-R * 0.92, R * 0.05);
  ctx.quadraticCurveTo(-R * 1.02, -R * 0.85, -R * 0.1, -R * 1.04);
  ctx.quadraticCurveTo(R * 0.5, -R * 1.12, R * 0.9, -R * 0.55);
  ctx.quadraticCurveTo(R * 0.98, -R * 0.1, R * 0.86, R * 0.18);
  ctx.quadraticCurveTo(R * 0.4, -R * 0.28, R * 0.1, -R * 0.34);
  ctx.quadraticCurveTo(-R * 0.5, -R * 0.42, -R * 0.92, R * 0.05);
  ctx.closePath();
  ctx.fill();
  // silver strand highlights
  ctx.strokeStyle = rgba('#D7DEEA', 0.4);
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) {
    const ox = -R * 0.55 + i * R * 0.34;
    ctx.beginPath();
    ctx.moveTo(ox, -R * 0.14);
    ctx.quadraticCurveTo(ox + R * 0.1, -R * 0.62, ox + R * 0.28, -R * 0.9);
    ctx.stroke();
  }
  ctx.restore();

  // ears
  ctx.fillStyle = SKIN.deep;
  ctx.beginPath(); ctx.ellipse(-R * 0.82, R * 0.1, R * 0.14, R * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(R * 0.82, R * 0.1, R * 0.14, R * 0.2, 0, 0, Math.PI * 2); ctx.fill();

  const eyeY = -R * 0.18;
  const eyeX = R * 0.36;
  const lid = clamp01(p.lid + p.blink);
  const surprise = p.surprise;

  // brows
  const browLift = p.brow * 5.2;
  ctx.strokeStyle = rgba('#4E5A70', 0.95);
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * (eyeX - 6.5), eyeY - 9.5 - browLift * s * 0.4 + (p.brow < 0 ? p.brow * 2.5 : 0));
    ctx.quadraticCurveTo(s * eyeX, eyeY - 12.5 - browLift, s * (eyeX + 6.5), eyeY - 9.2 - browLift * s * 0.4);
    ctx.stroke();
  }

  // eyes — confident, subtle iris, glint
  const gaze = look * 2.6;
  for (const s of [-1, 1]) {
    const ex = s * eyeX + gaze * 0.6;
    const openH = R * 0.155 * (1 - lid * 0.92) * (1 + surprise * 0.5);
    // eye white
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, R * 0.165, Math.max(0.6, openH), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F4F2EC';
    ctx.fill();
    if (lid < 0.85) {
      // iris + pupil
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
    // lid line
    if (lid > 0.08) {
      ctx.beginPath();
      ctx.moveTo(ex - R * 0.16, eyeY);
      ctx.quadraticCurveTo(ex, eyeY + openH * 0.8, ex + R * 0.16, eyeY);
      ctx.strokeStyle = 'rgba(70,60,48,0.7)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  // nose — a quiet shade + bridge line
  ctx.strokeStyle = rgba('#8A7357', 0.55);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, eyeY + 3);
  ctx.quadraticCurveTo(1.8, eyeY + 9, 0.5, eyeY + 12);
  ctx.stroke();

  // mouth — viseme-driven, soft shapes
  const talk = p.mouth;
  const v = visemeAt(beatT, wordTimes, wordTexts);
  const mx = 0, my = R * 0.52;
  const smile = p.smile;
  ctx.save();
  if (talk > 0.14 && v !== 'X') {
    let mw = R * 0.42, mh = R * 0.30 * talk, round = 1;
    if (v === 'M') { mw = R * 0.24; mh = R * 0.05; }
    else if (v === 'F') { mw = R * 0.34; mh = R * 0.09; round = 0.2; }
    else if (v === 'E') { mw = R * 0.52; mh = R * 0.14 * talk + 1.5; }
    else if (v === 'O') { mw = R * 0.30; mh = R * 0.36 * talk; }
    else if (v === 'L') { mw = R * 0.36; mh = R * 0.20 * talk; }
    else if (v === 'S') { mw = R * 0.44; mh = R * 0.16 * talk; }
    ctx.beginPath();
    if (round > 0.5) ctx.ellipse(mx, my, mw, Math.max(1.2, mh), 0, 0, Math.PI * 2);
    else ctx.ellipse(mx, my, mw, Math.max(1.2, mh), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4A2E28';
    ctx.fill();
    if (mh > R * 0.16) {
      // teeth bar + cavity depth
      ctx.save();
      ctx.beginPath(); ctx.ellipse(mx, my, mw, mh, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(240,232,220,0.85)';
      ctx.fillRect(mx - mw, my - mh, mw * 2, mh * 0.7);
      ctx.fillStyle = 'rgba(120,40,40,0.35)';
      ctx.beginPath(); ctx.ellipse(mx, my + mh * 0.7, mw * 0.7, mh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else {
    // resting expression: smile arc
    const k = smile;
    ctx.beginPath();
    ctx.moveTo(-R * 0.30, my - 2);
    ctx.quadraticCurveTo(0, my + 4 + k * 5.5, R * 0.30, my - 2 - k * 1.5);
    ctx.strokeStyle = 'rgba(74,46,40,0.85)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.stroke();
    if (k > 0.25) {
      ctx.beginPath();
      ctx.moveTo(-R * 0.22, my - 1);
      ctx.quadraticCurveTo(0, my + 2 + k * 3.5, R * 0.22, my - 1 - k);
      ctx.strokeStyle = 'rgba(74,46,40,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  ctx.restore();

  // glasses — slim gold-rimmed rectangles (the premium tell)
  const lensW = R * 0.36, lensH = R * 0.29;
  ctx.strokeStyle = rgba(PALETTE.gold, 0.8);
  ctx.lineWidth = 1.8;
  for (const s of [-1, 1]) {
    const ex = s * eyeX + gaze * 0.6;
    roundRectPath(ctx, ex - lensW / 2, eyeY - lensH / 2, lensW, lensH, lensH * 0.42);
    ctx.stroke();
    // subtle lens glass
    ctx.fillStyle = 'rgba(210,225,255,0.04)';
    ctx.fill();
  }
  // bridge + temples
  ctx.beginPath();
  ctx.moveTo(-eyeX + lensW / 2 + gaze * 0.6, eyeY - 1);
  ctx.quadraticCurveTo(gaze * 0.6, eyeY - 4, eyeX - lensW / 2 + gaze * 0.6, eyeY - 1);
  ctx.strokeStyle = rgba(PALETTE.gold, 0.75);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * (eyeX + lensW / 2) + gaze * 0.6, eyeY - 1);
    ctx.lineTo(s * (R * 0.84), eyeY - 2);
    ctx.strokeStyle = rgba(PALETTE.gold, 0.6);
    ctx.lineWidth = 1.5;
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
export function groundShadow(ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale: number): void {
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, scale);
  // tight contact shadow (D2): dark core under the feet, fast falloff —
  // reads as contact, not as a hover-glow
  const g = ctx.createRadialGradient(0, 2, 2, 0, 2, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.26)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.ellipse(-6, 5, 62, 10.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** mirror reflection — 3 alpha bands fading into the floor */
export function drawReflection(
  ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale: number,
  p: Pose, t: number, seed: number
): void {
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, -scale * 0.96);
  ctx.globalAlpha = 0.085;
  // simplified silhouette: legs + torso + head, flat fills
  const hipY = -U_LEG - L_LEG + p.rootY;
  const leanR = p.lean * D2R;
  const neckX = Math.sin(leanR) * TORSO, neckY = hipY - Math.cos(leanR) * TORSO;
  ctx.fillStyle = '#1B2743';
  // torso
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
      const swing = Math.max(0, Math.cos(wph));
      kneeBend = swing * 44 * p.walkSpeed + (1 - swing) * 5 * p.walkSpeed + 2;
    } else {
      thighAng = s * 2.2 + (near ? p.rKnee * 0.06 : -p.lKnee * 0.06);
      kneeBend = near ? p.rKnee : p.lKnee;
    }
    const knee = pt(hipX, hipY, thighAng, U_LEG);
    const ankle = pt(knee.x, knee.y, thighAng + kneeBend, L_LEG);
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(ankle.x, ankle.y);
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#16203A';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // head
  ctx.beginPath();
  ctx.ellipse(neckX, neckY - NECK - HEAD_R * 0.9, HEAD_R * 0.82, HEAD_R, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3A4458';
  ctx.fill();
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
}

export function drawStickman(
  ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale: number,
  t: number, r: RenderOpts, seed = 0
): void {
  const p = r.pose;
  const alpha = r.alpha ?? 1;
  if (alpha <= 0.01) return;
  const rim = 0.34 + (r.rimBoost ?? 0);

  if (r.shadow !== false) groundShadow(ctx, cx, groundY, scale);
  if (r.reflection) drawReflection(ctx, cx, groundY, scale, p, t, seed);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, groundY);
  if (r.flip) ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  if (p.walkPhase >= 0) {
    // squash & stretch — volume-preserving, keyed to the stride's support events (D3).
    // Contact (double support, ph .25/.75) squashes; mid-stance push-off stretches.
    // Pivot is the origin = the feet, so the shoes stay planted on the floor.
    const contact = Math.max(0, -Math.cos(p.walkPhase * Math.PI * 4));
    const push = Math.max(0, Math.cos(p.walkPhase * Math.PI * 4));
    const sy = 1 - contact * 0.05 * p.walkSpeed + push * 0.03 * p.walkSpeed;
    ctx.scale(1 / Math.max(0.9, sy), sy);
  }

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
      // knee: deep flexion mid-swing (foot clears the floor), straight support
      // through stance — the visible weight (D5)
      const swing = Math.max(0, Math.cos(wph));
      kneeBend = swing * 44 * p.walkSpeed + (1 - swing) * 5 * p.walkSpeed + 2;
      // heel-strike → foot-flat → toe-off foot pitch (D5)
      let footPitch: number;
      if (sp < 0.25) footPitch = -5;
      else if (sp < 0.33) footPitch = lerp(-5, -11, (sp - 0.25) / 0.08);
      else if (sp < 0.5) footPitch = lerp(-11, 0, (sp - 0.33) / 0.17);
      else if (sp < 0.68) footPitch = lerp(0, 15, (sp - 0.5) / 0.18);
      else if (sp < 0.8) footPitch = lerp(15, -6, (sp - 0.68) / 0.12);
      else footPitch = lerp(-6, -5, (sp - 0.8) / 0.2);
      ankleAng = footPitch * p.walkSpeed;
    } else {
      thighAng = side * 2.2 + (near ? p.rKnee * 0.06 : -p.lKnee * 0.06);
      kneeBend = near ? p.rKnee : p.lKnee;
      ankleAng = near ? p.rAnkle : p.lAnkle;
    }
    const knee = pt(hipX, hipY, thighAng, U_LEG);
    const knee2 = pt(knee.x, knee.y, thighAng + kneeBend, L_LEG);
    const foot = pt(knee2.x, knee2.y, thighAng + kneeBend + 90 + ankleAng, 7.5);
    const W = near ? 13.6 : 11.6;
    bone(ctx, hipX, hipY, knee.x, knee.y, 2.5, { w0: W, w1: W * 0.82, lit: SUIT.lit, dark: SUIT.dark, rim: near ? rim * 0.7 : 0, far: !near });
    bone(ctx, knee.x, knee.y, knee2.x, knee2.y, 2, { w0: W * 0.8, w1: W * 0.6, lit: SUIT.lit, dark: SUIT.dark, rim: near ? rim * 0.5 : 0, far: !near });
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
    ctx.strokeStyle = 'rgba(5,8,16,0.8)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-6, 3.2);
    ctx.lineTo(15, 2.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(212,175,55,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-5.5, 1.6);
    ctx.lineTo(14.8, 1.3);
    ctx.stroke();
    ctx.restore();
    if (near) joint(ctx, knee.x, knee.y, 3.4, false);
  };
  legDraw(-1);
  legDraw(1);

  // pelvis block
  ctx.save();
  ctx.rotate(p.pelvisTilt * D2R * 0.4);
  const pg = ctx.createLinearGradient(0, hipY - 10, 0, hipY + 12);
  pg.addColorStop(0, SUIT.mid);
  pg.addColorStop(1, SUIT.dark);
  ctx.beginPath();
  ctx.ellipse(0, hipY + 2, HIP_HW + 4, 10.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.restore();

  // ── torso ──
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
  ctx.lineTo(shW * 0.86, shY + (hipY - shY) * 0.52);
  ctx.lineTo(HIP_HW + 10, hipY + 6);
  ctx.quadraticCurveTo(0, hipY + 12, -HIP_HW - 10, hipY + 6);
  ctx.lineTo(-shW * 0.86, shY + (hipY - shY) * 0.52);
  ctx.closePath();
  ctx.fillStyle = tg;
  ctx.fill();

  // rim light along the lit edge (upper-left)
  ctx.beginPath();
  ctx.moveTo(-shW * 0.92, shY + 4);
  ctx.quadraticCurveTo(-shW * 1.04, shY - 9, -shW * 0.62, shY - 13);
  ctx.quadraticCurveTo(0, shY - 17, shW * 0.62, shY - 13);
  ctx.quadraticCurveTo(shW * 0.8, shY - 11, shW * 0.9, shY - 6);
  ctx.strokeStyle = rgba('#F4E5BF', rim * 0.85);
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // shirt V + tie (premium detail)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-9, shY - 10);
  ctx.lineTo(9, shY - 10);
  ctx.lineTo(0, shY + 26);
  ctx.closePath();
  ctx.fillStyle = 'rgba(226,232,242,0.92)';
  ctx.fill();
  // tie — a 1-segment pendulum driven by torso motion (D4 follow-through):
  // the blade trails the lean and swings with the vertical bob
  const velLean = r.vel?.lean ?? 0;
  const velBob = r.vel?.rootY ?? 0;
  const tieSwayDeg = clamp(velLean * -0.9 + velBob * -0.5, -8, 8);
  ctx.save();
  ctx.translate(0, shY - 8);
  ctx.rotate(tieSwayDeg * D2R);
  ctx.beginPath();
  ctx.moveTo(-3.2, 0);
  ctx.lineTo(3.2, 0);
  ctx.lineTo(4.4, 16);
  ctx.lineTo(0, 42);
  ctx.lineTo(-4.4, 16);
  ctx.closePath();
  const tieG = ctx.createLinearGradient(0, 0, 0, 42);
  tieG.addColorStop(0, PALETTE.goldBright);
  tieG.addColorStop(1, PALETTE.goldDeep);
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
  // pocket square (his left = screen right) — INSIDE the chest line (D7),
  // with a micro-lag off the torso motion (D4 follow-through)
  ctx.save();
  ctx.translate(shW * 0.40, shY + 18);
  ctx.rotate(-0.12 + tieSwayDeg * 0.12 * D2R);
  ctx.beginPath();
  ctx.moveTo(-7, -5); ctx.lineTo(7, -5); ctx.lineTo(3, 4); ctx.lineTo(-3, 4); ctx.closePath();
  ctx.fillStyle = PALETTE.goldBright;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,20,0.6)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
  ctx.restore(); // torso detail

  // lapels — the suit's tailoring signature (D7): two long panels collar→button stance
  const lapel = (s: -1 | 1) => {
    ctx.beginPath();
    ctx.moveTo(s * 10, shY - 11);
    ctx.lineTo(s * (shW * 0.46), shY - 4);
    ctx.lineTo(s * (shW * 0.30), shY + 32);
    ctx.lineTo(s * 5.5, shY + 3);
    ctx.closePath();
    ctx.fillStyle = 'rgba(13,19,36,0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,229,191,0.22)';
    ctx.lineWidth = 0.9;
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
    bone(ctx, shX2, shY2, elbow.x, elbow.y, 2.2, { w0: W, w1: W * 0.8, lit: SUIT.lit, dark: SUIT.dark, rim: near ? rim * 0.75 : 0, far: !near });
    bone(ctx, elbow.x, elbow.y, wrist.x, wrist.y, 1.6, { w0: W * 0.78, w1: W * 0.52, lit: SUIT.lit, dark: SUIT.dark, rim: near ? rim * 0.5 : 0, far: !near });
    // shirt cuff — a band across the wrist, not a ball (D7)
    const cuffX = lerp(elbow.x, wrist.x, 0.86), cuffY = lerp(elbow.y, wrist.y, 0.86);
    const cdx = wrist.x - elbow.x, cdy = wrist.y - elbow.y;
    const cl = Math.hypot(cdx, cdy) || 1;
    const cnx = -cdy / cl, cny = cdx / cl;
    ctx.beginPath();
    ctx.moveTo(cuffX - cnx * W * 0.5, cuffY - cny * W * 0.5);
    ctx.lineTo(cuffX + cnx * W * 0.5, cuffY + cny * W * 0.5);
    ctx.strokeStyle = 'rgba(226,232,242,0.92)';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.stroke();
    if (near) {
      // gold watch
      ctx.beginPath();
      ctx.arc(lerp(elbow.x, wrist.x, 0.6), lerp(elbow.y, wrist.y, 0.6), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.goldBright;
      ctx.fill();
    }
    // hand — wrist follow-through: the hand keeps moving after the forearm
    // settles (D4), and points when the scene asks it to touch data (D1)
    const handAng = aU + aL - (near ? (r.vel?.rAL ?? 0) * 0.9 : 0);
    drawHand(ctx, wrist.x, wrist.y, handAng, near ? 7.2 : 6.2, near, p.hand ?? 'open');
    if (near) joint(ctx, elbow.x, elbow.y, 3.2, false);
    else joint(ctx, elbow.x, elbow.y, 3.0, true);
    return { wrist: { x: wrist.x, y: wrist.y } };
  };
  armDraw(-1);
  armDraw(1);

  // ── neck + head ──
  const neckX2 = shX, neckY2 = shY - 2;
  bone(ctx, neckX2, neckY2, neckX2, neckY2 - NECK, 0, { w0: 9.5, w1: 8.5, lit: hexLerp(SKIN.lit, SKIN.dark, 0.35), dark: SKIN.deep, rim: rim * 0.4 });
  const headY = neckY2 - NECK - HEAD_R * 0.92 + p.headNod * -3;
  // overlapping action (D4): the head trails the torso — it arrives ~80ms late,
  // which is the classic animator's tell that the body has weight
  const lagLean = p.lean - (r.vel?.lean ?? 0) * 1.6;
  const headX = neckX2 + Math.sin((p.headTilt + lagLean) * D2R) * 6;

  // shoulders caps
  joint(ctx, shX - shW * 0.74, shY + 2, 7.2, false);
  joint(ctx, shX + shW * 0.74, shY + 2, 7.2, false);

  drawFace(ctx, headX, headY, p.headTilt * 0.6 + lagLean * 0.4, p, t, r.faceScale ?? 1, r.wordTexts ?? [], r.wordTimes ?? [], r.beatT ?? 0, p.look);

  ctx.restore();
}

/** tailored hand (D7) — palm wedge with fanned fingers; mode 'point' (D1)
 *  extends the index so the figure can actually touch what it narrates. */
function drawHand(
  ctx: CanvasRenderingContext2D, x: number, y: number, angDeg: number,
  size: number, near: boolean, mode: 'open' | 'point' = 'open'
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angDeg + 90) * D2R);
  const g = ctx.createLinearGradient(-size, 0, size, 0);
  g.addColorStop(0, hexLerp(SKIN.lit, SKIN.dark, 0.15));
  g.addColorStop(1, SKIN.dark);
  ctx.fillStyle = g;
  // palm — rounded wedge along the arm axis
  ctx.beginPath();
  ctx.moveTo(-size * 0.55, -size * 0.5);
  ctx.quadraticCurveTo(size * 0.5, -size * 0.62, size * 0.72, -size * 0.3);
  ctx.lineTo(size * 0.72, size * 0.3);
  ctx.quadraticCurveTo(size * 0.4, size * 0.64, -size * 0.4, size * 0.56);
  ctx.quadraticCurveTo(-size * 0.72, size * 0.28, -size * 0.55, -size * 0.5);
  ctx.closePath();
  ctx.fill();
  const fk = hexLerp(SKIN.lit, SKIN.dark, near ? 0.3 : 0.55);
  ctx.strokeStyle = fk;
  ctx.lineCap = 'round';
  if (mode === 'point') {
    // index extended along the arm axis — the data-contact hand
    ctx.lineWidth = size * 0.34;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, -size * 0.16);
    ctx.quadraticCurveTo(size * 1.15, -size * 0.2, size * 1.8, -size * 0.24);
    ctx.stroke();
    // folded middle/ring/pinky knuckle + thumb
    ctx.fillStyle = fk;
    ctx.beginPath();
    ctx.ellipse(size * 0.42, size * 0.22, size * 0.3, size * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = size * 0.3;
    ctx.beginPath();
    ctx.moveTo(size * 0.08, -size * 0.34);
    ctx.quadraticCurveTo(size * 0.5, -size * 0.72, size * 0.6, -size * 0.36);
    ctx.stroke();
  } else {
    // three soft fingers fanned from the palm edge
    for (const [fy, fl] of [[-0.32, 0.85], [0.02, 0.95], [0.36, 0.8]] as const) {
      ctx.lineWidth = size * 0.3;
      ctx.beginPath();
      ctx.moveTo(size * 0.55, fy * size);
      ctx.quadraticCurveTo(size * (0.55 + fl * 0.7), fy * size * 1.3, size * (0.5 + fl), fy * size * 1.55);
      ctx.stroke();
    }
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
