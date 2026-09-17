// Small, deterministic generative art for micro-blog cards, plus the one place
// a tag's color is resolved. Pure and synchronous: callers pass in the tag
// colors they already hold (useTagColors), so a wall of cards costs one fetch,
// not one per card.
//
// Only ~5% of micro-posts carry tags, so the palette has two sources: a tagged
// post takes its tags' colors; an untagged one gets a palette seeded from its
// id. Either way the same post always draws the same picture.

/* eslint-disable no-bitwise -- a hash and a PRNG are bit twiddling by definition */

// FNV-1a over UTF-16 code units — stable across runs and fine for Devanagari.
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: a tiny seeded PRNG returning floats in [0, 1).
// Exported for src/lib/og/layouts/figures.js, which seeds card figures the same
// way this file seeds post art, so a fort list always draws the same ridge.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* eslint-enable no-bitwise */

function hslToHex(h, s, l) {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}`;
}

/** A tag's stored color, or a stable hue derived from its name. */
export function colorForTag(name, stored) {
  if (stored) return stored;
  return hslToHex(hashString(String(name)) % 360, 55, 52);
}

/**
 * @param {{ id: number|string, tags?: string[] }} post
 * @param {Map<string, string|null>} colorByName  tag name → stored color
 * @returns {{ palette: string[], tagged: boolean, shapes: object[] }}
 *   shapes live in a 100×100 viewBox: { kind: "circle", cx, cy, r, fill, opacity }
 *   or { kind: "rect", x, y, w, h, rotate, fill, opacity }.
 */
export function postArt(post, colorByName = new Map()) {
  const seed = Number.isFinite(Number(post.id)) ? Number(post.id) : hashString(String(post.id));
  const rand = seededRandom(seed * 2654435761);
  const tags = (post.tags || []).slice(0, 4);

  let palette;
  if (tags.length) {
    palette = tags.map((t) => colorForTag(t, colorByName.get(t)));
  } else {
    // Analogous pair plus a complement, so untagged cards still read as a set.
    const hue = Math.floor(rand() * 360);
    palette = [hue, hue + 35, hue + 180].map((h) => hslToHex(h % 360, 60, 58));
  }

  const count = 3 + Math.floor(rand() * 3);
  const shapes = Array.from({ length: count }, (_, i) => {
    const fill = palette[i % palette.length];
    const opacity = 0.35 + rand() * 0.45;
    if (rand() < 0.6) {
      return {
        kind: "circle", cx: rand() * 100, cy: rand() * 100, r: 12 + rand() * 30, fill, opacity,
      };
    }
    return {
      kind: "rect",
      x: rand() * 80,
      y: rand() * 80,
      w: 15 + rand() * 40,
      h: 6 + rand() * 18,
      rotate: Math.floor(rand() * 180),
      fill,
      opacity,
    };
  });

  return { palette, tagged: tags.length > 0, shapes };
}
