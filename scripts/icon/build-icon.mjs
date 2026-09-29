// Builds the app icon and splash mark from the brand submark.
//
//   node scripts/icon/build-icon.mjs
//
// Icon: white submark centred on the brand gradient (#531832 -> #8A365A, 160deg)
// with the lilac glow rising from the bottom, like the question card.
// iOS needs a square 1024x1024 PNG with no transparency; iOS rounds the corners.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const submark = `${root}/assets/images/brand/submark-white.png`;
const SIZE = 1024;

const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs>
    <linearGradient id="g" x1="0.32" y1="0" x2="0.68" y2="1">
      <stop offset="0" stop-color="#531832"/>
      <stop offset="1" stop-color="#8A365A"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="115%" r="75%">
      <stop offset="0" stop-color="#D1DBFF" stop-opacity="0.5"/>
      <stop offset="0.62" stop-color="#D1DBFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
</svg>`);

const mark = await sharp(submark).resize({ width: 560 }).toBuffer();
const markMeta = await sharp(mark).metadata();

const composed = await sharp(background)
  .composite([{ input: mark, left: Math.round((SIZE - 560) / 2), top: Math.round((SIZE - markMeta.height) / 2) }])
  .png()
  .toBuffer();

// App Store icons must not have an alpha channel.
await sharp(composed).flatten({ background: '#531832' }).removeAlpha().png().toFile(`${root}/assets/images/icon.png`);

console.log('Wrote assets/images/icon.png (1024x1024)');

// Link preview image for shared card links (1200x630), same look.
const OG_W = 1200;
const OG_H = 630;
const ogBackground = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
  <defs>
    <linearGradient id="g" x1="0.32" y1="0" x2="0.68" y2="1">
      <stop offset="0" stop-color="#531832"/>
      <stop offset="1" stop-color="#8A365A"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="120%" r="70%">
      <stop offset="0" stop-color="#D1DBFF" stop-opacity="0.5"/>
      <stop offset="0.62" stop-color="#D1DBFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#g)"/>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#glow)"/>
</svg>`);
const wordmark = await sharp(`${root}/assets/images/brand/logo-white.png`).resize({ width: 520 }).toBuffer();
const wordmarkMeta = await sharp(wordmark).metadata();
const og = await sharp(ogBackground)
  .composite([{ input: wordmark, left: Math.round((OG_W - 520) / 2), top: Math.round((OG_H - wordmarkMeta.height) / 2) }])
  .png()
  .toBuffer();
await sharp(og).flatten({ background: '#531832' }).removeAlpha().png().toFile(`${root}/web-share/public/assets/og.png`);
console.log('Wrote web-share/public/assets/og.png (1200x630)');
