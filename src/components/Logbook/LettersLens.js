import React, { useMemo, useRef, useState } from "react";
import { arcPath, gapLabel, yearTicks } from "./model";
import {
  langProps, shortDate, textLang, useRoving, useWidth, yearOf,
} from "./shared";

// V · Letters. A sentence I wrote years ago beside the recent sentence
// closest to it in meaning, found by the /ask embeddings (pairLetters in
// src/lib/logbook.js). Each essay appears once, and pairs may cross
// languages because the embeddings are multilingual. Above, every pair is an
// arc across the years — the taller the arc, the longer the wait for the
// answer; below, one pair at a time, as two letters.

const Letter = ({ side, post, sentence, onSelect }) => {
  const lp = langProps(post.lang);
  const tp = langProps(textLang(post.title));
  return (
    <article className={`lb-letter lb-letter--${side} lb-letter-in h-full`}>
      <div className="lb-postmark lb-accent" aria-hidden="true">
        <span className="flex flex-col items-center leading-none">
          <span className="lb-kicker text-[7px] tracking-[0.2em]">{side === "then" ? "Then" : "Now"}</span>
          <span className="lb-display text-[20px] lb-num">{yearOf(post)}</span>
        </span>
      </div>
      <p className="lb-kicker m-0 mb-3" style={{ color: side === "then" ? "var(--lb-soft)" : "var(--lb-accent)" }}>
        {`${side === "then" ? "Then" : "Now"} · ${shortDate(post.date)}`}
      </p>
      <p className={`lb-quote text-[22px] md:text-[25px] lb-ink m-0 ${lp.className || ""}`} lang={lp.lang}>
        {`“${sentence}”`}
      </p>
      <p className="font-body text-[13px] lb-soft m-0 pt-4 clear-both">
        {"— from "}
        <button type="button" className="lb-link" onClick={() => onSelect(post.id)}>
          <span {...tp}>{post.title}</span>
        </button>
      </p>
    </article>
  );
};

const LettersLens = ({ data, byId, onSelect }) => {
  const letters = useMemo(() => data.letters
    .filter((l) => byId.has(l.then.post) && byId.has(l.now.post))
    .map((l) => ({ ...l, a: byId.get(l.then.post), b: byId.get(l.now.post) }))
    .sort((l1, l2) => (l1.a.date < l2.a.date ? -1 : 1)), [data.letters, byId]);
  const ref = useRef(null);
  const width = useWidth(ref, 800);
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(null);
  const roving = useRoving(letters.length, (i) => setActive(i), 0);

  if (!letters.length) {
    return <p className="lb-card font-body text-sm lb-soft p-4 m-0">No letters yet: the archive needs older essays that sit close to newer ones.</p>;
  }

  const { posts, byYear } = data;
  const pad = 24;
  const H = width < 560 ? 150 : 200;
  const base = H - 28;
  const t0 = Date.parse(posts[0].date);
  const t1 = Date.parse(posts[posts.length - 1].date);
  const x = (d) => pad + ((Date.parse(d) - t0) / (t1 - t0 || 1)) * (width - pad * 2);
  const l = letters[active];
  const go = (i) => setActive((i + letters.length) % letters.length);
  const lit = hover != null ? hover : active;

  return (
    <div className="flex flex-col gap-6">
      <div ref={ref} className="lb-card px-2 pt-3 pb-1">
        <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} className="block w-full h-auto" role="group" aria-label="Each letter as an arc from the year it was written to the year it was answered. Arrow keys move between letters.">
          <line x1={pad} x2={width - pad} y1={base} y2={base} stroke="var(--lb-faint)" />
          {yearTicks(byYear.map((y) => y.year), (yr) => Math.max(pad + 14, x(`${yr}-01-01`))).map(({ year: yr, x: yx }) => (
            <g key={yr} aria-hidden="true">
              <line x1={yx} x2={yx} y1={base} y2={base + 5} stroke="var(--lb-soft)" />
              <text x={yx} y={base + 19} textAnchor="middle" fontSize="11" className="lb-svg-label" fill="var(--lb-soft)">{yr}</text>
            </g>
          ))}
          {letters.map((lt, i) => {
            const x0 = x(lt.a.date);
            const x1 = x(lt.b.date);
            const lift = Math.min(base - 12, (x1 - x0) * 0.42 + 14);
            const on = i === lit;
            const { ref: rref, ...rove } = roving.props(i);
            return (
              <g
                key={`${lt.then.post}-${lt.now.post}`}
                ref={rref}
                className="lb-hit"
                role="button"
                aria-label={`Letter ${i + 1}: ${shortDate(lt.a.date)} answered ${shortDate(lt.b.date)}`}
                aria-pressed={i === active}
                {...rove}
                onClick={() => setActive(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <path d={arcPath(x0, x1, base, lift)} fill="none" stroke="transparent" strokeWidth="12" />
                <path className="lb-arc lb-focus-ring" d={arcPath(x0, x1, base, lift)} />
                <path className="lb-arc" d={arcPath(x0, x1, base, lift)} fill="none" stroke={on ? "var(--lb-accent)" : "var(--lb-ink)"} strokeWidth={on ? 2.4 : 1} opacity={on ? 1 : 0.22} />
                <circle cx={x0} cy={base} r={on ? 4 : 2.4} fill={on ? "var(--lb-accent)" : "var(--lb-soft)"} />
                <circle cx={x1} cy={base} r={on ? 4 : 2.4} fill={on ? "var(--lb-accent)" : "var(--lb-soft)"} />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="lb-meta lb-soft m-0 lb-num">
          {`Letter ${active + 1} of ${letters.length} · ${gapLabel(l.a.date, l.b.date)} apart`}
        </p>
        <div className="flex gap-2">
          <button type="button" className="lb-btn lb-btn--sm lb-btn--icon" onClick={() => go(active - 1)} aria-label="Previous letter">‹</button>
          <button type="button" className="lb-btn lb-btn--sm lb-btn--icon" onClick={() => go(active + 1)} aria-label="Next letter">›</button>
          <button type="button" className="lb-btn lb-btn--sm" onClick={() => go(active + 1 + Math.floor(Math.random() * (letters.length - 1)))}>Shuffle</button>
        </div>
      </div>

      <div key={`${l.then.post}-${l.now.post}`} className="lb-letters">
        <Letter side="then" post={l.a} sentence={l.then.s} onSelect={onSelect} />
        <div className="flex md:flex-col items-center justify-center gap-2 px-2" aria-label={`Closeness in meaning: ${l.sim.toFixed(2)}`}>
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--lb-faint)" strokeWidth="3" />
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--lb-accent)" strokeWidth="3" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.round(l.sim * 100)} 100`} transform="rotate(-90 28 28)" />
            <text x="28" y="33" textAnchor="middle" fontSize="15" className="lb-svg-display" fill="var(--lb-ink)">{l.sim.toFixed(2)}</text>
          </svg>
          <span className="lb-meta lb-soft text-center max-w-[7rem] leading-tight">closeness in meaning</span>
        </div>
        <Letter side="now" post={l.b} sentence={l.now.s} onSelect={onSelect} />
      </div>
    </div>
  );
};

export default LettersLens;
