/**
 * Single source of truth for company facts, navigation and defaults.
 * Phase 2 can move this to a `settings` table without touching components.
 */

export const site = {
  name: 'ErrorsFree',
  legalName: 'ErrorsFree',
  tagline: 'AI-first app development for the GCC',
  description:
    'ErrorsFree builds AI-first apps and SaaS products for small and medium businesses across the GCC — shipped fast, verified recursively, delivered error-free.',
  locale: 'en',
  region: 'AE',

  contact: {
    email: 'hello@errorsfree.com',
    phone: '+971 54 763 5672',
    phoneHref: 'tel:+971547635672',
    whatsapp: 'https://wa.me/971547635672',
    whatsappLabel: '+971 54 763 5672',
    city: 'Dubai',
    country: 'United Arab Emirates',
    address: 'Dubai, United Arab Emirates',
    hours: 'Sunday – Thursday, 9:00 – 19:00 GST',
    responseTime: 'We reply within one business hour.',
  },

  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/errorsfree' },
    { label: 'X', href: 'https://x.com/errorsfree' },
    { label: 'GitHub', href: 'https://github.com/zubairblaze' },
  ],

  /** Header navigation. Order is the order rendered. */
  nav: [
    { label: 'Services', href: '/services/' },
    { label: 'Case Studies', href: '/case-studies/' },
    { label: 'Work', href: '/work/' },
    { label: 'About', href: '/about/' },
    { label: 'Blog', href: '/blog/' },
    { label: 'Contact', href: '/contact/' },
  ],

  footerNav: [
    {
      title: 'Services',
      links: [
        { label: 'Custom App Development', href: '/services/app-development/' },
        { label: 'AI Integration', href: '/services/ai-integration/' },
        { label: 'SaaS Products', href: '/services/saas-products/' },
        { label: 'Digital Consultancy', href: '/services/digital-consultancy/' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about/' },
        { label: 'Case Studies', href: '/case-studies/' },
        { label: 'Our Work', href: '/work/' },
        { label: 'Blog', href: '/blog/' },
        { label: 'Contact', href: '/contact/' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy/' },
        { label: 'Terms of Service', href: '/terms/' },
      ],
    },
  ],

  /** Headline proof points. Kept honest and unquantified where unproven. */
  stats: [
    { value: '2–6', unit: 'weeks', label: 'From brief to shipped v1' },
    { value: '3', unit: 'layers', label: 'Automated, AI and human review' },
    { value: '5', unit: 'products', label: 'Shipped SaaS tools in production' },
    { value: '100', unit: '%', label: 'Code ownership transferred to you' },
  ],
} as const;

export type Site = typeof site;
