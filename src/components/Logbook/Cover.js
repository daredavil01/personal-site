import React, { useMemo, useRef } from "react";
import ChartBase, {
  Compass, RegionLabels, chartScales, landSize, useRegionLabels,
} from "./ChartBase";
import {
  diamond, fmt, monthYear, useWidth,
} from "./shared";

// The cover: the title, the logbook's own figures, and the chart with the
// wanderer's route inked across it — every essay in the order it was
// written, each dot landing as the line reaches it. Art only; the Atlas
// chapter is the chart you can use.

const ROUTE_SECONDS = 5.5;
const ROUTE_DELAY = 0.4;

// A Catmull-Rom spline through the points, as cubic Béziers, so the route
// reads as a line walked rather than a set of jumps.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  const d = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d.push(`C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return d.join("");
}

const CoverArt = ({ data }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 560);
  const height = Math.round(width * 0.82);
  const pad = Math.max(26, width * 0.07);
  const { x, y } = chartScales(width, height, pad);
  const labelSize = Math.max(12, Math.min(16, width / 36));
  const labels = useRegionLabels(data.clusters, width, height, pad, labelSize, landSize(width, height));
  const placed = useMemo(() => data.posts.filter((p) => p.xy), [data.posts]);

  const route = useMemo(() => {
    const pts = placed.map((p) => [x(p.xy[0]), y(p.xy[1])]);
    // Each dot's delay is the share of the route walked when the line gets there.
    const seg = pts.map((p, i) => (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0));
    const total = seg.reduce((a, b) => a + b, 0) || 1;
    let walked = 0;
    const at = seg.map((s) => {
      walked += s;
      return walked / total;
    });
    return { d: smoothPath(pts), pts, at };
  }, [placed, width, height]); // x and y follow from width and height

  const last = placed[placed.length - 1];
  const head = route.pts[route.pts.length - 1];
  const r = Math.max(2.4, width / 230);

  return (
    <div ref={ref} className="relative w-full" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block w-full h-auto">
        <defs>
          <mask id="lb-cover-route-mask">
            <path d={route.d} pathLength="1" className="lb-route" stroke="#fff" strokeWidth="6" fill="none" style={{ animationDuration: `${ROUTE_SECONDS}s`, animationTimingFunction: "linear", animationDelay: `${ROUTE_DELAY}s` }} />
          </mask>
        </defs>
        <rect x="1" y="1" width={Math.max(0, width - 2)} height={Math.max(0, height - 2)} rx="14" fill="none" stroke="var(--lb-faint)" />
        <rect x="7" y="7" width={Math.max(0, width - 14)} height={Math.max(0, height - 14)} rx="10" fill="none" stroke="var(--lb-hair)" />
        <ChartBase posts={data.posts} clusters={data.clusters} width={width} height={height} pad={pad} uid="lb-cover" labels={false} />
        <path d={route.d} fill="none" stroke="var(--lb-accent)" strokeWidth="1.4" strokeDasharray="1 5" strokeLinecap="round" opacity="0.8" mask="url(#lb-cover-route-mask)" />
        {route.pts.map(([px, py], i) => (
          <g key={placed[i].id} className="lb-route-dot" style={{ animationDelay: `${ROUTE_DELAY + route.at[i] * ROUTE_SECONDS}s` }}>
            {placed[i].lang === "mr" ? (
              <polygon points={diamond(px, py, r * 1.3)} fill="var(--lb-mr)" stroke="var(--lb-paper)" strokeWidth="1" />
            ) : (
              <circle cx={px} cy={py} r={r} fill="var(--lb-en)" stroke="var(--lb-paper)" strokeWidth="1" />
            )}
          </g>
        ))}
        <RegionLabels placed={labels} labelSize={labelSize} />
        {head && (
          <g className="lb-route-dot" style={{ animationDelay: `${ROUTE_DELAY + ROUTE_SECONDS}s` }}>
            <circle cx={head[0]} cy={head[1]} r={r * 2.4} fill="none" stroke="var(--lb-accent)" strokeWidth="1.5" className="lb-pulse" />
            <circle cx={head[0]} cy={head[1]} r={r * 1.6} fill="var(--lb-accent)" stroke="var(--lb-paper)" strokeWidth="1.5" />
            <text
              x={head[0] > width * 0.62 ? head[0] - 12 : head[0] + 12}
              y={head[1] < 40 ? head[1] + 22 : head[1] - 12}
              textAnchor={head[0] > width * 0.62 ? "end" : "start"}
              className="lb-svg-label"
              fontSize="10"
              fill="var(--lb-accent)"
              stroke="var(--lb-paper)"
              strokeWidth="3"
              paintOrder="stroke"
            >
              {`LATEST · ${monthYear(last.date).toUpperCase()}`}
            </text>
          </g>
        )}
        <Compass x={pad * 0.5 + 18} y={height - pad * 0.5 - 18} size={Math.max(30, width / 14)} />
      </svg>
    </div>
  );
};

const Stat = ({ n, label }) => (n ? (
  <div>
    <p className="lb-stat-n lb-num m-0">{n}</p>
    <p className="lb-kicker lb-soft m-0 mt-1.5">{label}</p>
  </div>
) : null);

const Cover = ({ data, onBegin, onContents, onRandom }) => {
  const t = data ? data.totals : null;
  return (
    <header className="lb-paper lb-cover lb-cq px-5 py-8 sm:px-8 md:px-10 md:py-12">
      <div className="lb-cover-grid">
        <div className="flex flex-col gap-6 min-w-0 relative">
          <p className="lb-kicker lb-accent m-0">
            {t ? `Scriptorium · A field journal · ${t.firstYear}–${t.lastYear}` : "Scriptorium · A field journal"}
          </p>
          <h1 className="lb-display lb-cover-title m-0">
            Wanderer&rsquo;s
            <br />
            <span className="lb-italic lb-accent">Logbook</span>
          </h1>
          <p className="font-body text-base md:text-lg lb-ink-2 m-0 max-w-xl leading-relaxed">
            Every essay I have published, in English and <span lang="mr" className="lb-mr-text">मराठी</span>, read
            the way a machine reads them — as a map, a night sky, a fingerprint, a habit of the hand, a letter
            across years and a poem. Every mark is an essay, and every one opens.
          </p>
          {t && (
            <div className="lb-cover-stats">
              <Stat n={fmt(t.posts)} label="Entries" />
              <Stat n={fmt(t.words)} label="Words" />
              <Stat n={fmt(t.sentences)} label="Sentences" />
              <Stat n={fmt(t.exclaims)} label="Exclamation marks" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="lb-btn lb-btn--ink" onClick={onBegin} disabled={!data}>
              Begin reading
              <span aria-hidden="true">↓</span>
            </button>
            <button type="button" className="lb-btn" onClick={onContents} disabled={!data}>Contents</button>
            <button type="button" className="lb-btn lb-btn--ghost" onClick={onRandom} disabled={!data}>
              <span aria-hidden="true">✦</span>
              A random entry
            </button>
          </div>
        </div>
        {data ? <CoverArt data={data} /> : <div className="w-full lb-inset" style={{ aspectRatio: "1 / 0.82" }} aria-hidden="true" />}
      </div>
    </header>
  );
};

export default Cover;
