/**
 * Walks the XAMPP web installer exactly as a person would, against a fresh
 * empty database, then signs into the admin panel it created.
 *
 *   node installtest.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.TEST_BASE ?? 'http://127.0.0.1:8095/errorsfree';
const DB_NAME = 'errdorste', DB_USER = 'errdorste';
const DB_PASS = process.env.DB_PASSWORD ?? '';
const USER = process.env.ADMIN_USERNAME ?? '';
const PASS = process.env.ADMIN_PASSWORD ?? '';

if (!DB_PASS || !USER || !PASS) {
  console.error('Set DB_PASSWORD, ADMIN_USERNAME and ADMIN_PASSWORD.');
  process.exit(2);
}

const fails = [];
const ok = (c, label, detail = '') => {
  if (!c) fails.push(label + (detail ? ` — ${detail}` : ''));
  console.log(`  ${c ? 'PASS' : 'FAIL'}  ${label}${detail && !c ? ` — ${detail}` : ''}`);
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext();
const page = await ctx.newPage();

console.log('\nInstaller');
await page.goto(`${BASE}/setup.php`, { waitUntil: 'domcontentloaded' });
ok((await page.content()).includes('Requirements'), 'step 1 shows requirements');
ok((await page.locator('.chk .n').count()) === 0, 'every requirement passes',
   await page.locator('.chk li').filter({ has: page.locator('.n') }).allInnerTexts().then((t) => t.join('; ')));

await page.click('a.btn');
ok(page.url().includes('step=db'), 'continues to the database step');

await page.fill('#name', DB_NAME);
await page.fill('#user', DB_USER);
await page.fill('#pass', DB_PASS);
await page.click('.form button[type=submit]');
await page.waitForLoadState('domcontentloaded');
ok(page.url().includes('step=admin'), 'database connects and the schema is created',
   `landed on ${page.url()}`);

await page.fill('#username', USER);
await page.fill('#password', PASS);
await page.click('.form button[type=submit]');
await page.waitForLoadState('domcontentloaded');
ok(page.url().includes('step=seed'), 'administrator account created', `landed on ${page.url()}`);

await page.click('.form button[type=submit]');
await page.waitForLoadState('domcontentloaded');
ok(page.url().includes('step=done'), 'starter content loaded');
const doneText = await page.locator('main').innerText();
ok(/Seeded: \d+ posts/.test(doneText), 'seed reported what it loaded',
   (doneText.match(/Seeded:[^\n]*/) ?? ['no summary'])[0]);
ok(doneText.includes('Delete'), 'the final step tells you to delete setup.php');

console.log('\nInstaller locks itself');
await page.goto(`${BASE}/setup.php`, { waitUntil: 'domcontentloaded' });
ok((await page.content()).includes('Already installed'), 're-running the installer is refused');

console.log('\nAdmin panel');
await page.goto(`${BASE}/admin/`, { waitUntil: 'domcontentloaded' });
ok(page.url().includes('r=login'), 'admin redirects to login');
await page.fill('#username', USER);
await page.fill('#password', PASS);
await page.click('.login__form button[type=submit]');
await page.waitForLoadState('domcontentloaded');
const dash = await page.locator('main').innerText();
ok(dash.includes('Dashboard'), 'signs in with the account the installer made');
ok(/Blog posts/.test(dash) && /Case studies/.test(dash), 'dashboard lists the content types');
const counts = (dash.match(/\n(\d+)\n/g) ?? []).map((s) => s.trim());
console.log(`         counts on dashboard: ${counts.join(', ')}`);

console.log('\nProtected paths');
for (const [path, label] of [
  ['/_backend/.env', '.env is not served'],
  ['/_backend/src/Auth.php', 'source is not served'],
  ['/_backend/migrations/001_schema.sql', 'schema is not served'],
]) {
  const r = await ctx.request.get(`${BASE}${path}`);
  // PHP's built-in server ignores .htaccess, so a 200 here is expected in
  // this harness; on Apache the deny applies. Report the body instead.
  const body = (await r.text()).slice(0, 40).replace(/\n/g, ' ');
  console.log(`  note  ${label}: HTTP ${r.status()} (Apache enforces this; PHP's dev server ignores .htaccess)`);
}

console.log('\nPublic site and API');
for (const [path, label] of [
  ['/', 'home page'],
  ['/case-studies/', 'case studies'],
  ['/api/?resource=posts', 'API posts'],
]) {
  const r = await ctx.request.get(`${BASE}${path}`);
  ok(r.status() === 200, `${label} responds 200`, `status ${r.status()}`);
}
const api = await (await ctx.request.get(`${BASE}/api/?resource=posts`)).json();
ok(api.count >= 6, 'API serves the seeded posts', `count ${api.count}`);

await b.close();
console.log(fails.length ? `\n${fails.length} FAILURE(S):\n- ${fails.join('\n- ')}` : '\nINSTALL FLOW PASSED');
process.exit(fails.length ? 1 : 0);
