/* =====================================================================
   Blog content layer.

   PHASE 2 CONTRACT — read this before wiring the backend.

   The interfaces below mirror the planned MySQL tables one-to-one:

     posts(id, title, slug, excerpt, body, featured_image, author_id,
           category, status, published_at, created_at, updated_at)
     authors(id, name, role, avatar, bio)
     categories(id, name, slug)
     tags(id, name, slug)  +  post_tags(post_id, tag_id)

   Every function exported at the bottom is ASYNC and returns exactly the
   shape the components already consume. To go live on the API, replace
   only those function bodies with `fetch()` calls — no page, component
   or template changes are required, and no visual redesign follows.
   ===================================================================== */

import { apiGet, useApi } from '../lib/api.ts';

export type PostStatus = 'draft' | 'published';

export interface Author {
  id: number;
  name: string;
  role: string;
  /** Path relative to the site base, or null to render initials. */
  avatar: string | null;
  bio: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  /** Rendered HTML, exactly as a `body` LONGTEXT column would hold it. */
  body: string;
  /**
   * Image-registry key in Phase 1 (see lib/images.ts); an uploaded path in
   * Phase 2. Null renders the generated nested-frame plate.
   */
  featured_image: string | null;
  /** Alt text travels with the image; keep it populated in the CMS. */
  featured_image_alt: string;
  author_id: number;
  category: string;
  status: PostStatus;
  published_at: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  /** Minutes, precomputed on write in Phase 2. */
  read_minutes: number;
}

/* ------------------------------ Fixtures ---------------------------- */

const authors: Author[] = [
  { id: 1, name: 'Zubair Ahmed', role: 'Founder & Principal Engineer', avatar: null,
    bio: 'Builds software for GCC businesses that have outgrown their spreadsheets.' },
  { id: 2, name: 'ErrorsFree Studio', role: 'Engineering Team', avatar: null,
    bio: 'Notes from the team on how we build, test and ship.' },
];

const categories: Category[] = [
  { id: 1, name: 'AI', slug: 'ai' },
  { id: 2, name: 'Engineering', slug: 'engineering' },
  { id: 3, name: 'SME Playbook', slug: 'sme-playbook' },
  { id: 4, name: 'Product', slug: 'product' },
];

const posts: Post[] = [
  {
    id: 1,
    title: 'What AI actually costs an SME — and where it pays for itself',
    slug: 'what-ai-actually-costs-an-sme',
    excerpt:
      'Token pricing is the smallest line on the invoice. Here is the real cost model for putting AI into a small business, and the three workflows where it reliably returns more than it takes.',
    featured_image: 'blog-ai-cost',
    featured_image_alt: 'Abstract nested frames representing layered cost analysis',
    author_id: 1,
    category: 'AI',
    status: 'published',
    published_at: '2026-08-18',
    created_at: '2026-08-14',
    updated_at: '2026-08-18',
    tags: ['ai', 'cost', 'sme'],
    read_minutes: 7,
    body: `
<p>Every quote we send for an AI feature gets the same question back: what does it cost to run? The honest answer is that the model bill is rarely the number that matters.</p>
<h2>The four costs, in order of size</h2>
<p>For a typical SME workflow — support triage, quote generation, document extraction — the annual cost breaks down roughly like this:</p>
<ol>
  <li><strong>Integration engineering.</strong> Wiring the model into the system that already holds your data. This is the largest single line, and it is one-time.</li>
  <li><strong>Evaluation and tuning.</strong> Building a test set from your real cases and tuning against it. Skipping this is how businesses end up with an AI feature nobody trusts.</li>
  <li><strong>Human review time.</strong> Someone still checks the output during the first months. Budget for it explicitly rather than pretending it is free.</li>
  <li><strong>Model usage.</strong> The token bill. For most SME volumes this lands in tens of dirhams per month, not thousands.</li>
</ol>
<h2>Where it reliably pays</h2>
<p>We only recommend AI where we can name the hours it removes. Three workflows clear that bar consistently:</p>
<h3>1. First-line support triage</h3>
<p>Classifying and routing inbound messages, drafting a first reply for a human to approve. A team handling 60 messages a day typically recovers two to three hours daily, and the accuracy is measurable from day one because you have the historical tickets to test against.</p>
<h3>2. Document extraction</h3>
<p>Invoices, delivery notes, trade licences, passports. Structured fields pulled out and validated. The win here is not just speed — it is that the error rate drops below manual entry once the validation layer is right.</p>
<h3>3. Quote and proposal drafting</h3>
<p>Assembling a first draft from your rate card, past jobs and the client brief. The salesperson edits rather than composes.</p>
<h2>Where it usually does not</h2>
<p>Anything where the output goes straight to a customer without review, anything where the training data does not exist inside your business yet, and anything that is really a process problem wearing an AI costume. We say so when we see it.</p>
<h2>The test we apply</h2>
<p>Before we build an AI feature we write down the current cost of the task in hours per week, and the accuracy threshold at which the automated version becomes acceptable. If we cannot fill in both numbers, the feature does not get built. That single discipline has killed more proposals than any technical constraint.</p>
`.trim(),
  },
  {
    id: 2,
    title: 'Why we verify everything twice (and what that actually means)',
    slug: 'why-we-verify-everything-twice',
    excerpt:
      'Our name sets an expectation. Here is the three-layer review process behind it — automated, AI-assisted and human — and the specific classes of bug each layer is good at catching.',
    featured_image: 'blog-verify',
    featured_image_alt: 'Nested review frames illustrating a layered quality process',
    author_id: 2,
    category: 'Engineering',
    status: 'published',
    published_at: '2026-08-11',
    created_at: '2026-08-08',
    updated_at: '2026-08-11',
    tags: ['quality', 'process', 'testing'],
    read_minutes: 6,
    body: `
<p>Calling a company ErrorsFree is either a promise or a liability. We treat it as a process obligation, so this is the process.</p>
<h2>Layer one — automated</h2>
<p>Type checking, linting, unit tests and an end-to-end run against the critical paths. This layer is fast, runs on every commit, and is genuinely good at exactly one thing: catching the mistake you made in the last ten minutes. It catches almost nothing about whether the feature is right.</p>
<h2>Layer two — AI review</h2>
<p>Every change is read by a model with the surrounding code in context, prompted to look for the specific failure classes that slip past tests: unhandled null paths, off-by-one boundaries, race conditions in async flows, missing authorisation checks, and error states that were written but never rendered.</p>
<p>This layer produces false positives. That is fine — a false positive costs a minute; the bug it was hunting costs a support call, a refund, or a client's trust.</p>
<h2>Layer three — human</h2>
<p>An engineer who did not write the change uses the feature the way a customer would, on a real device, with realistic data. This is the only layer that catches the most expensive category of defect: the feature that works exactly as specified and is still wrong.</p>
<h2>Why three and not one</h2>
<p>Each layer has a different blind spot. Tests do not know what the feature was for. The model does not know what your business promised the customer. The human is inconsistent and gets tired. Overlapping them means a defect has to pass three unrelated filters to reach production.</p>
<h2>What it does not mean</h2>
<p>It does not mean zero bugs. Nobody ships zero bugs. It means the ones that reach you are rare, small, and fixed the same week — and that we found most of them before you did.</p>
`.trim(),
  },
  {
    id: 3,
    title: 'Build, buy, or leave it alone: a decision framework for SME software',
    slug: 'build-buy-or-leave-it-alone',
    excerpt:
      'A development studio telling you when not to hire a development studio. Four questions that decide whether a problem deserves custom software, an off-the-shelf subscription, or nothing at all.',
    featured_image: 'blog-build-buy',
    featured_image_alt: 'Decision paths rendered as nested geometric frames',
    author_id: 1,
    category: 'SME Playbook',
    status: 'published',
    published_at: '2026-08-04',
    created_at: '2026-07-30',
    updated_at: '2026-08-04',
    tags: ['strategy', 'sme', 'consulting'],
    read_minutes: 8,
    body: `
<p>Roughly a third of the enquiries we receive should not become projects. Here is the framework we use to work that out, offered so you can apply it before you call anyone.</p>
<h2>Question 1: Is this process stable?</h2>
<p>Custom software encodes a process. If the process is still changing every month, you will be paying to rebuild the encoding every month. Stabilise the workflow on paper or in a spreadsheet first — then automate the version that stopped changing.</p>
<h2>Question 2: Is the process actually yours?</h2>
<p>Accounting, payroll, email, storage, CRM basics — these are solved problems and somebody sells the solution for a monthly fee that is smaller than one day of engineering. Custom software is worth it where your process is genuinely unusual, and that is normally the part of the business your customers pay you for.</p>
<h2>Question 3: What does the current version cost?</h2>
<p>Hours per week, multiplied by loaded hourly cost, multiplied by fifty. Add the cost of the mistakes the manual process causes. If that annual number is not a meaningful multiple of the build cost, leave it alone — the return will not arrive.</p>
<h2>Question 4: Who owns it afterwards?</h2>
<p>Every custom system needs somebody who can change it. If there is no answer to that question at your company and no budget for a retainer, buy something instead, even if it fits worse.</p>
<h2>The uncomfortable pattern</h2>
<p>The most common right answer for a business under about twenty people is: buy the standard tools, integrate them properly, and build custom software for exactly one thing — the operation that makes you different. The integration work is unglamorous and it is usually where the largest return sits.</p>
<h2>When custom clearly wins</h2>
<p>When the process is your competitive advantage; when off-the-shelf options force a workflow that costs you customers; when you are paying for six subscriptions that half-overlap; or when the data trapped in those tools is worth more joined up than separate.</p>
`.trim(),
  },
  {
    id: 4,
    title: 'Shipping software that has to work in Arabic and English',
    slug: 'shipping-bilingual-software-gcc',
    excerpt:
      'Right-to-left is not a stylesheet toggle. The layout, data, typography and testing decisions that make bilingual products work in the Gulf — from a team that has got them wrong before.',
    featured_image: 'blog-bilingual',
    featured_image_alt: 'Mirrored nested frames representing bidirectional layout',
    author_id: 2,
    category: 'Engineering',
    status: 'published',
    published_at: '2026-07-24',
    created_at: '2026-07-20',
    updated_at: '2026-07-24',
    tags: ['i18n', 'rtl', 'gcc'],
    read_minutes: 9,
    body: `
<p>Every GCC product eventually needs Arabic. Adding it late costs several times what designing for it costs. These are the decisions that matter.</p>
<h2>Use logical properties from day one</h2>
<p>Write <code>margin-inline-start</code>, not <code>margin-left</code>. Write <code>padding-block</code>, not <code>padding-top</code>. Do this from the first component and the right-to-left version is close to free. Retrofit it later and you are auditing every stylesheet in the codebase.</p>
<h2>Direction is a document property, not a language property</h2>
<p>Set <code>dir</code> on the root element and let it inherit. Then handle the genuinely bidirectional cases explicitly: an Arabic sentence containing a Latin product name, a phone number inside Arabic text, a mixed-script table cell. These are where naive implementations break visibly.</p>
<h2>Numbers need a decision, not a default</h2>
<p>Arabic-Indic or Western digits? Both are correct in different Gulf contexts, and the answer often differs between the invoice and the dashboard. Decide per surface, store the raw value, and format at render time.</p>
<h2>Typography is not symmetrical</h2>
<p>Arabic type needs more line height than Latin at the same size, and the visual weight of a font rarely matches its Latin counterpart. Pair the fonts deliberately and set separate line-height for each direction, or the Arabic side will read as cramped and cheap.</p>
<h2>Content length changes everything</h2>
<p>Arabic translations commonly run shorter than English, and German-style overflow is not your problem here — truncation and awkward whitespace are. Test every layout with real translated copy, never with duplicated English.</p>
<h2>Test in the mirror</h2>
<p>Screenshot both directions in continuous integration. A visual diff on the right-to-left build catches the icons that did not flip, the arrows now pointing the wrong way, and the shadows falling on the wrong side — all of which look obviously broken to a native reader and completely fine to a developer who does not read Arabic.</p>
`.trim(),
  },
  {
    id: 5,
    title: 'How we scope a v1 that ships in six weeks',
    slug: 'how-we-scope-a-six-week-v1',
    excerpt:
      'Fixed timeline, variable scope. The cutting method we use to get a real application into a client’s hands in weeks — including the four categories of work we always defer.',
    featured_image: 'blog-scoping',
    featured_image_alt: 'A spiral of nested frames narrowing to a single core',
    author_id: 1,
    category: 'Product',
    status: 'published',
    published_at: '2026-07-15',
    created_at: '2026-07-11',
    updated_at: '2026-07-15',
    tags: ['scoping', 'delivery', 'product'],
    read_minutes: 6,
    body: `
<p>We hold the timeline fixed and let scope move. That inverts the usual arrangement, and it is the single change that most improves the outcome.</p>
<h2>Find the one loop</h2>
<p>Every operational application has one loop that carries the value — the job gets booked, the invoice goes out, the report gets filed. Everything else is support for that loop. We identify it in the first session and protect it absolutely.</p>
<h2>What always ships in v1</h2>
<ul>
  <li>The core loop, end to end, for the primary user.</li>
  <li>Authentication and the permission model.</li>
  <li>The data model in a shape that will not need migrating.</li>
  <li>Whatever the loop needs to be trusted with real data.</li>
</ul>
<h2>What we defer, every time</h2>
<ul>
  <li><strong>Reporting and dashboards.</strong> You cannot design useful reports before real data exists. Building them in v1 guarantees rework.</li>
  <li><strong>Edge-case roles.</strong> The fourth user type who logs in twice a month.</li>
  <li><strong>Bulk import.</strong> Almost always cheaper as a one-time script we run for you.</li>
  <li><strong>Notification breadth.</strong> One channel that works beats four that half-work.</li>
</ul>
<h2>Why deferring is not cutting</h2>
<p>Deferred work is written down with its estimate and reviewed after four weeks of real usage. Consistently, about a third of it turns out to be unnecessary, and something nobody thought of in the scoping session turns out to matter more. Shipping early is what surfaces that.</p>
<h2>The one thing we never defer</h2>
<p>The data model. Interfaces are cheap to change and schemas are expensive, so the schema gets the disproportionate share of the thinking up front. Everything else can move.</p>
`.trim(),
  },
  {
    id: 6,
    title: 'The five internal tools we built for ourselves — and shipped',
    slug: 'five-internal-tools-we-shipped',
    excerpt:
      'A tour of the products behind our second revenue line, what each one solves, and the pattern that decides which internal tool is worth turning into a product.',
    featured_image: 'blog-internal-tools',
    featured_image_alt: 'Five nested product frames arranged in a recursive grid',
    author_id: 2,
    category: 'Product',
    status: 'published',
    published_at: '2026-07-02',
    created_at: '2026-06-28',
    updated_at: '2026-07-02',
    tags: ['saas', 'products', 'internal-tools'],
    read_minutes: 5,
    body: `
<p>Half of our revenue comes from client work and half from our own products. Every one of those products started as something we built to solve our own problem.</p>
<h2>Talent Management System</h2>
<p>Built because tracking candidates across three spreadsheets and a WhatsApp group stopped scaling at about forty applicants. Now runs hiring pipelines for teams that have the same problem.</p>
<h2>WordPress Web Scanner</h2>
<p>We inherit a lot of legacy WordPress sites during consultancy work and needed a fast, honest answer to "how exposed is this?". It checks plugin vulnerabilities, exposed endpoints and configuration errors, and produces a report a non-technical owner can act on.</p>
<h2>Social Audit</h2>
<p>An analysis pass over a brand's social presence — consistency, cadence, engagement patterns — that we originally ran manually for every new client during onboarding.</p>
<h2>Image Combiner</h2>
<p>Small, fast, and used constantly: batch composition of product and marketing images to consistent specifications. The most-used tool we own by a wide margin.</p>
<h2>AGN–H₀ Correlation Analysis</h2>
<p>A research-grade data analysis tool, and the odd one out. It exists because a client needed it and it turned out to be genuinely useful to a field. We keep it running.</p>
<h2>The pattern</h2>
<p>An internal tool is worth productising when three things are true: we use it weekly, we have watched at least three other businesses solve the same problem badly, and the interface is the hard part rather than the domain knowledge. Tools that fail the third test stay internal — they need an expert operator, and that does not scale into a subscription.</p>
`.trim(),
  },
];

/* ------------------------------- API -------------------------------
   These accessors were written async from day one so Phase 2 would be a
   change of transport, not of structure. That is now the case: with
   EF_API_URL set they read from the MySQL-backed API, and every page,
   component and template below them is untouched.
   ------------------------------------------------------------------- */

/** Cached for the life of a build so one API call serves every page. */
let apiPosts: Post[] | null = null;

async function livePosts(): Promise<Post[]> {
  if (apiPosts === null) {
    apiPosts = await apiGet<Post[]>('posts');
  }
  return apiPosts;
}

async function source(): Promise<Post[]> {
  return useApi() ? await livePosts() : posts;
}

const published = (p: Post) => p.status === 'published';
const byDateDesc = (a: Post, b: Post) => +new Date(b.published_at) - +new Date(a.published_at);

/** All published posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  return (await source()).filter(published).sort(byDateDesc);
}

/** One post by slug, or null. Returns drafts only in dev. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  return (await source()).find((p) => p.slug === slug && published(p)) ?? null;
}

/** Posts sharing a category or tag, excluding the current post. */
export async function getRelatedPosts(post: Post, limit = 3): Promise<Post[]> {
  const all = await getPosts();
  const scored = all
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      post: p,
      score: (p.category === post.category ? 2 : 0) + p.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score || byDateDesc(a.post, b.post));
  return scored.slice(0, limit).map((s) => s.post);
}

export async function getAuthor(id: number): Promise<Author> {
  const all = useApi() ? await apiGet<Author[]>('authors') : authors;
  return all.find((a) => a.id === id) ?? all[all.length - 1] ?? authors[1]!;
}

/** Categories that have at least one published post, with counts. */
export async function getCategories(): Promise<(Category & { count: number })[]> {
  const all = await getPosts();
  return categories
    .map((c) => ({ ...c, count: all.filter((p) => p.category === c.name).length }))
    .filter((c) => c.count > 0);
}

/** Formats a stored date for display. Kept here so it is consistent everywhere. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
