<?php
declare(strict_types=1);

namespace ErrorsFree;

/**
 * Turns request input into a row that is safe to write.
 *
 * The single place where untrusted input becomes storable data. It reads only
 * the fields the entity declares, coerces each to its declared type, enforces
 * lengths and ranges, and runs rich text through the sanitiser. Anything the
 * definition does not mention is discarded rather than passed along.
 */
final class FormHandler
{
    /** @var array<string,string> field => message */
    public array $errors = [];

    /** @var array<string,mixed> the row to persist */
    public array $data = [];

    /** @var array<string,mixed> values to re-render on error */
    public array $values = [];

    public function __construct(
        private readonly string $entity,
        private readonly ?int $id,
    ) {
    }

    /** @param array<string,mixed> $input usually $_POST */
    public function handle(array $input): bool
    {
        $def = Entities::get($this->entity);
        if ($def === null) {
            $this->errors['_'] = 'Unknown content type.';
            return false;
        }

        foreach ($def['fields'] as $name => $field) {
            $raw = $input[$name] ?? null;
            $value = is_scalar($raw) ? (string) $raw : '';
            $value = str_replace("\0", '', $value);          // strip NUL bytes
            $this->values[$name] = $value;

            $type = $field['type'];
            $label = $field['label'] ?? $name;
            $required = (bool) ($field['required'] ?? false);

            switch ($type) {
                case 'slug':
                    $value = Slug::make($value !== '' ? $value : (string) ($input[$field['source'] ?? 'title'] ?? ''));
                    if ($value === '') {
                        $this->errors[$name] = 'Enter a slug — the title did not produce one.';
                        break;
                    }
                    if (Repo::slugTaken($this->entity, $value, $this->id)) {
                        $this->errors[$name] = 'That slug is already in use.';
                        break;
                    }
                    $this->values[$name] = $value;
                    $this->data[$name] = $value;
                    break;

                case 'html':
                    $clean = Security::sanitizeHtml($value);
                    if ($required && trim(strip_tags($clean)) === '') {
                        $this->errors[$name] = $label . ' is required.';
                        break;
                    }
                    $this->values[$name] = $clean;
                    $this->data[$name] = $clean;
                    break;

                case 'select':
                    $options = isset($field['options_from'])
                        ? Repo::options($field['options_from'])
                        : ($field['options'] ?? []);
                    if ($value === '') {
                        if ($required) {
                            $this->errors[$name] = $label . ' is required.';
                            break;
                        }
                        $this->data[$name] = isset($field['options_from']) ? null : ($field['default'] ?? '');
                        break;
                    }
                    if (!array_key_exists($value, $options)) {
                        // Not a validation nicety: this is what stops an
                        // arbitrary value reaching an ENUM column or a
                        // foreign key.
                        $this->errors[$name] = 'Choose one of the listed options.';
                        break;
                    }
                    $this->data[$name] = isset($field['options_from']) ? (int) $value : $value;
                    break;

                case 'date':
                    if ($value === '') {
                        $this->data[$name] = null;
                        break;
                    }
                    $d = \DateTimeImmutable::createFromFormat('Y-m-d', $value);
                    if ($d === false || $d->format('Y-m-d') !== $value) {
                        $this->errors[$name] = 'Use the date picker (YYYY-MM-DD).';
                        break;
                    }
                    $this->data[$name] = $value;
                    break;

                case 'number':
                    if ($value === '') {
                        $this->data[$name] = $field['default'] ?? 0;
                        break;
                    }
                    if (!preg_match('/^-?\d+$/', $value)) {
                        $this->errors[$name] = $label . ' must be a whole number.';
                        break;
                    }
                    $n = (int) $value;
                    $min = $field['min'] ?? PHP_INT_MIN;
                    $max = $field['max'] ?? PHP_INT_MAX;
                    if ($n < $min || $n > $max) {
                        $this->errors[$name] = $label . " must be between {$min} and {$max}.";
                        break;
                    }
                    $this->data[$name] = $n;
                    break;

                case 'bool':
                    $this->data[$name] = $value !== '' && $value !== '0' ? 1 : 0;
                    $this->values[$name] = $this->data[$name];
                    break;

                case 'image':
                    // Set by the upload handler, or preserved from the
                    // existing row; never taken raw from the request.
                    $this->data[$name] = $value === '' ? null : $value;
                    break;

                case 'text':
                case 'textarea':
                default:
                    $value = $type === 'text' ? preg_replace('/[\r\n\t]+/', ' ', $value) ?? '' : $value;
                    $value = trim($value);
                    if ($required && $value === '') {
                        $this->errors[$name] = $label . ' is required.';
                        break;
                    }
                    $max = (int) ($field['max'] ?? 65535);
                    if (mb_strlen($value) > $max) {
                        $this->errors[$name] = $label . " is longer than {$max} characters.";
                        break;
                    }
                    $this->values[$name] = $value;
                    $this->data[$name] = $value;
                    break;
            }
        }

        // An image without alt text is an accessibility defect, so the form
        // refuses it rather than shipping it.
        if (!empty($this->data['featured_image']) && empty($this->data['featured_image_alt'])) {
            $this->errors['featured_image_alt'] = 'Describe the image for anyone who cannot see it.';
        }

        // Publishing without a date leaves a post invisible to the ordering.
        if (($this->data['status'] ?? '') === 'published' && array_key_exists('published_at', $this->data)
            && $this->data['published_at'] === null) {
            $this->data['published_at'] = date('Y-m-d');
            $this->values['published_at'] = $this->data['published_at'];
        }

        return $this->errors === [];
    }

    /**
     * Extracts repeater rows for a child collection from the request.
     * @return array<int,array<string,string>>
     */
    public static function childRows(array $input, string $childKey): array
    {
        $rows = $input['child'][$childKey] ?? null;
        if (!is_array($rows)) {
            return [];
        }
        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $clean = [];
            foreach ($row as $k => $v) {
                if (!is_string($k) || !is_scalar($v)) {
                    continue;
                }
                $clean[$k] = mb_substr(trim(str_replace("\0", '', (string) $v)), 0, 1000);
            }
            if ($clean !== []) {
                $out[] = $clean;
            }
        }
        return array_slice($out, 0, 40);   // cap repeater size
    }
}
