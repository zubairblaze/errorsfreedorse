<?php
declare(strict_types=1);

/**
 * Public JSON API.
 *
 *   GET  ?resource=posts[&slug=…]
 *   GET  ?resource=case-studies[&slug=…]
 *   GET  ?resource=services
 *   GET  ?resource=apps
 *   GET  ?resource=authors | categories
 *   POST ?resource=contact      { name, email, company, service, budget, message, website }
 *   POST ?resource=subscribe    { email }
 *
 * Read endpoints are public and return published rows only. Write endpoints
 * are rate limited by IP and carry a honeypot; they store the submission and
 * return a neutral acknowledgement either way, so the endpoint cannot be used
 * to enumerate what was accepted.
 */

use ErrorsFree\Database;
use ErrorsFree\PublicApi;
use ErrorsFree\Security;

require __DIR__ . '/../_bootstrap.php';

Security::headers();
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$resource = (string) ($_GET['resource'] ?? '');
$slug = isset($_GET['slug']) ? substr(preg_replace('/[^a-z0-9-]/', '', strtolower((string) $_GET['slug'])) ?? '', 0, 200) : null;
if ($slug === '') {
    $slug = null;
}

function send(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

/** Simple per-IP write throttle backed by the submissions table. */
function tooManyWrites(string $table): bool
{
    $ip = Security::ipBinary();
    if ($ip === null) {
        return false;
    }
    $stmt = Database::pdo()->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE ip = ? AND created_at > (NOW() - INTERVAL 10 MINUTE)"
    );
    $stmt->execute([$ip]);
    return (int) $stmt->fetchColumn() >= 5;
}

if ($method === 'GET') {
    $data = match ($resource) {
        'posts'        => PublicApi::posts($slug),
        'case-studies' => PublicApi::caseStudies($slug),
        'services'     => PublicApi::services(),
        'apps'         => PublicApi::apps(),
        'authors'      => PublicApi::authors(),
        'categories'   => PublicApi::categories(),
        default        => null,
    };

    if ($data === null) {
        send(['error' => 'Unknown resource.'], 404);
    }
    if ($slug !== null && $data === []) {
        send(['error' => 'Not found.'], 404);
    }

    // Read responses are cacheable for a minute: enough to absorb a burst,
    // short enough that a publish appears promptly.
    header('Cache-Control: public, max-age=60');
    send($slug !== null ? ['data' => $data[0]] : ['data' => $data, 'count' => count($data)]);
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input') ?: '';
    $body = [];
    if ($raw !== '' && str_contains((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'json')) {
        $decoded = json_decode($raw, true);
        $body = is_array($decoded) ? $decoded : [];
    } else {
        $body = $_POST;
    }

    $field = static fn(string $k, int $max = 255): string =>
        mb_substr(trim(str_replace("\0", '', (string) ($body[$k] ?? ''))), 0, $max);

    if ($resource === 'contact') {
        // Honeypot: a real visitor never fills this. Accept and discard, so a
        // bot cannot tell it was caught.
        if ($field('website') !== '') {
            send(['ok' => true]);
        }
        if (tooManyWrites('contact_submissions')) {
            send(['ok' => false, 'error' => 'Too many messages from this address. Try again shortly.'], 429);
        }

        $name = $field('name', 160);
        $email = $field('email', 255);
        $message = $field('message', 5000);

        $errors = [];
        if (mb_strlen($name) < 2) {
            $errors['name'] = 'Please tell us your name.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Please enter a valid email address.';
        }
        if (mb_strlen($message) < 12) {
            $errors['message'] = 'A sentence or two about the problem, please.';
        }
        if ($errors !== []) {
            send(['ok' => false, 'errors' => $errors], 422);
        }

        $stmt = Database::pdo()->prepare(
            'INSERT INTO contact_submissions (name, email, company, service, budget, message, ip)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $name, $email, $field('company', 180), $field('service', 120),
            $field('budget', 60), $message, Security::ipBinary(),
        ]);

        send(['ok' => true]);
    }

    if ($resource === 'subscribe') {
        if (tooManyWrites('subscribers')) {
            send(['ok' => false, 'error' => 'Too many attempts. Try again shortly.'], 429);
        }

        $email = $field('email', 255);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            send(['ok' => false, 'errors' => ['email' => 'Please enter a valid email address.']], 422);
        }

        // INSERT IGNORE: an address already on the list gets the same
        // response as a new one, so the endpoint cannot be used to test
        // whether somebody is subscribed.
        $stmt = Database::pdo()->prepare('INSERT IGNORE INTO subscribers (email, ip) VALUES (?, ?)');
        $stmt->execute([$email, Security::ipBinary()]);

        send(['ok' => true]);
    }

    send(['error' => 'Unknown resource.'], 404);
}

header('Allow: GET, POST');
send(['error' => 'Method not allowed.'], 405);
