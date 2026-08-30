<?php
declare(strict_types=1);

namespace ErrorsFree;

use PDO;

/**
 * Read models for the public site.
 *
 * Each method returns exactly the shape the Astro data modules already
 * consume, so switching the front end from mock data to live data is a
 * change of transport, not of structure.
 *
 * Only published rows are ever returned. Drafts are invisible here even to a
 * caller who guesses a slug.
 */
final class PublicApi
{
    /** @return array<int,array<string,mixed>> */
    public static function posts(?string $slug = null): array
    {
        $sql = 'SELECT p.id, p.title, p.slug, p.excerpt, p.body, p.featured_image,
                       p.featured_image_alt, p.author_id, p.status, p.published_at,
                       p.created_at, p.updated_at, p.read_minutes,
                       COALESCE(c.name, "") AS category
                FROM posts p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.status = "published"';
        $params = [];
        if ($slug !== null) {
            $sql .= ' AND p.slug = ?';
            $params[] = $slug;
        }
        $sql .= ' ORDER BY p.published_at DESC, p.id DESC';

        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        if ($rows === []) {
            return [];
        }

        // One query for every tag rather than one per post.
        $ids = array_column($rows, 'id');
        $in = implode(',', array_fill(0, count($ids), '?'));
        $stmt = Database::pdo()->prepare(
            "SELECT pt.post_id, t.slug FROM post_tags pt
             JOIN tags t ON t.id = pt.tag_id
             WHERE pt.post_id IN ({$in}) ORDER BY t.name"
        );
        $stmt->execute($ids);

        $tags = [];
        foreach ($stmt->fetchAll() as $t) {
            $tags[(int) $t['post_id']][] = (string) $t['slug'];
        }

        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['author_id'] = (int) $row['author_id'];
            $row['read_minutes'] = (int) $row['read_minutes'];
            $row['tags'] = $tags[$row['id']] ?? [];
        }

        return $rows;
    }

    /** @return array<int,array<string,mixed>> */
    public static function caseStudies(?string $slug = null): array
    {
        $sql = 'SELECT * FROM case_studies WHERE status = "published"';
        $params = [];
        if ($slug !== null) {
            $sql .= ' AND slug = ?';
            $params[] = $slug;
        }
        $sql .= ' ORDER BY published_at DESC, id DESC';

        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        if ($rows === []) {
            return [];
        }

        $ids = array_column($rows, 'id');
        $in = implode(',', array_fill(0, count($ids), '?'));

        $stmt = Database::pdo()->prepare(
            "SELECT case_study_id, label, value FROM case_study_results
             WHERE case_study_id IN ({$in}) ORDER BY sort_order"
        );
        $stmt->execute($ids);
        $results = [];
        foreach ($stmt->fetchAll() as $r) {
            $results[(int) $r['case_study_id']][] = ['label' => $r['label'], 'value' => $r['value']];
        }

        $stmt = Database::pdo()->prepare(
            "SELECT case_study_id, service_name FROM case_study_services
             WHERE case_study_id IN ({$in}) ORDER BY sort_order"
        );
        $stmt->execute($ids);
        $services = [];
        foreach ($stmt->fetchAll() as $s) {
            $services[(int) $s['case_study_id']][] = (string) $s['service_name'];
        }

        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['read_minutes'] = (int) $row['read_minutes'];
            $row['results'] = $results[$row['id']] ?? [];
            $row['services'] = $services[$row['id']] ?? [];
        }

        return $rows;
    }

    /** @return array<int,array<string,mixed>> */
    public static function services(): array
    {
        $rows = Database::pdo()
            ->query('SELECT * FROM services WHERE status = "published" ORDER BY sort_order, id')
            ->fetchAll();
        if ($rows === []) {
            return [];
        }

        $ids = array_column($rows, 'id');
        $in = implode(',', array_fill(0, count($ids), '?'));
        $stmt = Database::pdo()->prepare(
            "SELECT service_id, kind, label, body FROM service_items
             WHERE service_id IN ({$in}) ORDER BY sort_order, id"
        );
        $stmt->execute($ids);

        $items = [];
        foreach ($stmt->fetchAll() as $i) {
            $items[(int) $i['service_id']][(string) $i['kind']][] = $i;
        }

        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['order'] = (int) $row['sort_order'];
            $bag = $items[$row['id']] ?? [];
            $row['deliverables'] = array_column($bag['deliverable'] ?? [], 'label');
            $row['stack'] = array_column($bag['stack'] ?? [], 'label');
            $row['features'] = array_map(
                static fn($f) => ['title' => $f['label'], 'body' => $f['body'] ?? ''],
                $bag['feature'] ?? []
            );
            $row['process'] = array_map(
                static fn($p) => ['step' => $p['label'], 'body' => $p['body'] ?? ''],
                $bag['process'] ?? []
            );
            $row['engagement'] = array_map(
                static fn($x) => ['label' => $x['label'], 'value' => $x['body'] ?? ''],
                $bag['engagement'] ?? []
            );
        }

        return $rows;
    }

    /** @return array<int,array<string,mixed>> */
    public static function apps(): array
    {
        $rows = Database::pdo()
            ->query('SELECT * FROM apps WHERE status = "published" ORDER BY sort_order, id')
            ->fetchAll();
        if ($rows === []) {
            return [];
        }

        $ids = array_column($rows, 'id');
        $in = implode(',', array_fill(0, count($ids), '?'));
        $stmt = Database::pdo()->prepare(
            "SELECT app_id, kind, label, value FROM app_items
             WHERE app_id IN ({$in}) ORDER BY sort_order, id"
        );
        $stmt->execute($ids);

        $items = [];
        foreach ($stmt->fetchAll() as $i) {
            $items[(int) $i['app_id']][(string) $i['kind']][] = $i;
        }

        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['featured'] = (bool) $row['featured'];
            $bag = $items[$row['id']] ?? [];
            $row['results'] = array_map(
                static fn($r) => ['label' => $r['label'], 'value' => $r['value']],
                $bag['result'] ?? []
            );
            $row['services'] = array_column($bag['service'] ?? [], 'label');
        }

        return $rows;
    }

    public static function authors(): array
    {
        return Database::pdo()->query('SELECT id, name, role, avatar, bio FROM authors ORDER BY id')->fetchAll();
    }

    public static function categories(): array
    {
        return Database::pdo()->query(
            'SELECT c.name, c.slug, COUNT(p.id) AS count
             FROM categories c
             LEFT JOIN posts p ON p.category_id = c.id AND p.status = "published"
             GROUP BY c.id, c.name, c.slug
             HAVING count > 0
             ORDER BY c.name'
        )->fetchAll();
    }
}
