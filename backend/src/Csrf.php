<?php
declare(strict_types=1);

namespace ErrorsFree;

/**
 * Per-session CSRF token.
 *
 * One token for the session rather than one per form: simpler, and equally
 * effective against cross-site posting, which is the threat. Comparison uses
 * hash_equals so a token cannot be recovered a byte at a time by timing the
 * response.
 */
final class Csrf
{
    private const KEY = 'csrf_token';

    public static function token(): string
    {
        if (empty($_SESSION[self::KEY]) || !is_string($_SESSION[self::KEY])) {
            $_SESSION[self::KEY] = bin2hex(random_bytes(32));
        }
        return $_SESSION[self::KEY];
    }

    /** Hidden input for a form. */
    public static function field(): string
    {
        return '<input type="hidden" name="csrf_token" value="' . Security::e(self::token()) . '">';
    }

    public static function valid(?string $submitted): bool
    {
        $expected = $_SESSION[self::KEY] ?? null;
        if (!is_string($expected) || !is_string($submitted) || $submitted === '') {
            return false;
        }
        return hash_equals($expected, $submitted);
    }

    /**
     * Guards a state-changing request. Ends the response on failure rather
     * than returning a value a caller could forget to check.
     */
    public static function requireValid(): void
    {
        $token = $_POST['csrf_token'] ?? null;
        if (!self::valid(is_string($token) ? $token : null)) {
            http_response_code(400);
            header('Content-Type: text/plain; charset=utf-8');
            exit('Request rejected: invalid or expired security token. Reload the page and try again.');
        }
    }

    /** Issues a fresh token. Called on login and on password change. */
    public static function rotate(): void
    {
        $_SESSION[self::KEY] = bin2hex(random_bytes(32));
    }
}
