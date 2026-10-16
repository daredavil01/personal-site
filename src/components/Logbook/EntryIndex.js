import React, { useMemo, useState } from "react";
import { matchPosts } from "./model";
import { langProps, textLang, yearOf } from "./shared";

// § Index. Every entry as a ledger: grouped under its year, newest first,
// each with its length drawn as a rule. Search reaches titles, tags and
// opening lines, in either script.

const SORTS = [
  { id: "new", label: "Newest", by: (a, b) => (a.date < b.date ? 1 : -1) },
  { id: "old", label: "Oldest", by: (a, b) => (a.date < b.date ? -1 : 1) },
  { id: "long", label: "Longest", by: (a, b) => b.words - a.words },
];
const FIRST = 14;

const dayMonth = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const EntryIndex = ({ data, onSelect }) => {
  const { posts } = data;
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("all");
  const [sort, setSort] = useState("new");
  const [all, setAll] = useState(false);
  const maxWords = useMemo(() => Math.max(...posts.map((p) => p.words)), [posts]);

  const matches = useMemo(() => matchPosts(posts, query), [posts, query]);
  const list = useMemo(() => posts
    .filter((p) => (lang === "all" || p.lang === lang) && (!matches || matches.has(p.id)))
    .sort(SORTS.find((s) => s.id === sort).by), [posts, lang, matches, sort]);
  const filtering = !!matches || lang !== "all";
  const shown = all || filtering ? list : list.slice(0, FIRST);

  const groups = [];
  shown.forEach((p) => {
    const key = sort === "long" ? "all" : yearOf(p);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.posts.push(p);
    else groups.push({ key, posts: [p] });
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="lb-search flex-1 min-w-[200px] max-w-md">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Search every entry" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, tags, first lines…" />
        </div>
        <div className="lb-seg" role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === "all"} onClick={() => setLang("all")}>All</button>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
          <button type="button" aria-pressed={lang === "mr"} onClick={() => setLang("mr")} className="lb-mr-text" lang="mr">मराठी</button>
        </div>
        <div className="lb-seg" role="group" aria-label="Order">
          {SORTS.map((s) => <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</button>)}
        </div>
      </div>
      <p className="lb-meta lb-soft m-0" aria-live="polite">
        {filtering ? `${list.length} of ${posts.length} entries` : `${posts.length} entries`}
      </p>

      <div className="flex flex-col">
        {groups.map((g) => (
          <div key={g.key} className="lb-index-year">
            {g.key !== "all" ? <h3 className="lb-display text-[40px] leading-none lb-accent m-0 lb-num">{g.key}</h3> : <span />}
            <ol className="list-none p-0 m-0 flex flex-col">
              {g.posts.map((p) => {
                const tp = langProps(textLang(p.title));
                return (
                  <li key={p.id}>
                    <button type="button" className="lb-index-row" onClick={() => onSelect(p.id)}>
                      <span className="lb-meta lb-soft lb-num whitespace-nowrap">{sort === "long" ? yearOf(p) : dayMonth(p.date)}</span>
                      <span className="flex flex-col gap-1 min-w-0">
                        <span className={`lb-display lb-index-title text-[20px] leading-snug transition-colors ${tp.className || ""}`} lang={tp.lang}>{p.title}</span>
                        <span className="block h-[2px] rounded-full" style={{ width: `${Math.max(4, (p.words / maxWords) * 100)}%`, background: p.lang === "mr" ? "var(--lb-mr)" : "var(--lb-en)", opacity: 0.3 }} aria-hidden="true" />
                      </span>
                      <span className="lb-meta lb-soft lb-num whitespace-nowrap text-right">
                        {`${p.words.toLocaleString("en-IN")} w`}
                        <span className="sr-only">{`, ${p.lang === "mr" ? "Marathi" : "English"}`}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
        {!list.length && <p className="font-body text-sm lb-soft m-0 py-6">Nothing in the logbook matches that.</p>}
      </div>
      {!filtering && list.length > FIRST && (
        <button type="button" className="lb-btn self-start" onClick={() => setAll((a) => !a)}>
          {all ? "Show fewer" : `Show all ${list.length} entries`}
        </button>
      )}
    </div>
  );
};

export default EntryIndex;
