#!/usr/bin/env node
/**
 * Builds the local-preview package: the site rebuilt for a server ROOT
 * (so it previews without a subfolder), a zero-dependency Node server, and
 * instructions. Produces errorsfree-local-test.zip.
 *
 *     npm run package:local
 *
 * This is for testing on your own machine only. The cPanel upload is a
 * different build — use `npm run package` for that.
 */
import { execFileSync } from 'node:child_process';
import { cp, rm, mkdir, writeFile, chmod } from 'node:fs/promises';

const OUT = 'errorsfree-local-test.zip';
const DIR = 'local-test';

// Root-base build. Note this leaves dist/ holding the ROOT build.
execFileSync('npx', ['astro', 'build'], { stdio: 'inherit', env: { ...process.env, SITE_BASE: '/' } });

await rm(DIR, { recursive: true, force: true });
await mkdir(DIR, { recursive: true });
await cp('dist', `${DIR}/site`, { recursive: true });
await rm(`${DIR}/site/.htaccess`, { force: true });   // Apache-only, noise locally
await cp('scripts/local-server.mjs', `${DIR}/start.mjs`);
await cp('scripts/local-readme.txt', `${DIR}/READ-ME-FIRST.txt`);
// Both launchers keep the window open afterwards. Without that, a missing
// Node or a bind failure flashes an error and vanishes, and the visitor is
// left assuming the preview simply did not work.
await writeFile(`${DIR}/start-windows.bat`, [
  '@echo off',
  'cd /d "%~dp0"',
  'where node >nul 2>nul || (echo Node.js is not installed. See READ-ME-FIRST.txt for the Python and PHP alternatives. & pause & exit /b 1)',
  'node start.mjs',
  'echo.',
  'echo Server stopped.',
  'pause',
].join('\r\n') + '\r\n');

await writeFile(`${DIR}/start-mac-linux.command`, [
  '#!/bin/sh',
  'cd "$(dirname "$0")"',
  'if ! command -v node >/dev/null 2>&1; then',
  '  echo "Node.js is not installed. See READ-ME-FIRST.txt for the Python and PHP alternatives."',
  '  read -r _ ; exit 1',
  'fi',
  'node start.mjs',
  'echo "Server stopped. Press Enter to close."',
  'read -r _',
].join('\n') + '\n');

// A stamp the visitor can point at to confirm which build they are running.
const stamp = [
  'ErrorsFree local preview build',
  `built: ${new Date().toISOString()}`,
  `pages: ${(await import('node:fs/promises')).readdir ? '' : ''}`,
].filter(Boolean);
await writeFile(`${DIR}/BUILD.txt`, [
  'ErrorsFree — local preview build',
  '',
  `Built:    ${new Date().toISOString()}`,
  'Includes: Case Studies section, scroll-driven infinite Droste zoom,',
  '          pinned Our Process tunnel, four-palette switcher.',
  '',
  'If the site you are looking at has no "Case Studies" link in the top',
  'navigation, you are not looking at this build — check the port in your',
  "browser's address bar against the one the terminal printed.",
  '',
].join('\n'));
await chmod(`${DIR}/start-mac-linux.command`, 0o755);

await rm(OUT, { force: true });
execFileSync('zip', ['-rq', `../${OUT}`, '.'], { cwd: DIR, stdio: 'inherit' });

console.log(`\n✓ ${OUT} — unzip anywhere, then: node start.mjs`);
console.log('  dist/ now holds the ROOT build. Run `npm run build` before deploying.');
