/**
 * AURUM charts — navy/gold editorial data viz.
 * Glow lines, gradient columns with gold caps, glass stat cards, waterfall,
 * donut, dot grid. Deterministic; every draw keyed to (t, p).
 */

import {
  PALETTE, rgba, setFont, wrapText, glassCard, goldFillText, chip, roundRect, fitText, FONT_DISPLAY, FONT_UI,
} from './theme';
import { clamp01, easeOutCubic, easeOutBack, easeInOutCubic, fmtMoney, fmtComma, hash01 } from './easing';
import { glowLine, impactRing } from './fx';

export interface ChartSource { chip: string; }

// ── panel title + footnote ───────────────────────────────────────────────────
export function panelTitle(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, p: number,
  opts: { size?: number; kickerText?: string; alpha?: number } = {}
): void {
  const { size = 52, kickerText, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (kickerText) {
    setFont(ctx, 24, 700, FONT_UI);
    try { (ctx as any).letterSpacing = '5px'; } catch { /* noop */ }
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(kickerText.toUpperCase(), x, y - size * 0.9);
    try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  }
  const lines = wrapText(ctx, text, maxW, size, 700, FONT_DISPLAY);
  ctx.fillStyle = PALETTE.ink;
  lines.forEach((ln, i) => {
    ctx.fillText(ln, x, y + i * size * 1.16);
  });
  // gold underline drawing outward
  const lastY = y + (lines.length - 1) * size * 1.16;
  const uw = Math.min(ctx.measureText(lines[lines.length - 1] || '').width, maxW);
  const e = clamp01((p - 0.1) / 0.5);
  if (e > 0.01) {
    const g = ctx.createLinearGradient(x, lastY + 14, x + uw * easeOutCubic(e), lastY + 14);
    g.addColorStop(0, rgba(PALETTE.goldBright, 0.9));
    g.addColorStop(1, rgba(PALETTE.gold, 0.1));
    ctx.fillStyle = g;
    ctx.fillRect(x, lastY + 12, uw * easeOutCubic(e), 2.6);
  }
  ctx.restore();
}

export function sourceTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha = 0.8): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  setFont(ctx, 22, 500, FONT_UI);
  ctx.fillStyle = PALETTE.inkFaint;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ── line chart ───────────────────────────────────────────────────────────────
export interface SeriesSpec { name?: string; tone?: 'gold' | 'platinum' | 'up' | 'down' | 'steel' | 'violet'; points: [number, number][]; width?: number; dashed?: boolean; }
export interface LineChartOpts {
  x: number; y: number; w: number; h: number;
  series: SeriesSpec[];
  p: number;                    // 0..1 draw-on progress
  t: number;
  yMin?: number; yMax?: number;
  yFormat?: (v: number) => string;
  xLabels?: string[];
  gridLines?: number;
  lineWidth?: number;
  endDots?: boolean;
  annotations?: { at: number; series?: number; label: string; tone?: string; dy?: number }[];
  fill?: boolean;               // area fill under first series
  showAxis?: boolean;
}
const TONE_HEX: Record<string, string> = {
  gold: PALETTE.goldBright, platinum: PALETTE.ink, up: PALETTE.up, down: PALETTE.down, steel: PALETTE.steel, violet: PALETTE.violet,
};

export function lineChart(ctx: CanvasRenderingContext2D, o: LineChartOpts): void {
  const { x, y, w, h, p, t } = o;
  const gridLines = o.gridLines ?? 4;
  const series = o.series;
  let yMin = o.yMin ?? Infinity, yMax = o.yMax ?? -Infinity;
  if (!isFinite(yMin) || !isFinite(yMax)) {
    for (const s of series) for (const [, v] of s.points) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v); }
    const pad = (yMax - yMin) * 0.08 + 1e-9;
    yMin -= pad; yMax += pad;
  }
  const maxLen = Math.max(...series.map((s) => s.points.length - 1), 1);
  const px = (i: number) => x + (i / maxLen) * w;
  const py = (v: number) => y + h - ((v - yMin) / (yMax - yMin)) * h;

  // grid + axis labels
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = rgba(PALETTE.inkSoft, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= gridLines; i++) {
    const gy = y + (h / gridLines) * i;
    ctx.moveTo(x, gy); ctx.lineTo(x + w, gy);
  }
  ctx.stroke();
  if (o.showAxis !== false && o.yFormat) {
    setFont(ctx, 23, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const v = yMax - ((yMax - yMin) / gridLines) * i;
      ctx.fillText(o.yFormat(v), x - 14, y + (h / gridLines) * i + 8);
    }
    ctx.textAlign = 'left';
  }
  if (o.xLabels) {
    setFont(ctx, 22, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    o.xLabels.forEach((lb, i) => {
      const lx = x + (i / (o.xLabels!.length - 1)) * w;
      ctx.textAlign = i === 0 ? 'left' : i === o.xLabels!.length - 1 ? 'right' : 'center';
      ctx.fillText(lb, lx, y + h + 34);
    });
    ctx.textAlign = 'left';
  }
  ctx.restore();

  // series draw-on with glow
  const reveal = clamp01(p / 0.62);
  series.forEach((s, si) => {
    const col = TONE_HEX[s.tone || (si === 0 ? 'gold' : 'platinum')];
    const pts = s.points;
    const nShown = Math.max(2, Math.ceil(pts.length * reveal));
    const frac = pts.length * reveal - (nShown - 1);
    const path = (c: CanvasRenderingContext2D) => {
      c.moveTo(px(0), py(pts[0][1]));
      for (let i = 1; i < nShown - 1; i++) c.lineTo(px(i), py(pts[i][1]));
      if (nShown - 1 < pts.length && frac > 0 && nShown >= 2) {
        const i0 = nShown - 2, i1 = nShown - 1;
        const vx = lerpNum(px(i0), px(i1), clamp01(frac));
        const vy = lerpNum(py(pts[i0][1]), py(pts[i1][1]), clamp01(frac));
        c.lineTo(vx, vy);
      } else if (nShown >= 2) {
        c.lineTo(px(nShown - 1), py(pts[nShown - 1][1]));
      }
    };
    // area fill under first series
    if (o.fill && si === 0) {
      ctx.save();
      ctx.beginPath();
      path(ctx);
      const endX = px(Math.min(pts.length - 1, Math.max(1, nShown - 1)));
      ctx.lineTo(endX, y + h); ctx.lineTo(x, y + h);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, rgba(col, 0.22));
      g.addColorStop(1, rgba(col, 0.02));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    }
    if (s.dashed) ctx.setLineDash([10, 8]);
    glowLine(ctx, path, col, s.width ?? 4.6, 16);
    ctx.setLineDash([]);
    // end dot with halo
    if (o.endDots !== false && p > 0.6) {
      const di = Math.min(pts.length - 1, Math.max(1, nShown - 1));
      const dx = px(di), dy = py(pts[di][1]);
      const pop = clamp01((p - 0.62) / 0.1);
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, 16 * pop);
      g.addColorStop(0, rgba(col, 0.8 * pop));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(dx - 18, dy - 18, 36, 36);
      ctx.beginPath();
      ctx.arc(dx, dy, 6.5 * easeOutBack(pop), 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0B1120';
      ctx.fill();
    }
  });

  // annotations
  if (o.annotations) {
    o.annotations.forEach((a, ai) => {
      const ap = clamp01((p - 0.6 - ai * 0.1) / 0.14);
      if (ap <= 0.01) return;
      const s = series[a.series ?? 0];
      const idx = Math.min(s.points.length - 1, Math.max(0, Math.round(a.at * (s.points.length - 1))));
      const ax = px(idx), ay = py(s.points[idx][1]);
      ctx.save();
      ctx.globalAlpha = ap;
      setFont(ctx, 23, 700, FONT_UI);
      const tw = ctx.measureText(a.label).width;
      const bw = tw + 26, bh = 40;
      let bx = clampNum(ax - bw / 2, x, x + w - bw);
      let by = ay - (a.dy ?? 58);
      by = clampNum(by, y - 34, y + h - bh);
      glassCard(ctx, bx, by, bw, bh, { r: 10, shadow: false, fill: 'rgba(10,16,30,0.82)', border: rgba(TONE_HEX[a.tone || 'gold'], 0.5), sheen: false });
      ctx.fillStyle = a.tone ? TONE_HEX[a.tone] : PALETTE.goldBright;
      ctx.textAlign = 'left';
      ctx.fillText(a.label, bx + 13, by + 27);
      // connector
      ctx.beginPath();
      ctx.moveTo(ax, ay - 10);
      ctx.lineTo(clampNum(ax, bx + 8, bx + bw - 8), by + bh + (by > ay ? -4 : 4) * -1);
      ctx.strokeStyle = rgba(TONE_HEX[a.tone || 'gold'], 0.6);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
      ctx.textAlign = 'left';
    });
  }
}
function lerpNum(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clampNum(v: number, a: number, b: number): number { return Math.max(a, Math.min(b, v)); }

// ── horizontal bar row ───────────────────────────────────────────────────────
export interface BarRowOpts {
  x: number; y: number; w: number; h: number;
  label: string; value: number; maxV: number;
  p: number; t?: number;
  tone?: 'gold' | 'up' | 'down' | 'platinum' | 'steel';
  valueText?: string;
  sub?: string;
  tag?: string;
  landT?: number;        // impact time for micro-shake + ring
  valueSize?: number;
}
export function barRow(ctx: CanvasRenderingContext2D, o: BarRowOpts): number {
  const { x, y, w, h, label, value, maxV, p } = o;
  const grow = easeOutBack(clamp01(p / 0.55));
  const tone = o.tone ?? 'gold';
  const col = TONE_HEX[tone];
  const deep = { gold: PALETTE.goldDeep, up: PALETTE.upDeep, down: PALETTE.downDeep, platinum: '#39435C', steel: '#2E4468' }[tone]!;
  // label
  setFont(ctx, 30, 700, FONT_UI);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText(label, x, y + h * 0.5 + 10);
  const labelW = Math.max(ctx.measureText(label).width + 26, o.tag ? 0 : 0);
  // track
  const bx = x + labelW, bw = w - labelW;
  roundRect(ctx, bx, y + h * 0.18, bw, h * 0.64, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  // fill
  const fw = bw * (value / maxV) * grow;
  if (fw > 4) {
    const g = ctx.createLinearGradient(bx, y, bx + fw, y + h);
    g.addColorStop(0, deep);
    g.addColorStop(1, col);
    roundRect(ctx, bx, y + h * 0.18, fw, h * 0.64, 8);
    ctx.fillStyle = g;
    ctx.fill();
    // gold cap
    roundRect(ctx, bx + fw - 4, y + h * 0.18, 4, h * 0.64, 2);
    ctx.fillStyle = rgba('#FFF3D6', 0.9);
    ctx.fill();
  }
  // value numeral (U1.2): when value/maxV > 0.7 the value prints WHITE inside
  // the fill, right-aligned 16px from the bar tip over the dark cap zone (a
  // short depth-shade keeps the white legible on bright fills); otherwise it
  // sits just past the moving tip. The sub-label ALWAYS sits below the track,
  // outside it.
  const vText = o.valueText ?? `${Math.round(value * 100) / 100}`;
  setFont(ctx, o.valueSize ?? 38, 800, FONT_DISPLAY);
  const vw = ctx.measureText(vText).width;
  const frac = (value / maxV) * grow;
  if (fw > 4 && frac > 0.7 && vw + 34 < fw) {
    // dark cap zone under the value
    const capW = Math.min(fw * 0.5, vw + 52);
    const cg = ctx.createLinearGradient(bx + fw - capW, 0, bx + fw, 0);
    cg.addColorStop(0, 'rgba(10,14,26,0)');
    cg.addColorStop(1, 'rgba(10,14,26,0.5)');
    roundRect(ctx, bx + fw - capW, y + h * 0.18, capW, h * 0.64, 8);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.fillStyle = 'rgba(246,241,230,0.96)';
    ctx.fillText(vText, bx + fw - vw - 16, y + h * 0.5 + 12);
  } else {
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(vText, Math.min(bx + fw + 16, bx + bw - vw - 8), y + h * 0.5 + 12);
  }
  if (o.sub) {
    setFont(ctx, 20, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.fillText(o.sub, bx, y + h + 26);
  }
  if (o.tag) {
    chip(ctx, o.tag, bx, y - 44, { size: 22, gold: tone === 'gold' });
  }
  if (o.landT != null && o.t != null) {
    impactRing(ctx, bx + fw, y + h * 0.5, o.t, o.landT, h * 0.9, 0.7, col);
  }
  return bx + fw;
}

// ── vertical column ──────────────────────────────────────────────────────────
export interface ColOpts {
  cx: number; baseY: number; maxH: number; maxV: number; value: number;
  p: number; t?: number;
  tone?: 'gold' | 'up' | 'down' | 'platinum' | 'steel';
  valueText?: string; label?: string; width?: number;
  landT?: number;
}
export function column(ctx: CanvasRenderingContext2D, o: ColOpts): void {
  const grow = easeOutBack(clamp01(o.p / 0.55));
  const tone = o.tone ?? 'gold';
  const col = TONE_HEX[tone];
  const deep = { gold: PALETTE.goldDeep, up: PALETTE.upDeep, down: PALETTE.downDeep, platinum: '#39435C', steel: '#2E4468' }[tone]!;
  const w = o.width ?? 120;
  const hh = o.maxH * (o.value / o.maxV) * grow;
  const x = o.cx - w / 2, y = o.baseY - hh;
  if (hh > 3) {
    const g = ctx.createLinearGradient(0, y, 0, o.baseY);
    g.addColorStop(0, col);
    g.addColorStop(1, deep);
    roundRect(ctx, x, y, w, hh, 7);
    ctx.fillStyle = g;
    ctx.fill();
    // glass sheen on the column
    const sg = ctx.createLinearGradient(x, y, x + w, o.baseY);
    sg.addColorStop(0.3, 'rgba(255,255,255,0.10)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    roundRect(ctx, x, y, w, hh, 7);
    ctx.fillStyle = sg;
    ctx.fill();
    // gold cap
    roundRect(ctx, x - 2, y - 3, w + 4, 5, 2.5);
    ctx.fillStyle = '#FFF3D6';
    ctx.fill();
    if (o.valueText) {
      goldFillText(ctx, o.valueText, o.cx, y - 28, 40, 800);
    }
    if (o.landT != null && o.t != null) impactRing(ctx, o.cx, y, o.t, o.landT, 120, 0.8, col);
  }
  if (o.label) {
    setFont(ctx, 25, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'center';
    ctx.fillText(o.label, o.cx, o.baseY + 36);
    ctx.textAlign = 'left';
  }
}

// ── waterfall ────────────────────────────────────────────────────────────────
export interface WaterfallStep { label: string; value: number; tone?: 'gold' | 'up' | 'down' | 'platinum'; valueText?: string; }
export function waterfall(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  steps: WaterfallStep[], p: number, t: number
): void {
  const n = steps.length;
  const bw = Math.min(130, (w / n) * 0.52);
  const stepW = w / n;
  const maxSum = steps.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  let cursor = 0;
  const tops: { top: number; bottom: number; cx: number }[] = [];
  steps.forEach((s, i) => {
    const sp = clamp01((p - i * 0.16) / 0.3);
    if (sp <= 0) { tops.push({ top: y + h, bottom: y + h, cx: x + stepW * i + stepW / 2 }); cursor += Math.max(0, s.value); return; }
    const from = cursor;
    cursor += Math.max(0, s.value);
    const v = s.value * easeOutCubic(sp);
    const yTop = y + h - ((from + Math.max(0, v)) / maxSum) * h;
    const yBottom = y + h - (from / maxSum) * h;
    const cx = x + stepW * i + stepW / 2;
    const tone = s.tone ?? 'gold';
    const col = TONE_HEX[tone];
    const deep = { gold: PALETTE.goldDeep, up: PALETTE.upDeep, down: PALETTE.downDeep, platinum: '#39435C' }[tone]!;
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, col); g.addColorStop(1, deep);
    roundRect(ctx, cx - bw / 2, yTop, bw, yBottom - yTop, 6);
    ctx.fillStyle = g;
    ctx.fill();
    // cap
    roundRect(ctx, cx - bw / 2 - 2, yTop - 2.5, bw + 4, 4, 2);
    ctx.fillStyle = '#FFF3D6';
    ctx.fill();
    if (s.valueText) goldFillText(ctx, s.valueText, cx, yTop - 30, 34, 800);
    setFont(ctx, 22, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkFaint;
    ctx.textAlign = 'center';
    wrapText(ctx, s.label, stepW * 0.94, 22, 600, FONT_UI).forEach((ln, li) => {
      ctx.fillText(ln, cx, y + h + 26 + li * 24);
    });
    ctx.textAlign = 'left';
    // connector to next
    if (i < n - 1 && sp > 0.6) {
      ctx.beginPath();
      ctx.moveTo(cx + bw / 2, yTop);
      ctx.lineTo(cx + stepW - bw / 2 - 6, yTop);
      ctx.strokeStyle = rgba(PALETTE.inkSoft, 0.3);
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    tops.push({ top: yTop, bottom: yBottom, cx });
  });
}

// ── donut ────────────────────────────────────────────────────────────────────
export interface DonutSlice { label?: string; value: number; tone?: 'gold' | 'up' | 'down' | 'platinum' | 'steel'; }
export function donut(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  slices: DonutSlice[], p: number, t: number,
  opts: { thickness?: number; centerBig?: string; centerSub?: string; gap?: number } = {}
): void {
  const { thickness = r * 0.22, centerBig, centerSub } = opts;
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let a0 = -Math.PI / 2;
  slices.forEach((s, i) => {
    const sp = clamp01((p - i * 0.14) / 0.3);
    if (sp <= 0) { a0 += (s.value / total) * Math.PI * 2; return; }
    const sweep = (s.value / total) * Math.PI * 2 * easeOutCubic(sp);
    const col = TONE_HEX[s.tone ?? 'gold'];
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a0 + sweep);
    ctx.strokeStyle = col;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.shadowColor = rgba(col, 0.6);
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();
    a0 += (s.value / total) * Math.PI * 2;
  });
  if (centerBig && p > 0.5) {
    const cp = clamp01((p - 0.5) / 0.2);
    ctx.save();
    ctx.globalAlpha = cp;
    goldFillText(ctx, centerBig, cx, cy + (centerSub ? -4 : 14), 64, 800, FONT_DISPLAY, 'center');
    if (centerSub) {
      setFont(ctx, 22, 600, FONT_UI);
      ctx.fillStyle = PALETTE.inkFaint;
      ctx.textAlign = 'center';
      ctx.fillText(centerSub, cx, cy + 30);
    }
    ctx.restore();
    ctx.textAlign = 'left';
  }
}

// ── dot grid (N of M highlighted) ────────────────────────────────────────────
export function dotGrid(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  total: number, highlight: number, p: number, t: number,
  opts: { cols?: number; hiTone?: string; baseTone?: string; caption?: string } = {}
): void {
  const cols = opts.cols ?? 25;
  const rows = Math.ceil(total / cols);
  const gx = w / cols, gy = h / rows;
  const r = Math.min(gx, gy) * 0.22;
  const shown = Math.floor(total * clamp01(p / 0.7));
  for (let i = 0; i < total; i++) {
    if (i > shown) break;
    const col = i % cols, row = Math.floor(i / cols);
    const cx = x + col * gx + gx / 2, cy = y + row * gy + gy / 2;
    const isHi = i < highlight;
    const appear = clamp01((p * total - i) / 6);
    if (isHi) {
      const pulse = 1 + 0.12 * Math.sin(t / 700 + i);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.75 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = opts.hiTone ?? PALETTE.goldBright;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(PALETTE.gold, 0.4 * appear);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(opts.baseTone ?? PALETTE.inkSoft, 0.4 * appear);
      ctx.fill();
    }
  }
}

// ── hero stat card ───────────────────────────────────────────────────────────
export interface StatCardOpts {
  x: number; y: number; w: number; h: number;
  big: string; label: string; sub?: string;
  p: number; t?: number;
  tone?: 'gold' | 'up' | 'down' | 'platinum';
  goldEdge?: boolean;
  bigSize?: number;
  tag?: string;
}
export function statCard(ctx: CanvasRenderingContext2D, o: StatCardOpts): void {
  const ent = easeOutCubic(clamp01(o.p / 0.4));
  ctx.save();
  ctx.globalAlpha = clamp01(o.p * 3);
  glassCard(ctx, o.x + (1 - ent) * 26, o.y, o.w, o.h, { r: 22, goldEdge: o.goldEdge ?? o.tone === 'gold', border: o.tone === 'down' ? rgba(PALETTE.down, 0.4) : o.tone === 'up' ? rgba(PALETTE.up, 0.4) : undefined });
  // S-06 — the value no longer crowds the left border (padding 44 → 56) and
  // the label's shrink floor rises 13 → 18 so it stays legible on phones
  const ix = o.x + 56, iy = o.y + 66;
  // label — through the existing fitText() with maxW matched to the new inset
  // (U1.3): type shrinks to fit, so the plate label can never run past the edge
  fitText(ctx, o.label.toUpperCase(), ix, iy, o.w - 104, 24, 700, FONT_UI, PALETTE.inkFaint, 18, '4px');
  const countP = clamp01((o.p - 0.18) / 0.5);
  const bigSize = o.bigSize ?? 120;
  // count-up for numeric-looking values
  const m = o.big.match(/^[$€]?([\d,]+(?:\.\d+)?)\s*([%MBK]?)$/);
  if (m && countP < 1) {
    const target = parseFloat(m[1].replace(/,/g, ''));
    const dec = (m[1].split('.')[1] || '').length;
    const cur = target * countP;
    const shown = `${m[0][0] === '$' ? '$' : ''}${cur.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${m[2]}`;
    goldFillText(ctx, shown, ix, iy + bigSize * 0.86, bigSize, 800);
  } else {
    goldFillText(ctx, o.big, ix, iy + bigSize * 0.86, bigSize, 800);
  }
  if (o.sub) {
    setFont(ctx, 26, 600, FONT_UI);
    ctx.fillStyle = PALETTE.inkSoft;
    wrapText(ctx, o.sub, o.w - 104, 26, 600, FONT_UI).forEach((ln, i) => {
      ctx.fillText(ln, ix, iy + bigSize * 1.12 + 14 + i * 34);
    });
  }
  if (o.tag) chip(ctx, o.tag, ix, o.y + o.h - 58, { size: 24, gold: o.tone === 'gold' });
  ctx.restore();
}
