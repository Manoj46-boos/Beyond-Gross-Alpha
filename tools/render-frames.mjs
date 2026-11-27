/**
 * Offline QA harness — renders frames WITHOUT a browser (node-canvas).
 * Compiles the engine once with tsc to .qa-build/, shims document/OffscreenCanvas,
 * registers the bundled fonts, builds a synthetic timeline (no TTS needed) and
 * draws frames at given times.
 *
 * Usage:
 *   node tools/render-frames.mjs --out evidence --times 2000,6000,15000
 *   node tools/render-frames.mjs --out evidence --segments "0-8s,120-130s" --step 0.5
 */
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { createCanvas, registerFont, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import url from 'url';

const require = createRequire(import.meta.url);

const REPO = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(REPO, '.qa-build');
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : path.join(REPO, 'evidence');

// ── compile the engine once ──
const files = [
  'src/lib/engine/easing.ts', 'src/lib/engine/theme.ts', 'src/lib/engine/stage.ts',
  'src/lib/engine/fx.ts', 'src/lib/engine/stickman.ts', 'src/lib/engine/charts.ts',
  'src/lib/engine/textfx.ts', 'src/lib/engine/score.ts', 'src/lib/engine/timeline.ts',
  'src/lib/engine/script-data.ts', 'src/lib/engine/scene-context.ts',
  'src/lib/engine/scenes-open.ts', 'src/lib/engine/scenes-host.ts', 'src/lib/engine/scenes-drag.ts',
  'src/lib/engine/scenes-tlh.ts', 'src/lib/engine/scenes-wrapper.ts', 'src/lib/engine/scenes-final.ts',
  'src/lib/engine/thumbnail.ts',
  'src/lib/engine/director.ts',
];
if (process.argv.includes('--rebuild') || !fs.existsSync(BUILD)) {
  fs.rmSync(BUILD, { recursive: true, force: true });
  execSync(
    ['node_modules/.bin/tsc', ...files, '--outDir', BUILD, '--module', 'commonjs',
     '--moduleResolution', 'node', '--target', 'es2022', '--skipLibCheck',
     '--esModuleInterop', '--resolveJsonModule'].join(' '),
    { stdio: 'inherit', cwd: REPO }
  );
}

// ── browser shims (grain tiles / DOF buffer) ──
globalThis.document = { createElement: () => createCanvas(256, 256) };
globalThis.OffscreenCanvas = class { constructor(w, h) { return createCanvas(w, h); } };

// ── fonts ──
const F = path.join(REPO, 'public/fonts');
registerFont(path.join(F, 'PlayfairDisplay-500.ttf'), { family: 'Playfair Display', weight: '500' });
registerFont(path.join(F, 'PlayfairDisplay-600.ttf'), { family: 'Playfair Display', weight: '600' });
registerFont(path.join(F, 'PlayfairDisplay-700.ttf'), { family: 'Playfair Display', weight: '700' });
registerFont(path.join(F, 'PlayfairDisplay-800.ttf'), { family: 'Playfair Display', weight: '800' });
registerFont(path.join(F, 'PlayfairDisplay-900.ttf'), { family: 'Playfair Display', weight: '900' });
registerFont(path.join(F, 'Manrope-400.ttf'), { family: 'Manrope', weight: '400' });
registerFont(path.join(F, 'Manrope-500.ttf'), { family: 'Manrope', weight: '500' });
registerFont(path.join(F, 'Manrope-600.ttf'), { family: 'Manrope', weight: '600' });
registerFont(path.join(F, 'Manrope-700.ttf'), { family: 'Manrope', weight: '700' });
registerFont(path.join(F, 'Manrope-800.ttf'), { family: 'Manrope', weight: '800' });

const { drawFrame, drawIdleFrame } = require(path.join(BUILD, 'director.js'));
const { SCRIPT } = require(path.join(BUILD, 'script-data.js'));
const { buildTimeline } = require(path.join(BUILD, 'timeline.js'));
const { splitSentences } = require(path.join(BUILD, 'easing.js'));

// synthetic manifest — word-timing estimates, no TTS needed for QA
function estWords(text) {
  const words = text.split(/\s+/);
  let t = 0;
  return words.map((w) => {
    const d = Math.min(680, 170 + w.replace(/[^A-Za-z0-9$%.,-]/g, '').length * 55);
    const item = { t, d, w };
    t += d + 15;
    return item;
  });
}
const manifest = { lines: {} };
SCRIPT.forEach((chapter, ci) => {
  chapter.beats.forEach((beat, bi) => {
    if (!beat.vo.trim()) return;
    splitSentences(beat.vo).forEach((text, si) => {
      const words = estWords(text);
      manifest.lines[`${ci}-${bi}-${si}`] = {
        key: 'qa',
        durationMs: words.length ? words[words.length - 1].t + words[words.length - 1].d : 800,
        words,
      };
    });
  });
});
const tl = buildTimeline(manifest, 30);
console.log(`QA timeline: ${(tl.durationMs / 60000).toFixed(1)} min · ${tl.totalFrames} frames · ${tl.beats.length} beats`);

const OPTS = { captions: 'karaoke', channelName: 'Beyond Gross Alpha', nextVideoTitle: 'Episode 4: The Next Hidden Number', watermark: true, progressBar: true };

fs.mkdirSync(OUT, { recursive: true });
const canvas = createCanvas(1920, 1080);
const ctx = canvas.getContext('2d');

// ── Phase 4.4, law #2 — dev-only text-collision checker ──
// THE LAW: no two text BASELINES within 24px of each other anywhere.
// Every readable text draw on the MAIN canvas is measured into a per-frame
// registry (anchor transformed through the live CTM — text inside
// translate/scale/rotate contexts lands at its true screen position).
// Violation = two draws from DIFFERENT lines whose baselines are < 24px
// apart AND whose x-ranges overlap ≥ 8px. Same-line draws (baseline Δ < 6px
// — kinetic word replacements riding one caption line) are exempt by
// design; decorative ghost text (alpha < 0.35) and fully off-canvas boxes
// are excluded. --check-text turns any violation into a non-zero exit.
const CHECK_TEXT = process.argv.includes('--check-text');
const textBoxes = [];
let textViolations = 0;
if (CHECK_TEXT) {
  // manual affine matrix — mirrors every translate/scale/rotate/transform
  // call so recorded text anchors land at true screen coordinates
  const M = [1, 0, 0, 1, 0, 0];
  const mul = (m, a, b, c, d, e, f) => [
    m[0] * a + m[2] * b, m[1] * a + m[3] * b,
    m[0] * c + m[2] * d, m[1] * c + m[3] * d,
    m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5],
  ];
  const wrap = (name, args) => {
    if (name === 'translate') Object.assign(M, mul(M, 1, 0, 0, 1, args[0], args[1]));
    else if (name === 'scale') Object.assign(M, mul(M, args[0], 0, 0, args[1], 0, 0));
    else if (name === 'transform') Object.assign(M, mul(M, ...args));
    else if (name === 'setTransform') Object.assign(M, args.length === 1 ? [...args[0]] : args);
    else if (name === 'rotate') {
      const c = Math.cos(args[0]), s = Math.sin(args[0]);
      Object.assign(M, mul(M, c, s, -s, c, 0, 0));
    }
  };
  for (const name of ['translate', 'scale', 'rotate', 'transform', 'setTransform']) {
    const orig = ctx[name].bind(ctx);
    ctx[name] = (...a) => { wrap(name, a); return orig(...a); };
  }
  const origSave = ctx.save.bind(ctx);
  const origRestore = ctx.restore.bind(ctx);
  const stack = [];
  ctx.save = () => { stack.push([...M]); return origSave(); };
  ctx.restore = () => { const m = stack.pop(); if (m) Object.assign(M, m); return origRestore(); };
  const origFill = ctx.fillText.bind(ctx);
  const origStroke = ctx.strokeText.bind(ctx);
  const seenDraws = new Set();
  const record = (text, x, y) => {
    const s = String(text);
    if (!s.trim()) return;
    if ((ctx.globalAlpha ?? 1) < 0.35) return; // decorative ghost / watermark fade
    const key = `${s}|${x.toFixed(1)}|${y.toFixed(1)}`;
    if (seenDraws.has(key)) return; // stroke+fill passes of the same string
    seenDraws.add(key);
    const m = ctx.measureText(s);
    if (!m.width) return;
    const sx = x * M[0] + y * M[2] + M[4];
    const sy = x * M[1] + y * M[3] + M[5];
    const fs = Number((ctx.font.match(/(\d+(?:\.\d+)?)px/) ?? [])[1] ?? 16) * Math.hypot(M[0], M[1]);
    const align = ctx.textAlign || 'left';
    const w = m.width * Math.hypot(M[0], M[1]);
    let x0 = sx;
    if (align === 'center') x0 = sx - w / 2;
    else if (align === 'right') x0 = sx - w;
    textBoxes.push({ text: s, x0, x1: x0 + w, base: sy, fs });
  };
  ctx.fillText = (t, x, y, ...rest) => { record(t, x, y); origFill(t, x, y, ...rest); };
  ctx.strokeText = (t, x, y, ...rest) => { record(t, x, y); origStroke(t, x, y, ...rest); };
}
function auditTextFrame(tMs, sceneType) {
  if (!CHECK_TEXT) return;
  for (let i = 0; i < textBoxes.length; i++) {
    for (let j = i + 1; j < textBoxes.length; j++) {
      const a = textBoxes[i], b = textBoxes[j];
      if (Math.abs(a.base - b.base) < 6) continue; // one line — by design
      if (a.x1 < -40 || a.x0 > 1960 || a.base < -40 || a.base > 1120) continue; // off-canvas
      if (b.x1 < -40 || b.x0 > 1960 || b.base < -40 || b.base > 1120) continue;
      if (Math.abs(a.base - b.base) >= 24) continue; // THE LAW: ≥24px apart
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      if (ox >= 8) {
        textViolations++;
        console.log(`  ⚠ TEXT COLLISION t=${(tMs / 1000).toFixed(1)}s [${sceneType}] "${a.text}" × "${b.text}" baseline Δ${Math.abs(a.base - b.base).toFixed(0)}px, x-overlap ${ox.toFixed(0)}px @y(${a.base.toFixed(0)}/${b.base.toFixed(0)})`);
      }
    }
  }
  textBoxes.length = 0;
}

let times = [];
const ti = process.argv.indexOf('--times');
if (ti >= 0) {
  times = process.argv[ti + 1].split(',').map(Number);
} else {
  const si = process.argv.indexOf('--segments');
  const stepS = Number(process.argv[process.argv.indexOf('--step') + 1] ?? 0.5);
  const segs = si >= 0 ? process.argv[si + 1].split(',').map((s) => s.trim()) : ['0-10s'];
  for (const seg of segs) {
    const m = seg.match(/^(\d+)-(\d+)s?$/);
    const a = Number(m?.[1] ?? 0), b = Number(m?.[2] ?? 5);
    for (let t = a; t <= b; t += stepS) times.push(t * 1000);
  }
}

for (const tMs of times) {
  drawFrame(ctx, tl, tMs, OPTS);
  const beat = tl.beats.find((b) => tMs >= b.startMs && tMs < b.endMs);
  const sceneType = beat ? beat.beat.scene.type : '-';
  auditTextFrame(tMs, sceneType);
  const label = String(Math.round(tMs)).padStart(7, '0');
  const file = path.join(OUT, `f${label}.png`);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  console.log(`${path.basename(file)}  t=${(tMs / 1000).toFixed(1)}s  ${sceneType}`);
}
console.log(`wrote ${times.length} frames → ${OUT}`);

// ── Phase 4.4, law #3 support — --contact-sheet: every push produces a 9-up
// sheet you can eyeball in 30 seconds ──
if (process.argv.includes('--contact-sheet')) {
  const frames = fs.readdirSync(OUT).filter((f) => /^f\d+\.png$/.test(f)).sort().slice(0, 9);
  if (frames.length) {
    const TW = 640, TH = 360, PAD = 8, CAP = 22;
    const sheet = createCanvas(TW * 3 + PAD * 4, (TH + CAP) * 3 + PAD * 4);
    const s = sheet.getContext('2d');
    s.fillStyle = '#0b0e16';
    s.fillRect(0, 0, sheet.width, sheet.height);
    for (let i = 0; i < frames.length; i++) {
      const img = await loadImage(path.join(OUT, frames[i]));
      const x = PAD + (i % 3) * (TW + PAD), y = PAD + Math.floor(i / 3) * (TH + CAP + PAD);
      s.drawImage(img, x, y, TW, TH);
      s.fillStyle = '#d8b25c';
      s.font = 'bold 14px Manrope';
      s.fillText(frames[i].replace('f', 't=').replace('.png', '') + 'ms', x + 2, y + TH + 15);
    }
    fs.writeFileSync(path.join(OUT, 'contact-sheet.jpg'), sheet.toBuffer('image/jpeg'), {});
    console.log(`contact sheet → ${path.join(OUT, 'contact-sheet.jpg')}`);
  }
}

if (CHECK_TEXT) {
  if (textViolations > 0) {
    console.error(`✗ text-collision gate FAILED: ${textViolations} violation(s)`);
    process.exit(1);
  }
  console.log('✓ text-collision gate PASSED: zero cross-line intersections');
}

