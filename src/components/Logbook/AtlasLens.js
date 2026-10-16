import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { colorForTag } from "../../lib/generativeArt";
import {
  keyActivate, langProps, placeLabels, prefersReducedMotion, scale, yearOf,
} from "./shared";

// The meaning map. Essays sit where their embeddings put them (UMAP, built by
// scripts/build-logbook.mjs), each region a soft island named by its tags. A
// dotted trail joins the essays in the order they were written: the wanderer's
// path through his own subjects. The slider walks that path.

const W = 1000;
const H = 660;
const PAD = 56;

const AtlasLens = ({ data, selected, onSelect }) => {
  const placed = useMemo(() => data.posts.filter((p) => p.xy), [data.posts]);
  const [upTo, setUpTo] = useState(placed.length);
  const [walking, setWalking] = useState(false);
  const [hover, setHover] = useState(null);
  const x = scale([0, 1], [PAD, W - PAD]);
  const y = scale([0, 1], [PAD, H - PAD]);
  const regionColor = useMemo(() => new Map(data.clusters.map((c) => [c.id, colorForTag(c.label)])), [data.clusters]);
  // x and y are pure functions of the constants above, so clusters are the only input.
  const labels = useMemo(() => placeLabels(data.clusters, x, y, { width: W, charW: 11.6, lift: 46 }), [data.clusters]);

  useEffect(() => {
    if (!walking) return undefined;
    if (prefersReducedMotion()) {
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
    }, 140);
    return () => clearInterval(id);
  }, [walking, placed.length]);

  const shown = placed.slice(0, upTo);
  const trail = shown.map((p, i) => `${i ? "L" : "M"}${x(p.xy[0]).toFixed(1)},${y(p.xy[1]).toFixed(1)}`).join(" ");
  const head = shown[shown.length - 1];
  const focus = hover || selected;
  const missing = data.posts.length - placed.length;

  return (
    <div className="lb-sheet p-2 md:p-4 flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="group" aria-label="Map of essays placed by meaning, with regions named by their tags">
        <defs>
          <filter id="lb-island" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <g filter="url(#lb-island)" aria-hidden="true">
          {placed.map((p) => (
            <circle key={p.id} cx={x(p.xy[0])} cy={y(p.xy[1])} r="44" fill={regionColor.get(p.cluster)} opacity="0.16" />
          ))}
        </g>
        <path d={trail} fill="none" stroke="var(--lb-soft)" strokeWidth="1.4" strokeDasharray="2 6" strokeLinecap="round" opacity="0.35" />
        {labels.map((c) => (
          <text
            key={c.id}
            x={c.lx}
            y={c.ly}
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontSize="13"
            fontWeight="800"
            letterSpacing="2.5"
            fill={regionColor.get(c.id)}
            stroke="var(--lb-paper)"
            strokeWidth="4"
            paintOrder="stroke"
          >
            {c.label.toUpperCase()}
          </text>
        ))}
        {shown.map((p) => {
          const cx = x(p.xy[0]);
          const cy = y(p.xy[1]);
          const r = 4 + Math.sqrt(p.words) / 9;
          const isSel = selected && selected.id === p.id;
          const fill = regionColor.get(p.cluster);
          return (
            <g
              key={p.id}
              className="lb-hit"
              role="button"
              tabIndex={0}
              aria-label={`${p.title}, ${yearOf(p)}`}
              aria-pressed={isSel}
              onClick={() => onSelect(p.id)}
              onKeyDown={keyActivate(() => onSelect(p.id))}
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p)}
              onBlur={() => setHover(null)}
            >
              {p.lang === "mr" ? (
                <rect className="lb-mark" x={cx - r} y={cy - r} width={r * 2} height={r * 2} transform={`rotate(45 ${cx} ${cy})`} fill={fill} stroke={isSel ? "var(--lb-ink)" : "var(--lb-paper)"} strokeWidth={isSel ? 3 : 1.5} />
              ) : (
                <circle className="lb-mark" cx={cx} cy={cy} r={r} fill={fill} stroke={isSel ? "var(--lb-ink)" : "var(--lb-paper)"} strokeWidth={isSel ? 3 : 1.5} />
              )}
            </g>
          );
        })}
        {head && upTo < placed.length && (
          <circle cx={x(head.xy[0])} cy={y(head.xy[1])} r="16" fill="none" stroke="var(--lb-accent)" strokeWidth="2.5" />
        )}
        {focus && focus.xy && (
          <g pointerEvents="none">
            <text
              x={Math.min(Math.max(x(focus.xy[0]), 160), W - 160)}
              y={y(focus.xy[1]) + (focus.xy[1] > 0.85 ? -22 : 30)}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="15"
              fontWeight="600"
              fill="var(--lb-ink)"
              stroke="var(--lb-paper)"
              strokeWidth="5"
              paintOrder="stroke"
              {...(focus.lang === "mr" ? { lang: "mr" } : {})}
            >
              {focus.title.length > 48 ? `${focus.title.slice(0, 46)}…` : focus.title}
            </text>
          </g>
        )}
      </svg>

      <div className="flex flex-wrap items-center gap-3 px-2">
        <button type="button" onClick={() => { setUpTo(1); setWalking(true); }} className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5">
          {walking ? "Walking…" : "▶ Walk the trail"}
        </button>
        <div className="flex items-center gap-2 font-body text-xs lb-soft flex-1 min-w-[200px]">
          <label htmlFor="lb-trail" className="whitespace-nowrap">{head ? `To ${head.date.slice(0, 7)}` : "Start"}</label>
          <input
            id="lb-trail"
            type="range"
            min={1}
            max={placed.length}
            value={upTo}
            onChange={(e) => { setWalking(false); setUpTo(Number(e.target.value)); }}
            className="flex-1 accent-orange-600"
            aria-label="Show essays written up to this point"
          />
        </div>
        <span className="font-body text-xs lb-soft flex items-center gap-3">
          <span className="flex items-center gap-1"><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4.5" fill="var(--lb-soft)" /></svg>English</span>
          <span className="flex items-center gap-1"><svg width="10" height="10" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7" transform="rotate(45 5 5)" fill="var(--lb-soft)" /></svg><span {...langProps("mr")}>मराठी</span></span>
          <span>Size: length</span>
        </span>
      </div>
      {missing > 0 && (
        <p className="font-body text-xs lb-soft m-0 px-2">
          {`${missing} essays are not on the map yet: they have not been indexed for the Ask page, whose embeddings place them.`}
        </p>
      )}
    </div>
  );
};

AtlasLens.propTypes = {
  data: PropTypes.shape({
    posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    clusters: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  }).isRequired,
  selected: PropTypes.shape({ id: PropTypes.string }),
  onSelect: PropTypes.func.isRequired,
};

AtlasLens.defaultProps = { selected: null };

export default AtlasLens;
