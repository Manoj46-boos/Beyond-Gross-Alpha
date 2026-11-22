/**
 * S-05 — The Principal inside the data scenes (report §6.4, the retention
 * lever). The companion contract (companionArm/companionArmL) extended to the
 * highest-retention chart beats: the figure stands in the left margin, the
 * near hand is IK-aimed at the chart's focal element for the CURRENT sentence
 * (D17 sentenceIdx machinery), gaze + head lead to the same target, and the
 * figure paints AFTER the chart so the pointing hand rides over the data.
 *
 * Per-scene wiring: each data scene calls dataSceneFigure(g, rigScale, opts)
 * as its LAST draw step, passing a focal(sentenceIdx) closure built from its
 * own layout constants, and shifts its chart zone right of the figure margin
 * (figure span ≈ x 90..330 at rigScale 1.42).
 */
import { SceneCtx } from './scene-context';
import { poseAt, drawStickman, applyMood, companionArm, companionArmL } from './stickman';

export interface FigureOpts {
  /** focal target per playing sentence (screen coords); null = idle stance */
  focal: (sentenceIdx: number) => { x: number; y: number } | null;
  mode?: 'point' | 'present';
  /** both arms join — the weigh gesture across two neighbouring elements */
  weigh?: boolean;
  /** duck: arms pulled in, lean away (the SEC-stamp beat) */
  avoid?: boolean;
  mood?: string;
  seed?: number;
}

export function dataSceneFigure(g: SceneCtx, rigScale: number, opts: FigureOpts): void {
  const { ctx, H, t, speaking, wordTimes, wordTexts, sentenceId, prevSentenceId, sentenceT, sentenceIdx } = g;
  const groundY = H * 0.885;
  const px = g.W * 0.108;
  const sid = sentenceId ?? `data-${g.chapterIdx}`;
  const pose = poseAt(sid, sentenceT ?? t, t, speaking ? wordTimes : [], speaking ? wordTexts : [], prevSentenceId);
  applyMood(pose, opts.mood ?? 'calm', t, g.chapterIdx);

  const si = sentenceIdx ?? 0;
  const focal = opts.focal(si);
  if (opts.avoid) {
    // duck out of the way — arms in, weight back (the incoming SEC stamp)
    pose.lean -= 2.6; pose.torsoTilt -= 1.6; pose.rAU -= 12; pose.lAU += 10;
  } else if (focal) {
    companionArm(pose, px, groundY, rigScale, focal, opts.mode ?? 'point');
    if (opts.weigh) {
      const next = opts.focal(si + 1) ?? focal;
      companionArmL(pose, px, groundY, rigScale, { x: Math.max(px - 175, next.x - 260), y: next.y }, 'present');
    }
  }

  // D4 — finite-difference velocities drive head lag / tie / wrists
  const posePrev = poseAt(sid, sentenceT ?? t, t - 90, speaking ? wordTimes : [], speaking ? wordTexts : [], prevSentenceId);
  const vel = {
    lean: pose.lean - posePrev.lean,
    rootY: pose.rootY - posePrev.rootY,
    rAL: pose.rAL - posePrev.rAL,
    rAU: pose.rAU - posePrev.rAU,
  };

  drawStickman(ctx, px, groundY, rigScale, t, {
    pose,
    faceScale: 1.5, // C-02 — same mobile face floor as the host scenes
    reflection: true,
    rimBoost: 0.05,
    vel,
  }, opts.seed ?? 11);
}
