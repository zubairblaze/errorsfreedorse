/**
 * Case studies and our own SaaS products.
 * Shaped for a future `projects` table (id, title, slug, client, sector,
 * summary, body, cover, year, services, results, status).
 */

export interface Project {
  id: number;
  slug: string;
  title: string;
  client: string;
  sector: string;
  year: string;
  summary: string;
  /** Which of our services the engagement used — matches services[].short. */
  services: string[];
  /** Headline outcomes. Kept qualitative where we cannot evidence a number. */
  results: { value: string; label: string }[];
  /** Set for our own products; null for client work. */
  productUrl: string | null;
  featured: boolean;
}

export const projects: Project[] = [
  {
    id: 1, slug: 'talent-management-system', title: 'Talent Management System',
    client: 'ErrorsFree', sector: 'Human Resources', year: '2026',
    summary:
      'Applicant tracking built after our own hiring outgrew spreadsheets. Pipelines, structured scorecards, scheduling and offer tracking in one place — now running for teams with the same problem.',
    services: ['SaaS Products', 'App Development'],
    results: [
      { value: 'Multi-tenant', label: 'Architecture' },
      { value: 'Live', label: 'In production' },
    ],
    productUrl: null, featured: true,
  },
  {
    id: 2, slug: 'wordpress-web-scanner', title: 'WordPress Web Scanner',
    client: 'ErrorsFree', sector: 'Security', year: '2026',
    summary:
      'A security posture scanner for legacy WordPress estates. Checks plugin vulnerabilities, exposed endpoints and configuration errors, then reports in language a business owner can act on rather than a CVE list.',
    services: ['SaaS Products', 'Consultancy'],
    results: [
      { value: 'Plain-English', label: 'Reporting' },
      { value: 'Live', label: 'In production' },
    ],
    productUrl: null, featured: true,
  },
  {
    id: 3, slug: 'social-audit', title: 'Social Audit',
    client: 'ErrorsFree', sector: 'Marketing', year: '2026',
    summary:
      'Automated analysis of a brand’s social presence — consistency, cadence and engagement patterns — replacing a manual review we used to run by hand for every new client.',
    services: ['AI Integration', 'SaaS Products'],
    results: [
      { value: 'Automated', label: 'Was manual onboarding' },
      { value: 'Live', label: 'In production' },
    ],
    productUrl: null, featured: true,
  },
  {
    id: 4, slug: 'image-combiner', title: 'Image Combiner',
    client: 'ErrorsFree', sector: 'Creative Operations', year: '2026',
    summary:
      'Batch composition of product and marketing imagery to consistent specifications. Small, fast, and the most-used tool we own — built in a week, paid for itself in a month.',
    services: ['SaaS Products'],
    results: [
      { value: 'Batch', label: 'Processing' },
      { value: 'Live', label: 'In production' },
    ],
    productUrl: null, featured: false,
  },
  {
    id: 5, slug: 'agn-h0-correlation-analysis', title: 'AGN–H₀ Correlation Analysis',
    client: 'Research engagement', sector: 'Scientific Computing', year: '2025',
    summary:
      'A research-grade data analysis pipeline for active galactic nuclei and Hubble constant correlation work. Built for one client, kept running because the field found it useful.',
    services: ['App Development'],
    results: [
      { value: 'Research', label: 'Grade pipeline' },
      { value: 'Maintained', label: 'Since 2025' },
    ],
    productUrl: null, featured: false,
  },
  {
    id: 6, slug: 'ai-content-engine', title: 'Brand-Voice Content Engine',
    client: 'Confidential — retail group', sector: 'Retail', year: '2025',
    summary:
      'An AI content pipeline trained on a client’s existing brand copy, producing campaign and catalogue text in their voice with a human approval step before anything publishes.',
    services: ['AI Integration'],
    results: [
      { value: 'Bilingual', label: 'Arabic & English' },
      { value: 'Human-approved', label: 'Every output' },
    ],
    productUrl: null, featured: false,
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
