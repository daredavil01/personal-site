import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { langProps, textLang, yearOf } from "./shared";

// Every essay with its words taken away, after Nicholas Rougeux's Between the
// Words and Stefanie Posavec's sentence drawings: its punctuation laid along a
// spiral from the centre outwards, in reading order, and under it the length
// of each sentence as a bar. A breathless essay is a red spiral; a careful one
// is all full stops and commas.

const BOX = 120;
const MARK_CLASSES = [
  { key: "stop", label: "full stop", test: (c) => c === "." || c === "।", color: "var(--lb-ink)", width: 2.4 },
  { key: "comma", label: "comma", test: (c) => c === ",", color: "var(--lb-soft)", width: 1.8 },
  { key: "bang", label: "!", test: (c) => c === "!", color: "var(--lb-accent)", width: 2.2, stem: true },
  { key: "ask", label: "?", test: (c) => c === "?", color: "var(--lb-mr)", width: 3.2 },
  { key: "other", label: "other", test: () => true, color: "var(--lb-faint)", width: 2 },
];

function spiralPaths(punct) {
  const paths = Object.fromEntries(MARK_CLASSES.map((m) => [m.key, []]));
  const b = 1.55;
  const arc = 2.5;
  [...punct].forEach((c, k) => {
    const theta = Math.sqrt((2 * arc * (k + 2)) / b);
    const r = b * theta;
    const x = BOX / 2 + Math.cos(theta - Math.PI / 2) * r;
    const y = BOX / 2 + Math.sin(theta - Math.PI / 2) * r;
    const m = MARK_CLASSES.find((cls) => cls.test(c));
    paths[m.key].push(m.stem
      ? `M${x.toFixed(1)},${y.toFixed(1)}l${(Math.cos(theta - Math.PI / 2) * 3.5).toFixed(1)},${(Math.sin(theta - Math.PI / 2) * 3.5).toFixed(1)}`
      : `M${x.toFixed(1)},${y.toFixed(1)}h0.01`);
  });
  return paths;
}

function rhythmPath(rhythm, w = BOX, h = 22) {
  if (!rhythm.length) return "";
  const step = w / rhythm.length;
  return rhythm.map((n, i) => `M${(i * step + step / 2).toFixed(1)},${h}v-${((Math.min(n, 40) / 40) * h).toFixed(1)}`).join("");
}

const SORTS = [
  { id: "new", label: "Newest", by: (a, b) => (a.date < b.date ? 1 : -1) },
  { id: "long", label: "Longest", by: (a, b) => b.words - a.words },
  { id: "loud", label: "Loudest", by: (a, b) => b.exclaims / b.words - a.exclaims / a.words },
  { id: "curious", label: "Most questions", by: (a, b) => b.qRate - a.qRate },
];

const FingerprintLens = ({ data, selected, onSelect }) => {
  const [sort, setSort] = useState("new");
  const prints = useMemo(() => data.posts.map((p) => ({
    ...p,
    qRate: p.punct ? (p.punct.match(/\?/g) || []).length / p.punct.length : 0,
    paths: spiralPaths(p.punct || ""),
    rhythmD: rhythmPath(p.rhythm || []),
  })), [data.posts]);
  const sorted = useMemo(() => [...prints].sort(SORTS.find((s) => s.id === sort).by), [prints, sort]);

  return (
    <div className="lb-sheet p-3 md:p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sort essays">
          {SORTS.map((s) => (
            <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)} className="lb-chip font-label text-[10px] uppercase tracking-wider px-2.5 py-1">
              {s.label}
            </button>
          ))}
        </div>
        <p className="font-body text-xs lb-soft m-0 flex flex-wrap gap-x-3">
          {MARK_CLASSES.slice(0, 4).map((m) => (
            <span key={m.key} className="flex items-center gap-1">
              <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r={m.width / 1.4} fill={m.color} /></svg>
              {m.label}
            </span>
          ))}
          <span>bars: sentence length</span>
        </p>
      </div>
      <ol className="list-none p-0 m-0 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))" }}>
        {sorted.map((p) => {
          const isSel = selected && selected.id === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                aria-pressed={isSel}
                aria-label={`${p.title}, ${yearOf(p)}: ${p.exclaims} exclamation marks in ${p.words} words`}
                className="w-full lb-panel p-1.5 flex flex-col gap-1 cursor-pointer text-left"
                style={isSel ? { borderColor: "var(--lb-accent)", boxShadow: "0 0 0 2px var(--lb-accent-soft)" } : undefined}
              >
                <svg viewBox={`0 0 ${BOX} ${BOX + 26}`} className="w-full h-auto" aria-hidden="true">
                  {MARK_CLASSES.map((m) => (
                    <path key={m.key} d={p.paths[m.key].join("")} stroke={m.color} strokeWidth={m.width} strokeLinecap="round" fill="none" />
                  ))}
                  <path d={p.rhythmD} transform={`translate(0 ${BOX + 2})`} stroke={p.lang === "mr" ? "var(--lb-mr)" : "var(--lb-en)"} strokeWidth="1.4" opacity="0.7" />
                </svg>
                <span className={`font-body text-[11px] leading-tight lb-ink line-clamp-2 ${langProps(textLang(p.title)).className || ""}`} lang={langProps(textLang(p.title)).lang}>{p.title}</span>
                <span className="font-label text-[9px] uppercase tracking-wider lb-soft">{yearOf(p)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

FingerprintLens.propTypes = {
  data: PropTypes.shape({ posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired }).isRequired,
  selected: PropTypes.shape({ id: PropTypes.string }),
  onSelect: PropTypes.func.isRequired,
};

FingerprintLens.defaultProps = { selected: null };

export default FingerprintLens;
