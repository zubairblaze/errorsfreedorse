<?php
/** @var array $counts @var array $recent @var int $enquiries @var int $subscribers */
use function ErrorsFree\url_for;
?>
<h1>Dashboard</h1>
<p class="lede">Everything the public site reads comes from here.</p>

<div class="tiles">
  <?php foreach ($counts as $key => $row): ?>
    <a class="tile" href="<?= $e(url_for('admin/?r=list&e=' . $key)) ?>">
      <span class="tile__n"><?= $e((string) $row['count']) ?></span>
      <span class="tile__label"><?= $e($row['label']) ?></span>
      <?php if ($row['drafts'] > 0): ?>
        <span class="tile__sub"><?= $e((string) $row['drafts']) ?> draft<?= $row['drafts'] === 1 ? '' : 's' ?></span>
      <?php endif; ?>
    </a>
  <?php endforeach; ?>
  <a class="tile" href="<?= $e(url_for('admin/?r=inbox')) ?>">
    <span class="tile__n"><?= $e((string) $enquiries) ?></span>
    <span class="tile__label">Enquiries</span>
  </a>
  <a class="tile" href="<?= $e(url_for('admin/?r=subscribers')) ?>">
    <span class="tile__n"><?= $e((string) $subscribers) ?></span>
    <span class="tile__label">Subscribers</span>
  </a>
</div>

<h2>Recently updated</h2>
<?php if ($recent === []): ?>
  <p class="muted">Nothing yet.</p>
<?php else: ?>
  <table class="table">
    <thead><tr><th scope="col">Title</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Updated</th></tr></thead>
    <tbody>
    <?php foreach ($recent as $row): ?>
      <tr>
        <td><a href="<?= $e(url_for('admin/?r=edit&e=' . $row['entity'] . '&id=' . $row['id'])) ?>"><?= $e($row['title']) ?></a></td>
        <td><?= $e($row['label']) ?></td>
        <td><span class="pill pill--<?= $e($row['status']) ?>"><?= $e($row['status']) ?></span></td>
        <td class="mono"><?= $e($row['updated_at']) ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php endif; ?>
