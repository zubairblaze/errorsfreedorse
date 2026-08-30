/** Checks the contrast pairs the design depends on, for every palette in
 *  both themes. Reads the real token values out of tokens.css. */
import { readFile } from 'node:fs/promises';

const css = await readFile('src/styles/tokens.css', 'utf8');
const blocks = [...css.matchAll(/\[data-palette="(\w+)"\](\[data-theme="dark"\])?\s*\{([^}]+)\}/g)];

const tokens = {};
for (const [, pal, dark, body] of blocks) {
  const key = `${pal}/${dark ? 'dark' : 'light'}`;
  tokens[key] = Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]),
  );
}
// Dark blocks only override; inherit the light values for anything absent.
for (const k of Object.keys(tokens)) {
  if (k.endsWith('/dark')) tokens[k] = { ...tokens[k.replace('/dark', '/light')], ...tokens[k] };
}

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [label, foreground token, background token, minimum required]
const PAIRS = [
  ['body text on page',      'ink',    'bg',     4.5],
  ['body text on surface',   'ink',    'bg-2',   4.5],
  ['secondary text',         'ink-2',  'bg',     4.5],
  ['secondary on surface',   'ink-2',  'bg-2',   4.5],
  ['muted meta (large/UI)',  'ink-3',  'bg',     3.0],
  ['accent link on page',    'accent', 'bg',     4.5],
  ['accent on surface',      'accent', 'bg-2',   4.5],
  ['button label on accent', 'on-accent', 'accent', 4.5],
  ['accent on its own tint', 'accent', 'accent-soft', 4.5],
];

let fails = 0;
for (const key of Object.keys(tokens).sort()) {
  const t = tokens[key];
  const rows = PAIRS.map(([label, fg, bg, min]) => {
    const r = ratio(t[fg], t[bg]);
    const pass = r >= min;
    if (!pass) fails++;
    return `${pass ? '  ok ' : '  XX '} ${label.padEnd(24)} ${r.toFixed(2).padStart(6)} : 1  (min ${min})`;
  });
  console.log(`\n${key}`);
  console.log(rows.join('\n'));
}
console.log(fails ? `\n${fails} PAIR(S) BELOW TARGET` : '\nAll contrast pairs meet target.');
process.exit(fails ? 1 : 0);
