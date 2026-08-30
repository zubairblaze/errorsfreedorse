<?php
// Shim: locates the backend regardless of which layout this copy uses.
// See src/locate.php for why this indirection exists.
declare(strict_types=1);

foreach ([
    dirname(__DIR__) . '/src/locate.php',        // repo layout: backend/public -> backend/src
    __DIR__ . '/_backend/src/locate.php',        // deployed layout
] as $candidate) {
    if (is_file($candidate)) {
        require $candidate;
        return;
    }
}

http_response_code(500);
header('Content-Type: text/plain; charset=utf-8');
exit("ErrorsFree backend not found: no src/locate.php beside this file.\n");
