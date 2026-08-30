<?php
declare(strict_types=1);

/**
 * Imports seed/content.json into the database.
 *
 *   node scripts/export-content.mjs     # regenerate the JSON first
 *   php backend/bin/seed.php            # then import
 *
 * Idempotent: rows are matched on slug and updated in place, so running it
 * twice does not duplicate anything. It never deletes, so content added
 * through the admin panel survives a re-seed.
 */

use ErrorsFree\Database;
use ErrorsFree\Security;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script runs from the command line only.\n");
}

require dirname(__DIR__) . '/src/bootstrap.php';

$file = dirname(__DIR__) . '/seed/content.json';
if (!is_readable($file)) {
    fwrite(STDERR, "Missing {$file}. Run: node scripts/export-content.mjs\n");
    exit(1);
}

$data = json_decode((string) file_get_contents($file), true, 64, JSON_THROW_ON_ERROR);
$pdo = Database::pdo();
$pdo->beginTransaction();

try {
    /* ---- Authors -------------------------------------------------- */
    $authorIds = [];
    $find = $pdo->prepare('SELECT id FROM authors WHERE name = ? LIMIT 1');
    $ins  = $pdo->prepare('INSERT INTO authors (name, role, bio) VALUES (?, ?, ?)');
    $upd  = $pdo->prepare('UPDATE authors SET role = ?, bio = ? WHERE id = ?');
    foreach ($data['authors'] as $a) {
        $find->execute([$a['name']]);
        $id = $find->fetchColumn();
        if ($id === false) {
            $ins->execute([$a['name'], $a['role'] ?? '', $a['bio'] ?? '']);
            $id = $pdo->lastInsertId();
        } else {
            $upd->execute([$a['role'] ?? '', $a['bio'] ?? '', (int) $id]);
        }
        $authorIds[(int) $a['id']] = (int) $id;
    }

    /* ---- Categories ------------------------------------------------ */
    $categoryIds = [];
    $find = $pdo->prepare('SELECT id FROM categories WHERE slug = ? LIMIT 1');
    $ins  = $pdo->prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
    foreach ($data['categories'] as $c) {
        $find->execute([$c['slug']]);
        $id = $find->fetchColumn();
        if ($id === false) {
            $ins->execute([$c['name'], $c['slug']]);
            $id = $pdo->lastInsertId();
        }
        $categoryIds[$c['name']] = (int) $id;
    }

    /* ---- Posts ----------------------------------------------------- */
    $posts = 0;
    foreach ($data['posts'] as $p) {
        $row = [
            'title'              => $p['title'],
            'slug'               => $p['slug'],
            'excerpt'            => $p['excerpt'],
            // Seed content is authored by us, but it still goes through the
            // same sanitiser as editor input. No content path skips it.
            'body'               => Security::sanitizeHtml($p['body']),
            'featured_image'     => $p['featured_image'],
            'featured_image_alt' => $p['featured_image_alt'] ?? '',
            'author_id'          => $authorIds[$p['author_id']] ?? null,
            'category_id'        => $categoryIds[$p['category']] ?? null,
            'status'             => $p['status'],
            'published_at'       => $p['published_at'],
            'read_minutes'       => $p['read_minutes'],
        ];
        $id = upsert($pdo, 'posts', $row);

        $pdo->prepare('DELETE FROM post_tags WHERE post_id = ?')->execute([$id]);
        $findTag = $pdo->prepare('SELECT id FROM tags WHERE slug = ? LIMIT 1');
        $makeTag = $pdo->prepare('INSERT INTO tags (name, slug) VALUES (?, ?)');
        $linkTag = $pdo->prepare('INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');
        foreach ($p['tags'] ?? [] as $tag) {
            $slug = \ErrorsFree\Slug::make($tag);
            $findTag->execute([$slug]);
            $tagId = $findTag->fetchColumn();
            if ($tagId === false) {
                $makeTag->execute([$tag, $slug]);
                $tagId = $pdo->lastInsertId();
            }
            $linkTag->execute([$id, (int) $tagId]);
        }
        $posts++;
    }

    /* ---- Case studies ---------------------------------------------- */
    $cases = 0;
    foreach ($data['case_studies'] as $c) {
        $id = upsert($pdo, 'case_studies', [
            'title'              => $c['title'],
            'slug'               => $c['slug'],
            'client'             => $c['client'],
            'sector'             => $c['sector'],
            'excerpt'            => $c['excerpt'],
            'body'               => Security::sanitizeHtml($c['body']),
            'featured_image'     => $c['featured_image'],
            'featured_image_alt' => $c['featured_image_alt'] ?? '',
            'challenge'          => $c['challenge'],
            'approach'           => $c['approach'],
            'outcome'            => $c['outcome'],
            'duration'           => $c['duration'],
            'status'             => $c['status'],
            'published_at'       => $c['published_at'],
            'read_minutes'       => $c['read_minutes'],
        ]);

        replaceRows($pdo, 'case_study_results', 'case_study_id', $id, [], array_map(
            static fn($r, $i) => ['label' => $r['label'], 'value' => $r['value'], 'sort_order' => $i],
            $c['results'], array_keys($c['results'])
        ));
        replaceRows($pdo, 'case_study_services', 'case_study_id', $id, [], array_map(
            static fn($s, $i) => ['service_name' => $s, 'sort_order' => $i],
            $c['services'], array_keys($c['services'])
        ));
        $cases++;
    }

    /* ---- Services --------------------------------------------------- */
    $svcs = 0;
    foreach ($data['services'] as $s) {
        $id = upsert($pdo, 'services', [
            'title'      => $s['title'],
            'slug'       => $s['slug'],
            'short'      => $s['short'],
            'excerpt'    => $s['excerpt'],
            'intro'      => $s['intro'],
            'icon'       => $s['icon'],
            'sort_order' => $s['sort_order'],
            'status'     => $s['status'],
        ]);

        foreach (['deliverable' => 'deliverables', 'feature' => 'features',
                  'process' => 'process', 'engagement' => 'engagement', 'stack' => 'stack'] as $kind => $key) {
            $rows = [];
            foreach ($s[$key] as $i => $item) {
                $rows[] = is_array($item)
                    ? ['kind' => $kind, 'label' => $item['label'], 'body' => $item['body'], 'sort_order' => $i]
                    : ['kind' => $kind, 'label' => $item, 'body' => null, 'sort_order' => $i];
            }
            replaceRows($pdo, 'service_items', 'service_id', $id, ['kind' => $kind], $rows);
        }
        $svcs++;
    }

    /* ---- Apps -------------------------------------------------------- */
    $apps = 0;
    foreach ($data['apps'] as $a) {
        $id = upsert($pdo, 'apps', [
            'title'       => $a['title'],
            'slug'        => $a['slug'],
            'client'      => $a['client'],
            'sector'      => $a['sector'],
            'summary'     => $a['summary'],
            'year'        => $a['year'],
            'product_url' => $a['product_url'],
            'featured'    => $a['featured'],
            'sort_order'  => $a['sort_order'],
            'status'      => $a['status'],
        ]);

        replaceRows($pdo, 'app_items', 'app_id', $id, ['kind' => 'result'], array_map(
            static fn($r, $i) => ['kind' => 'result', 'label' => $r['label'], 'value' => $r['value'], 'sort_order' => $i],
            $a['results'], array_keys($a['results'])
        ));
        replaceRows($pdo, 'app_items', 'app_id', $id, ['kind' => 'service'], array_map(
            static fn($s, $i) => ['kind' => 'service', 'label' => $s, 'value' => '', 'sort_order' => $i],
            $a['services'], array_keys($a['services'])
        ));
        $apps++;
    }

    $pdo->commit();
    fwrite(STDOUT, "Seeded: {$posts} posts, {$cases} case studies, {$svcs} services, {$apps} apps.\n");
} catch (\Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, 'Seed failed, nothing written: ' . $e->getMessage() . "\n");
    exit(1);
}

/** Inserts or updates on slug. Table names come from this file only. */
function upsert(PDO $pdo, string $table, array $row): int
{
    $stmt = $pdo->prepare("SELECT id FROM {$table} WHERE slug = ? LIMIT 1");
    $stmt->execute([$row['slug']]);
    $id = $stmt->fetchColumn();

    if ($id === false) {
        $cols = array_keys($row);
        $sql = "INSERT INTO {$table} (" . implode(', ', $cols) . ') VALUES ('
             . implode(', ', array_map(static fn($c) => ':' . $c, $cols)) . ')';
        $pdo->prepare($sql)->execute($row);
        return (int) $pdo->lastInsertId();
    }

    $sets = implode(', ', array_map(static fn($c) => "{$c} = :{$c}", array_keys($row)));
    $pdo->prepare("UPDATE {$table} SET {$sets} WHERE id = :__id")->execute($row + ['__id' => (int) $id]);
    return (int) $id;
}

/** Clears a child collection (optionally scoped) and rewrites it. */
function replaceRows(PDO $pdo, string $table, string $fk, int $parentId, array $scope, array $rows): void
{
    $sql = "DELETE FROM {$table} WHERE {$fk} = ?";
    $params = [$parentId];
    foreach ($scope as $col => $val) {
        $sql .= " AND {$col} = ?";
        $params[] = $val;
    }
    $pdo->prepare($sql)->execute($params);

    foreach ($rows as $row) {
        $row[$fk] = $parentId;
        $cols = array_keys($row);
        $sql = "INSERT INTO {$table} (" . implode(', ', $cols) . ') VALUES ('
             . implode(', ', array_map(static fn($c) => ':' . $c, $cols)) . ')';
        $pdo->prepare($sql)->execute($row);
    }
}
