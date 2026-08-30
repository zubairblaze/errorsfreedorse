<?php
declare(strict_types=1);

namespace ErrorsFree;

use InvalidArgumentException;
use PDO;

/**
 * Generic data access driven by the Entities definitions.
 *
 * Identifiers — table and column names — cannot be parameterised in SQL, so
 * every one used here is taken from the Entities definition, never from
 * request input. The entity key itself is checked against the allowlist on
 * the way in. Values are always bound.
 */
final class Repo
{
    /** @return array<string,mixed> */
    private static function def(string $entity): array
    {
        $def = Entities::get($entity);
        if ($def === null) {
            // Reached only if routing let an unknown key through; refuse
            // loudly rather than interpolating it into SQL.
            throw new InvalidArgumentException('Unknown entity.');
        }
        return $def;
    }

    /** Column names that exist on the entity's own table. */
    private static function columns(string $entity): array
    {
        return array_keys(self::def($entity)['fields']);
    }

    /** @return array<int,array<string,mixed>> */
    public static function list(string $entity, int $limit = 200): array
    {
        $def = self::def($entity);
        $sql = 'SELECT * FROM ' . $def['table'] . ' ORDER BY ' . $def['order'] . ' LIMIT :limit';
        $stmt = Database::pdo()->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** @return array<string,mixed>|null */
    public static function find(string $entity, int $id): ?array
    {
        $def = self::def($entity);
        $stmt = Database::pdo()->prepare('SELECT * FROM ' . $def['table'] . ' WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    }

    public static function count(string $entity): int
    {
        $def = self::def($entity);
        return (int) Database::pdo()->query('SELECT COUNT(*) FROM ' . $def['table'])->fetchColumn();
    }

    /**
     * Inserts or updates. $data must already be validated and sanitised by
     * FormHandler; this method only binds and writes.
     *
     * @param array<string,mixed> $data
     */
    public static function save(string $entity, ?int $id, array $data): int
    {
        $def = self::def($entity);
        $allowed = self::columns($entity);
        $pdo = Database::pdo();

        // Drop anything that is not a declared column. Belt and braces: the
        // form handler already builds this array from the definition.
        $data = array_intersect_key($data, array_flip($allowed));
        if ($data === []) {
            throw new InvalidArgumentException('Nothing to save.');
        }

        if ($id === null) {
            $cols = array_keys($data);
            $sql = 'INSERT INTO ' . $def['table'] . ' (' . implode(', ', $cols) . ') VALUES ('
                 . implode(', ', array_map(static fn($c) => ':' . $c, $cols)) . ')';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($data);
            return (int) $pdo->lastInsertId();
        }

        $sets = implode(', ', array_map(static fn($c) => $c . ' = :' . $c, array_keys($data)));
        $stmt = $pdo->prepare('UPDATE ' . $def['table'] . ' SET ' . $sets . ' WHERE id = :__id');
        $stmt->execute($data + ['__id' => $id]);
        return $id;
    }

    public static function delete(string $entity, int $id): void
    {
        $def = self::def($entity);
        $stmt = Database::pdo()->prepare('DELETE FROM ' . $def['table'] . ' WHERE id = ?');
        $stmt->execute([$id]);
    }

    /** True when the slug is already taken by a different row. */
    public static function slugTaken(string $entity, string $slug, ?int $exceptId): bool
    {
        $def = self::def($entity);
        $sql = 'SELECT COUNT(*) FROM ' . $def['table'] . ' WHERE slug = ?';
        $params = [$slug];
        if ($exceptId !== null) {
            $sql .= ' AND id <> ?';
            $params[] = $exceptId;
        }
        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn() > 0;
    }

    /* ---------------------------------------------------------------
       Child collections
       --------------------------------------------------------------- */

    /**
     * Reads a child collection.
     * @return array<int,array<string,mixed>>
     */
    public static function children(string $entity, string $childKey, int $parentId): array
    {
        $child = self::childDef($entity, $childKey);

        if ($child['kind'] === 'tags') {
            $stmt = Database::pdo()->prepare(
                'SELECT t.name FROM tags t
                 JOIN post_tags pt ON pt.tag_id = t.id
                 WHERE pt.post_id = ? ORDER BY t.name'
            );
            $stmt->execute([$parentId]);
            return $stmt->fetchAll();
        }

        $sql = 'SELECT * FROM ' . $child['table'] . ' WHERE ' . $child['fk'] . ' = ?';
        $params = [$parentId];
        if (isset($child['discriminator'])) {
            foreach ($child['discriminator'] as $col => $val) {
                $sql .= ' AND ' . $col . ' = ?';
                $params[] = $val;
            }
        }
        $sql .= ' ORDER BY sort_order ASC, id ASC';

        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Replaces a child collection wholesale.
     *
     * Delete-then-insert inside a transaction: simpler to reason about than
     * diffing, and the transaction means a half-written collection is never
     * visible.
     *
     * @param array<int,array<string,string>> $rows
     */
    public static function replaceChildren(string $entity, string $childKey, int $parentId, array $rows): void
    {
        $child = self::childDef($entity, $childKey);
        $pdo = Database::pdo();

        if ($child['kind'] === 'tags') {
            self::replaceTags($parentId, $rows);
            return;
        }

        $sql = 'DELETE FROM ' . $child['table'] . ' WHERE ' . $child['fk'] . ' = ?';
        $params = [$parentId];
        if (isset($child['discriminator'])) {
            foreach ($child['discriminator'] as $col => $val) {
                $sql .= ' AND ' . $col . ' = ?';
                $params[] = $val;
            }
        }
        $pdo->prepare($sql)->execute($params);

        if ($rows === []) {
            return;
        }

        $cols = $child['kind'] === 'pairs' ? $child['columns'] : [$child['column']];
        $insertCols = array_merge([$child['fk']], $cols, ['sort_order']);
        $discCols = array_keys($child['discriminator'] ?? []);
        $insertCols = array_merge($insertCols, $discCols);

        $stmt = $pdo->prepare(
            'INSERT INTO ' . $child['table'] . ' (' . implode(', ', $insertCols) . ') VALUES ('
            . implode(', ', array_fill(0, count($insertCols), '?')) . ')'
        );

        $order = 0;
        foreach ($rows as $row) {
            $values = [$parentId];
            $empty = true;
            foreach ($cols as $c) {
                $v = trim((string) ($row[$c] ?? ''));
                if ($v !== '') {
                    $empty = false;
                }
                $values[] = $v;
            }
            if ($empty) {
                continue;   // skip blank rows left by the repeater UI
            }
            $values[] = $order++;
            foreach ($discCols as $c) {
                $values[] = $child['discriminator'][$c];
            }
            $stmt->execute($values);
        }
    }

    /** @param array<int,array<string,string>> $rows */
    private static function replaceTags(int $postId, array $rows): void
    {
        $pdo = Database::pdo();
        $pdo->prepare('DELETE FROM post_tags WHERE post_id = ?')->execute([$postId]);

        $find = $pdo->prepare('SELECT id FROM tags WHERE slug = ? LIMIT 1');
        $make = $pdo->prepare('INSERT INTO tags (name, slug) VALUES (?, ?)');
        $link = $pdo->prepare('INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');

        foreach ($rows as $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $slug = Slug::make($name);
            $find->execute([$slug]);
            $tagId = $find->fetchColumn();
            if ($tagId === false) {
                $make->execute([mb_substr($name, 0, 80), $slug]);
                $tagId = $pdo->lastInsertId();
            }
            $link->execute([$postId, (int) $tagId]);
        }
    }

    /** @return array<string,mixed> */
    private static function childDef(string $entity, string $childKey): array
    {
        $def = self::def($entity);
        $child = $def['children'][$childKey] ?? null;
        if (!is_array($child)) {
            throw new InvalidArgumentException('Unknown child collection.');
        }
        return $child;
    }

    /** Options for a select backed by a lookup table. */
    public static function options(string $table): array
    {
        // Allowlist: these are the only lookup tables a select may read.
        if (!in_array($table, ['categories', 'authors'], true)) {
            throw new InvalidArgumentException('Unknown option source.');
        }
        $column = $table === 'authors' ? 'name' : 'name';
        $rows = Database::pdo()->query('SELECT id, ' . $column . ' AS label FROM ' . $table . ' ORDER BY label')->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            $out[(string) $row['id']] = (string) $row['label'];
        }
        return $out;
    }
}
