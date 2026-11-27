/**
 * AURUM director — drawFrame: the exact frame composition.
 * stage → camera → scene → dust/bloom → part cards → captions → source chips →
 * watermark → progress → vignette/grain → fades.
 */

import { Timeline, beatAt, chapterAt } from './timeline';
import { BeatSpec } from './script-data';
import { CaptionLine, drawCaptions, drawSourceChip, drawWatermark, drawProgressBar, CaptionStyle } from './textfx';
import { PALETTE, rgba, setFont } from './theme';
import { clamp01, easeOutCubic, easeInOutSine, drift } from './easing';
import { paintStage, toneOf } from './stage';
import { setCamState, goldDust, bokehField, drawGrain, vignette, dofPass, lightBlade, scalePunch, softBloom, godRays } from './fx';
import { SceneCtx, SceneDrawer } from './scene-context';
import { splitSentences } from './easing';
import { SCRIPT } from './script-data';

import { coldOpenScene, gapBarsScene, titleCardScene, rehookScene, statementScene, turnCardScene, quietBeatScene, policyRiskScene, finalLinesScene, circleBackScene, stampCardScene } from './scenes-open';
import { hostScene, drawChapterWalkOn } from './scenes-host';
import { brokerageStatementScene, feeChipsScene, memoCardScene, taxRatesScene, turnoverBarsScene, growthCurvesScene, characterMatrixScene, signatureCurveScene, benchmarkBarScene } from './scenes-drag';
import { locationMapScene, trapTileScene, iraSplitScene, bpsCompareScene, tlhMechanicScene, washSaleScene, waterfallScene, eraBarsScene, vendorCompareScene, wealthfrontCaseScene, decayCurveScene, secCaseScene } from './scenes-tlh';
import { plumbingScene, heartbeatScene, distribBarsScene, taxManagedScene, pitchDeckScene, diMosaicScene, diDecayScene, exchangeFundScene, longShortScene, elmVerdictScene } from './scenes-wrapper';
import { stepUpScene, hierarchyScene, fiveQuestionsScene, endScreenScene } from './scenes-final';

export const SCENES: Record<string, SceneDrawer> = {
  coldOpen: coldOpenScene,
  gapBars: gapBarsScene,
  titleCard: titleCardScene,
  rehook: rehookScene,
  statement: statementScene,
  turnCard: turnCardScene,
  quietBeat: quietBeatScene,
  policyRisk: policyRiskScene,
  finalLines: finalLinesScene,
  circleBack: circleBackScene,
  stampCard: stampCardScene,
  host: hostScene,
  brokerageStatement: brokerageStatementScene,
  feeChips: feeChipsScene,
  memoCard: memoCardScene,
  taxRates: taxRatesScene,
  turnoverBars: turnoverBarsScene,
  growthCurves: growthCurvesScene,
  characterMatrix: characterMatrixScene,
  signatureCurve: signatureCurveScene,
  benchmarkBar: benchmarkBarScene,
  locationMap: locationMapScene,
  trapTile: trapTileScene,
  iraSplit: iraSplitScene,
  bpsCompare: bpsCompareScene,
  tlhMechanic: tlhMechanicScene,
  washSale: washSaleScene,
  waterfall: waterfallScene,
  eraBars: eraBarsScene,
  vendorCompare: vendorCompareScene,
  wealthfrontCase: wealthfrontCaseScene,
  decayCurve: decayCurveScene,
  secCase: secCaseScene,
  plumbing: plumbingScene,
  heartbeat: heartbeatScene,
  distribBars: distribBarsScene,
  taxManaged: taxManagedScene,
  pitchDeck: pitchDeckScene,
  diMosaic: diMosaicScene,
  diDecay: diDecayScene,
  exchangeFund: exchangeFundScene,
  longShort: longShortScene,
  elmVerdict: elmVerdictScene,
  stepUp: stepUpScene,
  hierarchy: hierarchyScene,
  fiveQuestions: fiveQuestionsScene,
  endScreen: endScreenScene,
};

export interface RenderOptions {
  captions: 'karaoke' | 'simple' | 'off';
  channelName: string;
  nextVideoTitle: string;
  watermark: boolean;
  progressBar: boolean;
}

// ── scene groups (consecutive beats sharing sceneKey) ────────────────────────
interface Group { startMs: number; endMs: number; beatIdx: number; sceneKey: string; }
let groupsCache: { tl: Timeline; groups: Group[] } | null = null;
function computeGroups(tl: Timeline): Group[] {
  if (groupsCache && groupsCache.tl === tl) return groupsCache.groups;
  const groups: Group[] = [];
  let i = 0;
  while (i < tl.beats.length) {
    let j = i;
    const key = tl.beats[i].beat.scene.sceneKey;
    while (j + 1 < tl.beats.length && tl.beats[j + 1].beat.scene.sceneKey === key) j++;
    groups.push({ startMs: tl.beats[i].startMs, endMs: tl.beats[j].endMs, beatIdx: i, sceneKey: key });
    i = j + 1;
  }
  groupsCache = { tl, groups };
  return groups;
}
function groupAt(groups: Group[], tMs: number): Group | null {
  for (const g of groups) {
    if (tMs >= g.startMs && tMs < g.endMs) return g;
  }
  return groups.length ? groups[groups.length - 1] : null;
}

// ── camera ───────────────────────────────────────────────────────────────────
export interface CamResult { dx: number; dy: number; scale: number; }
function cameraFor(group: Group, gt: number, d: number, chapterIdx: number): CamResult {
  const p = clamp01(gt / Math.max(1, d));
  const type = SCRIPT[chapterIdx]?.beats[group.beatIdx]?.scene?.type ?? 'host';
  const key = group.sceneKey;
  // personality by family
  let zBase = 1.0, zTarget = 0.045;
  if (type === 'statement' || type === 'finalLines' || type === 'turnCard' || type === 'policyRisk') { zBase = 0.97; zTarget = 0.06; }
  else if (type === 'coldOpen') { zBase = 1.02; zTarget = 0.07; }
  else if (type === 'host') { zBase = 1.0; zTarget = 0.035; }
  else if (type === 'secCase' || type === 'elmVerdict') { zBase = 1.0; zTarget = 0.028; }
  // D14/U4.3 — depth-aware camera: layered scenes (the figure, the room, cards)
  // keep the full personality; flat data layouts get L-09's calibrated push —
  // the old caps (0.018 zoom / ±18px) sat below the perception threshold at
  // phone size, so ~70% of the runtime paid for motion without the benefit.
  // Still NO entry whip on flat scenes; the 2.2% punch stays everywhere.
  const layered = key === 'host' || key === 'coldOpen' || key === 'endScreen' || key === 'quietBeat' || key === 'titleCard' || key === 'chapterCard';
  if (!layered) zTarget = Math.min(zTarget, 0.048);
  const scale = zBase + zTarget * easeInOutSine(p);
  const driftBase = type.startsWith('statement') || type === 'finalLines' ? 0.12 : type === 'coldOpen' ? 0.35 : 0.6;
  const dx = drift(gt, 1) * (layered ? 46 * driftBase : 34);
  const dy = drift(gt, 7) * (layered ? 26 : 15);
  // entry whip only where there is a subject to track (host/chapter cards)
  const whip = gt < 340 && layered ? (1 - easeOutCubic(gt / 340)) * 26 : 0;
  const dir = (group.beatIdx % 2 === 0 ? 1 : -1);
  return { dx: dx + whip * dir, dy, scale: Math.min(1.10, scale) };
}

// AUDIT K-01 — house-grid fallback rect for long scenes that don't declare a
// payoff rect: the whole content column, guaranteed on-frame (fit ≈ 1.12).
const DEFAULT_CLOSEUP = { x: 140, y: 210, w: 1640, h: 620 };

// ── frame ────────────────────────────────────────────────────────────────────
export function drawFrame(
  ctx: CanvasRenderingContext2D, tl: Timeline, tMs: number, opts: RenderOptions
): void {
  const W = 1920, H = 1080;
  const t = clamp01(tMs / tl.durationMs) * tl.durationMs;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = PALETTE.bg1;
  ctx.fillRect(0, 0, W, H);
  ctx.scale(W / 1920, H / 1080);

  const beat = beatAt(tl, t);
  const chapterIdx = beat ? beat.chapter : chapterAt(tl, t);
  const groups = computeGroups(tl);
  const group = groupAt(groups, t);
  const gt = group ? t - group.startMs : 0;
  const gdur = group ? group.endMs - group.startMs : 4000;
  const bt = beat ? t - beat.startMs : 0;

  // camera transform
  const cam = group ? cameraFor(group, gt, gdur, chapterIdx) : { dx: 0, dy: 0, scale: 1 };
  // M-06 — no visual state holds longer than 8 seconds (§6.4): scene groups
  // longer than 12s ALTERNATE two compositions of the same scene — wide panel
  // ↔ close on the narrated element — on a deterministic 8s cadence. The cut
  // re-uses the punch so it reads as an editorial cut, not a zoom. Layered
  // scenes (host / cards / coldOpen) already carry live motion and keep their
  // single composition.
  let camEff = cam;
  let cutPunch = 1;
  if (group && beat && gdur > 12000) {
    const sceneType = beat.beat.scene.type;
    const live = ['host', 'coldOpen', 'titleCard', 'chapterCard', 'endScreen', 'quietBeat'].includes(sceneType);
    if (!live) {
      const k = Math.floor(gt / 8000);
      if (k % 2 === 1) {
        // AUDIT K-01 — the blind close-up (scale 1.30, dx +250) mapped the
        // right-column payoffs past x=1920: the $5.1M badge, "A structural
        // moat.", the 7-year padlock, the FAJ verdict card, "Most pitches
        // can't." — the beats the script is built around — vanished for half
        // the runtime of the longest scenes. Phase 0.1: each scene DECLARES
        // the rect its payoff lives in; the close-up fits that rect (capped
        // at the old zoom) and the offset is content-bbox-clamped so the
        // payoff may never leave the frame. Scenes without a declared rect
        // get the house-grid fallback — everything stays visible.
        const statementFam = sceneType === 'statement' || sceneType === 'finalLines' || sceneType === 'turnCard' || sceneType === 'policyRisk';
        const cu = (beat.beat.scene.closeup ?? DEFAULT_CLOSEUP) as { x: number; y: number; w: number; h: number };
        // AUDIT §0.1 — the safe-area margin is the report's 120px: the rect
        // fits inside the safe frame and the content-bbox clamp holds the
        // payoff inside x ∈ [120, 1800] (the old 40px margin let close-ups
        // crowd the watermark and caption gutters).
        const m = 120;
        const fit = Math.min((W - 2 * m) / cu.w, (H - 2 * m) / cu.h);
        const s = Math.min(statementFam ? 1.22 : 1.30, Math.max(1.0, fit));
        let cdx = -(cu.x + cu.w / 2 - W / 2) * s + drift(gt, 3) * 10;
        let cdy = -(cu.y + cu.h / 2 - H / 2) * s + drift(gt, 9) * 6;
        // content-bbox clamp — the payoff rect stays on-frame even with drift
        cdx = Math.min((W - m) - W / 2 - (cu.x + cu.w - W / 2) * s, Math.max(m - W / 2 - (cu.x - W / 2) * s, cdx));
        cdy = Math.min((H - m) - H / 2 - (cu.y + cu.h - H / 2) * s, Math.max(m - H / 2 - (cu.y - H / 2) * s, cdy));
        camEff = { dx: cdx, dy: cdy, scale: s };
      }
      if (k > 0) cutPunch = scalePunch(gt - k * 8000, 240, 0.03);
    }
  }
  const punchAge = group ? t - group.startMs : 9999;
  const punch = scalePunch(punchAge, 240, 0.022) * cutPunch;
  setCamState(camEff.dx, camEff.dy, camEff.scale * punch);
  ctx.translate(W / 2 + camEff.dx, H / 2 + camEff.dy);
  ctx.scale(camEff.scale * punch, camEff.scale * punch);
  ctx.translate(-W / 2, -H / 2);

  // ── the stage room ──
  const tone = toneOf(chapterIdx);
  const type = beat ? beat.beat.scene.type : 'host';
  const isStatement = ['statement', 'finalLines', 'turnCard', 'policyRisk', 'quietBeat'].includes(type);
  const isFullCard = ['coldOpen', 'titleCard', 'chapterCard'].includes(type);
  paintStage(ctx, W, H, t, {
    tone,
    grid: isStatement ? 0.5 : 1,
    floor: !isFullCard && !isStatement && type !== 'secCase',
    sheen: 0.8, // U4.2 — the sheen sweep stays on through the statement family
  });

  // ── scene drawer ──
  if (beat && group) {
    const gBeat: BeatSpec = beat.beat;
    const s = { ...gBeat.scene };
    // speaking state + words
    const speakLocal = bt - beat.speakStartMs;
    const speaking = speakLocal >= 0 && bt < beat.speakEndMs;
    const wordTimes: number[] = [];
    const wordTexts: string[] = [];
    let sentenceId: string | undefined;
    let prevSentenceId: string | undefined;
    let sentenceT = 0;
    let prevStart = -1;
    let startedCount = 0;
    for (const sen of beat.sentences) {
      const local = sen.startMs - beat.startMs;
      if (bt >= local) {
        prevSentenceId = sentenceId;
        prevStart = sentenceId === undefined ? -1 : prevStart;
        if (sentenceId !== undefined) prevStart = local;
        sentenceId = sen.lineId;
        sentenceT = bt - local;
        startedCount++;
      }
      for (const w of sen.words) {
        const wt = w.t - beat.startMs;
        if (wt >= speakLocal - 2000 && wt <= speakLocal + 400) {
          wordTimes.push(wt);
          wordTexts.push(w.w);
        }
      }
    }
    void prevStart;
    // D17 — the cadence machinery: which sentence of the beat is playing
    // (0-based) and how many the beat has. Scene drawers key their per-
    // sentence reveals off this instead of holding one layout for 20-40s.
    const sentenceIdx = Math.max(0, startedCount - 1);
    const sentenceCount = beat.sentences.length;

    const g: SceneCtx = {
      ctx, W, H,
      beatT: bt,
      t: gt,
      d: gdur,
      p: clamp01(gt / Math.max(1, gdur)),
      beatP: clamp01(bt / Math.max(1, beat.endMs - beat.startMs)),
      s,
      beat: gBeat,
      speaking,
      wordTimes,
      wordTexts,
      sentenceId,
      prevSentenceId,
      sentenceT,
      sentenceIdx,
      sentenceCount,
      // AUDIT R-04 — the script's gesture for this sentence (may be undefined;
      // poseAt then falls back to its sentenceHash pick)
      gesture: gBeat.gestures?.[sentenceIdx],
      channelName: opts.channelName,
      nextVideoTitle: opts.nextVideoTitle,
      chapterIdx,
    };

    const drawer = SCENES[type];
    if (drawer) {
      try { drawer(g); } catch (e) { console.error('scene error', type, e); }
    } else {
      hostScene(g);
    }

    // ambient dust layer (scene-independent, screen-space-ish)
    if (!isStatement && type !== 'secCase') {
      goldDust(ctx, W, H, t + chapterIdx * 1300, chapterIdx * 7 + 3, 0.5);
    }
    bokehField(ctx, W, H, t, chapterIdx * 3 + 1, true, isStatement ? 0.5 : 0.75);

    // DOF reaction pass on host scenes late in the group (subtle — U1.1:
    // band-limited cheap gaussian, composited at 20% alpha)
    if (type === 'host' && gt > gdur * 0.7) {
      dofPass(ctx, W, H, 0.2);
    }
  }

  ctx.restore(); // exit camera

  // ── screen-space furniture ──
  ctx.save();
  ctx.scale(W / 1920, H / 1080);

  // part cards — U3.2: the walk-on wrapper (card + The Principal's entrance)
  // AUDIT I-03 — the signature light is no longer reserved to host/stepUp/
  // endScreen (<15% of runtime): every chapter-open beat now carries godRays,
  // so the volumetric look lands at each act boundary.
  for (const c of tl.chapterCards) {
    if (t >= c.startMs && t < c.endMs) {
      godRays(ctx, W, H, t, { alpha: 0.34, x: W * 0.28 });
      drawChapterWalkOn(ctx, W, H, t - c.startMs, c.endMs - c.startMs, c.index, c.title, tl.chapters.length);
      // light blade accompanies the card (he exits through it)
      const bp = clamp01((t - c.startMs) / (c.endMs - c.startMs));
      lightBlade(ctx, W, H, bp);
    }
  }

  // captions (suppressed when the scene IS the on-screen text — no dupe)
  const textScenes = ['statement', 'finalLines', 'turnCard', 'policyRisk', 'quietBeat', 'titleCard'];
  const capStyle: CaptionStyle = { mode: beat && textScenes.includes(type) ? 'off' : opts.captions, maxRows: 2, maxWords: 6 };
  drawCaptions(ctx, W, H, t, tl.captionLines, capStyle);

  // source chips (bottom-left, paper tick sound already scheduled in mix)
  // AUDIT T-09 — during caption beats the chip lifts to y=960 (left column)
  // so the bottom band never stacks chip + caption pill + progress bar.
  const capOn = capStyle.mode !== 'off' && tl.captionLines.some((l) => t >= l.start && t < l.end);
  for (const sc of tl.sourceChips) {
    if (t >= sc.time && t < sc.time + 3200) {
      drawSourceChip(ctx, W, t, sc.text, sc.time, 3200, capOn);
    }
  }

  // watermark + progress
  if (opts.watermark && t < tl.durationMs - 8000) drawWatermark(ctx, W, opts.channelName);
  if (opts.progressBar) {
    const chapterFracs = tl.chapters.map((c) => c.startMs / tl.durationMs);
    drawProgressBar(ctx, W, H, t / tl.durationMs, chapterFracs);
  }

  // ── finishing passes ──
  // AUDIT I-04 — corner crush: vignette strength 0.9 → 0.75 so the bottom
  // corners of dark scenes (secCase, finalLines) stop crushing to black on
  // OLED phones and the floor detail survives.
  vignette(ctx, W, H, 0.75);
  drawGrain(ctx, W, H, t, isStatement ? 0.06 : 0.10);

  // global fades: fade-in from dark (navy, not white) + fade-out
  const fadeIn = clamp01(t / 700);
  const fadeOut = clamp01((tl.durationMs - t) / 1100);
  const dark = 1 - Math.min(fadeIn, fadeOut);
  if (dark > 0.002) {
    ctx.fillStyle = rgba('#05080F', dark);
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  ctx.restore();
}

/** idle/brand frame (used by the studio before prepare) */
export function drawIdleFrame(ctx: CanvasRenderingContext2D, tMs: number, channelName: string): void {
  const W = 1920, H = 1080;
  ctx.save();
  ctx.scale(W / 1920, H / 1080);
  paintStage(ctx, W, H, tMs, { tone: 'gold' });
  bokehField(ctx, W, H, tMs, 5, true, 1.2);
  goldDust(ctx, W, H, tMs, 5, 1.2);
  setFont(ctx, 92, 800, '"Playfair Display", Georgia, serif');
  ctx.textAlign = 'center';
  const g = ctx.createLinearGradient(0, H * 0.36, 0, H * 0.52);
  g.addColorStop(0, PALETTE.goldPale);
  g.addColorStop(1, PALETTE.gold);
  ctx.fillStyle = g;
  ctx.fillText('AURUM', W / 2, H * 0.46);
  setFont(ctx, 30, 600, '"Manrope", Arial, sans-serif');
  try { (ctx as any).letterSpacing = '6px'; } catch { /* noop */ }
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.fillText(channelName.toUpperCase(), W / 2, H * 0.54);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  ctx.textAlign = 'left';
  ctx.restore();
}

export { softBloom };
