# ErrorsFree — marketing site

Static marketing site for ErrorsFree: AI-first app development and SaaS for
SMEs across the GCC. Built with **Astro 7**, no CSS framework, no runtime
dependencies. Output is plain HTML/CSS/JS that any Apache host will serve.

**Phase 1 (this repo):** the full front end, running on typed mock data.
**Phase 2 (later):** a PHP or Node API over MySQL for the blog, newsletter and
contact form. The front end is already shaped for it — see
[Phase 2 wiring](#phase-2-wiring) below.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321/errorsfree/
npm run build      # -> dist/  (plus a generated .htaccess)
npm run preview    # serve dist/ exactly as it will be deployed
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/`, then writes `dist/.htaccess` |
| `npm run build:root` | Same, built for the domain root instead of a subfolder |
| `npm run package` | Build, then zip `dist/` into `errorsfree-site.zip` |
| `npm run images` | Regenerate `og.png` and `apple-touch-icon.png` |
| `npm run fetch-fonts` | Re-download the self-hosted webfonts |
| `npm run check` | Astro/TypeScript diagnostics |

---

## Deploying to a cPanel subfolder

The site is built for a **nested folder**, not `public_html` itself. The
folder name is a build-time setting, so nothing in the code needs editing.

1. **Build for your folder name.** Default is `/errorsfree`:

   ```bash
   npm run build                      # -> /errorsfree
   SITE_BASE=/apps/site npm run build # -> /apps/site
   npm run build:root                 # -> domain root
   ```

2. **Upload.** `npm run package` produces `errorsfree-site.zip`. In cPanel →
   File Manager, open the target folder, upload the zip, then **Extract**.
   Upload the *contents* of `dist/`, not the `dist` folder itself.

3. **Check `.htaccess` came across.** It is a dotfile — cPanel's File Manager
   hides it until you enable *Show Hidden Files* in Settings. It is generated
   per build with the correct paths for your folder, and it sets compression,
   cache headers, security headers and the 404 document.

4. **Set the live domain** before the final build, so canonical tags, Open
   Graph URLs and `sitemap.xml` are absolute and correct:

   ```bash
   SITE_URL=https://errorsfree.com SITE_BASE=/errorsfree npm run build
   ```

No Node.js, PHP or database is needed on the server for Phase 1 — it is
static files only.

---

## Choosing the brand palette

The site ships with **four palettes**, each in light and dark, and a **Brand
lab** picker fixed to the bottom-right corner of every page. Open it, switch
between them on the real site, and settle the direction.

| Palette | Character |
| --- | --- |
| **Meridian** *(default)* | Corporate blue — the Dell register. Institutional, trusted, safest for conversion. |
| **Obsidian** | Near-black with electric lime. Reads as a developer tool: sharp and technical. |
| **Dune** | Ink and warm gold. Gulf-premium — a firm that charges properly. |
| **Quantum** | Indigo into violet. Signals AI-native and contemporary. |

Every colour in the codebase resolves through a token in
`src/styles/tokens.css`. No component contains a hex value, which is what
makes switching instant and total.

**All eight combinations pass WCAG AA** on the nine contrast pairs the design
depends on. Verify after any colour change:

```bash
node contrast.mjs
```

### Locking the choice in

1. Set the winner as the default in `src/layouts/BaseLayout.astro`:
   `<html data-palette="dune" data-theme="light">`.
2. Delete `src/components/PaletteSwitcher.astro` and its `<PaletteSwitcher />`
   line in the layout. Nothing else references it.
3. Optionally delete the three unused palette blocks from `tokens.css`.
4. Update the fixed accent in `public/favicon.svg` and
   `scripts/generate-images.mjs`, then `npm run images`.

---

## The Droste motif

The recursion is the site's central mechanism, not a decoration applied to
it. It is CSS and SVG throughout — no stacked image exports — so it stays
crisp at any size, weighs almost nothing, and is driven by scroll.

### The infinite zoom

`src/lib/droste.ts` is the whole engine, and it is short. A true infinite
zoom needs only a handful of elements because the arrangement is
self-similar: N frames whose scales are consecutive powers of `ratio`. Push
every frame outward by the same continuous amount and, after advancing
exactly one level, the set is indistinguishable from where it started — so a
frame that has grown past the viewer is recycled to the centre and the loop
has no seam.

```
depth(i, p)  = (i − p) wrapped into (−1, levels−1]
scale        = ratio ^ depth
opacity      = fades in at the far end, out as it engulfs the viewer
```

The recycle always happens at zero opacity, which is why it is invisible.
Each frame's *screen is transparent*, so you look straight through every
frame to the ones behind it — the same way you would through a screen
showing a screen. Only transforms and opacity are written, so the whole
effect stays on the compositor: no layout is read or written per frame.

Two things use it:

| Where | Driver | Behaviour |
| --- | --- | --- |
| **Hero** (`DrosteHero.astro`) | page scroll | One screen of scrolling advances 2.1 levels. Also drifts on its own at 0.03 levels/sec, so it is alive before you touch anything, plus pointer parallax on the stage. |
| **Our Process** (`ProcessTunnel.astro`) | sticky pin, 3 screens | Scrolling flies you through frames labelled Build → Test → Refine → Repeat → **Build**. The loop closing on itself is the visual, not an illustration of it. |

Only one frame carries legible content at a time — `contentFade()` is
deliberately narrow. Two frames showing the same block at two sizes in
nearly the same place reads as a smear, not as depth. The step list takes
its active item from `focusIndex()`, the same function that decides
legibility, so the words can never drift out of step with the frames.

### Everywhere else

| Where | What |
| --- | --- |
| Logo | A disc containing a square, containing a smaller square, containing a point. Slowly counter-rotating. |
| Page load | A 900ms zoom through nested frames. Once per session only. |
| Cards | Two inset hairlines resolve inward on hover — a card inside a card. |
| Buttons | An inset ring closes in on hover. |
| Focus ring | The halo echoes itself once. |
| Blog and project artwork | Generated nested-frame plates, seeded per record, standing in until real imagery exists. |
| Footer, 404, team | Nested-ring watermarks. |
| Form spinner | Concentric rings, each turning slower than the one outside it. |

### Constraints held throughout

- Depth caps at **7 levels on desktop, 5 on mobile**; the extra frames are
  removed from the DOM on small screens, not just hidden.
- The animation loop is **torn down when the tunnel leaves the viewport**
  and on tab hide — a visitor reading the blog does not pay for a hero they
  cannot see.
- `prefers-reduced-motion` keeps every nested geometry and removes only the
  movement: the tunnel renders once, static; the intro is skipped entirely;
  and **the pin collapses**, so nobody scrolls three screens past a still
  picture.
- Below 980px the process section does not pin at all — it becomes an
  ordinary list with the tunnel beside it.

### Verifying it still moves

`node zoomtest.mjs` prints the real computed scale of every frame at
several scroll positions and asserts they change; `node synctest.mjs`
sweeps 41 positions across the pin and checks the step label matches the
focused frame at every one, with never more than one legible frame at a
time; `node motiontest.mjs` covers the reduced-motion, mobile and
off-screen paths.

## Project structure

```
src/
├─ data/            Content layer — swap for API calls in Phase 2
│  ├─ site.ts       Company facts, nav, contact details
│  ├─ services.ts   The four services and their detail pages
│  ├─ blog.ts       Posts, authors, categories + the async API
│  ├─ work.ts       Case studies and our own products
│  └─ process.ts    Build/test/refine/repeat loop, team
├─ lib/
│  ├─ url.ts       Base-aware url() — every internal link goes through it
│  └─ droste.ts    The infinite-zoom engine
├─ layouts/         BaseLayout: head, SEO, palette restore, reveal observer
├─ components/
│  ├─ droste/       DrosteZoom (the engine), DrosteHero, ProcessTunnel, DrosteIntro
│  ├─ ui/           Buttons, cards, section headings, CTA band, page hero
│  ├─ blog/         PostCard
│  └─ …             Header, Footer, Logo, Icons, forms, PaletteSwitcher
├─ pages/           File-based routes (see below)
└─ styles/
   ├─ tokens.css    Every colour, type step, space and motion value
   ├─ base.css      Reset, primitives, recursion utilities
   └─ fonts.css     Generated — self-hosted webfaces
```

### Routes

`/` · `/about/` · `/services/` · `/services/[slug]/` ×4 · `/work/` ·
`/blog/` · `/blog/[slug]/` ×6 · `/contact/` · `/privacy/` · `/terms/` ·
`404` · `/sitemap.xml` · `/robots.txt` — 19 pages.

---

## Backend and admin panel

Phase 2 is built and tested: PHP 8 + MySQL, an admin panel at `/admin/` for
blog posts, case studies, vibe-coded apps and services, and a JSON API the
static site reads at build time.

```bash
EF_API_URL=https://errorsfree.com/api/ npm run build   # build from MySQL
npm run build                                          # build from fixtures
```

Without `EF_API_URL` the site builds from `src/data`, so a broken backend
cannot block a deploy. See **[backend/README.md](backend/README.md)** for
setup, deployment and the security model — including what is deliberately
not implemented.

## Phase 2 wiring

The front end was written against the planned schema, so going live on the
API is a change to **four function bodies and two fetch calls** — no template
edits and no visual redesign.

### Blog

`src/data/blog.ts` defines interfaces that map one-to-one onto the tables:

```
posts(id, title, slug, excerpt, body, featured_image, author_id,
      category, status, published_at, created_at, updated_at)
authors(id, name, role, avatar, bio)
categories(id, name, slug)
tags(id, name, slug)   post_tags(post_id, tag_id)
```

Every accessor is **already async**:

```ts
getPosts()            // Post[], published only, newest first
getPostBySlug(slug)   // Post | null
getRelatedPosts(post) // scored by shared category and tags
getAuthor(id)         // Author
getCategories()       // categories with post counts
```

Replace those bodies with `fetch()` against your endpoints and the index,
post template, related-posts rail and category filter all keep working.
`body` is stored and rendered as HTML, exactly as a CMS would supply it.

### Forms

Both carry frontend validation, error and success states, and a marked
insertion point:

- `src/components/ContactForm.astro` — field names are already the column
  names for `contact_submissions(id, name, email, company, service, budget,
  message, created_at)`. Includes a honeypot.
- `src/components/NewsletterForm.astro` — POST `{ email }`.

### Note on hosting

Phase 1 is static and needs no server runtime. Phase 2 adds a PHP or Node API;
if the blog becomes dynamic, either rebuild the static site when content
changes (simplest, fastest) or fetch client-side from the existing components.

---

## Quality gates

Two scripts in the repo root check the things that are easy to break:

```bash
node audit.mjs      # interaction + structure/SEO across all 10 page types
node contrast.mjs   # WCAG AA across all 8 palette/theme combinations
node zoomtest.mjs   # the Droste zoom is genuinely scroll-driven
node synctest.mjs   # step labels track the frames across the whole pin
node motiontest.mjs # reduced-motion, mobile and off-screen behaviour
```

`audit.mjs` covers the palette switcher, mobile nav, contact validation and
blog filter end-to-end, then asserts per page: exactly one `h1`, no skipped
heading levels, title and meta-description lengths, canonical URL, `og:image`,
alt text on every image, landmark elements, and no unlabelled links.

Both pass as of the last commit. They need `dist/` built first, and Playwright
(`npm i -D playwright`) for `audit.mjs`.

---

## Decisions worth knowing

**Astro, not Next.js.** The site is content, not an application. Astro ships
zero JavaScript by default — what little runs here is hand-written and scoped
to the components that need it. The output is plain files, which is what a
cPanel subfolder wants.

**No CSS framework.** The design is bespoke and the palette system needs full
control of the cascade. Hand-written CSS with custom properties is smaller
here than a framework build, and it hands off cleanly to a PHP developer in
Phase 2 who should not need to learn a build tool to change a colour.

**Self-hosted fonts.** A render-blocking request to a third-party CDN is the
largest thing that can stand between a visitor and first paint, and it fails
on filtered corporate and regional networks. The three families are subset to
latin/latin-ext and fingerprinted by the build — 220 KB total, no external
requests anywhere on the site.

**Honest placeholders.** No invented client logos and no fabricated metrics.
Sectors stand in for the logo wall; project cards use generated artwork.
Swap them for real assets when they are cleared.

**Legal pages are drafts.** `/privacy/` and `/terms/` are working drafts and
say so on the page. Have them reviewed against your final entity details and
UAE data-protection obligations before launch.
