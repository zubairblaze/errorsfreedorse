/**
 * Sitemap. Enumerates every static route plus the generated service and
 * blog pages, so adding a post or service needs no edit here.
 */
import type { APIRoute } from 'astro';
import { services } from '../data/services.ts';
import { getPosts } from '../data/blog.ts';
import { getCaseStudies } from '../data/case-studies.ts';
import { absUrl } from '../lib/url.ts';

interface Entry { path: string; priority: string; changefreq: string; lastmod?: string; }

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10);

  const entries: Entry[] = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/services/', priority: '0.9', changefreq: 'monthly' },
    { path: '/case-studies/', priority: '0.9', changefreq: 'monthly' },
    { path: '/work/', priority: '0.8', changefreq: 'monthly' },
    { path: '/about/', priority: '0.7', changefreq: 'monthly' },
    { path: '/blog/', priority: '0.8', changefreq: 'weekly' },
    { path: '/contact/', priority: '0.9', changefreq: 'yearly' },
    { path: '/privacy/', priority: '0.3', changefreq: 'yearly' },
    { path: '/terms/', priority: '0.3', changefreq: 'yearly' },
    ...services.map((s) => ({ path: `/services/${s.slug}/`, priority: '0.8', changefreq: 'monthly' })),
    ...(await getCaseStudies()).map((c) => ({
      path: `/case-studies/${c.slug}/`, priority: '0.8', changefreq: 'yearly', lastmod: c.updated_at,
    })),
    ...(await getPosts()).map((p) => ({
      path: `/blog/${p.slug}/`, priority: '0.7', changefreq: 'yearly', lastmod: p.updated_at,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>
    <loc>${absUrl(e.path)}</loc>
    <lastmod>${e.lastmod ?? today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
