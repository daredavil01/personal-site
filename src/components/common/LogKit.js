import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";

// The controls shared by the redesigned /sports, /treks and /presentations:
// URL-state, tabs, filter chips, a search box, glanceable KPI tiles, insight
// cards and a 12-month strip. One set of primitives so the three logs read
// the same way and stay keyboard- and screen-reader-friendly.

/**
 * URL-backed state. Values equal to their default are removed from the query
 * string, and every write MERGES into the existing params — `view` belongs to
 * useViewMode and must survive.
 */
export function useQueryState(defaults) {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => Object.fromEntries(
    Object.entries(defaults).map(([k, d]) => [k, params.get(k) ?? d]),
  ), [params]);

  const set = useCallback((patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === "" || v === defaults[k]) next.delete(k);
      else next.set(k, String(v));
    });
    setParams(next, { replace: true });
  }, [params, setParams]);

  return [state, set];
}

/** Tabs with arrow-key movement (WAI-ARIA tabs pattern). */
export const TabBar = ({
  tabs, active, onChange, label,
}) => {
  const refs = useRef([]);
  const onKey = (e, i) => {
    const move = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    let next = null;
    if (move) next = (i + move + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next == null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800/60 rounded-xl w-full sm:w-auto overflow-x-auto">
      {tabs.map((t, i) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={on}
            aria-controls={`panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
              on
                ? "bg-white dark:bg-stone-700 text-secondary shadow-sm"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            {t.icon && <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

TabBar.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, label: PropTypes.string, icon: PropTypes.string })).isRequired,
  active: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

export const TabPanel = ({ id, children }) => (
  <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className="w-full focus:outline-none">
    {children}
  </div>
);

TabPanel.propTypes = { id: PropTypes.string.isRequired, children: PropTypes.node };

/** One-of-many filter chips with an "All" chip and counts. */
export const ChipRow = ({
  label, options, value, onChange, allLabel,
}) => {
  if (options.length < 2 && !value) return null;
  const chip = (on) => `shrink-0 px-3 py-1.5 rounded-full text-xs font-label font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
    on
      ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100"
      : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-secondary hover:text-secondary"
  }`;
  return (
    <div className="flex items-center gap-2 min-w-0" role="group" aria-label={label}>
      <span className="shrink-0 w-16 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 min-w-0">
        <button type="button" aria-pressed={!value} onClick={() => onChange("")} className={chip(!value)}>{allLabel}</button>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? "" : o.value)}
            className={chip(value === o.value)}
            title={o.title}
          >
            {o.label}
            <span className="ml-1.5 opacity-60 tabular-nums">{o.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

ChipRow.propTypes = {
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string, label: PropTypes.node, count: PropTypes.number, title: PropTypes.string,
  })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  allLabel: PropTypes.string,
};
ChipRow.defaultProps = { allLabel: "All" };

/** A search box; "/" anywhere on the page focuses it. */
export const SearchBox = ({
  value, onChange, placeholder, id,
}) => {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <label htmlFor={id} className="relative flex-1 min-w-[12rem]">
      <span className="sr-only">{placeholder}</span>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-stone-400" aria-hidden="true">search</span>
      <input
        ref={ref}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg font-body text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-secondary transition-colors"
      />
      <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 rounded border border-stone-200 dark:border-stone-700 text-[10px] text-stone-400 font-label" aria-hidden="true">/</kbd>
    </label>
  );
};

SearchBox.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
};

export const selectClass = "h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary focus-visible:ring-2 focus-visible:ring-secondary transition-colors";

/** Sort field + direction as one compact control. */
export const SortControl = ({
  options, sort, dir, onChange,
}) => (
  <div className="flex items-center gap-1">
    <select aria-label="Sort by" value={sort} onChange={(e) => onChange({ sort: e.target.value })} className={selectClass}>
      {options.map((o) => <option key={o.value} value={o.value}>{`Sort: ${o.label}`}</option>)}
    </select>
    <button
      type="button"
      onClick={() => onChange({ dir: dir === "asc" ? "desc" : "asc" })}
      aria-label={dir === "asc" ? "Ascending — switch to descending" : "Descending — switch to ascending"}
      className={`${selectClass} flex items-center`}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{dir === "asc" ? "arrow_upward" : "arrow_downward"}</span>
    </button>
  </div>
);

SortControl.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })).isRequired,
  sort: PropTypes.string.isRequired,
  dir: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/** Two or three icon buttons, one pressed. */
export const ViewToggle = ({ options, value, onChange }) => (
  <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900" role="group" aria-label="Layout">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        aria-pressed={value === o.value}
        aria-label={o.label}
        title={o.label}
        onClick={() => onChange(o.value)}
        className={`h-9 w-9 flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
          value === o.value ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "text-stone-500 hover:text-secondary"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{o.icon}</span>
      </button>
    ))}
  </div>
);

ViewToggle.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string, icon: PropTypes.string })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * Large, glanceable numbers. A tile whose value is null/"" is omitted, never
 * shown as 0.
 */
export const KpiStrip = ({ items }) => {
  const shown = items.filter((i) => i.value != null && i.value !== "");
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stone-200 dark:bg-stone-800 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
      {shown.map((i) => (
        <div key={i.label} className="bg-white dark:bg-stone-900 p-4 sm:p-5 flex flex-col gap-1 min-w-0">
          <dt className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {i.icon && <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">{i.icon}</span>}
            {i.label}
          </dt>
          <dd className="m-0 font-headline text-3xl sm:text-4xl font-black text-stone-900 dark:text-stone-100 tabular-nums leading-none truncate">
            {i.value}
            {i.unit && <span className="ml-1 text-base font-bold text-stone-400">{i.unit}</span>}
          </dd>
          {i.sub && <dd className="m-0 font-body text-xs text-stone-500 dark:text-stone-400 truncate" title={typeof i.sub === "string" ? i.sub : undefined}>{i.sub}</dd>}
        </div>
      ))}
    </dl>
  );
};

KpiStrip.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string, value: PropTypes.node, unit: PropTypes.string, sub: PropTypes.node, icon: PropTypes.string,
  })).isRequired,
};

/** A small card stating one derived fact. Renders nothing without a value. */
export const Insight = ({
  icon, label, value, children, onClick,
}) => {
  if (value == null || value === "") return null;
  const body = (
    <>
      <span className="flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
        <span className="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span className="font-headline text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight">{value}</span>
      {children && <span className="font-body text-sm text-stone-500 dark:text-stone-400 leading-snug">{children}</span>}
    </>
  );
  const cls = "text-left flex flex-col gap-1.5 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:border-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary`}>
      {body}
    </button>
  ) : <div className={cls}>{body}</div>;
};

Insight.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  children: PropTypes.node,
  onClick: PropTypes.func,
};

export const Panel = ({
  title, subtitle, children, action,
}) => (
  <section className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-5 sm:p-6 min-w-0">
    <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="font-headline text-xl font-bold text-stone-900 dark:text-stone-100 mb-0">{title}</h2>
        {subtitle && <p className="font-body text-sm text-stone-500 dark:text-stone-400 mb-0 mt-1">{subtitle}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

Panel.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  children: PropTypes.node,
  action: PropTypes.node,
};

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Twelve bars, one per calendar month. `band` (month indexes) shades a span,
 * e.g. the monsoon. Bars are buttons when `onPick` is given.
 */
export const MonthStrip = ({
  counts, band, bandLabel, onPick, picked, noun,
}) => {
  const max = Math.max(1, ...counts);
  return (
    <div>
      <div className="grid grid-cols-12 gap-1 sm:gap-2 items-end h-32">
        {counts.map((c, m) => {
          const inBand = band?.includes(m);
          const h = c ? Math.max(8, Math.round((c / max) * 100)) : 0;
          const label = `${MONTH_SHORT[m]}: ${c} ${noun}${c === 1 ? "" : "s"}`;
          return (
            <div key={MONTH_SHORT[m]} className={`relative h-full flex flex-col justify-end rounded-md ${inBand ? "bg-sky-50 dark:bg-sky-950/40" : ""}`}>
              {c > 0 && <span className="text-center font-label text-[10px] font-bold text-stone-500 dark:text-stone-400 tabular-nums mb-0.5">{c}</span>}
              {onPick && c > 0 ? (
                <button type="button" onClick={() => onPick(m)} aria-label={label} aria-pressed={picked === m} className="group h-full flex flex-col justify-end focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-t-md" style={{ height: `${h}%` }}>
                  <span className={`block w-full h-full rounded-t-md ${picked === m ? "bg-stone-900 dark:bg-stone-100" : "bg-secondary group-hover:opacity-80"}`} />
                </button>
              ) : (
                <span title={label} className="block w-full rounded-t-md bg-secondary" style={{ height: `${h}%` }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-12 gap-1 sm:gap-2 mt-1.5">
        {MONTH_LETTERS.map((l, m) => (
          <span key={MONTH_SHORT[m]} className="text-center font-label text-[10px] font-bold text-stone-400">
            <span className="sm:hidden">{l}</span>
            <span className="hidden sm:inline">{MONTH_SHORT[m]}</span>
          </span>
        ))}
      </div>
      {band && bandLabel && (
        <p className="mt-2 mb-0 flex items-center gap-2 font-body text-xs text-stone-500 dark:text-stone-400">
          <span className="inline-block w-3 h-3 rounded-sm bg-sky-100 dark:bg-sky-900/60" aria-hidden="true" />
          {bandLabel}
        </p>
      )}
    </div>
  );
};

MonthStrip.propTypes = {
  counts: PropTypes.arrayOf(PropTypes.number).isRequired,
  band: PropTypes.arrayOf(PropTypes.number),
  bandLabel: PropTypes.string,
  onPick: PropTypes.func,
  picked: PropTypes.number,
  noun: PropTypes.string,
};
MonthStrip.defaultProps = { noun: "item" };

/** Horizontal bars for a short ranked list. */
export const RankBars = ({ rows, onPick, format }) => {
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="flex justify-between gap-3 text-sm mb-1">
              <span className="font-body text-stone-700 dark:text-stone-300 truncate">{r.label}</span>
              <span className="font-label font-bold text-stone-500 dark:text-stone-400 tabular-nums shrink-0">{format ? format(r.value) : r.value}</span>
            </span>
            <span className="block h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <span className={`block h-full rounded-full ${r.color ?? "bg-secondary"}`} style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
            </span>
          </>
        );
        return (
          <li key={r.key ?? r.label}>
            {onPick ? (
              <button type="button" onClick={() => onPick(r)} className="w-full text-left block group hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded">
                {inner}
              </button>
            ) : <div>{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
};

RankBars.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), label: PropTypes.node, value: PropTypes.number, color: PropTypes.string,
  })).isRequired,
  onPick: PropTypes.func,
  format: PropTypes.func,
};

/** Copy the current URL (filters included); native share sheet on phones. */
export const ShareViewButton = () => {
  const [state, setState] = useState("idle");
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && /Mobi/i.test(navigator.userAgent)) {
        await navigator.share({ url, title: document.title });
      } else {
        await navigator.clipboard.writeText(url);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
      }
    } catch (_) { /* dismissed */ }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="h-10 flex items-center gap-2 px-4 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-label text-xs uppercase tracking-widest font-bold hover:border-secondary hover:text-secondary transition-colors"
      title="Copy a link to this exact view, filters included"
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{state === "copied" ? "check" : "link"}</span>
      <span aria-live="polite">{state === "copied" ? "Link copied" : "Share view"}</span>
    </button>
  );
};

/** "Showing 4 of 26 · Clear filters". */
export const ResultLine = ({
  shown, total, noun, onClear,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400" aria-live="polite">
      {shown === total ? `${total} ${noun}${total === 1 ? "" : "s"}` : `Showing ${shown} of ${total} ${noun}s`}
    </p>
    {onClear && (
      <button type="button" onClick={onClear} className="flex items-center gap-1 text-secondary font-label text-xs uppercase tracking-widest font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
        Clear filters
      </button>
    )}
  </div>
);

ResultLine.propTypes = {
  shown: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  noun: PropTypes.string.isRequired,
  onClear: PropTypes.func,
};

/** An empty result that says how to get out of it. */
export const NoMatches = ({ noun, onClear }) => (
  <div className="py-16 flex flex-col items-center gap-3 text-center">
    <span className="material-symbols-outlined text-4xl text-stone-300 dark:text-stone-600" aria-hidden="true">filter_alt_off</span>
    <p className="mb-0 font-body text-stone-500 dark:text-stone-400">{`No ${noun}s match these filters.`}</p>
    {onClear && (
      <button type="button" onClick={onClear} className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-label text-xs uppercase tracking-widest font-bold">
        Clear filters
      </button>
    )}
  </div>
);

NoMatches.propTypes = { noun: PropTypes.string.isRequired, onClear: PropTypes.func };

/** A floating tooltip for SVG charts, positioned in the chart's own box. */
export const ChartTip = ({ x, y, width, children }) => {
  if (x == null) return null;
  const left = Math.min(Math.max(x, 90), width - 90);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-lg text-xs font-body whitespace-nowrap"
      style={{ left, top: y - 10 }}
      role="status"
    >
      {children}
    </div>
  );
};

ChartTip.propTypes = {
  x: PropTypes.number, y: PropTypes.number, width: PropTypes.number.isRequired, children: PropTypes.node,
};
