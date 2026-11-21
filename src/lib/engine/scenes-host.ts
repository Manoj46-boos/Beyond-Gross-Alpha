/**
 * AURUM host scene — The Principal presenting on the midnight stage.
 * Kicker + serif editorial headline on the right two-thirds, figure staged on
 * the left third, sentence-driven gestures, stat plate companion.
 *
 * D1 (companion contract): the near hand is IK-aimed at the scene's prop —
 * the stat plate (palm-present touch) or the headline block (point) — and the
 * gaze leads it there. The figure now interacts with what it narrates.
 * D2 (grounding): no decorative hover; contact shadow; horizon hairline dims
 * behind the figure instead of reading as a line he straddles.
 * D4 (follow-through): finite-difference velocities drive head lag, tie
 * pendulum, pocket-square micro-lag and wrist follow-through.
 * D6 (expression): the face is keyed to the beat's voStyle — no fixed grin.
 */
import { SceneCtx } from './scene-context';
import { PALETTE, rgba, setFont, wrapText, glassCard, chip, FONT_DISPLAY, FONT_UI, kicker, headline } from './theme';
import { clamp01, easeOutCubic } from './easing';
import { goldDust, godRays, bokehField } from './fx';
import { poseAt, drawStickman, walkIn, applyMood, companionArm } from './stickman';
import { statCard } from './charts';
import { paintStage } from './stage';

export function hostScene(g: SceneCtx): void {
  const { ctx, W, H, t, d, s, beat, speaking, wordTimes, wordTexts, sentenceId, prevSentenceId, sentenceT } = g;

  // ── The Principal (left third) — pose math runs BEFORE painting so the
  // stage can dim the horizon behind his final position (D2)
  const groundY = H * 0.86;
  const rigScale = 2.6;
  let px = W * 0.215;
  let pose;
  const entrance = s.entrance;
  const walking = entrance === 'walk' && t < (s.walkMs ?? 1600);
  if (walking) {
    const w = walkIn(t, -140, px, s.walkMs ?? 1600, rigScale, 3);
    px = w.x;
    pose = w.pose;
  } else {
    pose = poseAt(
      sentenceId ?? `idle-${g.chapterIdx}`,
      sentenceT ?? t,
      t,
      speaking ? wordTimes : [],
      speaking ? wordTexts : [],
      prevSentenceId
    );
    // D6 — the face follows the narration's emotional register
    applyMood(pose, beat.voStyle);
    // gesture override from script props (present/leanIn/open/etc.)
    if (s.gesture === 'leanIn') { pose.lean += 3; pose.torsoTilt += 2; pose.rAU += 14; pose.rAL += 10; }
    if (s.gesture === 'present') { pose.rAU = 44; pose.rAL = 24; }
    if (s.gesture === 'open') { pose.rAU = 24; pose.rAL = 16; pose.lAU = -24; pose.lAL = -14; }
    if (s.gesture === 'count') { pose.rAU = 52; pose.rAL = 66; }
    // gaze toward the headline when it first appears
    if (t < 2400) pose.look = Math.min(0.5, (2400 - t) / 2400);
  }

  // ── companion targets (D1) — where the hand meets the data ──
  const headX = W * 0.44;
  const headMaxW = W * 0.47;
  // stat plate anchored inside the arm's reach envelope: left edge 160px right
  // of the figure, top at 520 — the palm touches its left edge at hand height
  const plateX = px + 160;
  const plateY = 520;
  const companionOn = !walking && s.gesture !== 'leanIn' && s.gesture !== 'count';
  if (companionOn) {
    if (s.stat) {
      companionArm(pose, px, groundY, rigScale, { x: plateX + 14, y: plateY + 95 }, 'present');
    } else {
      companionArm(pose, px, groundY, rigScale, { x: headX + 60, y: 382 }, 'point');
    }
  }

  // D4 — finite-difference velocities (pose(t) − pose(t−90)) drive the
  // follow-through systems inside drawStickman
  const posePrev = poseAt(
    sentenceId ?? `idle-${g.chapterIdx}`,
    sentenceT ?? t,
    t - 90,
    speaking ? wordTimes : [],
    speaking ? wordTexts : [],
    prevSentenceId
  );
  const vel = {
    lean: pose.lean - posePrev.lean,
    rootY: pose.rootY - posePrev.rootY,
    rAL: pose.rAL - posePrev.rAL,
    rAU: pose.rAU - posePrev.rAU,
  };

  // ── the room (with the horizon dimmed behind the figure) ──
  paintStage(ctx, W, H, t, { tone: 'neutral', horizonFade: { x: px, r: 320 } });
  godRays(ctx, W, H, t, { alpha: 0.4, x: W * 0.80 });
  bokehField(ctx, W, H, t, 4, true, 0.8);
  goldDust(ctx, W, H, t, 11, 0.8);

  // ── headline column (right two-thirds) ──
  const headEnt = clamp01((t - 250) / 700);
  kicker(ctx, s.kicker ?? 'After-Tax Returns', headX, 262, headEnt);
  ctx.save();
  ctx.globalAlpha = headEnt;
  const hLines = wrapText(ctx, s.headline ?? 'After-tax returns.', headMaxW, 78, 700, FONT_DISPLAY);
  setFont(ctx, 78, 700, FONT_DISPLAY);
  hLines.forEach((ln, i) => {
    const a = clamp01((t - 380 - i * 180) / 520);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(ln, headX, 356 + i * 96);
    ctx.restore();
  });
  ctx.restore();

  // sub line — the speaking emphasis: a thin gold rule + beat's sub text
  const sub = s.sub ?? '';
  if (sub) {
    const subA = clamp01((t - 900) / 500);
    ctx.save();
    ctx.globalAlpha = subA;
    setFont(ctx, 30, 500, FONT_UI);
    ctx.fillStyle = PALETTE.inkMuted;
    wrapText(ctx, sub, headMaxW, 30, 500, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, headX, 400 + hLines.length * 96 + 40 + i * 42);
    });
    ctx.restore();
  }

  // stat plate — the companion prop (D1): anchored to the figure's hand
  if (s.stat) {
    const ent = clamp01((t - 1400) / 700);
    if (ent > 0) {
      ctx.save();
      ctx.globalAlpha = ent;
      statCard(ctx, {
        x: plateX, y: plateY, w: Math.min(headMaxW, 700), h: 190,
        big: s.stat.big, label: s.stat.label, p: ent, tone: s.stat.tone ?? 'gold', bigSize: 72,
      });
      ctx.restore();
    }
  }

  // ── The Principal — grounded (D2): no decorative bob, tight contact
  // shadow, true-mirror reflection
  drawStickman(ctx, px, groundY, rigScale, t, {
    pose,
    wordTimes: speaking ? wordTimes : [],
    wordTexts: speaking ? wordTexts : [],
    beatT: g.beatT,
    faceScale: 1.22,
    reflection: true,
    rimBoost: 0.06,
    vel,
  }, 3);

  void beat; void d;
  void easeOutCubic;
}
