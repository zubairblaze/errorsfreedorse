#!/usr/bin/env node
/**
 * Exports the Phase 1 content modules to JSON for the database seeder.
 *
 *   node scripts/export-content.mjs
 *
 * One source of truth: the seed reads this file rather than restating the
 * same content in PHP, so the site and the database cannot drift apart
 * before the switchover happens.
 */
import { writeFile, mkdir } from 'node:fs/promises';

const { getPosts, getAuthor } = await import('../src/data/blog.ts');
const { getCaseStudies } = await import('../src/data/case-studies.ts');
const { services } = await import('../src/data/services.ts');
const { projects } = await import('../src/data/work.ts');

const posts = await getPosts();
const authors = [];
for (const id of [...new Set(posts.map((p) => p.author_id))]) {
  authors.push({ id, ...(await getAuthor(id)) });
}

const payload = {
  generated_at: new Date().toISOString(),
  authors: authors.map(({ id, name, role, bio }) => ({ id, name, role, bio })),
  categories: [...new Set(posts.map((p) => p.category))].map((name) => ({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  })),
  posts: posts.map((p) => ({
    title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body,
    featured_image: p.featured_image, featured_image_alt: p.featured_image_alt,
    author_id: p.author_id, category: p.category, status: p.status,
    published_at: p.published_at, read_minutes: p.read_minutes, tags: p.tags,
  })),
  case_studies: (await getCaseStudies()).map((c) => ({
    title: c.title, slug: c.slug, client: c.client, sector: c.sector,
    excerpt: c.excerpt, body: c.body, featured_image: c.featured_image,
    featured_image_alt: c.featured_image_alt, challenge: c.challenge,
    approach: c.approach, outcome: c.outcome, duration: c.duration,
    status: c.status, published_at: c.published_at, read_minutes: c.read_minutes,
    results: c.results, services: c.services,
  })),
  services: services.map((s) => ({
    title: s.title, slug: s.slug, short: s.short, excerpt: s.excerpt,
    intro: s.intro, icon: s.icon, sort_order: s.order, status: 'published',
    deliverables: s.deliverables,
    features: s.features.map((f) => ({ label: f.title, body: f.body })),
    process: s.process.map((p) => ({ label: p.step, body: p.body })),
    engagement: s.engagement.map((e) => ({ label: e.label, body: e.value })),
    stack: s.stack,
  })),
  apps: projects.map((p, i) => ({
    title: p.title, slug: p.slug, client: p.client, sector: p.sector,
    summary: p.summary, year: p.year, product_url: p.productUrl,
    featured: p.featured ? 1 : 0, sort_order: i, status: 'published',
    results: p.results.map((r) => ({ label: r.label, value: r.value })),
    services: p.services,
  })),
};

await mkdir('backend/seed', { recursive: true });
await writeFile('backend/seed/content.json', JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log('✓ backend/seed/content.json');
console.log(`  ${payload.posts.length} posts, ${payload.case_studies.length} case studies, ` +
            `${payload.services.length} services, ${payload.apps.length} apps`);
