/**
 * AURUM data scenes — The Wrapper + The Advanced Tier.
 * plumbing · heartbeat · distribBars · taxManaged · pitchDeck · diMosaic ·
 * diDecay · exchangeFund · longShort · elmVerdict
 */

import { SceneCtx } from './scene-context';
import { PALETTE, rgba, setFont, wrapText, glassCard, roundRect, goldFillText, FONT_DISPLAY, FONT_UI, kicker, chip, hexLerp } from './theme';
import { clamp01, easeOutCubic, easeInOutCubic, springTo, hash01 } from './easing';
import { goldDust, impactRing, softBloom, glowLine, spinToken, floatY, microShake } from './fx';
import { panelTitle, barRow, statCard, lineChart } from './charts';
import { paintStage } from './stage';

// ── plumbing: mutual fund redemption vs ETF in-kind ──────────────────────────
export function plumbingScene(g: SceneCtx): void {
  const { ctx, W, H, t, s } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Same index, same stocks — different tax outcome', W * 0.10, 240, W * 0.8, t / 2400, { kickerText: 'Lever 3 · The wrapper' });
  const showMutual = (s.mode ?? 'mutual') === 'mutual';
  const x = W * 0.10, w = W * 0.80, y = 380, h = 380;
  const ent = clamp01(t / 500);
  ctx.save();
  ctx.globalAlpha = ent;
  if (showMutual) {
    // MUTUAL FUND: redemption → manager sells → gains spray
    glassCard(ctx, x, y, w, h, { r: 18, border: rgba(PALETTE.down, 0.35) });
    setFont(ctx, 26, 800, FONT_UI);
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
      setFont(ctx, 24, 700, FONT_UI);
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
    setFont(ctx, 26, 800, FONT_UI);
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
      setFont(ctx, 24, 700, FONT_UI);
      ctx.fillStyle = i === 2 ? PALETTE.goldBright : PALETTE.ink;
      wrapText(ctx, b.label, 270, 24, 700, FONT_UI).forEach((ln, li) => ctx.fillText(ln, b.x + 24, y + 155 + li * 30));
      ctx.restore();
    });
  }
  ctx.restore();
}

// ── heartbeat + $48B token ───────────────────────────────────────────────────
export function heartbeatScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, { tone: 'gold' });
  goldDust(ctx, W, H, t, 41, 1);
  panelTitle(ctx, 'Heartbeat trades: the quiet machinery', W * 0.10, 240, W * 0.8, t / 2400, { kickerText: 'Lever 3 · In-kind' });
  // pulse ring (the "heartbeat")
  const pulse = (t / 1100) % 1;
  ctx.save();
  ctx.globalAlpha = 0.5 * (1 - pulse);
  ctx.beginPath();
  ctx.arc(W * 0.30, H * 0.52, 90 + pulse * 160, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(PALETTE.gold, 0.5);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  spinToken(ctx, W * 0.30, H * 0.52, 64, t, PALETTE.goldBright, PALETTE.gold, 'ETF', 1500);
  // the $48B counter
  const ca = clamp01((t - 1600) / 700);
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha = ca;
    glassCard(ctx, W * 0.55, 360, 640, 260, { r: 18, goldEdge: true });
    setFont(ctx, 24, 700, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('US TREASURY COST, PER YEAR (BLOOMBERG EST.)', W * 0.55 + 40, 420);
    goldFillText(ctx, '$48,000,000,000', W * 0.55 + 40, 520, 68, 800, FONT_DISPLAY);
    setFont(ctx, 24, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.fillText('the top 1% collect most of the benefit', W * 0.55 + 40, 575);
    ctx.restore();
    impactRing(ctx, W * 0.55 + 320, 490, t, 1600, 180, 1, PALETTE.gold);
  }
  // "file that away" reminder
  const fa = clamp01((t - 3400) / 500);
  if (fa > 0) {
    ctx.save();
    ctx.globalAlpha = fa;
    setFont(ctx, 32, 600, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.textAlign = 'center';
    ctx.fillText('File that away. We\'ll come back to it.', W / 2, 800);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

// ── G7 — distributions scoreboard (57% vs 6%) ────────────────────────────────
export function distribBarsScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'The scoreboard: capital-gains distributions, 2025', W * 0.10, 250, W * 0.8, t / 2400, { kickerText: 'Lever 3 · State Street' });
  const x = W * 0.10, w = W * 0.62;
  barRow(ctx, { x, y: 400, w, h: 120, label: 'Equity mutual funds', value: 57, maxV: 100, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'down', valueText: '57%' });
  barRow(ctx, { x, y: 590, w, h: 120, label: 'Equity ETFs', value: 6, maxV: 100, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'up', valueText: '6%' });
  const ma = clamp01((t - 2200) / 500);
  if (ma > 0) {
    ctx.save();
    ctx.globalAlpha = ma;
    setFont(ctx, 40, 800, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('A structural moat.', x + w + 60, 660);
    ctx.restore();
  }
}

// ── tax-managed funds (7.16 vs 6.76) ─────────────────────────────────────────
export function taxManagedScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'The label matters less than the turnover', W * 0.10, 250, W * 0.8, t / 2400, { kickerText: 'Lever 3 · Tax-managed funds' });
  const x = W * 0.10, w = W * 0.55;
  barRow(ctx, { x, y: 400, w, h: 120, label: 'Tax-managed small-cap', value: 7.16, maxV: 8, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'gold', valueText: '7.16%', sub: '10-yr after-tax return' });
  barRow(ctx, { x, y: 590, w, h: 120, label: 'Plain small-cap index', value: 6.76, maxV: 8, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'platinum', valueText: '6.76%', sub: '10-yr after-tax return' });
  const la = clamp01((t - 2200) / 600);
  if (la > 0) {
    ctx.save();
    ctx.globalAlpha = la;
    glassCard(ctx, x + w + 90, 400, 480, 310, { r: 16 });
    setFont(ctx, 30, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    wrapText(ctx, 'A low-turnover index fund is already a tax-managed fund.', 400, 30, 700, FONT_DISPLAY).forEach((ln, i) => {
      ctx.fillText(ln, x + w + 128, 470 + i * 46);
    });
    setFont(ctx, 23, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    wrapText(ctx, 'The edge mostly came from a different index.', 420, 23, 600, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, x + w + 128, 640 + i * 32);
    });
    ctx.restore();
  }
}

// ── private-bank pitch deck intro ────────────────────────────────────────────
export function pitchDeckScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Where the private banks live', W * 0.10, 240, W * 0.7, t / 2400, { kickerText: 'Lever 4 · Net worth > $5M' });
  const items = ['Direct indexing', 'Exchange funds', 'Tax-aware long-short'];
  items.forEach((it, i) => {
    const ent = clamp01((t - 300 - i * 380) / 600);
    if (ent <= 0) return;
    ctx.save();
    ctx.globalAlpha = ent;
    const w = 520, x = W * 0.10 + i * (w + 60), y = 400;
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
    setFont(ctx, 20, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText(['screenshot slide 04', 'slide 11 · confidential', 'slide 17 · draft'][i], x + 48, y + 180);
    ctx.restore();
  });
  // red pen swoosh
  const pa = clamp01((t - 2100) / 600);
  if (pa > 0) {
    ctx.save();
    ctx.globalAlpha = pa;
    ctx.beginPath();
    const startX = W * 0.10 + 40, startY = 660;
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(W * 0.5, 620, W * 0.86, 668);
    ctx.strokeStyle = rgba(PALETTE.down, 0.85);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
    setFont(ctx, 26, 700, FONT_UI);
    ctx.fillStyle = '#F08A8D';
    ctx.fillText('separate the engineering from the sales deck', W * 0.30, 712);
    ctx.restore();
  }
}

// ── direct indexing mosaic (one block → hundreds of stocks) ──────────────────
export function diMosaicScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Direct indexing: harvest the fifty that are down', W * 0.10, 240, W * 0.8, t / 2400, { kickerText: 'Lever 4 · Direct indexing' });
  const shatter = clamp01((t - 500) / 1200);
  const bx = W * 0.22, by = 400, bw = 240, bh = 300;
  // the single ETF block fading into shards
  ctx.save();
  ctx.globalAlpha = 1 - shatter * 0.9;
  glassCard(ctx, bx, by, bw, bh, { r: 16, fill: 'rgba(127,163,216,0.12)', border: rgba(PALETTE.steel, 0.5) });
  setFont(ctx, 24, 700, FONT_UI);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.textAlign = 'center';
  ctx.fillText('ONE ETF', bx + bw / 2, by + bh / 2);
  ctx.textAlign = 'left';
  ctx.restore();
  // mosaic of small tiles
  const cols = 10, rows = 8;
  const mx = W * 0.44, my = 380;
  const tw = 44, th = 40;
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const ent = clamp01((shatter * cols * rows - i) / 3);
    if (ent <= 0) continue;
    const down = i % 7 === 3; // ~50 down stocks
    const px = mx + c * (tw + 6) + hash01(i) * 8 * shatter;
    const py = my + r * (th + 6) + hash01(i * 3.7) * 8 * shatter;
    ctx.save();
    ctx.globalAlpha = ent;
    ctx.translate(px + tw / 2, py + th / 2);
    ctx.rotate((hash01(i * 1.3) - 0.5) * 0.24 * shatter);
    ctx.fillStyle = down ? rgba(PALETTE.down, 0.75) : rgba(PALETTE.up, 0.55);
    roundRect(ctx, -tw / 2, -th / 2, tw, th, 6);
    ctx.fill();
    if (down) {
      ctx.strokeStyle = rgba(PALETTE.gold, 0.85 * clamp01((t - 1900 - (i % 30) * 40) / 300));
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
  }
  // legend
  const la = clamp01((t - 2000) / 500);
  if (la > 0) {
    ctx.save();
    ctx.globalAlpha = la;
    chip(ctx, 'red = harvestable losses, harvested individually', W * 0.44, 742, { size: 24, dot: PALETTE.down });
    ctx.restore();
  }
}

// ── direct indexing decay (69 → 9 bps) ───────────────────────────────────────
export function diDecayScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Pay 40 bps forever for a benefit that decays', W * 0.10, 250, W * 0.8, t / 2400, { kickerText: 'Lever 4 · The trade' });
  const x = W * 0.10, w = W * 0.58;
  barRow(ctx, { x, y: 400, w, h: 120, label: 'Years 1–5', value: 69, maxV: 80, p: clamp01((t - 300) / 900), t, landT: 1250, tone: 'up', valueText: '69 bps/yr', sub: 'average tax benefit' });
  barRow(ctx, { x, y: 590, w, h: 120, label: 'Years 6–10', value: 9, maxV: 80, p: clamp01((t - 1300) / 900), t, landT: 2250, tone: 'down', valueText: '9 bps/yr', sub: 'as the portfolio appreciates' });
  // cost line
  const ca = clamp01((t - 2200) / 500);
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha = ca;
    ctx.beginPath();
    ctx.moveTo(x + 40, 400);
    ctx.lineTo(x + w, 400);
    ctx.strokeStyle = rgba(PALETTE.gold, 0.8);
    ctx.setLineDash([12, 8]);
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.setLineDash([]);
    setFont(ctx, 24, 700, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('your cost: 30–40 bps — forever', x + w - 380, 384);
    ctx.restore();
  }
}

// ── exchange fund (pool + 7-year padlock) ────────────────────────────────────
export function exchangeFundScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  paintStage(ctx, W, H, t, {});
  panelTitle(ctx, 'Deferral with handcuffs', W * 0.10, 240, W * 0.7, t / 2400, { kickerText: 'Lever 4 · Exchange funds' });
  // $1T stat
  const sa = clamp01((t - 300) / 700);
  if (sa > 0) {
    ctx.save();
    ctx.globalAlpha = sa;
    statCard(ctx, { x: W * 0.10, y: 340, w: 470, h: 250, big: '$1T+', label: 'US wealth in low-basis single stock (BlackRock)', p: sa, tone: 'gold', bigSize: 88 });
    ctx.restore();
  }
  // pool diagram: concentrated shares in → diversified basket out
  const pa = clamp01((t - 1100) / 700);
  if (pa > 0) {
    ctx.save();
    ctx.globalAlpha = pa;
    const poolX = W * 0.42, poolY = 340, poolW = 560, poolH = 250;
    glassCard(ctx, poolX, poolY, poolW, poolH, { r: 20, goldEdge: true });
    setFont(ctx, 24, 700, FONT_UI);
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
      setFont(ctx, 16, 700, FONT_UI);
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
      setFont(ctx, 22, 600, FONT_UI);
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
    setFont(ctx, 22, 800, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'center';
    ctx.fillText('7-YEAR LOCKUP', 0, 86);
    ctx.textAlign = 'left';
    ctx.restore();
    impactRing(ctx, W * 0.82, 460, t, 3600, 130, 0.9, PALETTE.gold);
  }
}

// ── tax-aware long-short ─────────────────────────────────────────────────────
export function longShortScene(g: SceneCtx): void {
  const { ctx, W, t } = g;
  paintStage(ctx, W, g.H, t, {});
  panelTitle(ctx, 'Tax-aware long-short: harvest from both sides', W * 0.10, 250, W * 0.8, t / 2400, { kickerText: 'Lever 4 · The exotic one' });
  const x = W * 0.10, w = W * 0.52;
  // long basket rises, short basket falls — both harvestable
  const ptsL: [number, number][] = [], ptsS: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    ptsL.push([i, 100 + i * 2.2 + Math.sin(i) * 4]);
    ptsS.push([i, 100 - i * 1.8 - Math.sin(i * 1.3) * 4]);
  }
  lineChart(ctx, {
    x, y: 360, w, h: 360,
    series: [
      { tone: 'up', points: ptsL, width: 4.6 },
      { tone: 'down', points: ptsS, width: 4.6 },
    ],
    p: clamp01(t / 2200), t,
    yMin: 60, yMax: 140, yFormat: () => '',
    xLabels: ['', '', '', ''],
    gridLines: 3, showAxis: false,
  });
  setFont(ctx, 24, 700, FONT_UI);
  ctx.fillStyle = PALETTE.up;
  ctx.fillText('LONG basket — losses to harvest', x + 20, 350);
  ctx.fillStyle = '#F08A8D';
  ctx.fillText('SHORT basket — losses to harvest', x + 20, 748);
  // FAJ verdict
  const va = clamp01((t - 1600) / 600);
  if (va > 0) {
    ctx.save();
    ctx.globalAlpha = va;
    glassCard(ctx, x + w + 50, 380, 560, 320, { r: 16, goldEdge: true });
    setFont(ctx, 30, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    wrapText(ctx, 'The engineering is real — peer-reviewed, 2020.', 480, 30, 700, FONT_DISPLAY).forEach((ln, i) => ctx.fillText(ln, x + w + 90, 440 + i * 46));
    setFont(ctx, 26, 600, FONT_UI);
    ctx.fillStyle = PALETTE.goldBright;
    wrapText(ctx, 'Tax benefit: up to 2× the pre-tax return it sacrifices.', 470, 26, 600, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, x + w + 90, 600 + i * 36);
    });
    ctx.restore();
  }
}

// ── Elm Wealth verdict (the strongest counterpoint) ──────────────────────────
export function elmVerdictScene(g: SceneCtx): void {
  const { ctx, W, H, t } = g;
  // somber room — this is the turn
  paintStage(ctx, W, H, t, { tone: 'down', grid: 0.5, sheen: 0.3 });
  panelTitle(ctx, 'The strongest counterpoint in this video', W * 0.10, 240, W * 0.8, t / 2400, { kickerText: 'Lever 4 · Elm Wealth, Apr 2026' });
  const x = W * 0.14, y = 360, w = W * 0.72, h = 420;
  const ent = springTo(0.92, 1, Math.min(800, t), 150, 15);
  ctx.save();
  ctx.globalAlpha = clamp01(t / 300);
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(ent, ent);
  ctx.translate(-w / 2, -h / 2);
  glassCard(ctx, 0, 0, w, h, { r: 20, border: rgba(PALETTE.down, 0.4) });
  setFont(ctx, 36, 700, FONT_DISPLAY);
  ctx.fillStyle = PALETTE.ink;
  wrapText(ctx, 'Fees consumed more than half the tax benefit.', w - 120, 36, 700, FONT_DISPLAY).forEach((ln, i) => {
    ctx.fillText(ln, 60, 110 + i * 52);
  });
  setFont(ctx, 30, 600, FONT_UI);
  ctx.fillStyle = PALETTE.inkSoft;
  wrapText(ctx, 'The investor ended with a lower after-tax expected return than if she had just sold the stock, paid the tax, and bought an index fund.', w - 120, 30, 600, FONT_UI).forEach((ln, i) => {
    ctx.fillText(ln, 60, 230 + i * 44);
  });
  // coin flip verdict
  const ca = clamp01((t - 2200) / 600);
  if (ca > 0) {
    ctx.save();
    ctx.globalAlpha = ca;
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
