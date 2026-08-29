#!/usr/bin/env node
/**
 * Zips dist/ into errorsfree-site.zip, ready to upload and extract into
 * the target cPanel folder. Includes dotfiles, so .htaccess travels too.
 */
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';

if (!existsSync('dist')) {
  console.error('No dist/ — run `npm run build` first.');
  process.exit(1);
}
const out = 'errorsfree-site.zip';
rmSync(out, { force: true });
execFileSync('zip', ['-r', '-q', `../${out}`, '.'], { cwd: 'dist', stdio: 'inherit' });
console.log(`✓ ${out} — upload to your cPanel folder and Extract.`);
