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
import { createCanvas, registerFont } from 'canvas';
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
  const label = String(Math.round(tMs)).padStart(7, '0');
  const file = path.join(OUT, `f${label}.png`);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  const beat = tl.beats.find((b) => tMs >= b.startMs && tMs < b.endMs);
  console.log(`${path.basename(file)}  t=${(tMs / 1000).toFixed(1)}s  ${beat ? beat.beat.scene.type : '-'}`);
}
console.log(`wrote ${times.length} frames → ${OUT}`);
