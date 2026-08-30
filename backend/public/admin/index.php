<?php
declare(strict_types=1);

/**
 * Admin front controller.
 *
 * Every request lands here. The order below is deliberate and load-bearing:
 * headers, then session, then authentication, then CSRF on any state change,
 * and only then does a handler see request data.
 */

use ErrorsFree\Auth;
use ErrorsFree\Csrf;
use ErrorsFree\Database;
use ErrorsFree\Entities;
use ErrorsFree\FormHandler;
use ErrorsFree\Repo;
use ErrorsFree\Security;
use ErrorsFree\Uploads;
use ErrorsFree\View;
use function ErrorsFree\url_for;

require dirname(__DIR__, 2) . '/src/bootstrap.php';

Security::headers(admin: true);
Auth::startSession();

$route = (string) ($_GET['r'] ?? 'dashboard');
$isPost = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';

/** Entity key, validated against the allowlist before it can reach any SQL. */
function entity_param(): string
{
    $key = (string) ($_GET['e'] ?? '');
    if (!in_array($key, Entities::keys(), true)) {
        http_response_code(404);
        exit('Unknown content type.');
    }
    return $key;
}

function id_param(): ?int
{
    $raw = $_GET['id'] ?? null;
    if ($raw === null || $raw === '') {
        return null;
    }
    $id = filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    return $id === false ? null : $id;
}

function redirect(string $path, ?string $message = null, string $type = 'ok'): never
{
    if ($message !== null) {
        $_SESSION['flash'] = ['type' => $type, 'message' => $message];
    }
    header('Location: ' . url_for($path));
    exit;
}

function take_flash(): ?array
{
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return is_array($flash) ? $flash : null;
}

/* ---------------------------------------------------------------------
   Unauthenticated routes
   ------------------------------------------------------------------- */

if ($route === 'login') {
    if (Auth::check()) {
        redirect('admin/');
    }

    $error = null;
    $username = '';

    if ($isPost) {
        Csrf::requireValid();
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');

        if ($username === '' || $password === '') {
            $error = 'Enter your username and password.';
        } else {
            $error = Auth::login($username, $password);
            if ($error === null) {
                redirect('admin/', 'Signed in.');
            }
        }
    }

    echo View::render('login', ['error' => $error, 'username' => $username]);
    exit;
}

if ($route === 'logout') {
    if ($isPost) {
        Csrf::requireValid();
    }
    Auth::logout();
    header('Location: ' . url_for('admin/?r=login'));
    exit;
}

/* ---------------------------------------------------------------------
   Everything below requires a session
   ------------------------------------------------------------------- */

Auth::requireLogin(url_for('admin/?r=login'));

// A state-changing request must carry a valid token, checked before any
// handler reads input.
if ($isPost) {
    Csrf::requireValid();
}

$flash = take_flash();

switch ($route) {
    /* ---------------- Dashboard ---------------- */
    case 'dashboard': {
        $pdo = Database::pdo();
        $counts = [];
        $recent = [];

        foreach (Entities::all() as $key => $def) {
            $total = Repo::count($key);
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . $def['table'] . ' WHERE status = ?');
            $stmt->execute(['draft']);
            $counts[$key] = ['label' => $def['label'], 'count' => $total, 'drafts' => (int) $stmt->fetchColumn()];

            $stmt = $pdo->query(
                'SELECT id, title, status, updated_at FROM ' . $def['table'] . ' ORDER BY updated_at DESC LIMIT 5'
            );
            foreach ($stmt->fetchAll() as $row) {
                $recent[] = $row + ['entity' => $key, 'label' => $def['label']];
            }
        }

        usort($recent, static fn($a, $b) => strcmp((string) $b['updated_at'], (string) $a['updated_at']));

        View::page('dashboard', [
            'counts'      => $counts,
            'recent'      => array_slice($recent, 0, 8),
            'enquiries'   => (int) $pdo->query('SELECT COUNT(*) FROM contact_submissions')->fetchColumn(),
            'subscribers' => (int) $pdo->query('SELECT COUNT(*) FROM subscribers')->fetchColumn(),
            'flash'       => $flash,
            'current'     => 'dashboard',
        ], 'Dashboard');
        break;
    }

    /* ---------------- List ---------------- */
    case 'list': {
        $entity = entity_param();
        $def = Entities::get($entity);
        View::page('list', [
            'entity'  => $entity,
            'def'     => $def,
            'rows'    => Repo::list($entity),
            'flash'   => $flash,
            'current' => $entity,
        ], $def['label']);
        break;
    }

    /* ---------------- Edit form ---------------- */
    case 'edit': {
        $entity = entity_param();
        $def = Entities::get($entity);
        $id = id_param();

        $values = [];
        $children = [];

        if ($id !== null) {
            $row = Repo::find($entity, $id);
            if ($row === null) {
                redirect('admin/?r=list&e=' . $entity, 'That item no longer exists.', 'error');
            }
            $values = $row;
            foreach (($def['children'] ?? []) as $childKey => $_) {
                $children[$childKey] = Repo::children($entity, $childKey, $id);
            }
        } else {
            foreach ($def['fields'] as $name => $field) {
                $values[$name] = $field['default'] ?? '';
            }
        }

        $optionSets = [];
        foreach ($def['fields'] as $name => $field) {
            if (isset($field['options_from'])) {
                $optionSets[$name] = Repo::options($field['options_from']);
            }
        }

        View::page('edit', [
            'entity'     => $entity,
            'def'        => $def,
            'id'         => $id,
            'values'     => $values,
            'errors'     => [],
            'children'   => $children,
            'optionSets' => $optionSets,
            'flash'      => $flash,
            'current'    => $entity,
        ], ($id === null ? 'New ' : 'Edit ') . $def['singular']);
        break;
    }

    /* ---------------- Save ---------------- */
    case 'save': {
        if (!$isPost) {
            redirect('admin/');
        }

        $entity = entity_param();
        $def = Entities::get($entity);
        $id = id_param();

        $existing = $id !== null ? Repo::find($entity, $id) : null;
        if ($id !== null && $existing === null) {
            redirect('admin/?r=list&e=' . $entity, 'That item no longer exists.', 'error');
        }

        $input = $_POST;

        // Resolve image fields before validation so the handler sees the
        // final stored path rather than whatever the form posted.
        $uploadError = null;
        foreach ($def['fields'] as $name => $field) {
            if ($field['type'] !== 'image') {
                continue;
            }
            $current = (string) ($existing[$name] ?? '');

            if (!empty($_POST['remove_' . $name])) {
                Uploads::remove($current);
                $input[$name] = '';
                continue;
            }

            $result = Uploads::handle('upload_' . $name);
            if ($result === null) {
                $input[$name] = $current;         // unchanged
            } elseif (isset($result['error'])) {
                $uploadError = $result['error'];
                $input[$name] = $current;
            } else {
                Uploads::remove($current);        // replace
                $input[$name] = $result['path'];
            }
        }

        $form = new FormHandler($entity, $id);
        $ok = $form->handle($input);

        if ($uploadError !== null) {
            $form->errors['_'] = $uploadError;
            $ok = false;
        }

        if (!$ok) {
            $optionSets = [];
            foreach ($def['fields'] as $name => $field) {
                if (isset($field['options_from'])) {
                    $optionSets[$name] = Repo::options($field['options_from']);
                }
            }
            $children = [];
            foreach (($def['children'] ?? []) as $childKey => $_) {
                $children[$childKey] = FormHandler::childRows($input, $childKey);
            }

            // Re-render with what the editor typed. Image fields come from
            // $input rather than $form->values, so an upload that succeeded
            // alongside a validation error elsewhere is not lost.
            $redisplay = $form->values;
            foreach ($def['fields'] as $fname => $fdef) {
                if ($fdef['type'] === 'image') {
                    $redisplay[$fname] = (string) ($input[$fname] ?? '');
                }
            }

            View::page('edit', [
                'entity'     => $entity,
                'def'        => $def,
                'id'         => $id,
                'values'     => $redisplay,
                'errors'     => $form->errors,
                'children'   => $children,
                'optionSets' => $optionSets,
                'flash'      => null,
                'current'    => $entity,
            ], 'Edit ' . $def['singular']);
            break;
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $savedId = Repo::save($entity, $id, $form->data);
            foreach (($def['children'] ?? []) as $childKey => $_) {
                Repo::replaceChildren($entity, $childKey, $savedId, FormHandler::childRows($input, $childKey));
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        redirect('admin/?r=edit&e=' . $entity . '&id=' . $savedId, 'Saved.');
        break;
    }

    /* ---------------- Delete ---------------- */
    case 'delete': {
        if (!$isPost) {
            redirect('admin/');
        }
        $entity = entity_param();
        $id = id_param();
        if ($id === null) {
            redirect('admin/?r=list&e=' . $entity, 'Nothing to delete.', 'error');
        }

        $row = Repo::find($entity, $id);
        if ($row !== null) {
            foreach (Entities::get($entity)['fields'] as $name => $field) {
                if ($field['type'] === 'image') {
                    Uploads::remove($row[$name] ?? null);
                }
            }
            Repo::delete($entity, $id);
        }

        redirect('admin/?r=list&e=' . $entity, 'Deleted.');
        break;
    }

    /* ---------------- Account ---------------- */
    case 'account': {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT username, last_login_at FROM admins WHERE id = ?');
        $stmt->execute([Auth::id()]);
        $info = $stmt->fetch() ?: ['username' => Auth::name(), 'last_login_at' => null];

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM login_attempts
             WHERE success = 0 AND username = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)'
        );
        $stmt->execute([$info['username']]);
        $info['recent_failures'] = (int) $stmt->fetchColumn();

        View::page('account', [
            'error'   => $_SESSION['pw_error'] ?? null,
            'info'    => $info,
            'flash'   => $flash,
            'current' => 'account',
        ], 'Account');
        unset($_SESSION['pw_error']);
        break;
    }

    case 'password': {
        if (!$isPost) {
            redirect('admin/?r=account');
        }
        $error = Auth::changePassword(
            (string) ($_POST['current'] ?? ''),
            (string) ($_POST['new'] ?? ''),
            (string) ($_POST['confirm'] ?? ''),
        );
        if ($error !== null) {
            $_SESSION['pw_error'] = $error;
            redirect('admin/?r=account');
        }
        redirect('admin/?r=account', 'Password changed. Other devices have been signed out.');
        break;
    }

    /* ---------------- Inbound ---------------- */
    case 'inbox': {
        $rows = Database::pdo()
            ->query('SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 200')
            ->fetchAll();
        View::page('inbox', ['rows' => $rows, 'kind' => 'inbox', 'flash' => $flash, 'current' => 'inbox'], 'Enquiries');
        break;
    }

    case 'subscribers': {
        $rows = Database::pdo()
            ->query('SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 500')
            ->fetchAll();
        View::page('inbox', ['rows' => $rows, 'kind' => 'subscribers', 'flash' => $flash, 'current' => 'subscribers'], 'Subscribers');
        break;
    }

    default:
        http_response_code(404);
        echo 'Not found.';
}
