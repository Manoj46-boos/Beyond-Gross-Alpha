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
import { PALETTE, rgba, setFont, wrapText, glassCard, roundRect, drawAlphaGlyph, chip, FONT_DISPLAY, FONT_UI, kicker, headline } from './theme';
import { clamp, clamp01, easeOutCubic, easeInOutSine } from './easing';
import { goldDust, godRays, bokehField, floatY, impactRing, lightBlade } from './fx';
import { poseAt, drawStickman, walkIn, applyMood, companionArm, companionArmL, palmPosition, type Pose } from './stickman';
import { statCard } from './charts';
import { drawChapterCard } from './textfx';
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
    // D6/U2.6 — the face follows the narration's emotional register (t enables
    // the urgent blink-cycle + alternating quote gaze)
    applyMood(pose, beat.voStyle, t, g.chapterIdx);
    // gesture override from script props (present/leanIn/open/etc.)
    if (s.gesture === 'leanIn') { pose.lean += 3; pose.torsoTilt += 2; pose.rAU += 14; pose.rAL += 10; }
    if (s.gesture === 'present') { pose.rAU = 44; pose.rAL = 24; }
    if (s.gesture === 'open') { pose.rAU = 24; pose.rAL = 16; pose.lAU = -24; pose.lAL = -14; }
    if (s.gesture === 'count') { pose.rAU = 52; pose.rAL = 66; }
    // gaze toward the headline when it first appears
    if (t < 2400) pose.look = Math.min(0.5, (2400 - t) / 2400);
  }

  // ── companion contract (U3.1) — every host beat holds something that MEANS
  // something: present = palm under the plate, point = index finger 60px past
  // the number, weigh = two plates on both palms, catch = the gap bar drops
  // onto his hand. The wrists are aimed with armIk (companionArm /
  // companionArmL) and the gaze + head tilt lead to the same target.
  const comp = s.companion as
    | { kind: 'coin' | 'statement' | 'weigh' | 'gapbar'; value?: string; lines?: string[]; left?: string; right?: string }
    | undefined;
  const headX = W * 0.44;
  const headMaxW = W * 0.47;
  // stat plate anchored inside the arm's reach envelope: left edge 160px right
  // of the figure — U1.3: top at 508 (12 px above the old 520) so the plate
  // clears the caption zone with margin
  const plateX = px + 160;
  const plateY = 508;
  // S-06 — the palm aims just OUTSIDE the plate's left edge (was 14px INSIDE
  // the box): the hand presents the plate without ever entering it
  // AUDIT C-07 — the weigh carry drops 15px (y+95→y+110): the arms leave the
  // "talent-show" horizontal and settle into a natural carry angle, and the
  // plates then rest ON the palms instead of hanging off the hand corners
  const palmR = { x: plateX - 42, y: plateY + 110 };  // right palm, present height
  const palmL = { x: px - 140, y: plateY + 110 };     // left palm (the weigh pair)
  const pointTip = { x: headX + 60, y: 382 };        // pointing fingertip
  const companionOn = !walking && s.gesture !== 'leanIn' && s.gesture !== 'count';
  if (companionOn) {
    if (s.stat) {
      companionArm(pose, px, groundY, rigScale, palmR, 'present');
    } else if (comp?.kind === 'weigh') {
      companionArm(pose, px, groundY, rigScale, palmR, 'present');
      companionArmL(pose, px, groundY, rigScale, palmL, 'present');
      // AUDIT C-07 — the cradling palm: fingers curl UP under the plate edges
      // and the thumb wraps the near rim, so the plates rest IN the hands
      // instead of being stapled to their corners
      pose.hand = 'cup';
      // gaze settles between the two plates
      pose.look = clamp((palmR.x - px) / 420, -1, 1) * 0.55;
    } else if (comp?.kind === 'gapbar') {
      // catch: right palm up, square under the drop zone
      companionArm(pose, px, groundY, rigScale, { x: palmR.x + 55, y: palmR.y - 6 }, 'present');
    } else if (comp?.kind === 'coin') {
      companionArm(pose, px, groundY, rigScale, palmR, 'present');
      pose.hand = 'cup'; // S-04 — the fingers close under the token
    } else if (comp?.kind === 'statement') {
      companionArm(pose, px, groundY, rigScale, palmR, 'present');
    } else {
      companionArm(pose, px, groundY, rigScale, pointTip, 'point');
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

  // ── the room (with the horizon dimmed behind the figure and a key-light
  // pool so he separates from the background — D2 + D13)
  paintStage(ctx, W, H, t, {
    tone: 'neutral',
    horizonFade: { x: px, r: 400 }, // C-10 — wider dip so the hairline reads as depth, not a line under his feet
    keyLight: { x: px, y: groundY - 330, r: W * 0.45 },
  });
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

  // ── companion props (U3.1) — S-01: the prop painting is wrapped in a
  // closure and invoked AFTER drawStickman, so the coin, statement card, gap
  // bar and weigh plates paint OVER the figure — contact reads as contact,
  // not as a layering bug.
  const drawCompanions = () => {
  const compEnt = clamp01((t - 1300) / 600);
  if (companionOn && comp && compEnt > 0 && !s.stat) {
    ctx.save();
    ctx.globalAlpha = compEnt;
    if (comp.kind === 'coin') {
      // S-04 — the coin RESTS on the palm: anchored to the FK palm position,
      // bottom edge just above the palm centre, ±2px breathing bob, contact
      // shadow on the hand and the fingers cupped under it (hand mode 'cup')
      const ccx = palmRS.x + 2, ccy = palmRS.y - 44 + floatY(t, 3, 2, 3600);
      const spin = 0.82 + 0.18 * Math.sin(t / 1100);
      ctx.save();
      ctx.translate(ccx, ccy);
      ctx.scale(spin, 1);
      // contact shadow on the palm, under the coin
      ctx.fillStyle = 'rgba(2,4,9,0.30)';
      ctx.beginPath();
      ctx.ellipse(0, palmRS.y - ccy + 2, 27, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      const cg = ctx.createRadialGradient(-10, -12, 6, 0, 0, 38);
      cg.addColorStop(0, PALETTE.goldPale);
      cg.addColorStop(0.55, PALETTE.gold);
      cg.addColorStop(1, PALETTE.goldDeep);
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.strokeStyle = rgba('#FFF3D6', 0.75);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      drawAlphaGlyph(ctx, -9, 14, 26, rgba('#5A4512', 0.85), 3.2, 1);
      ctx.restore();
    } else if (comp.kind === 'statement') {
      // mini statement card — the answers, held above the palm
      const lines: string[] = comp.lines ?? ['answered'];
      const cw = 320, chh = 96 + lines.length * 34;
      const cx = palmRS.x + 90, cy = palmRS.y - 130 - chh / 2 + floatY(t, 5, 5, 4200);
      glassCard(ctx, cx - cw / 2, cy, cw, chh, { r: 14, goldEdge: true });
      setFont(ctx, 28, 700, FONT_UI);
      try { (ctx as any).letterSpacing = '3px'; } catch { /* noop */ }
      ctx.fillStyle = PALETTE.inkFaint;
      ctx.textAlign = 'center';
      ctx.fillText('ON FILE', cx, cy + 40);
      try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
      setFont(ctx, 28, 600, FONT_UI);
      ctx.fillStyle = PALETTE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, cx, cy + 74 + i * 34));
      ctx.textAlign = 'left';
    } else if (comp.kind === 'gapbar') {
      // S-02 — the falling gap bar drops onto HIS PALM: anchored to the FK
      // palm position, centred over it, bottom edge ON the palm centreline
      const bw = 260, bh = 48;
      const restY = palmRS.y - 4 - bh / 2;
      const dropT = g.sentenceT ?? t;
      const fall = dropT < 650 ? Math.pow(clamp01(dropT / 650), 2.2) : 1;
      const settle = dropT >= 650 && dropT < 1050 ? Math.sin(clamp01((dropT - 650) / 400) * Math.PI) * 6 : 0;
      const bx = palmRS.x - bw / 2;
      const by = restY - (1 - fall) * 250 - settle;
      // cast shadow gathering on the palm while the bar falls
      ctx.globalAlpha = compEnt * (0.12 + 0.2 * fall);
      ctx.beginPath();
      ctx.ellipse(bx + bw / 2, palmRS.y + 2, bw * 0.32 * (0.5 + 0.5 * fall), 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#04070D';
      ctx.fill();
      ctx.globalAlpha = compEnt;
      // S-02 — the empty track is a slim outline frame now (the old 5% white
      // slab extended past the hand as an unexplained gray block)
      roundRect(ctx, bx, by, bw, bh, 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const fw = bw * 0.75 * fall;
      if (fw > 8) {
        const bg = ctx.createLinearGradient(bx, 0, bx + fw, 0);
        bg.addColorStop(0, PALETTE.down);
        bg.addColorStop(1, '#F08A8D');
        roundRect(ctx, bx, by, fw, bh, 10);
        ctx.fillStyle = bg;
        ctx.fill();
        // dark cap zone + white value (the U1.2 rule — 75% rides inside)
        const capW = Math.min(fw * 0.5, 120);
        const cg2 = ctx.createLinearGradient(bx + fw - capW, 0, bx + fw, 0);
        cg2.addColorStop(0, 'rgba(10,14,26,0)');
        cg2.addColorStop(1, 'rgba(10,14,26,0.5)');
        roundRect(ctx, bx + fw - capW, by, capW, bh, 10);
        ctx.fillStyle = cg2;
        ctx.fill();
        setFont(ctx, 28, 800, FONT_DISPLAY);
        ctx.fillStyle = 'rgba(246,241,230,0.96)';
        ctx.textAlign = 'right';
        ctx.fillText(comp.value ?? '$5.1M', bx + fw - 14, by + bh / 2 + 9);
        ctx.textAlign = 'left';
      }
      if (dropT >= 640 && dropT < 900) impactRing(ctx, bx + bw * 0.75, palmRS.y, dropT - 640, 40, 60, 0.5, PALETTE.gold);
    } else if (comp.kind === 'weigh') {
      // S-03 — two plates REST on the palms (bottom edge on the palm
      // centreline, centred over the FK palm position) and the seesaw tilt is
      // raised to a visible ±0.10 rad (≈21px of edge travel at 1080p)
      const tilt = Math.sin(t / 1400) * 0.10;
      const plate = (p: { x: number; y: number }, label: string, rot: number, seed: number) => {
        ctx.save();
        // AUDIT C-07 — the plate sits ON the palm centreline (was hovering 4px
        // above it), sinking 2px into the curled fingers
        ctx.translate(p.x, p.y - 54 + floatY(t, seed, 2, 3000));
        ctx.rotate(rot);
        // contact shadow on the palm under the plate
        ctx.fillStyle = 'rgba(2,4,9,0.24)';
        ctx.beginPath();
        ctx.ellipse(0, 52, 62, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        glassCard(ctx, -105, -52, 210, 104, { r: 12, goldEdge: true });
        setFont(ctx, 28, 800, FONT_UI);
        try { (ctx as any).letterSpacing = '2px'; } catch { /* noop */ }
        ctx.fillStyle = PALETTE.ink;
        ctx.textAlign = 'center';
        wrapText(ctx, label, 170, 21, 800, FONT_UI).forEach((ln, i) => {
          ctx.fillText(ln, 0, -6 + i * 28);
        });
        try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
        ctx.textAlign = 'left';
        ctx.restore();
      };
      plate(palmRS, comp.right ?? 'EVIDENCE AGAINST', tilt, 7);
      plate(palmLS, comp.left ?? 'EVIDENCE FOR', -tilt, 2);
    }
    ctx.restore();
  }
  }; // end drawCompanions

  // S-01..S-04 — the props anchor to the hands' REAL rendered positions
  // (forward kinematics), so "resting on the palm" is exact
  const palmRS = palmPosition(pose, 1, px, groundY, rigScale);
  const palmLS = palmPosition(pose, -1, px, groundY, rigScale);

  // M-03 — the body ANSWERS the $5.1M catch: the bar lands at sentenceT 650,
  // so the impact envelope starts there (same time base as t = group time)
  const barLandT = comp?.kind === 'gapbar' && !walking ? t - (g.sentenceT ?? 0) + 650 : undefined;

  // ── The Principal — grounded (D2): no decorative bob, tight contact
  // shadow, true-mirror reflection
  drawStickman(ctx, px, groundY, rigScale, t, {
    pose,
    wordTimes: speaking ? wordTimes : [],
    wordTexts: speaking ? wordTexts : [],
    beatT: g.beatT,
    faceScale: 1.5, // C-02 — the head must carry the face at phone size
    reflection: true,
    rimBoost: 0.06,
    vel,
    impactT: barLandT,
  }, 3);

  // S-01 — companion props paint AFTER the figure: contact reads as contact
  drawCompanions();

  void beat; void d;
  void easeOutCubic;
}

// ── U3.2 — The Principal walks on every chapter card ────────────────────────
/** One wrapper around drawChapterCard: the card draws as before, then the
 *  figure walks in from the left with the fixed U2.5 walk (1.5s), stops
 *  centre-left, turns (flip release) and presents the chapter title with an
 *  armIk-aimed point, and exits right as the light blade crosses. Cards run
 *  4.2s (timeline.ts CHAPTER_CARD_DUR) so the choreography breathes. */
export function drawChapterWalkOn(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  tMs: number, durMs: number, index: number, title: string, totalChapters: number
): void {
  drawChapterCard(ctx, W, H, tMs, durMs, index, title, 0, totalChapters);
  const groundY = H * 0.88;
  const rigScale = 2.3;
  const homeX = W * 0.115;
  // L-08 — the exit is the most-rehearsed move in the film: it starts earlier
  // and gets a full-stride window (was compressed into ≤1500ms — the skating
  // read) so the stride cadence matches the walk-on
  const EXIT_AT = Math.max(2350, durMs - 1950);
  let px = homeX;
  let pose: Pose;
  if (tMs < 1500) {
    // walk-on from the left edge (mirrored silhouette; he turns at the stop)
    const w = walkIn(tMs, -180, homeX, 1500, rigScale, index);
    px = w.x;
    pose = w.pose;
  } else if (tMs < EXIT_AT) {
    // stopped centre-left, turned to the title, presenting it
    pose = poseAt(`chapter-${index}`, tMs - 1500, tMs, [], []);
    applyMood(pose, 'calm');
    companionArm(pose, homeX, groundY, rigScale, { x: W * 0.5, y: H * 0.42 }, 'point');
    pose.look = clamp((W * 0.5 - homeX) / 420, -1, 1);
  } else {
    // L-08 — exits right THROUGH the light blade: the blade sweeps with him
    // over the exit window, so it reads as a door he walks out of
    const exitDur = Math.max(1950, durMs - EXIT_AT);
    const w = walkIn(tMs - EXIT_AT, homeX, W + 160, exitDur, rigScale, index + 9);
    px = w.x;
    pose = w.pose;
    drawStickman(ctx, px, groundY, rigScale, tMs, {
      pose,
      flip: false,
      faceScale: 1.5,
      reflection: true,
      rimBoost: 0.06,
      vel: { lean: 0, rootY: 0, rAL: 0, rAU: 0 },
    }, 2);
    lightBlade(ctx, W, H, clamp01((tMs - EXIT_AT) / (exitDur * 0.62)));
    return;
  }
  // AUDIT C-08 — the paper turn: the mirror scale animates CONTINUOUSLY from
  // −1→1 over 120ms (a paper-turn that reads as rotation), the weight leans
  // 6° AWAY from travel as the feet plant, and the head leads through the
  // same finite-difference lag the rest of the rig uses. The old code popped
  // the flip in one frame — an identity teleport at the most-replayed moment.
  const flipScale = tMs < 1500 ? -1 : tMs < 1620 ? Math.sign(-1 + 2 * easeInOutSine((tMs - 1500) / 120)) * Math.max(0.08, Math.abs(-1 + 2 * easeInOutSine((tMs - 1500) / 120))) : 1;
  let velTurn = { lean: 0, rootY: 0, rAL: 0, rAU: 0 };
  if (tMs >= 1440 && tMs < 1740) {
    const age = tMs - 1440;
    const overshoot = Math.sin(clamp01(age / 120) * Math.PI / 2) * Math.exp(-Math.max(0, age - 120) / 130);
    pose.lean += -6 * overshoot; // away from travel (+x) — plant and settle
  }
  if (tMs >= 1500 && tMs < 1800) {
    const pPrev = poseAt(`chapter-${index}`, Math.max(0, tMs - 90 - 1500), tMs - 90, [], []);
    velTurn = { lean: pose.lean - pPrev.lean, rootY: 0, rAL: 0, rAU: 0 };
  }
  drawStickman(ctx, px, groundY, rigScale, tMs, {
    pose,
    flipScale,
    faceScale: 1.5, // C-02 — same mobile face floor as the host scenes
    reflection: true,
    rimBoost: 0.06,
    vel: velTurn,
  }, 2);
}
