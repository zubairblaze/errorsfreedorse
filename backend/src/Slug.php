<?php
declare(strict_types=1);

namespace ErrorsFree;

final class Slug
{
    /**
     * Normalises text into a url segment.
     *
     * Transliterates where iconv can, then keeps only [a-z0-9-]. Arabic and
     * other non-Latin titles transliterate poorly or not at all, so a title
     * that reduces to nothing returns '' and the caller asks for an explicit
     * slug rather than silently producing gibberish.
     */
    public static function make(string $text): string
    {
        $text = trim($text);
        if ($text === '') {
            return '';
        }

        if (function_exists('iconv')) {
            $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
            if (is_string($ascii) && trim($ascii) !== '') {
                $text = $ascii;
            }
        }

        $text = strtolower($text);
        $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?? '';
        $text = trim($text, '-');

        return substr($text, 0, 160);
    }
}
