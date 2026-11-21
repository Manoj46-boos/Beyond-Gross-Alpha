/**
 * AURUM design system — "Midnight Ledger".
 * A private-bank cinematic look: deep navy (never pure black), champagne gold,
 * platinum type, glass panels, one warm key-light. Built for the After-Tax
 * Returns episode — deliberately unlike the ivory/teal K-Shaped identity.
 */

import { clamp01, easeOutCubic, hash01 } from './easing';

// ── palette ──────────────────────────────────────────────────────────────────
export const PALETTE = {
  // the room (rich navy — never pure black)
  bg0: '#070B14',
  bg1: '#0B1120',
  bg2: '#101A30',
  bg3: '#16223A',
  horizon: '#0E1730',
  glowIndigo: '#2A4470',
  glowGold: '#8A6D1F',

  // gold family
  gold: '#D4AF37',
  goldBright: '#E9C766',
  goldDeep: '#9C7C1E',
  goldPale: '#F4E5BF',
  goldDim: '#6E5716',

  // platinum ink family
  ink: '#F2F5FA',
  inkSoft: '#B9C4D8',
  inkMuted: '#8494AE',
  inkFaint: '#5D6C85',
  inkGhost: '#3A4860',

  // data tones
  up: '#35C48D',
  upDeep: '#1E8A63',
  down: '#E5484D',
  downDeep: '#8F2E33',
  steel: '#7FA3D8',
  violet: '#9B8CFF',

  // materials
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(255,255,255,0.085)',
  glassBorder: 'rgba(185,196,216,0.16)',
  glassBorderGold: 'rgba(212,175,55,0.30)',
  shadow: 'rgba(3,6,14,0.62)',
} as const;

export const FONT_DISPLAY = '"Playfair Display", Georgia, "Times New Roman", serif';
export const FONT_UI = '"Manrope", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ── layout law (1920×1080 design grid) ───────────────────────────────────────
export const M = {
  x: 120,
  top: 110,
  titleY: 176,
  horizonY: 0.72, // floor line (fraction of H)
  captionZoneTop: 812, // scene content stays above this
  captionY: 966,
  sourceY: 1030,
} as const;

export const W_REF = 1920;
export const H_REF = 1080;

// ── color utilities ──────────────────────────────────────────────────────────
export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
export function hexLerp(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}
export const mixHex = hexLerp;

// ── text ─────────────────────────────────────────────────────────────────────
export function setFont(ctx: CanvasRenderingContext2D, size: number, weight: number, family: string = FONT_UI): void {
  ctx.font = `${weight} ${size}px ${family}`;
}
export function fontStr(size: number, weight: number, family: string = FONT_UI): string {
  return `${weight} ${size}px ${family}`;
}

/** auto-fit a single line by shrinking; returns final size */
export function fitText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  maxW: number, size: number, weight: number, family = FONT_UI,
  fill = PALETTE.ink, floor = 30, letterSpacing = ''
): number {
  let s = size;
  setFont(ctx, s, weight, family);
  while (ctx.measureText(text).width > maxW && s > floor) {
    s -= 2;
    setFont(ctx, s, weight, family);
  }
  if (letterSpacing) (ctx as any).letterSpacing = letterSpacing;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  if (letterSpacing) (ctx as any).letterSpacing = '0px';
  return s;
}

/** multi-line wrap; returns the lines */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: number, family = FONT_UI): string[] {
  setFont(ctx, size, weight, family);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── primitives ───────────────────────────────────────────────────────────────
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** soft ambient disc */
export function glowBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.4));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * AURUM glass panel: navy glass fill, hairline border, gold top-edge option,
 * a long soft drop shadow and a faint inner sheen. The material every card,
 * statement and data plate sits on.
 */
export function glassCard(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  opts: { r?: number; alpha?: number; border?: string; goldEdge?: boolean; fill?: string; sheen?: boolean; shadow?: boolean } = {}
): void {
  const { r = 18, alpha = 1, border = PALETTE.glassBorder, goldEdge = false, fill = PALETTE.glass, sheen = true, shadow = true } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (shadow) {
    ctx.shadowColor = PALETTE.shadow;
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 16;
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = 'transparent';
  } else {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (sheen) {
    const sg = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
    sg.addColorStop(0, 'rgba(255,255,255,0.055)');
    sg.addColorStop(0.35, 'rgba(255,255,255,0.015)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = sg;
    ctx.fill();
  }
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (goldEdge) {
    ctx.save();
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, r);
    ctx.clip();
    const eg = ctx.createLinearGradient(x, y, x + w, y);
    eg.addColorStop(0, rgba(PALETTE.gold, 0));
    eg.addColorStop(0.5, rgba(PALETTE.goldBright, 0.5));
    eg.addColorStop(1, rgba(PALETTE.gold, 0));
    ctx.fillStyle = eg;
    ctx.fillRect(x, y, w, 1.6);
    ctx.restore();
  }
  ctx.restore();
}

/** vertical gradient fill for bars/columns (steel→deep or gold) */
export function gradientFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, bottom: string, r = 6): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = g;
  ctx.fill();
}

/** gold text with a subtle vertical sheen (for hero numerals) */
export function goldFillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight = 700, family = FONT_DISPLAY, align: CanvasTextAlign = 'left'): void {
  setFont(ctx, size, weight, family);
  ctx.textAlign = align;
  const g = ctx.createLinearGradient(0, y - size * 0.8, 0, y + size * 0.15);
  g.addColorStop(0, PALETTE.goldPale);
  g.addColorStop(0.45, PALETTE.goldBright);
  g.addColorStop(1, PALETTE.gold);
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

/** thin horizontal gold rule that draws outward from a centre */
export function goldRule(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, grow: number, alpha = 1, weight = 2.4): void {
  const e = clamp01(grow);
  if (e <= 0.01) return;
  const hw = (w / 2) * easeOutCubic(e);
  const g = ctx.createLinearGradient(cx - hw, y, cx + hw, y);
  g.addColorStop(0, rgba(PALETTE.gold, 0));
  g.addColorStop(0.5, rgba(PALETTE.goldBright, alpha));
  g.addColorStop(1, rgba(PALETTE.gold, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - hw, y, hw * 2, weight);
}

/** pill chip — used for kickers, tags and data labels */
export function chip(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  opts: { size?: number; padX?: number; padY?: number; bg?: string; fg?: string; border?: string; weight?: number; dot?: string; gold?: boolean; alpha?: number; center?: boolean } = {}
): number {
  const { size = 30, padX = 24, padY = 13, bg = 'rgba(255,255,255,0.055)', fg = PALETTE.inkSoft, border = PALETTE.glassBorder, weight = 600, dot = null as any, gold = false, alpha = 1, center = false } = opts;
  setFont(ctx, size, weight, FONT_UI);
  const tw = ctx.measureText(text).width;
  const w = tw + padX * 2 + (dot ? 30 : 0);
  const h = size + padY * 2;
  const px = center ? x - w / 2 : x;
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, px, y, w, h, h / 2);
  ctx.fillStyle = gold ? rgba(PALETTE.gold, 0.10) : bg;
  ctx.fill();
  ctx.strokeStyle = gold ? PALETTE.glassBorderGold : border;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  if (dot) {
    ctx.beginPath();
    ctx.arc(px + padX + 7, y + h / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = dot;
    ctx.fill();
  }
  ctx.fillStyle = gold ? PALETTE.goldBright : fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px + padX + (dot ? 30 : 0), y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
  return w;
}

export function chipWidth(ctx: CanvasRenderingContext2D, text: string, size = 30, padX = 24, dot = false): number {
  setFont(ctx, size, 600, FONT_UI);
  return ctx.measureText(text).width + padX * 2 + (dot ? 30 : 0);
}

/** kicker — the small letterspaced gold label above headlines */
export function kicker(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha = 1, size = 27): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  setFont(ctx, size, 700, FONT_UI);
  try { (ctx as any).letterSpacing = '6px'; } catch { /* not supported */ }
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(text.toUpperCase(), x, y);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  ctx.restore();
}

/** serif scene headline (the AURUM editorial headline) */
export function headline(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  maxW: number, size: number, alpha: number, color = PALETTE.ink, weight = 700, family = FONT_DISPLAY
): number {
  const lines = wrapText(ctx, text, maxW, size, weight, family);
  ctx.save();
  ctx.globalAlpha = alpha;
  setFont(ctx, size, weight, family);
  ctx.fillStyle = color;
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * size * 1.18));
  ctx.restore();
  return lines.length;
}

/** diamond marker (progress bar / list bullets) */
export function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = fill;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

// ── alpha helpers used everywhere ────────────────────────────────────────────
export const fadeIn = (t: number, dur = 420): number => clamp01(t / dur);
export const fadeOut = (t: number, end: number, dur = 420): number => clamp01((end - t) / dur);

/** deterministic seed per scene/beat */
export const seedOf = (key: string, extra = 0): number => Math.floor(hash01(key.length * 131 + extra * 17 + (key.charCodeAt(0) || 7)) * 1e6);

/** the brand α glyph, drawn as strokes (used in watermark/brand moments) */
export function drawAlphaGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = PALETTE.gold, lineWidth = 7, grow = 1): void {
  // stylised alpha: a loop + right leg, single stroke path
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const w = s * 1.0, h = s * 1.16;
  // loop: ellipse-ish from top-left through bottom loop
  const cx = x + w * 0.42;
  const cy = y - h * 0.36;
  const steps = 40;
  const total = Math.floor(steps * clamp01(grow));
  ctx.beginPath();
  for (let i = 0; i <= total; i++) {
    const p = i / steps;
    // parametric alpha curve: loop (p 0..0.72) then right leg (0.72..1)
    let px: number, py: number;
    if (p < 0.72) {
      const q = p / 0.72;
      const a = Math.PI * 1.9 + q * Math.PI * 2.6; // sweep around loop
      const rx = w * 0.34 * (1 - 0.18 * q);
      const ry = h * 0.36 * (1 - 0.30 * Math.sin(q * Math.PI));
      px = cx + Math.cos(a) * rx;
      py = cy - Math.sin(a) * ry * 1.15;
    } else {
      const q = (p - 0.72) / 0.28;
      const sx = x + w * 0.30;
      const sy = y - h * 0.16;
      px = sx + (w * 0.72 - 0) * q;
      py = sy + h * 0.16 * q * q * 0.4 + h * 0.02;
    }
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}
