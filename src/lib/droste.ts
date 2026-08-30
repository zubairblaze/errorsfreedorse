/**
 * The Droste zoom.
 *
 * A true infinite zoom needs only a handful of elements, because the
 * arrangement is self-similar: N frames whose scales are consecutive powers
 * of `ratio`. Push every frame outward by the same continuous amount and,
 * after advancing exactly one level, the set is indistinguishable from where
 * it started — so a frame that has grown past the viewer can be recycled to
 * the centre and the loop never has a seam.
 *
 * Everything below is transform and opacity only. No layout is read or
 * written per frame, so the whole effect stays on the compositor.
 */

export interface ZoomConfig {
  /** How many frames exist. More = deeper tunnel, linearly more cost. */
  levels: number;
  /** Each level is this fraction of the one outside it. */
  ratio: number;
  /** Degrees of twist added per level, which is what makes it spiral. */
  rotate: number;
}

const smoothstep = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * Effective depth of frame `i` at progress `p`, wrapped into (-1, levels-1].
 *
 * `p` is measured in levels: p = 1 means the whole tunnel has advanced by
 * exactly one frame. Depth -1 is a frame that has grown past the viewer and
 * is fading out; depth levels-1 is the newest frame, still a speck.
 */
function depth(i: number, p: number, levels: number): number {
  let e = (i - p) % levels;
  if (e < 0) e += levels;
  if (e > levels - 1) e -= levels;
  return e;
}

/** Frames fade in as specks and fade out as they engulf the viewer, so the
 *  recycle happens at zero opacity and is invisible. */
function fade(e: number, levels: number): number {
  if (e < 0) return smoothstep(1 + e);
  if (e > levels - 2) return smoothstep(levels - 1 - e);
  return 1;
}

/**
 * Opacity for a frame's *contents* — the brand block, the step label.
 *
 * Only the one or two frames currently at readable size carry content.
 * Without this every frame draws its block in the same corner and they
 * stack into an unreadable smear; with it, each frame's contents resolve
 * as it grows toward you and dissolve as it passes, which is the sensation
 * the whole effect exists to produce.
 */
export function contentFade(e: number): number {
  // Deliberately narrow. Two frames carrying legible content at once puts
  // the same block in nearly the same place at two sizes, which reads as a
  // smear rather than as depth. One frame speaks; the rest are empty
  // windows receding, and each takes its turn as it grows toward you.
  if (e < 0) return smoothstep(1 + e / 0.35);      // dissolves as it engulfs you
  if (e > 0.55) return smoothstep((1.2 - e) / 0.65); // resolves as it approaches
  return 1;
}

/**
 * Depth of frame `i` at progress `p`. Exported so callers can ask which
 * frame is currently legible without duplicating the wrap arithmetic.
 */
export function frameDepth(i: number, p: number, levels: number): number {
  return depth(i, p, levels);
}

/**
 * Index of the frame the viewer is actually reading — the one carrying the
 * most content opacity. Anything that labels the tunnel (the step list, the
 * accent border) must agree with this, or the words drift out of step with
 * the frames.
 */
export function focusIndex(p: number, levels: number): number {
  let best = 0;
  let bestOpacity = -1;
  for (let i = 0; i < levels; i++) {
    const o = contentFade(depth(i, p, levels));
    if (o > bestOpacity) { bestOpacity = o; best = i; }
  }
  return best;
}

/**
 * Writes one frame's transform state. Called for every frame on every
 * animation frame, so it does nothing but set custom properties.
 */
export function applyZoom(nodes: HTMLElement[], p: number, cfg: ZoomConfig): void {
  const { levels, ratio, rotate } = cfg;
  for (let i = 0; i < levels; i++) {
    const el = nodes[i];
    if (!el) continue;
    const e = depth(i, p, levels);
    const opacity = fade(e, levels);
    el.style.setProperty('--s', Math.pow(ratio, e).toFixed(5));
    el.style.setProperty('--r', (e * rotate).toFixed(3) + 'deg');
    el.style.setProperty('--o', opacity.toFixed(3));
    el.style.setProperty('--co', contentFade(e).toFixed(3));
    // Nearest the viewer paints on top; each frame's screen is transparent,
    // so the ones behind it show through the hole. That is the whole trick.
    el.style.setProperty('--z', String(levels - Math.round(e)));
    // Frames at zero opacity are skipped by the compositor entirely.
    el.style.visibility = opacity < 0.005 ? 'hidden' : 'visible';
  }
}

/**
 * Drives a callback with scroll progress, coalesced to one animation frame.
 * Returns a teardown function.
 */
export function onScrollProgress(
  target: HTMLElement,
  compute: (rect: DOMRect) => number,
  write: (p: number) => void,
): () => void {
  let queued = 0;
  const tick = () => {
    queued = 0;
    write(compute(target.getBoundingClientRect()));
  };
  const schedule = () => { if (!queued) queued = requestAnimationFrame(tick); };
  schedule();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (queued) cancelAnimationFrame(queued);
  };
}

/** True when the visitor has asked for less movement. */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
