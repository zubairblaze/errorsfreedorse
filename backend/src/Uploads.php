<?php
declare(strict_types=1);

namespace ErrorsFree;

/**
 * Image uploads.
 *
 * The rules that matter:
 *  - the extension is derived from what the file actually is, never from the
 *    name the browser sent, so image.php.jpg cannot become image.php;
 *  - the type is confirmed by reading the file's own header with getimagesize
 *    rather than trusting the multipart Content-Type, which the client sets;
 *  - the stored name is random, so an attacker cannot predict or overwrite a
 *    path, and a traversal sequence in the original name is simply discarded;
 *  - the uploads directory ships an .htaccess that refuses to execute
 *    anything, which is the backstop if the checks above are ever bypassed.
 */
final class Uploads
{
    private const MAX_BYTES = 5 * 1024 * 1024;   // 5 MB

    /** image type constant => extension */
    private const ALLOWED = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG  => 'png',
        IMAGETYPE_GIF  => 'gif',
        IMAGETYPE_WEBP => 'webp',
    ];

    public static function directory(): string
    {
        return dirname(__DIR__) . '/public/uploads';
    }

    /**
     * Handles one uploaded file.
     *
     * @return array{path:string}|array{error:string}|null null when no file
     *         was submitted, which is not an error.
     */
    public static function handle(string $field): ?array
    {
        $file = $_FILES[$field] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['error' => match ((int) $file['error']) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'That file is too large.',
                UPLOAD_ERR_PARTIAL                        => 'The upload did not complete.',
                default                                   => 'The upload failed.',
            }];
        }

        $tmp = (string) $file['tmp_name'];

        // Confirms the file arrived through an actual upload rather than
        // being a path an attacker managed to place in the request.
        if (!is_uploaded_file($tmp)) {
            return ['error' => 'The upload failed.'];
        }
        if (($file['size'] ?? 0) > self::MAX_BYTES) {
            return ['error' => 'Images must be 5 MB or smaller.'];
        }

        $info = @getimagesize($tmp);
        if ($info === false || !isset(self::ALLOWED[$info[2]])) {
            return ['error' => 'Upload a JPEG, PNG, GIF or WebP image.'];
        }

        // A real image can still carry markup in a metadata field; refusing
        // SVG entirely and re-deriving the extension keeps that inert.
        $extension = self::ALLOWED[$info[2]];
        $name = bin2hex(random_bytes(16)) . '.' . $extension;

        $dir = self::directory();
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            return ['error' => 'The uploads folder is not writable.'];
        }

        if (!move_uploaded_file($tmp, $dir . '/' . $name)) {
            return ['error' => 'Could not save the file.'];
        }

        @chmod($dir . '/' . $name, 0644);

        return ['path' => 'uploads/' . $name];
    }

    /** Deletes a previously stored upload. Ignores anything outside the dir. */
    public static function remove(?string $path): void
    {
        if ($path === null || !str_starts_with($path, 'uploads/')) {
            return;
        }
        $name = basename($path);
        $full = self::directory() . '/' . $name;
        if (is_file($full)) {
            @unlink($full);
        }
    }
}
