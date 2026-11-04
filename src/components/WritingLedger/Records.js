import React from "react";
import PropTypes from "prop-types";
import { monthLabel, prettyDate, readingTime } from "../../lib/writingLedger";
import { fmt } from "./shared";

const Ext = ({ p }) => <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>;
Ext.propTypes = { p: PropTypes.shape({ url: PropTypes.string, title: PropTypes.string }).isRequired };

// The ledger's record book, as torn till receipts. Each one is computed in
// src/lib/writingLedger.js; a record with nothing to say is left out.
const Records = ({ m }) => {
  const essays = m.posts.filter((p) => p.words >= 100);
  const shortest = essays.length ? essays.reduce((a, b) => (b.words < a.words ? b : a)) : null;
  const topTopic = m.topics[0];
  const items = [
    {
      k: "Longest post",
      v: fmt(m.longest.words),
      u: "words",
      d: <><Ext p={m.longest} /> · {prettyDate(m.longest.date)} · {readingTime(m.longest.words).text} read</>,
      stamp: "Record",
    },
    shortest && {
      k: "Shortest essay",
      v: fmt(shortest.words),
      u: "words",
      d: <><Ext p={shortest} /> · {prettyDate(shortest.date)}</>,
    },
    {
      k: "Busiest month",
      v: fmt(m.busiestMonth.words),
      u: "words",
      d: <>{m.busiestMonth.label} · {m.busiestMonth.posts} posts, about one every {Math.max(1, Math.round(30 / m.busiestMonth.posts))} days</>,
    },
    m.busiestDay && {
      k: "Busiest single day",
      v: m.busiestDay.posts.length,
      u: "posts",
      d: <>{prettyDate(m.busiestDay.date)} · {fmt(m.busiestDay.posts.reduce((s, p) => s + p.words, 0))} words in one sitting</>,
    },
    m.streak.length > 1 && {
      k: "Longest monthly streak",
      v: m.streak.length,
      u: "months",
      d: <>{monthLabel(m.streak.from, true)} – {monthLabel(m.streak.to, true)}, a post every single month{m.currentStreak === m.streak.length ? ", and still running" : ""}</>,
      stamp: m.currentStreak === m.streak.length ? "Live" : null,
    },
    m.silence && {
      k: "Longest silence",
      v: m.silence.days,
      u: "days",
      d: <>Between {prettyDate(m.silence.from.date)} and {prettyDate(m.silence.to.date)}, when <Ext p={m.silence.to} /> broke it</>,
    },
    {
      k: "Biggest year",
      v: fmt(m.busiestYear.words),
      u: "words",
      d: <>{m.busiestYear.year} · {m.busiestYear.posts} posts, {Math.round((m.busiestYear.words / m.words) * 100)}% of everything written</>,
    },
    topTopic && {
      k: "Most-written topic",
      v: Math.round(topTopic.share * 100),
      u: "% of words",
      d: <span style={{ textTransform: "capitalize" }}>{topTopic.label} · {topTopic.posts} posts, {fmt(topTopic.words)} words</span>,
    },
  ].filter(Boolean);

  return (
    <div className="wl-records">
      {items.map((r) => (
        <div className="wl-receipt" key={r.k}>
          {r.stamp ? <span className="stamp">{r.stamp}</span> : null}
          <p className="k">{r.k}</p>
          <p className="v wl-num">{r.v}<small>{r.u}</small></p>
          <p className="d">{r.d}</p>
        </div>
      ))}
    </div>
  );
};

Records.propTypes = { m: PropTypes.shape({}).isRequired };

export default Records;
