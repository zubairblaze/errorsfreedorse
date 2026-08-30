<?php
declare(strict_types=1);

/**
 * One-time web installer.
 *
 * Walks through: environment check -> database connection -> schema ->
 * administrator account -> seed content. Writes _backend/.env for you.
 *
 * TWO LOCKS, because an installer is the most dangerous file a site can
 * contain — it creates the administrator:
 *
 *   1. It refuses any request that did not come from the machine it runs on.
 *      That matches how this is meant to be used: set up on localhost, then
 *      deploy. On a live server use backend/bin/setup-admin.php instead.
 *   2. It refuses to run at all once an administrator exists. After that it
 *      only tells you to delete it.
 *
 * Delete this file when you are done. The last step reminds you.
 */

session_start();

/* ------------------------------------------------ lock 1: localhost --- */

$remote = $_SERVER['REMOTE_ADDR'] ?? '';
if (!in_array($remote, ['127.0.0.1', '::1', 'localhost'], true)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit(
        "The installer only runs from the machine it is installed on.\n\n" .
        "You are connecting from {$remote}.\n\n" .
        "On a live server, create the administrator from the command line instead:\n" .
        "  php _backend/bin/setup-admin.php\n"
    );
}

/* --------------------------------------------------------- helpers --- */

$root = __DIR__;
$backend = is_dir($root . '/_backend') ? $root . '/_backend' : dirname($root);
$envPath = $backend . '/.env';

function e(?string $s): string
{
    return htmlspecialchars($s ?? '', ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

function token(): string
{
    if (empty($_SESSION['setup_csrf'])) {
        $_SESSION['setup_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['setup_csrf'];
}

function checkToken(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        return;
    }
    if (!hash_equals($_SESSION['setup_csrf'] ?? '', (string) ($_POST['csrf'] ?? ''))) {
        http_response_code(400);
        exit('Security token expired. Reload and try again.');
    }
}

/** Reads .env into an array without touching the environment. */
function readEnv(string $path): array
{
    if (!is_readable($path)) {
        return [];
    }
    $out = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $out[trim($k)] = trim($v);
    }
    return $out;
}

function connect(array $env): PDO
{
    $dsn = "mysql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']};charset=utf8mb4";
    return new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

/* --------------------------------------- lock 2: already installed --- */

$env = readEnv($envPath);
$installed = false;

if ($env !== [] && !empty($env['DB_NAME'])) {
    try {
        $pdo = connect($env);
        $installed = (int) $pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn() > 0;
    } catch (Throwable) {
        $installed = false;   // no database or no tables yet: not installed
    }
}

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/') . '/';

/*
 * The lock must not fire on the session that is doing the installing.
 *
 * Creating the administrator happens at step 3 of 5. Without this exception
 * the installer locks itself out immediately afterwards, and the operator
 * never reaches the seed step or the reminder to delete this file — which is
 * the single most important instruction it gives.
 *
 * The flag is only ever set below, in-process, immediately after a
 * successful insert into an admins table that was empty. Nobody can present
 * it without having already performed the install, so the lock is not
 * weakened — only made to apply at the right moment.
 */
$isInstallingSession = !empty($_SESSION['setup_in_progress']);

if ($installed && !$isInstallingSession) {
    http_response_code(410);
    ?>
    <!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Already installed</title><link rel="stylesheet" href="<?= e($base) ?>admin/assets/admin.css"></head>
    <body class="login-body"><main class="login">
      <h1 style="font-size:1.3rem">Already installed</h1>
      <p class="lede">An administrator account exists, so the installer has locked itself.</p>
      <p><strong>Delete <code>setup.php</code> now.</strong> It has done its job and every
         installer left on a server is a liability.</p>
      <p><a class="btn" href="<?= e($base) ?>admin/">Go to the admin panel</a></p>
      <p class="login__note">To reset the password later:
         <code>php _backend/bin/setup-admin.php</code></p>
    </main></body></html>
    <?php
    exit;
}

/* ----------------------------------------------------------- steps --- */

checkToken();

$step = (string) ($_GET['step'] ?? 'check');
$errors = [];
$notes = [];

// ---- Step: database ----------------------------------------------------
if ($step === 'db' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $candidate = [
        'DB_HOST' => trim((string) ($_POST['host'] ?? '127.0.0.1')),
        'DB_PORT' => trim((string) ($_POST['port'] ?? '3306')),
        'DB_NAME' => trim((string) ($_POST['name'] ?? '')),
        'DB_USER' => trim((string) ($_POST['user'] ?? '')),
        'DB_PASS' => (string) ($_POST['pass'] ?? ''),
    ];

    if ($candidate['DB_NAME'] === '' || $candidate['DB_USER'] === '') {
        $errors[] = 'Database name and user are required.';
    } else {
        try {
            $pdo = connect($candidate);

            // Write .env, preserving any keys already there.
            $merged = array_merge([
                'APP_BASE' => rtrim($base, '/') . '/',
                'APP_ENV' => 'development',
                'APP_HTTPS' => '0',
            ], $env, $candidate);

            $lines = ["# Written by setup.php. Never commit this file.", ''];
            foreach ($merged as $k => $v) {
                if (in_array($k, ['ADMIN_USERNAME', 'ADMIN_PASSWORD'], true)) {
                    continue;   // never persist these
                }
                $lines[] = "{$k}={$v}";
            }

            if (@file_put_contents($envPath, implode("\n", $lines) . "\n") === false) {
                $errors[] = 'Could not write ' . $envPath . '. Check folder permissions.';
            } else {
                @chmod($envPath, 0600);

                // Run the schema in the same request: there is no reason to
                // make the operator click again for something that cannot
                // fail independently.
                $sqlPath = $backend . '/migrations/001_schema.sql';
                $sql = is_readable($sqlPath) ? (string) file_get_contents($sqlPath) : '';
                if ($sql === '') {
                    $errors[] = 'Missing _backend/migrations/001_schema.sql.';
                } else {
                    try {
                        $pdo->exec($sql);
                        header('Location: ?step=admin');
                        exit;
                    } catch (Throwable $ex) {
                        $errors[] = 'Schema failed: ' . $ex->getMessage();
                    }
                }
            }
        } catch (Throwable $ex) {
            $errors[] = 'Could not connect: ' . $ex->getMessage();
        }
    }
    $env = array_merge($env, $candidate);
}

// ---- Step: administrator ----------------------------------------------
if ($step === 'admin' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    require_once $backend . '/src/Env.php';
    require_once $backend . '/src/Security.php';
    require_once $backend . '/src/Database.php';
    require_once $backend . '/src/Auth.php';
    \ErrorsFree\Env::load($envPath);

    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if (!preg_match('/^[A-Za-z0-9._-]{3,64}$/', $username)) {
        $errors[] = 'Username must be 3-64 characters: letters, digits, dot, underscore or hyphen.';
    } elseif ($problem = \ErrorsFree\Auth::passwordProblem($password, $username)) {
        $errors[] = $problem;
    } else {
        try {
            $pdo = connect(readEnv($envPath));
            $stmt = $pdo->prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)');
            $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
            // Carry this session through the remaining steps; see the note
            // beside the lock above.
            $_SESSION['setup_in_progress'] = true;
            header('Location: ?step=seed');
            exit;
        } catch (Throwable $ex) {
            $errors[] = 'Could not create the account: ' . $ex->getMessage();
        }
    }
}

// ---- Step: seed --------------------------------------------------------
if ($step === 'seed' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $seedScript = $backend . '/bin/seed.php';
    if (!is_file($seedScript)) {
        $errors[] = 'Missing _backend/bin/seed.php.';
    } else {
        // seed.php is written for the CLI; run it in-process with the guard
        // satisfied rather than shelling out, which shared hosts often block.
        try {
            define('EF_INSTALLER', true);
            ob_start();
            require $seedScript;
            // Survive the redirect: $notes is rebuilt on the next request.
            $_SESSION['setup_notes'] = [trim(strip_tags((string) ob_get_clean()))];
            header('Location: ?step=done');
            exit;
        } catch (Throwable $ex) {
            ob_end_clean();
            $errors[] = 'Seeding failed: ' . $ex->getMessage();
        }
    }
}

/* ------------------------------------------------------------ view --- */

$checks = [
    ['PHP 8.1 or newer', PHP_VERSION_ID >= 80100, PHP_VERSION],
    ['pdo_mysql extension', extension_loaded('pdo_mysql'), ''],
    ['mbstring extension', extension_loaded('mbstring'), ''],
    ['dom extension (HTML sanitiser)', extension_loaded('dom'), ''],
    ['_backend folder present', is_dir($backend . '/src'), $backend],
    ['_backend writable (for .env)', is_writable($backend), ''],
    ['uploads folder writable', is_dir($root . '/uploads') && is_writable($root . '/uploads'), ''],
];
$allOk = array_reduce($checks, static fn($c, $r) => $c && $r[1], true);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>ErrorsFree — install</title>
<link rel="stylesheet" href="<?= e($base) ?>admin/assets/admin.css">
<style>
  .wiz { width: min(38rem, calc(100vw - 2rem)); margin: 3rem auto; }
  .steps { display: flex; gap: .5rem; list-style: none; padding: 0; margin: 0 0 2rem; font-size: .8rem; flex-wrap: wrap; }
  .steps li { padding: .3rem .8rem; border-radius: 999px; border: 1px solid var(--line); color: var(--ink-3); }
  .steps li.on { border-color: var(--accent); color: var(--accent); font-weight: 600; }
  .chk { list-style: none; padding: 0; margin: 0 0 1.5rem; display: grid; gap: .4rem; }
  .chk li { display: flex; gap: .6rem; align-items: baseline; font-size: .92rem; }
  .chk .y { color: var(--ok); font-weight: 700; }
  .chk .n { color: var(--danger); font-weight: 700; }
  .chk small { color: var(--ink-3); margin-left: auto; font-family: var(--mono); font-size: .78rem; }
</style>
</head>
<body>
<main class="wiz">
  <div class="brand brand--big">
    <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="brand__text">ErrorsFree<br><small>install</small></span>
  </div>

  <ul class="steps">
    <li class="<?= $step === 'check' ? 'on' : '' ?>">1 · Requirements</li>
    <li class="<?= $step === 'db' ? 'on' : '' ?>">2 · Database</li>
    <li class="<?= $step === 'admin' ? 'on' : '' ?>">3 · Administrator</li>
    <li class="<?= $step === 'seed' ? 'on' : '' ?>">4 · Content</li>
    <li class="<?= $step === 'done' ? 'on' : '' ?>">5 · Done</li>
  </ul>

  <?php foreach ($errors as $err): ?>
    <p class="flash flash--error" role="alert"><?= e($err) ?></p>
  <?php endforeach; ?>

  <?php if ($step === 'check'): ?>
    <h1>Requirements</h1>
    <ul class="chk">
      <?php foreach ($checks as [$label, $pass, $detail]): ?>
        <li><span class="<?= $pass ? 'y' : 'n' ?>"><?= $pass ? '✓' : '✕' ?></span>
            <span><?= e($label) ?></span>
            <?php if ($detail !== ''): ?><small><?= e($detail) ?></small><?php endif; ?></li>
      <?php endforeach; ?>
    </ul>
    <?php if ($allOk): ?>
      <a class="btn" href="?step=db">Continue</a>
    <?php else: ?>
      <p class="flash flash--error">Fix the items marked ✕ and reload. In XAMPP, the
        extensions are enabled in <code>php.ini</code>; permission problems are usually
        the folder being read-only.</p>
    <?php endif; ?>

  <?php elseif ($step === 'db'): ?>
    <h1>Database</h1>
    <p class="lede">Create the database and user in phpMyAdmin first, then enter them here.
       The schema is applied as soon as the connection works.</p>
    <form method="post" action="?step=db" class="form">
      <input type="hidden" name="csrf" value="<?= e(token()) ?>">
      <div class="field"><label for="host">Host</label>
        <input id="host" name="host" type="text" value="<?= e($env['DB_HOST'] ?? '127.0.0.1') ?>"></div>
      <div class="field"><label for="port">Port</label>
        <input id="port" name="port" type="text" value="<?= e($env['DB_PORT'] ?? '3306') ?>"></div>
      <div class="field"><label for="name">Database name</label>
        <input id="name" name="name" type="text" value="<?= e($env['DB_NAME'] ?? 'errdorste') ?>" required></div>
      <div class="field"><label for="user">Database user</label>
        <input id="user" name="user" type="text" value="<?= e($env['DB_USER'] ?? 'errdorste') ?>" required></div>
      <div class="field"><label for="pass">Database password</label>
        <input id="pass" name="pass" type="password" value=""></div>
      <div class="form__actions"><button class="btn" type="submit">Connect and create tables</button></div>
    </form>

  <?php elseif ($step === 'admin'): ?>
    <h1>Administrator</h1>
    <p class="lede">The only account. Its password is stored as a hash — never in plain text,
       never in a file.</p>
    <form method="post" action="?step=admin" class="form" autocomplete="off">
      <input type="hidden" name="csrf" value="<?= e(token()) ?>">
      <div class="field"><label for="username">Username</label>
        <input id="username" name="username" type="text" required maxlength="64"
               value="<?= e((string) ($_POST['username'] ?? '')) ?>"></div>
      <div class="field"><label for="password">Password</label>
        <input id="password" name="password" type="password" required maxlength="200">
        <p class="help">At least 12 characters. Below 16, mix three of: lower case,
           upper case, numbers, symbols. A longer passphrase needs no mixing.</p></div>
      <div class="form__actions"><button class="btn" type="submit">Create account</button></div>
    </form>

  <?php elseif ($step === 'seed'): ?>
    <h1>Starter content</h1>
    <p class="lede">Loads the blog posts, case studies, services and apps the site ships with,
       so the admin panel is not empty. Safe to skip, and safe to run twice — it matches on
       slug and never deletes.</p>
    <form method="post" action="?step=seed" class="form">
      <input type="hidden" name="csrf" value="<?= e(token()) ?>">
      <div class="form__actions">
        <button class="btn" type="submit">Load starter content</button>
        <a class="linkish" href="?step=done">Skip</a>
      </div>
    </form>

  <?php else:
    // Reached the end: pick up the seed summary and release the exception
    // that let this session past the lock, so the next visit is refused.
    $notes = array_merge($notes, $_SESSION['setup_notes'] ?? []);
    unset($_SESSION['setup_notes'], $_SESSION['setup_in_progress']);
  ?>
    <h1>Done</h1>
    <?php foreach ($notes as $note): ?><p class="flash flash--ok"><?= e($note) ?></p><?php endforeach; ?>
    <p class="lede">The admin panel is ready.</p>
    <p><a class="btn" href="<?= e($base) ?>admin/">Open the admin panel</a></p>
    <h2>One thing left</h2>
    <p class="flash flash--error">
      <strong>Delete <code>setup.php</code> now.</strong> It cannot create a second
      administrator, and it refuses connections from other machines — but an installer
      left on a server is a liability, and there is no reason to keep it.
    </p>
    <p class="help">To rebuild the static site from the database:<br>
      <code>EF_API_URL=&lt;your site&gt;/api/ npm run build</code></p>
  <?php endif; ?>
</main>
</body>
</html>
