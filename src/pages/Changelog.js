import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import {
  getChangelogByMajor, getChangelogMajors, getMajorSummary,
} from "../lib/api/changelog";

// The version history reads from the `changelog` table (0028), one major
// version at a time. It used to fetch all of src/data/changelog.md — 204 KB of
// prose for the handful of versions anybody scrolls to.
//
// A major version is the unit the page is organised by: a major is what a
// redesign or a rewrite is numbered as, so "v18" is a chapter, while
// "everything since 2023" is not something anyone reads in one go.

// Kind → badge colour. Anything else falls through to neutral, so a new section
// heading in the changelog format renders rather than disappearing.
const KIND_TONE = {
  Added: "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  Changed: "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10",
  Fixed: "text-sky-700 dark:text-sky-400 border-sky-500/30 bg-sky-500/10",
  Removed: "text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10",
};
const NEUTRAL_TONE = "text-stone-600 dark:text-stone-300 border-stone-400/30 bg-stone-500/10";

const KIND_ORDER = ["Added", "Changed", "Fixed", "Removed"];

// Changes are stored as one flat array in changelog order; the page groups them
// back under their section headings.
const groupByKind = (changes) => {
  const groups = new Map();
  (changes || []).forEach((c) => {
    const kind = c.kind || "Changed";
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(c);
  });
  return [...groups.entries()].sort(
    (a, b) => (KIND_ORDER.indexOf(a[0]) + 1 || 99) - (KIND_ORDER.indexOf(b[0]) + 1 || 99),
  );
};

// "v18.2.1" → 18. Every link into this page is by version anchor (/ask cites
// /changelog#v18.2.0, and so does the admin's "View on site"), so the major to
// open is read back out of the anchor.
const majorOf = (version) => {
  const m = /^v(\d+)\./.exec(version || "");
  return m ? Number(m[1]) : null;
};

// The chapter card: what a whole major was about, written by
// `npm run changelog:majors` from the releases inside it. Rendered first and
// the engineering entries are collapsed under each release, because this is
// what someone opening /changelog came to read.
//
// A major with no summary yet renders nothing here — never a placeholder.
const MajorSummary = ({ summary, major, releases }) => {
  if (!summary) return null;
  const added = summary.highlights?.added || [];
  const fixed = summary.highlights?.fixed || [];

  return (
    <section className="rounded-xl border border-secondary/25 bg-secondary/[0.04] dark:bg-secondary/[0.07] p-6 md:p-8">
      <p className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary font-bold mb-2">
        {`v${major} · ${releases} release${releases === 1 ? "" : "s"}`}
      </p>
      {summary.headline && (
        <h2 className="font-headline text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 mb-3">
          {summary.headline}
        </h2>
      )}
      <p className="font-body text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-0 max-w-3xl">
        {summary.summary}
      </p>

      {(added.length > 0 || fixed.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {added.length > 0 && (
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">
                New
              </p>
              <ul className="list-none pl-0 m-0 flex flex-col gap-1.5">
                {added.map((item) => (
                  <li key={item} className="font-body text-sm text-stone-600 dark:text-stone-300 pl-4 relative">
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fixed.length > 0 && (
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-sky-700 dark:text-sky-400 mb-2">
                Fixed
              </p>
              <ul className="list-none pl-0 m-0 flex flex-col gap-1.5">
                {fixed.map((item) => (
                  <li key={item} className="font-body text-sm text-stone-600 dark:text-stone-300 pl-4 relative">
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-sky-500/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const Version = ({ entry }) => (
  <section id={entry.version} className="scroll-mt-24">
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
      <h2 className="font-headline text-3xl font-black text-stone-900 dark:text-stone-100 mb-0">
        {entry.version}
      </h2>
      <span className="font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500">
        {entry.date}
      </span>
    </div>

    {/* The reader-facing paragraph npm run changelog:notes writes, where the
        version has one. It says what changed for someone who uses the site;
        the entries below it say why. */}
    {entry.summary && (
      <p className="font-body text-lg text-stone-600 dark:text-stone-300 leading-relaxed border-l-2 border-secondary/40 pl-4 mb-6">
        {entry.summary}
      </p>
    )}

    {/* The engineering entries are collapsed: they explain *why*, which is why
        they are kept, but the summary above is what a reader came for. Native
        <details>, so opening one costs no state and it prints open. */}
    <details className="group">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors mb-4">
        <span className="group-open:hidden">
          {`Show the ${entry.changes.length} entr${entry.changes.length === 1 ? "y" : "ies"}`}
        </span>
        <span className="hidden group-open:inline">Hide entries</span>
      </summary>

    {groupByKind(entry.changes).map(([kind, changes]) => (
      <div key={kind} className="mb-6">
        <span className={`inline-block px-2.5 py-0.5 rounded-full border font-label text-[10px] uppercase tracking-widest mb-3 ${KIND_TONE[kind] || NEUTRAL_TONE}`}>
          {kind}
        </span>
        <ul className="flex flex-col gap-3 list-none pl-0 m-0">
          {changes.map((change, i) => (
            <li key={i} className="font-body text-stone-600 dark:text-stone-300 leading-relaxed">
              {change.name && (
                <strong className="text-stone-900 dark:text-stone-100">{change.name}</strong>
              )}
              {change.path && (
                <code className="ml-2 text-xs text-stone-400 dark:text-stone-500">{change.path}</code>
              )}
              {change.name && change.body && ": "}
              {/* Plain text, deliberately: changelogParse.js has already
                  stripped the backticks and emphasis, and entry bodies are full
                  of angle-bracket placeholders — /tags/<name>, <slug>.png —
                  that a markdown pass renders as unknown HTML elements and
                  swallows. */}
              {change.body}
            </li>
          ))}
        </ul>
      </div>
    ))}
    </details>
  </section>
);

const Changelog = () => {
  const [majors, setMajors] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Which major is open is URL state, so a link to a chapter is shareable and
  // the back button walks the chapters.
  const requested = Number(searchParams.get("v")) || null;

  useEffect(() => {
    getChangelogMajors().then(setMajors).catch((err) => setError(err.message));
  }, []);

  // A deep link to one version (/changelog#v18.2.0) has to open that version's
  // major, or the anchor sits in a chapter the page is not showing. Read once,
  // on mount: after that the tabs own the selection.
  const hashMajor = useMemo(
    () => majorOf(typeof window === "undefined" ? "" : window.location.hash.slice(1)),
    [],
  );

  const current = requested ?? hashMajor ?? majors[0]?.major ?? null;

  const select = useCallback((major) => {
    // Merged, not replaced: other params on the URL are not this page's to drop.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("v", String(major));
      return next;
    });
  }, [setSearchParams]);

  useEffect(() => {
    if (current === null) return;
    setLoading(true);
    // The summary is fetched beside the releases, not before them: a major
    // that has not been summarised yet must not hold the page back.
    setSummary(null);
    Promise.all([getChangelogByMajor(current), getMajorSummary(current)])
      .then(([rows, chapter]) => { setEntries(rows); setSummary(chapter); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [current]);

  const total = majors.reduce((n, m) => n + m.count, 0);
  const latest = majors[0]?.latest;
  const openMajor = majors.find((m) => m.major === current);

  return (
    <PageShell region="person">
      <div className="flex flex-col gap-12 w-full">
        <section className="mb-4">
          <div className="max-w-3xl">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-4 block">
              Version History
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-8">
              Changelog.
            </h1>
            <p className="font-body text-xl text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl">
              A transparent, human-readable record of every meaningful change
              made to this website. Features added, improvements shipped, bugs
              fixed, and design decisions documented — version by version.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              {latest && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 dark:bg-secondary/20 border border-secondary/20 rounded-full font-label text-xs text-secondary font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  {`Latest: ${latest}`}
                </span>
              )}
              {total > 0 && (
                <span className="font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  {`${total} versions across ${majors.length} majors`}
                </span>
              )}
              <a
                href="https://github.com/daredavil01/personal-site/commits/main"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors font-label text-xs uppercase tracking-widest"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Full Git History
              </a>
            </div>
          </div>
        </section>

        {/* One major at a time. The strip is every major that exists, newest
            first, with how many releases it holds. */}
        <div className="flex flex-wrap gap-2 -mt-4" role="tablist" aria-label="Major versions">
          {majors.map(({ major, count }) => {
            const active = major === current;
            return (
              <div
                key={major}
                role="tab"
                tabIndex={0}
                aria-selected={active}
                onClick={() => select(major)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") select(major); }}
                className={`cursor-pointer px-3 py-1 rounded-full border font-label text-[10px] uppercase tracking-widest transition-colors ${
                  active
                    ? "bg-secondary/15 border-secondary/40 text-secondary"
                    : "bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-secondary/40 hover:text-secondary"
                }`}
              >
                {`v${major}`}
                <span className="ml-1.5 opacity-60">{count}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="font-body text-stone-500 dark:text-stone-400">
            {`Could not load the changelog: ${error}`}
          </p>
        )}

        {!loading && summary && (
          <MajorSummary summary={summary} major={current} releases={openMajor?.count ?? entries.length} />
        )}

        {openMajor && !summary && (
          <p className="font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500 -mb-6">
            {`v${openMajor.major} — ${openMajor.count} release${openMajor.count === 1 ? "" : "s"}, newest ${openMajor.latest}`}
          </p>
        )}

        {loading && (
          <p className="font-body text-stone-400 dark:text-stone-500">Loading…</p>
        )}

        {!loading && (
          <div className="flex flex-col gap-12 w-full max-w-3xl">
            {entries.map((entry) => <Version key={entry.version} entry={entry} />)}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Changelog;
