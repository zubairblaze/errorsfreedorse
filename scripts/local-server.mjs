#!/usr/bin/env node
/**
 * ErrorsFree — local preview server.
 *
 * Zero dependencies: Node's own http module only. Nothing to install.
 *
 *     node start.mjs
 *
 * It picks a free port, prints the URL, and opens your browser.
 *
 * Why it does NOT default to 8080: XAMPP's Apache frequently sits there. If
 * this server could not bind, you would open localhost:8080, get Apache, and
 * see whatever site XAMPP is already serving — which looks exactly like this
 * preview having failed to update. So it starts at 4321 and walks upward
 * until it finds a port nobody is using.
 *
 * The site is static, so this only does the three things a plain file://
 * open cannot: serve correct MIME types, resolve /about/ to
 * /about/index.html, and return the real 404 page for unknown paths.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, 'site');

// PORT forces a specific port; otherwise try these in order.
const CANDIDATES = process.env.PORT
  ? [Number(process.env.PORT)]
  : [4321, 4322, 4323, 5173, 8100, 8181, 3030];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

const send = (res, status, body, type) => {
  res.writeHead(status, {
    'Content-Type': type,
    // Never cache: a stale preview is the exact confusion this file exists
    // to prevent.
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-ErrorsFree-Preview': 'local',
  });
  res.end(body);
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);

  // Keep every read inside site/ regardless of what the URL asks for.
  let file = normalize(join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) {
    return send(res, 403, 'Forbidden', 'text/plain');
  }

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

/**
 * Opens the default browser, best effort — never fatal.
 *
 * A missing opener (xdg-open is absent on plenty of Linux installs) surfaces
 * as an asynchronous 'error' event on the child, not a synchronous throw, so
 * try/catch alone does not contain it — unhandled, it takes the server down
 * with it. Hence the explicit handler.
 */
function openBrowser(url) {
  const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => { /* no opener available; the printed URL stands */ });
    child.unref();
  } catch {
    /* the printed URL is the fallback */
  }
}

/** Tries each candidate port until one binds. */
function listen(ports) {
  const port = ports[0];

  if (port === undefined) {
    console.error('\n  Could not find a free port.');
    console.error('  Pick one yourself:  PORT=9123 node start.mjs\n');
    process.exit(1);
  }

  const onError = (err) => {
    if (err.code === 'EADDRINUSE') {
      // Something else owns this port — very often XAMPP. Move along rather
      // than handing the visitor somebody else's site.
      console.log(`  port ${port} is busy, trying the next one`);
      cleanup();
      listen(ports.slice(1));
      return;
    }
    throw err;
  };

  const onListening = () => {
    // Read the bound port back from the server rather than trusting the
    // variable: the printed URL is then the URL, by construction.
    const bound = server.address();
    const url = `http://localhost:${typeof bound === 'object' && bound ? bound.port : port}`;
    console.log('');
    console.log('  ErrorsFree — local preview');
    console.log('  ─────────────────────────────────────────────');
    console.log(`  ${url}`);
    console.log('');
    console.log(`  serving: ${ROOT}`);
    console.log('');
    console.log('  If you see a DIFFERENT site, you are looking at XAMPP or');
    console.log('  another server — check the port in the address bar matches');
    console.log('  the URL above, and hard-reload with Ctrl+Shift+R.');
    console.log('');
    console.log('  New in this build: Case Studies in the nav, and a hero that');
    console.log('  falls through itself as you scroll.');
    console.log('');
    console.log('  Ctrl+C to stop.');
    console.log('');
    openBrowser(url);
  };

  // Both listeners must come off on a failed attempt. server.listen()
  // registers its callback as a one-shot 'listening' listener that is NOT
  // consumed when the bind fails — leave it attached and the next successful
  // bind fires every stale callback too, announcing a port that is not the
  // one being served. That is the exact confusion this file exists to
  // prevent, so it is worth the extra four lines.
  const cleanup = () => {
    server.removeListener('error', onError);
    server.removeListener('listening', onListening);
  };

  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, '127.0.0.1');
}

listen(CANDIDATES);
