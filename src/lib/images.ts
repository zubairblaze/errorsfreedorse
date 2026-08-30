/**
 * Image registry.
 *
 * Art direction: every photograph is deliberately near-monochrome — cool
 * greys and a soft steel blue, very low saturation. That is not a stylistic
 * whim. The site ships four brand palettes, and saturated photography would
 * fight three of them; neutral imagery sits correctly under all four and
 * lets the accent colour come from the interface instead.
 *
 * Files live in public/images/ and are NOT committed — they are generated
 * assets, and a repo is a poor place for binaries. `resolve()` checks for
 * each file at build time:
 *
 *   present  -> the photograph is used
 *   absent   -> the component falls back to its generated nested-frame
 *               plate, exactly as before
 *
 * So the site builds and looks composed whether or not the images have been
 * fetched. Run `bash scripts/download-images.sh` to pull them in.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface SiteImage {
  /** Path relative to the site base, e.g. /images/about-studio.webp */
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Registry key -> descriptive alt text and intrinsic size. */
const REGISTRY = {
  'about-studio': {
    alt: 'Two monitors on a pale desk in a minimal studio, one showing code and one a wireframe layout, lit by soft morning daylight.',
    width: 2688, height: 1536,
  },
  'region-towers': {
    alt: 'Modern glass office towers receding into dawn haze under a wide pale sky.',
    width: 1344, height: 768,
  },
  'blog-ai-cost': {
    alt: 'A stack of translucent glass sheets of descending size on concrete, casting layered shadows.',
    width: 1344, height: 768,
  },
  'blog-verify': {
    alt: 'A machinist’s loupe and steel straight edge on a calibration plate, with a second loupe behind it.',
    width: 1344, height: 768,
  },
  'blog-build-buy': {
    alt: 'A concrete corridor splitting into two openings, one in daylight and one in shadow.',
    width: 1344, height: 768,
  },
  'blog-bilingual': {
    alt: 'Two mirrored paper cards on a dark surface, ruled lines running left-to-right on one and right-to-left on the other.',
    width: 1344, height: 768,
  },
  'blog-scoping': {
    alt: 'Paper rectangles arranged largest to smallest, most pushed into shadow and one left in a pool of light.',
    width: 1344, height: 768,
  },
  'blog-internal-tools': {
    alt: 'Five matte tool cases of different sizes laid out in a precise grid on a workbench.',
    width: 1344, height: 768,
  },
  'case-retail': {
    alt: 'A calm warehouse interior with tidy shelving of plain cartons and a barcode scanner on a counter.',
    width: 1344, height: 768,
  },
  'case-logistics': {
    alt: 'Unmarked shipping containers stacked in rows on a concrete apron at first light.',
    width: 1344, height: 768,
  },
  'case-clinic': {
    alt: 'An empty modern clinic reception with a pale stone counter and soft indirect lighting.',
    width: 1344, height: 768,
  },
  'work-office': {
    alt: 'An empty glass-walled meeting room with a long pale table and a softly blurred city beyond.',
    width: 1344, height: 768,
  },
} as const;

export type ImageKey = keyof typeof REGISTRY;

/** public/ on disk, so a build can tell whether an asset was fetched. */
const PUBLIC_DIR = fileURLToPath(new URL('../../public/images/', import.meta.url));

/**
 * Returns the image if it has been downloaded, otherwise null so the caller
 * renders its own placeholder. Callers must handle null — that is the whole
 * point of this function.
 */
export function resolveImage(key: ImageKey): SiteImage | null {
  const meta = REGISTRY[key];
  if (!meta) return null;
  if (!existsSync(PUBLIC_DIR + key + '.webp')) return null;
  return { src: `/images/${key}.webp`, ...meta };
}

/** Every key, for the download script and for tooling. */
export const imageKeys = Object.keys(REGISTRY) as ImageKey[];
