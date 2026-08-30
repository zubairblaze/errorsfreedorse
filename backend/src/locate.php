<?php
declare(strict_types=1);

/**
 * Finds src/bootstrap.php from an entry point, whichever layout is in use.
 *
 * The repository keeps the code outside the document root:
 *     backend/public/admin/index.php  ->  backend/src/bootstrap.php
 *
 * A deployed copy cannot do that on shared hosting, so the drop-in package
 * uses a sibling folder instead:
 *     errorsfree/admin/index.php      ->  errorsfree/_backend/src/bootstrap.php
 *
 * One entry point has to work in both, and hardcoding dirname(__DIR__, 2)
 * silently resolves to the web root in the second layout — a failure that
 * looks like a missing file rather than a wrong path. So the candidates are
 * explicit and the error names them.
 */

$__ef_candidates = [
    dirname(__DIR__, 2) . '/src/bootstrap.php',            // repo layout
    dirname(__DIR__) . '/_backend/src/bootstrap.php',      // deployed layout
    dirname(__DIR__, 2) . '/_backend/src/bootstrap.php',   // deployed, nested entry
];

$__ef_found = null;
foreach ($__ef_candidates as $__ef_path) {
    if (is_file($__ef_path)) {
        $__ef_found = $__ef_path;
        break;
    }
}

if ($__ef_found === null) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "ErrorsFree backend not found.\n\nLooked in:\n";
    foreach ($__ef_candidates as $__ef_path) {
        echo "  - {$__ef_path}\n";
    }
    echo "\nThe _backend folder must sit beside admin/ and api/.\n";
    exit;
}

require $__ef_found;
