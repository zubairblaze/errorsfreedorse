/**
 * Base-aware URL helpers.
 *
 * The site ships into a NESTED cPanel folder, so no component may write a
 * bare "/about/" link. Everything routes through `url()`, which prefixes
 * Astro's configured `base`. Change SITE_BASE at build time and every
 * link, asset and canonical tag follows — no find-and-replace.
 */

/** Configured base, always normalised to a single leading+trailing slash. */
export const BASE: string = `/${(import.meta.env.BASE_URL ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

/** Absolute site origin, used only for canonical/OG tags and the sitemap. */
export const ORIGIN: string = (import.meta.env.SITE ?? 'https://errorsfree.com').replace(/\/+$/, '');

/**
 * Build an internal path. `url('/services/')` -> `/errorsfree/services/`.
 * Accepts paths with or without leading slashes, and leaves hashes and
 * external URLs untouched.
 */
export function url(path = '/'): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('mailto:') || path.startsWith('tel:')) return path;
  if (path.startsWith('#')) return path;
  return (BASE + path.replace(/^\/+/, '')).replace(/\/{2,}/g, '/');
}

/** Fully-qualified URL for canonical links, OG tags and sitemap entries. */
export function absUrl(path = '/'): string {
  return ORIGIN + url(path);
}
