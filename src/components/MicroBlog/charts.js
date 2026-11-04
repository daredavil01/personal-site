import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { NIGHT_HOURS, WEEKDAYS, hourLabel } from "../../lib/microblogInsights";

// The micro-blog's figures. Grids are HTML (crisp type at any width); the
// sky, the clock and the sparklines are SVG drawn at their real pixel width
// (useWidth), never a scaled viewBox, so labels stay legible on a phone.

const fmt = (n) => (n == null ? "" : Number(n).toLocaleString("en-IN"));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
export const dateLabel = (d) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
}) : "");

export function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Adds `is-in` once the element scrolls into view (the atlas reveal). */
export function useReveal() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView];
}

// ── The night sky: every timed post as a star ────────────────────────────

// The y axis runs 6 am → 6 am, so the night (9 pm – 3 am) is one band.
const skyY = (minute) => ((minute - 360 + 1440) % 1440) / 1440;
const isNightMinute = (m) => NIGHT_HOURS.includes(Math.floor(m / 60));

export const NightSky = ({ sky, height }) => {
  const [ref, width] = useWidth();
  const pts = sky && sky.points ? sky.points : [];
  const start = sky && sky.start ? Date.parse(`${sky.start}T00:00:00Z`) : 0;
  let maxDay = 1;
  for (let i = 0; i < pts.length; i += 2) if (pts[i] > maxDay) maxDay = pts[i];
  const left = 54;
  const right = 8;
  const top = 10;
  const bottom = 22;
  const w = Math.max(0, width - left - right);
  const h = height - top - bottom;
  const x = (d) => left + (d / maxDay) * w;
  const y = (m) => top + skyY(m) * h;
  const years = [];
  if (start) {
    const y0 = new Date(start).getUTCFullYear();
    for (let yr = y0 + 1; ; yr += 1) {
      const d = (Date.UTC(yr, 0, 1) - start) / 86400000;
      if (d > maxDay) break;
      years.push({ yr, d });
    }
  }
  const stars = [];
  for (let i = 0; i < pts.length; i += 2) stars.push([pts[i], pts[i + 1]]);
  const r = width < 500 ? 1.3 : 1.7;

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${fmt(stars.length)} posts placed by date and the time they were written; most sit in the band between 9 pm and 3 am.`}>
          <rect className="mb-sky-band" x={left} width={w} y={y(21 * 60)} height={y(3 * 60) - y(21 * 60)} rx={4} />
          {[["6 am", 360], ["noon", 720], ["6 pm", 1080], ["midnight", 0]].map(([label, m]) => (
            <text key={label} className="mb-sky-axis" x={left - 8} y={y(m) + 3} textAnchor="end">{label}</text>
          ))}
          {years.filter((_, i) => width > 520 || i % 2 === 0).map(({ yr, d }) => (
            <text key={yr} className="mb-sky-axis" x={x(d)} y={height - 6} textAnchor="middle">{yr}</text>
          ))}
          {stars.map(([d, m], i) => (
            // eslint-disable-next-line react/no-array-index-key
            <circle key={i} className={`mb-sky-star${isNightMinute(m) ? " is-night" : ""}`} cx={x(d)} cy={y(m)} r={r} />
          ))}
        </svg>
      )}
    </div>
  );
};
NightSky.propTypes = { sky: PropTypes.shape({ start: PropTypes.string, points: PropTypes.arrayOf(PropTypes.number) }), height: PropTypes.number };
NightSky.defaultProps = { sky: null, height: 240 };

// ── The 24-hour clock ─────────────────────────────────────────────────────

export const HourClock = ({ hours, size }) => {
  const max = Math.max(1, ...hours);
  const c = size / 2;
  const inner = size * 0.2;
  const outer = size * 0.44;
  const arc = (h0, h1, r0, r1) => {
    const a0 = ((h0 / 24) * 360 - 90) * (Math.PI / 180);
    const a1 = ((h1 / 24) * 360 - 90) * (Math.PI / 180);
    const p = (rr, a) => `${c + rr * Math.cos(a)},${c + rr * Math.sin(a)}`;
    return `M${p(r0, a0)} L${p(r1, a0)} A${r1},${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 0 0 ${p(r0, a0)} Z`;
  };
  const total = hours.reduce((a, b) => a + b, 0);
  const peak = hours.indexOf(max);
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size }} role="img" aria-label={`Posts by hour of day; the busiest hour is ${hourLabel(peak)}.`}>
      <path className="mb-clock-night" d={arc(21, 27, inner - 4, outer + 4)} />
      {[0.5, 1].map((f) => <circle key={f} className="mb-clock-ring" cx={c} cy={c} r={inner + (outer - inner) * f} />)}
      {hours.map((n, h) => (
        <path key={h} className={`mb-clock-wedge${NIGHT_HOURS.includes(h) ? " is-night" : ""}`} d={arc(h + 0.08, h + 0.92, inner, inner + (outer - inner) * (n / max))}>
          <title>{`${hourLabel(h)}: ${fmt(n)} posts`}</title>
        </path>
      ))}
      {[["midnight", 0], ["6 am", 6], ["noon", 12], ["6 pm", 18]].map(([label, h]) => {
        const a = ((h / 24) * 360 - 90) * (Math.PI / 180);
        const rr = outer + 14;
        return <text key={label} className="mb-clock-label" x={c + rr * Math.cos(a)} y={c + rr * Math.sin(a) + 3} textAnchor="middle">{label}</text>;
      })}
      <text x={c} y={c - 4} textAnchor="middle" style={{ fill: "var(--mb-ink)", fontSize: 22, fontWeight: 800 }}>{hourLabel(peak)}</text>
      <text x={c} y={c + 14} textAnchor="middle" className="mb-clock-label">{`busiest of ${fmt(total)}`}</text>
    </svg>
  );
};
HourClock.propTypes = { hours: PropTypes.arrayOf(PropTypes.number).isRequired, size: PropTypes.number };
HourClock.defaultProps = { size: 300 };

// ── Grids ────────────────────────────────────────────────────────────────

const shade = (n, max) => (n ? `color-mix(in srgb, var(--mb-accent) ${Math.round(18 + (n / max) * 82)}%, transparent)` : undefined);

/** Weekday × hour: when in the week the posts were written. */
export const WeekHourGrid = ({ grid }) => {
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="mb-scroll-x">
      <div className="grid gap-[3px] min-w-[340px]" style={{ gridTemplateColumns: "2.2rem repeat(24, minmax(0, 1fr))" }} role="img" aria-label="Posts by weekday and hour">
        {grid.map((row, d) => (
          <React.Fragment key={WEEKDAYS[d]}>
            <span className="font-label text-[10px] mb-muted self-center">{WEEKDAYS[d]}</span>
            {row.map((n, h) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={h} className="mb-heat-cell aspect-square" style={{ background: shade(n, max) }} title={`${WEEKDAYS[d]} ${hourLabel(h)}: ${fmt(n)}`} />
            ))}
          </React.Fragment>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="font-mono text-[9px] mb-faint text-center">{h % 6 === 0 ? hourLabel(h).replace(" ", "") : ""}</span>
        ))}
      </div>
    </div>
  );
};
WeekHourGrid.propTypes = { grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired };

/** One year as a contribution calendar: weeks across, weekdays down. */
export const CalendarYear = ({ year, days, max, onPickMonth }) => {
  const jan1 = new Date(Date.UTC(Number(year), 0, 1));
  const lead = jan1.getUTCDay();
  const len = (Date.UTC(Number(year) + 1, 0, 1) - jan1.getTime()) / 86400000;
  const cells = Array.from({ length: lead }, () => null);
  for (let i = 0; i < len; i += 1) {
    const d = new Date(jan1.getTime() + i * 86400000).toISOString().slice(0, 10);
    cells.push(d);
  }
  const total = cells.reduce((a, d) => a + (d && days[d] ? days[d] : 0), 0);
  return (
    <div className="flex items-start gap-3">
      <span className="font-mono text-[11px] mb-muted w-10 shrink-0 pt-0.5">{year}</span>
      <div className="mb-scroll-x flex-1">
        <div className="grid grid-flow-col gap-[2px] w-max" style={{ gridTemplateRows: "repeat(7, 10px)", gridAutoColumns: "10px" }} role="img" aria-label={`${year}: ${fmt(total)} posts`}>
          {cells.map((d, i) => (d ? (
            <button
              type="button"
              key={d}
              onClick={onPickMonth && days[d] ? () => onPickMonth(d.slice(0, 7)) : undefined}
              className={`mb-heat-cell p-0 border-0 ${days[d] && onPickMonth ? "cursor-pointer" : "cursor-default"}`}
              style={{ background: shade(days[d] || 0, max) }}
              title={`${dateLabel(d)}: ${fmt(days[d] || 0)} post${days[d] === 1 ? "" : "s"}`}
              tabIndex={-1}
              aria-hidden="true"
            />
          ) : <span key={`pad-${i}`} />))}
        </div>
      </div>
      <span className="font-mono text-[11px] mb-muted w-10 text-right shrink-0 pt-0.5">{fmt(total)}</span>
    </div>
  );
};
CalendarYear.propTypes = {
  year: PropTypes.string.isRequired,
  days: PropTypes.objectOf(PropTypes.number).isRequired,
  max: PropTypes.number.isRequired,
  onPickMonth: PropTypes.func,
};
CalendarYear.defaultProps = { onPickMonth: null };

// ── Bars ─────────────────────────────────────────────────────────────────

/** Vertical columns with labels underneath (years, months, weekdays, bins). */
export const Columns = ({
  items, height, highlight, onPick, labelEvery, color,
}) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex items-end gap-[3px] w-full" style={{ height: height + 34 }}>
      {items.map((it, i) => {
        const Tag = onPick ? "button" : "div";
        return (
          <Tag
            key={it.key}
            type={onPick ? "button" : undefined}
            onClick={onPick ? () => onPick(it.key) : undefined}
            className={`group flex flex-col items-center justify-end h-full flex-1 min-w-0 bg-transparent border-0 p-0 ${onPick ? "cursor-pointer" : ""}`}
            title={`${it.title || it.label}: ${fmt(it.value)}`}
          >
            {it.showValue !== false && (
              <span className="font-mono text-[10px] mb-muted mb-1 leading-none">{items.length <= 14 ? fmt(it.value) : ""}</span>
            )}
            <span
              className="mb-grow block w-full rounded-t-[3px] transition-opacity group-hover:opacity-75"
              style={{
                height: Math.max(it.value ? 3 : 1, (it.value / max) * height),
                background: it.value ? (it.color || (highlight === it.key ? "var(--mb-accent)" : color)) : "var(--mb-line)",
                transitionDelay: `${Math.min(i * 25, 600)}ms`,
              }}
            />
            <span className="font-mono text-[9px] mb-faint mt-1 leading-none h-3 whitespace-nowrap">
              {i % labelEvery === 0 ? it.label : ""}
            </span>
          </Tag>
        );
      })}
    </div>
  );
};
Columns.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string, value: PropTypes.number })).isRequired,
  height: PropTypes.number,
  highlight: PropTypes.string,
  onPick: PropTypes.func,
  labelEvery: PropTypes.number,
  color: PropTypes.string,
};
Columns.defaultProps = {
  height: 120, highlight: null, onPick: null, labelEvery: 1, color: "color-mix(in srgb, var(--mb-accent) 55%, transparent)",
};

/** Horizontal bars, one row per item, optional click. */
export const BarList = ({ items, onPick, total }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-2 list-none p-0 m-0">
      {items.map((it) => {
        const inner = (
          <>
            <span className="flex items-center gap-2 w-32 sm:w-40 shrink-0 min-w-0 text-left">
              {it.swatch && <span aria-hidden="true" className="h-2 w-2 rounded-full shrink-0" style={{ background: it.swatch }} />}
              <span className="truncate font-body text-[13px]">{it.label}</span>
            </span>
            <span className="flex-1 h-2 rounded-full mb-track overflow-hidden">
              <span className="mb-grow-x block h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: it.color || "var(--mb-accent)" }} />
            </span>
            <span className="font-mono text-xs mb-muted w-12 text-right shrink-0 mb-num">{fmt(it.value)}</span>
            {total ? <span className="font-mono text-[10px] mb-faint w-9 text-right shrink-0">{`${Math.round((it.value / total) * 100)}%`}</span> : null}
          </>
        );
        return (
          <li key={it.key}>
            {onPick ? (
              <button type="button" onClick={() => onPick(it.key)} className="w-full flex items-center gap-3 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80" style={{ color: "inherit" }}>
                {inner}
              </button>
            ) : <div className="flex items-center gap-3">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
};
BarList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string, value: PropTypes.number })).isRequired,
  onPick: PropTypes.func,
  total: PropTypes.number,
};
BarList.defaultProps = { onPick: null, total: null };

/** One 100% bar split into parts, with a legend underneath. */
export const ShareBar = ({ parts, height }) => {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex w-full overflow-hidden rounded-full mb-track" style={{ height }} role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}>
        {parts.filter((p) => p.value).map((p) => (
          <span key={p.label} className="mb-grow-x block h-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${fmt(p.value)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {parts.filter((p) => p.value).map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5 font-label text-[11px] mb-muted">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.label}
            <span className="font-mono mb-faint">{`${Math.round((p.value / total) * 100)}%`}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
ShareBar.propTypes = { parts: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number, color: PropTypes.string })).isRequired, height: PropTypes.number };
ShareBar.defaultProps = { height: 12 };

/** A tag's life across the years, as a small filled line. */
export const Sparkline = ({ values, color, height }) => {
  const [ref, width] = useWidth();
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          <polygon points={`0,${height} ${line} ${width},${height}`} style={{ fill: color, opacity: 0.15 }} />
          <polyline className="mb-spark" points={line} style={{ stroke: color }} />
        </svg>
      )}
    </div>
  );
};
Sparkline.propTypes = { values: PropTypes.arrayOf(PropTypes.number).isRequired, color: PropTypes.string.isRequired, height: PropTypes.number };
Sparkline.defaultProps = { height: 28 };

/** Every posting day across the archive as a barcode, with two ranges marked. */
export const DayStrip = ({ days, from, to, marks }) => {
  const [ref, width] = useWidth();
  const d0 = Date.parse(`${from}T00:00:00Z`);
  const span = Math.max(1, (Date.parse(`${to}T00:00:00Z`) - d0) / 86400000);
  const x = (d) => ((Date.parse(`${d}T00:00:00Z`) - d0) / 86400000 / span) * width;
  const h = 44;
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={h + 16} role="img" aria-label="Every day with a post, across the whole archive">
          {marks.map((m) => (
            <rect key={m.label} x={x(m.from)} width={Math.max(3, x(m.to) - x(m.from))} y={0} height={h} rx={3} style={{ fill: m.color, opacity: 0.22 }} />
          ))}
          {Object.keys(days).map((d) => (
            <rect key={d} x={x(d)} width={Math.max(0.8, width / span)} y={6} height={h - 12} style={{ fill: "var(--mb-ink)", opacity: 0.45 }} />
          ))}
          <text className="mb-sky-axis" x={0} y={h + 13}>{from.slice(0, 4)}</text>
          <text className="mb-sky-axis" x={width} y={h + 13} textAnchor="end">{to.slice(0, 4)}</text>
        </svg>
      )}
    </div>
  );
};
DayStrip.propTypes = {
  days: PropTypes.objectOf(PropTypes.number).isRequired,
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  marks: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, from: PropTypes.string, to: PropTypes.string, color: PropTypes.string })),
};
DayStrip.defaultProps = { marks: [] };

export { fmt };
