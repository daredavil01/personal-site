import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FAMILY_LABELS } from "../../lib/training";

// Small pieces both /training layouts use: sport colours, the in-view hook
// that starts an animation once, the "sample data" ribbon and a tooltip.

export const FAMILIES = ["run", "ride", "walk", "hike", "swim", "other"];
export const famColor = (f) => `var(--tr-${FAMILIES.includes(f) ? f : "other"})`;
export const FAMILY_ICONS = {
  run: "directions_run", ride: "directions_bike", walk: "directions_walk", hike: "hiking", swim: "pool", other: "exercise",
};

export const prefersReducedMotion = () => (
  typeof window !== "undefined" && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

/** [ref, seen]: `seen` turns true the first time the element is on screen. */
export function useInView(threshold = 0.25) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

export const Swatch = ({ family, size }) => (
  <span
    aria-hidden="true"
    className="inline-block rounded-full shrink-0"
    style={{ width: size, height: size, background: famColor(family) }}
  />
);
Swatch.propTypes = { family: PropTypes.string.isRequired, size: PropTypes.number };
Swatch.defaultProps = { size: 10 };

/** The legend: a swatch + the label in text ink, never colour alone. */
export const Legend = ({ families, className }) => (
  <ul className={`flex flex-wrap gap-x-4 gap-y-1 pl-0 mb-0 list-none ${className}`}>
    {families.map((f) => (
      <li key={f} className="inline-flex items-center gap-1.5 font-label text-[11px] uppercase tracking-wider" style={{ color: "var(--tr-muted)" }}>
        <Swatch family={f} />
        {FAMILY_LABELS[f]}
      </li>
    ))}
  </ul>
);
Legend.propTypes = { families: PropTypes.arrayOf(PropTypes.string).isRequired, className: PropTypes.string };
Legend.defaultProps = { className: "" };

export const SampleRibbon = ({ dark }) => (
  <p
    role="note"
    className={`mb-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-label text-[11px] uppercase tracking-widest ${dark
      ? "bg-white/10 text-amber-200 border border-white/15"
      : "bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"}`}
  >
    <span className="material-symbols-outlined text-sm" aria-hidden="true">science</span>
    Sample data — the real log appears after the Strava import
  </p>
);
SampleRibbon.propTypes = { dark: PropTypes.bool };
SampleRibbon.defaultProps = { dark: false };

/** A tooltip positioned in its relative parent; `at` is {x, y} in px or null. */
export const Tip = ({ at, children, dark }) => {
  if (!at) return null;
  return (
    <div
      role="status"
      className={`pointer-events-none absolute z-20 px-3 py-2 rounded-lg shadow-xl text-xs leading-snug whitespace-nowrap ${dark
        ? "bg-slate-900/95 text-slate-100 border border-white/10"
        : "bg-white text-stone-800 border border-stone-200 dark:bg-stone-900 dark:text-stone-100 dark:border-stone-700"}`}
      style={{
        left: at.x, top: at.y, transform: `translate(${at.flip ? "-100%" : "0"}, -110%)`, marginLeft: at.flip ? -10 : 10,
      }}
    >
      {children}
    </div>
  );
};
Tip.propTypes = {
  at: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number, flip: PropTypes.bool }),
  children: PropTypes.node,
  dark: PropTypes.bool,
};
Tip.defaultProps = { at: null, children: null, dark: false };

/** Pointer position inside `el`, flipped to the left in the right third. */
export const pointIn = (el, e) => {
  const box = el.getBoundingClientRect();
  const x = e.clientX - box.left;
  return { x, y: e.clientY - box.top, flip: x > box.width * 0.66 };
};

export const km = (m, digits = 0) => (Number(m) / 1000).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
