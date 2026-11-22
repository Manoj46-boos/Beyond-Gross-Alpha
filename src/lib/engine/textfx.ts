/**
 * AURUM text layer — captions, chapter cards, source chips, watermark,
 * progress bar. The dark-glass caption with the gold karaoke sweep is the
 * signature reading experience of this film.
 */

import { PALETTE, rgba, setFont, roundRect, glassCard, wrapText, FONT_DISPLAY, FONT_UI, fitText, goldRule, diamond, hexLerp, drawAlphaGlyph } from './theme';
import { clamp01, easeOutCubic, easeInOutSine, springTo, hash01, hashStr } from './easing';
import { goldDust } from './fx';

// ── captions ─────────────────────────────────────────────────────────────────
export interface CaptionWord { t: number; d: number; w: string; }
export interface CaptionLine { start: number; end: number; words: CaptionWord[]; }
export interface CaptionStyle {
  mode: 'karaoke' | 'simple' | 'off';
  maxRows?: number;
  maxWords?: number;
}

const CAP_FLOOR_Y = 968;

export function drawCaptions(
  ctx: CanvasRenderingContext2D, W: number, H: number, tMs: number,
  lines: CaptionLine[], style: CaptionStyle
): void {
  if (style.mode === 'off') return;
  // D15: caption engineering sized for mobile — 52px type (4.8% of frame
  // height, the YouTube mobile convention zone), a 10-word window so the pill
  // re-flows less mid-sentence, and a weightier karaoke sweep.
  const maxWords = style.maxWords ?? 10;
  const maxRows = style.maxRows ?? 2;
  // active line = last with t in [start-120, end+260]
  let line: CaptionLine | null = null;
  for (const l of lines) {
    if (tMs >= l.start - 120 && tMs <= l.end + 260) line = l;
  }
  if (!line) return;

  const lastSpoken = line.words.reduce((acc, w, i) => (tMs >= w.t ? i : acc), -1);
  const winStart = line.words.length <= maxWords ? 0 : Math.max(0, Math.min(Math.max(0, lastSpoken - 2), line.words.length - maxWords));
  const words = line.words.slice(winStart, winStart + maxWords);

  // build rows (break on clause punctuation near the middle, else greedy)
  setFont(ctx, 54, 700, FONT_UI);
  const maxW = Math.min(W - 480, W * 0.64);
  const spaceW = ctx.measureText(' ').width;
  const items = words.map((w) => ({ ...w, ww: ctx.measureText(w.w).width }));
  const rows: typeof items[] = [];
  if (items.length > 5 && maxRows >= 2) {
    let midTotal = items.reduce((a, i) => a + i.ww, 0) / 2;
    let acc = 0, breakIdx = -1, bestDist = Infinity;
    for (let i = 0; i < items.length - 1; i++) {
      acc += items[i].ww + spaceW;
      const dist = Math.abs(acc - midTotal);
      const clause = /[,;:.!?—–")%]$/.test(items[i].w);
      const score = dist - (clause ? 120 : 0);
      if (score < bestDist) { bestDist = score; breakIdx = i; }
    }
    rows.push(items.slice(0, breakIdx + 1), items.slice(breakIdx + 1));
  } else {
    rows.push(items);
  }

  const rowH = 66, padX = 38, padY = 24;
  const widest = Math.max(...rows.map((r) => r.reduce((a, i) => a + i.ww, 0) + (r.length - 1) * spaceW));
  const pillW = widest + padX * 2;
  const pillH = rows.length * rowH + padY * 2 - 8;
  const px = (W - pillW) / 2;
  const py = CAP_FLOOR_Y - pillH;

  // entrance spring + dissolve
  const ent = springTo(0.86, 1, Math.min(300, Math.max(0, tMs - (line.start - 120))), 190, 16);
  const ageIn = tMs - (line.start - 120);
  const aIn = clamp01(ageIn / 140);
  const ageOut = line.end + 260 - tMs;
  const aOut = clamp01(ageOut / 240);
  const alpha = Math.min(aIn, aOut);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, CAP_FLOOR_Y);
  ctx.scale(ent, ent);
  ctx.translate(-W / 2, -CAP_FLOOR_Y);

  // dark glass pill — the AURUM caption
  roundRect(ctx, px, py, pillW, pillH, 16);
  ctx.fillStyle = 'rgba(8,12,22,0.72)';
  ctx.fill();
  ctx.strokeStyle = rgba(PALETTE.gold, 0.28);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // gold voice tab on the left
  ctx.fillStyle = rgba(PALETTE.gold, 0.85);
  roundRect(ctx, px + 14, py + pillH / 2 - 14, 3.4, 28, 2);
  ctx.fill();

  // words
  let spokenGlobalIdx = winStart;
  rows.forEach((row, ri) => {
    const rowW = row.reduce((a, i) => a + i.ww, 0) + (row.length - 1) * spaceW;
    let cx = px + (pillW - rowW) / 2;
    const cy = py + padY + ri * rowH + 46;
    for (const item of row) {
      const idx = spokenGlobalIdx++;
      const active = idx === lastSpoken;
      const spoken = idx <= lastSpoken;
      let fill = spoken ? PALETTE.ink : rgba(PALETTE.inkMuted, 0.72);
      if (active) fill = PALETTE.goldBright;
      setFont(ctx, 54, 700, FONT_UI);
      ctx.fillStyle = fill;
      const punch = active ? 1 + 0.12 * (1 - clamp01((tMs - item.t) / 260)) : 1; // U4.4 — 1.12
      if (punch !== 1) {
        ctx.save();
        ctx.translate(cx + item.ww / 2, cy);
        ctx.scale(punch, punch);
        ctx.fillText(item.w, -item.ww / 2, 0);
        ctx.restore();
      } else {
        ctx.fillText(item.w, cx, cy);
      }
      // karaoke gold sweep underline under the active word
      if (active) {
        const prog = clamp01((tMs - item.t) / Math.max(1, item.d));
        const ux = cx, uw = item.ww * easeOutCubic(prog);
        ctx.fillStyle = rgba(PALETTE.goldBright, 0.9);
        ctx.fillRect(ux, cy + 13, uw, 4); // U4.4 — 4px underline
      }
      cx += item.ww + spaceW;
    }
  });
  ctx.restore();
}

// ── source chip (the script's retention device) ──────────────────────────────
export function drawSourceChip(
  ctx: CanvasRenderingContext2D, W: number, tMs: number,
  text: string, startMs: number, durMs = 3200
): void {
  const local = tMs - startMs;
  if (local < 0 || local > durMs) return;
  const aIn = clamp01(local / 240);
  const aOut = clamp01((durMs - local) / 300);
  const alpha = Math.min(aIn, aOut);
  setFont(ctx, 28, 600, FONT_UI);
  // document glyph + text
  const tw = ctx.measureText(text).width;
  const w = tw + 74, h = 44;
  const x = MARGIN_X, y = 1006;
  ctx.save();
  ctx.globalAlpha = alpha;
  glassCard(ctx, x, y, w, h, { r: 10, shadow: false, fill: 'rgba(9,13,24,0.7)', border: rgba(PALETTE.gold, 0.3), sheen: false });
  // small serif document icon
  ctx.save();
  ctx.translate(x + 24, y + h / 2);
  ctx.strokeStyle = PALETTE.goldBright;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-7, -10, 14, 19);
  ctx.beginPath();
  ctx.moveTo(-4, -4); ctx.lineTo(4, -4);
  ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
  ctx.moveTo(-4, 4); ctx.lineTo(2, 4);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText(text, x + 50, y + h / 2 + 8);
  ctx.restore();
}
const MARGIN_X = 120;

// ── watermark ────────────────────────────────────────────────────────────────
export function drawWatermark(ctx: CanvasRenderingContext2D, W: number, channelName: string, alpha = 0.8): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  setFont(ctx, 28, 700, FONT_UI);
  try { (ctx as any).letterSpacing = '4px'; } catch { /* noop */ }
  ctx.fillStyle = rgba(PALETTE.inkSoft, 0.9);
  const name = channelName.toUpperCase();
  const tw = ctx.measureText(name).width;
  ctx.fillText(name, 64, 64);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }
  // gold alpha glyph mark — the ONE shared brand vector (D16)
  drawAlphaGlyph(ctx, 26, 72, 30, rgba(PALETTE.gold, 0.9), 3.4);
  ctx.restore();
}

// ── progress bar with diamond chapter markers ────────────────────────────────
export function drawProgressBar(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  progress: number, chapterFracs: number[]
): void {
  const y = H - 14, h = 5, x = 0, w = W;
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x + w * progress, y);
  g.addColorStop(0, PALETTE.goldDeep);
  g.addColorStop(1, PALETTE.goldBright);
  ctx.shadowColor = rgba(PALETTE.gold, 0.55);
  ctx.shadowBlur = 12;
  roundRect(ctx, x, y, Math.max(4, w * progress), h, h / 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  for (const f of chapterFracs) {
    diamond(ctx, x + w * f, y + h / 2, 4.4, rgba(PALETTE.goldPale, 0.95));
  }
  ctx.restore();
}

// ── chapter card — the AURUM interlude ───────────────────────────────────────
export function drawChapterCard(
  ctx: CanvasRenderingContext2D, W: number, H: number, tMs: number, durMs: number,
  index: number, title: string, overall: number, totalChapters: number
): void {
  const p = clamp01(tMs / durMs);
  const aIn = clamp01(tMs / 380);
  const aOut = clamp01((durMs - tMs) / 340);
  const alpha = Math.min(aIn, aOut);
  if (alpha <= 0) return;

  // navy room
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, PALETTE.bg2);
  base.addColorStop(0.5, PALETTE.bg1);
  base.addColorStop(1, PALETTE.bg0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  goldDust(ctx, W, H, tMs + index * 3000, index * 7 + 3, 0.7);

  const cx = W / 2, cy = H / 2;
  // ghost numeral
  const num = String(index).padStart(2, '0');
  const ent = springTo(0.7, 1, Math.min(700, tMs), 130, 14);
  ctx.save();
  ctx.translate(cx, cy - 36);
  ctx.scale(ent, ent);
  setFont(ctx, 330, 800, FONT_DISPLAY);
  ctx.textAlign = 'center';
  const ng = ctx.createLinearGradient(0, -230, 0, 120);
  ng.addColorStop(0, rgba(PALETTE.goldPale, 0.16));
  ng.addColorStop(1, rgba(PALETTE.gold, 0.05));
  ctx.fillStyle = ng;
  ctx.fillText(num, 0, 60);
  // sheen sweep across the numeral
  const sweep = ((tMs / 1500) % 1.4) - 0.2;
  const sg = ctx.createLinearGradient(sweep * 500 - 250, -200, sweep * 500 + 250, 140);
  sg.addColorStop(0, 'rgba(255,247,220,0)');
  sg.addColorStop(0.5, 'rgba(255,247,220,0.16)');
  sg.addColorStop(1, 'rgba(255,247,220,0)');
  ctx.fillStyle = sg;
  ctx.fillText(num, 0, 60);
  ctx.restore();

  // PART label
  setFont(ctx, 27, 700, FONT_UI);
  try { (ctx as any).letterSpacing = '7px'; } catch { /* noop */ }
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = 'center';
  ctx.fillText(`PART ${index + 1}`, cx, cy - 180);
  try { (ctx as any).letterSpacing = '0px'; } catch { /* noop */ }

  // gold rules
  const ruleP = clamp01((tMs - 160) / 600);
  goldRule(ctx, cx, cy - 140, 560, ruleP, 1);

  // title in luxury serif italic
  ctx.save();
  const tEnt = springTo(0.94, 1, Math.min(760, Math.max(0, tMs - 160)), 150, 15);
  ctx.translate(cx, cy + 70);
  ctx.scale(tEnt, tEnt);
  setFont(ctx, 74, 700, FONT_DISPLAY);
  const lines = wrapText(ctx, title, 1150, 74, 700, FONT_DISPLAY);
  ctx.fillStyle = PALETTE.ink;
  lines.forEach((ln, i) => ctx.fillText(ln, 0, i * 88));
  ctx.restore();

  // progress dots
  const dotY = cy + 210;
  for (let i = 0; i < totalChapters; i++) {
    const dx = cx - (totalChapters - 1) * 22 + i * 44;
    if (i === index) {
      diamond(ctx, dx, dotY, 7, PALETTE.goldBright);
    } else {
      diamond(ctx, dx, dotY, 4.4, rgba(PALETTE.inkMuted, i <= index ? 0.7 : 0.3));
    }
  }
  // the shared brand α (U1.4) — one glyph across watermark, chapter cards, end screen
  drawAlphaGlyph(ctx, cx - 210, cy + 250, 30, rgba(PALETTE.gold, 0.9), 3.4, clamp01((tMs - 500) / 700));
  ctx.textAlign = 'left';
  ctx.restore();
}

/** light-blade + fade-through-navy scene transition (replaces the K-wipe) */
export function sceneTransition(ctx: CanvasRenderingContext2D, W: number, H: number, p: number): void {
  if (p <= 0 || p >= 1) return;
  const half = p < 0.5 ? p * 2 : (1 - p) * 2;
  ctx.save();
  ctx.fillStyle = rgba('#070B14', 0.55 * (1 - Math.abs(p - 0.5) * 2));
  ctx.fillRect(0, 0, W, H);
  const x = W * p;
  const g = ctx.createLinearGradient(x - 160, 0, x + 160, H);
  g.addColorStop(0, rgba(PALETTE.goldBright, 0));
  g.addColorStop(0.5, rgba('#FFF7DC', 0.5 * Math.sin(Math.PI * half)));
  g.addColorStop(1, rgba(PALETTE.goldBright, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - 160, 0, 320, H);
  ctx.restore();
}

// ── big statement text (full-frame serif) ────────────────────────────────────
/** D11 — typographic rest beats still anchor the frame: a ghost chapter
 *  numeral, a ruled hairline frame with gold corner ticks, and one breathing
 *  gold object. Without it the statement family is two dim lines on a void,
 *  which on a phone in daylight reads as a playback error. */
export function statementAnchor(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  chapterIdx: number, tMs: number, ghost?: string
): void {
  const a = clamp01(tMs / 700);
  // U4.2 — hairline gold rule frame inset 90 px (report spec)
  const m = 90;
  // L-04 — the room stays ALIVE on rest beats (a void reads as a playback
  // error in daylight): a horizon glow pooling above the floor, two quiet
  // vertical hairlines flanking the text zone, and five drifting dust motes
  // inside the ruled frame — all deterministic.
  const breathe = 0.5 + 0.5 * Math.sin(tMs / 3000);
  ctx.save();
  ctx.globalAlpha = a;
  const horizon = ctx.createLinearGradient(0, H * 0.78, 0, H * 0.98);
  horizon.addColorStop(0, rgba(PALETTE.gold, 0));
  horizon.addColorStop(0.72, rgba(PALETTE.gold, 0.10 + 0.05 * breathe));
  horizon.addColorStop(1, rgba(PALETTE.gold, 0));
  ctx.fillStyle = horizon;
  ctx.fillRect(m, H * 0.78, W - 2 * m, H * 0.2);
  ctx.strokeStyle = rgba(PALETTE.steel, 0.22);
  ctx.lineWidth = 1;
  for (const vx of [m + 96, W - m - 96]) {
    ctx.beginPath();
    ctx.moveTo(vx, H * 0.24);
    ctx.lineTo(vx, H * 0.8);
    ctx.stroke();
  }
  for (let k = 0; k < 5; k++) {
    const dx = m + 130 + hash01(k * 7.3 + 1.7) * (W - 2 * m - 260);
    const dy = H * 0.2 + hash01(k * 3.1 + 9.2) * H * 0.55 + Math.sin(tMs / 2600 + k * 2.1) * 14;
    const dr = 1.6 + hash01(k * 11.7) * 1.8;
    ctx.fillStyle = rgba(PALETTE.goldBright, 0.16 + 0.14 * Math.sin(tMs / 1800 + k * 1.9));
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // ruled frame + gold corner ticks
  ctx.save();
  ctx.globalAlpha = 0.55 * a;
  ctx.strokeStyle = rgba(PALETTE.steel, 0.38);
  ctx.lineWidth = 1;
  ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
  ctx.strokeStyle = rgba(PALETTE.gold, 0.75);
  ctx.lineWidth = 2;
  const L = 34;
  for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * L);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * L, cy);
    ctx.stroke();
  }
  ctx.restore();
  // ghost chapter numeral — huge, quiet, top-right. L-04 — presence raised
  // from a flat 13% to a vertical gradient wash (top 0.22 → base 0.09): it
  // finally registers as an object, not sensor noise.
  ctx.save();
  ctx.globalAlpha = a;
  setFont(ctx, 500, 800, FONT_DISPLAY);
  ctx.textAlign = 'right';
  const num = ghost ?? String((chapterIdx % 10) + 1).padStart(2, '0');
  const numG = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.6);
  numG.addColorStop(0, rgba(PALETTE.inkGhost, 0.22));
  numG.addColorStop(1, rgba(PALETTE.inkGhost, 0.09));
  ctx.fillStyle = numG;
  ctx.fillText(num, W - m - 24, H * 0.58);
  ctx.textAlign = 'left';
  ctx.restore();
  // the single gold object — a breathing diamond above the text zone, now
  // carrying a soft halo so it reads as lit, not stamped (L-04)
  ctx.save();
  ctx.globalAlpha = (0.55 + 0.25 * breathe) * a;
  ctx.translate(W / 2, H * 0.15);
  const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 52 + 6 * breathe);
  halo.addColorStop(0, rgba(PALETTE.goldBright, 0.34));
  halo.addColorStop(1, rgba(PALETTE.goldBright, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(-70, -70, 140, 140);
  ctx.rotate(Math.PI / 4);
  const ds = 18 + 2.4 * breathe;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(-ds / 2, -ds / 2, ds, ds);
  ctx.strokeStyle = rgba(PALETTE.goldPale, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(-ds / 2, -ds / 2, ds, ds);
  ctx.restore();
}

export function drawStatement(
  ctx: CanvasRenderingContext2D, W: number, H: number, tMs: number,
  lines: string[], opts: { sub?: string; accentWords?: string[]; size?: number; ghost?: string; chapterIdx?: number } = {}
): void {
  const size = opts.size ?? 88;
  const accent = new Set((opts.accentWords || []).map((w) => w.toLowerCase()));
  const total = lines.length;
  // D11 — anchor the rest beat: numeral + ruled frame + gold object
  statementAnchor(ctx, W, H, opts.chapterIdx ?? 0, tMs, opts.ghost);
  ctx.save();
  lines.forEach((ln, i) => {
    const local = tMs - i * 320;
    const a = clamp01(local / 380);
    const rise = springTo(26, 0, Math.min(600, Math.max(0, local)), 140, 15);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, rise);
    setFont(ctx, size, 700, FONT_DISPLAY);
    ctx.fillStyle = PALETTE.ink;
    const words = ln.split(/\s+/);
    const tw = words.reduce((acc, w) => acc + ctx.measureText(w + ' ').width, 0);
    let x = (W - tw) / 2;
    const y = H * 0.44 + i * size * 1.22;
    for (const w of words) {
      const ww = ctx.measureText(w).width;
      if (accent.has(w.toLowerCase().replace(/[^a-z$%]/g, ''))) {
        const gg = ctx.createLinearGradient(0, y - size, 0, y + 10);
        gg.addColorStop(0, PALETTE.goldPale);
        gg.addColorStop(1, PALETTE.gold);
        ctx.fillStyle = gg;
      } else {
        ctx.fillStyle = PALETTE.ink;
      }
      ctx.fillText(w, x, y);
      x += ww + ctx.measureText(' ').width;
    }
    ctx.restore();
  });
  if (opts.sub) {
    const a = clamp01((tMs - total * 320 - 100) / 380);
    ctx.globalAlpha = a * 0.9;
    setFont(ctx, 34, 500, FONT_UI);
    ctx.fillStyle = PALETTE.inkMuted;
    ctx.textAlign = 'center';
    ctx.fillText(opts.sub, W / 2, H * 0.44 + total * size * 1.22 + 60);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}
