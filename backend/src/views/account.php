<?php
/** @var ?string $error @var array $info */
use ErrorsFree\Csrf;
use function ErrorsFree\url_for;
?>
<h1>Account &amp; password</h1>
<p class="lede">Signed in as <strong><?= $e($info['username']) ?></strong>.</p>

<dl class="facts">
  <div><dt>Last sign-in</dt><dd class="mono"><?= $e($info['last_login_at'] ?? 'never') ?></dd></div>
  <div><dt>Failed attempts (last 15 min)</dt><dd class="mono"><?= $e((string) $info['recent_failures']) ?></dd></div>
</dl>

<h2>Change password</h2>
<?php if ($error !== null): ?>
  <p class="flash flash--error" role="alert"><?= $e($error) ?></p>
<?php endif; ?>

<form method="post" action="<?= $e(url_for('admin/?r=password')) ?>" class="form form--narrow" autocomplete="off" novalidate>
  <?= Csrf::field() ?>
  <div class="field">
    <label for="current">Current password</label>
    <input id="current" name="current" type="password" autocomplete="current-password" required maxlength="200">
  </div>
  <div class="field">
    <label for="new">New password</label>
    <input id="new" name="new" type="password" autocomplete="new-password" required maxlength="200">
    <p class="help">At least 12 characters, mixing three of: lower case, upper case, numbers, symbols.</p>
  </div>
  <div class="field">
    <label for="confirm">Confirm new password</label>
    <input id="confirm" name="confirm" type="password" autocomplete="new-password" required maxlength="200">
  </div>
  <div class="form__actions">
    <button type="submit" class="btn">Change password</button>
  </div>
  <p class="help">
    Changing your password signs out every other device immediately, including
    any session an attacker may hold.
  </p>
</form>
