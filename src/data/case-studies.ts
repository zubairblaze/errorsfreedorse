/* =====================================================================
   Case studies.

   PHASE 2 CONTRACT — same shape as the blog layer, deliberately.

     case_studies(id, title, slug, client, sector, excerpt, body,
                  featured_image, challenge, approach, outcome,
                  services, results, duration, status, published_at,
                  created_at, updated_at)

   Every accessor below is async and returns exactly what the components
   already consume, so Phase 2 replaces the function bodies and nothing
   else. `body` is stored HTML, as a CMS would supply it.

   On honesty: client names are withheld where they are confidential, and
   the sector and problem are described instead. No invented logos and no
   numbers we cannot evidence.
   ===================================================================== */

import { apiGet, useApi } from '../lib/api.ts';

export type CaseStatus = 'draft' | 'published';

export interface CaseResult {
  value: string;
  label: string;
}

export interface CaseStudy {
  id: number;
  title: string;
  slug: string;
  client: string;
  sector: string;
  excerpt: string;
  /** Image-registry key in Phase 1, an uploaded path in Phase 2. */
  featured_image: string | null;
  featured_image_alt: string;
  /** The three-act spine every case study shares. */
  challenge: string;
  approach: string;
  outcome: string;
  /** Rendered HTML for the long-form middle of the page. */
  body: string;
  services: string[];
  results: CaseResult[];
  duration: string;
  status: CaseStatus;
  published_at: string;
  created_at: string;
  updated_at: string;
  read_minutes: number;
}

const caseStudies: CaseStudy[] = [
  {
    id: 1,
    title: 'Replacing eleven spreadsheets with one stockroom app',
    slug: 'retail-group-stock-operations',
    client: 'Confidential — retail group, 6 stores',
    sector: 'Retail',
    excerpt:
      'A growing retail group was running stock across eleven spreadsheets and a WhatsApp group. We replaced the whole arrangement with one application in five weeks — and deliberately left three of the spreadsheets alone.',
    featured_image: 'case-retail',
    featured_image_alt: 'A calm warehouse interior with tidy shelving of plain cartons and a barcode scanner on a counter.',
    challenge:
      'Six stores, one central stockroom, and no single answer to "how many do we have?". Stock counts lived in eleven spreadsheets owned by different people, reconciled by hand every Thursday, and transfers between stores were agreed in a WhatsApp group and then forgotten.',
    approach:
      'We spent two days in the stockroom before writing anything. The real bottleneck was not counting — it was transfers between stores, which nobody owned. We built that flow first and left counting on paper until the transfer loop was trusted.',
    outcome:
      'One application covering intake, transfers and counts, with the weekly reconciliation reduced to a review rather than a rebuild. Three spreadsheets survived on our recommendation: they were doing fine.',
    services: ['App Development', 'Consultancy'],
    results: [
      { value: '5 weeks', label: 'Brief to production' },
      { value: '11 → 3', label: 'Spreadsheets remaining' },
      { value: 'Thu', label: 'Reconciliation day recovered' },
    ],
    duration: '5 weeks',
    status: 'published',
    published_at: '2026-07-28',
    created_at: '2026-07-20',
    updated_at: '2026-07-28',
    read_minutes: 6,
    body: `
<h2>What we found</h2>
<p>The brief we were given was "we need an inventory system". The brief we ended up building against was narrower and more useful: <em>we need to know what has been promised to another store and not yet moved</em>.</p>
<p>That distinction came out of two days on site. Counting stock was tedious but broadly correct. Transfers were the failure: a manager would ask another store for six units in a WhatsApp group, the other store would agree, and the units would sit in a back room for a week because nothing had made it anyone's job.</p>
<h2>What we built first</h2>
<p>The transfer loop, end to end, for one pair of stores. Request, accept, pick, dispatch, receive. Nothing else — no reporting, no counting, no analytics.</p>
<p>It went live in eleven days with two stores using it and the other four still on WhatsApp. That was intentional: the fastest way to find out whether the model was right was to have it used in anger next to the thing it was replacing.</p>
<h2>What changed after real use</h2>
<p>Two assumptions did not survive contact:</p>
<ul>
  <li><strong>Partial fulfilment.</strong> We modelled transfers as all-or-nothing. In practice a store sends four of the six and promises the rest. That reshaped the schema in week two, which is exactly when you want a schema reshaped.</li>
  <li><strong>Who accepts.</strong> We assumed the receiving manager accepts. In practice whoever is on the floor accepts, then tells the manager. Adding a role check would have been correct and would have made the app useless.</li>
</ul>
<h2>What we told them not to build</h2>
<p>Supplier ordering, a loyalty integration, and a live dashboard for the owner. The first two were adequately handled by tools they already paid for. The third we deferred until there was six months of real data to put in it, on the grounds that a dashboard designed before the data exists is decoration.</p>
<h2>Where it stands</h2>
<p>All six stores are on it. The Thursday reconciliation still happens, but it is a review of exceptions rather than a rebuild from eleven sources. Three spreadsheets are still in use and we recommended keeping every one of them.</p>
`.trim(),
  },
  {
    id: 2,
    title: 'Reading delivery paperwork so a dispatcher does not have to',
    slug: 'logistics-document-extraction',
    client: 'Confidential — freight and customs brokerage',
    sector: 'Logistics',
    excerpt:
      'A brokerage was retyping fields from delivery notes and customs paperwork into three systems. We built the extraction layer, and the accuracy argument turned out to be the easy part.',
    featured_image: 'case-logistics',
    featured_image_alt: 'Unmarked shipping containers stacked in rows on a concrete apron at first light.',
    challenge:
      'Every consignment arrived as a PDF or a phone photograph. A dispatcher read it, then typed the same eight fields into three different systems. Roughly ninety consignments a day, and the errors that slipped through were expensive to unwind at a border.',
    approach:
      'We built an extraction pipeline with a mandatory human approval step, and — the part that mattered — an evaluation set of six hundred of their own historical documents, so accuracy was a measured number rather than a promise.',
    outcome:
      'Extraction with structured validation and a one-screen approval queue. The dispatcher confirms rather than transcribes. Anything below the confidence threshold routes to a human automatically and is never guessed at.',
    services: ['AI Integration', 'App Development'],
    results: [
      { value: '600', label: 'Documents in the evaluation set' },
      { value: '3 → 1', label: 'Systems typed into' },
      { value: '100%', label: 'Output passes human approval' },
    ],
    duration: '4 weeks',
    status: 'published',
    published_at: '2026-06-16',
    created_at: '2026-06-09',
    updated_at: '2026-06-16',
    read_minutes: 7,
    body: `
<h2>The argument we had to win first</h2>
<p>Nobody at the brokerage doubted that a model could read a delivery note. What they doubted, correctly, was whether they would ever be able to trust it — because a wrong figure on a customs declaration is not a support ticket, it is a delay at a border and a cost.</p>
<p>So the first thing we built was not extraction. It was the measurement.</p>
<h2>Six hundred of their own documents</h2>
<p>We assembled an evaluation set from their archive: six hundred real consignments, deliberately including the bad ones — creased photographs, handwritten amendments, two languages on one page, a stamp across a figure. Each was labelled by hand with the correct eight fields.</p>
<p>That set is the deliverable people forget to ask for. It made every subsequent change measurable, and it is theirs. When they change providers or a model is retired, they can re-run it in an afternoon.</p>
<h2>Validation before confidence</h2>
<p>Structured checks run before anything reaches a person: does the weight parse as a number, does the date fall in a plausible range, does the consignment reference match the expected format, do the line items sum to the declared total. A field that fails a check is never presented as extracted — it is presented as missing.</p>
<p>This matters more than raw model accuracy. A confidently wrong figure is far more expensive than a blank one, because a blank one gets typed in.</p>
<h2>The approval queue</h2>
<p>One screen: the document on the left, the eight extracted fields on the right, each one editable, low-confidence fields highlighted. The dispatcher confirms or corrects, and the correction is captured — it feeds the evaluation set.</p>
<p>We did not build an auto-approve path, and we argued against one. The time saved by removing the human is small compared with the time spent unwinding one bad declaration.</p>
<h2>What we would do differently</h2>
<p>We under-scoped the handwriting cases. Amendments scribbled on a printed note are common in this trade and are genuinely hard; we should have carved them out as an explicit route-to-human from day one rather than discovering it in week three.</p>
`.trim(),
  },
  {
    id: 3,
    title: 'A booking flow that stopped losing patients at the last step',
    slug: 'clinic-booking-flow',
    client: 'Confidential — multi-site medical clinic',
    sector: 'Healthcare',
    excerpt:
      'The clinic assumed it had a marketing problem. The analytics said otherwise: people were arriving, choosing a time, and abandoning on the form. We rebuilt the last screen and left the rest alone.',
    featured_image: 'case-clinic',
    featured_image_alt: 'An empty modern clinic reception with a pale stone counter and soft indirect lighting.',
    challenge:
      'Online bookings were far below what the clinic\'s traffic suggested. The assumption in the room was that the site needed a redesign and more advertising spend.',
    approach:
      'We instrumented the existing funnel before proposing anything. Two weeks of data showed the drop was almost entirely on the final form — and heavily weighted toward mobile and toward Arabic-language sessions.',
    outcome:
      'A rebuilt final step: fewer required fields, a working Arabic layout, and confirmation that does not depend on the patient having an email address. No redesign, no additional ad spend.',
    services: ['Consultancy', 'App Development'],
    results: [
      { value: '2 weeks', label: 'Measuring before building' },
      { value: '1 screen', label: 'Scope of the rebuild' },
      { value: 'AED 0', label: 'Additional ad spend recommended' },
    ],
    duration: '3 weeks',
    status: 'published',
    published_at: '2026-05-19',
    created_at: '2026-05-12',
    updated_at: '2026-05-19',
    read_minutes: 5,
    body: `
<h2>The brief was a redesign</h2>
<p>We were asked to quote for a new website. We asked to spend two weeks measuring the existing one first, at our cost, before anyone committed to a build. That is usually the most valuable fortnight in an engagement.</p>
<h2>What the funnel showed</h2>
<p>Traffic was healthy. People were finding the clinic, choosing a service, and choosing a time. The collapse was on the final form — and it was not uniform:</p>
<ul>
  <li>Mobile sessions abandoned at roughly twice the rate of desktop.</li>
  <li>Sessions in Arabic abandoned at a markedly higher rate still.</li>
  <li>A meaningful share of abandonment happened at the email field specifically.</li>
</ul>
<p>None of that is a marketing problem, and none of it is fixed by a redesign.</p>
<h2>Three things on one screen</h2>
<p><strong>Fewer required fields.</strong> The form asked for eight. Four were needed to make a booking; the rest were wanted by the practice management system and could be collected at reception. We cut it to four.</p>
<p><strong>An Arabic layout that actually worked.</strong> The right-to-left version had been produced by flipping a stylesheet. Labels sat on the wrong side of their inputs, the phone field forced Western digits, and the date picker read backwards. We rebuilt the form with logical properties and tested it with native readers rather than with a mirrored screenshot.</p>
<p><strong>Confirmation without email.</strong> A significant number of patients simply do not want to give an email address to book a physical appointment. Making it optional, with SMS confirmation instead, removed the single largest abandonment point.</p>
<h2>What we did not do</h2>
<p>We did not redesign the site, did not touch the service pages, and recommended against increasing ad spend until the funnel had been re-measured. The engagement came in well below the quote they were expecting for a rebuild, which is an awkward thing to be proud of and the right outcome.</p>
<h2>Honest caveat</h2>
<p>We have deliberately not published a conversion-rate figure here. The change went live alongside a seasonal swing in demand, and separating the two cleanly would require an A/B test the clinic did not have the traffic to run. The abandonment point moved; attributing a precise revenue number to it would be a story rather than a measurement.</p>
`.trim(),
  },
];

/* ------------------------------- API -------------------------------
   With EF_API_URL set these read from the MySQL-backed backend; without
   it, from the fixtures above. Nothing downstream changes either way.
   ------------------------------------------------------------------- */

let apiCases: CaseStudy[] | null = null;

async function source(): Promise<CaseStudy[]> {
  if (!useApi()) return caseStudies;
  if (apiCases === null) {
    apiCases = await apiGet<CaseStudy[]>('case-studies');
  }
  return apiCases;
}

const published = (c: CaseStudy) => c.status === 'published';
const byDateDesc = (a: CaseStudy, b: CaseStudy) =>
  +new Date(b.published_at) - +new Date(a.published_at);

/** All published case studies, newest first. */
export async function getCaseStudies(): Promise<CaseStudy[]> {
  return (await source()).filter(published).sort(byDateDesc);
}

/** One case study by slug, or null. */
export async function getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  return (await source()).find((c) => c.slug === slug && published(c)) ?? null;
}

/** Others in the same sector or sharing a service, excluding this one. */
export async function getRelatedCaseStudies(current: CaseStudy, limit = 2): Promise<CaseStudy[]> {
  const all = await getCaseStudies();
  return all
    .filter((c) => c.id !== current.id)
    .map((c) => ({
      item: c,
      score:
        (c.sector === current.sector ? 2 : 0) +
        c.services.filter((s) => current.services.includes(s)).length,
    }))
    .sort((a, b) => b.score - a.score || byDateDesc(a.item, b.item))
    .slice(0, limit)
    .map((s) => s.item);
}

/** Sectors that have at least one published case study, with counts. */
export async function getCaseSectors(): Promise<{ name: string; count: number }[]> {
  const all = await getCaseStudies();
  const counts = new Map<string, number>();
  for (const c of all) counts.set(c.sector, (counts.get(c.sector) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}
