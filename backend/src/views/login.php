<?php
/** @var ?string $error @var string $username */
use function ErrorsFree\url_for;
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sign in · ErrorsFree admin</title>
<link rel="stylesheet" href="<?= $e(url_for('admin/assets/admin.css')) ?>">
</head>
<body class="login-body">
<main class="login">
  <div class="brand brand--big">
    <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="brand__text">ErrorsFree<br><small>admin</small></span>
  </div>

  <form method="post" action="<?= $e(url_for('admin/?r=login')) ?>" class="login__form" autocomplete="on">
    <?= \ErrorsFree\Csrf::field() ?>
    <?php if ($error !== null): ?>
      <p class="flash flash--error" role="alert"><?= $e($error) ?></p>
    <?php endif; ?>

    <label for="username">Username</label>
    <input id="username" name="username" type="text" autocomplete="username" required
           maxlength="64" value="<?= $e($username) ?>" autofocus>

    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required maxlength="200">

    <button type="submit" class="btn">Sign in</button>
  </form>

  <p class="login__note">Authorised access only. Attempts are logged.</p>
</main>
</body>
</html>
