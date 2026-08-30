<?php
declare(strict_types=1);

namespace ErrorsFree;

/**
 * Minimal template renderer.
 *
 * Templates are plain PHP with variables extracted into scope. Every value
 * they print goes through Security::e(), aliased to e() inside the template.
 */
final class View
{
    /** @param array<string,mixed> $vars */
    public static function render(string $template, array $vars = []): string
    {
        $file = __DIR__ . '/views/' . basename($template) . '.php';
        if (!is_file($file)) {
            throw new \RuntimeException('Missing template: ' . $template);
        }

        $e = static fn(?string $s): string => Security::e($s);
        extract($vars, EXTR_SKIP);

        ob_start();
        require $file;
        return (string) ob_get_clean();
    }

    /** @param array<string,mixed> $vars */
    public static function page(string $template, array $vars, string $title): void
    {
        $body = self::render($template, $vars);
        echo self::render('layout', [
            'title'   => $title,
            'body'    => $body,
            'flash'   => $vars['flash'] ?? null,
            'current' => $vars['current'] ?? '',
        ]);
    }
}
