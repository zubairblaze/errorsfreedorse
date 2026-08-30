<?php
declare(strict_types=1);

namespace ErrorsFree;

use PDO;
use PDOException;
use RuntimeException;

/**
 * PDO connection.
 *
 * Three settings carry the weight here:
 *  - ERRMODE_EXCEPTION so a failed query is never silently ignored;
 *  - EMULATE_PREPARES false so placeholders are sent to the server as real
 *    parameters rather than interpolated by the driver, which is what makes
 *    prepared statements an actual defence rather than an escaping habit;
 *  - utf8mb4 on the connection, or bilingual content arrives mangled.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = Env::get('DB_HOST', '127.0.0.1');
        $port = Env::get('DB_PORT', '3306');
        $name = Env::get('DB_NAME', '');
        $user = Env::get('DB_USER', '');
        $pass = Env::get('DB_PASS', '');
        $socket = Env::get('DB_SOCKET');

        $dsn = $socket !== null
            ? "mysql:unix_socket={$socket};dbname={$name};charset=utf8mb4"
            : "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        try {
            self::$pdo = new PDO($dsn, (string) $user, (string) $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_STRINGIFY_FETCHES  => false,
            ]);
        } catch (PDOException $e) {
            // The message can contain the DSN, and the DSN names the database
            // and user. Log it; never show it.
            error_log('[errorsfree] database connection failed: ' . $e->getMessage());
            throw new RuntimeException('Database unavailable.', 0, $e);
        }

        return self::$pdo;
    }

    /** True when a connection can be opened. Used by the health check. */
    public static function check(): bool
    {
        try {
            self::pdo()->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
