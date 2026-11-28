/**
 * Thumbnail renderer — Phase 5a. Draws the script's four thumbnail variants
 * (T1 split statement · T2 NOT REPORTED stamp · T3 92/17 gap · T4 the
 * Principal + the $5.1M gap) at 1280×720 with the REBUILT character
 * (thumbnail.ts calls the same drawStickman as the film).
 *
 * Usage: node tools/make-thumbnails.mjs --out evidence/thumbnails
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
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : path.join(REPO, 'evidence/thumbnails');

// compile the engine once (same recipe as render-frames.mjs)
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
if (process.argv.includes('--rebuild') || !fs.existsSync(path.join(BUILD, 'thumbnail.js'))) {
  fs.rmSync(BUILD, { recursive: true, force: true });
  execSync(
    ['node_modules/.bin/tsc', ...files, '--outDir', BUILD, '--module', 'commonjs',
     '--moduleResolution', 'node', '--target', 'es2022', '--skipLibCheck',
     '--esModuleInterop', '--resolveJsonModule'].join(' '),
    { stdio: 'inherit', cwd: REPO }
  );
}

globalThis.document = { createElement: () => createCanvas(256, 256) };
globalThis.OffscreenCanvas = class { constructor(w, h) { return createCanvas(w, h); } };

const F = path.join(REPO, 'public/fonts');
for (const w of ['500', '600', '700', '800', '900']) registerFont(path.join(F, `PlayfairDisplay-${w}.ttf`), { family: 'Playfair Display', weight: w });
for (const w of ['400', '500', '600', '700', '800']) registerFont(path.join(F, `Manrope-${w}.ttf`), { family: 'Manrope', weight: w });

const { drawThumbnail } = require(path.join(BUILD, 'thumbnail.js'));

fs.mkdirSync(OUT, { recursive: true });
const NAMES = ['T1_split_statement', 'T2_not_reported_stamp', 'T3_the_gap', 'T4_principal_face_number', 'T5_principal_bust_numbers'];
for (let v = 0; v < 5; v++) {
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');
  drawThumbnail(ctx, 1280, 720, v, 'Beyond Gross Alpha');
  const file = path.join(OUT, `${NAMES[v]}.png`);
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  console.log(`wrote ${file}`);
}
console.log('thumbnails done →', OUT);
