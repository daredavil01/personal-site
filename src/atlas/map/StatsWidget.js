// StatsWidget (§4.6) — a floating parchment "Life in Numbers" placard that
// hangs in the sky above the Book Forest and is a shortcut into the /stats
// page. Like the region hotspots it is a real interactive element (role="link"
// + tabIndex + Enter/Space), so keyboard and screen-reader users reach it too;
// the decorative card art is aria-hidden and the transparent hit rect on top
// carries the label. Its numbers come from the same hand-maintained counts the
// orbit teaser uses (src/data/atlasStats.js) — no network call on the hub.

import React from "react";
import PropTypes from "prop-types";
import ATLAS_STATS from "../../data/atlasStats";

// Top-left of the card on the 2000×1250 canvas. Centered (W/2 = 170) on the
// Book Forest's clearing (world x ≈ 1600) and lifted clear of the reader
// hotspot so the two interactive rects never overlap.
const X = 1430;
const Y = 275;
const W = 340;
const H = 145;
const COL = W / 4; // four evenly-spaced stat columns

const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

const STATS = [
  [`${ATLAS_STATS.books}`, "Books"],
  [`${ATLAS_STATS.treks}`, "Treks"],
  [`${ATLAS_STATS.races}`, "Races"],
  [fmtK(ATLAS_STATS.microPosts), "Posts"],
];

const ariaLabel = `Life in numbers — ${ATLAS_STATS.books} books, ${ATLAS_STATS.treks} treks, `
  + `${ATLAS_STATS.races} races, ${fmtK(ATLAS_STATS.microPosts)} micro-posts. Open the full stats page.`;

const StatsWidget = ({ onActivate }) => (
  <g className="atlas-stats-widget" data-region="reader" transform={`translate(${X},${Y})`}>
    <g className="atlas-lift atlas-stats-card" aria-hidden="true">
      {/* Dropped shadow + downward tail pointing at the forest below. */}
      <rect x="3" y="9" width={W} height={H} rx="16" fill="var(--atlas-shadow)" />
      <polygon
        points={`${W / 2 - 12},${H - 5} ${W / 2 + 12},${H - 5} ${W / 2},${H + 18}`}
        fill="var(--atlas-parchment)"
        stroke="var(--atlas-accent)"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Card body */}
      <rect
        x="0"
        y="0"
        width={W}
        height={H}
        rx="16"
        fill="var(--atlas-parchment)"
        stroke="var(--atlas-accent)"
        strokeWidth="3"
      />

      {/* Header: a little bar-chart glyph + title */}
      <g fill="var(--atlas-accent)">
        <rect x="20" y="20" width="6" height="15" rx="2" />
        <rect x="29" y="14" width="6" height="21" rx="2" />
        <rect x="38" y="25" width="6" height="10" rx="2" />
      </g>
      <text
        className="atlas-plaque-text"
        x="54"
        y="32"
        fontSize="15"
        fill="var(--atlas-ink-soft)"
      >
        LIFE IN NUMBERS
      </text>
      <line x1="18" y1="45" x2={W - 18} y2="45" stroke="var(--atlas-line)" strokeWidth="2" />

      {/* Four stat columns with hairline separators */}
      <g stroke="var(--atlas-line)" strokeWidth="1.5" opacity="0.6">
        <line x1={COL} y1="58" x2={COL} y2="108" />
        <line x1={COL * 2} y1="58" x2={COL * 2} y2="108" />
        <line x1={COL * 3} y1="58" x2={COL * 3} y2="108" />
      </g>
      {STATS.map(([value, label], i) => {
        const cx = COL * i + COL / 2;
        return (
          <g key={label} textAnchor="middle">
            <text x={cx} y="90" fontSize="30" fontWeight="800" fill="var(--atlas-accent)">
              {value}
            </text>
            <text
              x={cx}
              y="106"
              fontSize="11"
              fontWeight="700"
              letterSpacing="0.08em"
              fill="var(--atlas-ink-soft)"
            >
              {label.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Footer call to action */}
      <text
        x={W / 2}
        y="131"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        letterSpacing="0.1em"
        fill="var(--atlas-accent)"
      >
        VIEW ALL STATS →
      </text>
    </g>

    {/* Transparent hit target — the one interactive node (mirrors RegionHotspot). */}
    <rect
      className="atlas-stats-hit"
      x="0"
      y="0"
      width={W}
      height={H}
      rx="16"
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => onActivate("pointer")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate("keyboard");
        }
      }}
    />
  </g>
);

StatsWidget.propTypes = {
  onActivate: PropTypes.func.isRequired,
};

export default StatsWidget;
