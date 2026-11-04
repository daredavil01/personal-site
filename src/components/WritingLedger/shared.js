import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";

export { useWidth, prefersReducedMotion } from "../Logbook/shared";

export const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
export const kfmt = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));
export const platformColor = (p) => (String(p).toLowerCase().startsWith("word") ? "var(--wl-s2)" : "var(--wl-s1)");
export const langColor = (l) => (l === "Marathi" ? "var(--wl-mr)" : "var(--wl-en)");

/** A numbered section of the ledger: big italic folio numeral, kicker, title. */
export const Folio = ({ no, id, kicker, title, note, children }) => (
  <section className="wl-folio" id={id} aria-labelledby={`${id}-title`}>
    <header className="wl-folio-head">
      <span className="wl-folio-no" aria-hidden="true">{no}</span>
      <span className="wl-folio-kicker">{kicker}</span>
      <h2 className="wl-folio-title" id={`${id}-title`}>{title}</h2>
    </header>
    {note ? <p className="wl-folio-note">{note}</p> : null}
    {children}
  </section>
);

Folio.propTypes = {
  no: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  kicker: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  note: PropTypes.node,
  children: PropTypes.node,
};
Folio.defaultProps = { note: null, children: null };

/**
 * One hover card per figure. `show(e, content)` places it at the pointer
 * relative to the figure's wrapper; `hide()` clears it.
 */
export function useTip() {
  const [tip, setTip] = useState(null);
  const show = useCallback((e, content, key) => {
    const wrap = e.currentTarget.closest(".wl-fig");
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    let x;
    let y;
    if (e.clientX != null && e.type.startsWith("mouse")) {
      x = e.clientX - r.left;
      y = e.clientY - r.top;
    } else {
      const t = e.currentTarget.getBoundingClientRect();
      x = t.left + t.width / 2 - r.left;
      y = t.top - r.top;
    }
    x = Math.max(110, Math.min(r.width - 110, x));
    setTip({ x, y, content, key });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return { tip, show, hide };
}

export const Tip = ({ tip }) => (tip ? (
  <div className="wl-tip" style={{ left: tip.x, top: tip.y }} role="status">{tip.content}</div>
) : null);

Tip.propTypes = { tip: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number, content: PropTypes.node }) };
Tip.defaultProps = { tip: null };

/** Start a sideways-scrolling figure at its newest (right-hand) end. */
export function useScrollEnd(ref, dep) {
  useEffect(() => {
    const el = ref.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth;
  }, [ref, dep]);
}

export const openPost = (url) => {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
};
