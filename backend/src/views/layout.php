<?php
/** @var string $title @var string $body @var ?array $flash @var string $current */
use ErrorsFree\Entities;
use ErrorsFree\Auth;
use function ErrorsFree\url_for;
$nav = Entities::all();
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= $e($title) ?> · ErrorsFree admin</title>
<link rel="stylesheet" href="<?= $e(url_for('admin/assets/admin.css')) ?>">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="shell">
  <aside class="side">
    <div class="brand">
      <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="brand__text">ErrorsFree<br><small>admin</small></span>
    </div>
    <nav aria-label="Content">
      <a href="<?= $e(url_for('admin/')) ?>" class="<?= $current === 'dashboard' ? 'is-on' : '' ?>">Dashboard</a>
      <?php foreach ($nav as $key => $def): ?>
        <a href="<?= $e(url_for('admin/?r=list&e=' . $key)) ?>" class="<?= $current === $key ? 'is-on' : '' ?>"><?= $e($def['label']) ?></a>
      <?php endforeach; ?>
      <a href="<?= $e(url_for('admin/?r=inbox')) ?>" class="<?= $current === 'inbox' ? 'is-on' : '' ?>">Enquiries</a>
      <a href="<?= $e(url_for('admin/?r=subscribers')) ?>" class="<?= $current === 'subscribers' ? 'is-on' : '' ?>">Subscribers</a>
    </nav>
    <div class="side__foot">
      <a href="<?= $e(url_for('admin/?r=account')) ?>" class="<?= $current === 'account' ? 'is-on' : '' ?>">Account &amp; password</a>
      <form method="post" action="<?= $e(url_for('admin/?r=logout')) ?>">
        <?= \ErrorsFree\Csrf::field() ?>
        <button type="submit" class="linkish">Sign out (<?= $e(Auth::name()) ?>)</button>
      </form>
    </div>
  </aside>

  <main id="main" class="main">
    <?php if (is_array($flash)): ?>
      <p class="flash flash--<?= $e($flash['type']) ?>" role="status"><?= $e($flash['message']) ?></p>
    <?php endif; ?>
    <?= $body /* built from escaped parts by the view */ ?>
  </main>
</div>
<script src="<?= $e(url_for('admin/assets/admin.js')) ?>" defer></script>
</body>
</html>
