import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Small helpers and hooks shared by the /logbook chapters. Geometry and data
// derivations live in model.js; this file is the React side.

export { yearOf } from "./model";

export const fmt = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n).toLocaleString("en-IN") : null);

export const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
  day: "numeric", month: "short", year: "numeric",
});

export const monthYear = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

// Marathi text gets its language (screen readers, hyphenation) and a
// Devanagari font; English text gets nothing extra.
export const langProps = (lang) => (lang === "mr" ? { lang: "mr", className: "lb-mr-text" } : {});

// A title's language is its own: a Marathi essay can carry an English title.
export const textLang = (s) => (/[ऀ-ॿ]/.test(String(s)) ? "mr" : "en");

export const langColor = (lang) => (lang === "mr" ? "var(--lb-mr)" : "var(--lb-en)");
export const langName = (lang) => (lang === "mr" ? "Marathi" : "English");

// SVG marks are not buttons, so Enter and Space activate them by hand.
export const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

export const prefersReducedMotion = () => typeof window !== "undefined"
  && typeof window.matchMedia === "function"
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Live prefers-reduced-motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    if (q.addEventListener) {
      q.addEventListener("change", update);
      return () => q.removeEventListener("change", update);
    }
    q.addListener(update);
    return () => q.removeListener(update);
  }, []);
  return reduced;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * The rendered width of `ref`'s element, kept current. Every figure here is
 * drawn at its real pixel size rather than scaled, so type on a phone is as
 * legible as on a desktop.
 */
export function useWidth(ref, fallback = 720) {
  const [width, setWidth] = useState(fallback);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/**
 * One tab stop for a whole field of marks: the arrow keys move between them
 * in writing order, Home and End jump to the ends, Enter opens. `count` is
 * the number of marks, `onActivate(i)` fires on Enter or Space.
 */
export function useRoving(count, onActivate, initial = 0) {
  const [active, setActive] = useState(initial);
  const refs = useRef([]);
  const move = useCallback((i) => {
    const next = Math.max(0, Math.min(count - 1, i));
    setActive(next);
    const el = refs.current[next];
    if (el) el.focus();
    return next;
  }, [count]);
  const props = (i) => ({
    ref: (el) => { refs.current[i] = el; },
    tabIndex: i === Math.min(active, count - 1) ? 0 : -1,
    onFocus: () => setActive(i),
    onKeyDown: (e) => {
      const keys = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: count - 1 };
      if (e.key in keys) {
        e.preventDefault();
        move(keys[e.key]);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate(i);
      }
    },
  });
  return { active, setActive, props };
}

/**
 * Region labels above their centroids; when two would overlap, the lower one
 * steps down until it clears. `charW` is the width of a character at the
 * label's size; `x`/`y` map a centroid to the SVG; a label may have several
 * `lines`, each `line` px tall.
 */
export function placeLabels(clusters, x, y, { width, charW, lift, line = 20 }) {
  const boxes = [];
  return [...clusters]
    .sort((a, b) => a.xy[1] - b.xy[1])
    .map((c) => {
      const lines = c.lines || [c.label];
      const w = Math.max(...lines.map((l) => l.length)) * charW + 20;
      const h = lines.length * line;
      const lx = Math.min(Math.max(x(c.xy[0]), w / 2 + 4), width - w / 2 - 4);
      let ly = Math.max(y(c.xy[1]) - lift, line);
      const hits = () => boxes.some((b) => Math.abs(b.x - lx) < (b.w + w) / 2 && ly < b.y + b.h && ly + h > b.y);
      while (hits()) ly += line;
      boxes.push({ x: lx, y: ly, w, h });
      return { ...c, lines, lx, ly };
    });
}

/**
 * A diamond's points around (cx, cy). Drawn as a polygon, not a rotated
 * rect: CSS transform-origin (which the hover scale needs) re-anchors an
 * SVG rotate() attribute and throws the mark off the chart.
 */
export const diamond = (cx, cy, r) => `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;

/** Linear scale from a domain onto a range. */
export const scale = ([d0, d1], [r0, r1]) => (v) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
