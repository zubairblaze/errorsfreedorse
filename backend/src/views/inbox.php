<?php
/** @var array $rows @var string $kind */
?>
<h1><?= $kind === 'subscribers' ? 'Newsletter subscribers' : 'Enquiries' ?></h1>
<?php if ($rows === []): ?>
  <p class="muted">Nothing yet.</p>
<?php elseif ($kind === 'subscribers'): ?>
  <table class="table">
    <thead><tr><th scope="col">Email</th><th scope="col">Subscribed</th></tr></thead>
    <tbody>
    <?php foreach ($rows as $row): ?>
      <tr><td><?= $e((string) $row['email']) ?></td><td class="mono"><?= $e((string) $row['created_at']) ?></td></tr>
    <?php endforeach; ?>
    </tbody>
  </table>
<?php else: ?>
  <div class="cards">
  <?php foreach ($rows as $row): ?>
    <article class="enq">
      <header>
        <strong><?= $e((string) $row['name']) ?></strong>
        <a href="mailto:<?= $e((string) $row['email']) ?>"><?= $e((string) $row['email']) ?></a>
        <span class="mono"><?= $e((string) $row['created_at']) ?></span>
      </header>
      <p class="enq__meta mono">
        <?= $e((string) $row['company']) ?><?= $row['company'] !== '' ? ' · ' : '' ?>
        <?= $e((string) $row['service']) ?><?= $row['service'] !== '' ? ' · ' : '' ?>
        <?= $e((string) $row['budget']) ?>
      </p>
      <p class="enq__body"><?= nl2br($e((string) $row['message'])) ?></p>
    </article>
  <?php endforeach; ?>
  </div>
<?php endif; ?>
