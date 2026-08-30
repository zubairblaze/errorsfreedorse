<?php
declare(strict_types=1);

/**
 * Boots the backend. Every entry point includes this first.
 */

namespace ErrorsFree;

// No Composer: a plain PSR-4-ish autoloader over src/.
spl_autoload_register(static function (string $class): void {
    $prefix = 'ErrorsFree\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = __DIR__ . '/' . $relative . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

Env::load(dirname(__DIR__) . '/.env');

$isProduction = Env::get('APP_ENV', 'production') !== 'development';

// In production a stack trace must never reach the browser: it names file
// paths, and often the database and user. Log it instead.
ini_set('display_errors', $isProduction ? '0' : '1');
ini_set('display_startup_errors', $isProduction ? '0' : '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);

if ($isProduction) {
    set_exception_handler(static function (\Throwable $e): void {
        error_log('[errorsfree] uncaught: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: text/plain; charset=utf-8');
        }
        echo "Something went wrong. The error has been logged.\n";
    });
}

date_default_timezone_set('UTC');

/** Base path of the site, always with a single trailing slash. */
function base_path(): string
{
    $base = Env::get('APP_BASE', '/') ?? '/';
    return '/' . trim($base, '/') . '/';
}

/** Builds an absolute URL path within the site. */
function url_for(string $path = ''): string
{
    return preg_replace('#/{2,}#', '/', base_path() . ltrim($path, '/')) ?? '/';
}
