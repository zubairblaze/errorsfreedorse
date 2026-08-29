/**
 * Service catalogue. Drives /services/ and every /services/[slug]/ page.
 * Field names mirror a future `services` table so Phase 2 can swap the
 * import for an API call with no component changes.
 */

export interface ServiceFeature {
  title: string;
  body: string;
}

export interface Service {
  slug: string;
  title: string;
  /** Short label for nav and cards. */
  short: string;
  /** One line, used on the services grid. */
  excerpt: string;
  /** Opening paragraph of the detail page. */
  intro: string;
  /** Icon key resolved by components/Icons.astro. */
  icon: 'app' | 'ai' | 'saas' | 'consult';
  /** Deliverables list — what the client actually receives. */
  deliverables: string[];
  features: ServiceFeature[];
  /** Ordered engagement steps for the detail page. */
  process: { step: string; body: string }[];
  /** Indicative commercials — deliberately ranged, not fixed. */
  engagement: { label: string; value: string }[];
  stack: string[];
  order: number;
}

export const services: Service[] = [
  {
    slug: 'app-development',
    title: 'Custom App Development',
    short: 'App Development',
    excerpt: 'Web and mobile applications built to your operation, not to a template.',
    intro:
      'Most SMEs in the region run on a patchwork of spreadsheets, WhatsApp threads and software that was never designed for how they actually work. We replace that with one application built around your process — web, mobile, or both — and we hand you the code.',
    icon: 'app',
    deliverables: [
      'Production web or mobile application',
      'Admin panel for your team',
      'Full source code and repository ownership',
      'Deployment on your hosting or ours',
      'Technical documentation and handover session',
    ],
    features: [
      {
        title: 'Built around your process',
        body: 'We map how your business actually runs before writing a line of code. The software adapts to the operation — never the reverse.',
      },
      {
        title: 'Ships in weeks, not quarters',
        body: 'A working v1 in your hands in two to six weeks. You review something real early, and every iteration after that is short.',
      },
      {
        title: 'You own everything',
        body: 'Source code, repository, database, deployment. No licence to keep paying, no vendor you cannot leave.',
      },
      {
        title: 'Built to be extended',
        body: 'Clear structure, documented decisions and a schema that has room to grow, so the next developer — ours or yours — is not starting from archaeology.',
      },
    ],
    process: [
      { step: 'Map', body: 'A working session on your operation: what happens today, where it breaks, what a fix is worth.' },
      { step: 'Prototype', body: 'A clickable prototype of the core flow within days. We agree on the shape before we build it.' },
      { step: 'Build', body: 'Weekly builds on a live staging link. You use it as it grows rather than waiting for a reveal.' },
      { step: 'Verify', body: 'Automated tests, AI review and a human pass over every release candidate.' },
      { step: 'Hand over', body: 'Deployment, documentation, a walkthrough with your team, and the keys.' },
    ],
    engagement: [
      { label: 'Typical timeline', value: '2–6 weeks to v1' },
      { label: 'Engagement', value: 'Fixed-scope project or monthly retainer' },
      { label: 'Best for', value: 'Operations software, client portals, booking and field tools' },
    ],
    stack: ['TypeScript', 'React / Next.js', 'Astro', 'Node.js', 'PHP / Laravel', 'MySQL', 'PostgreSQL', 'React Native'],
    order: 1,
  },
  {
    slug: 'ai-integration',
    title: 'AI Integration',
    short: 'AI Integration',
    excerpt: 'Models wired into the workflows where they actually save hours.',
    intro:
      'AI earns its place when it removes a job nobody wanted to do. We find those jobs inside your business — the quoting, the triage, the document handling, the first-line replies — and build them into your existing systems with the guardrails to make the output trustworthy.',
    icon: 'ai',
    deliverables: [
      'AI features integrated into your live systems',
      'Prompt and evaluation suite you can maintain',
      'Human-in-the-loop review workflow',
      'Cost and usage monitoring',
      'Fallback behaviour for every AI call',
    ],
    features: [
      {
        title: 'Applied to real bottlenecks',
        body: 'We audit where your team loses hours, then automate those specific steps. No AI features added for the announcement.',
      },
      {
        title: 'Verified output, not raw output',
        body: 'Every generated result passes structured validation before a human sees it. Confidence is measured, not assumed.',
      },
      {
        title: 'Arabic and English',
        body: 'Built and evaluated for both, because half of the region’s customer conversations are not in English.',
      },
      {
        title: 'Costed before it is built',
        body: 'Token economics modelled up front so a feature that cannot pay for itself never reaches production.',
      },
    ],
    process: [
      { step: 'Audit', body: 'We shadow the workflow and quantify the hours currently spent on it.' },
      { step: 'Model', body: 'Model selection, prompt design and an evaluation set built from your own real cases.' },
      { step: 'Integrate', body: 'Wired into the tools your team already opens — not a separate portal nobody visits.' },
      { step: 'Measure', body: 'Accuracy, latency and cost tracked against the baseline we recorded in the audit.' },
      { step: 'Tune', body: 'Prompts and thresholds refined against live results until the numbers hold.' },
    ],
    engagement: [
      { label: 'Typical timeline', value: '1–4 weeks per workflow' },
      { label: 'Engagement', value: 'Discovery sprint, then build' },
      { label: 'Best for', value: 'Support triage, document processing, quoting, content operations' },
    ],
    stack: ['Claude', 'OpenAI', 'Retrieval pipelines', 'Vector search', 'Evaluation harnesses', 'Queue workers'],
    order: 2,
  },
  {
    slug: 'saas-products',
    title: 'SaaS Products',
    short: 'SaaS Products',
    excerpt: 'Our own tools — and the platform to launch yours.',
    intro:
      'We run a second business alongside the studio: we build and operate our own SaaS products. That means the multi-tenant architecture, billing, onboarding and reliability work is not theory to us. When you want to launch a product rather than a project, that experience comes with us.',
    icon: 'saas',
    deliverables: [
      'Multi-tenant application architecture',
      'Subscription billing and plan management',
      'Onboarding and self-service signup',
      'Usage analytics and admin tooling',
      'Launch and iteration roadmap',
    ],
    features: [
      {
        title: 'Products already in production',
        body: 'Five tools of our own running live — from a talent management system to a WordPress security scanner. The patterns are proven before they reach your build.',
      },
      {
        title: 'Billing that is not an afterthought',
        body: 'Plans, trials, upgrades, failed payments and invoicing designed in from the first schema, not bolted on at launch.',
      },
      {
        title: 'Built to be operated',
        body: 'Admin tooling, usage visibility and support workflows so the product can be run by your team rather than by us forever.',
      },
      {
        title: 'Regionally aware',
        body: 'VAT handling, AED pricing, local payment rails and Arabic-ready interfaces where your market needs them.',
      },
    ],
    process: [
      { step: 'Position', body: 'Who it is for, what it replaces, and what someone would cancel to pay for it.' },
      { step: 'Shape', body: 'The smallest product that is genuinely worth paying for — scoped and priced.' },
      { step: 'Build', body: 'Multi-tenant foundation, billing and the core loop, in that order.' },
      { step: 'Launch', body: 'Onboarding, analytics and a first cohort of real users.' },
      { step: 'Iterate', body: 'Retention and activation data drives what gets built next.' },
    ],
    engagement: [
      { label: 'Typical timeline', value: '6–12 weeks to launch' },
      { label: 'Engagement', value: 'Product partnership or build-and-transfer' },
      { label: 'Best for', value: 'Founders and firms productising an in-house tool' },
    ],
    stack: ['Multi-tenant schemas', 'Stripe', 'Role-based access', 'Background jobs', 'Analytics', 'Observability'],
    order: 3,
  },
  {
    slug: 'digital-consultancy',
    title: 'Digital Consultancy',
    short: 'Consultancy',
    excerpt: 'A straight answer on what to build, what to buy, and what to stop paying for.',
    intro:
      'Sometimes the right recommendation is not a build. We audit what you are running, what it costs and what it is costing you in time, then give you a prioritised plan — including the parts you should hand to off-the-shelf software instead of to us.',
    icon: 'consult',
    deliverables: [
      'Systems and tooling audit',
      'Prioritised roadmap with effort and cost estimates',
      'Build-versus-buy recommendation per item',
      'Vendor and licence review',
      'Executive summary for your board or partners',
    ],
    features: [
      {
        title: 'Advice that survives contact with cost',
        body: 'Every recommendation carries an estimate and an expected return. If the numbers do not work, we say so.',
      },
      {
        title: 'We will tell you not to build',
        body: 'Where an existing product does the job for a fraction of a custom build, that is the recommendation you get.',
      },
      {
        title: 'Written for decision-makers',
        body: 'A document your finance director can act on, not a slide deck of architecture diagrams.',
      },
      {
        title: 'No obligation to continue',
        body: 'The roadmap is yours. Take it to us, to your in-house team, or to anyone else.',
      },
    ],
    process: [
      { step: 'Interview', body: 'Sessions with the people who actually use the systems every day.' },
      { step: 'Inventory', body: 'Every tool, licence, spreadsheet and manual step, with its real annual cost.' },
      { step: 'Assess', body: 'Where the time goes, where the risk sits, and what a fix is worth.' },
      { step: 'Recommend', body: 'A ranked plan: fix, replace, build or leave alone.' },
      { step: 'Review', body: 'A working session to pressure-test the plan with your team before you commit.' },
    ],
    engagement: [
      { label: 'Typical timeline', value: '1–3 weeks' },
      { label: 'Engagement', value: 'Fixed-fee audit' },
      { label: 'Best for', value: 'Businesses unsure whether to build, buy or consolidate' },
    ],
    stack: ['Process mapping', 'Cost modelling', 'Vendor assessment', 'Architecture review', 'Security posture'],
    order: 4,
  },
];

export const getService = (slug: string): Service | undefined => services.find((s) => s.slug === slug);
