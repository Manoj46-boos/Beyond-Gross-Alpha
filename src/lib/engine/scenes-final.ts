/**
 * AURUM scenes — The Synthesis (save assets + close).
 * stepUp · hierarchy · fiveQuestions · endScreen
 */

import { SceneCtx } from './scene-context';
import { PALETTE, rgba, setFont, wrapText, glassCard, roundRect, goldFillText, FONT_DISPLAY, FONT_UI, kicker, chip, diamond, goldRule, drawAlphaGlyph } from './theme';
import { clamp01, easeOutCubic, springTo, hash01 } from './easing';
import { goldDust, impactRing, softBloom, godRays, bokehField, floatY, focusPing } from './fx';
import { panelTitle } from './charts';
import { paintStage } from './stage';
import { dataSceneFigure } from './scenes-figure';

// ── the quietest fact: stepped-up basis ──────────────────────────────────────
export function stepUpScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, { tone: 'gold' });
  godRays(ctx, W, H, t, { alpha: 0.5, x: W * 0.25 });
  goldDust(ctx, W, H, t, 51, 1.2);
  kicker(ctx, 'The quietest, most powerful fact', W * 0.10, 220, clamp01(t / 500));
  const bigA = clamp01((t - 300) / 700);
  ctx.save();
  ctx.globalAlpha = bigA;
  setFont(ctx, 76, 700, FONT_DISPLAY);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('The best tax strategy in America', W * 0.10, 320);
  goldFillText(ctx, 'is often patience.', W * 0.10, 412, 76, 700, FONT_DISPLAY);
  ctx.restore();
  // stepped-up basis visual: gains wiped (S-05 — card shifts right of the
  // figure margin; the headline above stays clear of his head)
  const wa = clamp01((t - 1200) / 700);
  if (wa > 0) {
    ctx.save();
    ctx.globalAlpha = wa;
    glassCard(ctx, W * 0.24, 480, 780, 300, { r: 18, goldEdge: true });
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('HELD UNTIL DEATH (TAXABLE ACCOUNT)', W * 0.24 + 40, 540);
    // embedded gains row → struck through
    setFont(ctx, 40, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.fillText('every embedded gain — wiped', W * 0.24 + 40, 620);
    ctx.strokeStyle = rgba(PALETTE.up, 0.9);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W * 0.24 + 36, 606);
    ctx.lineTo(W * 0.24 + 660, 612);
    ctx.stroke();
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.up;
    ctx.fillText('stepped-up basis · 2025 law: $15M/person estate exemption', W * 0.24 + 40, 680);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.fillText('donate appreciated shares: the gain disappears + deduction on top', W * 0.24 + 40, 730);
    ctx.restore();
  }
  // S-05 — the Principal presents the quietest fact (report §6.4)
  dataSceneFigure(g, 1.42, {
    seed: 51,
    mode: 'present',
    focal: () => ({ x: W * 0.24 + 390, y: 620 }),
  });
}

// ── G8 — THE HIERARCHY (save asset, hold) ────────────────────────────────────
const TIERS = [
  {
    tier: 'TIER 1', title: 'Location + systematic TLH', verdict: 'DO FIRST', tone: 'gold',
    sub: '≈ 0.25–1.0%/yr combined · regime-dependent · decays as portfolios age',
  },
  {
    tier: 'TIER 2', title: 'The wrapper', verdict: 'DO ALWAYS', tone: 'up',
    sub: 'ETFs / low-turnover index in taxable · ordinary-income assets sheltered · labels optional',
  },
  {
    tier: 'TIER 3', title: 'DI · exchange funds · long-short', verdict: 'ONLY WITH A REASON', tone: 'platinum',
    sub: 'a concentration · a liquidity event · gains that need offsetting',
  },
];
export function hierarchyScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  paintStage(ctx, W, H, t, {});
  kicker(ctx, 'The hierarchy · screenshot this', W * 0.10, 180, clamp01(t / 400));
  const titleA = clamp01((t - 150) / 500);
  ctx.save();
  ctx.globalAlpha = titleA;
  goldFillText(ctx, 'The After-Tax Hierarchy', W * 0.10, 260, 72, 800, FONT_DISPLAY);
  ctx.restore();

  const hold = s.hold ?? 5200;
  // AUDIT K-02 — the grid used to run y 340→830: TIER 3 sat straight under
  // the caption pill (top ≈ 796 for two rows) and was painted over mid-
  // sentence on the scene the kicker calls "screenshot this". Grid shifted
  // up and tightened: the last card ends at y=762, inside the caption guard;
  // footer pulled above the grid. The save-rate artifact stays legible while
  // the caption plays.
  TIERS.forEach((tr, i) => {
    const ent = clamp01((t - 700 + i * 900) / 700);
    if (ent <= 0) return;
    ctx.save();
    ctx.globalAlpha = ent;
    const x = W * 0.10, y = 300 + i * 160, w = W * 0.80, h = 142;
    const e = springTo(0.94, 1, Math.max(0, t - 700 - i * 900), 160, 15);
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(e, e);
    // L-01 — the card is drawn AT THE ORIGIN of the scaled sandwich (as
    // secCase/trapTile already do). The old un-translate by half the card SIZE
    // re-added (x, y): every tier card rendered at exactly (2x, 2y) — Tier 2
    // cut by the frame edge, Tier 3 never visible.
    const lx = -w / 2, ly = -h / 2;
    glassCard(ctx, lx, ly, w, h, {
      r: 16,
      goldEdge: tr.tone === 'gold',
      border: tr.tone === 'up' ? rgba(PALETTE.up, 0.4) : tr.tone === 'platinum' ? rgba(PALETTE.steel, 0.35) : undefined,
    });
    // tier diamond
    diamond(ctx, lx + 56, ly + h / 2, 15, tr.tone === 'gold' ? PALETTE.goldBright : tr.tone === 'up' ? PALETTE.up : PALETTE.steel);
    setFont(ctx, 28, 800, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText(tr.tier, lx + 92, ly + 46);
    setFont(ctx, 36, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(tr.title, lx + 92, ly + 92);
    setFont(ctx, 28, 500, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText(tr.sub, lx + 92, ly + 124);
    // verdict chip (right)
    chip(ctx, tr.verdict, lx + w - 320, ly + h / 2 - 26, { size: 28, gold: tr.tone === 'gold' });
    ctx.restore();
  });
  // FIX F2 — the footer no longer shares the title band. The title's RIGHT
  // edge is measured at runtime; the footer becomes a corner block whose left
  // edge starts 48px past it, wrapped to fit [titleRight+48, W−120]. Title
  // tail and footer can never sit within a few pixels again on the scene the
  // kicker calls "screenshot this". (Below the title's extent is not an
  // option here: the tier grid begins at y=300 and the caption guard at 786 —
  // the corner block is the only collision-free zone, and it now MEASURES its
  // start instead of assuming one.)
  const fa = clamp01((t - 700 + 3 * 900 + 200) / 600);
  if (fa > 0) {
    ctx.save();
    ctx.globalAlpha = fa;
    setFont(ctx, 72, 800, FONT_DISPLAY);
    const titleRight = W * 0.10 + ctx.measureText('The After-Tax Hierarchy').width;
    setFont(ctx, 28, 600, FONT_UI);
    const zoneX = Math.min(titleRight + 48, W - 620);
    const zoneW = (W - 120) - zoneX;
    const fl: string[] = [];
    wrapText(ctx, 'Benchmark to beat: plain index ETF held for decades ≈ 0.3%/yr drag', zoneW, 28, 600, FONT_UI).forEach((ln) => fl.push(ln));
    wrapText(ctx, 'Complexity is a cost you pay every year.', zoneW, 28, 600, FONT_UI).forEach((ln) => fl.push(ln));
    ctx.fillStyle = PALETTE.inkMuted;
    ctx.textAlign = 'right';
    fl.slice(0, 3).forEach((ln, i) => ctx.fillText(ln, W - 120, 214 + i * 32));
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

// ── G9 — THE FIVE QUESTIONS (save asset) ─────────────────────────────────────
const QUESTIONS = [
  'Show me my after-tax return for the last three years.',
  'What did distributions cost me last year, in dollars?',
  'Where is my asset location written down — and why?',
  'How often do you scan for losses, across which accounts — and who checks the wash sales?',
  'If I liquidated today, what\'s the embedded tax bill — and what\'s the plan to shrink it?',
];
export function fiveQuestionsScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  kicker(ctx, 'The five questions · send these', W * 0.10, 170, clamp01(t / 400));
  ctx.save();
  ctx.globalAlpha = clamp01((t - 150) / 500);
  goldFillText(ctx, 'Ask whoever manages your money.', W * 0.10, 250, 62, 800, FONT_DISPLAY);
  ctx.restore();
  QUESTIONS.forEach((q, i) => {
    // U4.1 — each question pulses exactly when IT is asked: the questions are
    // sentences 2-6 of the beat (after the two intro sentences), so the hot
    // question is sentenceIdx − 2 and each card's entrance is keyed to its
    // asking sentence, not an evenly-staged timer.
    const qIdx = (g.sentenceIdx ?? -1) - 2;
    const asksNow = qIdx === i;
    const asked = qIdx > i;
    const ent = g.sentenceIdx != null
      ? (asked ? 1 : asksNow ? clamp01((g.sentenceT ?? 0) / 500) : 0)
      : clamp01((t - 700 - i * 800) / 500);
    if (ent <= 0) return;
    const hot = asksNow;
    ctx.save();
    // AUDIT R-03 — strip to the hot element: asked questions recede to a
    // quiet card while the one being asked carries the frame.
    ctx.globalAlpha = ent * (asked && !hot && qIdx >= 0 ? 0.45 : 1);
    // S-05 — question cards shift right of the figure margin (461..1727)
    const x = W * 0.24, y = 320 + i * 110, w = W * 0.66, h = 92;
    glassCard(ctx, x, y, w, h, {
      r: 14,
      shadow: false,
      alpha: asked && !hot && qIdx >= 0 ? 0.45 : 1,
      fill: hot ? rgba(PALETTE.gold, 0.10) : 'rgba(255,255,255,0.045)',
      border: hot ? rgba(PALETTE.gold, 0.55) : undefined,
    });
    // number
    diamond(ctx, x + 52, y + h / 2, 13, hot ? PALETTE.goldBright : rgba(PALETTE.inkMuted, 0.8));
    setFont(ctx, 28, 800, FONT_UI);
    // AUDIT T-07 — the question numbers are the narrated anchor of each card:
    // inkFaint vanished on phones, inkMuted holds the contrast floor
    ctx.fillStyle = hot ? PALETTE.goldBright : PALETTE.inkMuted;
    ctx.fillText(String(i + 1), x + 88, y + h / 2 + 10);
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = hot ? PALETTE.ink : PALETTE.inkSoft;
    const maxW = w - 260;
    let txt = q;
    setFont(ctx, 28, 600, FONT_UI);
    while (ctx.measureText(txt).width > maxW && txt.length > 10) txt = txt.slice(0, -4) + '…';
    ctx.fillText(txt, x + 130, y + h / 2 + 10);
    ctx.restore();
    // U3.3 — focus ping on the question being asked
    if (asksNow && (g.sentenceT ?? 9999) < 340) {
      focusPing(ctx, x + w * 0.5, y + h / 2, g.sentenceT, 130);
    }
  });
  // S-05 — the Principal presents each question as it is asked (report §6.4):
  // palm open at the hot card, idle stance during the two intro sentences
  dataSceneFigure(g, 1.42, {
    seed: 52,
    mode: 'present',
    focal: (si) => {
      const q = si - 2;
      if (q < 0 || q > 4) return null;
      return { x: W * 0.24 + 70, y: 320 + q * 110 + 46 };
    },
  });
  // footer (top-right, never behind the caption pill) — arrives after Q5
  const fa = g.sentenceIdx != null
    ? ((g.sentenceIdx ?? 0) >= 7 ? clamp01((g.sentenceT ?? 0) / 500) : 0)
    : clamp01((t - 700 - 5 * 800) / 600);
  if (fa > 0) {
    ctx.save();
    ctx.globalAlpha = fa;
    setFont(ctx, 28, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.textAlign = 'right';
    ctx.fillText('A good advisor answers all five.', W - 120, 300);
    ctx.fillText('A great one already did.', W - 120, 340);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

// ── end screen (YouTube-safe) ────────────────────────────────────────────────
export function endScreenScene(g: SceneCtx): void {
  const { ctx, W, H, t, channelName, nextVideoTitle } = g;
  paintStage(ctx, W, H, t, { tone: 'gold' });
  godRays(ctx, W, H, t, { alpha: 0.45, x: W * 0.25 });
  goldDust(ctx, W, H, t, 61, 1.1);
  bokehField(ctx, W, H, t, 9, true, 1);

  const ent = springTo(0.9, 1, Math.min(900, t), 140, 15);
  // next-video teaser card (left 55%)
  ctx.save();
  ctx.globalAlpha = clamp01(t / 400);
  const x = W * 0.06, y = H * 0.22, w = W * 0.52, h = H * 0.56;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(ent, ent);
  ctx.translate(-w / 2, -h / 2);
  glassCard(ctx, 0, 0, w, h, { r: 22, goldEdge: true });
  kicker(ctx, 'Watch next', 60, 90, clamp01((t - 300) / 400));
  setFont(ctx, 54, 700, FONT_DISPLAY);
  ctx.fillStyle = PALETTE.ink;
  wrapText(ctx, nextVideoTitle, w - 120, 54, 700, FONT_DISPLAY).forEach((ln, i) => {
    ctx.fillText(ln, 60, 180 + i * 68);
  });
  setFont(ctx, 28, 600, FONT_UI);
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.fillText('Every number sourced. Both sides, always.', 60, h - 80);
  ctx.restore();

  // channel mark (right — YouTube end elements live top-right; we keep bottom-right free)
  ctx.save();
  ctx.globalAlpha = clamp01((t - 500) / 500);
  setFont(ctx, 34, 700, FONT_UI);
  try { (ctx as any).letterSpacing = '5px'; } catch { /* noop */ }
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.textAlign = 'center';
  ctx.fillText(channelName.toUpperCase(), W * 0.78, H * 0.30);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  goldRule(ctx, W * 0.78, H * 0.30 + 26, 420, clamp01((t - 700) / 600));
  // the brand α — the ONE shared brand vector, drawn on (D16)
  drawAlphaGlyph(ctx, W * 0.78 - 72, H * 0.46 + 52, 104, PALETTE.gold, 8, clamp01((t - 900) / 800));
  ctx.textAlign = 'left';
  ctx.restore();
}
