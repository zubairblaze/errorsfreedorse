<?php
declare(strict_types=1);

namespace ErrorsFree;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

/**
 * Escaping, response headers, and HTML sanitising.
 */
final class Security
{
    /**
     * Escape for HTML text and attribute context.
     *
     * ENT_QUOTES covers both quote styles and ENT_SUBSTITUTE turns invalid
     * UTF-8 into U+FFFD instead of returning an empty string — a silent empty
     * return is how an escaping call stops protecting anything.
     */
    public static function e(?string $value): string
    {
        return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }

    /**
     * Response headers sent on every admin and API response.
     *
     * The admin CSP forbids inline script outright; the panel ships its small
     * amount of JavaScript as a file so that rule can stay absolute. An XSS
     * that lands in a post body therefore cannot execute in the admin.
     */
    public static function headers(bool $admin = false): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()');
        header('Cross-Origin-Opener-Policy: same-origin');
        header_remove('X-Powered-By');

        if ($admin) {
            header(
                "Content-Security-Policy: default-src 'self'; "
                . "script-src 'self'; style-src 'self'; img-src 'self' data:; "
                . "font-src 'self'; connect-src 'self'; form-action 'self'; "
                . "frame-ancestors 'none'; base-uri 'none'; object-src 'none'"
            );
            // An admin page must never be cached to disk by a shared browser.
            header('Cache-Control: no-store, no-cache, must-revalidate, private');
            header('Pragma: no-cache');
        }
    }

    /** Tags an editor may use in a post or case-study body. */
    private const ALLOWED_TAGS = [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
        'h2', 'h3', 'h4', 'ul', 'ol', 'li',
        'blockquote', 'code', 'pre', 'a', 'hr',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'figure', 'figcaption', 'img',
    ];

    /** Attributes allowed, per tag. Everything else is stripped. */
    private const ALLOWED_ATTRS = [
        'a'   => ['href', 'title'],
        'img' => ['src', 'alt', 'width', 'height'],
        'td'  => ['colspan', 'rowspan'],
        'th'  => ['colspan', 'rowspan', 'scope'],
    ];

    /**
     * Sanitise editor-supplied HTML against an allowlist.
     *
     * Parsed with DOMDocument and rebuilt, not filtered with regular
     * expressions. A regex cannot see the tree, so it cannot reliably tell a
     * closed tag from an unclosed one, an attribute from text that resembles
     * one, or a nested comment from markup — and every published bypass of a
     * regex sanitiser exploits exactly that blindness.
     *
     * Removed unconditionally: script, style, iframe, object, embed, form,
     * every on* handler, and any href or src that is not http, https, mailto,
     * tel, or a site-relative path. javascript: and data: URLs are refused,
     * including when obfuscated with entities or whitespace, because the URL
     * is normalised before it is tested.
     */
    public static function sanitizeHtml(string $html): string
    {
        $html = trim($html);
        if ($html === '') {
            return '';
        }

        $doc = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);

        // The meta forces UTF-8 interpretation; the flags stop DOMDocument
        // wrapping the fragment in <html><body> and adding a doctype.
        $ok = $doc->loadHTML(
            '<?xml encoding="UTF-8"?><div id="ef-root">' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING
        );

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (!$ok) {
            return '';
        }

        $xpath = new DOMXPath($doc);

        // Comments can hide markup from a naive reader; drop them all.
        foreach (iterator_to_array($xpath->query('//comment()') ?: []) as $comment) {
            $comment->parentNode?->removeChild($comment);
        }

        $root = $doc->getElementById('ef-root') ?? $doc->documentElement;
        if ($root === null) {
            return '';
        }

        self::cleanNode($root);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    /** Walks the tree depth-first, unwrapping or removing disallowed nodes. */
    private static function cleanNode(DOMNode $node): void
    {
        // Snapshot the list: the loop mutates the live child collection.
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMElement) {
                $tag = strtolower($child->nodeName);

                if (!in_array($tag, self::ALLOWED_TAGS, true)) {
                    // Executable or embedding elements are deleted whole,
                    // contents included. Anything else keeps its text, so
                    // stripping a stray <div> does not delete a paragraph.
                    if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'form', 'svg', 'math'], true)) {
                        $child->parentNode?->removeChild($child);
                    } else {
                        self::cleanNode($child);
                        self::unwrap($child);
                    }
                    continue;
                }

                self::cleanAttributes($child, $tag);
                self::cleanNode($child);
            }
        }
    }

    /** Replaces an element with its own children. */
    private static function unwrap(DOMElement $el): void
    {
        $parent = $el->parentNode;
        if ($parent === null) {
            return;
        }
        while ($el->firstChild !== null) {
            $parent->insertBefore($el->firstChild, $el);
        }
        $parent->removeChild($el);
    }

    private static function cleanAttributes(DOMElement $el, string $tag): void
    {
        $allowed = self::ALLOWED_ATTRS[$tag] ?? [];

        foreach (iterator_to_array($el->attributes ?? []) as $attr) {
            $name = strtolower($attr->nodeName);

            if (!in_array($name, $allowed, true)) {
                $el->removeAttribute($attr->nodeName);
                continue;
            }

            if ($name === 'href' || $name === 'src') {
                if (!self::safeUrl($attr->nodeValue ?? '')) {
                    $el->removeAttribute($attr->nodeName);
                }
            }
        }

        // Outbound links must not hand the opener a window reference.
        if ($tag === 'a' && $el->hasAttribute('href')) {
            $href = $el->getAttribute('href');
            if (preg_match('#^https?://#i', $href)) {
                $el->setAttribute('rel', 'noopener noreferrer');
                $el->setAttribute('target', '_blank');
            }
        }
    }

    /**
     * Allow http, https, mailto, tel, and site-relative paths. Everything
     * else — javascript:, data:, vbscript:, file: — is refused.
     *
     * The value is normalised first: HTML entities decoded, then all
     * whitespace and control characters removed, because `java\tscript:` and
     * `java&#09;script:` both reach the parser as `javascript:`.
     */
    private static function safeUrl(string $url): bool
    {
        $normalised = html_entity_decode($url, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalised = preg_replace('/[\x00-\x20\x7F\s]+/u', '', $normalised) ?? '';

        if ($normalised === '') {
            return false;
        }

        // Relative and anchor links carry no scheme and are safe.
        if (str_starts_with($normalised, '/') || str_starts_with($normalised, '#')) {
            return !str_starts_with($normalised, '//');   // protocol-relative
        }

        if (!str_contains($normalised, ':')) {
            return true;   // a bare relative path such as images/x.webp
        }

        $scheme = strtolower(substr($normalised, 0, strpos($normalised, ':')));
        return in_array($scheme, ['http', 'https', 'mailto', 'tel'], true);
    }

    /** Client IP as packed bytes for the VARBINARY(16) columns. */
    public static function ipBinary(): ?string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $packed = @inet_pton($ip);
        return $packed === false ? null : $packed;
    }
}
