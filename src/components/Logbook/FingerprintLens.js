import React, { useMemo, useRef, useState } from "react";
import {
  MARKS, SPIRAL_BOX, markMix, perThousand, rhythmStats, spiralPaths,
} from "./model";
import {
  fmt, langProps, shortDate, textLang, useRoving, useWidth, yearOf,
} from "./shared";

// III · Fingerprint. Every essay with its words taken away, after Nicholas
// Rougeux's Between the Words and Stefanie Posavec's sentence drawings: its
// punctuation laid along a spiral from the centre outwards, in reading order.
// A breathless essay winds out in vermilion; a careful one is all full stops
// and commas. The specimen on the left takes one essay apart — its marks, its
// sentence rhythm — and the cabinet on the right holds them all, filed by year.

const STYLE = {
  stop: { color: "var(--lb-ink)", width: 2.4 },
  comma: { color: "var(--lb-soft)", width: 1.8 },
  bang: { color: "var(--lb-accent)", width: 2.2 },
  ask: { color: "var(--lb-ask)", width: 3.2 },
  other: { color: "var(--lb-faint)", width: 2 },
};
const DRAW_ORDER = ["other", "comma", "stop", "ask", "bang"];

const Spiral = ({ paths, size, label }) => (
  <svg viewBox={`0 0 ${SPIRAL_BOX} ${SPIRAL_BOX}`} width={size} height={size} className="block w-full h-auto" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : "true"}>
    {DRAW_ORDER.map((k) => (
      <path key={k} d={paths[k]} stroke={STYLE[k].color} strokeWidth={STYLE[k].width} strokeLinecap="round" fill="none" />
    ))}
  </svg>
);

const SORTS = [
  { id: "chrono", label: "By year", by: (a, b) => (a.date < b.date ? 1 : -1) },
  { id: "long", label: "Longest", by: (a, b) => b.words - a.words },
  { id: "loud", label: "Loudest", by: (a, b) => b.bangRate - a.bangRate },
  { id: "curious", label: "Most questions", by: (a, b) => b.askShare - a.askShare },
  { id: "calm", label: "Calmest", by: (a, b) => a.bangRate - b.bangRate },
];

const Rhythm = ({ rhythm, lang }) => {
  const ref = useRef(null);
  const w = useWidth(ref, 280);
  const h = 54;
  if (!rhythm.length) return null;
  const step = w / rhythm.length;
  const max = Math.max(30, ...rhythm);
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block w-full" role="img" aria-label={`Sentence lengths of the first ${rhythm.length} sentences`}>
        <line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="var(--lb-faint)" />
        {rhythm.map((n, i) => {
          const bh = (Math.min(n, max) / max) * (h / 2 - 2);
          return <rect key={i} x={i * step + step * 0.15} y={h / 2 - bh} width={Math.max(0.8, step * 0.7)} height={bh * 2} rx="0.6" fill={lang === "mr" ? "var(--lb-mr)" : "var(--lb-en)"} opacity="0.8" />;
        })}
      </svg>
    </div>
  );
};

const Specimen = ({ p, onOpen }) => {
  const { mix } = p;
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
  const st = rhythmStats(p.rhythm || []);
  const titleLang = langProps(textLang(p.title));
  const facts = [
    ["Words", fmt(p.words)],
    ["Average sentence", st.avg != null ? `${st.avg} words` : null],
    ["Longest sentence", st.longest != null ? `${st.longest} words` : null],
    ["! per 1,000 words", perThousand(p.exclaims, p.words) != null ? String(perThousand(p.exclaims, p.words)) : null],
  ].filter(([, v]) => v);

  return (
    <div className="lb-specimen lb-card p-4 flex flex-col gap-4" aria-live="polite">
      <div className="lb-inset p-3">
        <Spiral paths={p.paths} size={260} label={`Punctuation of ${p.title} as a spiral`} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="lb-kicker lb-soft m-0">{`${shortDate(p.date)} · ${p.lang === "mr" ? "Marathi" : "English"}`}</p>
        <p className={`lb-display text-[24px] leading-[1.1] m-0 ${titleLang.className || ""}`} lang={titleLang.lang}>{p.title}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="lb-mixbar" aria-hidden="true">
          {MARKS.filter((m) => m.key !== "other").map((m) => (
            <span key={m.key} style={{ width: `${(mix[m.key] / total) * 100}%`, background: STYLE[m.key].color }} />
          ))}
        </div>
        <p className="lb-meta lb-soft m-0 flex flex-wrap gap-x-3 gap-y-0.5">
          {MARKS.filter((m) => m.key !== "other").map((m) => (
            <span key={m.key} className="flex items-center gap-1 lb-num">
              <svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="3.5" fill={STYLE[m.key].color} /></svg>
              {`${m.label} ${Math.round((mix[m.key] / total) * 100)}%`}
            </span>
          ))}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="lb-kicker lb-soft m-0">Rhythm · sentence by sentence</p>
        <Rhythm rhythm={p.rhythm || []} lang={p.lang} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 m-0">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="lb-meta lb-soft">{k}</dt>
            <dd className="lb-display text-[22px] leading-none m-0 mt-0.5 lb-num">{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="lb-btn lb-btn--sm self-start" onClick={onOpen}>Open this entry</button>
    </div>
  );
};

const FingerprintLens = ({ data, onSelect }) => {
  const rootRef = useRef(null);
  // Below this width the specimen sits above the cabinet, out of sight of a
  // tile far down it, so a tap opens the entry (which has the same print).
  const narrow = useWidth(rootRef, 900) < 780;
  const [sort, setSort] = useState("chrono");
  const prints = useMemo(() => data.posts.map((p) => {
    const mix = markMix(p.punct || "");
    const marks = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
    return {
      ...p,
      mix,
      paths: spiralPaths(p.punct || ""),
      bangRate: p.words ? (p.exclaims || 0) / p.words : 0,
      askShare: mix.ask / marks,
    };
  }), [data.posts]);
  const sorted = useMemo(() => [...prints].sort(SORTS.find((s) => s.id === sort).by), [prints, sort]);
  const [focusId, setFocusId] = useState(() => prints.reduce((a, p) => (p.bangRate > a.bangRate ? p : a), prints[0]).id);
  const [hoverId, setHoverId] = useState(null);
  const byId = useMemo(() => new Map(prints.map((p) => [p.id, p])), [prints]);
  const shown = byId.get(hoverId) || byId.get(focusId);
  const roving = useRoving(sorted.length, (i) => onSelect(sorted[i].id), 0);

  const tiles = [];
  sorted.forEach((p, i) => {
    if (sort === "chrono" && (i === 0 || yearOf(sorted[i - 1]) !== yearOf(p))) {
      tiles.push(
        <li key={`y${yearOf(p)}`} className="lb-tile-year" aria-hidden="true">
          <span className="lb-italic text-[22px] lb-accent leading-none">{yearOf(p)}</span>
        </li>,
      );
    }
    const { ref, ...rove } = roving.props(i);
    tiles.push(
      <li key={p.id}>
        <button
          ref={ref}
          type="button"
          className="lb-tile w-full"
          aria-pressed={p.id === focusId}
          aria-label={`${p.title}, ${yearOf(p)}: ${p.exclaims} exclamation marks in ${p.words} words. Enter opens the entry.`}
          {...rove}
          onFocus={(e) => { rove.onFocus(e); setFocusId(p.id); }}
          onClick={() => (narrow ? onSelect(p.id) : setFocusId(p.id))}
          onDoubleClick={() => onSelect(p.id)}
          onMouseEnter={() => setHoverId(p.id)}
          onMouseLeave={() => setHoverId(null)}
        >
          <Spiral paths={p.paths} size={64} />
          {sort !== "chrono" && <span className="absolute top-0.5 left-1 lb-meta lb-soft lb-num" aria-hidden="true">{i + 1}</span>}
        </button>
      </li>,
    );
  });

  return (
    <div ref={rootRef} className="lb-print-grid">
      <Specimen p={shown} onOpen={() => onSelect(shown.id)} />
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="lb-seg flex-wrap" role="group" aria-label="Order the cabinet">
            {SORTS.map((s) => (
              <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</button>
            ))}
          </div>
          <p className="lb-meta lb-soft m-0">{narrow ? "Tap a spiral to open its entry" : "Hover to inspect · click to keep · Enter or double-click to open"}</p>
        </div>
        <ol className="lb-cabinet list-none p-0 m-0">{tiles}</ol>
      </div>
    </div>
  );
};

export default FingerprintLens;
