import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { fmt, langProps, textLang, yearOf } from "./shared";

// The habits of the hand: phrases that recur across essays (counted by
// scripts/build-logbook.mjs, which drops one essay's subject repeating itself),
// each year's most-used words, how loud each year was, and a game — one
// sentence from the archive, guess the year it was written.

const Heat = ({ phrases, years, lang }) => {
  const max = Math.max(1, ...phrases.flatMap((p) => Object.values(p.years)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="text-left font-label text-[10px] uppercase tracking-wider lb-soft font-normal">Phrase</th>
            {years.map((y) => <th key={y} className="font-label text-[10px] lb-soft font-normal w-10">{String(y).slice(2)}</th>)}
            <th className="font-label text-[10px] uppercase tracking-wider lb-soft font-normal text-right">Essays</th>
          </tr>
        </thead>
        <tbody>
          {phrases.map((p) => (
            <tr key={p.p}>
              <td className={`font-body text-sm lb-ink pr-2 whitespace-nowrap ${langProps(lang).className || ""}`} lang={langProps(lang).lang}>{`“${p.p}”`}</td>
              {years.map((y) => {
                const n = p.years[y] || 0;
                return (
                  <td key={y} title={n ? `${n} in ${y}` : `none in ${y}`} className="h-6 rounded" style={{ background: n ? "var(--lb-accent)" : "var(--lb-rule)", opacity: n ? 0.18 + 0.82 * (n / max) : 1 }} />
                );
              })}
              <td className="font-body text-xs lb-soft text-right">{p.posts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

Heat.propTypes = {
  phrases: PropTypes.arrayOf(PropTypes.shape({ p: PropTypes.string, years: PropTypes.shape({}) })).isRequired,
  years: PropTypes.arrayOf(PropTypes.number).isRequired,
  lang: PropTypes.string.isRequired,
};

const GuessYear = ({ lines, byId, years, onSelect }) => {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * lines.length));
  const [guess, setGuess] = useState(null);
  const [score, setScore] = useState({ right: 0, played: 0 });
  const line = lines[seed % lines.length];
  const post = byId.get(line.post);
  const answer = yearOf(post);

  const pick = (y) => {
    if (guess != null) return;
    setGuess(y);
    setScore((s) => ({ right: s.right + (y === answer ? 1 : 0), played: s.played + 1 }));
  };
  const next = () => {
    setGuess(null);
    setSeed((s) => s + 1 + Math.floor(Math.random() * (lines.length - 1)));
  };

  return (
    <div className="lb-panel p-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold lb-accent m-0">Guess the year</p>
        {score.played > 0 && <p className="font-body text-xs lb-soft m-0">{`${score.right} of ${score.played}`}</p>}
      </div>
      <p className={`font-headline text-xl lb-ink m-0 leading-snug ${langProps(post.lang).className || ""}`} lang={langProps(post.lang).lang}>{`“${line.s}”`}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which year?">
        {years.map((y) => {
          let style;
          if (guess != null && y === answer) style = { background: "var(--lb-mr)", color: "var(--lb-panel)", borderColor: "var(--lb-mr)" };
          else if (guess === y) style = { background: "var(--lb-accent)", color: "var(--lb-panel)", borderColor: "var(--lb-accent)" };
          return (
            <button key={y} type="button" onClick={() => pick(y)} disabled={guess != null} className="lb-chip font-label text-[11px] px-3 py-1.5" style={style}>
              {y}
            </button>
          );
        })}
      </div>
      {guess != null && (
        <p className="font-body text-sm lb-ink m-0" aria-live="polite">
          {guess === answer ? "Right — " : `It was ${answer}. `}
          <button type="button" onClick={() => onSelect(post.id)} className="bg-transparent border-0 p-0 underline cursor-pointer lb-ink">
            <span {...langProps(textLang(post.title))}>{post.title}</span>
          </button>
          {"  "}
          <button type="button" onClick={next} className="lb-chip font-label text-[10px] uppercase tracking-wider px-2.5 py-1 ml-2">Next line →</button>
        </p>
      )}
    </div>
  );
};

GuessYear.propTypes = {
  lines: PropTypes.arrayOf(PropTypes.shape({ s: PropTypes.string, post: PropTypes.string })).isRequired,
  byId: PropTypes.instanceOf(Map).isRequired,
  years: PropTypes.arrayOf(PropTypes.number).isRequired,
  onSelect: PropTypes.func.isRequired,
};

const PhrasesLens = ({ data, byId, onSelect }) => {
  const [lang, setLang] = useState("en");
  const years = useMemo(() => data.byYear.map((y) => y.year), [data.byYear]);
  const phrases = (data.phrases[lang] || []).slice(0, 14);
  const loud = data.byYear.map((y) => ({ year: y.year, rate: y.words ? (y.exclaims / y.words) * 1000 : 0 }));
  const maxRate = Math.max(1, ...loud.map((l) => l.rate));
  const words = data.words[lang] || {};

  return (
    <div className="flex flex-col gap-4">
      <div className="lb-sheet p-4 md:p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold lb-accent m-0">Signature phrases, by year</p>
          <div className="flex gap-1.5" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")} className="lb-chip font-label text-[10px] uppercase tracking-wider px-2.5 py-1">English</button>
            <button type="button" aria-pressed={lang === "mr"} onClick={() => setLang("mr")} className="lb-chip text-[11px] px-2.5 py-1 lb-mr-text" lang="mr">मराठी</button>
          </div>
        </div>
        <Heat phrases={phrases} years={years} lang={lang} />
        <p className="font-body text-xs lb-soft m-0">A phrase counts only once it turns up in several different essays: these are habits, not subjects.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="lb-panel p-4 flex flex-col gap-2">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold lb-accent m-0">Exclamation marks per 1,000 words</p>
          <svg viewBox={`0 0 ${loud.length * 50} 130`} className="w-full h-auto" role="img" aria-label={loud.map((l) => `${l.year}: ${Math.round(l.rate)}`).join(", ")}>
            {loud.map((l, i) => {
              const h = (l.rate / maxRate) * 90;
              return (
                <g key={l.year}>
                  <rect x={i * 50 + 10} y={100 - h} width="30" height={h} rx="3" fill="var(--lb-accent)" opacity="0.85" />
                  <text x={i * 50 + 25} y={95 - h} textAnchor="middle" fontSize="11" fill="var(--lb-ink)" fontFamily="Inter, sans-serif">{Math.round(l.rate)}</text>
                  <text x={i * 50 + 25} y={118} textAnchor="middle" fontSize="11" fill="var(--lb-soft)" fontFamily="Plus Jakarta Sans, sans-serif">{l.year}</text>
                </g>
              );
            })}
          </svg>
          <p className="font-body text-xs lb-soft m-0">{`${fmt(data.totals.exclaims)} in all. And ${fmt(data.totals.questions)} question marks.`}</p>
        </div>

        <div className="lb-panel p-4 flex flex-col gap-2">
          <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold lb-accent m-0">Words of the year</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            {Object.entries(words).map(([y, list]) => (
              <React.Fragment key={y}>
                <dt className="font-label text-[11px] lb-soft">{y}</dt>
                <dd className={`m-0 font-body text-sm lb-ink ${langProps(lang).className || ""}`} lang={langProps(lang).lang}>
                  {list.slice(0, 5).map(([w]) => w).join(" · ")}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      </div>

      {data.lines.length > 0 && <GuessYear lines={data.lines} byId={byId} years={years} onSelect={onSelect} />}
    </div>
  );
};

PhrasesLens.propTypes = {
  data: PropTypes.shape({
    byYear: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    phrases: PropTypes.shape({}).isRequired,
    words: PropTypes.shape({}).isRequired,
    lines: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    totals: PropTypes.shape({}).isRequired,
  }).isRequired,
  byId: PropTypes.instanceOf(Map).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default PhrasesLens;
