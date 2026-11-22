/**
 * Thumbnail generator — the script's four concepts, 1280×720.
 * T1 split statement · T2 gold line NOT REPORTED · T3 the 92/17 gap ·
 * T4 the Principal + the $5.1M gap (AUDIT R-05 — face/character + one
 * number, the dominant CTR pattern in finance-education feeds)
 */

export type ThumbnailVariant = 0 | 1 | 2 | 3;

import { PALETTE, rgba, setFont, roundRect, glassCard, goldFillText, FONT_DISPLAY, FONT_UI } from './theme';
import { poseAt, applyMood, drawStickman } from './stickman';

export function drawThumbnail(ctx: CanvasRenderingContext2D, W: number, H: number, variant: ThumbnailVariant, channelName: string): void {
  // navy room
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, PALETTE.bg2);
  base.addColorStop(0.5, PALETTE.bg1);
  base.addColorStop(1, PALETTE.bg0);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // ambient glows
  const g1 = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, W * 0.5);
  g1.addColorStop(0, rgba('#2A4470', 0.5));
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  if (variant === 0) {
    // T1 — split statement: $13.7M white/gold vs $8.6M red + SAME PORTFOLIO
    ctx.textAlign = 'center';
    goldFillText(ctx, '$13.7M', W * 0.27, H * 0.42, 150, 900, FONT_DISPLAY, 'center');
    setFont(ctx, 160, 900, FONT_DISPLAY);
    const rg = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.62);
    rg.addColorStop(0, '#F08A8D');
    rg.addColorStop(1, PALETTE.down);
    ctx.fillStyle = rg;
    ctx.fillText('$8.6M', W * 0.73, H * 0.42);
    ctx.strokeStyle = rgba(PALETTE.inkSoft, 0.4);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2, H * 0.16);
    ctx.lineTo(W / 2, H * 0.62);
    ctx.stroke();
    setFont(ctx, 30, 700, FONT_UI);
    try { (ctx as any).letterSpacing = '8px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('SAME PORTFOLIO', W / 2, H * 0.72);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    setFont(ctx, 44, 700, FONT_UI);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText('SAME MARKET · 25 YEARS', W / 2, H * 0.80);
    ctx.textAlign = 'left';
  } else if (variant === 1) {
    // T2 — statement line highlighted in gold, red stamp NOT REPORTED
    glassCard(ctx, W * 0.12, H * 0.24, W * 0.76, H * 0.34, { r: 18, goldEdge: true, fill: 'rgba(255,255,255,0.06)' });
    setFont(ctx, 34, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('BROKERAGE STATEMENT — 2026', W * 0.16, H * 0.32);
    setFont(ctx, 52, 800, FONT_UI);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText('AFTER-TAX RETURN: ', W * 0.16, H * 0.44);
    ctx.fillStyle = rgba(PALETTE.gold, 0.9);
    ctx.fillRect(W * 0.16 + 480, H * 0.44 - 20, 340, 8);
    // stamp
    ctx.save();
    ctx.translate(W * 0.68, H * 0.62);
    ctx.rotate(-0.06);
    setFont(ctx, 64, 900, FONT_UI);
    try { (ctx as any).letterSpacing = '6px'; } catch { /* noop */ }
    const label = 'NOT REPORTED';
    const tw = ctx.measureText(label).width + 70;
    ctx.strokeStyle = rgba(PALETTE.down, 0.95);
    ctx.lineWidth = 7;
    roundRect(ctx, -tw / 2, -62, tw, 124, 14);
    ctx.stroke();
    ctx.fillStyle = rgba(PALETTE.down, 0.14);
    ctx.fill();
    ctx.fillStyle = '#F08A8D';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 22);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    ctx.textAlign = 'left';
    ctx.restore();
    setFont(ctx, 38, 700, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.fillText('The line your advisor never shows you.', W * 0.12, H * 0.85);
  } else if (variant === 3) {
    // T4 — AUDIT R-05: the film's only ownable visual asset — the Principal —
    // presents the $5.1M gap number. Face + one number, not typography alone.
    // left column: the gap number
    setFont(ctx, 30, 700, FONT_UI);
    try { (ctx as any).letterSpacing = '6px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('THE FEE LINE, COMPOUNDING', W * 0.09, H * 0.24);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    goldFillText(ctx, '$5,100,000', W * 0.09, H * 0.48, 118, 900, FONT_DISPLAY);
    setFont(ctx, 40, 700, FONT_UI);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText('$13.7M − $8.6M — gone in 25 years.', W * 0.09, H * 0.60);
    setFont(ctx, 30, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.fillText('It never left through the front door.', W * 0.09, H * 0.68);
    // gold hairline beneath the copy, so the type sits on the system
    ctx.strokeStyle = rgba(PALETTE.gold, 0.55);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(W * 0.09, H * 0.735);
    ctx.lineTo(W * 0.52, H * 0.735);
    ctx.stroke();
    // the Principal, right column — presenting pose on the same floor
    const pose = poseAt('thumb-gap', 620, 620, [], [], undefined, 'present');
    applyMood(pose, 'reveal', 620, 3);
    drawStickman(ctx, W * 0.78, H * 0.905, 1.28, 620, { pose, alpha: 1, faceScale: 1.5, rimBoost: 0.06 }, 7);
  } else {
    // T3 — 92% vs 17% THE GAP
    setFont(ctx, 140, 900, FONT_DISPLAY);
    ctx.textAlign = 'left';
    goldFillText(ctx, '92%', W * 0.08, H * 0.42, 140, 900, FONT_DISPLAY);
    setFont(ctx, 140, 900, FONT_DISPLAY);
    const g2 = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.62);
    g2.addColorStop(0, '#F08A8D');
    g2.addColorStop(1, PALETTE.down);
    ctx.fillStyle = g2;
    ctx.fillText('17%', W * 0.62, H * 0.42);
    setFont(ctx, 30, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText('asked about taxes', W * 0.09, H * 0.50);
    ctx.fillText('act on them', W * 0.63, H * 0.50);
    setFont(ctx, 110, 900, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'center';
    ctx.fillText('THE GAP', W / 2, H * 0.75);
    ctx.textAlign = 'left';
  }
  // channel mark
  setFont(ctx, 22, 700, FONT_UI);
  try { (ctx as any).letterSpacing = '4px'; } catch { /* noop */ }
  ctx.fillStyle = rgba(PALETTE.inkSoft, 0.8);
  ctx.fillText(channelName.toUpperCase(), 40, 44);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
}
