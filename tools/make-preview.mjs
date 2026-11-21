/** Assemble an MP4 preview from rendered QA frames + an offline score render. */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import url from 'url';

const REPO = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2] || path.join(REPO, 'evidence');
const outName = process.argv[3] || 'preview.mp4';

const frames = fs.readdirSync(dir).filter((f) => f.startsWith('f') && f.endsWith('.png')).sort();
if (!frames.length) {
  console.error('no frames found in', dir);
  process.exit(1);
}
// frames are named by ms → assume 2 fps ordering from the QA step (step 0.5s)
execSync(
  `ffmpeg -y -framerate 2 -pattern_type glob -i '${dir}/f*.png' -c:v libx264 -pix_fmt yuv420p -crf 18 '${path.join(dir, outName)}'`,
  { stdio: 'inherit', shell: '/bin/bash' }
);
console.log('wrote', path.join(dir, outName));
