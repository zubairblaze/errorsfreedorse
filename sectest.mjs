/**
 * Security and functional tests for the admin panel and public API.
 *
 * Runs against the PHP dev server:
 *   cd backend && PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8090 -t public
 *   node sectest.mjs
 *
 * These are attack attempts, not happy-path checks: each one tries to do
 * something it should not be allowed to do, and asserts that it failed.
 */
import { chromium } from 'playwright';

// Credentials come from the environment, never from this file: the
// repository is public, and a test fixture is still a credential.
//
//   ADMIN_USERNAME=… ADMIN_PASSWORD=… node sectest.mjs
const BASE = process.env.TEST_BASE ?? 'http://127.0.0.1:8090';
const USER = process.env.ADMIN_USERNAME ?? '';
const PASS = process.env.ADMIN_PASSWORD ?? '';

if (!USER || !PASS) {
  console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD before running this suite.');
  console.error('  ADMIN_USERNAME=… ADMIN_PASSWORD=… node sectest.mjs');
  process.exit(2);
}

const fails = [];
const ok = (cond, label, detail = '') => {
  if (!cond) fails.push(label + (detail ? ` — ${detail}` : ''));
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${detail && !cond ? ` — ${detail}` : ''}`);
};

const signIn = async (ctx) => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/?r=login`);
  await page.fill('#username', USER);
  await page.fill('#password', PASS);
  await page.click('.login__form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');
  return page;
};

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

/* ------------------------------------------------ access control ---- */
console.log('\nAccess control');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}/admin/`, { waitUntil: 'domcontentloaded' });

  ok(page.url().includes('r=login'), 'unauthenticated /admin/ redirects to login');
  ok(!(await page.content()).includes('Dashboard</h1>'), 'dashboard not leaked before login');

  const listRes = await ctx.request.get(`${BASE}/admin/?r=list&e=posts`);
  ok(!(await listRes.text()).includes('New post'), 'list route requires a session');

  const h = res.headers();
  ok(h['x-frame-options'] === 'DENY', 'X-Frame-Options: DENY');
  ok(h['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff');
  ok((h['content-security-policy'] || '').includes("script-src 'self'"), 'CSP restricts script-src');
  ok(!(h['content-security-policy'] || '').includes('unsafe-inline'), 'CSP has no unsafe-inline');
  ok((h['cache-control'] || '').includes('no-store'), 'admin responses are not cached');
  await ctx.close();
}

/* ------------------------------------------------- authentication --- */
console.log('\nAuthentication');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/admin/?r=login`);
  await page.fill('#username', USER);
  await page.fill('#password', 'definitely-wrong-password');
  await page.click('.login__form button[type=submit]');
  const wrongPw = ((await page.textContent('.flash--error')) || '').trim();

  await page.goto(`${BASE}/admin/?r=login`);
  await page.fill('#username', 'no-such-user-at-all');
  await page.fill('#password', 'definitely-wrong-password');
  await page.click('.login__form button[type=submit]');
  const noUser = ((await page.textContent('.flash--error')) || '').trim();

  ok(wrongPw === noUser && wrongPw.includes('Incorrect'),
    'no user enumeration: identical message for bad password and unknown user',
    `"${wrongPw}" vs "${noUser}"`);

  const p2 = await signIn(ctx);
  ok((await p2.content()).includes('Dashboard'), 'valid credentials sign in');

  const sess = (await ctx.cookies()).find((c) => c.name === 'ef_admin');
  ok(!!sess, 'session cookie is set');
  ok(sess?.httpOnly === true, 'session cookie is HttpOnly');
  ok(sess?.sameSite === 'Strict', 'session cookie is SameSite=Strict', String(sess?.sameSite));
  await ctx.close();
}

/* ----------------------------------------------------------- CSRF --- */
console.log('\nCSRF');
{
  const ctx = await browser.newContext();
  await signIn(ctx);

  const noToken = await ctx.request.post(`${BASE}/admin/?r=save&e=posts`, {
    form: { title: 'CSRF attempt', slug: 'csrf-attempt', excerpt: 'x'.repeat(20), body: '<p>hi</p>' },
  });
  ok(noToken.status() === 400, 'POST without a CSRF token is rejected', `status ${noToken.status()}`);

  const forged = await ctx.request.post(`${BASE}/admin/?r=save&e=posts`, {
    form: { csrf_token: 'a'.repeat(64), title: 'CSRF 2', slug: 'csrf-attempt-2', excerpt: 'x'.repeat(20), body: '<p>hi</p>' },
  });
  ok(forged.status() === 400, 'POST with a forged CSRF token is rejected', `status ${forged.status()}`);

  const del = await ctx.request.post(`${BASE}/admin/?r=delete&e=posts&id=1`, { form: {} });
  ok(del.status() === 400, 'delete without a CSRF token is rejected', `status ${del.status()}`);

  const check = await ctx.request.get(`${BASE}/api/?resource=posts&slug=csrf-attempt`);
  ok(check.status() === 404, 'no row was created by the CSRF attempts');

  const stillThere = await ctx.request.get(`${BASE}/api/?resource=posts`);
  ok((await stillThere.json()).count >= 6, 'no row was deleted by the CSRF attempt');
  await ctx.close();
}

/* ------------------------------------------------------ injection --- */
console.log('\nSQL injection');
{
  const ctx = await browser.newContext();
  await signIn(ctx);

  const entity = await ctx.request.get(`${BASE}/admin/?r=list&e=${encodeURIComponent("posts' OR 1=1--")}`);
  ok(entity.status() === 404, 'unknown entity parameter refused, never interpolated', `status ${entity.status()}`);

  const slug = await ctx.request.get(`${BASE}/api/?resource=posts&slug=${encodeURIComponent("' OR '1'='1")}`);
  ok(slug.status() === 404, 'API slug injection returns not-found, not every row');

  const idInj = await ctx.request.get(`${BASE}/admin/?r=edit&e=posts&id=${encodeURIComponent('1 OR 1=1')}`);
  ok(idInj.status() < 500, 'non-integer id does not error the server', `status ${idInj.status()}`);
  await ctx.close();
}

/* ------------------------------------------------------------ XSS --- */
console.log('\nXSS / HTML sanitising');
{
  const ctx = await browser.newContext();
  const page = await signIn(ctx);

  await page.goto(`${BASE}/admin/?r=edit&e=posts`);
  await page.fill('#f_title', 'XSS probe');
  await page.fill('#f_slug', 'xss-probe');
  await page.fill('#f_excerpt', 'Testing that the sanitiser removes active content from a body.');
  await page.fill('#f_body', [
    '<p onclick="window.__pwned=1">click</p>',
    '<script>window.__pwned=1;</script>',
    '<img src=x onerror="window.__pwned=1">',
    '<a href="javascript:alert(1)">bad link</a>',
    '<a href="java&#09;script:alert(1)">obfuscated</a>',
    '<a href="JaVaScRiPt:alert(1)">mixed case</a>',
    '<iframe src="https://evil.example"></iframe>',
    '<style>body{display:none}</style>',
    '<form action="https://evil.example"><input name="x"></form>',
    '<svg onload="window.__pwned=1"></svg>',
    '<div><p>Legitimate <strong>content</strong> survives.</p></div>',
    '<a href="https://errorsfree.com">A real link</a>',
  ].join('\n'));
  await page.selectOption('#f_status', 'published');
  await page.click('.form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');

  const stored = await (await ctx.request.get(`${BASE}/api/?resource=posts&slug=xss-probe`)).json();
  const body = stored?.data?.body ?? '';

  ok(body.length > 0, 'the post saved');
  ok(!/<script/i.test(body), 'script element stripped');
  ok(!/<iframe/i.test(body), 'iframe stripped');
  ok(!/<style/i.test(body), 'style element stripped');
  ok(!/<form/i.test(body), 'form element stripped');
  ok(!/<svg/i.test(body), 'svg stripped');
  ok(!/on(click|error|load)\s*=/i.test(body), 'event handler attributes stripped');
  ok(!/javascript:/i.test(body), 'javascript: URL stripped (all cases and obfuscations)');
  ok(/<strong>content<\/strong>/.test(body), 'legitimate markup preserved');
  ok(/href="https:\/\/errorsfree\.com"/.test(body), 'safe link preserved');
  ok(/rel="noopener noreferrer"/.test(body), 'external link given rel=noopener');

  const probe = await ctx.newPage();
  await probe.setContent(`<!doctype html><div>${body}</div>`);
  await probe.waitForTimeout(500);
  ok((await probe.evaluate(() => window.__pwned)) === undefined,
    'stored body executes nothing when rendered in a page');
  await probe.close();
  await ctx.close();
}

/* -------------------------------------------------- password flow --- */
console.log('\nPassword change');
{
  const ctx = await browser.newContext();
  const page = await signIn(ctx);

  await page.goto(`${BASE}/admin/?r=account`);
  await page.fill('#current', 'not-the-current-password');
  await page.fill('#new', 'a-perfectly-fine-new-passphrase');
  await page.fill('#confirm', 'a-perfectly-fine-new-passphrase');
  await page.click('.form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');
  ok(((await page.textContent('.flash--error')) || '').includes('current password'),
    'change requires the correct current password');

  await page.goto(`${BASE}/admin/?r=account`);
  await page.fill('#current', PASS);
  await page.fill('#new', 'short1!A');
  await page.fill('#confirm', 'short1!A');
  await page.click('.form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');
  ok(((await page.textContent('.flash--error')) || '').includes('12 characters'),
    'a weak new password is rejected');

  await page.goto(`${BASE}/admin/?r=account`);
  await page.fill('#current', PASS);
  await page.fill('#new', 'a-perfectly-fine-new-passphrase');
  await page.fill('#confirm', 'a-different-passphrase-entirely');
  await page.click('.form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');
  ok(((await page.textContent('.flash--error')) || '').includes('do not match'),
    'mismatched confirmation is rejected');
  await ctx.close();
}

/* ------------------------------------------------------------ API --- */
console.log('\nPublic API');
{
  const ctx = await browser.newContext();

  const posts = await (await ctx.request.get(`${BASE}/api/?resource=posts`)).json();
  ok(posts.data.every((p) => p.status === 'published'), 'only published rows are returned');

  const unknown = await ctx.request.get(`${BASE}/api/?resource=admins`);
  ok(unknown.status() === 404, 'an unlisted resource is refused');

  const bad = await ctx.request.post(`${BASE}/api/?resource=contact`, {
    data: { name: 'A', email: 'not-an-email', message: 'short' },
    headers: { 'Content-Type': 'application/json' },
  });
  ok(bad.status() === 422, 'contact endpoint validates input', `status ${bad.status()}`);

  const honey = await ctx.request.post(`${BASE}/api/?resource=contact`, {
    data: { name: 'Bot', email: 'bot@example.com', message: 'A message long enough to pass validation.', website: 'filled' },
    headers: { 'Content-Type': 'application/json' },
  });
  ok(honey.status() === 200, 'honeypot submission is accepted silently');

  const method = await ctx.request.fetch(`${BASE}/api/?resource=posts`, { method: 'DELETE' });
  ok(method.status() === 405, 'unsupported method is refused', `status ${method.status()}`);
  await ctx.close();
}

await browser.close();
console.log(fails.length
  ? `\n${fails.length} FAILURE(S):\n- ${fails.join('\n- ')}`
  : '\nALL SECURITY CHECKS PASSED');
process.exit(fails.length ? 1 : 0);
