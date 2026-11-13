import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  featuredEssays, prettyDate, monthLabel, readingTime,
} from "../../lib/writingLedger";
import { fmt, prefersReducedMotion } from "./shared";

// The total as a mechanical counter: each digit is a strip 0–9 that rolls to
// its place a beat after mount, the furthest-left digit last, like a tally
// clicking over. Screen readers get the number once via aria-label.
const Odometer = ({ value }) => {
  const [rolled, setRolled] = useState(() => prefersReducedMotion());
  useEffect(() => {
    if (rolled) return undefined;
    const t = setTimeout(() => setRolled(true), 120);
    return () => clearTimeout(t);
  }, [rolled]);
  const chars = fmt(value).split("");
  const digits = chars.filter((c) => /\d/.test(c)).length;
  let seen = 0;
  return (
    <p className="wl-odo wl-num" aria-label={`${fmt(value)} words`}>
      {chars.map((c, i) => {
        if (!/\d/.test(c)) {
          // eslint-disable-next-line react/no-array-index-key
          return <span key={i} className="wl-odo-sep" aria-hidden="true">{c}</span>;
        }
        seen += 1;
        const d = Number(c);
        const delay = (digits - seen) * 0.09;
        return (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} className="wl-odo-digit" aria-hidden="true">
            <span
              className="wl-odo-strip"
              style={{
                transform: `translateY(-${rolled ? d * 10 : 0}%)`,
                transitionDelay: `${delay}s`,
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </p>
  );
};

Odometer.propTypes = { value: PropTypes.number.isRequired };

const Delta = ({ pct, vs }) => {
  if (pct == null) return <span>no {vs} to compare</span>;
  const up = pct >= 0;
  return (
    <span>
      <span className={`wl-delta ${up ? "up" : "down"}`}>{up ? "▲ +" : "▼ "}{pct}%</span> vs {vs}
    </span>
  );
};

Delta.propTypes = { pct: PropTypes.number, vs: PropTypes.string.isRequired };
Delta.defaultProps = { pct: null };

// A progress bar towards a benchmark — last month's total for the month,
// last year's whole total for the year — so a month four days old reads as
// "a quarter of the way there", not "down 100%".
const Track = ({ value, of, label }) => {
  const pct = of > 0 ? Math.min(100, (value / of) * 100) : 0;
  const [w, setW] = useState(() => (prefersReducedMotion() ? pct : 0));
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <>
      <div className="wl-track" aria-hidden="true"><i style={{ width: `${w}%` }} /></div>
      <div className="wl-track-label">
        <span>{label}</span>
        <span className="wl-num">{of > 0 ? `${Math.round((value / of) * 100)}%` : "—"}</span>
      </div>
    </>
  );
};

Track.propTypes = { value: PropTypes.number.isRequired, of: PropTypes.number.isRequired, label: PropTypes.string.isRequired };

const Cover = ({ m, period }) => {
  const firstYear = m.first.year;
  const lastYear = m.latest.year;
  const priorYearTotal = (m.byYear.find((y) => y.year === String(Number(period?.yearToDate.year) - 1)) || {}).words || 0;
  const mtd = period?.monthToDate;
  const ytd = period?.yearToDate;
  const featured = featuredEssays(m.posts);
  const accounts = [
    ["Posts published", fmt(m.posts.length)],
    ["Average post", `${fmt(m.averageWords)} words`],
    ["Longest post", `${fmt(m.longest.words)} words`],
    ["Active months", `${m.activeMonths} of ${m.series.length}`],
    ["Platforms", m.platforms.map((p) => `${p.label} ${p.posts}`).join(" · ")],
    ["Languages", m.languages.map((p) => `${p.label} ${p.posts}`).join(" · ")],
    ["First entry", prettyDate(m.first.date)],
    ["Latest entry", prettyDate(m.latest.date)],
  ];

  return (
    <header className="wl-cover">
      <p className="wl-eyebrow">Writing archive · {firstYear}–{lastYear} · Substack &amp; WordPress</p>
      <h1 className="wl-title">The Writing <em>Ledger</em></h1>
      <p className="wl-lede wl-howto">
        Start with one of the three essays below; every number after them counts the same posts,
        and every mark on every chart opens the essay it stands for.
      </p>

      {featured.length > 0 && (
        <ol className="wl-start" aria-label="Three essays to start with">
          {featured.map(({ post, reason }) => (
            <li key={post.url}>
              <a href={post.url} target="_blank" rel="noopener noreferrer">
                <span className="why">{reason}</span>
                <span className="t" lang={post.lang === "Marathi" ? "mr" : undefined}>{post.title}</span>
                <span className="meta">
                  {prettyDate(post.date)} · {post.platform} · {readingTime(post.words).text} read
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}

      <Odometer value={m.words} />
      <p className="wl-odo-unit">words, and counting.</p>
      <p className="wl-lede">
        Every essay I have published since <b>{prettyDate(m.first.date)}</b>, counted word by word:{" "}
        <b>{fmt(m.posts.length)} posts</b> across two platforms and two languages, an average of{" "}
        <b>{fmt(m.averageWords)} words</b> each. <b>{m.busiestYear.year}</b> alone holds{" "}
        <b>{Math.round((m.busiestYear.words / m.words) * 100)}%</b> of it.
      </p>

      <div className="wl-equiv">
        <div><b className="wl-num">{m.reading.text}</b><span>to read it all, cover to cover</span></div>
        <div><b className="wl-num">{fmt(m.pages)}</b><span>printed pages, at 300 words a page</span></div>
        <div><b className="wl-num">{m.novels}×</b><span>the length of a 90,000-word novel</span></div>
        <div><b className="wl-num">{fmt(m.wordsPerDay)}</b><span>words a day, every day since {firstYear}</span></div>
      </div>

      <ul className="wl-accounts" aria-label="The ledger in brief">
        {accounts.map(([k, v]) => (
          <li key={k}><span className="k">{k}</span><span className="lead" aria-hidden="true" /><span className="v wl-num">{v}</span></li>
        ))}
      </ul>

      {period ? (
        <div className={`wl-balance${mtd.words > 0 ? "" : " is-single"}`}>
          {/* A month with nothing written yet would only show an empty bar at
              0%, so it is left out until the first post lands. */}
          {mtd.words > 0 && (
            <div className="wl-bal">
              <p className="k">This month</p>
              <p className="asof">{mtd.label} · day {mtd.daysElapsed}</p>
              <p className="v wl-num">{fmt(mtd.words)}<small>words · {mtd.posts} posts</small></p>
              <Track
                value={mtd.words}
                of={mtd.previousMonth.words}
                label={`towards ${monthLabel(mtd.previousMonth.month, true)}'s ${fmt(mtd.previousMonth.words)}`}
              />
            </div>
          )}
          <div className="wl-bal">
            <p className="k">This year</p>
            <p className="asof">{ytd.year} · day {ytd.daysElapsed} · {fmt(ytd.wordsPerDay)} words a day</p>
            <p className="v wl-num">{fmt(ytd.words)}<small>words · {ytd.posts} posts</small></p>
            <p className="meta">
              <Delta pct={ytd.changeVsPriorYear} vs={`${ytd.priorYearSamePeriod.year} by this date`} />
            </p>
            <Track value={ytd.words} of={priorYearTotal} label={`against all of ${ytd.priorYearSamePeriod.year} (${fmt(priorYearTotal)})`} />
          </div>
        </div>
      ) : null}
    </header>
  );
};

Cover.propTypes = {
  m: PropTypes.shape({}).isRequired,
  period: PropTypes.shape({}),
};
Cover.defaultProps = { period: null };

export default Cover;
