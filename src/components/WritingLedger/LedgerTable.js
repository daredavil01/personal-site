import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { prettyDate, tagLabel } from "../../lib/writingLedger";
import { fmt } from "./shared";

const PAGE = 25;

const COLUMNS = [
  { key: "title", label: "Post" },
  { key: "date", label: "Date" },
  { key: "platform", label: "Where", hide: true },
  { key: "words", label: "Words" },
];

// Every post, searchable and sortable, with a word bar per row so the column
// reads as a chart. Filters are local state; the topic filter is lifted so a
// tile in the topic map above can set it.
const ariaSort = (sort, key) => {
  if (sort.key !== key) return undefined;
  return sort.dir === 1 ? "ascending" : "descending";
};
const caret = (sort, key) => {
  if (sort.key !== key) return "";
  return sort.dir === 1 ? " ▲" : " ▼";
};

const LedgerTable = ({
  posts, years, platforms, topic, setTopic,
}) => {
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [year, setYear] = useState("");
  const [lang, setLang] = useState("");
  const [sort, setSort] = useState({ key: "date", dir: -1 });
  const [limit, setLimit] = useState(PAGE);
  const max = useMemo(() => Math.max(...posts.map((p) => p.words), 1), [posts]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = posts.filter((p) => {
      if (needle && !`${p.title} ${(p.tags || []).join(" ")} ${p.section || ""}`.toLowerCase().includes(needle)) return false;
      if (platform && p.platform !== platform) return false;
      if (year && p.year !== year) return false;
      if (lang && p.lang !== lang) return false;
      if (topic && !p.topics.includes(topic)) return false;
      return true;
    });
    const val = (p) => {
      if (sort.key === "words") return p.words;
      if (sort.key === "title") return p.title.toLowerCase();
      if (sort.key === "platform") return p.platform;
      return p.publishedAt || p.date;
    };
    return out.sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av < bv) return -sort.dir;
      if (av > bv) return sort.dir;
      return 0;
    });
  }, [posts, q, platform, year, lang, topic, sort]);

  const words = rows.reduce((s, p) => s + p.words, 0);
  const reset = () => {
    setQ(""); setPlatform(""); setYear(""); setLang(""); setTopic(""); setSort({ key: "date", dir: -1 }); setLimit(PAGE);
  };
  const sortBy = (key) => setSort((s) => (s.key === key
    ? { key, dir: -s.dir }
    : { key, dir: key === "title" || key === "platform" ? 1 : -1 }));

  return (
    <div className="wl-card" id="wl-ledger-table">
      <div className="wl-filters">
        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search titles, tags and sections…" aria-label="Search posts" />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
          <option value="">All platforms</option>
          {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
          <option value="">All years</option>
          {[...years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          <option value="">Both languages</option>
          <option value="English">English</option>
          <option value="Marathi">Marathi</option>
        </select>
        <button type="button" className="wl-btn" onClick={reset}>Reset</button>
      </div>
      {topic ? (
        <p style={{ margin: "0 0 10px" }}>
          <button type="button" className="wl-chip" onClick={() => setTopic("")} aria-label={`Remove topic filter ${topic}`}>
            {tagLabel(topic)} <span aria-hidden="true">×</span>
          </button>
        </p>
      ) : null}
      <p className="wl-count wl-num" aria-live="polite">
        {fmt(rows.length)} of {fmt(posts.length)} posts · {fmt(words)} words
      </p>
      {rows.length ? (
        <div className="wl-scroll">
          <table className="wl-table">
            <thead>
              <tr>
                <th scope="col" aria-label="Number">#</th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.hide ? "hide-sm" : undefined}
                    aria-sort={ariaSort(sort, c.key)}
                  >
                    <button type="button" onClick={() => sortBy(c.key)}>
                      {c.label}{caret(sort, c.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((p, i) => (
                <tr key={p.url || p.title + p.date}>
                  <td className="n wl-num">{String(i + 1).padStart(3, "0")}</td>
                  <td className="t">
                    <a href={p.url} target="_blank" rel="noopener noreferrer" lang={p.lang === "Marathi" ? "mr" : undefined}>{p.title}</a>
                    <small>{[p.section, ...p.topics.slice(0, 3)].filter(Boolean).join(" · ")}</small>
                  </td>
                  <td className="d wl-num">{prettyDate(p.date)}</td>
                  <td className="hide-sm"><span className="wl-pill">{p.platform}</span></td>
                  <td className="w">
                    <span className="wl-wbar wl-num">
                      <i className={String(p.platform).toLowerCase().startsWith("word") ? "wp" : ""} style={{ width: Math.max(3, (p.words / max) * 70) }} />
                      {fmt(p.words)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="wl-count" style={{ textAlign: "center", padding: "24px 0" }}>No posts match those filters.</p>}
      {rows.length > limit ? (
        <p style={{ textAlign: "center", margin: "16px 0 0" }}>
          <button type="button" className="wl-btn" onClick={() => setLimit((l) => l + 50)}>Show {Math.min(50, rows.length - limit)} more</button>{" "}
          <button type="button" className="wl-btn" onClick={() => setLimit(rows.length)}>Show all {fmt(rows.length)}</button>
        </p>
      ) : null}
    </div>
  );
};

LedgerTable.propTypes = {
  posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  years: PropTypes.arrayOf(PropTypes.string).isRequired,
  platforms: PropTypes.arrayOf(PropTypes.string).isRequired,
  topic: PropTypes.string.isRequired,
  setTopic: PropTypes.func.isRequired,
};

export default LedgerTable;
