/**
 * The delivery loop rendered by the Droste process section.
 * Four steps that close back on themselves — the site's central metaphor
 * stated as an actual process rather than only as a graphic.
 */
export interface ProcessStep {
  n: string;
  title: string;
  body: string;
}

export const processSteps: ProcessStep[] = [
  { n: '01', title: 'Build',
    body: 'A working slice of the real product, on a live link, within days. Not a mockup — something you can use.' },
  { n: '02', title: 'Test',
    body: 'Automated checks, an AI review pass over every change, and a human using it the way your customer will.' },
  { n: '03', title: 'Refine',
    body: 'What the tests and the usage surfaced gets fixed before anything new gets added on top of it.' },
  { n: '04', title: 'Repeat',
    body: 'The loop runs again on the next slice — each pass tighter than the last, until there is nothing left to catch.' },
];

export const team = [
  { name: 'Zubair Ahmed', role: 'Founder & Principal Engineer',
    bio: 'Fifteen years building software for businesses that had outgrown the tools they started with. Leads architecture and client engagements.' },
  { name: 'Engineering', role: 'Build & Verification',
    bio: 'The people who write the code and the people who try to break it — deliberately never the same person on the same change.' },
  { name: 'AI Practice', role: 'Applied Machine Learning',
    bio: 'Model selection, evaluation harnesses and the guardrails that make generated output safe to put in front of a customer.' },
  { name: 'Consultancy', role: 'Strategy & Audit',
    bio: 'The team that will tell you not to build something. Systems audits, cost modelling and build-versus-buy calls.' },
];
