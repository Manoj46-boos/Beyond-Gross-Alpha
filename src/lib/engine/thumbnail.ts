/**
 * Thumbnail generator — the script's four concepts, 1280×720.
 * T1 split statement · T2 gold line NOT REPORTED · T3 the 92/17 gap ·
 * T4 the Principal + the $5.1M gap (AUDIT R-05 — face/character + one
 * number, the dominant CTR pattern in finance-education feeds)
 */

export type ThumbnailVariant = 0 | 1 | 2 | 3 | 4;

import { PALETTE, rgba, setFont, roundRect, glassCard, goldFillText, FONT_DISPLAY, FONT_UI } from './theme';
import { poseAt, applyMood, drawStickman, companionArm } from './stickman';

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
    // FIX D5 (frame audit): the old fixed-centre placement clipped "$8.6M" at
    // the frame edge. Both numerals are MEASURED and anchored to the divider
    // (gold right-aligned to it, red left-aligned from it) — the divider stays
    // the exact axis of the pair and no font width can clip a numeral.
    setFont(ctx, 160, 900, FONT_DISPLAY);
    const gap = 56;
    goldFillText(ctx, '$13.7M', W / 2 - gap / 2, H * 0.42, 160, 900, FONT_DISPLAY, 'right');
    const rg = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.62);
    rg.addColorStop(0, '#F08A8D');
    rg.addColorStop(1, PALETTE.down);
    setFont(ctx, 160, 900, FONT_DISPLAY);
    ctx.fillStyle = rg;
    ctx.fillText('$8.6M', W / 2 + gap / 2, H * 0.42);
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
    // T4 — AUDIT §3.3: the asset we OWN — the Principal POINTING at the
    // $13.7M vs $8.6M split (the Phase-1 pointer makes the pose read), face
    // at the upper-left third, one number gold, one red, and "THE $5.1M
    // LINE" as the only text.
    setFont(ctx, 104, 900, FONT_DISPLAY);
    ctx.textAlign = 'left';
    goldFillText(ctx, '$13.7M', W * 0.46, H * 0.28, 104, 900, FONT_DISPLAY);
    const rg = ctx.createLinearGradient(0, H * 0.36, 0, H * 0.50);
    rg.addColorStop(0, '#F08A8D');
    rg.addColorStop(1, PALETTE.down);
    setFont(ctx, 104, 900, FONT_DISPLAY);
    ctx.fillStyle = rg;
    ctx.fillText('$8.6M', W * 0.46, H * 0.48);
    // gold hairline between the two outcomes
    ctx.strokeStyle = rgba(PALETTE.gold, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.46, H * 0.335);
    ctx.lineTo(W * 0.94, H * 0.335);
    ctx.stroke();
    // the only text
    setFont(ctx, 46, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '10px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('THE $5.1M LINE', W * 0.46, H * 0.63);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    ctx.textAlign = 'left';
    // the Principal — the film's only ownable asset, now at the dominant
    // scale the face+number CTR pattern needs: face on the upper-left third,
    // lit by a spotlight pool so he reads at feed size, pointing across the
    // $5.1M gap between the two outcomes
    const spot = ctx.createRadialGradient(W * 0.185, H * 0.42, 10, W * 0.185, H * 0.42, W * 0.30);
    spot.addColorStop(0, rgba(PALETTE.gold, 0.20));
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, W, H);
    const pose = poseAt('thumb-split', 620, 620, [], [], undefined, 'present');
    applyMood(pose, 'reveal', 620, 3);
    const px = W * 0.185, groundY = H * 0.94, rigScale = 2.35;
    companionArm(pose, px, groundY, rigScale, { x: W * 0.47, y: H * 0.30 }, 'point');
    drawStickman(ctx, px, groundY, rigScale, 620, { pose, alpha: 1, faceScale: 1.6, rimBoost: 0.08, reflection: true }, 7);
  } else if (variant === 4) {
    // T5 — U6 (upgrade plan): the face LARGE on the left third, $13.7M/$8.6M
    // stacked right, the $5.1M line as the only caption. The CTR pattern the
    // audit's Figure 5 showed T4 was one step away from: the bust crop makes
    // the gentleman the dominant element instead of the numbers.
    const rg2 = ctx.createLinearGradient(0, H * 0.30, 0, H * 0.46);
    rg2.addColorStop(0, '#F08A8D');
    rg2.addColorStop(1, PALETTE.down);
    setFont(ctx, 118, 900, FONT_DISPLAY);
    ctx.textAlign = 'left';
    goldFillText(ctx, '$13.7M', W * 0.52, H * 0.30, 118, 900, FONT_DISPLAY);
    ctx.fillStyle = rg2;
    ctx.fillText('$8.6M', W * 0.52, H * 0.52);
    ctx.strokeStyle = rgba(PALETTE.gold, 0.55);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(W * 0.52, H * 0.36);
    ctx.lineTo(W * 0.95, H * 0.36);
    ctx.stroke();
    setFont(ctx, 44, 800, FONT_UI);
    try { (ctx as any).letterSpacing = '9px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillText('THE $5.1M LINE', W * 0.52, H * 0.70);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
    // the gentleman at bust scale — face fills the left third, pointing right
    // into the stacked numbers, spotlight pool anchoring the face
    const spot5 = ctx.createRadialGradient(W * 0.20, H * 0.32, 10, W * 0.20, H * 0.32, W * 0.26);
    spot5.addColorStop(0, rgba(PALETTE.gold, 0.22));
    spot5.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot5;
    ctx.fillRect(0, 0, W, H);
    const pose5 = poseAt('thumb-bust', 620, 620, [], [], undefined, 'present');
    applyMood(pose5, 'reveal', 620, 3);
    const px5 = W * 0.205, groundY5 = H * 1.28, rigScale5 = 3.3;
    companionArm(pose5, px5, groundY5, rigScale5, { x: W * 0.50, y: H * 0.30 }, 'point');
    drawStickman(ctx, px5, groundY5, rigScale5, 620, { pose: pose5, alpha: 1, faceScale: 1.7, rimBoost: 0.08 }, 9);
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
  // channel mark — FIX D5 (frame audit): on T4 the mark printed over the
  // figure's hair; on that variant it moves to the clear bottom-left corner.
  setFont(ctx, 22, 700, FONT_UI);
  try { (ctx as any).letterSpacing = '4px'; } catch { /* noop */ }
  ctx.fillStyle = rgba(PALETTE.inkSoft, 0.8);
  ctx.fillText(channelName.toUpperCase(), 40, variant === 3 || variant === 4 ? H - 40 : 44);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
}
