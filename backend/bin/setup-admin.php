<?php
declare(strict_types=1);

/**
 * Creates or resets the administrator account.
 *
 *   php backend/bin/setup-admin.php
 *
 * Reads ADMIN_USERNAME and ADMIN_PASSWORD from backend/.env, or prompts when
 * they are absent. Only a password_hash() digest is written; the plaintext
 * never touches the database, a log, or this repository.
 *
 * Clear ADMIN_PASSWORD from .env once the account exists.
 */

use ErrorsFree\Auth;
use ErrorsFree\Database;
use ErrorsFree\Env;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script runs from the command line only.\n");
}

require dirname(__DIR__) . '/src/bootstrap.php';

function prompt(string $label, bool $hidden = false): string
{
    fwrite(STDOUT, $label);
    if ($hidden && DIRECTORY_SEPARATOR !== '\\') {
        // Turn off terminal echo so the password is not left on screen or in
        // the scrollback of a shared machine.
        @shell_exec('stty -echo');
        $value = trim((string) fgets(STDIN));
        @shell_exec('stty echo');
        fwrite(STDOUT, "\n");
        return $value;
    }
    return trim((string) fgets(STDIN));
}

$username = Env::get('ADMIN_USERNAME') ?? prompt('Admin username: ');
$password = Env::get('ADMIN_PASSWORD') ?? prompt('Admin password: ', true);

$username = trim($username);

if ($username === '' || !preg_match('/^[A-Za-z0-9._-]{3,64}$/', $username)) {
    fwrite(STDERR, "Username must be 3-64 characters: letters, digits, dot, underscore or hyphen.\n");
    exit(1);
}

if ($problem = Auth::passwordProblem($password, $username)) {
    fwrite(STDERR, "Password rejected: {$problem}\n");
    exit(1);
}

$pdo = Database::pdo();
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('SELECT id FROM admins WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
$existing = $stmt->fetchColumn();

if ($existing === false) {
    $stmt = $pdo->prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)');
    $stmt->execute([$username, $hash]);
    fwrite(STDOUT, "Created administrator '{$username}'.\n");
} else {
    // Bumping the epoch signs out every session the old password created.
    $stmt = $pdo->prepare(
        'UPDATE admins SET password_hash = ?, session_epoch = session_epoch + 1 WHERE id = ?'
    );
    $stmt->execute([$hash, (int) $existing]);
    fwrite(STDOUT, "Reset the password for '{$username}'. Existing sessions are now invalid.\n");
}

// Do not leave the plaintext sitting in the environment file.
if (Env::get('ADMIN_PASSWORD') !== null) {
    fwrite(STDOUT, "\nNow remove ADMIN_PASSWORD from backend/.env — it is no longer needed.\n");
}

fwrite(STDOUT, "Sign in at: " . (Env::get('APP_BASE', '/') ?? '/') . "admin/\n");
