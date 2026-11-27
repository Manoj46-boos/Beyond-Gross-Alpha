/**
 * AURUM data scenes — The Wrapper + The Advanced Tier.
 * plumbing · heartbeat · distribBars · taxManaged · pitchDeck · diMosaic ·
 * diDecay · exchangeFund · longShort · elmVerdict
 */

import { SceneCtx } from './scene-context';
import { PALETTE, rgba, setFont, wrapText, glassCard, roundRect, goldFillText, FONT_DISPLAY, FONT_UI, kicker, chip, hexLerp, fitText, dimRect } from './theme';
import { clamp01, easeOutCubic, easeInOutCubic, springTo, hash01 } from './easing';
import { goldDust, impactRing, softBloom, glowLine, spinToken, floatY, microShake, focusPing } from './fx';
import { panelTitle, barRow, statCard, lineChart } from './charts';
import { paintStage } from './stage';
import { dataSceneFigure } from './scenes-figure';

// ── plumbing: mutual fund redemption vs ETF in-kind ──────────────────────────
export function plumbingScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Same index, same stocks — different tax outcome', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 3 · The wrapper' });
  const showMutual = (s.mode ?? 'mutual') === 'mutual';
  const x = W * 0.10, w = W * 0.80, y = 330, h = 380;
  const ent = clamp01(t / 500);
  ctx.save();
  ctx.globalAlpha = ent;
  if (showMutual) {
    // MUTUAL FUND: redemption → manager sells → gains spray
    glassCard(ctx, x, y, w, h, { r: 18, border: rgba(PALETTE.down, 0.35) });
    setFont(ctx, 28, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '3px'; } catch { /* noop */ }
    ctx.fillStyle = '#F08A8D';
    ctx.fillText('MUTUAL FUND', x + 40, y + 56);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    // flow boxes
    const boxes = [
      { label: 'You redeem', x: x + 60 },
      { label: 'Manager sells holdings', x: x + w * 0.38 },
      { label: 'Gains sprayed to ALL holders', x: x + w * 0.66 },
    ];
    boxes.forEach((b, i) => {
      const ba = clamp01((t - 500 - i * 450) / 400);
      if (ba <= 0) return;
      ctx.save();
      ctx.globalAlpha = ba;
      glassCard(ctx, b.x, y + 120, 300, 90, { r: 12, shadow: false, border: i === 2 ? rgba(PALETTE.down, 0.5) : undefined });
      setFont(ctx, 28, 700, FONT_UI);
      ctx.fillStyle = i === 2 ? '#F08A8D' : PALETTE.ink;
      wrapText(ctx, b.label, 270, 24, 700, FONT_UI).forEach((ln, li) => ctx.fillText(ln, b.x + 24, y + 155 + li * 30));
      ctx.restore();
      if (i < 2) {
        const aa = clamp01((t - 800 - i * 450) / 300);
        ctx.save();
        ctx.globalAlpha = aa;
        ctx.beginPath();
        ctx.moveTo(b.x + 306, y + 165);
        ctx.lineTo(b.x + 352, y + 165);
        ctx.strokeStyle = rgba(PALETTE.down, 0.7);
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.x + 344, y + 158);
        ctx.lineTo(b.x + 354, y + 165);
        ctx.lineTo(b.x + 344, y + 172);
        ctx.fillStyle = rgba(PALETTE.down, 0.7);
        ctx.fill();
        ctx.restore();
      }
    });
    // the December/March trap line
    const ta = clamp01((t - 2400) / 500);
    if (ta > 0) {
      ctx.save();
      ctx.globalAlpha = ta;
      setFont(ctx, 28, 600, FONT_DISPLAY);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText('Buy in December → owe taxes on gains realized in March, before you owned a share.', x + 40, y + 320);
      ctx.restore();
    }
  } else {
    // ETF: in-kind basket swap — no sale
    glassCard(ctx, x, y, w, h, { r: 18, goldEdge: true });
    setFont(ctx, 28, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '3px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('ETF', x + 40, y + 56);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    const boxes = [
      { label: 'You redeem', x: x + 60 },
      { label: 'In-kind basket swap', x: x + w * 0.38 },
      { label: 'No sale. No realized gain.', x: x + w * 0.66 },
    ];
    boxes.forEach((b, i) => {
      const ba = clamp01((t - 400 - i * 450) / 400);
      if (ba <= 0) return;
      ctx.save();
      ctx.globalAlpha = ba;
      glassCard(ctx, b.x, y + 120, 300, 90, { r: 12, shadow: false, goldEdge: i === 2, border: i === 2 ? rgba(PALETTE.gold, 0.4) : undefined });
      setFont(ctx, 28, 700, FONT_UI);
      ctx.fillStyle = i === 2 ? PALETTE.goldBright : PALETTE.ink;
      wrapText(ctx, b.label, 270, 24, 700, FONT_UI).forEach((ln, li) => ctx.fillText(ln, b.x + 24, y + 155 + li * 30));
      ctx.restore();
    });
  }
  ctx.restore();
  // AUDIT R-06 — the mid-roll promise: the intro's "stay to the end" gets a
  // re-hook at the Lever-3 boundary. A gold ribbon rides the re-hook
  // sentence ("keep watching — the five questions…"), top-right, clear of
  // the diagram, the title block and the caption band.
  const rehook = g.sentenceIdx != null && g.sentenceCount != null && g.sentenceCount > 1 && g.sentenceIdx === g.sentenceCount - 1
    ? clamp01((g.sentenceT ?? 0) / 400)
    : 0;
  if (rehook > 0) {
    ctx.save();
    ctx.globalAlpha = rehook;
    const rx = W * 0.70, ry = 108, rw = 460, rh = 96;
    glassCard(ctx, rx, ry, rw, rh, { r: 14, goldEdge: true });
    setFont(ctx, 24, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '4px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('LATER IN THIS VIDEO', rx + 32, ry + 38);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText('The five questions — ready to send.', rx + 32, ry + 70);
    ctx.restore();
  }
}

// ── heartbeat + $48B token ───────────────────────────────────────────────────
export function heartbeatScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, { tone: 'gold' });
  goldDust(ctx, W, H, t, 41, 1);
  panelTitle(ctx, 'Heartbeat trades: the quiet machinery', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 3 · In-kind' });
  // AUDIT R-02 — D17 sentence-cadence wiring: the narration walks the
  // pulse/token → the $48B card → the file-it-away line; the active zone
  // lifts, the others recede, so the 42s hold changes with the sentences.
  const hi = g.sentenceIdx != null && g.sentenceIdx >= 0 ? (g.sentenceIdx <= 2 ? 0 : g.sentenceIdx <= 4 ? 1 : 2) : -1;
  // FIX F7 — the left half is never a void: the ETF token and its label chip
  // stay on-frame for the WHOLE beat (receded to 0.5 when another zone is
  // narrated), and the pulse ring floors at 0.30 instead of washing out.
  const pulse = (t / 1100) % 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0.30, 0.5 * (1 - pulse)) * (hi === 0 || hi < 0 ? 1 : 0.6);
  ctx.beginPath();
  ctx.arc(W * 0.30, H * 0.52, 90 + pulse * 160, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(PALETTE.gold, 0.5);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = hi === 0 || hi < 0 ? 1 : 0.5;
  spinToken(ctx, W * 0.30, H * 0.52, 64, t, PALETTE.goldBright, PALETTE.gold, 'ETF', 1500);
  ctx.restore();
  // the anchor's label — a quiet gold chip that keeps the zone NAMED even
  // while the $48B card holds the spotlight
  const la = clamp01((t - 800) / 500);
  if (la > 0) {
    ctx.save();
    ctx.globalAlpha = la * (hi === 0 || hi < 0 ? 1 : 0.55);
    chip(ctx, 'IN-KIND SWAP · NO SALE', W * 0.30, H * 0.52 + 118, { size: 26, gold: true });
    ctx.restore();
  }
  // the $48B counter
  const ca = clamp01((t - 1600) / 700);
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha = ca * (hi === 1 || hi < 0 ? 1 : 0.55);
    glassCard(ctx, W * 0.55, 310, 640, 260, { r: 18, alpha: hi === 1 || hi < 0 ? 1 : 0.55, goldEdge: true });
    // AUDIT T-02 — the provenance label measured ~836px and ran past both the
    // card and the frame edge; fitText keeps it inside the card interior
    // (560px) instead.
    fitText(ctx, 'US TREASURY COST, PER YEAR (BLOOMBERG EST.)', W * 0.55 + 40, 370, 560, 28, 700, FONT_UI, PALETTE.inkFaint, 18);
    goldFillText(ctx, '$48,000,000,000', W * 0.55 + 40, 470, 68, 800, FONT_DISPLAY);
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.fillText('the top 1% collect most of the benefit', W * 0.55 + 40, 525);
    ctx.restore();
    if (hi === 1) focusPing(ctx, W * 0.55 + 320, 470, g.sentenceT, 110);
    impactRing(ctx, W * 0.55 + 320, 490, t, 1600, 180, 1, PALETTE.gold);
  }
  // L-02 — "File that away…" renders INSIDE the $48B card (was baseline
  // y=800, half-hidden under the caption pill whose top sits at ≈796)
  const fa = clamp01((t - 3400) / 500);
  if (fa > 0) {
    ctx.save();
    ctx.globalAlpha = fa * (hi === 2 || hi < 0 ? 1 : 0.55);
    setFont(ctx, 28, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.textAlign = 'center';
    ctx.fillText('File that away. We\'ll come back to it.', W * 0.55 + 320, 554);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

// ── G7 — distributions scoreboard (57% vs 6%) ────────────────────────────────
export function distribBarsScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'The scoreboard: capital-gains distributions, 2025', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Lever 3 · State Street' });
  // AUDIT R-02 — D17 sentence-cadence wiring: sentence 0 owns the 57%
  // mutual-fund bar, sentence 1 the 6% ETF bar, 2 holds both in overview,
  // 3+ the "structural moat" punchline with the bars receding — the frame's
  // emphasis changes with every sentence of the 40s scoreboard.
  const siDB = g.sentenceIdx ?? -1;
  const hotZone = siDB < 0 ? -1 : siDB === 0 ? 0 : siDB === 1 ? 1 : siDB === 2 ? 3 : 2;
  const fresh = g.sentenceT != null ? clamp01(1 - g.sentenceT / 900) : 0;
  // S-05 — bars shift right of the figure margin (figure spans x≈90..330)
  const x = W * 0.30, w = W * 0.42;
  ctx.save();
  ctx.globalAlpha = hotZone === 1 || hotZone === 2 ? 0.45 : 1;
  barRow(ctx, { x, y: 345, w, h: 120, label: 'Equity mutual funds', value: 57, maxV: 100, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'down', valueText: '57%' });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = hotZone === 0 || hotZone === 2 ? 0.45 : 1;
  // FIX F3 — barRow returns the ETF row's FILLED TIP: the punchline's contact
  // devices anchor to it instead of painting over the verdict text.
  const tipEtf = barRow(ctx, { x, y: 535, w, h: 120, label: 'Equity ETFs', value: 6, maxV: 100, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'up', valueText: '6%' });
  ctx.restore();
  if (hotZone === 0) dimRect(ctx, x, 535, w, 120);
  if (hotZone === 1) dimRect(ctx, x, 345, w, 120);
  if (hotZone === 2) dimRect(ctx, x, 345, w, 310);
  if (hotZone === 0) focusPing(ctx, x + w * 0.5, 405, g.sentenceT, 100);
  if (hotZone === 1) focusPing(ctx, x + w * 0.5, 595, g.sentenceT, 100);
  const ma = clamp01((t - 2200) / 500);
  if (ma > 0) {
    ctx.save();
    ctx.globalAlpha = ma * (hotZone === 0 || hotZone === 1 ? 0.45 : 1);
    setFont(ctx, 40, 800, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('A structural moat.', x + w + 60, 660);
    ctx.restore();
    // FIX F3 — the eye-landing ring frames the 6% BAR TIP (the datum the
    // moat is made of), never the middle of the verdict words it points at.
    if (hotZone === 2 && ma >= 1) {
      focusPing(ctx, tipEtf + 6, 595, g.sentenceT, 96);
    }
  }
  // S-05 — the Principal leans on the 57%/6% bars (report §6.4): open palm
  // presented at the bar being narrated, per sentence. M-03 — his body
  // answers each bar landing (landT 1250 / 2250 in barRow).
  // FIX F3 — during the punchline sentences the focal moves OFF the "A
  // structural moat." block onto the empty track beside the 6% tip: the
  // pointing arm marks the datum instead of crossing the words.
  dataSceneFigure(g, 1.42, {
    seed: 41,
    mode: 'present',
    impactT: t >= 2250 ? 2250 : t >= 1250 ? 1250 : undefined,
    focal: (si) => (si <= 1 ? { x: x + w - 70, y: si === 0 ? 460 : 650 } : { x: tipEtf + 150, y: 640 }),
  });
}

// ── tax-managed funds (7.16 vs 6.76) ─────────────────────────────────────────
export function taxManagedScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'The label matters less than the turnover', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Lever 3 · Tax-managed funds' });
  const x = W * 0.10, w = W * 0.55;
  // AUDIT R-02 — D17 sentence-cadence wiring, full rotation: sentence 0 owns
  // the tax-managed bar, sentence 1 the plain index bar, 2+ the verdict card
  // — and inside the verdict the focus ping alternates headline ↔ 0.40%/yr
  // punchline per sentence, so the 47s hold changes emphasis with the
  // narration instead of freezing after one reveal.
  const siTM = g.sentenceIdx ?? -1;
  const hotZone = siTM < 0 ? -1 : siTM === 0 ? 0 : siTM === 1 ? 1 : 2;
  const fresh = g.sentenceT != null ? clamp01(1 - g.sentenceT / 900) : 0;
  // AUDIT K-04 — bars h 120→150 and the verdict card h 310→380: content used
  // to end at y≈650 leaving a ~300px dead band; now it carries to 730 with
  // the scene's punchline (7.16 − 6.76 = 0.40%/yr) inside the card.
  ctx.save();
  ctx.globalAlpha = hotZone === 1 ? 0.45 : 1;
  barRow(ctx, { x, y: 345, w, h: 150, label: 'Tax-managed small-cap', value: 7.16, maxV: 8, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'gold', valueText: '7.16%', sub: '10-yr after-tax return' });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = hotZone === 0 ? 0.45 : 1;
  barRow(ctx, { x, y: 555, w, h: 150, label: 'Plain small-cap index', value: 6.76, maxV: 8, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'platinum', valueText: '6.76%', sub: '10-yr after-tax return' });
  ctx.restore();
  // the zone a sentence does NOT own recedes; the hot zone gets a fresh gold
  // edge pulse on every sentence boundary (barRow manages its own alpha)
  if (hotZone === 0) dimRect(ctx, x, 555, w, 150);
  if (hotZone === 1) dimRect(ctx, x, 345, w, 150);
  if (hotZone === 2) dimRect(ctx, x, 300, w, 420);
  if (hotZone === 0) focusPing(ctx, x + w * 0.5, 420, g.sentenceT, 100);
  if (hotZone === 1) focusPing(ctx, x + w * 0.5, 630, g.sentenceT, 100);
  if (hotZone >= 0) {
    const hy = hotZone === 0 ? 345 : hotZone === 1 ? 555 : 350;
    const hx = hotZone === 2 ? x + w + 78 : x - 12;
    const hw = hotZone === 2 ? 504 : w + 24;
    const hh = hotZone === 2 ? 404 : 174;
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.5 * fresh;
    ctx.strokeStyle = PALETTE.goldBright;
    ctx.lineWidth = 2.2;
    roundRect(ctx, hx, hy, hw, hh, 16);
    ctx.stroke();
    ctx.restore();
  }
  const la = clamp01((t - 2200) / 600);
  if (la > 0) {
    ctx.save();
    ctx.globalAlpha = la * (hotZone < 2 ? 0.55 : 1);
    glassCard(ctx, x + w + 90, 350, 480, 380, { r: 16, alpha: hotZone === 2 ? 1 : 0.55 });
    setFont(ctx, 30, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    wrapText(ctx, 'A low-turnover index fund is already a tax-managed fund.', 400, 30, 700, FONT_DISPLAY).forEach((ln, i) => {
      ctx.fillText(ln, x + w + 128, 424 + i * 46);
    });
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    wrapText(ctx, 'The edge mostly came from a different index.', 420, 23, 600, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, x + w + 128, 556 + i * 32);
    });
    // the punchline, composed as a stat (AUDIT K-04 — fills the card's foot)
    goldFillText(ctx, '0.40%/yr', x + w + 128, 668, 46, 800, FONT_DISPLAY);
    setFont(ctx, 24, 600, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('the entire after-tax edge', x + w + 128, 700);
    ctx.restore();
    // R-02 — inside the verdict, the eye alternates headline ↔ punchline
    if (hotZone === 2 && la >= 1) {
      focusPing(ctx, x + w + 128 + 150, siTM % 2 === 0 ? 452 : 668, g.sentenceT, 88);
    }
  }
}

// ── private-bank pitch deck intro ────────────────────────────────────────────
export function pitchDeckScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Where the private banks live', W * 0.10, 210, W * 0.7, t / 2400, { kickerText: 'Lever 4 · Net worth > $5M' });
  const items = ['Direct indexing', 'Exchange funds', 'Tax-aware long-short'];
  items.forEach((it, i) => {
    const ent = clamp01((t - 300 - i * 380) / 600);
    if (ent <= 0) return;
    ctx.save();
    ctx.globalAlpha = ent;
    const w = 520, x = W * 0.10 + i * (w + 60), y = 350;
    // slightly over-designed "deck" slide
    glassCard(ctx, x, y, w, 300, { r: 18, goldEdge: true });
    ctx.save();
    ctx.translate(x + 24, y + 24);
    ctx.globalAlpha *= 0.9;
    ctx.strokeStyle = rgba(PALETTE.gold, 0.4);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(8, 8, w - 64, 240);
    ctx.restore();
    setFont(ctx, 40, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(it, x + 48, y + 130);
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText(['screenshot slide 04', 'slide 11 · confidential', 'slide 17 · draft'][i], x + 48, y + 180);
    ctx.restore();
  });
  // red pen swoosh (U1.4): routed BENEATH the cards, curving through the
  // labels row — the annotation rides the curve and the stroke passes just
  // under the words, so nothing crosses a card interior.
  const pa = clamp01((t - 2100) / 600);
  if (pa > 0) {
    ctx.save();
    ctx.globalAlpha = pa;
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = '#F08A8D';
    ctx.fillText('separate the engineering from the sales deck', W * 0.30, 714);
    ctx.beginPath();
    const startX = W * 0.10 + 20, startY = 730;
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(W * 0.5, 718, W * 0.86, 728);
    ctx.strokeStyle = rgba(PALETTE.down, 0.85);
    ctx.lineWidth = 4.4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

// ── direct indexing mosaic (one block → hundreds of stocks) ──────────────────
export function diMosaicScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Direct indexing: harvest the fifty that are down', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 4 · Direct indexing' });
  const shatter = clamp01((t - 500) / 1200);
  const bx = W * 0.22, by = 350, bw = 240, bh = 300;
  // the single ETF block dissolving into shards — L-05: presence floors at
  // 0.42 with a readable caption (the old 1 − shatter·0.9 left a 10% washed
  // ghost occupying the left third of the frame)
  ctx.save();
  ctx.globalAlpha = 1 - shatter * 0.58;
  glassCard(ctx, bx, by, bw, bh, { r: 16, fill: 'rgba(127,163,216,0.12)', border: rgba(PALETTE.steel, 0.5) });
  setFont(ctx, 28, 700, FONT_UI);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.textAlign = 'center';
  ctx.fillText('ONE ETF', bx + bw / 2, by + bh / 2 - 10);
  setFont(ctx, 28, 500, FONT_UI);
  ctx.fillStyle = PALETTE.inkFaint;
  ctx.fillText('dissolved into 80', bx + bw / 2, by + bh / 2 + 34);
  ctx.fillText('direct positions', bx + bw / 2, by + bh / 2 + 68);
  ctx.textAlign = 'left';
  ctx.restore();
  // mosaic of small tiles — U1.4: plain colour tiles, with 3-character ticker
  // chips stamped on 10 deterministic-random tiles
  const cols = 10, rows = 8;
  const mx = W * 0.44, my = 330;
  const tw = 44, th = 40;
  const CHIPS = ['IBM', 'GE', 'CAT', 'KO', 'HD', 'BA', 'GM', 'JPM', 'DIS', 'NKE'];
  const chipOn = new Map<number, string>();
  for (let k = 0; k < CHIPS.length; k++) {
    // deterministic "random" tiles, spread across the grid; a chip never sits
    // beside another (54px boxes on a 50px pitch would merge — L-03)
    let idx = Math.floor(hash01(k * 13.7 + 3.1) * cols * rows);
    const near = (i2: number) => chipOn.has(i2) || chipOn.has(i2 - 1) || chipOn.has(i2 + 1) ||
      chipOn.has(i2 - cols) || chipOn.has(i2 + cols);
    while (near(idx)) idx = (idx + 7) % (cols * rows);
    chipOn.set(idx, CHIPS[k]);
  }
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const ent = clamp01((shatter * cols * rows - i) / 3);
    if (ent <= 0) continue;
    const down = i % 7 === 3; // ~50 down stocks
    const px = mx + c * (tw + 6) + hash01(i) * 2 * shatter;
    const py = my + r * (th + 6) + hash01(i * 3.7) * 2 * shatter;
    ctx.save();
    ctx.globalAlpha = ent;
    ctx.translate(px + tw / 2, py + th / 2);
    ctx.rotate((hash01(i * 1.3) - 0.5) * 0.12 * shatter);
    ctx.fillStyle = down ? rgba(PALETTE.down, 0.75) : rgba(PALETTE.up, 0.55);
    roundRect(ctx, -tw / 2, -th / 2, tw, th, 6);
    ctx.fill();
    if (down) {
      ctx.strokeStyle = rgba(PALETTE.gold, 0.85 * clamp01((t - 1900 - (i % 30) * 40) / 300));
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
    // 3-character ticker chip stamped over the tile (L-03 — 26px floor: the
    // chip box grows with the type)
    const ticker = chipOn.get(i);
    if (ticker) {
      ctx.save();
      ctx.globalAlpha = ent * clamp01((t - 1900) / 500);
      ctx.translate(px + tw / 2, py + th / 2);
      ctx.rotate((hash01(i * 1.3) - 0.5) * 0.12 * shatter);
      roundRect(ctx, -27, -15, 54, 30, 6);
      ctx.fillStyle = 'rgba(8,12,22,0.88)';
      ctx.fill();
      ctx.strokeStyle = rgba(PALETTE.gold, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();
      setFont(ctx, 28, 800, FONT_UI);
      ctx.fillStyle = 'rgba(246,241,230,0.95)';
      ctx.textAlign = 'center';
      ctx.fillText(ticker, 0, 10);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }
  // legend
  const la = clamp01((t - 2000) / 500);
  // U3.3 — focus ping on the harvest callout at its sentence boundary
  if (la >= 1 && (g.sentenceT ?? 9999) < 340 && (g.sentenceIdx ?? 0) >= 1) {
    focusPing(ctx, W * 0.44 + 40, 754, g.sentenceT, 90);
  }
  if (la > 0) {
    ctx.save();
    ctx.globalAlpha = la;
    chip(ctx, 'red = harvestable losses, harvested individually', W * 0.44, 742, { size: 28, dot: PALETTE.down });
    ctx.restore();
  }
  // S-05 — the Principal points at the ONE ETF block, then at the harvest
  // mosaic as it shatters (report §6.4), sentence-driven
  dataSceneFigure(g, 1.42, {
    seed: 42,
    focal: (si) => (si === 0 ? { x: W * 0.22 + 120, y: 550 } : { x: W * 0.44 + 200, y: 520 }),
  });
}

// ── direct indexing decay (69 → 9 bps) ───────────────────────────────────────
export function diDecayScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Pay 40 bps forever for a benefit that decays', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Lever 4 · The trade' });
  const x = W * 0.10, w = W * 0.58;
  // AUDIT R-02 — D17 sentence-cadence wiring, full walk: sentences 0-1 own
  // the cost line (30-40 bps forever), 2-3 hold both bars in overview, 4 the
  // 69 bps bar, 5 the 9 bps bar, 6+ back to the cost line — the frame's
  // emphasis moves with the narration across the 40s hold.
  const siDD = g.sentenceIdx ?? -1;
  const hotZone = siDD < 0 ? -1 : siDD <= 1 ? 2 : siDD <= 3 ? 3 : siDD === 4 ? 0 : siDD === 5 ? 1 : 2;
  const fresh = g.sentenceT != null ? clamp01(1 - g.sentenceT / 900) : 0;
  ctx.save();
  ctx.globalAlpha = hotZone === 1 ? 0.45 : hotZone === 2 ? 0.45 : 1;
  barRow(ctx, { x, y: 345, w, h: 120, label: 'Years 1–5', value: 69, maxV: 80, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'up', valueText: '69 bps/yr', sub: 'average tax benefit' });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = hotZone === 0 ? 0.45 : hotZone === 2 ? 0.45 : 1;
  barRow(ctx, { x, y: 590, w, h: 120, label: 'Years 6–10', value: 9, maxV: 80, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'down', valueText: '9 bps/yr', sub: 'as the portfolio appreciates' });
  ctx.restore();
  if (hotZone === 0) dimRect(ctx, x, 590, w, 120);
  if (hotZone === 1) dimRect(ctx, x, 345, w, 120);
  if (hotZone === 2) dimRect(ctx, x, 345, w, 365);
  if (hotZone === 0) focusPing(ctx, x + w * 0.5, 405, g.sentenceT, 100);
  if (hotZone === 1) focusPing(ctx, x + w * 0.5, 650, g.sentenceT, 100);
  // cost line — AUDIT T-06: at y=400 the dashed "your cost" line cut straight
  // through the first bar (69 bps, y 345-465) and its value label — a
  // comparison device crossing the thing it compares. Re-routed ABOVE both
  // bars: the line now runs at y=320, its label above it at 304, so the
  // gold dashed rule reads as a threshold the bars answer to.
  const ca = clamp01((t - 2200) / 500);
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha = ca * (hotZone === 0 || hotZone === 1 ? 0.4 : 1);
    ctx.beginPath();
    ctx.moveTo(x + 40, 320);
    ctx.lineTo(x + w, 320);
    ctx.strokeStyle = rgba(PALETTE.gold, 0.8);
    ctx.setLineDash([12, 8]);
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.setLineDash([]);
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('your cost: 30–40 bps — forever', x + w - 380, 304);
    ctx.restore();
    // R-02 — when a sentence owns the cost line it gets the fresh gold edge
    // and the ping; the overview sentences alternate bars ↔ cost line
    if (hotZone === 2) {
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.5 * fresh;
      ctx.strokeStyle = PALETTE.goldBright;
      ctx.lineWidth = 2.2;
      roundRect(ctx, x + 24, 278, w - 24, 58, 12);
      ctx.stroke();
      ctx.restore();
      focusPing(ctx, x + w - 190, 304, g.sentenceT, 90);
    }
    if (hotZone === 3 && ca >= 1) {
      focusPing(ctx, x + w * 0.5, siDD % 2 === 0 ? 320 : 470, g.sentenceT, 84);
    }
  }
}

// ── exchange fund (pool + 7-year padlock) ────────────────────────────────────
export function exchangeFundScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Deferral with handcuffs', W * 0.10, 210, W * 0.7, t / 2400, { kickerText: 'Lever 4 · Exchange funds' });
  // $1T stat (S-05 — shifted right of the figure margin)
  const sa = clamp01((t - 300) / 700);
  if (sa > 0) {
    ctx.save();
    ctx.globalAlpha = sa;
    statCard(ctx, { x: W * 0.185, y: 300, w: 470, h: 250, big: '$1T+', label: 'US wealth in low-basis single stock (BlackRock)', p: sa, tone: 'gold', bigSize: 88 });
    ctx.restore();
  }
  // pool diagram: concentrated shares in → diversified basket out
  const pa = clamp01((t - 1100) / 700);
  if (pa > 0) {
    ctx.save();
    ctx.globalAlpha = pa;
    const poolX = W * 0.435, poolY = 340, poolW = 560, poolH = 250;
    glassCard(ctx, poolX, poolY, poolW, poolH, { r: 20, goldEdge: true });
    setFont(ctx, 28, 700, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'center';
    ctx.fillText('THE PRIVATE POOL', poolX + poolW / 2, poolY + 44);
    ctx.textAlign = 'left';
    // contributing blocks
    for (let i = 0; i < 5; i++) {
      const ba = clamp01((t - 1300 - i * 180) / 300);
      if (ba <= 0) continue;
      ctx.save();
      ctx.globalAlpha = ba;
      const bx2 = poolX + 50 + i * 100, by2 = poolY + 80;
      ctx.fillStyle = rgba(PALETTE.steel, 0.55);
      roundRect(ctx, bx2, by2, 76, 76, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.inkSoft;
      setFont(ctx, 28, 700, FONT_UI);
      ctx.textAlign = 'center';
      ctx.fillText('STOCK', bx2 + 38, by2 + 44);
      ctx.textAlign = 'left';
      ctx.restore();
    }
    // diversified basket out
    const oa = clamp01((t - 2400) / 500);
    if (oa > 0) {
      ctx.save();
      ctx.globalAlpha = oa;
      setFont(ctx, 28, 600, FONT_UI);
      ctx.fillStyle = PALETTE.up;
      ctx.textAlign = 'center';
      ctx.fillText('→ diversified basket, your old basis', poolX + poolW / 2, poolY + 200);
      ctx.textAlign = 'left';
      ctx.restore();
    }
    ctx.restore();
  }
  // the 7-year padlock closes over it
  const lockT = t - 3600;
  if (lockT > 0) {
    const e = easeOutCubic(clamp01(lockT / 500));
    ctx.save();
    ctx.globalAlpha = clamp01(t / 300);
    ctx.translate(W * 0.82, 460);
    ctx.scale(e, e);
    // padlock
    ctx.strokeStyle = PALETTE.goldBright;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, -18, 26, Math.PI, 0);
    ctx.stroke();
    roundRect(ctx, -34, -18, 68, 58, 10);
    const g2 = ctx.createLinearGradient(-34, -18, 34, 40);
    g2.addColorStop(0, '#F6E7BD');
    g2.addColorStop(1, PALETTE.goldDeep);
    ctx.fillStyle = g2;
    ctx.fill();
    ctx.fillStyle = '#5A4512';
    ctx.beginPath();
    ctx.arc(0, 6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3, 6, 6, 16);
    setFont(ctx, 28, 800, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'center';
    ctx.fillText('7-YEAR LOCKUP', 0, 86);
    ctx.textAlign = 'left';
    ctx.restore();
    impactRing(ctx, W * 0.82, 460, t, 3600, 130, 0.9, PALETTE.gold);
  }
  // S-05 — the Principal presents the $1T fact, the pool, then the padlock
  // (report §6.4), sentence-driven.
  // FIX F9 — every focal sits on the element's NEAR BORDER (the side facing
  // the figure), never its interior: the contact device terminates ON the
  // edge instead of entering the $1T+ card / pool / padlock graphic.
  dataSceneFigure(g, 1.42, {
    seed: 43,
    mode: 'present',
    focal: (si) => (si === 0
      ? { x: W * 0.185 - 34, y: 425 }
      : si <= 2 ? { x: W * 0.435 - 30, y: 465 } : { x: W * 0.82 - 56, y: 460 }),
  });
}

// ── tax-aware long-short ─────────────────────────────────────────────────────
export function longShortScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Tax-aware long-short: harvest from both sides', W * 0.10, 220, W * 0.8, t / 2400, { kickerText: 'Lever 4 · The exotic one' });
  const x = W * 0.10, w = W * 0.52;
  // AUDIT R-02 — D17 sentence-cadence wiring, full rotation: sentence 0 owns
  // the LONG line, sentence 1 the SHORT line, 2+ the FAJ verdict card — the
  // two series trade the spotlight sentence by sentence (drawn as separate
  // passes so each can recede independently), and the verdict's ping
  // alternates headline ↔ benefit line so the 30s hold keeps breathing.
  const siLS = g.sentenceIdx ?? -1;
  const hotZone = siLS < 0 ? -1 : siLS === 0 ? 0 : siLS === 1 ? 1 : 2;
  const fresh = g.sentenceT != null ? clamp01(1 - g.sentenceT / 900) : 0;
  // long basket rises, short basket falls — both harvestable
  const ptsL: [number, number][] = [], ptsS: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    ptsL.push([i, 100 + i * 2.2 + Math.sin(i) * 4]);
    ptsS.push([i, 100 - i * 1.8 - Math.sin(i * 1.3) * 4]);
  }
  // the two series drawn as separate passes: the line a sentence owns runs
  // at full ink while the other recedes (grid/axis only on the first pass)
  ctx.save();
  ctx.globalAlpha = hotZone === 2 ? 0.55 : hotZone === 1 ? 0.45 : 1;
  lineChart(ctx, {
    x, y: 360, w, h: 360,
    series: [{ tone: 'up', points: ptsL, width: 4.6 }],
    p: clamp01(t / 2200), t,
    yMin: 60, yMax: 140, yFormat: () => '',
    xLabels: ['', '', '', ''],
    gridLines: 4, showAxis: true,
  });
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = hotZone === 2 ? 0.55 : hotZone === 0 ? 0.45 : 1;
  lineChart(ctx, {
    x, y: 360, w, h: 360,
    series: [{ tone: 'down', points: ptsS, width: 4.6 }],
    p: clamp01(t / 2200), t,
    yMin: 60, yMax: 140, yFormat: () => '',
    xLabels: ['', '', '', ''],
    gridLines: 0, showAxis: false,
  });
  ctx.restore();
  setFont(ctx, 28, 700, FONT_UI);
  ctx.fillStyle = PALETTE.up;
  ctx.globalAlpha = hotZone === 2 ? 0.55 : hotZone === 1 ? 0.45 : 1;
  ctx.fillText('LONG basket — losses to harvest', x + 20, 350);
  ctx.fillStyle = '#F08A8D';
  ctx.globalAlpha = hotZone === 2 ? 0.55 : hotZone === 0 ? 0.45 : 1;
  ctx.fillText('SHORT basket — losses to harvest', x + 20, 748);
  ctx.globalAlpha = 1;
  if (hotZone === 0) focusPing(ctx, x + w - 16, 424, g.sentenceT, 100);
  if (hotZone === 1) focusPing(ctx, x + w - 16, 640, g.sentenceT, 100);
  // fresh gold edge on the zone the sentence owns
  if (hotZone >= 0) {
    const hx = hotZone === 2 ? x + w + 38 : x - 12;
    const hy = hotZone === 2 ? 368 : 348;
    const hw = hotZone === 2 ? 584 : w + 24;
    const hh = hotZone === 2 ? 344 : 412;
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.5 * fresh;
    ctx.strokeStyle = PALETTE.goldBright;
    ctx.lineWidth = 2.2;
    roundRect(ctx, hx, hy, hw, hh, 16);
    ctx.stroke();
    ctx.restore();
  }
  // FAJ verdict
  const va = clamp01((t - 1600) / 600);
  if (va > 0) {
    ctx.save();
    ctx.globalAlpha = va * (hotZone < 2 ? 0.55 : 1);
    glassCard(ctx, x + w + 50, 380, 560, 320, { r: 16, alpha: hotZone === 2 ? 1 : 0.55, goldEdge: true });
    setFont(ctx, 30, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    wrapText(ctx, 'The engineering is real — peer-reviewed, 2020.', 480, 30, 700, FONT_DISPLAY).forEach((ln, i) => ctx.fillText(ln, x + w + 90, 440 + i * 46));
    setFont(ctx, 28, 600, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    wrapText(ctx, 'Tax benefit: up to 2× the pre-tax return it sacrifices.', 470, 26, 600, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, x + w + 90, 600 + i * 36);
    });
    ctx.restore();
    // R-02 — inside the verdict, the eye alternates headline ↔ benefit line
    if (hotZone === 2 && va >= 1) {
      focusPing(ctx, x + w + 90 + 190, siLS % 2 === 0 ? 470 : 636, g.sentenceT, 88);
    }
  }
}

// ── Elm Wealth verdict (the strongest counterpoint) ──────────────────────────
export function elmVerdictScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  // somber room — this is the turn
  paintStage(ctx, W, H, t, { tone: 'down', grid: 0.5, sheen: 0.3 });
  panelTitle(ctx, 'The strongest counterpoint in this video', W * 0.10, 210, W * 0.8, t / 2400, { kickerText: 'Lever 4 · Elm Wealth, Apr 2026' });
  const x = W * 0.14, y = 330, w = W * 0.72, h = 420;
  // D17 cadence wiring: the narration walks the panel — headline → mechanics →
  // verdict — so the emphasis moves with the sentence index instead of the
  // layout holding static for 34.9s.
  const stage = g.sentenceIdx != null
    ? (g.sentenceIdx >= 4 ? 2 : g.sentenceIdx >= 2 ? 1 : 0)
    : (t < 8000 ? 0 : t < 16000 ? 1 : 2);
  const emA = (st: number) => 1 - (st === stage ? 0 : 0.42);
  const ent = springTo(0.92, 1, Math.min(800, t), 150, 15);
  ctx.save();
  ctx.globalAlpha = clamp01(t / 300);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(ent, ent);
  ctx.translate(-w / 2, -h / 2);
  glassCard(ctx, 0, 0, w, h, { r: 20, border: rgba(PALETTE.down, 0.4) });
  setFont(ctx, 36, 700, FONT_DISPLAY);
  ctx.save();
  ctx.globalAlpha *= emA(0);
  ctx.fillStyle = PALETTE.ink;
  wrapText(ctx, 'Fees consumed more than half the tax benefit.', w - 120, 36, 700, FONT_DISPLAY).forEach((ln, i) => {
    ctx.fillText(ln, 60, 110 + i * 52);
  });
  ctx.restore();
  setFont(ctx, 30, 600, FONT_UI);
  ctx.save();
  ctx.globalAlpha *= emA(1);
  ctx.fillStyle = PALETTE.inkSoft;
  wrapText(ctx, 'The investor ended with a lower after-tax expected return than if she had just sold the stock, paid the tax, and bought an index fund.', w - 120, 30, 600, FONT_UI).forEach((ln, i) => {
    ctx.fillText(ln, 60, 230 + i * 44);
  });
  ctx.restore();
  // coin flip verdict — emphasized in the final stage
  const ca = clamp01((t - 2200) / 600) * emA(2);
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha *= ca;
    ctx.beginPath();
    ctx.arc(w - 160, 300, 46, 0, Math.PI * 2);
    const cg = ctx.createLinearGradient(w - 200, 260, w - 120, 340);
    cg.addColorStop(0, '#F6E7BD');
    cg.addColorStop(1, PALETTE.goldDeep);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = rgba(PALETTE.gold, 0.9);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#5A4512';
    setFont(ctx, 30, 800, FONT_UI);
    ctx.textAlign = 'center';
    ctx.fillText('?', w - 160, 312);
    ctx.textAlign = 'left';
    setFont(ctx, 34, 700, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('Even granting 0.5% of alpha: roughly a coin flip.', 60, 320);
    ctx.restore();
  }
  ctx.restore();
}
