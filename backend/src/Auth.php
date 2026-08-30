<?php
declare(strict_types=1);

namespace ErrorsFree;

use PDO;

/**
 * Administrator authentication.
 *
 * What this defends against, and how:
 *
 *  Password disclosure  — only a password_hash() digest is stored. Argon2id
 *                         where the build offers it, bcrypt otherwise.
 *  Brute force          — failures are counted per account and per IP over a
 *                         rolling window and locked out with a growing delay.
 *  User enumeration     — an unknown username still runs a verify against a
 *                         dummy hash, so a wrong username and a wrong
 *                         password cost the same time and give the same
 *                         message.
 *  Session fixation     — the session id is regenerated on login.
 *  Session theft        — sessions are bound to a user-agent fingerprint and
 *                         expire on both idle and absolute limits.
 *  Stale sessions       — a password change bumps session_epoch, which
 *                         invalidates every session already issued.
 */
final class Auth
{
    private const SESSION_NAME    = 'ef_admin';
    private const IDLE_TIMEOUT    = 1800;    // 30 minutes without a request
    private const ABSOLUTE_LIMIT  = 28800;   // 8 hours, however active
    private const WINDOW_SECONDS  = 900;     // rolling throttle window
    private const MAX_PER_ACCOUNT = 5;
    private const MAX_PER_IP      = 20;

    /** A real hash, so the not-found path costs the same as the found path. */
    private const DUMMY_HASH = '$2y$12$usesomesillystringfoeueaddotherwiseitwouldbeinsecure.dummyhash1234567890ab';

    /** Starts the session with hardened cookie settings. */
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $https = Env::bool('APP_HTTPS', false);
        $base  = Env::get('APP_BASE', '/');

        session_name(self::SESSION_NAME);
        session_set_cookie_params([
            'lifetime' => 0,          // dies with the browser session
            'path'     => $base,
            'domain'   => '',
            'secure'   => $https,     // must be on once served over HTTPS
            'httponly' => true,       // unreadable from JavaScript
            'samesite' => 'Strict',   // not sent on cross-site navigation
        ]);

        // Never accept a session id supplied in the URL.
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');

        session_start();
    }

    /** A stable-enough fingerprint to notice a stolen cookie replayed elsewhere. */
    private static function fingerprint(): string
    {
        return hash('sha256', ($_SERVER['HTTP_USER_AGENT'] ?? '') . '|' . self::SESSION_NAME);
    }

    /** Whether a valid, unexpired admin session is in progress. */
    public static function check(): bool
    {
        self::startSession();

        $id = $_SESSION['admin_id'] ?? null;
        if (!is_int($id)) {
            return false;
        }

        $now = time();

        if (($_SESSION['fingerprint'] ?? null) !== self::fingerprint()) {
            self::logout();
            return false;
        }
        if ($now - (int) ($_SESSION['last_activity'] ?? 0) > self::IDLE_TIMEOUT) {
            self::logout();
            return false;
        }
        if ($now - (int) ($_SESSION['issued_at'] ?? 0) > self::ABSOLUTE_LIMIT) {
            self::logout();
            return false;
        }

        // A password change elsewhere invalidates this session.
        $stmt = Database::pdo()->prepare('SELECT session_epoch FROM admins WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $epoch = $stmt->fetchColumn();
        if ($epoch === false || (int) $epoch !== (int) ($_SESSION['epoch'] ?? -1)) {
            self::logout();
            return false;
        }

        $_SESSION['last_activity'] = $now;
        return true;
    }

    /** Redirects to the login page unless a valid session exists. */
    public static function requireLogin(string $loginUrl): void
    {
        if (!self::check()) {
            header('Location: ' . $loginUrl);
            exit;
        }
    }

    /**
     * How many seconds the caller must wait, or 0 if they may try now.
     * Backs off 30s, 60s, 120s… per failure beyond the threshold, capped.
     */
    public static function lockoutSeconds(string $username): int
    {
        $pdo = Database::pdo();
        $since = date('Y-m-d H:i:s', time() - self::WINDOW_SECONDS);
        $ip = Security::ipBinary() ?? '';

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM login_attempts
             WHERE success = 0 AND attempted_at > ? AND username = ?'
        );
        $stmt->execute([$since, $username]);
        $byAccount = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM login_attempts
             WHERE success = 0 AND attempted_at > ? AND ip = ?'
        );
        $stmt->execute([$since, $ip]);
        $byIp = (int) $stmt->fetchColumn();

        $over = max($byAccount - self::MAX_PER_ACCOUNT, $byIp - self::MAX_PER_IP);
        if ($over < 0) {
            return 0;
        }

        return (int) min(900, 30 * (2 ** min($over, 5)));
    }

    private static function record(string $username, bool $success): void
    {
        $stmt = Database::pdo()->prepare(
            'INSERT INTO login_attempts (username, ip, success) VALUES (?, ?, ?)'
        );
        $stmt->execute([substr($username, 0, 64), Security::ipBinary() ?? '', $success ? 1 : 0]);
    }

    /**
     * Attempts a login. Returns null on success, or a message safe to show.
     * The message never distinguishes an unknown user from a wrong password.
     */
    public static function login(string $username, string $password): ?string
    {
        self::startSession();

        $wait = self::lockoutSeconds($username);
        if ($wait > 0) {
            return 'Too many failed attempts. Try again in ' . ceil($wait / 60) . ' minute(s).';
        }

        $stmt = Database::pdo()->prepare(
            'SELECT id, username, password_hash, session_epoch, must_change_password
             FROM admins WHERE username = ? LIMIT 1'
        );
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        // Always verify something, so timing does not reveal whether the
        // account exists.
        $hash = is_array($admin) ? (string) $admin['password_hash'] : self::DUMMY_HASH;
        $verified = password_verify($password, $hash);

        if (!is_array($admin) || !$verified) {
            self::record($username, false);
            return 'Incorrect username or password.';
        }

        // Re-hash transparently if the cost factor or algorithm has moved on.
        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            $upd = Database::pdo()->prepare('UPDATE admins SET password_hash = ? WHERE id = ?');
            $upd->execute([password_hash($password, PASSWORD_DEFAULT), (int) $admin['id']]);
        }

        self::record($username, true);

        // Regenerate before writing identity into the session.
        session_regenerate_id(true);
        Csrf::rotate();

        $_SESSION['admin_id']      = (int) $admin['id'];
        $_SESSION['admin_name']    = (string) $admin['username'];
        $_SESSION['epoch']         = (int) $admin['session_epoch'];
        $_SESSION['issued_at']     = time();
        $_SESSION['last_activity'] = time();
        $_SESSION['fingerprint']   = self::fingerprint();
        $_SESSION['must_change']   = (bool) $admin['must_change_password'];

        $upd = Database::pdo()->prepare(
            'UPDATE admins SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?'
        );
        $upd->execute([Security::ipBinary(), (int) $admin['id']]);

        return null;
    }

    public static function logout(): void
    {
        self::startSession();
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires'  => time() - 42000,
                'path'     => $p['path'],
                'domain'   => $p['domain'],
                'secure'   => $p['secure'],
                'httponly' => $p['httponly'],
                'samesite' => $p['samesite'] ?? 'Strict',
            ]);
        }

        session_destroy();
    }

    /**
     * Rejects passwords that are trivially guessable.
     *
     * Follows current NIST guidance (SP 800-63B) rather than the older
     * "one of each character class" habit: length is what actually resists
     * guessing, and rigid composition rules push people toward predictable
     * substitutions and toward writing the result on a note.
     *
     * So: 12 characters minimum; a mix of three classes is required only
     * below 16, where length alone is not yet doing the work. Above that,
     * any passphrase is accepted provided it is not degenerate.
     *
     * Returns null when acceptable.
     */
    public static function passwordProblem(string $password, string $username = ''): ?string
    {
        $length = mb_strlen($password);

        if ($length < 12) {
            return 'Use at least 12 characters.';
        }
        if ($length > 200) {
            return 'That is longer than 200 characters.';
        }

        if ($length < 16) {
            $classes = 0;
            $classes += preg_match('/[a-z]/', $password);
            $classes += preg_match('/[A-Z]/', $password);
            $classes += preg_match('/[0-9]/', $password);
            $classes += preg_match('/[^a-zA-Z0-9]/', $password);

            if ($classes < 3) {
                return 'Under 16 characters, mix at least three of: lower case, upper case, numbers, symbols — or simply use a longer passphrase.';
            }
        }

        // Degenerate shapes that are long but carry almost no entropy.
        if (preg_match('/^(.)\1+$/u', $password)) {
            return 'That is a single repeated character.';
        }
        if (preg_match('/^(.{1,4})\1+$/u', $password)) {
            return 'That is a short sequence repeated over and over.';
        }

        $lower = mb_strtolower($password);

        if ($username !== '' && mb_strlen($username) >= 3 && str_contains($lower, mb_strtolower($username))) {
            return 'The password must not contain the username.';
        }

        // A short blocklist of the passwords that appear at the top of every
        // credential dump. Not a substitute for length; a floor beneath it.
        foreach (['password', 'qwerty', '123456', 'letmein', 'admin', 'welcome', 'iloveyou', 'errorsfree'] as $common) {
            if (str_contains($lower, $common)) {
                return 'That contains a very common word or sequence. Choose something less guessable.';
            }
        }

        return null;
    }

    /**
     * Changes the signed-in administrator's password.
     *
     * Requires the current password, so a hijacked open session cannot lock
     * the owner out. Bumps session_epoch, which signs out every other device,
     * then re-establishes this one.
     */
    public static function changePassword(string $current, string $new, string $confirm): ?string
    {
        if (!self::check()) {
            return 'Your session has expired. Sign in again.';
        }
        if ($new !== $confirm) {
            return 'The new passwords do not match.';
        }
        if ($problem = self::passwordProblem($new, (string) ($_SESSION['admin_name'] ?? ''))) {
            return $problem;
        }

        $pdo = Database::pdo();
        $id = (int) $_SESSION['admin_id'];

        $stmt = $pdo->prepare('SELECT password_hash FROM admins WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $hash = $stmt->fetchColumn();

        if (!is_string($hash) || !password_verify($current, $hash)) {
            self::record((string) ($_SESSION['admin_name'] ?? ''), false);
            return 'Your current password is not correct.';
        }
        if (password_verify($new, $hash)) {
            return 'The new password must differ from the current one.';
        }

        $upd = $pdo->prepare(
            'UPDATE admins
             SET password_hash = ?, session_epoch = session_epoch + 1, must_change_password = 0
             WHERE id = ?'
        );
        $upd->execute([password_hash($new, PASSWORD_DEFAULT), $id]);

        // Keep this device signed in, on the new epoch, with a new id.
        session_regenerate_id(true);
        Csrf::rotate();
        $stmt = $pdo->prepare('SELECT session_epoch FROM admins WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $_SESSION['epoch'] = (int) $stmt->fetchColumn();
        $_SESSION['must_change'] = false;

        return null;
    }

    public static function id(): ?int
    {
        return isset($_SESSION['admin_id']) ? (int) $_SESSION['admin_id'] : null;
    }

    public static function name(): string
    {
        return (string) ($_SESSION['admin_name'] ?? '');
    }
}
