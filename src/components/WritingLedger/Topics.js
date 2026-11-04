import React, { useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { treemap } from "../../lib/writingLedger";
import { colorForTag } from "../../lib/generativeArt";
import { useTagColors } from "../../context/ContentContext";
import { Tip, fmt, useTip, useWidth } from "./shared";

const tagColor = (map, key) => colorForTag(key, map.get(key) || map.get(key.replace(/ /g, "-")) || null);

// What the words are about: a squarified treemap where area is words written
// under the topic. Tags are merged across spellings ("Data Privacy",
// "data_privacy"); a post with three tags counts toward all three, so the
// tiles overlap in meaning even though they never overlap on screen. Press a
// tile to filter the full ledger below to it.
export const TopicMap = ({ topics, onPick }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 900);
  const colors = useTagColors();
  const H = width < 560 ? 520 : 400;
  const tiles = useMemo(() => treemap(topics.slice(0, 14), width, H, (t) => t.words), [topics, width, H]);
  const GAP = 3;

  return (
    <div className="wl-card">
      <div ref={ref} className="wl-fig" style={{ height: H }}>
        {tiles.map((t) => {
          const c = tagColor(colors, t.key);
          const small = t.w < 90 || t.h < 54;
          return (
            <button
              type="button"
              key={t.key}
              className="wl-tile"
              onClick={() => onPick(t.key)}
              title={`${t.label}: ${t.posts} posts, ${fmt(t.words)} words`}
              style={{
                left: t.x + GAP / 2,
                top: t.y + GAP / 2,
                width: Math.max(0, t.w - GAP),
                height: Math.max(0, t.h - GAP),
                background: `color-mix(in srgb, ${c} 20%, var(--wl-card))`,
                borderLeft: `4px solid ${c}`,
              }}
            >
              <span className="n" style={small ? { fontSize: 12 } : null}>{t.label}</span>
              {!small ? <span className="m wl-num">{t.posts} posts · {fmt(t.words)} words</span> : null}
              {t.w > 130 && t.h > 90 ? <span className="pct wl-num" style={{ color: c }}>{Math.round(t.share * 100)}%</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

TopicMap.propTypes = {
  topics: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onPick: PropTypes.func.isRequired,
};

// When each topic arrived: rows are topics, columns years, a dot's area is the
// posts carrying that tag that year. It shows what the treemap cannot — that
// some subjects are old companions and others arrived all at once.
export const TopicYears = ({ topics, posts, years, onPick }) => {
  const ref = useRef(null);
  const width = useWidth(ref, 900);
  const colors = useTagColors();
  const { tip, show, hide } = useTip();
  const rows = topics.slice(0, 10);
  const counts = useMemo(() => {
    const by = new Map();
    posts.forEach((p) => p.topics.forEach((k) => {
      const key = `${k}|${p.year}`;
      by.set(key, (by.get(key) || 0) + 1);
    }));
    return by;
  }, [posts]);
  const max = Math.max(1, ...counts.values());
  const labelW = width < 560 ? 110 : 170;
  const rowH = 34;
  const colW = (width - labelW) / years.length;
  const H = rows.length * rowH + 30;
  const rMax = Math.min(rowH / 2 - 2, colW / 2 - 2);

  return (
    <div className="wl-card">
      <p className="wl-card-title">When each topic arrived</p>
      <div ref={ref} className="wl-fig">
        <svg width={width} height={H} role="img" aria-label="Posts per topic per year">
          {years.map((y, j) => (
            <text key={y} x={labelW + j * colW + colW / 2} y={14} textAnchor="middle" className="wl-tick">{y}</text>
          ))}
          {rows.map((t, i) => {
            const cy = 30 + i * rowH + rowH / 2;
            const c = tagColor(colors, t.key);
            return (
              <g key={t.key} style={{ cursor: "pointer" }} onClick={() => onPick(t.key)}>
                <line x1={labelW} x2={width} y1={cy} y2={cy} className="wl-grid" />
                <text x={0} y={cy + 4} className="wl-dlabel" style={{ textTransform: "capitalize" }}>
                  {t.label.length > (labelW < 150 ? 14 : 22) ? `${t.label.slice(0, labelW < 150 ? 13 : 21)}…` : t.label}
                </text>
                {years.map((y, j) => {
                  const n = counts.get(`${t.key}|${y}`) || 0;
                  if (!n) return null;
                  const r = Math.max(3, Math.sqrt(n / max) * rMax);
                  return (
                    <circle
                      key={y}
                      className="wl-mark"
                      cx={labelW + j * colW + colW / 2}
                      cy={cy}
                      r={r}
                      fill={c}
                      fillOpacity={0.85}
                      onMouseMove={(e) => show(e, <><b>{t.label}</b>{n} post{n === 1 ? "" : "s"} in {y}</>)}
                      onMouseLeave={hide}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
        <Tip tip={tip} />
      </div>
    </div>
  );
};

TopicYears.propTypes = {
  topics: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  years: PropTypes.arrayOf(PropTypes.string).isRequired,
  onPick: PropTypes.func.isRequired,
};
