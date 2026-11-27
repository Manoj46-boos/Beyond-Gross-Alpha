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
import { poseAt, drawStickman, applyMood, companionArm, companionArmL, palmPosition, shoulderScreen, armReachPx } from './stickman';
import { PALETTE, rgba } from './theme';
import { clamp01 } from './easing';

export interface FigureOpts {
  /** focal target per playing sentence (screen coords); null = idle stance */
  focal: (sentenceIdx: number) => { x: number; y: number } | null;
  mode?: 'point' | 'present';
  /** both arms join — the weigh gesture across two neighbouring elements */
  weigh?: boolean;
  /** duck: arms pulled in, lean away (the SEC-stamp beat) */
  avoid?: boolean;
  /** M-03 — impact time (group ms): the body compresses + recoils */
  impactT?: number;
  mood?: string;
  seed?: number;
  /** AUDIT R-04 — hard gesture override (a pool name); defaults to the
   *  script's beat.gestures[sentenceIdx] when the scene doesn't set one. */
  gesture?: string;
}

export function dataSceneFigure(g: SceneCtx, rigScale: number, opts: FigureOpts): void {
  const { ctx, H, t, speaking, wordTimes, wordTexts, sentenceId, prevSentenceId, sentenceT, sentenceIdx } = g;
  const groundY = H * 0.885;
  const px = g.W * 0.108;
  const sid = sentenceId ?? `data-${g.chapterIdx}`;
  // AUDIT R-04 — script-level gestures: beat.gestures[sentenceIdx] (script-data)
  // overrides the sentenceHash pick inside poseAt, so the body tracks MEANING
  // on the key sentences instead of decorating them at random.
  const scripted = opts.gesture ?? g.beat.gestures?.[sentenceIdx ?? -1];
  const pose = poseAt(sid, sentenceT ?? t, t, speaking ? wordTimes : [], speaking ? wordTexts : [], prevSentenceId, scripted);
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
    impactT: opts.impactT,
  }, opts.seed ?? 11);

  // AUDIT C-01 / FIX C11 — the sight line: when the focal target lies beyond
  // even the arm + pointer, a 2px gold line (gradient-faded toward the data)
  // runs from the fingertip and STOPS 12px short of the element, where a 4.2px
  // gold contact dot lands exactly ON the data being discussed. It fades in
  // over 200ms and dies at the sentence boundary — contact stays a drawn
  // fact, and the line never crosses INTO a card's interior.
  if (focal && !opts.avoid) {
    const POINTER_PX = 190;
    const sh = shoulderScreen(pose, px, groundY, rigScale);
    const reach = armReachPx(rigScale, POINTER_PX);
    const dist = Math.hypot(focal.x - sh.x, focal.y - sh.y);
    if (dist > reach) {
      const tip = palmPosition(pose, 1, px, groundY, rigScale, 5 + POINTER_PX / rigScale);
      const a = clamp01((sentenceT ?? 0) / 200) * (speaking ? 0.62 : 0.3);
      if (a > 0.02) {
        const dx = focal.x - tip.x, dy = focal.y - tip.y;
        const l = Math.hypot(dx, dy) || 1;
        const endX = focal.x - (dx / l) * 12;
        const endY = focal.y - (dy / l) * 12;
        ctx.save();
        const slg = ctx.createLinearGradient(tip.x, tip.y, endX, endY);
        slg.addColorStop(0, rgba(PALETTE.goldBright, a * 0.25));
        slg.addColorStop(1, rgba(PALETTE.goldBright, a));
        ctx.strokeStyle = slg;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        // the contact mark — a small gold dot exactly ON the data being discussed
        ctx.beginPath();
        ctx.arc(focal.x, focal.y, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(PALETTE.goldPale, Math.min(1, a * 1.6));
        ctx.fill();
        ctx.strokeStyle = rgba(PALETTE.goldDeep, Math.min(1, a * 1.4));
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
