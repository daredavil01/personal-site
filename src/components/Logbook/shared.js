// Small helpers shared by the /logbook lenses.

export const fmt = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n).toLocaleString("en-IN") : null);

export const yearOf = (post) => Number(String(post.date).slice(0, 4));

export const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
  day: "numeric", month: "short", year: "numeric",
});

// Marathi text gets its language (screen readers, hyphenation) and a
// Devanagari-first font stack; English text gets nothing extra.
export const langProps = (lang) => (lang === "mr" ? { lang: "mr", className: "lb-mr-text" } : {});

// A title's language is its own: a Marathi essay can carry an English title.
export const textLang = (s) => (/[ऀ-ॿ]/.test(String(s)) ? "mr" : "en");

export const langColor = (lang) => (lang === "mr" ? "var(--lb-mr)" : "var(--lb-en)");

// SVG marks are not buttons, so Enter and Space activate them by hand.
export const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

export const prefersReducedMotion = () => typeof window !== "undefined"
  && window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Region labels above their centroids; when two would overlap, the lower one
 * steps down until it clears. `charW` is the width of a character at the
 * label's size, letter-spacing included; `x`/`y` map a centroid to the SVG.
 */
export function placeLabels(clusters, x, y, { width, charW, lift, line = 20 }) {
  const boxes = [];
  return [...clusters]
    .sort((a, b) => a.xy[1] - b.xy[1])
    .map((c) => {
      const w = c.label.length * charW + 20;
      const lx = Math.min(Math.max(x(c.xy[0]), w / 2 + 4), width - w / 2 - 4);
      let ly = Math.max(y(c.xy[1]) - lift, line);
      const hits = () => boxes.some((b) => Math.abs(b.x - lx) < (b.w + w) / 2 && Math.abs(b.y - ly) < line);
      while (hits()) ly += line + 2;
      boxes.push({ x: lx, y: ly, w });
      return { ...c, lx, ly };
    });
}

/** Linear scale from a domain onto a range. */
export const scale = ([d0, d1], [r0, r1]) => (v) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
