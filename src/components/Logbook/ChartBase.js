import React, { memo, useMemo } from "react";
import { placeLabels, scale } from "./shared";
import { splitLabel, titleCase } from "./model";

// The chart's ground: a graticule, and each region drawn as an island. Every
// essay in a region drops a disc of the region's colour; a blur and an alpha
// threshold melt the discs into one landmass (the "gooey" filter), an erode
// traces its coastline and a dilate draws a contour offshore — so the
// islands' shapes are the essays' own positions, not a drawn outline.
// Static by design: the marks are drawn by whoever lays this underneath, so
// hovering an essay never repaints the filters.

export const regionFill = (id) => `var(--lb-r${id % 6})`;

export const chartScales = (width, height, pad) => ({
  x: scale([0, 1], [pad, width - pad]),
  y: scale([0, 1], [pad, height - pad]),
});

/** Region names in italic, haloed by the paper, placed by placeLabels. */
export const useRegionLabels = (clusters, width, height, pad, labelSize, land) => {
  const narrow = width < 560;
  return useMemo(() => {
    const { x, y } = chartScales(width, height, pad);
    return placeLabels(
      clusters.map((c) => {
        const name = titleCase(c.label);
        return { ...c, name, lines: narrow ? splitLabel(name) : [name] };
      }),
      x,
      y,
      { width, charW: labelSize * 0.47, lift: land * 1.6, line: labelSize * 1.2 },
    );
  }, [clusters, width, height, pad, labelSize, land, narrow]);
};

export const landSize = (width, height, landScale = 1) => Math.max(9, Math.min(width, height) * 0.055) * landScale;

export const RegionLabels = ({ placed, labelSize, focusRegion = null }) => (
  <g aria-hidden="true" pointerEvents="none" className="lb-svg-italic" fontSize={labelSize} textAnchor="middle">
    {placed.map((c) => (
      <text
        key={c.id}
        x={c.lx}
        y={c.ly}
        fill="var(--lb-ink-2)"
        stroke="var(--lb-paper)"
        strokeWidth="4"
        strokeLinejoin="round"
        paintOrder="stroke"
        opacity={focusRegion == null || focusRegion === c.id ? 1 : 0.3}
        style={{ transition: "opacity 0.35s" }}
      >
        {c.lines.map((l, i) => (
          <tspan key={l} x={c.lx} dy={i ? labelSize * 1.15 : 0}>{l}</tspan>
        ))}
      </text>
    ))}
  </g>
);

const ChartBase = ({
  posts, clusters, width, height, pad, uid, labels = true, graticule = true, focusRegion = null, landScale = 1, labelSize = 15,
}) => {
  const { x, y } = chartScales(width, height, pad);
  const land = landSize(width, height, landScale);
  const blur = land * 0.5;
  const placed = useRegionLabels(clusters, width, height, pad, labelSize, land);

  const cells = 8;
  return (
    <g pointerEvents="none">
      <defs>
        <filter id={`${uid}-isle`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" result="land" />
          <feComponentTransfer in="land" result="wash"><feFuncA type="linear" slope="0.42" /></feComponentTransfer>
          <feMorphology in="land" operator="erode" radius="1.3" result="inner" />
          <feComposite in="land" in2="inner" operator="out" result="coast" />
          <feMorphology in="land" operator="dilate" radius={Math.max(3, land * 0.28)} result="shoal" />
          <feMorphology in="land" operator="dilate" radius={Math.max(2.2, land * 0.28 - 1)} result="shoalIn" />
          <feComposite in="shoal" in2="shoalIn" operator="out" result="contour" />
          <feComponentTransfer in="contour" result="contourSoft"><feFuncA type="linear" slope="0.38" /></feComponentTransfer>
          <feMerge>
            <feMergeNode in="contourSoft" />
            <feMergeNode in="wash" />
            <feMergeNode in="coast" />
          </feMerge>
        </filter>
      </defs>

      {graticule && (
        <g stroke="var(--lb-hair)" strokeWidth="1" aria-hidden="true">
          {Array.from({ length: cells - 1 }, (_, i) => {
            const gx = (width / cells) * (i + 1);
            const gy = (height / cells) * (i + 1);
            return (
              <g key={i}>
                <line x1={gx} x2={gx} y1="0" y2={height} />
                <line x1="0" x2={width} y1={gy} y2={gy} />
              </g>
            );
          })}
        </g>
      )}

      <g aria-hidden="true">
        {clusters.map((c) => (
          <g
            key={c.id}
            filter={`url(#${uid}-isle)`}
            fill={regionFill(c.id)}
            opacity={focusRegion == null || focusRegion === c.id ? 1 : 0.28}
            style={{ transition: "opacity 0.35s" }}
          >
            {posts.filter((p) => p.xy && p.cluster === c.id).map((p) => (
              <circle key={p.id} cx={x(p.xy[0])} cy={y(p.xy[1])} r={land} />
            ))}
          </g>
        ))}
      </g>

      {labels && <RegionLabels placed={placed} labelSize={labelSize} focusRegion={focusRegion} />}
    </g>
  );
};

export default memo(ChartBase);

/** A small compass rose, drawn in ink. */
export const Compass = ({ x, y, size = 40 }) => {
  const r = size / 2;
  const pt = (a, d) => `${(x + Math.cos(a) * d).toFixed(1)},${(y + Math.sin(a) * d).toFixed(1)}`;
  const star = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const long = i % 2 === 0;
    return `${pt(a, long ? r : r * 0.55)} ${pt(a + Math.PI / 8, r * 0.18)}`;
  }).join(" ");
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r={r * 0.78} fill="none" stroke="var(--lb-faint)" />
      <polygon points={star} fill="var(--lb-ink)" opacity="0.72" />
      <polygon points={`${pt(-Math.PI / 2, r)} ${pt(-Math.PI / 2 + Math.PI / 8, r * 0.18)} ${x},${y}`} fill="var(--lb-accent)" />
      <text x={x} y={y - r - 5} textAnchor="middle" fontSize={Math.max(9, size * 0.22)} className="lb-svg-italic" fill="var(--lb-ink-2)">N</text>
    </g>
  );
};
