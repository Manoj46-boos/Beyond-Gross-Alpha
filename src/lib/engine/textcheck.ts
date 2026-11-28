/**
 * U5 (frame audit) — the studio's frame-law gate.
 * The QA harness (tools/render-frames.mjs) enforces three laws on every push:
 *   L1  no two text baselines < 24px apart with x-overlap ≥ 8px
 *   L2  no text bbox inside the 40px frame margin
 *   L3  no text bbox overlapping a NON-OWNED graphic by > 8px
 *        (owned = room/veils/tracks/rings/glow — tagged via GRAPHIC_PROBE)
 * This module runs the SAME laws in the browser over sampled frames, so the
 * studio's render button stays gated on a green text check.
 */
import { drawFrame, RenderOptions } from './director';
import { GRAPHIC_PROBE } from './theme';
import type { PreparedProject } from './pipeline';

export interface TextViolation {
  t: number;
  kind: 'collision' | 'edge' | 'graphic';
  detail: string;
}

export interface TextCheckReport {
  checked: number;
  violations: TextViolation[];
  ok: boolean;
}

interface TextBox { text: string; x0: number; x1: number; base: number; fs: number }
interface GraphicBox { x0: number; x1: number; y0: number; y1: number; tag: string }

const FRAME_COUNT = 24;

export async function runTextCheck(
  prepared: PreparedProject,
  options: RenderOptions,
  log?: (m: string) => void,
): Promise<TextCheckReport> {
  const W = 1920, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const textBoxes: TextBox[] = [];
  const graphics: GraphicBox[] = [];
  const seenDraws = new Set<string>();
  const violations: TextViolation[] = [];

  // manual CTM — mirrors the QA harness exactly
  const M = [1, 0, 0, 1, 0, 0];
  const mul = (m: number[], a: number, b: number, c: number, d: number, e: number, f: number) => [
    m[0] * a + m[2] * b, m[1] * a + m[3] * b,
    m[0] * c + m[2] * d, m[1] * c + m[3] * d,
    m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5],
  ];
  const wrap = (name: string, args: any[]) => {
    if (name === 'translate') Object.assign(M, mul(M, 1, 0, 0, 1, args[0], args[1]));
    else if (name === 'scale') Object.assign(M, mul(M, args[0], 0, 0, args[1], 0, 0));
    else if (name === 'transform') Object.assign(M, mul(M, args[0], args[1], args[2], args[3], args[4], args[5]));
    else if (name === 'setTransform') Object.assign(M, args.length === 1 ? [...args[0]] : args);
    else if (name === 'rotate') {
      const c = Math.cos(args[0]), s = Math.sin(args[0]);
      Object.assign(M, mul(M, c, s, -s, c, 0, 0));
    }
  };
  const anyCtx = ctx as any;
  for (const name of ['translate', 'scale', 'rotate', 'transform', 'setTransform']) {
    const orig = anyCtx[name].bind(ctx);
    anyCtx[name] = (...a: any[]) => { wrap(name, a); return orig(...a); };
  }
  const origSave = ctx.save.bind(ctx);
  const origRestore = ctx.restore.bind(ctx);
  const stack: number[][] = [];
  anyCtx.save = () => { stack.push([...M]); return origSave(); };
  anyCtx.restore = () => { const m = stack.pop(); if (m) Object.assign(M, m); return origRestore(); };

  const record = (text: string, x: number, y: number) => {
    const s = String(text);
    if (!s.trim()) return;
    if ((ctx.globalAlpha ?? 1) < 0.35) return;
    const key = `${s}|${x.toFixed(1)}|${y.toFixed(1)}`;
    if (seenDraws.has(key)) return;
    seenDraws.add(key);
    const m = ctx.measureText(s);
    if (!m.width) return;
    const sx = x * M[0] + y * M[2] + M[4];
    const sy = x * M[1] + y * M[3] + M[5];
    const fs = Number((ctx.font.match(/(\d+(?:\.\d+)?)px/) ?? [])[1] ?? 16) * Math.hypot(M[0], M[1]);
    const scale = Math.hypot(M[0], M[1]);
    const w = m.width * scale;
    let x0 = sx;
    const align = ctx.textAlign || 'left';
    if (align === 'center') x0 = sx - w / 2;
    else if (align === 'right') x0 = sx - w;
    textBoxes.push({ text: s, x0, x1: x0 + w, base: sy, fs });
  };
  anyCtx.fillText = (t: string, x: number, y: number, ...rest: any[]) => { record(t, x, y); return (anyCtx.__fillText as any)(t, x, y, ...rest); };
  anyCtx.strokeText = (t: string, x: number, y: number, ...rest: any[]) => { record(t, x, y); return (anyCtx.__strokeText as any)(t, x, y, ...rest); };
  anyCtx.__fillText = ctx.fillText.bind(ctx);
  anyCtx.__strokeText = ctx.strokeText.bind(ctx);

  const toScreen = (x: number, y: number, w: number, h: number) => {
    const px = [x, x + w, x, x + w], py = [y, y, y + h, y + h];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < 4; k++) {
      const sx = px[k] * M[0] + py[k] * M[2] + M[4];
      const sy = px[k] * M[1] + py[k] * M[3] + M[5];
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
      y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { x0, x1, y0, y1 };
  };
  const recordGraphic = (box: { x0: number; x1: number; y0: number; y1: number }) => {
    if ((ctx.globalAlpha ?? 1) < 0.35) return;
    const w = box.x1 - box.x0, h = box.y1 - box.y0;
    if (w < 8 || h < 8) return;
    if (w * h > 600000) return;
    if (box.x1 < 0 || box.x0 > W || box.y1 < 0 || box.y0 > H) return;
    graphics.push({ ...box, tag: GRAPHIC_PROBE.tag });
  };
  const origFillRect = ctx.fillRect.bind(ctx);
  const origStrokeRect = ctx.strokeRect.bind(ctx);
  const origArc = ctx.arc.bind(ctx);
  anyCtx.__fillRect = origFillRect;
  anyCtx.__strokeRect = origStrokeRect;
  anyCtx.__arc = origArc;
  anyCtx.fillRect = (x: number, y: number, w: number, h: number, ...rest: any[]) => { recordGraphic(toScreen(x, y, w, h)); return origFillRect(x, y, w, h, ...rest); };
  anyCtx.strokeRect = (x: number, y: number, w: number, h: number, ...rest: any[]) => { recordGraphic(toScreen(x, y, w, h)); return origStrokeRect(x, y, w, h, ...rest); };
  anyCtx.arc = (x: number, y: number, r: number, a0: number, a1: number, ...rest: any[]) => {
    if (r >= 8 && (a1 ?? Math.PI * 2) - a0 >= Math.PI * 1.9) recordGraphic(toScreen(x - r, y - r, r * 2, r * 2));
    return origArc(x, y, r, a0, a1, ...rest);
  };

  // sample the film
  const dur = prepared.timeline.durationMs;
  const step = dur / (FRAME_COUNT + 1);
  const auditFrame = (tMs: number) => {
    drawFrame(ctx, prepared.timeline, tMs, options);
    const beat = prepared.timeline.beats.find((b: any) => tMs >= b.startMs && tMs < b.endMs);
    const scene = beat ? beat.beat.scene.type : '-';
    for (let i = 0; i < textBoxes.length; i++) {
      for (let j = i + 1; j < textBoxes.length; j++) {
        const a = textBoxes[i], b = textBoxes[j];
        if (Math.abs(a.base - b.base) < 6) continue;
        if (Math.abs(a.base - b.base) >= 24) continue;
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        if (ox >= 8) violations.push({ t: tMs, kind: 'collision', detail: `[${scene}] "${a.text}" × "${b.text}" Δ${Math.abs(a.base - b.base).toFixed(0)}px overlap ${ox.toFixed(0)}px` });
      }
    }
    for (const a of textBoxes) {
      const top = a.base - a.fs * 0.78, bot = a.base + a.fs * 0.28;
      if (a.x0 < 40 || a.x1 > W - 40 || top < 40 || bot > H - 40) {
        violations.push({ t: tMs, kind: 'edge', detail: `[${scene}] "${a.text}" bbox x(${a.x0.toFixed(0)}..${a.x1.toFixed(0)}) inside the 40px margin` });
      }
    }
    for (const a of textBoxes) {
      const ty0 = a.base - a.fs * 0.78, ty1 = a.base + a.fs * 0.28;
      for (const g of graphics) {
        if (g.tag !== 'none') continue;
        const ox = Math.min(a.x1, g.x1) - Math.max(a.x0, g.x0);
        const oy = Math.min(ty1, g.y1) - Math.max(ty0, g.y0);
        if (ox > 8 && oy > 8) violations.push({ t: tMs, kind: 'graphic', detail: `[${scene}] "${a.text}" on a non-owned graphic (${(g.x1 - g.x0).toFixed(0)}×${(g.y1 - g.y0).toFixed(0)})` });
      }
    }
    seenDraws.clear();
    graphics.length = 0;
    textBoxes.length = 0;
  };

  for (let i = 1; i <= FRAME_COUNT; i++) {
    auditFrame(Math.round(i * step));
    if (i % 6 === 0) await new Promise((r) => setTimeout(r, 0)); // yield to the UI
  }
  if (log) log(`frame law: ${FRAME_COUNT} frames checked, ${violations.length} violation(s)`);
  return { checked: FRAME_COUNT, violations, ok: violations.length === 0 };
}
