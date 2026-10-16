import React, { useMemo, useState } from "react";
import { perThousand, pickLine } from "./model";
import {
  fmt, langProps, shortDate, textLang, yearOf,
} from "./shared";

// IV · Phrases. The habits of the hand: phrases that recur across essays
// (counted by scripts/build-logbook.mjs, which drops one essay's subject
// repeating itself), each year's most-used words, how loud each year was,
// and a game — one sentence from the archive, guess the year it was written.

const Ledger = ({ phrases, years, lang }) => {
  const [all, setAll] = useState(false);
  const [hover, setHover] = useState(null);
  const shown = all ? phrases : phrases.slice(0, 12);
  const max = Math.max(1, ...phrases.flatMap((p) => Object.values(p.years)));
  const maxPosts = Math.max(1, ...phrases.map((p) => p.posts));
  const lp = langProps(lang);
  const focus = hover || phrases[0];
  const peak = focus && Object.entries(focus.years).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="lb-card p-4 md:p-5 flex flex-col gap-3">
      <div className="lb-phrase-row lb-phrase-head">
        <p className="lb-kicker lb-accent m-0 lb-phrase-name">Signature phrases</p>
        <div className="flex gap-[6px] lb-phrase-dots" aria-hidden="true">
          {years.map((y) => <span key={y} className="lb-meta lb-soft lb-num w-[22px] text-center">{`’${String(y).slice(2)}`}</span>)}
        </div>
        <span className="lb-meta lb-soft text-right lb-phrase-count">Essays</span>
      </div>
      <ol className="list-none p-0 m-0 flex flex-col">
        {shown.map((p) => (
          <li
            key={p.p}
            className="lb-phrase-row"
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
          >
            <span className={`lb-quote lb-phrase-name text-[19px] md:text-[21px] truncate ${lp.className || ""}`} lang={lp.lang}>
              {`“${p.p}”`}
            </span>
            <span className="flex gap-[6px] lb-phrase-dots" aria-hidden="true">
              {years.map((y) => {
                const n = p.years[y] || 0;
                return (
                  <svg key={y} width="22" height="22" viewBox="0 0 22 22">
                    <circle cx="11" cy="11" r="1.4" fill="var(--lb-faint)" />
                    {n > 0 && <circle cx="11" cy="11" r={2.5 + 8.5 * Math.sqrt(n / max)} fill="var(--lb-accent)" opacity={0.25 + 0.75 * Math.sqrt(n / max)} />}
                  </svg>
                );
              })}
            </span>
            <span className="flex flex-col items-end gap-1 lb-phrase-count" aria-hidden="true">
              <span className="lb-display text-[20px] leading-none lb-num">{p.posts}</span>
              <span className="block h-[3px] rounded-full" style={{ width: `${(p.posts / maxPosts) * 100}%`, background: "var(--lb-ink)", opacity: 0.4 }} />
            </span>
          </li>
        ))}
      </ol>
      {focus && (
        <p className="font-body text-sm lb-ink-2 m-0 min-h-[2.6em]" aria-live="polite">
          <span className={`lb-quote text-[17px] ${lp.className || ""}`} lang={lp.lang}>{`“${focus.p}”`}</span>
          {` turns up ${fmt(focus.n)} times in ${focus.posts} essays${peak ? `, most of all in ${peak[0]} (${peak[1]})` : ""}.`}
        </p>
      )}
      {phrases.length > 12 && (
        <button type="button" className="lb-btn lb-btn--sm self-start" onClick={() => setAll((a) => !a)}>
          {all ? "Fewer" : `All ${phrases.length} phrases`}
        </button>
      )}
    </div>
  );
};

const WordsOfTheYear = ({ words, lang }) => {
  const lp = langProps(lang);
  const rows = Object.entries(words).sort((a, b) => Number(b[0]) - Number(a[0]));
  return (
    <div className="lb-card p-4 md:p-5 flex flex-col gap-3">
      <p className="lb-kicker lb-accent m-0">Words of the year</p>
      <dl className="m-0 flex flex-col">
        {rows.map(([y, list]) => {
          const top = list.slice(0, 6);
          const max = Math.max(1, ...top.map(([, n]) => n));
          return (
            <div key={y} className="lb-words-row">
              <dt className="lb-italic text-[22px] lb-accent lb-num leading-none">{y}</dt>
              <dd className={`m-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 ${lp.className || ""}`} lang={lp.lang}>
                {top.map(([w, n], i) => (
                  <span key={w} className="lb-display leading-tight" style={{ fontSize: `${14 + 14 * (n / max)}px`, opacity: 1 - i * 0.1 }} title={`${n} times`}>
                    {w}
                  </span>
                ))}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
};

const Volume = ({ byYear, totals }) => {
  const rows = byYear.map((y) => ({ year: y.year, rate: perThousand(y.exclaims, y.words) || 0 }));
  return (
    <div className="lb-card p-4 md:p-5 flex flex-col gap-3">
      <p className="lb-kicker lb-accent m-0">How loud was each year?</p>
      <ol className="list-none p-0 m-0 flex flex-col gap-1" aria-label="Exclamation marks per thousand words, by year">
        {rows.map((r) => (
          <li key={r.year} className="grid items-center gap-3" style={{ gridTemplateColumns: "3rem minmax(0, 1fr) 2.5rem" }}>
            <span className="lb-italic text-[20px] lb-num">{r.year}</span>
            <span className="lb-display lb-accent text-[20px] leading-none tracking-[-0.08em] whitespace-nowrap overflow-hidden" aria-hidden="true">
              {"!".repeat(Math.max(1, Math.round(r.rate / 2)))}
            </span>
            <span className="lb-display text-[20px] text-right lb-num" aria-label={`${r.year}: ${Math.round(r.rate)} per thousand words`}>{Math.round(r.rate)}</span>
          </li>
        ))}
      </ol>
      <p className="font-body text-[13px] lb-soft m-0">
        {`Exclamation marks per 1,000 words; each mark drawn is two. ${fmt(totals.exclaims)} in all, and ${fmt(totals.questions)} question marks.`}
      </p>
    </div>
  );
};

const GuessYear = ({ lines, byId, years, onSelect }) => {
  const yearOfLine = (l) => yearOf(byId.get(l.post));
  const [line, setLine] = useState(() => pickLine(lines, yearOfLine));
  const [guess, setGuess] = useState(null);
  const [score, setScore] = useState({ right: 0, played: 0, streak: 0 });
  const post = byId.get(line.post);
  const answer = yearOf(post);
  const lp = langProps(post.lang);

  const pick = (y) => {
    if (guess != null) return;
    setGuess(y);
    setScore((s) => ({ right: s.right + (y === answer ? 1 : 0), played: s.played + 1, streak: y === answer ? s.streak + 1 : 0 }));
  };
  const next = () => {
    let l = pickLine(lines, yearOfLine);
    for (let i = 0; i < 4 && l.id === line.id; i += 1) l = pickLine(lines, yearOfLine);
    setLine(l);
    setGuess(null);
  };
  const state = (y) => {
    if (guess == null) return undefined;
    if (y === answer) return "right";
    if (y === guess) return "wrong";
    return "dim";
  };
  const off = guess != null ? Math.abs(guess - answer) : 0;
  let verdict = null;
  if (guess != null) {
    verdict = guess === answer
      ? "Right."
      : `Not quite — it was ${answer}, ${off} year${off === 1 ? "" : "s"} ${guess < answer ? "later" : "earlier"}.`;
  }

  return (
    <div className="lb-paper p-5 md:p-8 flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="lb-kicker lb-accent m-0">A game · Guess the year</p>
        {score.played > 0 && (
          <p className="lb-meta lb-soft m-0 lb-num">
            {`${score.right} of ${score.played}${score.streak > 1 ? ` · streak of ${score.streak}` : ""}`}
          </p>
        )}
      </div>
      <p key={line.id} className={`lb-quote lb-line-in text-[26px] md:text-[34px] leading-[1.2] m-0 max-w-3xl ${lp.className || ""}`} lang={lp.lang}>
        {`“${line.s}”`}
      </p>
      <div className="lb-years" role="group" aria-label="Which year was this written?">
        {years.map((y) => (
          <button key={y} type="button" className="lb-year-btn lb-num" data-state={state(y)} disabled={guess != null} onClick={() => pick(y)} aria-label={`${y}${state(y) === "right" ? ", the answer" : ""}`}>
            {y}
          </button>
        ))}
      </div>
      <div className="min-h-[3rem] flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
        {guess != null && (
          <>
            <p className="font-body text-[15px] lb-ink m-0">
              {`${verdict} From `}
              <button type="button" className="lb-link" onClick={() => onSelect(post.id)}>
                <span {...langProps(textLang(post.title))}>{post.title}</span>
              </button>
              {`, ${shortDate(post.date)}.`}
            </p>
            <button type="button" className="lb-btn lb-btn--ink lb-btn--sm" onClick={next}>Another line →</button>
          </>
        )}
        {guess == null && <p className="font-body text-[13px] lb-soft m-0">Every year is equally likely to come up, however many essays it has.</p>}
      </div>
    </div>
  );
};

const PhrasesLens = ({ data, byId, onSelect }) => {
  const [lang, setLang] = useState("en");
  const years = useMemo(() => data.byYear.map((y) => y.year), [data.byYear]);
  const phrases = data.phrases[lang] || [];
  const words = data.words[lang] || {};
  const lines = useMemo(() => data.lines.filter((l) => byId.has(l.post)), [data.lines, byId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="lb-seg self-start" role="group" aria-label="Language">
        <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
        <button type="button" aria-pressed={lang === "mr"} onClick={() => setLang("mr")} className="lb-mr-text" lang="mr">मराठी</button>
      </div>
      <div className="lb-habits">
        <Ledger key={lang} phrases={phrases} years={years} lang={lang} />
        <div className="flex flex-col gap-4">
          <WordsOfTheYear words={words} lang={lang} />
          <Volume byYear={data.byYear} totals={data.totals} />
        </div>
      </div>
      {lines.length > 0 && <GuessYear lines={lines} byId={byId} years={years} onSelect={onSelect} />}
    </div>
  );
};

export default PhrasesLens;
