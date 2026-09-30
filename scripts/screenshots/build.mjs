// Builds the App Store screenshots: each raw iPhone screenshot in
// screenshots/raw/ (1.png to 6.png) gets a caption and the Daily Few
// background, at 1320 x 2868 (the 6.9" iPhone size App Store Connect asks for).
//
//   node scripts/screenshots/build.mjs
//
// Renders with Microsoft Edge in headless mode (already on Windows).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rawDir = `${root}/screenshots/raw`;
const outDir = `${root}/screenshots/app-store`;
const workDir = `${root}/screenshots/.work`;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const W = 1320;
const H = 2868;

// Captions: headline, then one supporting line. Checked against the voice rules.
export const SHOTS = [
  { file: '1.png', title: 'A few honest questions a day', line: 'Pull a card. Answer in a few minutes, or stay a while.' },
  { file: '2.png', title: 'Only you ever see your answers', line: 'Write it, say it in a voice memo, or add a photo.' },
  // cropTop: how much to trim from the top, as a share of the screenshot's width
  // (CSS margins are measured against width), e.g. a clock over scrolled content.
  { file: '3.png', title: 'Check in with your body in ten seconds', line: 'Energy, mood, sleep, stress, and anything else you noticed.', cropTop: 0.13 },
  { file: '4.png', title: 'See the patterns in how you feel', line: 'Your month, day by day, with what changes before your period.' },
  { file: '5.png', title: 'Understand what your body is telling you', line: 'Two-minute reads, from cortisol to PMOS (formerly PCOS).' },
  { file: '6.png', title: 'Decks for every season of life', line: 'A new deck every month, life seasons, and your body.' },
];

const font = (name) => pathToFileURL(`${root}/assets/fonts/${name}`).href;

const page = ({ title, line, cropTop = 0 }, image) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: Ivar; src: url('${font('IvarDisplayCondensed-Medium.otf')}'); }
@font-face { font-family: Haas; src: url('${font('NHaasGroteskDSPro-55Rg.otf')}'); }
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  background: radial-gradient(120% 70% at 50% 0%, #8A365A 0%, #531832 45%, #280E1A 100%);
  display: flex; flex-direction: column; align-items: center;
  font-family: Haas, -apple-system, sans-serif; color: #FEFCF2;
}
.copy { padding: 190px 110px 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 44px; }
.mark { display: flex; align-items: center; gap: 18px; font-size: 38px; letter-spacing: 0.18em; color: #D1DBFF; }
.dot { width: 18px; height: 18px; border-radius: 50%; background: #EF3C3F; }
h1 { margin: 0; font-family: Ivar, Georgia, serif; font-weight: 500; font-size: 138px; line-height: 1.02; letter-spacing: -0.02em; }
p { margin: 0; font-size: 50px; line-height: 1.35; color: rgba(254,252,242,0.78); max-width: 1000px; }
.phone {
  margin-top: 120px; width: 1010px; border-radius: 96px; overflow: hidden;
  border: 14px solid #1A0911; box-shadow: 0 60px 140px rgba(0,0,0,0.45);
}
.phone img { display: block; width: 100%; }
.placeholder { height: 2100px; background: #3A1526; display: flex; align-items: center; justify-content: center; font-size: 48px; color: rgba(254,252,242,0.5); }
</style></head><body>
<div class="copy">
  <div class="mark"><span class="dot"></span>DAILY FEW</div>
  <h1>${title}</h1>
  <p>${line}</p>
</div>
<div class="phone">${image ? `<img src="${image}" style="margin-top: -${(cropTop * 100).toFixed(2)}%">` : '<div class="placeholder">Your screenshot goes here</div>'}</div>
</body></html>`;

// A fresh browser profile each run, so no cached page is ever reused.
const profile = resolve(tmpdir(), `daily-few-shots-${Date.now()}`);
mkdirSync(outDir, { recursive: true });
mkdirSync(workDir, { recursive: true });
mkdirSync(rawDir, { recursive: true });

for (const [i, shot] of SHOTS.entries()) {
  rmSync(`${outDir}/${i + 1}.png`, { force: true });
  // Any common image type from the phone: 1.png, 1.jpg, 1.webp...
  const base = shot.file.replace(/.png$/, '');
  const raw = ['png', 'jpg', 'jpeg', 'webp'].map((ext) => `${rawDir}/${base}.${ext}`).find((f) => existsSync(f)) ?? '';
  const image = raw ? pathToFileURL(raw).href : null;
  const html = `${workDir}/${i + 1}.html`;
  writeFileSync(html, page(shot, image));
  const out = `${outDir}/${i + 1}.png`;
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--allow-file-access-from-files', `--user-data-dir=${profile}-${i + 1}`,
    `--window-size=${W},${H}`, `--screenshot=${resolve(out)}`, `${pathToFileURL(html).href}?v=${Date.now()}`,
  ], { stdio: 'ignore' });
  // Edge hands off to a background process and writes the file a moment later.
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let t = 0; t < 60 && !existsSync(out); t++) sleep(500);
  if (!existsSync(out)) throw new Error(`Edge didn't write ${out}`);
  console.log(`${image ? 'Built' : 'Placeholder'}: screenshots/app-store/${i + 1}.png  "${shot.title}"`);
}
