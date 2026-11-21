/**
 * AURUM host scene — The Principal presenting on the midnight stage.
 * Kicker + serif editorial headline on the right two-thirds, figure staged on
 * the left third, sentence-driven gestures, optional stat plate.
 */

import { SceneCtx } from './scene-context';
import { PALETTE, rgba, setFont, wrapText, glassCard, chip, FONT_DISPLAY, FONT_UI, kicker, headline } from './theme';
import { clamp01, easeOutCubic } from './easing';
import { goldDust, godRays, bokehField, floatY } from './fx';
import { poseAt, drawStickman, walkIn } from './stickman';
import { statCard } from './charts';
import { paintStage } from './stage';

export function hostScene(g: SceneCtx): void {
  const { ctx, W, H, t, d, s, beat, speaking, wordTimes, wordTexts, sentenceId, prevSentenceId, sentenceT } = g;

  paintStage(ctx, W, H, t, { tone: 'neutral' });
  godRays(ctx, W, H, t, { alpha: 0.4, x: W * 0.80 });
  bokehField(ctx, W, H, t, 4, true, 0.8);
  goldDust(ctx, W, H, t, 11, 0.8);

  // ── headline column (right two-thirds) ──
  const headX = W * 0.44;
  const headMaxW = W * 0.47;
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

  // optional stat plate (e.g. 54% share)
  if (s.stat) {
    const ent = clamp01((t - 1400) / 700);
    if (ent > 0) {
      ctx.save();
      ctx.globalAlpha = ent;
      statCard(ctx, {
        x: headX, y: 560 + hLines.length * 96 - 90, w: Math.min(headMaxW, 700), h: 190,
        big: s.stat.big, label: s.stat.label, p: ent, tone: s.stat.tone ?? 'gold', bigSize: 72,
      });
      ctx.restore();
    }
  }

  // ── The Principal (left third) ──
  const groundY = H * 0.86;
  const rigScale = 2.6;
  let px = W * 0.215;
  let pose;
  const entrance = s.entrance;
  if (entrance === 'walk' && t < (s.walkMs ?? 1600)) {
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
    // gesture override from script props (present/leanIn/open/etc.)
    if (s.gesture === 'leanIn') { pose.lean += 3; pose.torsoTilt += 2; pose.rAU += 14; pose.rAL += 10; }
    if (s.gesture === 'present') { pose.rAU = 44; pose.rAL = 24; }
    if (s.gesture === 'open') { pose.rAU = 24; pose.rAL = 16; pose.lAU = -24; pose.lAL = -14; }
    if (s.gesture === 'count') { pose.rAU = 52; pose.rAL = 66; }
    // gaze toward the headline when it first appears
    if (t < 2400) pose.look = Math.min(0.5, (2400 - t) / 2400);
  }

  drawStickman(ctx, px + floatY(t, 2, 3, 5200), groundY, rigScale, t, {
    pose,
    wordTimes: speaking ? wordTimes : [],
    wordTexts: speaking ? wordTexts : [],
    beatT: g.beatT,
    faceScale: 1.06,
    reflection: true,
    rimBoost: 0.06,
  }, 3);

  void beat; void d;
  void easeOutCubic;
}
