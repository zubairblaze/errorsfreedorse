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
await writeFile(`${DIR}/start-windows.bat`, '@echo off\r\nnode start.mjs\r\npause\r\n');
await writeFile(`${DIR}/start-mac-linux.command`, '#!/bin/sh\ncd "$(dirname "$0")"\nnode start.mjs\n');
await chmod(`${DIR}/start-mac-linux.command`, 0o755);

await rm(OUT, { force: true });
execFileSync('zip', ['-rq', `../${OUT}`, '.'], { cwd: DIR, stdio: 'inherit' });

console.log(`\n✓ ${OUT} — unzip anywhere, then: node start.mjs`);
console.log('  dist/ now holds the ROOT build. Run `npm run build` before deploying.');
