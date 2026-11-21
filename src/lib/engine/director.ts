/**
 * AURUM director — drawFrame: the exact frame composition.
 * stage → camera → scene → dust/bloom → part cards → captions → source chips →
 * watermark → progress → vignette/grain → fades.
 */

import { Timeline, beatAt, chapterAt } from './timeline';
import { BeatSpec } from './script-data';
import { CaptionLine, drawCaptions, drawChapterCard, drawSourceChip, drawWatermark, drawProgressBar, CaptionStyle } from './textfx';
import { PALETTE, rgba, setFont } from './theme';
import { clamp01, easeOutCubic, easeInOutSine, drift } from './easing';
import { paintStage, toneOf } from './stage';
import { setCamState, goldDust, bokehField, drawGrain, vignette, dofPass, lightBlade, scalePunch, softBloom } from './fx';
import { SceneCtx, SceneDrawer } from './scene-context';
import { splitSentences } from './easing';
import { SCRIPT } from './script-data';

import { coldOpenScene, gapBarsScene, titleCardScene, statementScene, turnCardScene, quietBeatScene, policyRiskScene, finalLinesScene, circleBackScene, stampCardScene } from './scenes-open';
import { hostScene } from './scenes-host';
import { brokerageStatementScene, feeChipsScene, memoCardScene, taxRatesScene, turnoverBarsScene, growthCurvesScene, characterMatrixScene, signatureCurveScene, benchmarkBarScene } from './scenes-drag';
import { locationMapScene, trapTileScene, iraSplitScene, bpsCompareScene, tlhMechanicScene, washSaleScene, waterfallScene, eraBarsScene, vendorCompareScene, wealthfrontCaseScene, decayCurveScene, secCaseScene } from './scenes-tlh';
import { plumbingScene, heartbeatScene, distribBarsScene, taxManagedScene, pitchDeckScene, diMosaicScene, diDecayScene, exchangeFundScene, longShortScene, elmVerdictScene } from './scenes-wrapper';
import { stepUpScene, hierarchyScene, fiveQuestionsScene, endScreenScene } from './scenes-final';

export const SCENES: Record<string, SceneDrawer> = {
  coldOpen: coldOpenScene,
  gapBars: gapBarsScene,
  titleCard: titleCardScene,
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
  // personality by family
  let zBase = 1.0, zTarget = 0.045;
  if (type === 'statement' || type === 'finalLines' || type === 'turnCard' || type === 'policyRisk') { zBase = 0.97; zTarget = 0.06; }
  else if (type === 'coldOpen') { zBase = 1.02; zTarget = 0.07; }
  else if (type === 'host') { zBase = 1.0; zTarget = 0.035; }
  else if (type === 'secCase' || type === 'elmVerdict') { zBase = 1.0; zTarget = 0.028; }
  const scale = zBase + zTarget * easeInOutSine(p);
  const driftK = type.startsWith('statement') || type === 'finalLines' ? 0.12 : type === 'coldOpen' ? 0.35 : 0.6;
  const dx = drift(gt, 1) * 46 * driftK;
  const dy = drift(gt, 7) * 26 * driftK;
  // entry whip (gentle)
  const whip = gt < 340 ? (1 - easeOutCubic(gt / 340)) * 26 : 0;
  const dir = (group.beatIdx % 2 === 0 ? 1 : -1);
  return { dx: dx + whip * dir, dy, scale: Math.min(1.10, scale) };
}

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
  const punchAge = group ? t - group.startMs : 9999;
  const punch = scalePunch(punchAge, 240, 0.022);
  setCamState(cam.dx, cam.dy, cam.scale * punch);
  ctx.translate(W / 2 + cam.dx, H / 2 + cam.dy);
  ctx.scale(cam.scale * punch, cam.scale * punch);
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
    sheen: isStatement ? 0.4 : 0.8,
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
    for (const sen of beat.sentences) {
      const local = sen.startMs - beat.startMs;
      if (bt >= local) {
        prevSentenceId = sentenceId;
        prevStart = sentenceId === undefined ? -1 : prevStart;
        if (sentenceId !== undefined) prevStart = local;
        sentenceId = sen.lineId;
        sentenceT = bt - local;
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

    // DOF reaction pass on host scenes late in the group (subtle)
    if (type === 'host' && gt > gdur * 0.7) {
      dofPass(ctx, W, H, 0.22, { x: W * 0.215, y: H * 0.62, r: 420 });
    }
  }

  ctx.restore(); // exit camera

  // ── screen-space furniture ──
  ctx.save();
  ctx.scale(W / 1920, H / 1080);

  // part cards
  for (const c of tl.chapterCards) {
    if (t >= c.startMs && t < c.endMs) {
      drawChapterCard(ctx, W, H, t - c.startMs, c.endMs - c.startMs, c.index, c.title, 0, tl.chapters.length);
      // light blade accompanies the card
      const bp = clamp01((t - c.startMs) / (c.endMs - c.startMs));
      lightBlade(ctx, W, H, bp);
    }
  }

  // captions (suppressed when the scene IS the on-screen text — no dupe)
  const textScenes = ['statement', 'finalLines', 'turnCard', 'policyRisk', 'quietBeat', 'titleCard'];
  const capStyle: CaptionStyle = { mode: beat && textScenes.includes(type) ? 'off' : opts.captions, maxRows: 2, maxWords: 8 };
  drawCaptions(ctx, W, H, t, tl.captionLines, capStyle);

  // source chips (bottom-left, paper tick sound already scheduled in mix)
  for (const sc of tl.sourceChips) {
    if (t >= sc.time && t < sc.time + 3200) {
      drawSourceChip(ctx, W, t, sc.text, sc.time, 3200);
    }
  }

  // watermark + progress
  if (opts.watermark && t < tl.durationMs - 8000) drawWatermark(ctx, W, opts.channelName);
  if (opts.progressBar) {
    const chapterFracs = tl.chapters.map((c) => c.startMs / tl.durationMs);
    drawProgressBar(ctx, W, H, t / tl.durationMs, chapterFracs);
  }

  // ── finishing passes ──
  vignette(ctx, W, H, 0.9);
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
