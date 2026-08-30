# ErrorsFree backend — Phase 2

PHP 8 + MySQL. No Composer, no build step: it runs on whatever a cPanel
account or an XAMPP install already provides.

- **Admin panel** — `/admin/` — blog posts, case studies, vibe-coded apps,
  services, plus enquiries and subscribers.
- **Public API** — `/api/` — JSON the static site reads at build time.

---

## Local setup (XAMPP)

```bash
# 1. Database
mysql -u root -p -e "CREATE DATABASE errdorste CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u errdorste -p errdorste < backend/migrations/001_schema.sql

# 2. Configuration — never committed
cp backend/.env.example backend/.env
#    fill in DB_PASS, set APP_BASE, and set ADMIN_USERNAME / ADMIN_PASSWORD

# 3. Administrator account
php backend/bin/setup-admin.php
#    then clear ADMIN_PASSWORD from backend/.env

# 4. Seed the Phase 1 content
node scripts/export-content.mjs
php backend/bin/seed.php
```

Sign in at `<APP_BASE>admin/`.

## Deploying

The document root must contain **only** `backend/public/` plus the built
static site. `backend/src`, `backend/bin`, `backend/migrations` and
`backend/.env` belong outside it. Where the host will not allow that, the
`Require all denied` in `backend/.htaccess` is the fallback — but moving the
files is the real fix, and it takes a minute.

Set `APP_HTTPS=1` once the site is served over HTTPS, or the session cookie
will not carry the Secure flag.

## Building the site from the database

```bash
EF_API_URL=https://errorsfree.com/api/ npm run build
```

Without `EF_API_URL` the site builds from the fixtures in `src/data`, so a
broken backend can never block a deploy. With it set, a failed API call stops
the build loudly rather than silently publishing stale content.

---

## Security

What is implemented, and what each measure is actually for.

| Threat | Measure |
| --- | --- |
| SQL injection | PDO throughout with `EMULATE_PREPARES` **off**, so placeholders are real server-side parameters. Table and column names come only from `Entities.php`; the entity key is checked against an allowlist before it can reach a query. |
| XSS in content | Editor HTML is parsed with `DOMDocument` and rebuilt against a tag/attribute allowlist — not filtered with regular expressions, which cannot see the tree and are bypassed for exactly that reason. `script`, `style`, `iframe`, `form`, `svg`, every `on*` handler, and any non-http(s)/mailto/tel URL are removed. URLs are entity-decoded and stripped of whitespace before the scheme is tested, so `java&#09;script:` is caught. |
| XSS in the panel | Output escaped with `htmlspecialchars(ENT_QUOTES\|ENT_SUBSTITUTE)`. The admin CSP forbids inline script outright; the panel's JavaScript is a separate file so that rule can stay absolute. |
| CSRF | Per-session token on every state-changing request, compared with `hash_equals`, checked before any handler reads input. |
| Brute force | Failures counted per account and per IP over a 15-minute window, with exponential backoff to a 15-minute cap. |
| User enumeration | An unknown username still runs `password_verify` against a dummy hash, so timing and message are identical to a wrong password. |
| Password disclosure | Only a `password_hash()` digest is stored (bcrypt cost 12, Argon2id where available), rehashed transparently when the default moves on. |
| Session fixation | Session id regenerated on login and on password change. |
| Session theft | `HttpOnly`, `SameSite=Strict`, `Secure` when `APP_HTTPS=1`; bound to a user-agent fingerprint; 30-minute idle and 8-hour absolute limits. |
| Stale sessions | A password change increments `session_epoch`, invalidating every session already issued — so changing the password genuinely evicts an attacker. |
| Malicious uploads | Type confirmed by reading the file header with `getimagesize`, not the client-supplied MIME. Extension re-derived from that. Random filename, so traversal in the original name is discarded. 5 MB cap. `uploads/.htaccess` disables the PHP engine and strips script handlers as a backstop. |
| Clickjacking | `X-Frame-Options: DENY` and `frame-ancestors 'none'`. |
| Information disclosure | `display_errors` off in production; exceptions logged, never rendered. The `.env` reader keeps values in a static array rather than `$_ENV` or `putenv`, so a credential cannot leak through `phpinfo()` or a subprocess. |
| Spam | Honeypot plus a per-IP write throttle on the public endpoints. `INSERT IGNORE` on subscribe, so the endpoint cannot be used to test whether an address is on the list. |

### Verifying

```bash
cd backend && PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8090 -t public
ADMIN_USERNAME=… ADMIN_PASSWORD=… node sectest.mjs
```

42 checks. They are attack attempts, not happy-path tests: each tries
something that should fail and asserts that it did. Credentials come from the
environment — a test fixture is still a credential, and this repo is public.

### Not implemented

Named so the gaps are decisions rather than oversights.

- **One account, no roles.** Fine for a single operator; a second person
  needs a `role` column and checks at the route level.
- **No 2FA.** The largest remaining upgrade. TOTP against the `admins` table
  is perhaps half a day.
- **No audit log of edits.** Logins are recorded; content changes are not.
- **No CSP on the public site.** The admin has one; the marketing pages do
  not yet.
- **Uploads are not re-encoded.** A valid image carrying odd metadata is
  stored as-is. Re-encoding through GD would strip that.

### Operational notes

- Rotate any credential that has been pasted into a chat, an email or a
  ticket. Treat it as public from that moment.
- `login_attempts` grows without bound. Trim it periodically:
  `DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL 30 DAY;`
- Back up before running `bin/seed.php` against a live database. It updates
  matching slugs in place and never deletes, but it does overwrite.
