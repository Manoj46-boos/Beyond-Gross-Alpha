/**
 * AURUM stage — the room every scene plays in.
 * Deep navy gradient (never pure black), two breathing ambient glows (indigo +
 * gold), a faint blueprint lattice above the horizon and a perspective floor
 * grid below it, a glowing gold horizon hairline and a slow diagonal "sheen"
 * band that drifts across like light off polished marble.
 */

import { PALETTE, rgba, glowBlob } from './theme';
import { clamp01, easeInOutSine, hash01, drift } from './easing';

export interface StageOpts {
  tone?: 'neutral' | 'gold' | 'down' | 'up';
  grid?: number;         // lattice strength 0..1
  floor?: boolean;       // perspective floor
  sheen?: number;        // marble sheen strength 0..1
  /** dim the horizon hairline behind a standing figure (D2) — the line stops
   *  reading as a 'skateboard' he straddles and reads as depth behind him */
  horizonFade?: { x: number; r: number };
  /** large soft key-light pool behind the figure (D13) — separates the
   *  character from the room so the frame never reads as figures on a void */
  keyLight?: { x: number; y: number; r: number };
}

export function paintStage(
  ctx: CanvasRenderingContext2D, W: number, H: number, t: number,
  opts: StageOpts = {}
): void {
  const { tone = 'neutral', grid = 1, floor = true, sheen = 0.8 } = opts;

  // 1. vertical navy gradient — the "never pure black" base
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, PALETTE.bg2);
  base.addColorStop(0.42, PALETTE.bg1);
  base.addColorStop(0.82, PALETTE.bg0);
  base.addColorStop(1, '#080D19');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // 2. breathing ambient glows — indigo upper-right, gold lower-left
  const breathe = 0.5 + 0.5 * Math.sin(t / 5200);
  const breathe2 = 0.5 + 0.5 * Math.sin(t / 7100 + 2.1);
  const toneTint = tone === 'gold' ? '#B08A28' : tone === 'down' ? '#5A2A32' : tone === 'up' ? '#1F5A4C' : '#2A4470';
  glowBlob(ctx, W * 0.84, H * 0.14, W * 0.55, toneTint, 0.115 + 0.028 * breathe);
  glowBlob(ctx, W * 0.10, H * 0.88, W * 0.42, tone === 'down' ? '#3A1A22' : '#8A6D1F', 0.075 + 0.022 * breathe2);
  // D13: the key-light pool — one large soft radial behind the subject so the
  // figure separates from the room at a glance
  if (opts.keyLight) {
    const k = opts.keyLight;
    glowBlob(ctx, k.x, k.y, k.r, '#3D5578', 0.30);
    glowBlob(ctx, k.x, k.y, k.r * 0.55, '#C8A94E', 0.10);
  }

  // 3. blueprint lattice (above horizon) — dots + hairlines.
  // D13: raised from 0.05 to 0.10 — the old alpha was sub-perceptual at 12
  // Mbps, so the 'Midnight Ledger' identity paid a complexity cost for nothing.
  if (grid > 0) {
    const step = 96;
    ctx.save();
    ctx.globalAlpha = 0.10 * grid;
    ctx.strokeStyle = PALETTE.inkSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = step / 2; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H * 0.73); }
    for (let y = step / 2; y < H * 0.73; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.restore();

    // faint node diamonds at some intersections (deterministic)
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const gx = Math.floor(hash01(i * 7.3 + 11) * (W / step)) * step + step / 2;
      const gy = Math.floor(hash01(i * 3.1 + 5) * 7) * step + step / 2;
      const a = 0.16 + 0.14 * Math.sin(t / 1800 + i * 2.1);
      if (a <= 0) continue;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = rgba(i % 3 === 0 ? PALETTE.gold : PALETTE.inkMuted, a);
      ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
      ctx.restore();
    }
    ctx.restore();
  }

  // 4. perspective floor grid below the horizon
  const hy = H * 0.72;
  if (floor) {
    ctx.save();
    // floor darkening
    const fg = ctx.createLinearGradient(0, hy, 0, H);
    fg.addColorStop(0, 'rgba(16,26,48,0.85)');
    fg.addColorStop(1, 'rgba(6,10,20,0.95)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, hy, W, H - hy);

    const vpX = W * 0.5 + drift(t / 1000, 3) * 20;
    // D13: floor grid raised from 0.075 to 0.14 — the room must be felt in one glance
    ctx.strokeStyle = rgba(PALETTE.steel, 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -8; i <= 8; i++) {
      const xEnd = W / 2 + i * (W / 7);
      ctx.moveTo(vpX + (xEnd - vpX) * 0.12, hy);
      ctx.lineTo(xEnd, H);
    }
    // horizontal depth lines with perspective spacing
    const rows = 7;
    for (let i = 1; i <= rows; i++) {
      const p = i / rows;
      const y = hy + (H - hy) * p * p;
      // D13: rows keep ~55-100% of the grid alpha (they used to multiply down
      // to 0.007 effective — genuinely invisible)
      ctx.globalAlpha = 1 - p * 0.45;
      ctx.moveTo(0, y); ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 5. gold horizon hairline with glow — dimmed behind the figure when
  // horizonFade is set (D2): the hairline dips to near-zero around him
  const fade = opts.horizonFade;
  const fm = fade ? clamp01(fade.x / W) : 0.5;
  const f0 = fade ? clamp01((fade.x - fade.r) / W) : 0.28;
  const f1 = fade ? clamp01((fade.x + fade.r) / W) : 0.72;
  const hg = ctx.createLinearGradient(0, hy, W, hy);
  hg.addColorStop(0, rgba(PALETTE.gold, 0));
  hg.addColorStop(Math.max(0.02, f0 * 0.82), rgba(PALETTE.gold, 0.34));
  if (fade) {
    // ensure monotonic stop order even when the figure sits near an edge
    const a = Math.min(f0, Math.max(0.02, fm - 0.055));
    const b = Math.max(a + 0.001, fm);
    const c = Math.min(0.98, Math.max(b + 0.001, fm + 0.055));
    const d = Math.min(0.99, Math.max(c + 0.001, f1));
    hg.addColorStop(a, rgba(PALETTE.gold, 0.26));
    hg.addColorStop(b, rgba(PALETTE.gold, 0.05));
    hg.addColorStop(c, rgba(PALETTE.gold, 0.05));
    hg.addColorStop(d, rgba(PALETTE.gold, 0.26));
  }
  hg.addColorStop(0.72 + (1 - 0.72) * 0.25, rgba(PALETTE.gold, 0.34));
  hg.addColorStop(1, rgba(PALETTE.gold, 0));
  ctx.fillStyle = hg;
  ctx.fillRect(0, hy - 0.8, W, 1.6);
  glowBlob(ctx, W * 0.5, hy, W * 0.5, '#D4AF37', fade ? 0.03 : 0.045);

  // 6. drifting marble sheen
  if (sheen > 0) {
    const cycle = ((t / 24000) % 1.6) - 0.3;
    const sx = cycle * W * 1.3 - W * 0.15;
    ctx.save();
    ctx.globalAlpha = 0.5 * sheen;
    const sg = ctx.createLinearGradient(sx - 260, 0, sx + 260, H);
    sg.addColorStop(0, 'rgba(210,225,255,0)');
    sg.addColorStop(0.5, 'rgba(210,225,255,0.055)');
    sg.addColorStop(1, 'rgba(210,225,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/** chapter-tinted variant — a soft tone wash that travels through the film */
export function toneWash(ctx: CanvasRenderingContext2D, W: number, H: number, tone: string, alpha: number): void {
  if (alpha <= 0.01) return;
  const map: Record<string, [string, string]> = {
    gold: ['#8A6D1F', '#120E04'],
    down: ['#4A1F28', '#12060A'],
    up: ['#1F4A3E', '#06120E'],
    neutral: ['#1B2A4A', '#0A0F1D'],
  };
  const [top, bottom] = map[tone] ?? map.neutral;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(top, alpha));
  g.addColorStop(1, rgba(bottom, alpha * 0.7));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** eased chapter tone lookup */
export function toneOf(chapterIdx: number): 'neutral' | 'gold' | 'down' | 'up' {
  const seq: Array<'neutral' | 'gold' | 'down' | 'up'> = [
    'neutral', 'neutral', 'down', 'gold', 'down', 'up', 'gold', 'down', 'up', 'gold',
  ];
  return seq[chapterIdx % seq.length];
}

/** floor reflection helper — the premium mirror the old identity never had */
export function reflectionAlpha(t: number): number {
  return 0.075 + 0.02 * easeInOutSine((t % 3000) / 3000);
}

export const stageTone = toneOf;
export { clamp01, hash01 };
