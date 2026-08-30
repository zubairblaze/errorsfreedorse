// @ts-check
import { defineConfig } from 'astro/config';

/**
 * ErrorsFree — static marketing site.
 *
 * DEPLOY TARGET: a NESTED FOLDER on cPanel (e.g. /home/USER/public_html/errorsfree),
 * not the public_html root. Every internal URL is therefore prefixed with `base`.
 *
 * Change the folder without touching a single component:
 *   SITE_BASE=/my-folder npm run build
 *   SITE_BASE=/          npm run build   # or: npm run build:root
 *
 * `site` is only used to build absolute URLs for SEO tags and sitemap.xml.
 */
const SITE_BASE = process.env.SITE_BASE ?? '/errorsfree';
const SITE_URL = process.env.SITE_URL ?? 'https://errorsfree.com';

export default defineConfig({
  site: SITE_URL,
  base: SITE_BASE,
  output: 'static',
  // /about/index.html — Apache serves these from a subfolder with no rewrite rules.
  trailingSlash: 'always',
  build: { format: 'directory', assets: 'assets' },
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  devToolbar: { enabled: false },
});
