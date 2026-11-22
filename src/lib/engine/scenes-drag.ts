/**
 * AURUM data scenes — Act I & Act II.
 * brokerageStatement · feeChips · memoCard · taxRates · turnoverBars ·
 * growthCurves · characterMatrix · signatureCurve · benchmarkBar
 */

import { SceneCtx } from './scene-context';
import { PALETTE, rgba, setFont, wrapText, glassCard, roundRect, goldFillText, FONT_DISPLAY, FONT_UI, kicker, chip, hexLerp } from './theme';
import { clamp01, easeOutCubic, springTo, hash01, fmtComma, fmtMoney } from './easing';
import { goldDust, impactRing, softBloom, glowLine, spinToken, floatY, focusPing } from './fx';
import { panelTitle, lineChart, column, statCard, barRow } from './charts';
import { paintStage } from './stage';
import { dataSceneFigure } from './scenes-figure';

// ── the brokerage statement (push-in on "Total Return", empty after-tax row) ─
export function brokerageStatementScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  paintStage(ctx, W, H, t, {});
  const cardW = 780, cardH = 620;
  const cx = W * 0.62, cy = H * 0.5 - 40;
  const x = cx - cardW / 2, y = cy - cardH / 2;
  const ent = springTo(0.9, 1, Math.min(900, t), 130, 15);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(ent, ent);
  ctx.translate(-cx, -cy);
  glassCard(ctx, x, y, cardW, cardH, { r: 14, fill: 'rgba(16,24,44,0.82)', border: rgba(PALETTE.inkSoft, 0.22), goldEdge: false });
  // header
  setFont(ctx, 28, 700, FONT_UI);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText('CLIENT PERFORMANCE SUMMARY', x + 44, y + 56);
  setFont(ctx, 28, 500, FONT_UI);
  ctx.fillStyle = PALETTE.inkFaint;
  ctx.fillText('Account ····7042     Period · 25 years', x + 44, y + 88);
  // rows
  const rows: { label: string; value: string; tone?: 'gold' | 'red'; glow?: boolean }[] = [
    { label: 'Time-weighted return', value: '8.0% annualized' },
    { label: 'Morningstar rating', value: '★★★★★' },
    { label: 'Total return', value: '$13,700,000', tone: 'gold', glow: true },
    { label: 'After-tax return', value: '— not reported —', tone: 'red' },
  ];
  rows.forEach((r, i) => {
    const ry = y + 150 + i * 106;
    const rowA = clamp01((t - 400 - i * 330) / 500);
    if (rowA <= 0) return;
    ctx.save();
    ctx.globalAlpha = rowA;
    if (r.glow) {
      // the glowing highlighted row
      const pulse = 0.5 + 0.5 * Math.sin(t / 1200);
      roundRect(ctx, x + 28, ry - 38, cardW - 56, 78, 10);
      ctx.fillStyle = rgba(PALETTE.gold, 0.08 + 0.05 * pulse);
      ctx.fill();
      ctx.strokeStyle = rgba(PALETTE.gold, 0.5);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = r.tone === 'red' ? '#F08A8D' : PALETTE.inkSoft;
    ctx.fillText(r.label, x + 44, ry);
    setFont(ctx, 36, 700, r.tone === 'gold' ? FONT_DISPLAY : FONT_UI);
    ctx.fillStyle = r.tone === 'red' ? rgba(PALETTE.inkFaint, 0.9) : r.tone === 'gold' ? PALETTE.goldBright : PALETTE.ink;
    ctx.textAlign = 'right';
    ctx.fillText(r.value, x + cardW - 44, ry + 8);
    ctx.textAlign = 'left';
    ctx.restore();
  });
  // the empty after-tax row gets a dashed highlight late
  const emptA = clamp01((t - 4200) / 600);
  if (emptA > 0) {
    ctx.save();
    ctx.globalAlpha = emptA;
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = rgba(PALETTE.down, 0.55);
    ctx.lineWidth = 1.6;
    roundRect(ctx, x + 28, y + 150 + 3 * 106 - 38, cardW - 56, 78, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  ctx.restore();

  // left-side kicker + the line "a number you've never seen"
  const leftA = clamp01((t - 600) / 600);
  kicker(ctx, 'Act I · The wrong scoreboard', 120, 240, leftA);
  ctx.save();
  ctx.globalAlpha = leftA;
  setFont(ctx, 56, 700, FONT_DISPLAY);
  ctx.fillStyle = PALETTE.ink;
  wrapText(ctx, 'The line nobody', 520, 56, 700, FONT_DISPLAY).forEach((ln, i) => ctx.fillText(ln, 120, 310 + i * 68));
  goldFillText(ctx, 'computes.', 120, 310 + 2 * 68, 56, 700, FONT_DISPLAY);
  ctx.restore();
}

// ── fee compression chips (Cerulli) ──────────────────────────────────────────
export function feeChipsScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'When the fee compresses, the tax work disappears', W * 0.10, 220, W * 0.8, t / 2400, {
    kickerText: 'Act I · Incentives',
  });
  // hero stat: 83%
  statCard(ctx, {
    x: W * 0.10, y: 350, w: 560, h: 380,
    big: '83%', label: 'advisors charging <1% on $5M+ clients by 2026', sub: 'average fees → ⅔ of a point (Cerulli)', p: clamp01((t - 300) / 900), tone: 'gold', bigSize: 130,
  });
  // the squeeze visual: fee arrow down, tax work fading
  const x2 = W * 0.58, y2 = 380;
  const ent2 = clamp01((t - 1100) / 700);
  if (ent2 > 0) {
    ctx.save();
    ctx.globalAlpha = ent2;
    glassCard(ctx, x2, y2, 620, 320, { r: 18 });
    // fee line descending
    const pts: [number, number][] = [];
    for (let i = 0; i <= 8; i++) pts.push([i / 8, 1.0 - (i / 8) * 0.62]);
    lineChart(ctx, {
      x: x2 + 90, y: y2 + 70, w: 440, h: 170,
      series: [{ tone: 'gold', points: pts.map(([a, b]) => [a * 100, b * 100]) }],
      p: clamp01((t - 1300) / 1200), t,
      yFormat: () => '', gridLines: 3, showAxis: false,
      annotations: [{ at: 1, label: '→ 0.66%', tone: 'gold' }],
    });
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('average advisory fee', x2 + 90, y2 + 62);
    // "tax management: invisible" chip
    chip(ctx, 'tax management — expensive to deliver, invisible when done', x2 + 60, y2 + 262, { size: 28, gold: true });
    ctx.restore();
  }
}

// ── compliance memo (redactions + E&O stamp) ────────────────────────────────
export function memoCardScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  const cardW = 860, cardH = 560;
  const x = W * 0.56 - cardW / 2, y = H * 0.47 - cardH / 2;
  const ent = springTo(0.92, 1, Math.min(800, t), 140, 15);
  ctx.save();
  ctx.translate(x + cardW / 2, y + cardH / 2);
  ctx.rotate(-0.012);
  ctx.scale(ent, ent);
  ctx.translate(-(x + cardW / 2), -(y + cardH / 2));
  glassCard(ctx, x, y, cardW, cardH, { r: 10, fill: 'rgba(224,216,196,0.10)', border: rgba(PALETTE.inkSoft, 0.28), sheen: true });
  setFont(ctx, 30, 800, FONT_UI);
  try { (ctx as any).letterSpacing = '3px'; } catch { /* noop */ }
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText('INTERNAL COMPLIANCE MEMO', x + 52, y + 74);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  // redacted lines
  const lines = [
    'Tax planning vs tax advice: [REDACTED] boundary.',
    'Cross-department review: [REDACTED] required.',
    'E&O coverage: tax advice [EXCLUDED]',
    'Approved response: “[REDACTED] consult your CPA.”',
  ];
  lines.forEach((ln, i) => {
    const la = clamp01((t - 500 - i * 320) / 460);
    if (la <= 0) return;
    ctx.save();
    ctx.globalAlpha = la;
    setFont(ctx, 28, 500, FONT_UI);
    ctx.fillStyle = PALETTE.inkMuted;
    ctx.fillText(ln, x + 52, y + 160 + i * 64);
    // redaction bars over the bracketed bits
    ctx.fillStyle = rgba(PALETTE.inkGhost, 0.75);
    const segs = ln.split(/(\[[^\]]+\])/g);
    let sx = x + 52;
    for (const seg of segs) {
      const w = ctx.measureText(seg).width;
      if (/^\[/.test(seg)) ctx.fillRect(sx - 2, y + 160 + i * 64 - 20, w + 4, 26);
      sx += w;
    }
    ctx.restore();
  });
  // E&O EXCLUSION stamp (U1.4): scaled to 80%, landed on the document's
  // BOTTOM-RIGHT corner over only the last text line, with a soft shadow —
  // the header, body and signature zones all stay readable.
  const stampT = t - 2100;
  if (stampT > 0) {
    const e = easeOutCubic(clamp01(stampT / 240));
    ctx.save();
    ctx.translate(x + cardW - 178, y + cardH - 132);
    ctx.rotate(-0.14);
    ctx.scale(e * 0.8, e * 0.8);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 10;
    setFont(ctx, 44, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '6px'; } catch { /* noop */ }
    const label = 'E&O EXCLUSION';
    const tw = ctx.measureText(label).width + 60;
    ctx.strokeStyle = rgba(PALETTE.down, 0.9);
    ctx.lineWidth = 3.4;
    roundRect(ctx, -tw / 2, -44, tw, 88, 10);
    ctx.fillStyle = rgba(PALETTE.down, 0.10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#F08A8D';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 16);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    ctx.restore();
  }
  ctx.restore();
  // the human part caption
  const humanA = clamp01((t - 3400) / 600);
  if (humanA > 0) {
    ctx.save();
    ctx.globalAlpha = humanA;
    setFont(ctx, 40, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    wrapText(ctx, 'Advisors are people. Loss aversion makes selling a loser feel like failure — even when it’s a win.', 480, 40, 600, FONT_DISPLAY).forEach((ln, i) => {
      ctx.fillText(ln, 120, 300 + i * 56);
    });
    ctx.restore();
  }
}

// ── Schwab rate plates ───────────────────────────────────────────────────────
export function taxRatesScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Top federal rates — the price of realizing', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Act II · The Schwab model' });
  const plates = [
    { big: '40.8%', label: 'short-term gains', sub: 'taxed like salary', tone: 'down' },
    { big: '23.8%', label: 'long-term gains', sub: '37% bracket + 3.8% NIIT', tone: 'gold' },
    { big: '+13.3%', label: 'California, on top', sub: 'LT gains > 37% there', tone: 'platinum' },
  ];
  plates.forEach((pl, i) => {
    const ent = clamp01((t - 300 - i * 380) / 700);
    if (ent <= 0) return;
    ctx.save();
    ctx.globalAlpha = ent;
    // AUDIT K-04 — the grid used to run 3×500 + 40 gaps from W*0.10: plate 3
    // ended flush against the right edge (~1880) while a 150px band sat empty
    // below. Rebalanced: symmetric 192px margins (192…1728), plates grown to
    // h=400 (330→730) so the frame carries to the caption guard.
    const w = 480, gx = W * 0.10 + i * (w + 48);
    statCard(ctx, { x: gx, y: 330, w, h: 400, big: pl.big, label: pl.label, sub: pl.sub, p: ent, tone: pl.tone as any, bigSize: 92 });
    ctx.restore();
  });
  // assumption footnote
  const fa = clamp01((t - 1800) / 500);
  if (fa > 0) {
    ctx.save();
    ctx.globalAlpha = fa * 0.85;
    setFont(ctx, 28, 500, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('Model: 30 years · 6% capital-gains return · 0% dividends · 2026 top federal rates · excludes state tax', W * 0.10, 800);
    ctx.restore();
  }
}

// ── turnover drag bars (71 vs 194 bps) ───────────────────────────────────────
export function turnoverBarsScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Turnover — the drag almost triples', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Act II · Vary one thing' });
  const x = W * 0.10, w = W * 0.62;
  barRow(ctx, { x, y: 345, w, h: 120, label: '5% turnover', value: 0.71, maxV: 2.0, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'up', valueText: '−0.71 pts/yr', sub: 'barely trading' });
  barRow(ctx, { x, y: 535, w, h: 120, label: '100% turnover', value: 1.94, maxV: 2.0, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'down', valueText: '−1.94 pts/yr', sub: 'normal for many active funds' });
  // multiplier callout (below the second bar, clear of right-aligned values;
  // L-02 — raised to 746 so it clears the caption pill's 30px risk band)
  const ma = clamp01((t - 2300) / 500);
  if (ma > 0) {
    ctx.save();
    ctx.globalAlpha = ma;
    setFont(ctx, 44, 800, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('≈ 3× the drag', x + 8, 690);
    ctx.restore();
  }
}

// ── G3b growth curves ($100k → 469,970 vs 330,190) ───────────────────────────
export function growthCurvesScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'A hundred forty thousand dollars — gone. Not to the market. To the calendar.', W * 0.10, 210, W * 0.84, t / 2600, { kickerText: 'Act II · $100,000 · 30 years · 6%' });
  // two curves
  const ptsA: [number, number][] = [], ptsB: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    ptsA.push([i, 100 * Math.pow(1.06 - 0.0071, i)]);   // low turnover (net ~5.29%)
    ptsB.push([i, 100 * Math.pow(1.06 - 0.0194, i)]);   // high turnover (net ~4.06%)
  }
  // S-05 — chart zone shifts right of the figure margin (figure spans x≈90..330)
  const chartX = W * 0.30, chartY = 280, chartW = W * 0.44, chartH = 430;
  lineChart(ctx, {
    x: chartX, y: chartY, w: chartW, h: chartH,
    series: [
      { tone: 'gold', points: ptsA, width: 5 },
      { tone: 'down', points: ptsB, width: 4.4, dashed: true },
    ],
    p: clamp01(t / 2600), t,
    yMin: 100, yMax: 500, yFormat: (v) => `$${Math.round(v)}K`,
    xLabels: ['0', '10', '20', '30 yrs'],
    gridLines: 4, fill: true,
  });
  // endpoint labels
  const epA = clamp01((t - 2600) / 500), epB = clamp01((t - 1800) / 500);
  if (epB > 0) {
    ctx.save();
    ctx.globalAlpha = epB;
    glassCard(ctx, chartX + chartW * 0.62, chartY + 190, 210, 62, { r: 10, border: rgba(PALETTE.down, 0.45), shadow: false, fill: 'rgba(12,16,30,0.85)', sheen: false });
    setFont(ctx, 28, 800, FONT_DISPLAY);
    ctx.fillStyle = '#F08A8D';
    ctx.fillText('$330,190', chartX + chartW * 0.62 + 16, chartY + 230);
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('high turnover', chartX + chartW * 0.62 + 16, chartY + 186 + 14);
    ctx.restore();
  }
  if (epA > 0) {
    ctx.save();
    ctx.globalAlpha = epA;
    glassCard(ctx, chartX + chartW - 10, chartY + 6, 240, 62, { r: 10, goldEdge: true, shadow: false, fill: 'rgba(12,16,30,0.85)', sheen: false });
    goldFillText(ctx, '$469,970', chartX + chartW + 6, chartY + 46, 28, 800, FONT_DISPLAY);
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('low turnover', chartX + chartW + 8, chartY - 6 + 8);
    ctx.restore();
  }
  // the gap verdict
  const va = clamp01((t - 3400) / 600);
  if (va > 0) {
    ctx.save();
    ctx.globalAlpha = va;
    const gapW = 420;
    glassCard(ctx, chartX + chartW + 40, chartY + 170, gapW, 170, { r: 16, goldEdge: true });
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('30% OF THE ENDING WEALTH', chartX + chartW + 70, chartY + 216);
    goldFillText(ctx, '−$139,780', chartX + chartW + 70, chartY + 290, 62, 800, FONT_DISPLAY);
    ctx.restore();
  }
  // S-05 — the Principal walks to the growing gap and points at it: the hand
  // rides the curve's leading edge while it grows, then presents the verdict
  dataSceneFigure(g, 1.42, {
    seed: 21,
    focal: (si) => si >= 3
      ? { x: chartX + chartW + 250, y: chartY + 250 }
      : { x: chartX + chartW * Math.min(1, t / 2600), y: chartY + 150 },
  });
}

// ── character of returns matrix ──────────────────────────────────────────────
export function characterMatrixScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'The character of a return matters as much as its size', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Act II · Mechanics' });
  const rows = [
    { label: 'Bond interest', tag: 'ORDINARY', tone: 'down', note: 'taxed like salary' },
    { label: 'REIT distributions', tag: 'MOSTLY ORDINARY', tone: 'down', note: 'the default' },
    { label: 'Qualified dividends', tag: 'DISCOUNTED', tone: 'up', note: 'long-term rates' },
    { label: 'Long-term gains', tag: 'DISCOUNTED', tone: 'up', note: 'held > 1 year' },
  ];
  // D17 cadence wiring: the narration walks the rows — the sentence index
  // drives which row is hot (gold edge, fresh pulse), so the layout changes
  // visibly every few seconds instead of holding for 41.5s.
  const hotIdx = g.sentenceIdx != null && g.sentenceIdx >= 0 ? g.sentenceIdx % rows.length : -1;
  const fresh = g.sentenceT != null ? clamp01(1 - g.sentenceT / 900) : 0;
  rows.forEach((r, i) => {
    const ent = clamp01((t - 300 - i * 330) / 600);
    if (ent <= 0) return;
    const hot = i === hotIdx;
    ctx.save();
    ctx.globalAlpha = ent;
    const y = 300 + i * 88, x = W * 0.10, w = W * 0.80;
    glassCard(ctx, x, y, w, 72, {
      r: 12,
      shadow: false,
      fill: hot ? rgba(PALETTE.gold, 0.07 + 0.05 * fresh) : 'rgba(255,255,255,0.045)',
      border: hot ? rgba(PALETTE.gold, 0.35 + 0.35 * fresh) : undefined,
    });
    setFont(ctx, 29, 700, FONT_UI);
    ctx.fillStyle = hot ? PALETTE.ink : PALETTE.inkSoft;
    ctx.fillText(r.label, x + 36, y + 45);
    chip(ctx, r.tag, x + 430, y + 18, { size: 28, gold: hot, dot: r.tone === 'down' ? PALETTE.down : PALETTE.up });
    setFont(ctx, 28, 500, FONT_UI);
    ctx.fillStyle = hot ? PALETTE.inkSoft : PALETTE.inkFaint;
    ctx.textAlign = 'right';
    ctx.fillText(r.note, x + w - 36, y + 45);
    ctx.textAlign = 'left';
    ctx.restore();
  });
  // U3.3 — the eye lands on the row being narrated
  if (hotIdx >= 0) focusPing(ctx, W * 0.16, 300 + hotIdx * 88 + 36, g.sentenceT, 76);
  // the blunt BlackRock verdict — enters once four sentences have played
  // (L-02 — card raised: bottom 744, clear of the caption pill top ≈796)
  const va = g.sentenceIdx != null ? clamp01((g.sentenceIdx - 3.5) / 0.9) : clamp01((t - 4200) / 600);
  if (va > 0) {
    ctx.save();
    ctx.globalAlpha = va;
    glassCard(ctx, W * 0.10, 640, W * 0.80, 104, { r: 14, goldEdge: true });
    setFont(ctx, 29, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText('“Taxes eat a far bigger share of a bond’s return than a stock’s.”', W * 0.10 + 40, 702);
    ctx.restore();
  }
}

// ── G4 — THE signature curve ($2M, 8% vs 6%, gold gap) ──────────────────────
export function signatureCurveScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  paintStage(ctx, W, H, t, { tone: 'gold' });
  goldDust(ctx, W, H, t, 21, 1.2);
  panelTitle(ctx, 'Same portfolio. Same market. Twenty-five years.', W * 0.12, 190, W * 0.76, t / 2400, { kickerText: 'The arithmetic' });

  // S-05 — chart zone shifts right of the figure margin (figure spans x≈90..330)
  const chartX = W * 0.335, chartY = 270, chartW = W * 0.445, chartH = 470;
  const ptsA: [number, number][] = [], ptsB: [number, number][] = [];
  for (let i = 0; i <= 25; i++) {
    ptsA.push([i, 2 * Math.pow(1.08, i)]);
    ptsB.push([i, 2 * Math.pow(1.06, i)]);
  }
  const p = clamp01(t / 3000);
  // draw curves manually for the gap fill
  const yMin = 2, yMax = 14;
  const px = (i: number) => chartX + (i / 25) * chartW;
  const py = (v: number) => chartY + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const nShown = Math.max(2, Math.ceil(26 * clamp01(p / 0.62)));
  // gap fill (gold, between the curves once both exist)
  const gapP = clamp01((t - 1600) / 1200);
  if (gapP > 0) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < nShown; i++) {
      const v = 2 * Math.pow(1.08, i);
      if (i === 0) ctx.moveTo(px(i), py(v)); else ctx.lineTo(px(i), py(v));
    }
    for (let i = nShown - 1; i >= 0; i--) {
      ctx.lineTo(px(i), py(2 * Math.pow(1.06, i)));
    }
    ctx.closePath();
    const gg = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
    gg.addColorStop(0, rgba(PALETTE.goldBright, 0.34));
    gg.addColorStop(1, rgba(PALETTE.goldDeep, 0.10));
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.restore();
  }
  // grid
  ctx.save();
  ctx.strokeStyle = rgba(PALETTE.inkSoft, 0.10);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) { const gy = chartY + (chartH / 4) * i; ctx.moveTo(chartX, gy); ctx.lineTo(chartX + chartW, gy); }
  ctx.stroke();
  setFont(ctx, 28, 600, FONT_UI);
  ctx.fillStyle = PALETTE.inkFaint;
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = yMax - ((yMax - yMin) / 4) * i;
    ctx.fillText(`$${v.toFixed(0)}M`, chartX - 14, chartY + (chartH / 4) * i + 8);
  }
  ctx.textAlign = 'left';
  ctx.restore();

  const pathA = (c: CanvasRenderingContext2D) => { for (let i = 0; i < nShown; i++) { const X = px(i), Y = py(2 * Math.pow(1.08, i)); i === 0 ? c.moveTo(X, Y) : c.lineTo(X, Y); } };
  const pathB = (c: CanvasRenderingContext2D) => { for (let i = 0; i < nShown; i++) { const X = px(i), Y = py(2 * Math.pow(1.06, i)); i === 0 ? c.moveTo(X, Y) : c.lineTo(X, Y); } };
  glowLine(ctx, pathA, PALETTE.goldBright, 6, 22);
  glowLine(ctx, pathB, '#9BB0D6', 5, 14);
  // labels (fixed positions — never collide with each other or the curves)
  const la = clamp01((t - 1200) / 500), lb = clamp01((t - 2000) / 500);
  if (la > 0) {
    ctx.save();
    ctx.globalAlpha = la;
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('8% gross → $13.7M', chartX + chartW * 0.34, chartY + 64);
    ctx.restore();
  }
  if (lb > 0) {
    ctx.save();
    ctx.globalAlpha = lb;
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = '#9BB0D6';
    ctx.fillText('6% net → $8.6M', chartX + chartW * 0.34, chartY + chartH - 26);
    ctx.restore();
  }
  // the $5.1M badge — lands with the ping
  const badgeP = clamp01((t - 3000) / 600);
  if (badgeP > 0) {
    const bw = 330, bh = 110;
    const bx = chartX + chartW + 50, by = chartY + 60;
    ctx.save();
    ctx.globalAlpha = badgeP;
    const ent = springTo(0.8, 1, (t - 3000), 170, 16);
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.scale(ent, ent);
    ctx.translate(-bw / 2, -bh / 2);
    glassCard(ctx, 0, 0, bw, bh, { r: 16, goldEdge: true });
    goldFillText(ctx, '$5.1M', 30, 62, 58, 800, FONT_DISPLAY);
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.fillText('THE TAX LINE', 30, 90);
    ctx.restore();
    impactRing(ctx, bx + bw / 2, by + bh / 2, t, 3000, 160, 1.1, PALETTE.gold);
    softBloom(ctx, W, H, t - 3000, 460, 0.14);
  }
  // hold note (U1.3): relocated INTO the badge card's right column at y≈560 —
  // the caption strip is never contested, even during the 4-second hold.
  // U3.3 — the eye rides the curve's leading edge at each sentence boundary
  if (nShown >= 2 && (g.sentenceT ?? 9999) < 340) {
    focusPing(ctx, px(nShown - 1), py(2 * Math.pow(1.08, nShown - 1)), g.sentenceT, 86);
  }
  const holdP = clamp01((t - (s.hold ?? 4200)) / 1200);
  if (holdP > 0) {
    const bx = chartX + chartW + 50;
    ctx.save();
    ctx.globalAlpha = holdP * 0.9;
    setFont(ctx, 30, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.textAlign = 'center';
    wrapText(ctx, 'It isn’t a scare number. It’s arithmetic.', 340, 30, 600, FONT_DISPLAY).forEach((ln, i) => {
      ctx.fillText(ln, bx + 170, 560 + i * 40);
    });
    ctx.textAlign = 'left';
    ctx.restore();
  }
  // S-05 — the Principal walks to the signature curve and POINTS at the
  // growing gap (report §6.4): hand rides the curve's leading edge per
  // sentence, then presents the $5.1M tax-line badge
  dataSceneFigure(g, 1.42, {
    seed: 22,
    focal: (si) => si >= 3
      ? { x: chartX + chartW + 215, y: chartY + 115 }
      : { x: px(Math.max(0, nShown - 1)), y: py(2 * Math.pow(1.08, Math.max(0, nShown - 1))) },
  });
}

// ── the benchmark to beat (0.3%/yr) ──────────────────────────────────────────
export function benchmarkBarScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Before you buy complexity, beat this benchmark', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'The floor' });
  const x = W * 0.10, w = W * 0.62;
  // U1.4: maxV = 0.5 so the honest 0.3% stub fills ~60% of the track — the
  // bar reads as a measured floor, and the value rides the dark cap zone.
  barRow(ctx, {
    x, y: 370, w, h: 130, label: 'Plain index ETF, held for decades', value: 0.3, maxV: 0.5,
    p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'gold', valueText: '≈ 0.3%/yr',
    sub: 'roughly the tax on its dividends',
  });
  // U3.3 — focus ping on the value the narration is talking about
  focusPing(ctx, x + w * 0.72, 435, g.sentenceT, 96);
  // competing pitches fade below the line
  const compA = clamp01((t - 1600) / 600);
  if (compA > 0) {
    ctx.save();
    ctx.globalAlpha = compA * 0.85;
    setFont(ctx, 36, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.inkMuted;
    ctx.fillText('Most pitches can’t.', x + w + 50, 460);
    ctx.restore();
  }
}

export { spinToken, hash01, fmtComma, hexLerp, floatY };
