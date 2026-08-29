#!/usr/bin/env node
/**
 * ErrorsFree — local preview server.
 *
 * Zero dependencies: Node's own http module only. Nothing to install.
 *
 *     node start.mjs
 *
 * Then open http://localhost:8080
 * Stop it with Ctrl+C.
 *
 * The site is static, so this only needs to do three things a plain
 * file:// open cannot: serve correct MIME types, resolve /about/ to
 * /about/index.html, and return the real 404 page for unknown paths.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'site');
const PORT = Number(process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const send = (res, status, body, type) => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);

  // Keep every read inside site/ regardless of what the URL asks for.
  let file = normalize(join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');

  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    // Fall through to the 404 page below.
  }

  try {
    const body = await readFile(file);
    return send(res, 200, body, TYPES[extname(file)] ?? 'application/octet-stream');
  } catch {
    try {
      return send(res, 404, await readFile(join(ROOT, '404.html')), TYPES['.html']);
    } catch {
      return send(res, 404, 'Not found', 'text/plain');
    }
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ErrorsFree — local preview');
  console.log(`  http://localhost:${PORT}`);
  console.log('');
  console.log('  Try the Palette button, bottom-right, to compare the four');
  console.log('  colour directions in light and dark.');
  console.log('');
  console.log('  Ctrl+C to stop.');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is busy. Try:  PORT=8081 node start.mjs\n`);
    process.exit(1);
  }
  throw err;
});
