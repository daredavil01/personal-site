import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { FAMILY_LABELS, monthGrid } from "../../../lib/training";
import {
  FAMILIES, Legend, famColor, useInView,
} from "../shared";

// One year's months as stacked bars, a segment per sport with a 2px gap.
// Hover a month for its breakdown; the bars grow in when first seen.

const W = 900;
const H = 260;
const P = {
  l: 40, r: 8, t: 12, b: 26,
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MonthlyBars = ({ rows, year }) => {
  const [ref, seen] = useInView(0.3);
  const [hover, setHover] = useState(null);
  const grid = useMemo(() => monthGrid(rows), [rows]);
  const months = grid[year] || new Array(12).fill({});
  const sums = months.map((m) => Object.values(m).reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...Object.values(grid).flat().map((m) => Object.values(m).reduce((a, b) => a + b, 0)));
  const families = FAMILIES.filter((f) => months.some((m) => m[f]));
  const bw = (W - P.l - P.r) / 12;
  const yS = (v) => (v / max) * (H - P.t - P.b);

  return (
    <figure ref={ref} className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label={`Distance per month in ${year}, by sport`} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={P.l} x2={W - P.r} y1={H - P.b - yS(max * f)} y2={H - P.b - yS(max * f)} stroke="var(--tr-grid)" />
            <text x={P.l - 6} y={H - P.b - yS(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--tr-muted)">{Math.round((max * f) / 1000)}</text>
          </g>
        ))}
        {months.map((m, i) => {
          let acc = 0;
          const x = P.l + i * bw + bw * 0.18;
          const w = bw * 0.64;
          return (
            // eslint-disable-next-line react/no-array-index-key
            <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "default" }}>
              <rect x={P.l + i * bw} y={P.t} width={bw} height={H - P.t - P.b} fill={hover === i ? "var(--tr-grid)" : "transparent"} />
              {families.filter((f) => m[f]).map((f) => {
                const h = yS(m[f]);
                const y0 = H - P.b - acc - h;
                acc += h + 2;
                return (
                  <rect
                    key={f}
                    x={x}
                    y={y0}
                    width={w}
                    height={Math.max(0, h)}
                    rx="3"
                    fill={famColor(f)}
                    className={seen ? "tr-grow" : ""}
                    style={{ animationDelay: `${i * 50}ms`, opacity: seen ? 1 : 0 }}
                  />
                );
              })}
              <text x={P.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={hover === i ? "var(--tr-ink)" : "var(--tr-muted)"}>{MONTHS[i]}</text>
              {hover === i && sums[i] > 0 && (
                <text x={P.l + i * bw + bw / 2} y={H - P.b - acc - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--tr-ink)">{`${Math.round(sums[i] / 1000)} km`}</text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <Legend families={families} />
        <span className="font-label text-[11px] uppercase tracking-wider tabular-nums" style={{ color: "var(--tr-muted)" }} aria-live="polite">
          {hover != null && sums[hover] > 0
            ? `${MONTHS[hover]}: ${families.filter((f) => months[hover][f]).map((f) => `${FAMILY_LABELS[f]} ${Math.round(months[hover][f] / 1000)} km`).join(" · ")}`
            : "Hover a month"}
        </span>
      </figcaption>
    </figure>
  );
};

MonthlyBars.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired, year: PropTypes.number.isRequired };

export default MonthlyBars;
