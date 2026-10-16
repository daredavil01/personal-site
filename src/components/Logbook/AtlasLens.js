import React, { useEffect, useMemo, useRef, useState } from "react";
import ChartBase, {
  Compass, RegionLabels, chartScales, landSize, regionFill, useRegionLabels,
} from "./ChartBase";
import { matchPosts, titleCase } from "./model";
import {
  diamond, fmt, langColor, langProps, monthYear, shortDate, textLang, useReducedMotion, useRoving, useWidth, yearOf,
} from "./shared";

// I · Atlas. Essays sit where their embeddings put them (UMAP, built by
// scripts/build-logbook.mjs); each region is an island grown from its own
// essays and named by their tags. Find an essay by name, keep one language,
// lift one territory out of the sea, or walk the route in writing order.
// Hover reads an essay's first line; a click opens its entry, and the chart
// then draws its three nearest neighbours.

const AtlasLens = ({ data, selected, onSelect }) => {
  const { posts, clusters } = data;
  const placed = useMemo(() => posts.filter((p) => p.xy), [posts]);
  const frameRef = useRef(null);
  const width = useWidth(frameRef, 900);
  const narrow = width < 600;
  const height = Math.round(narrow ? width * 1.12 : width * 0.62);
  const pad = narrow ? 30 : 56;
  const { x, y } = chartScales(width, height, pad);
  const k = Math.max(0.8, Math.min(1.15, width / 900));
  const labelSize = narrow ? 13 : 16;
  const labels = useRegionLabels(clusters, width, height, pad, labelSize, landSize(width, height));

  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("all");
  const [region, setRegion] = useState(null);
  const [peek, setPeek] = useState(null);
  const [hover, setHover] = useState(null);
  const [upTo, setUpTo] = useState(placed.length);
  const [walking, setWalking] = useState(false);
  const [pinned, setPinned] = useState(null);
  const reduced = useReducedMotion();
  const open = (p) => {
    setPinned(p.id);
    onSelect(p.id);
  };

  const matches = useMemo(() => matchPosts(placed, query), [placed, query]);
  const on = (p, i) => (lang === "all" || p.lang === lang)
    && (region == null || p.cluster === region)
    && (!matches || matches.has(p.id))
    && i < upTo;
  const count = placed.filter(on).length;
  const filtered = count < placed.length;

  useEffect(() => {
    if (!walking) return undefined;
    if (reduced) {
      setUpTo(placed.length);
      setWalking(false);
      return undefined;
    }
    const id = setInterval(() => {
      setUpTo((n) => {
        if (n >= placed.length) {
          setWalking(false);
          return n;
        }
        return n + 1;
      });
    }, 85);
    return () => clearInterval(id);
  }, [walking, placed.length, reduced]);

  const roving = useRoving(placed.length, (i) => open(placed[i]), placed.length - 1);

  const showRoute = walking || upTo < placed.length;
  const shown = placed.slice(0, upTo);
  const route = shown.map((p, i) => `${i ? "L" : "M"}${x(p.xy[0]).toFixed(1)},${y(p.xy[1]).toFixed(1)}`).join("");
  const head = shown[shown.length - 1];
  // The last essay opened stays marked, with its neighbours, after its
  // entry closes; a click on open sea lets it go.
  const sel = (selected && selected.xy ? selected : null) || placed.find((p) => p.id === pinned) || null;
  const near = sel ? (sel.near || []).map((id) => placed.find((p) => p.id === id)).filter(Boolean) : [];
  const focus = hover || null;
  const r0 = (p) => (3.2 + Math.sqrt(p.words) / 10.5) * k;
  const focusRegion = peek != null ? peek : region;

  const tip = focus && (() => {
    const fx = x(focus.xy[0]);
    const fy = y(focus.xy[1]);
    const tw = Math.min(300, width * 0.8);
    const left = fx + tw + 24 > width ? Math.max(8, fx - tw - 16) : fx + 16;
    const top = Math.max(8, Math.min(height - 150, fy - 30));
    return { left, top, tw };
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="lb-search flex-1 min-w-[200px] max-w-md">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Find an essay on the chart" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an essay — a title, a tag, a word…" />
        </div>
        <div className="lb-seg" role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === "all"} onClick={() => setLang("all")}>All</button>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
          <button type="button" aria-pressed={lang === "mr"} onClick={() => setLang("mr")} className="lb-mr-text" lang="mr">मराठी</button>
        </div>
        <button
          type="button"
          className="lb-btn"
          onClick={() => {
            if (walking) setWalking(false);
            else {
              setUpTo(1);
              setWalking(true);
            }
          }}
        >
          <span aria-hidden="true">{walking ? "❚❚" : "▶"}</span>
          {walking ? "Pause" : "Walk the route"}
        </button>
      </div>

      <div ref={frameRef} className="lb-chart-frame lb-paper overflow-hidden" style={{ borderRadius: 18 }}>
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block w-full h-auto" role="group" aria-label="Chart of essays placed by meaning. Use the arrow keys to move between essays in writing order, Enter to open one.">
          <rect x="0" y="0" width={width} height={height} fill="transparent" onClick={() => setPinned(null)} />
          <rect x="6" y="6" width={Math.max(0, width - 12)} height={Math.max(0, height - 12)} rx="12" fill="none" stroke="var(--lb-faint)" pointerEvents="none" />
          <ChartBase posts={posts} clusters={clusters} width={width} height={height} pad={pad} uid="lb-atlas" focusRegion={focusRegion} labels={false} />
          <Compass x={width - 44} y={height - 46} size={narrow ? 32 : 42} />

          {showRoute && (
            <path d={route} fill="none" stroke="var(--lb-accent)" strokeWidth="1.5" strokeDasharray="1 5" strokeLinecap="round" opacity="0.75" />
          )}

          {near.map((n) => (
            <line key={n.id} x1={x(sel.xy[0])} y1={y(sel.xy[1])} x2={x(n.xy[0])} y2={y(n.xy[1])} stroke="var(--lb-accent)" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.8" />
          ))}

          {placed.map((p, i) => {
            const cx = x(p.xy[0]);
            const cy = y(p.xy[1]);
            const r = r0(p);
            const isOn = on(p, i);
            const isSel = sel && sel.id === p.id;
            const isNear = near.some((n) => n.id === p.id);
            const { ref, ...rove } = roving.props(i);
            return (
              <g
                key={p.id}
                ref={ref}
                className="lb-hit"
                role="button"
                aria-label={`${p.title}, ${shortDate(p.date)}, ${p.lang === "mr" ? "Marathi" : "English"}`}
                aria-pressed={!!isSel}
                {...rove}
                onClick={() => open(p)}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                onFocus={(e) => { rove.onFocus(e); setHover(p); }}
                onBlur={() => setHover(null)}
                opacity={isOn ? 1 : 0.1}
                style={{ transition: "opacity 0.3s" }}
              >
                <circle className="lb-focus-ring" cx={cx} cy={cy} r={r + 6} />
                {(isSel || isNear) && (
                  <circle cx={cx} cy={cy} r={r + (isSel ? 7 : 5)} fill="none" stroke="var(--lb-accent)" strokeWidth={isSel ? 2 : 1.2} />
                )}
                {p.lang === "mr" ? (
                  <polygon className="lb-mark" points={diamond(cx, cy, r * 1.25)} fill={langColor(p.lang)} stroke="var(--lb-paper)" strokeWidth="1.5" strokeLinejoin="round" />
                ) : (
                  <circle className="lb-mark" cx={cx} cy={cy} r={r} fill={langColor(p.lang)} stroke="var(--lb-paper)" strokeWidth="1.5" />
                )}
              </g>
            );
          })}

          <RegionLabels placed={labels} labelSize={labelSize} focusRegion={focusRegion} />

          {showRoute && head && (
            <g pointerEvents="none">
              <circle cx={x(head.xy[0])} cy={y(head.xy[1])} r={r0(head) + 9} fill="none" stroke="var(--lb-accent)" strokeWidth="2" />
              <text x={Math.min(Math.max(x(head.xy[0]), 60), width - 60)} y={y(head.xy[1]) - r0(head) - 16} textAnchor="middle" className="lb-svg-italic" fontSize="20" fill="var(--lb-accent)" stroke="var(--lb-paper)" strokeWidth="4" paintOrder="stroke">
                {monthYear(head.date)}
              </text>
            </g>
          )}
        </svg>

        {focus && tip && (
          <div className="lb-tooltip" style={{ left: tip.left, top: tip.top, width: tip.tw }} aria-hidden="true">
            <p className="lb-kicker m-0" style={{ color: langColor(focus.lang) }}>
              {`${shortDate(focus.date)} · ${fmt(focus.words)} words`}
            </p>
            <p className="lb-display text-[21px] leading-[1.12] m-0 mt-1.5" {...(textLang(focus.title) === "mr" ? { lang: "mr" } : {})}>{focus.title}</p>
            {focus.opening && (
              <p className={`lb-quote text-[15px] lb-ink-2 m-0 mt-2 line-clamp-3 ${langProps(focus.lang).className || ""}`} lang={langProps(focus.lang).lang}>
                {`“${focus.opening}”`}
              </p>
            )}
            <p className="lb-meta lb-soft m-0 mt-2">
              {`${titleCase((clusters.find((c) => c.id === focus.cluster) || {}).label || "")} · click to open`}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1" role="group" aria-label="Territories: hover to find one, click to keep only it">
        {clusters.map((c) => (
          <button
            key={c.id}
            type="button"
            className="lb-legend-item"
            aria-pressed={region === c.id}
            onClick={() => setRegion(region === c.id ? null : c.id)}
            onMouseEnter={() => setPeek(c.id)}
            onMouseLeave={() => setPeek(null)}
            onFocus={() => setPeek(c.id)}
            onBlur={() => setPeek(null)}
          >
            <span className="lb-legend-swatch" style={{ background: regionFill(c.id) }} aria-hidden="true" />
            <span className="lb-italic text-[17px] leading-none">{titleCase(c.label)}</span>
            <span className="lb-meta lb-soft lb-num">{c.size}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lb-meta lb-soft">
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--lb-en)" /></svg>
          English
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true"><polygon points={diamond(6, 6, 5.5)} fill="var(--lb-mr)" /></svg>
          <span lang="mr" className="lb-mr-text">मराठी</span>
        </span>
        <span>Size: length</span>
        <span>Dashed lines: nearest in meaning</span>
        {filtered && (
          <span className="lb-ink">
            {`${count} of ${placed.length} shown · `}
            <button
              type="button"
              className="lb-link"
              onClick={() => {
                setQuery("");
                setLang("all");
                setRegion(null);
                setWalking(false);
                setUpTo(placed.length);
              }}
            >
              show all
            </button>
          </span>
        )}
      </div>

      {showRoute && (
        <div className="flex items-center gap-3">
          <label htmlFor="lb-route-range" className="lb-meta lb-soft whitespace-nowrap lb-num">
            {head ? `${yearOf(head)} · ${upTo} of ${placed.length}` : ""}
          </label>
          <input
            id="lb-route-range"
            className="lb-range"
            type="range"
            min={1}
            max={placed.length}
            value={upTo}
            onChange={(e) => { setWalking(false); setUpTo(Number(e.target.value)); }}
            aria-valuetext={head ? `${head.title}, ${monthYear(head.date)}` : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default AtlasLens;
