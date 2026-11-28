/**
 * AURUM data scenes — Asset Location + Tax-Loss Harvesting (+ SEC drop).
 * locationMap · trapTile · iraSplit · bpsCompare · tlhMechanic · washSale ·
 * waterfall · eraBars · vendorCompare · wealthfrontCase · decayCurve · secCase
 */

import { SceneCtx } from './scene-context';
import { PALETTE, rgba, setFont, wrapText, glassCard, roundRect, goldFillText, FONT_DISPLAY, FONT_UI, kicker, chip, hexLerp, dimRect, tagGraphic, takeaway } from './theme';
import { clamp01, easeOutCubic, easeInOutCubic, springTo, hash01, fmtComma } from './easing';
import { goldDust, impactRing, softBloom, glowLine, spinToken, floatY, microShake, focusPing, impactPuff } from './fx';
import { panelTitle, waterfall, donut, column, dotGrid, barRow, statCard, lineChart } from './charts';
import { paintStage } from './stage';
import { dataSceneFigure } from './scenes-figure';

// ── G5 — the location map (three columns) ────────────────────────────────────
const LOC_COLUMNS = [
  { title: 'TAXABLE', tone: 'up', items: ['Broad index ETFs', 'Growth stocks', 'Municipal bonds'], note: 'low turnover · qualified dividends' },
  { title: 'TAX-DEFERRED', tone: 'down', items: ['Taxable bonds', 'TIPS', 'REITs', 'High-turnover active'], note: 'the IRA · the 401(k) · sealed annually' },
  { title: 'ROTH', tone: 'gold', items: ['Highest-expected-growth equity'], note: 'the Roth — never taxed again' },
];
export function locationMapScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Asset location. Not allocation — location.', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 1' });
  const colW = 520, gap = 60;
  const x0 = (W - colW * 3 - gap * 2) / 2;
  // AUDIT R-02 — D17 sentence-cadence wiring: the narration walks the three
  // account columns, so the hot column lifts (gold edge + ping) and the
  // others recede — the 38s build changes its emphasis with the sentences.
  const hotIdx = g.sentenceIdx != null && g.sentenceIdx >= 0 ? g.sentenceIdx % LOC_COLUMNS.length : -1;
  LOC_COLUMNS.forEach((c, i) => {
    const ent = clamp01((t - 300 - i * 500) / 700);
    if (ent <= 0) return;
    const dim = hotIdx >= 0 && i !== hotIdx;
    ctx.save();
    ctx.globalAlpha = ent;
    const x = x0 + i * (colW + gap);
    const y = 350, h = 420;
    glassCard(ctx, x, y, colW, h, { r: 18, alpha: dim ? 0.5 : 1, goldEdge: c.tone === 'gold' || i === hotIdx, border: c.tone === 'down' ? rgba(PALETTE.down, 0.35) : c.tone === 'up' ? rgba(PALETTE.up, 0.35) : i === hotIdx ? rgba(PALETTE.gold, 0.45) : undefined });
    // header
    setFont(ctx, 28, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '3px'; } catch { /* noop */ }
    ctx.fillStyle = c.tone === 'down' ? '#F08A8D' : c.tone === 'up' ? PALETTE.up : PALETTE.goldBright;
    ctx.textAlign = 'center';
    ctx.fillText(c.title, x + colW / 2, y + 56);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    ctx.textAlign = 'left';
    // items slide in
    c.items.forEach((item, ii) => {
      const ia = clamp01((t - 700 - i * 500 - ii * 220) / 400);
      if (ia <= 0) return;
      ctx.save();
      ctx.globalAlpha = ia;
      ctx.translate((1 - easeOutCubic(ia)) * -40, 0);
      const iy = y + 120 + ii * 62;
      glassCard(ctx, x + 36, iy, colW - 72, 48, { r: 10, shadow: false, fill: 'rgba(255,255,255,0.045)' });
      setFont(ctx, 28, 600, FONT_UI);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText(item, x + 58, iy + 32);
      ctx.restore();
    });
    // FIX F11 — the one-item ROTH column: the empty interior carries a gold
    // sub-card with the slot's WHY (the narration's own words), so the card
    // the eye lands on is not two-thirds air.
    if (c.items.length < 3) {
      const ra = clamp01((t - 1500 - i * 500) / 500);
      if (ra > 0) {
        ctx.save();
        ctx.globalAlpha = ra;
        glassCard(ctx, x + 36, y + 196, colW - 72, 128, { r: 12, shadow: false, fill: 'rgba(212,175,55,0.10)', border: rgba(PALETTE.gold, 0.4) });
        setFont(ctx, 26, 700, FONT_UI);
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillText('the growth is', x + 62, y + 240);
        ctx.fillText('never taxed again', x + 62, y + 274);
        setFont(ctx, 26, 600, FONT_UI);
        ctx.fillStyle = PALETTE.inkMuted;
        ctx.fillText('the highest-leverage slot', x + 62, y + 304);
        ctx.restore();
      }
    }
    setFont(ctx, 26, 500, FONT_UI);
    // FIX F3 — the dimmed column note floors at inkMuted (inkFaint dropped
    // below the phone contrast floor)
    ctx.fillStyle = dim ? PALETTE.inkMuted : PALETTE.inkSoft;
    ctx.fillText(c.note, x + 36, y + h - 32);
    ctx.restore();
    if (i === hotIdx) focusPing(ctx, x + colW / 2, y - 16, g.sentenceT, 92);
  });
}

// ── trap tile (muni in IRA) ──────────────────────────────────────────────────
export function trapTileScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Two traps the pros still step in', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 1 · Traps' });
  // inside spring transforms; a takeaway inside them would land off-canvas)
  // AUDIT §3.2 — D17 sentence-cadence wiring: sentences 0-1 walk the trap
  // card, 2+ the verdict — the listening zone lifts, the other recedes.
  const zi = g.sentenceIdx != null && g.sentenceIdx >= 0 ? (g.sentenceIdx <= 1 ? 0 : 1) : -1;
  const x = W * 0.16, y = 360, w = W * 0.68, h = 330;
  const ent = springTo(0.9, 1, Math.min(700, t), 150, 15);
  ctx.save();
  ctx.globalAlpha = clamp01(t / 300) * (zi === 1 ? 0.6 : 1);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(ent, ent);
  ctx.translate(-w / 2, -h / 2);
  glassCard(ctx, 0, 0, w, h, { r: 20, alpha: zi === 1 ? 0.6 : 1, border: rgba(PALETTE.down, 0.45) });
  // warning band
  setFont(ctx, 32, 800, FONT_UI);
  try { (ctx as any).letterSpacing = '4px'; } catch { /* noop */ }
  ctx.fillStyle = '#F08A8D';
  ctx.textAlign = 'center';
  ctx.fillText('MUNI IN IRA', w / 2, 66);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  ctx.textAlign = 'left';
  // conversion flow: tax-exempt → taxable withdrawals
  const flow = ['tax-exempt interest', '→', 'taxable withdrawals'];
  ctx.save();
  ctx.translate(w / 2, 130);
  flow.forEach((f, i) => {
    const fa = clamp01((t - 400 - i * 300) / 300);
    ctx.globalAlpha = fa;
    if (f === '→') {
      setFont(ctx, 40, 700, FONT_UI);
      ctx.fillStyle = PALETTE.down;
      ctx.fillText(f, -30, 10);
    } else {
      setFont(ctx, 28, 600, FONT_UI);
      ctx.fillStyle = i === 0 ? PALETTE.up : '#F08A8D';
      ctx.fillText(f, i === 0 ? -240 : 60, 10);
    }
  });
  ctx.restore();
  // verdict
  const va = clamp01((t - 1500) / 500);
  if (zi === 1) focusPing(ctx, x + w / 2, y + h * 0.62, g.sentenceT, 100);
  if (va > 0) {
    ctx.save();
    ctx.globalAlpha = va * (zi === 0 ? 0.55 : 1);
    setFont(ctx, 40, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'center';
    ctx.fillText('A tax advantage laundered into a tax bill.', w / 2, 230);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  // FIX F11 — the card interior was two-thirds empty: the mechanics line and
  // the correct-home chip (the narration's own resolution) fill the foot with
  // reserved slots — verdict 230, mechanics 272, chip 306.
  const ma = clamp01((t - 2200) / 500);
  if (ma > 0) {
    ctx.save();
    ctx.globalAlpha = ma * (zi === 0 ? 0.55 : 1);
    setFont(ctx, 24, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.textAlign = 'center';
    ctx.fillText('the coupon arrives tax-exempt — the IRA withdrawal leaves as ordinary income', w / 2, 272);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  const ca = clamp01((t - 2700) / 500);
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha = ca * (zi === 0 ? 0.55 : 1);
    chip(ctx, 'correct home: taxable accounts — that’s the whole point of them', w / 2, 296, { size: 26, gold: true, center: true, maxW: w - 120 });
    ctx.restore();
  }
  ctx.restore();

  // FIX G1 — bottom device: the beat's takeaway anchors the dead bottom band (baseline 740, inside CAPTION_SAFE_TOP 786)
  takeaway(ctx, W * 0.10, 740, W * 0.80, 'A muni in an IRA shelters income that was already tax-free.', clamp01((t - 2400) / 600));
}

// ── IRA reality donut ($700k yours / $300k theirs) ───────────────────────────
export function iraSplitScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'A million in a traditional IRA is not a million', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 1 · Trap two' });
  // AUDIT R-02 — D17 sentence-cadence wiring: sentence 0 owns the donut
  // split, sentence 1 the "$700,000 — yours" legend, sentence 2 the
  // "$300,000 — the government's" line, 3+ the risk note card — the frame's
  // emphasis moves with the narration instead of one frozen layout.
  const siIS = g.sentenceIdx ?? -1;
  const hotZone = siIS < 0 ? -1 : siIS === 0 ? 0 : siIS === 1 ? 1 : siIS === 2 ? 2 : 3;
  const fresh = g.sentenceT != null ? clamp01(1 - g.sentenceT / 900) : 0;
  // S-05 — the donut shifts right of the figure margin
  const cx = W * 0.42, cy = H * 0.55;
  donut(ctx, cx, cy, 170, [
    { value: 70, tone: 'gold', label: 'yours' },
    { value: 30, tone: 'down', label: "government's" },
  ], clamp01((t - 300) / 1200), t, { thickness: 42, centerBig: '$1M', centerSub: 'pre-tax face value' });
  if (hotZone === 0) focusPing(ctx, cx, cy - 176, g.sentenceT, 104);
  // legend — AUDIT T-03: the gold line measured ~854px from x=1066 and was
  // cut at the right frame edge (the scene's core money sentence, truncated).
  // Wrapped to two lines and the stack raised so the red line clears the
  // risk-note card at y=620.
  const la = clamp01((t - 1400) / 500);
  if (la > 0) {
    ctx.save();
    const lx = cx + 260, ly = cy - 92;
    setFont(ctx, 30, 700, FONT_UI);
    // the legend line a sentence owns runs at full ink; the other recedes
    ctx.globalAlpha = la * (hotZone >= 0 && hotZone !== 1 ? 0.45 : 1);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('$700,000 — yours', lx, ly);
    ctx.fillText('(at a 30% future rate)', lx, ly + 40);
    ctx.globalAlpha = la * (hotZone >= 0 && hotZone !== 2 ? 0.45 : 1);
    ctx.fillStyle = '#F08A8D';
    ctx.fillText('$300,000 — the government’s', lx, ly + 92);
    ctx.globalAlpha = 1;
    ctx.restore();
    if (hotZone === 1) focusPing(ctx, lx + 140, ly, g.sentenceT, 92);
    if (hotZone === 2) focusPing(ctx, lx + 190, ly + 92, g.sentenceT, 92);
  }
  // the risk note
  const na = clamp01((t - 2600) / 600);
  if (na > 0) {
    ctx.save();
    ctx.globalAlpha = na * (hotZone >= 0 && hotZone !== 3 ? 0.55 : 1);
    glassCard(ctx, W * 0.58, 620, 560, 140, { r: 14 });
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    wrapText(ctx, 'Park all your bonds in the IRA and the account you spend from is all equity — riskier than the spreadsheet says.', 500, 24, 600, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, W * 0.58 + 30, 620 + 46 + i * 36);
    });
    ctx.restore();
    // R-02 — the risk note is the hot zone from sentence 3 on: fresh gold
    // edge pulse on every sentence boundary
    if (hotZone === 3) {
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.5 * fresh;
      ctx.strokeStyle = PALETTE.goldBright;
      ctx.lineWidth = 2.2;
      roundRect(ctx, W * 0.58 - 12, 608, 584, 164, 18);
      ctx.stroke();
      ctx.restore();
      focusPing(ctx, W * 0.58 + 280, 690, g.sentenceT, 96);
    }
  }
  // S-05 — the Principal presents the split: palm open at the gold segment
  dataSceneFigure(g, 1.8, {
    seed: 33,
    mode: 'present',
    focal: (si) => (si >= 3 ? { x: W * 0.58 + 280, y: 620 } : si >= 1 ? { x: cx + 150, y: cy - 110 } : { x: cx - 60, y: cy - 170 }),
  });
}

// ── location value (30 vs 45+ bps) ───────────────────────────────────────────
export function bpsCompareScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Real money — but modest, and capped', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Lever 1 · What it’s worth' });
  // AUDIT §3.2 — D17 sentence-cadence wiring: sentence 1 walks the Vanguard
  // bar, 2 the Goldman bar, 3+ the capped-note — the listening element lifts,
  // the others recede.
  const bi = g.sentenceIdx != null && g.sentenceIdx >= 0 ? g.sentenceIdx : -1;
  const hotEl = bi < 1 ? -1 : bi === 1 ? 0 : bi === 2 ? 1 : 2;
  const x = W * 0.10, w = W * 0.62;
  // FIX F10 — the whole stack lifts so the last content line ends ~140px
  // above CAPTION_SAFE_TOP: the last 90px above the guard hold nothing but
  // air, and the two bottom lines can no longer merge into the caption pill
  // on phones. The closing note moves INTO the empty right column beside the
  // bars (it also fills the dead third there — F11's rule).
  barRow(ctx, { x, y: 370, w, h: 120, label: 'Vanguard simulations', value: 30, maxV: 60, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'up', valueText: 'up to 30 bps/yr' });
  if (hotEl === 1 || hotEl === 2) dimRect(ctx, x, 318, w, 234);
  if (hotEl === 0) focusPing(ctx, x + w * 0.52, 430, g.sentenceT, 104);
  barRow(ctx, { x, y: 550, w, h: 120, label: 'Goldman Sachs AM', value: 45, maxV: 60, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'gold', valueText: '45+ bps/yr', sub: 'high brackets + strategic allocation' });
  if (hotEl === 0 || hotEl === 2) dimRect(ctx, x, 498, w, 234);
  if (hotEl === 1) focusPing(ctx, x + w * 0.78, 610, g.sentenceT, 104);
  const na = clamp01((t - 2300) / 500);
  if (na > 0) {
    ctx.save();
    ctx.globalAlpha = na;
    setFont(ctx, 32, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.inkSoft;
    wrapText(ctx, 'Which is why the next lever matters more.', 380, 32, 600, FONT_DISPLAY).forEach((ln, i) => {
      ctx.fillText(ln, x + w + 60, 470 + i * 44);
    });
    ctx.restore();
  }

  // FIX G1 — bottom device: the beat's takeaway anchors the dead bottom band (baseline 740, inside CAPTION_SAFE_TOP 786)
  takeaway(ctx, W * 0.10, 740, W * 0.80, 'Harvesting is real money — modest, and capped at $3,000 a year.', clamp01((t - 2400) / 600));
}

// ── TLH mechanic (sell red → gold token → replacement) ───────────────────────
export function tlhMechanicScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, { tone: 'gold' });
  panelTitle(ctx, 'Sell the loss. Keep the exposure. Bank the tax asset.', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 2 · The mechanic' });

  const stepW = W * 0.26;
  // FIX F8 — fixed vertical rhythm per card, with RESERVED slots: visual
  // (cy), the BANK card's "TAX ASSET" tag, the stage label, two sub lines.
  // The old stack ran the TAX ASSET tag ~8px above the stage label and the
  // wrapped sub-caption 16px from the card bottom — the middle card (the one
  // the mechanism is named after) rendered as a cramped stack.
  const y = 460, hC = 290;
  const stages = [
    { label: 'SELL the position', sub: 'down 20% — realize the loss', x: W * 0.16, tone: 'down' },
    { label: 'BANK the loss', sub: 'offsets gains · $3,000/yr income · carries forward', x: W * 0.44, tone: 'gold' },
    { label: 'REPLACE, not identical', sub: 'similar exposure — never “substantially identical”', x: W * 0.72, tone: 'up' },
  ];
  stages.forEach((st, i) => {
    const ent = clamp01((t - 400 - i * 900) / 600);
    if (ent <= 0) return;
    ctx.save();
    ctx.globalAlpha = ent;
    const x = st.x;
    glassCard(ctx, x, y, stepW, hC, { r: 18, goldEdge: st.tone === 'gold', border: st.tone === 'down' ? rgba(PALETTE.down, 0.4) : st.tone === 'up' ? rgba(PALETTE.up, 0.4) : undefined });
    // stage visual — slot 1: centered at y+86
    const cx = x + stepW / 2, cy = y + 86;
    if (i === 0) {
      // red position falling
      const fall = easeInOutCubic(clamp01((t - 700) / 900));
      ctx.save();
      ctx.translate(cx, cy + fall * 20);
      const r = 42;
      const g2 = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      g2.addColorStop(0, '#B8434A');
      g2.addColorStop(1, PALETTE.downDeep);
      ctx.beginPath();
      // H2 — the stage circle IS the '-20%' label's own backdrop (owned)
      tagGraphic('band', () => ctx.arc(0, 0, r, 0, Math.PI * 2));
      ctx.fillStyle = g2;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      setFont(ctx, 28, 800, FONT_UI);
      ctx.textAlign = 'center';
      ctx.fillText('−20%', 0, 8);
      ctx.textAlign = 'left';
      ctx.restore();
    } else if (i === 1) {
      // the gold tax-asset token
      spinToken(ctx, cx, cy, 42, t, PALETTE.goldBright, PALETTE.gold, '$', 1600);
      const ta = clamp01((t - 1600) / 500);
      if (ta > 0) {
        ctx.save();
        ctx.globalAlpha = ta;
        setFont(ctx, 26, 700, FONT_UI);
        ctx.fillStyle = PALETTE.goldBright;
        ctx.textAlign = 'center';
        ctx.fillText('TAX ASSET', cx, cy + 62);
        ctx.textAlign = 'left';
        ctx.restore();
      }
    } else {
      // replacement position — similar but different
      ctx.save();
      ctx.translate(cx, cy);
      const r = 42;
      ctx.beginPath();
      // H2 — the 'similar / not identical' circle owns its label (owned)
      tagGraphic('band', () => ctx.arc(0, 0, r, 0, Math.PI * 2));
      const g3 = ctx.createLinearGradient(-r, -r, r, r);
      g3.addColorStop(0, hexLerp(PALETTE.up, '#0F3D2C', 0.2));
      g3.addColorStop(1, PALETTE.upDeep);
      ctx.fillStyle = g3;
      ctx.fill();
      ctx.strokeStyle = rgba(PALETTE.up, 0.8);
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(240,250,245,0.92)';
      setFont(ctx, 26, 700, FONT_UI);
      ctx.textAlign = 'center';
      ctx.fillText('similar', 0, -4);
      ctx.fillText('not identical', 0, 20);
      ctx.textAlign = 'left';
      ctx.restore();
    }
    // slot 2: the stage label — reserved baseline y+196
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'center';
    ctx.fillText(st.label, cx, y + 196);
    ctx.textAlign = 'left';
    // slot 3: two reserved sub lines, y+226 / y+256, ≥34px above the card foot
    // FIX F3 (frame audit) — 20px inkFaint is below the engine's own phone
    // legibility floor: narration-critical sub-labels floor at 26px inkMuted.
    setFont(ctx, 26, 500, FONT_UI);
    ctx.fillStyle = PALETTE.inkMuted;
    wrapText(ctx, st.sub, stepW - 60, 26, 500, FONT_UI).forEach((ln, li) => {
      ctx.fillText(ln, x + 30, y + 226 + li * 30);
    });
    ctx.restore();
    // connector — rides the visual row
    if (i > 0) {
      ctx.save();
      ctx.globalAlpha = clamp01((t - 400 - i * 900 + 300) / 300);
      ctx.beginPath();
      ctx.moveTo(st.x - 54, y + 86);
      ctx.lineTo(st.x - 8, y + 86);
      ctx.strokeStyle = rgba(PALETTE.gold, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(st.x - 18, y + 79);
      ctx.lineTo(st.x - 8, y + 86);
      ctx.lineTo(st.x - 18, y + 93);
      ctx.fillStyle = rgba(PALETTE.gold, 0.6);
      ctx.fill();
      ctx.restore();
    }
  });
}

// ── wash sale (61-day calendar bracket + destroyed loss) ─────────────────────
export function washSaleScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'The wash-sale rule: a 61-day window', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 2 · The guardrail' });
  // calendar bracket: 30 days before + sale + 30 days after
  const x = W * 0.16, y = 330, w = W * 0.68;
  const days = 61;
  const cellW = w / days;
  const saleIdx = 30;
  // AUDIT R-02 — D17 sentence-cadence wiring: sentences 0-1 walk the 61-day
  // calendar, sentences 2+ walk the destroyed-loss card — the zone in play
  // lifts, the other recedes, so the 42.9s hold changes emphasis per sentence.
  const hotZone = g.sentenceIdx != null && g.sentenceIdx >= 0 ? (g.sentenceIdx <= 1 ? 0 : 1) : -1;
  for (let i = 0; i < days; i++) {
    const ca = clamp01((t - 300 - i * 14) / 200);
    if (ca <= 0) continue;
    ctx.save();
    // FIX F1 (frame audit) — recede floor 0.45→0.55 and the day cells shift
    // toward the room hue (steel, 0.30) instead of a 0.18 wash: the calendar
    // read as a row of missing cells on the navy room.
    ctx.globalAlpha = ca * (hotZone === 1 ? 0.55 : 1);
    const isSale = i === saleIdx;
    ctx.fillStyle = isSale ? PALETTE.goldBright : rgba(PALETTE.steel, 0.30);
    roundRect(ctx, x + i * cellW + 1, y, cellW - 2, 44, 3);
    ctx.fill();
    ctx.restore();
  }
  // bracket labels
  const ba = clamp01((t - 1300) / 500);
  if (ba > 0) {
    ctx.save();
    ctx.globalAlpha = ba * (hotZone === 1 ? 0.5 : 1);
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('30 days before', x, y + 78);
    ctx.textAlign = 'right';
    ctx.fillText('30 days after', x + w, y + 78);
    ctx.textAlign = 'left';
    setFont(ctx, 28, 800, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.textAlign = 'center';
    ctx.fillText('SALE', x + (saleIdx + 0.5) * cellW, y + 78);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  // the destroyed loss — IRA repurchase
  const da = clamp01((t - 2600) / 500);
  if (da > 0) {
    ctx.save();
    ctx.globalAlpha = da * (hotZone === 0 ? 0.55 : 1);
    glassCard(ctx, W * 0.16, 560, W * 0.68, 200, { r: 16, alpha: hotZone === 0 ? 0.55 : 1, border: rgba(PALETTE.down, 0.5) });
    setFont(ctx, 30, 700, FONT_UI);
    ctx.fillStyle = '#F08A8D';
    ctx.fillText('Repurchase inside an IRA — or your spouse’s:', W * 0.16 + 40, 630);
    setFont(ctx, 40, 800, FONT_DISPLAY);
    goldFillText(ctx, 'the loss is destroyed. Permanently.', W * 0.16 + 40, 700, 40, 800, FONT_DISPLAY);
    setFont(ctx, 28, 500, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('IRS Rev. Rul. 2008-5 · no basis adjustment on the other side', W * 0.16 + 40, 736);
    ctx.restore();
    softBloom(ctx, W, H, t - 2900, 300, 0.08);
  }
}

// ── G6 — FAJ waterfall ───────────────────────────────────────────────────────
export function waterfallScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'The independent benchmark: 1.08% → what actually survives', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 2 · FAJ 76(3), 2020' });
  // AUDIT R-02 — D17 sentence-cadence wiring: sentences 0-1 set up the study
  // (side note leads), sentences 2-4 walk the columns (chart leads). The
  // listening zone lifts, the other recedes.
  const wi = g.sentenceIdx != null && g.sentenceIdx >= 0 ? g.sentenceIdx : -1;
  const chartHot = wi < 0 || wi >= 2;
  ctx.save();
  ctx.globalAlpha = chartHot ? 1 : 0.55;
  // S-05 — chart zone shifts right of the figure margin (figure spans x≈90..330)
  waterfall(ctx, W * 0.34, 300, W * 0.40, 390, [
    { label: 'Gross alpha', value: 1.08, tone: 'gold', valueText: '1.08%' },
    { label: 'Wash-sale rule', value: 0.82, tone: 'down', valueText: '0.82%' },
    { label: 'After 13 bps costs', value: 0.95, tone: 'up', valueText: '0.95%' },
  ], clamp01(t / 2400), t);
  ctx.restore();
  if (wi >= 4) focusPing(ctx, W * 0.34 + W * 0.40 * (5 / 6), 340, g.sentenceT, 84);
  // AUDIT §2.4 — each waterfall column LANDS with a gold puff at its base
  for (let i = 0; i < 3; i++) {
    const colW2 = (W * 0.40) / 3;
    impactPuff(ctx, W * 0.34 + colW2 * i + colW2 * 0.62, 300 + 390 - 12, t, Math.round((0.16 * i + 0.3) * 2400), { scale: 1.05 });
  }
  // side note
  const na = clamp01((t - 2200) / 500);
  if (na > 0) {
    ctx.save();
    ctx.globalAlpha = na * (wi >= 2 ? 0.55 : 1);
    glassCard(ctx, W * 0.82, 400, 300, 220, { r: 14, alpha: wi >= 2 ? 0.55 : 1 });
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    // FIX F3 — the spec caption wraps at 26px (was 22px, below the floor)
    wrapText(ctx, 'Monthly harvesting · 500 largest US stocks · 1926–2018', 250, 26, 600, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, W * 0.82 + 26, 450 + i * 34);
    });
    ctx.restore();
  }
  // S-05 — the Principal catches the waterfall's last column: open palm
  // presented under the surviving alpha
  dataSceneFigure(g, 1.8, {
    seed: 31,
    mode: 'present',
    focal: () => ({ x: W * 0.34 + W * 0.40 * (5 / 6), y: 545 }),
  });
}

// ── era bars (volatility feeds it) ───────────────────────────────────────────
export function eraBarsScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  // FIX F1 — capture the title block's MEASURED bottom: the verdict's y is
  // derived from it, never a fixed 190 (which shared the title band on every
  // play of the Act IV centerpiece).
  const titleBottom = panelTitle(ctx, 'A volatility strategy: it feeds on dispersion', W * 0.10, 210, W * 0.62, t / 2400, { kickerText: 'Lever 2 · 1926–2018, four eras' });
  const cols = [
    { label: '1926–49\nDepression', value: 2.13, tone: 'gold' },
    { label: '1949–72\nPostwar boom', value: 0.51, tone: 'platinum' },
    { label: '1972–95\nVolatility', value: 1.08, tone: 'gold' },
    { label: '1995–2018\nBull market', value: 0.81, tone: 'platinum' },
  ];
  const maxH = 390, baseY = 650;
  const colW = 150, gap = 90;
  // S-05 — column group shifts right of the figure margin
  const x0 = W * 0.63 - (colW * 4 + gap * 3) / 2;
  // U4.1 — the narration walks the eras: each sentence discusses one era, the
  // others dim to 42% so a visible change lands with the words. Sentence map:
  // 1 → Depression, 2 → postwar boom, 3-4 → 1972-95 volatility, 5 → bull market.
  const idx = g.sentenceIdx ?? -1;
  const hotEra = idx < 0 ? -1 : idx <= 1 ? 0 : idx === 2 ? 1 : idx <= 4 ? 2 : 3;
  cols.forEach((c, i) => {
    const ent = clamp01((t - 300 - i * 380) / 700);
    if (ent <= 0) return;
    const dim = hotEra >= 0 && i !== hotEra;
    const cx = x0 + i * (colW + gap) + colW / 2;
    ctx.save();
    ctx.globalAlpha = ent * (dim ? 0.42 : 1);
    column(ctx, {
      cx, baseY, maxH, maxV: 2.2, value: c.value,
      p: ent, t, tone: c.tone as any, valueText: `${c.value.toFixed(2)}%`,
      label: c.label.split('\n')[0], width: colW, landT: 300 + i * 380 + 700,
    });
    setFont(ctx, 28, 500, FONT_UI);
    // AUDIT T-07 — dimmed era sub-labels are narration-critical; inkMuted
    // keeps them above the phone-contrast floor even in the dimmed state
    ctx.fillStyle = dim ? PALETTE.inkMuted : PALETTE.inkSoft;
    ctx.textAlign = 'center';
    ctx.fillText(c.label.split('\n')[1], cx, baseY + 62);
    ctx.textAlign = 'left';
    ctx.restore();
    // U3.3 — the eye lands on the era being narrated
    if (i === hotEra && ent >= 1) {
      focusPing(ctx, cx, baseY - maxH * (c.value / 2.2) - 24, g.sentenceT, 84);
    }
  });
  // verdict (right column) — FIX F1: starts BELOW the title block's measured
  // bottom (gutter 30px). At that height the era columns' value texts (their
  // tops sit at y ≥ 438 in this x-range) stay clear, and the caption guard is
  // untouched — the collision can no longer occur at any wrap/width.
  const va = clamp01((t - 2200) / 500);
  if (va > 0) {
    ctx.save();
    ctx.globalAlpha = va;
    setFont(ctx, 34, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.textAlign = 'right';
    ctx.fillText('In a straight-line bull market, it starves.', W * 0.90, titleBottom + 52);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  // S-05 — the Principal WEIGHS two eras against each other (report §6.4):
  // both palms present under the narrated era and its neighbour, hands
  // tracking the D17 sentence walk
  dataSceneFigure(g, 1.8, {
    seed: 32,
    weigh: true,
    mode: 'present',
    focal: (si) => {
      const he = si < 0 ? 0 : si <= 1 ? 0 : si === 2 ? 1 : si <= 4 ? 2 : 3;
      const cx2 = x0 + he * (colW + gap) + colW / 2;
      return { x: cx2, y: baseY - maxH * (cols[he].value / 2.2) - 20 };
    },
  });
}

// ── vendor vs independent ────────────────────────────────────────────────────
export function vendorCompareScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Both are real. Only one is disinterested.', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Lever 2 · Read the footnote' });
  const cards = [
    { x: W * 0.10, big: '0.8–1.0%', label: 'independent research', sub: 'FAJ — wash-sale compliant, after costs', tone: 'gold' },
    { x: W * 0.54, big: '2.3%', label: 'vendor research', sub: 'Aperio — sells direct indexing; needs short-term gains to offset', tone: 'platinum' },
  ];
  // AUDIT R-02 — D17 sentence-cadence wiring: sentences 0/3 light the vendor
  // plate, 2/5 the independent plate, 4 holds both — the plates trade the
  // spotlight instead of holding one layout for 31s.
  const vi = g.sentenceIdx != null && g.sentenceIdx >= 0 ? g.sentenceIdx : -1;
  const hotCard = vi < 0 ? -1 : vi === 0 || vi === 3 ? 1 : vi === 2 || vi === 5 ? 0 : -1;
  cards.forEach((c, i) => {
    const ent = clamp01((t - 300 - i * 500) / 700);
    if (ent <= 0) return;
    const dim = hotCard >= 0 && i !== hotCard;
    ctx.save();
    ctx.globalAlpha = ent;
    // AUDIT K-04 — the cards used to end at y≈650, leaving a ~300px dead band
    // above the caption zone. Enlarged + dropped: they now carry down to 740,
    // inside the caption guard, so the composition fills the lower half.
    // FIX F6 — the non-narrated plate recedes via its OWN alpha (0.62): the
    // 0.8–1.0% / 2.3% values are never washed under a dim overlay.
    statCard(ctx, { x: c.x, y: 350, w: W * 0.36, h: 390, big: c.big, label: c.label, sub: c.sub, p: ent, tone: c.tone as any, bigSize: i === 0 ? 84 : 100, goldEdge: i === 0 || i === hotCard, alpha: dim ? 0.62 : 1 });
    ctx.restore();
    if (i === hotCard) focusPing(ctx, c.x + W * 0.18, 545, g.sentenceT, 100);
  });

  // FIX G1 — bottom device: the beat's takeaway anchors the dead bottom band (baseline 740, inside CAPTION_SAFE_TOP 786)
  takeaway(ctx, W * 0.10, 740, W * 0.80, 'Same exposure — 9 bps of fee can hide 45+ bps of tax drag.', clamp01((t - 2400) / 600));
}

// ── Wealthfront production case ──────────────────────────────────────────────
export function wealthfrontCaseScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, { tone: 'gold' });
  goldDust(ctx, W, H, t, 33, 0.9);
  panelTitle(ctx, 'In production: the frequency argument in one number', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 2 · Wealthfront, 2025' });
  // two stat plates (chart lives INSIDE the second card, below its label)
  // FIX F6 — the $161M plate recedes via its OWN alpha (0.62) when the tariff
  // card is narrated: the value text is never washed under a dim overlay.
  statCard(ctx, { x: W * 0.10, y: 330, w: 520, h: 300, big: '$161M', label: 'client tax savings, 2025', p: clamp01((t - 300) / 800), tone: 'gold', bigSize: 92, alpha: g.sentenceIdx != null && g.sentenceIdx >= 3 ? 0.62 : 1 });
  const ent2 = clamp01((t - 1400) / 700);
  if (ent2 > 0) {
    ctx.save();
    ctx.globalAlpha = ent2;
    const cardX = W * 0.54, cardY = 330, cardW = 560, cardH = 300;
    glassCard(ctx, cardX, cardY, cardW, cardH, { r: 22, alpha: g.sentenceIdx != null && g.sentenceIdx === 2 ? 0.55 : 1, border: rgba(PALETTE.up, 0.4) });
    setFont(ctx, 28, 700, FONT_UI);
    try { (ctx as any).letterSpacing = '4px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('LOSSES HARVESTED IN 3 DAYS', cardX + 44, cardY + 62);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    goldFillText(ctx, '$100M', cardX + 44, cardY + 136, 80, 800, FONT_DISPLAY);
    // 3-day mini chart inside the card — AUDIT T-04: the tariff label used to
    // start at x+w2*0.24 with no wrap (~508px) and crossed the card border;
    // it now wraps to two lines inside the card above the shifted chart.
    const x = cardX + 44, y = cardY + 206, w2 = cardW - 90, h2 = 64;
    ctx.strokeStyle = rgba(PALETTE.inkSoft, 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) { const gy = y + (h2 / 3) * i; ctx.moveTo(x, gy); ctx.lineTo(x + w2, gy); }
    ctx.stroke();
    const path = (c: CanvasRenderingContext2D) => {
      c.moveTo(x, y + h2 * 0.2);
      c.lineTo(x + w2 * 0.35, y + h2 * 0.75);
      c.lineTo(x + w2 * 0.6, y + h2 * 0.9);
      c.lineTo(x + w2, y + h2 * 0.55);
    };
    glowLine(ctx, path, '#F08A8D', 3.2, 10);
    ctx.fillStyle = rgba(PALETTE.gold, 0.14);
    ctx.fillRect(x + w2 * 0.35, y, w2 * 0.25, h2);
    ctx.strokeStyle = rgba(PALETTE.gold, 0.6);
    ctx.strokeRect(x + w2 * 0.35, y, w2 * 0.25, h2);
    // AUDIT T-04 — wrapped to two lines, left-aligned at the card interior
    setFont(ctx, 24, 700, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('APRIL TARIFF SELLOFF', x, cardY + 168);
    ctx.fillText('— THE 3 DAYS', x, cardY + 192);
    ctx.restore();
  }

  // FIX G1 — bottom device: the beat's takeaway anchors the dead bottom band (baseline 740, inside CAPTION_SAFE_TOP 786)
  takeaway(ctx, W * 0.10, 740, W * 0.80, 'Published results are gross until taxed — ask for the after-tax column.', clamp01((t - 2400) / 600));
}

// ── decay curve (tax alpha decays) ───────────────────────────────────────────
export function decayCurveScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Tax alpha decays — deferral, not forgiveness', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Lever 2 · The catch' });
  // AUDIT R-02 — D17 sentence-cadence wiring, full walk: sentence 0 owns the
  // ~8% annotation, sentences 1-2 walk the decay curve itself (the ping
  // slides along the curve — a moving hot spot on the data), 3+ the deferral
  // truth card with headline ↔ gold-line alternating focus. The 38s hold
  // breathes with the sentences instead of freezing after one reveal.
  const siDC = g.sentenceIdx ?? -1;
  const hotZone = siDC < 0 ? -1 : siDC === 0 ? 0 : siDC <= 2 ? 1 : 2;
  const fresh = g.sentenceT != null ? clamp01(1 - g.sentenceT / 900) : 0;
  ctx.save();
  ctx.globalAlpha = hotZone === 2 ? 0.5 : 1;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 30; i++) pts.push([i, 8 * Math.exp(-i / 6)]);
  lineChart(ctx, {
    x: W * 0.10, y: 340, w: W * 0.52, h: 400,
    series: [{ tone: 'gold', points: pts, width: 5 }],
    p: clamp01(t / 2200), t,
    yMin: 0, yMax: 9, yFormat: (v) => `${v.toFixed(0)}%`,
    xLabels: ['new', 'yr 5', 'yr 15', 'yr 30'],
    gridLines: 3, fill: true,
    annotations: [{ at: 0.03, label: 'new accounts: ~8%', tone: 'gold' }],
  });
  ctx.restore();
  // the walking ping: sentence 0 at the ~8% annotation, sentence 1 a quarter
  // into the decay, sentence 2 at the tail the narration lands on
  const chartX = W * 0.10, chartW = W * 0.52, chartY = 340, chartH = 400;
  const decayY = (frac: number) => {
    const v = 8 * Math.exp(-(30 * frac) / 6);
    return chartY + chartH * (1 - v / 9);
  };
  if (hotZone === 0) focusPing(ctx, chartX + 0.03 * chartW, decayY(0.03), g.sentenceT, 104);
  if (hotZone === 1) focusPing(ctx, chartX + (siDC === 1 ? 0.25 : 0.55) * chartW, decayY(siDC === 1 ? 0.25 : 0.55), g.sentenceT, 104);
  if (hotZone >= 0) {
    const hx = hotZone === 2 ? W * 0.68 - 12 : chartX - 12;
    const hy = hotZone === 2 ? 340 - 12 : chartY - 12;
    const hw = hotZone === 2 ? 484 : chartW + 24;
    const hh = hotZone === 2 ? 424 : chartH + 24;
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.5 * fresh;
    ctx.strokeStyle = PALETTE.goldBright;
    ctx.lineWidth = 2.2;
    roundRect(ctx, hx, hy, hw, hh, 16);
    ctx.stroke();
    ctx.restore();
  }
  // the deeper truth card
  const ta = clamp01((t - 1800) / 600);
  if (ta > 0) {
    ctx.save();
    ctx.globalAlpha = ta * (hotZone < 2 ? 0.55 : 1);
    glassCard(ctx, W * 0.68, 340, 460, 400, { r: 16, alpha: hotZone === 2 ? 1 : 0.55, goldEdge: true });
    setFont(ctx, 34, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    wrapText(ctx, 'Every harvested loss lowers your basis — a bigger gain waiting later.', 360, 34, 700, FONT_DISPLAY).forEach((ln, i) => {
      ctx.fillText(ln, W * 0.68 + 40, 410 + i * 48);
    });
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    wrapText(ctx, 'Permanent only if donated, or stepped up at death.', 380, 22, 600, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, W * 0.68 + 40, 620 + i * 32);
    });
    ctx.restore();
    // R-02 — inside the card, the eye alternates headline ↔ gold line
    if (hotZone === 2 && ta >= 1) {
      focusPing(ctx, W * 0.68 + 220, siDC % 2 === 0 ? 470 : 628, g.sentenceT, 88);
    }
  }
}

// ── the SEC case (score OUT — press-release aesthetic) ───────────────────────
export function secCaseScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  // dim the stage — the music is out; the room is quiet
  paintStage(ctx, W, H, t, { tone: 'down', grid: 0.4, sheen: 0.2 });
  ctx.fillStyle = rgba('#05080F', 0.35);
  ctx.fillRect(0, 0, W, H);
  // S-05 — the press-release card shifts right of the figure margin
  const x = W * 0.20, y = 220, w = W * 0.5, h = 560;
  const ent = springTo(0.92, 1, Math.min(800, t), 150, 15);
  // AUDIT R-02 — D17 sentence-cadence wiring: sentence 1 walks the $9M press
  // lines, 2-3 the stamp, 4 the verdict — the zones trade the spotlight so
  // the case file changes emphasis with the narration.
  const zi = g.sentenceIdx != null && g.sentenceIdx >= 0 ? (g.sentenceIdx <= 1 ? 0 : g.sentenceIdx <= 3 ? 1 : 2) : -1;
  ctx.save();
  ctx.globalAlpha = clamp01(t / 300) * (zi >= 1 ? 0.72 : 1);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(ent, ent);
  ctx.translate(-w / 2, -h / 2);
  glassCard(ctx, 0, 0, w, h, { r: 8, alpha: zi >= 1 ? 0.72 : 1, fill: 'rgba(232,226,210,0.10)', border: rgba(PALETTE.inkSoft, 0.3) });
  setFont(ctx, 28, 800, FONT_UI);
  try { (ctx as any).letterSpacing = '4px'; } catch { /* noop */ }
  ctx.fillStyle = PALETTE.inkFaint;
  ctx.fillText('SECURITIES AND EXCHANGE COMMISSION', 50, 70);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  setFont(ctx, 30, 800, FONT_UI);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('Press Release 2023-80 · April 18, 2023', 50, 120);
  // highlighted key lines
  const lines = [
    { text: 'Betterment paid $9 million', hot: true },
    { text: 'coding errors + undisclosed changes', hot: false },
    { text: '25,000+ client accounts affected', hot: false },
    { text: '≈ $4M in tax benefits lost', hot: true },
  ];
  lines.forEach((ln, i) => {
    const la = clamp01((t - 600 - i * 480) / 460);
    if (la <= 0) return;
    ctx.save();
    ctx.globalAlpha = la;
    if (ln.hot) {
      ctx.fillStyle = rgba(PALETTE.gold, 0.12);
      // H2 — the hot-row tile is the text's own backdrop (owned)
      tagGraphic('band', () => ctx.fillRect(40, 190 + i * 74, w - 90, 54));
      ctx.strokeStyle = rgba(PALETTE.gold, 0.5);
      ctx.lineWidth = 1.2;
      tagGraphic('band', () => ctx.strokeRect(40, 190 + i * 74, w - 90, 54));
    }
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = ln.hot ? PALETTE.goldBright : PALETTE.inkSoft;
    ctx.fillText(ln.text, 56, 190 + i * 74 + 37);
    ctx.restore();
  });
  ctx.restore();
  // the verdict stamp
  const stampT = t - 3200;
  if (stampT > 0) {
    const e = easeOutCubic(clamp01(stampT / 240));
    const shake = microShake(t, 3200, 8);
    ctx.save();
    ctx.globalAlpha = clamp01(t / 300);
    ctx.translate(W * 0.78 + shake.dx, H * 0.42 + shake.dy);
    ctx.rotate(-0.04);
    ctx.scale(e, e);
    setFont(ctx, 40, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '6px'; } catch { /* noop */ }
    const label = 'SEC · $9M';
    const tw = ctx.measureText(label).width + 70;
    ctx.strokeStyle = rgba(PALETTE.down, 0.92);
    ctx.lineWidth = 4;
    roundRect(ctx, -tw / 2, -52, tw, 104, 12);
    ctx.stroke();
    ctx.fillStyle = rgba(PALETTE.down, 0.10);
    ctx.fill();
    ctx.fillStyle = '#F08A8D';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 16);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    ctx.textAlign = 'left';
    ctx.restore();
    impactRing(ctx, W * 0.78, H * 0.42, t, 3200, 200, 1.2, PALETTE.down);
    // AUDIT §2.4 — the stamp SLAMS: gold puff + tightened shadow at contact
    impactPuff(ctx, W * 0.78, H * 0.42 + 58, t, 3200, { scale: 1.25 });
  }
  // closing line (right column, clear of captions)
  // AUDIT K-07 — the verdict wrapped 560px from x=1344 and ended ~1904, 16px
  // off the right edge (flush-to-edge text reads as accidentally cropped
  // beside the rotated stamp). Column moved to x=W*0.72 with a 376px wrap:
  // every line now ends ≤ 1760, with a gutter off the press card.
  const ca = clamp01((t - 4200) / 600);
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha = ca;
    setFont(ctx, 38, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    wrapText(ctx, 'Tax alpha you can’t verify is just a brochure.', 376, 38, 600, FONT_DISPLAY).forEach((ln, i) => {
      ctx.fillText(ln, W * 0.72, 560 + i * 54);
    });
    ctx.restore();
  }
  // S-05 — the Principal stands in the case's left margin and DUCKS out of
  // the way when the SEC stamp slams in (report §6.4); before that he points
  // at the document's $4M hot line. M-03 — the stamp also lands ON the body:
  // a compress + spring recoil at t=3200.
  dataSceneFigure(g, 1.8, {
    seed: 34,
    mood: 'urgent',
    avoid: t > 3200,
    impactT: 3200,
    // U2 re-aim — the aim was the card's LOCAL row-3 y (436); the card renders
    // through the spring transform (translate centre → scale → translate back),
    // which lands row 3's line end at screen y ≈ 656. The baton pointed 220px
    // above the datum. Aim now matches the transformed card at rest (ent→1):
    // x = card right edge − 110, y = y + h/2 + (rowY + 20 − h/2).
    focal: (si) => (si <= 3
      ? { x: x + w / 2 + (w - 110 - w / 2), y: y + h / 2 + (194 + 3 * 74 + 20 - h / 2) }
      : null),
  });
}
