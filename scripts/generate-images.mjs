#!/usr/bin/env node
/**
 * Generates the raster assets that cannot be SVG: the Open Graph card and
 * the Apple touch icon. Both are rendered from inline SVG through sharp,
 * so there is no binary artwork to keep in sync with the brand.
 *
 *   node scripts/generate-images.mjs
 *
 * Re-run after changing the accent colour or the wordmark. Output lands in
 * public/ and is committed, so a normal build needs no image toolchain.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const ACCENT = '#0967c6';
const INK = '#eaf2fa';
const BG = '#050c15';
const MUTED = '#9db4cc';

/** The mark, positioned and scaled into a parent SVG. */
const mark = (x, y, size) => `
  <g transform="translate(${x} ${y}) scale(${size / 40})">
    <circle cx="20" cy="20" r="20" fill="${ACCENT}"/>
    <g fill="none" stroke="#ffffff" stroke-linejoin="round">
      <rect x="9.5" y="9.5" width="21" height="21" rx="5" stroke-width="2.4" transform="rotate(15 20 20)"/>
      <rect x="13.6" y="13.6" width="12.8" height="12.8" rx="3.1" stroke-width="1.9" transform="rotate(30 20 20)"/>
    </g>
    <circle cx="20" cy="20" r="2.3" fill="#ffffff"/>
  </g>`;

/** Decorative nested frames occupying the right of the OG card. */
const rings = () => {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const inset = i * 34;
    const size = 460 - inset * 2;
    if (size <= 0) break;
    const last = i === 4;
    out += `<rect x="${760 + inset}" y="${85 + inset}" width="${size}" height="${size}" rx="${Math.max(6, 60 - i * 11)}"
      fill="none" stroke="${last ? ACCENT : '#24425f'}" stroke-width="${last ? 3 : 2}"
      transform="rotate(${i * 5} ${760 + 230} ${85 + 230})" opacity="${last ? 0.95 : 0.75}"/>`;
  }
  return out;
};

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="72%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${BG}"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  ${rings()}
  ${mark(80, 74, 56)}
  <text x="152" y="116" font-family="Helvetica,Arial,sans-serif" font-size="30" font-weight="600" fill="${INK}" letter-spacing="-0.5">ErrorsFree</text>
  <text x="80" y="290" font-family="Helvetica,Arial,sans-serif" font-size="70" font-weight="700" fill="${INK}" letter-spacing="-2.6">Build it right.</text>
  <text x="80" y="372" font-family="Helvetica,Arial,sans-serif" font-size="70" font-weight="700" fill="${ACCENT}" letter-spacing="-2.6">Then check it again.</text>
  <text x="80" y="452" font-family="Helvetica,Arial,sans-serif" font-size="27" fill="${MUTED}">AI-first app development and SaaS for GCC businesses</text>
  <rect x="80" y="512" width="86" height="3" fill="${ACCENT}"/>
  <text x="80" y="564" font-family="Helvetica,Arial,sans-serif" font-size="23" fill="${MUTED}" letter-spacing="1.6">DUBAI  ·  ERRORSFREE.COM</text>
</svg>`;

const touch = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="${ACCENT}"/>
  <g transform="translate(90 90) scale(3.2) translate(-20 -20)">
    <g fill="none" stroke="#ffffff" stroke-linejoin="round">
      <rect x="9.5" y="9.5" width="21" height="21" rx="5" stroke-width="2.4" transform="rotate(15 20 20)"/>
      <rect x="13.6" y="13.6" width="12.8" height="12.8" rx="3.1" stroke-width="1.9" transform="rotate(30 20 20)"/>
    </g>
    <circle cx="20" cy="20" r="2.3" fill="#ffffff"/>
  </g>
</svg>`;

await mkdir('public', { recursive: true });
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og.png');
await sharp(Buffer.from(touch)).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png');
console.log('✓ public/og.png (1200×630)');
console.log('✓ public/apple-touch-icon.png (180×180)');
