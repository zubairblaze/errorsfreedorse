<?php
/** @var string $entity @var array $def @var array $rows */
use function ErrorsFree\url_for;
?>
<div class="head">
  <h1><?= $e($def['label']) ?></h1>
  <a class="btn" href="<?= $e(url_for('admin/?r=edit&e=' . $entity)) ?>">New <?= $e($def['singular']) ?></a>
</div>

<?php if ($rows === []): ?>
  <p class="muted">No <?= $e(strtolower($def['label'])) ?> yet.</p>
<?php else: ?>
<table class="table">
  <thead>
    <tr>
      <?php foreach ($def['list_columns'] as $col): ?>
        <th scope="col"><?= $e(ucfirst(str_replace('_', ' ', $col))) ?></th>
      <?php endforeach; ?>
      <th scope="col"><span class="sr">Actions</span></th>
    </tr>
  </thead>
  <tbody>
  <?php foreach ($rows as $row): ?>
    <tr>
      <?php foreach ($def['list_columns'] as $i => $col): ?>
        <td>
          <?php if ($i === 0): ?>
            <a href="<?= $e(url_for('admin/?r=edit&e=' . $entity . '&id=' . $row['id'])) ?>"><?= $e((string) $row[$col]) ?></a>
          <?php elseif ($col === 'status'): ?>
            <span class="pill pill--<?= $e((string) $row[$col]) ?>"><?= $e((string) $row[$col]) ?></span>
          <?php elseif ($col === 'featured'): ?>
            <?= ((int) $row[$col]) === 1 ? 'Yes' : '—' ?>
          <?php else: ?>
            <?= $e((string) ($row[$col] ?? '')) ?>
          <?php endif; ?>
        </td>
      <?php endforeach; ?>
      <td class="row-actions">
        <a href="<?= $e(url_for('admin/?r=edit&e=' . $entity . '&id=' . $row['id'])) ?>">Edit</a>
        <form method="post" action="<?= $e(url_for('admin/?r=delete&e=' . $entity . '&id=' . $row['id'])) ?>"
              data-confirm="Delete &ldquo;<?= $e((string) $row[$def['list_columns'][0]]) ?>&rdquo;? This cannot be undone.">
          <?= \ErrorsFree\Csrf::field() ?>
          <button type="submit" class="linkish linkish--danger">Delete</button>
        </form>
      </td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table>
<?php endif; ?>
