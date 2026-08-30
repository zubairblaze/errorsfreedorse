<?php
/** @var string $entity @var array $def @var ?int $id @var array $values
 *  @var array $errors @var array $children @var array $optionSets */
use ErrorsFree\Csrf;
use function ErrorsFree\url_for;
?>
<div class="head">
  <h1><?= $id === null ? 'New ' . $e($def['singular']) : 'Edit ' . $e($def['singular']) ?></h1>
  <a class="linkish" href="<?= $e(url_for('admin/?r=list&e=' . $entity)) ?>">Back to <?= $e(strtolower($def['label'])) ?></a>
</div>

<?php if (isset($errors['_'])): ?>
  <p class="flash flash--error" role="alert"><?= $e($errors['_']) ?></p>
<?php elseif ($errors !== []): ?>
  <p class="flash flash--error" role="alert">Some fields need attention.</p>
<?php endif; ?>

<form method="post" action="<?= $e(url_for('admin/?r=save&e=' . $entity . ($id ? '&id=' . $id : ''))) ?>"
      enctype="multipart/form-data" class="form" novalidate>
  <?= Csrf::field() ?>

  <?php foreach ($def['fields'] as $name => $field):
      $value = $values[$name] ?? '';
      $err = $errors[$name] ?? null;
      $fid = 'f_' . $name;
  ?>
    <div class="field<?= $err ? ' field--error' : '' ?>">
      <label for="<?= $e($fid) ?>">
        <?= $e($field['label']) ?><?= !empty($field['required']) ? ' <span class="req" aria-hidden="true">*</span>' : '' ?>
      </label>

      <?php if ($field['type'] === 'textarea'): ?>
        <textarea id="<?= $e($fid) ?>" name="<?= $e($name) ?>" rows="4"
                  maxlength="<?= $e((string) ($field['max'] ?? 2000)) ?>"><?= $e((string) $value) ?></textarea>

      <?php elseif ($field['type'] === 'html'): ?>
        <textarea id="<?= $e($fid) ?>" name="<?= $e($name) ?>" rows="18" class="mono"><?= $e((string) $value) ?></textarea>
        <p class="help">
          HTML. Allowed: paragraphs, h2–h4, lists, links, images, tables, blockquote, code, strong, em.
          Anything else — scripts, styles, event handlers, javascript: links — is stripped on save.
        </p>

      <?php elseif ($field['type'] === 'select'): ?>
        <?php $options = $optionSets[$name] ?? ($field['options'] ?? []); ?>
        <select id="<?= $e($fid) ?>" name="<?= $e($name) ?>">
          <?php if (empty($field['required'])): ?><option value="">—</option><?php endif; ?>
          <?php foreach ($options as $ov => $ol): ?>
            <option value="<?= $e((string) $ov) ?>" <?= (string) $value === (string) $ov ? 'selected' : '' ?>><?= $e((string) $ol) ?></option>
          <?php endforeach; ?>
        </select>

      <?php elseif ($field['type'] === 'bool'): ?>
        <label class="check">
          <input type="checkbox" name="<?= $e($name) ?>" value="1" <?= (int) $value === 1 ? 'checked' : '' ?>>
          <span>Yes</span>
        </label>

      <?php elseif ($field['type'] === 'date'): ?>
        <input id="<?= $e($fid) ?>" name="<?= $e($name) ?>" type="date" value="<?= $e((string) $value) ?>">

      <?php elseif ($field['type'] === 'number'): ?>
        <input id="<?= $e($fid) ?>" name="<?= $e($name) ?>" type="number" inputmode="numeric"
               min="<?= $e((string) ($field['min'] ?? 0)) ?>" max="<?= $e((string) ($field['max'] ?? 999)) ?>"
               value="<?= $e((string) $value) ?>">

      <?php elseif ($field['type'] === 'image'): ?>
        <?php if ($value !== '' && $value !== null): ?>
          <div class="thumb">
            <img src="<?= $e(url_for((string) $value)) ?>" alt="" width="200">
            <label class="check">
              <input type="checkbox" name="remove_<?= $e($name) ?>" value="1">
              <span>Remove this image</span>
            </label>
          </div>
        <?php endif; ?>
        <input type="hidden" name="<?= $e($name) ?>" value="<?= $e((string) $value) ?>">
        <input id="<?= $e($fid) ?>" type="file" name="upload_<?= $e($name) ?>" accept="image/jpeg,image/png,image/gif,image/webp">
        <p class="help">JPEG, PNG, GIF or WebP. 5 MB maximum.</p>

      <?php else: ?>
        <input id="<?= $e($fid) ?>" name="<?= $e($name) ?>" type="text"
               maxlength="<?= $e((string) ($field['max'] ?? 255)) ?>" value="<?= $e((string) $value) ?>">
      <?php endif; ?>

      <?php if (!empty($field['help']) && $field['type'] !== 'html' && $field['type'] !== 'image'): ?>
        <p class="help"><?= $e($field['help']) ?></p>
      <?php endif; ?>
      <?php if ($err): ?><p class="err"><?= $e($err) ?></p><?php endif; ?>
    </div>
  <?php endforeach; ?>

  <?php foreach (($def['children'] ?? []) as $childKey => $child): ?>
    <fieldset class="repeater" data-repeater>
      <legend><?= $e($child['label'] ?? ucfirst($childKey)) ?></legend>
      <div class="repeater__rows" data-rows>
        <?php
          $rows = $children[$childKey] ?? [];
          if ($rows === []) { $rows = [[]]; }
          foreach ($rows as $i => $row):
            $cols = $child['kind'] === 'pairs' ? $child['columns'] : ($child['kind'] === 'tags' ? ['name'] : [$child['column']]);
        ?>
          <div class="repeater__row">
            <?php foreach ($cols as $c): ?>
              <input type="text" name="child[<?= $e($childKey) ?>][<?= $e((string) $i) ?>][<?= $e($c) ?>]"
                     value="<?= $e((string) ($row[$c] ?? '')) ?>"
                     placeholder="<?= $e(ucfirst(str_replace('_', ' ', $c))) ?>" maxlength="1000">
            <?php endforeach; ?>
            <button type="button" class="linkish linkish--danger" data-remove-row>Remove</button>
          </div>
        <?php endforeach; ?>
      </div>
      <button type="button" class="linkish" data-add-row>Add row</button>
    </fieldset>
  <?php endforeach; ?>

  <div class="form__actions">
    <button type="submit" class="btn">Save</button>
    <a class="linkish" href="<?= $e(url_for('admin/?r=list&e=' . $entity)) ?>">Cancel</a>
  </div>
</form>
