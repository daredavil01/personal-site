import React, {
  useEffect, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import "./arena.css";

// Arena — the pieces /training and /sports are both built from (tokens and
// motion in arena.css): the dark stage a page opens on, numbers that count up
// once, the lens tabs, and the plates the reading sits on. No data in here.

const FONTS = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&display=swap";

/** Barlow Condensed, on these pages only. */
export const ArenaFonts = () => (
  <Helmet>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link rel="stylesheet" href={FONTS} />
  </Helmet>
);

export const prefersReducedMotion = () => (
  typeof window !== "undefined" && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

/** [ref, seen] — `seen` turns true the first time the element is on screen. */
export function useSeen(threshold = 0.2) {
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
    }, { threshold, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/** The element's own width in px (figures draw at real size, never a scaled viewBox). */
export function useWidth(initial = 0) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setWidth(Math.round(el.getBoundingClientRect().width));
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

const easeOut = (t) => 1 - (1 - t) ** 4;

/** `value` eased up from zero over `ms` once `run` is true. */
export function useCount(value, run = true, ms = 1400) {
  const still = prefersReducedMotion() || !Number.isFinite(value);
  const [shown, setShown] = useState(still ? value : 0);
  useEffect(() => {
    if (still || !run) {
      if (still) setShown(value);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      setShown(value * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, run, ms, still]);
  return shown;
}

const defaultFormat = (v) => Math.round(v).toLocaleString("en-GB");

/** A number that counts up the first time it is seen. The real value is the label. */
export const Count = ({
  value, format, unit, className, ms,
}) => {
  const [ref, seen] = useSeen(0.1);
  const shown = useCount(value, seen, ms);
  return (
    <span ref={ref} className={className} aria-label={`${format(value)}${unit ? ` ${unit}` : ""}`}>
      <span aria-hidden="true">{format(shown)}</span>
      {unit && <span className="ar-unit" aria-hidden="true">{unit}</span>}
    </span>
  );
};
Count.propTypes = {
  value: PropTypes.number.isRequired,
  format: PropTypes.func,
  unit: PropTypes.string,
  className: PropTypes.string,
  ms: PropTypes.number,
};
Count.defaultProps = {
  format: defaultFormat, unit: "", className: "", ms: 1400,
};

/** The row of big numbers along the foot of a stage. Items without a value are left out. */
export const Readout = ({ items }) => {
  const list = items.filter((i) => i && i.value != null && i.value !== 0);
  if (!list.length) return null;
  return (
    <dl className="ar-readout mb-0" style={{ "--ar-cols": Math.min(6, list.length) }}>
      {list.map((i) => (
        <div key={i.label}>
          <dt className="ar-kicker mb-1.5 truncate" style={{ fontSize: "0.6rem" }}>{i.label}</dt>
          <dd className="ar-num">
            {typeof i.value === "number"
              ? <Count value={i.value} format={i.format} unit={i.unit} />
              : (
                <>
                  {i.value}
                  {i.unit && <span className="ar-unit">{i.unit}</span>}
                </>
              )}
          </dd>
          {i.note && <p className="mb-0 mt-1.5 text-[11px] leading-snug ar-stage-muted truncate" title={i.note}>{i.note}</p>}
        </div>
      ))}
    </dl>
  );
};
Readout.propTypes = { items: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

/** The lenses: a tablist. `tabs` is [{ id, label, icon }]. */
export const LensTabs = ({
  tabs, active, onChange, label,
}) => {
  const onKey = (e) => {
    const i = tabs.findIndex((t) => t.id === active);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next == null) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    onChange(t.id);
    requestAnimationFrame(() => document.getElementById(`ar-tab-${t.id}`)?.focus());
  };
  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- the tabs inside take the focus (roving tabindex)
    <div role="tablist" aria-label={label} className="ar-tabs" onKeyDown={onKey}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`ar-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          aria-controls="ar-lens-panel"
          tabIndex={t.id === active ? 0 : -1}
          onClick={() => onChange(t.id)}
          className="ar-tab"
        >
          {t.icon && <span className="material-symbols-outlined text-lg" aria-hidden="true">{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  );
};
LensTabs.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, label: PropTypes.string, icon: PropTypes.string })).isRequired,
  active: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

/** A reading plate that rises into place the first time it is seen. */
export const Plate = ({
  kicker, title, sub, action, children, night, className, delay, id,
}) => {
  const [ref, seen] = useSeen(0.08);
  return (
    <section
      ref={ref}
      id={id}
      className={`ar-plate ar-reveal ${seen ? "is-seen" : ""} ${night ? "ar-plate-night" : ""} ${className}`}
      style={delay ? { "--ar-delay": `${delay}ms` } : undefined}
    >
      {(kicker || title) && (
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-5">
          <div className="min-w-0 flex flex-col gap-2">
            {kicker && <p className="ar-kicker mb-0">{kicker}</p>}
            {title && <h2>{title}</h2>}
            {sub && <p className="ar-sub">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
};
Plate.propTypes = {
  kicker: PropTypes.string,
  title: PropTypes.node,
  sub: PropTypes.node,
  action: PropTypes.node,
  children: PropTypes.node,
  night: PropTypes.bool,
  className: PropTypes.string,
  delay: PropTypes.number,
  id: PropTypes.string,
};
Plate.defaultProps = {
  kicker: null, title: null, sub: null, action: null, children: null, night: false, className: "", delay: 0, id: undefined,
};

/** Label, big number, one line of context. Links when `to`/`onClick` is given; omitted without a value. */
export const Fig = ({
  label, value, note, to, LinkAs,
}) => {
  if (value == null || value === "") return null;
  const body = (
    <>
      <span className="ar-fig-label">{label}</span>
      <span className="ar-fig-value" style={typeof value === "string" && value.length > 10 ? { fontSize: "clamp(1.5rem, 3.2cqw, 2.1rem)" } : undefined}>{value}</span>
      {note && <span className="ar-fig-note">{note}</span>}
    </>
  );
  return to && LinkAs
    ? <LinkAs to={to} className="ar-fig">{body}</LinkAs>
    : <div className="ar-fig">{body}</div>;
};
Fig.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  note: PropTypes.node,
  to: PropTypes.string,
  LinkAs: PropTypes.elementType,
};
Fig.defaultProps = {
  value: null, note: null, to: null, LinkAs: null,
};

/** A chip that toggles; `paper` for the light surface. */
export const Chip = ({
  active, onClick, children, paper, title,
}) => (
  <button type="button" aria-pressed={active} onClick={onClick} title={title} className={`ar-chip ${paper ? "ar-chip-paper" : ""}`}>
    {children}
  </button>
);
Chip.propTypes = {
  active: PropTypes.bool, onClick: PropTypes.func.isRequired, children: PropTypes.node.isRequired, paper: PropTypes.bool, title: PropTypes.string,
};
Chip.defaultProps = { active: false, paper: false, title: undefined };

/** "Watch the film": a pill that opens the page's film in a native dialog. */
export const FilmButton = ({ label, children }) => {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const show = () => {
    setOpen(true);
    requestAnimationFrame(() => ref.current?.showModal?.());
  };
  const close = () => {
    ref.current?.querySelectorAll("video").forEach((v) => v.pause());
    ref.current?.close?.();
  };
  return (
    <>
      <button type="button" onClick={show} className="ar-chip" style={{ height: "2.25rem", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
        <span className="material-symbols-outlined text-base ar-stage-ember" aria-hidden="true">play_circle</span>
        {label}
      </button>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- a click on the backdrop closes; Esc is the dialog's own */}
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === ref.current) close(); }}
        aria-label={label}
        className="ar-dialog"
      >
        {open && (
          <div className="ar-dialog-body">
            <button type="button" onClick={close} className="ar-dialog-close" aria-label="Close the film">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
            {children}
          </div>
        )}
      </dialog>
    </>
  );
};
FilmButton.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
