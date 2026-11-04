import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { regionName, regionShortName } from "../../lib/microblogInsights";
import { dateLabel, fmt, useWidth } from "./charts";

// The two figures that read meaning rather than counts, both built from the
// /ask vectors by `npm run microblog:insights`: the topic map (every post
// placed by what it says) and the tones across the quarters.

export const regionColor = (i) => `var(--mb-r${i % 8})`;
export const moodColor = (id) => `var(--mb-mood-${id})`;
const LANG_COLORS = ["var(--mb-en)", "var(--mb-mr)", "var(--mb-none)"];
const LANG_LABELS = ["English", "Marathi", "No words"];
const STRIDE = 7; // [id, x, y, region, lang, year index, mood index]

const COLOR_BY = [
  { id: "region", label: "Neighbourhood" },
  { id: "lang", label: "Language" },
  { id: "year", label: "Year" },
  { id: "mood", label: "Tone" },
];

export const TopicMap = ({
  map, years, moods, onOpenId,
}) => {
  const [ref, width] = useWidth();
  const [colorBy, setColorBy] = useState("region");
  const [hover, setHover] = useState(null);
  const [focusRegion, setFocusRegion] = useState(null);
  const height = Math.round(Math.min(560, Math.max(320, width * 0.68)));
  const pad = 16;
  const sx = (x) => pad + (x / 1000) * (width - pad * 2);
  const sy = (y) => pad + (y / 1000) * (height - pad * 2);

  const points = useMemo(() => {
    const out = [];
    for (let i = 0; i < map.points.length; i += STRIDE) {
      const p = map.points.slice(i, i + STRIDE);
      out.push({
        id: p[0], x: p[1], y: p[2], region: p[3], lang: p[4], year: p[5], mood: p[6],
      });
    }
    return out;
  }, [map.points]);

  const colorOf = (p) => {
    if (colorBy === "lang") return LANG_COLORS[p.lang];
    if (colorBy === "year") return `color-mix(in srgb, var(--mb-accent) ${Math.round(20 + (p.year / Math.max(1, years.length - 1)) * 80)}%, var(--mb-line))`;
    if (colorBy === "mood") return p.mood >= 0 && moods ? moodColor(moods.list[p.mood].id) : "var(--mb-none)";
    return regionColor(p.region);
  };

  const nearest = (evt) => {
    const box = evt.currentTarget.getBoundingClientRect();
    const mx = evt.clientX - box.left;
    const my = evt.clientY - box.top;
    let best = null;
    let bestD = 24 * 24;
    points.forEach((p) => {
      const d = (sx(p.x) - mx) ** 2 + (sy(p.y) - my) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    });
    return best;
  };

  const legend = (() => {
    if (colorBy === "lang") return LANG_LABELS.map((l, i) => ({ key: l, label: l, color: LANG_COLORS[i] }));
    if (colorBy === "year") return [years[0], years[years.length - 1]].map((y, i) => ({ key: y, label: i ? `${y} (darker)` : y, color: `color-mix(in srgb, var(--mb-accent) ${i ? 100 : 20}%, var(--mb-line))` }));
    if (colorBy === "mood" && moods) return moods.list.map((m) => ({ key: m.id, label: m.label, color: moodColor(m.id) }));
    return map.regions.map((r) => ({ key: String(r.id), label: regionName(r), color: regionColor(r.id) }));
  })();

  const r = width < 500 ? 2.2 : 2.8;
  const hoverRegion = hover ? map.regions[hover.region] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Colour the map by">
        <span className="font-label text-[10px] uppercase tracking-widest mb-muted mr-1">Colour by</span>
        {COLOR_BY.filter((c) => c.id !== "mood" || moods).map((c) => (
          <button key={c.id} type="button" className="mb-chip" aria-pressed={colorBy === c.id} onClick={() => setColorBy(c.id)}>{c.label}</button>
        ))}
      </div>
      <div ref={ref} className="mb-map">
        {width > 0 && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- the region list below is the keyboard route to the same posts
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${fmt(points.length)} posts placed by meaning, in ${map.regions.length} neighbourhoods: ${map.regions.map((x) => regionName(x)).join("; ")}.`}
            onMouseMove={(e) => setHover(nearest(e))}
            onMouseLeave={() => setHover(null)}
            onClick={(e) => {
              const p = nearest(e);
              if (p) onOpenId(p.id);
            }}
            style={{ cursor: hover ? "pointer" : "default", display: "block" }}
          >
            {points.map((p) => (
              <circle
                key={p.id}
                className="mb-map-dot"
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={hover && hover.id === p.id ? r * 2.2 : r}
                style={{
                  fill: colorOf(p),
                  opacity: focusRegion == null || focusRegion === p.region ? 0.85 : 0.08,
                }}
              />
            ))}
            {colorBy === "region" && map.regions.map((reg) => (
              <text key={reg.id} className="mb-map-label" x={sx(reg.x)} y={sy(reg.y)} textAnchor="middle">
                {regionShortName(reg)}
              </text>
            ))}
          </svg>
        )}
        {hover && width > 0 && (
          <div className="mb-map-tip" style={{ left: sx(hover.x), top: sy(hover.y) }}>
            <span className="block font-mono text-[10px] opacity-70">{`${years[hover.year] || ""} · ${LANG_LABELS[hover.lang]}${hover.mood >= 0 && moods ? ` · ${moods.list[hover.mood].label.toLowerCase()}` : ""}`}</span>
            {hoverRegion && <span className="block font-bold">{regionName(hoverRegion)}</span>}
            <span className="block opacity-70">Click to read</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {legend.map((l) => (
          <span key={l.key} className="inline-flex items-center gap-1.5 font-label text-[11px] mb-muted">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <ul className="grid sm:grid-cols-2 gap-3 list-none p-0 mt-6 mb-0">
        {map.regions.map((reg) => (
          <li key={reg.id}>
            <div
              className="mb-card p-4 h-full flex flex-col gap-2"
              onMouseEnter={() => setFocusRegion(reg.id)}
              onMouseLeave={() => setFocusRegion(null)}
              style={{ borderLeft: `3px solid ${regionColor(reg.id)}` }}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-body text-sm font-bold">{regionName(reg)}</span>
                <span className="font-mono text-[11px] mb-faint whitespace-nowrap">{`${fmt(reg.posts)} posts${reg.marathi != null ? ` · ${reg.marathi}% मराठी` : ""}`}</span>
              </span>
              {reg.exemplar && (
                <button type="button" onClick={() => onOpenId(reg.exemplar.id)} className="flex flex-col items-start gap-1 text-left bg-transparent border-0 p-0 cursor-pointer group" style={{ color: "inherit" }}>
                  <span className="font-headline text-[15px] leading-snug group-hover:underline">{`“${reg.exemplar.quote}”`}</span>
                  <span className="font-mono text-[10px] mb-faint">{`${dateLabel(reg.exemplar.date)} · closest to the middle ↗`}</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

TopicMap.propTypes = {
  map: PropTypes.shape({
    points: PropTypes.arrayOf(PropTypes.number),
    regions: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, posts: PropTypes.number })),
  }).isRequired,
  years: PropTypes.arrayOf(PropTypes.string).isRequired,
  moods: PropTypes.shape({ list: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, label: PropTypes.string })) }),
  onOpenId: PropTypes.func.isRequired,
};
TopicMap.defaultProps = { moods: null };

/** Each quarter as a 100% column split by tone; thin quarters are faded. */
export const MoodChart = ({ moods, height }) => {
  const { list, quarters } = moods;
  return (
    <div>
      <div className="flex items-end gap-[2px] w-full" style={{ height: height + 18 }} role="img" aria-label={`Tone of my posts by quarter: ${list.map((m) => m.label).join(", ")}`}>
        {quarters.map((q) => {
          const total = q.counts.reduce((a, b) => a + b, 0);
          const thin = total < 6;
          return (
            <div key={q.key} className="flex flex-col items-stretch flex-1 min-w-0 h-full justify-end" title={`${q.key}: ${list.map((m, i) => `${m.label} ${q.counts[i]}`).join(", ")}`}>
              <div className="mb-grow flex flex-col-reverse w-full rounded-[2px] overflow-hidden" style={{ height, opacity: thin ? 0.35 : 1 }}>
                {list.map((m, i) => (q.counts[i] ? <span key={m.id} style={{ height: `${(q.counts[i] / total) * 100}%`, background: moodColor(m.id) }} /> : null))}
              </div>
              <span className="font-mono text-[9px] mb-faint mt-1 leading-none h-3 text-center">{q.key.endsWith("Q1") ? `’${q.key.slice(2, 4)}` : ""}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {list.map((m, i) => (
          <span key={m.id} className="inline-flex items-center gap-1.5 font-label text-[11px] mb-muted">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: moodColor(m.id) }} />
            {m.label}
            <span className="font-mono mb-faint">{fmt(moods.totals[i])}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
MoodChart.propTypes = {
  moods: PropTypes.shape({
    list: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, label: PropTypes.string })),
    quarters: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, counts: PropTypes.arrayOf(PropTypes.number) })),
    totals: PropTypes.arrayOf(PropTypes.number),
  }).isRequired,
  height: PropTypes.number,
};
MoodChart.defaultProps = { height: 150 };
