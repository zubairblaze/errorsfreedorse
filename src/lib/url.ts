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

/**
 * Clamps text to a length search engines will actually show.
 *
 * Excerpts are written for cards, where 200+ characters reads fine; a meta
 * description that long is truncated mid-word in results. Once Phase 2 lets
 * editors write excerpts this stops being a copy problem and becomes a
 * recurring one, so it is handled in code rather than by discipline.
 * Cuts at a word boundary and only appends an ellipsis if it actually cut.
 */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\u2014-]+$/, '') + '…';
}
