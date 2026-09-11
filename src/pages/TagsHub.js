import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { useTags } from "../context/ContentContext";
import { tagPath } from "../lib/api/tags";
import { colorForTag } from "../lib/generativeArt";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../components/common/AsyncStates";

// Interactive bits use div[role="button"] like the rest of the public site.
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

// Every tag across the archive, most-used first. Category chips and the search
// box filter client-side — there are only a few hundred tags.
const TagsHub = () => {
  const { data: tags, loading, error } = useTags();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const used = useMemo(() => tags.filter((t) => t.total > 0), [tags]);
  const categories = useMemo(
    () => [...new Set(used.map((t) => t.category).filter(Boolean))].sort(),
    [used],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return used.filter((t) => (!category || t.category === category)
      && (!q || t.name.includes(q) || t.displayName.toLowerCase().includes(q)));
  }, [used, query, category]);

  const max = used[0]?.total || 1;

  const chip = (value, label) => {
    const active = category === value;
    return (
      <div
        key={value || "all"}
        role="button"
        tabIndex={0}
        aria-pressed={active}
        onClick={() => setCategory(value)}
        onKeyDown={keyActivate(() => setCategory(value))}
        className={`px-3 py-1 rounded-full font-label text-[10px] uppercase tracking-widest border cursor-pointer transition-colors ${
          active
            ? "bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100"
            : "bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-secondary"
        }`}
      >
        {label}
      </div>
    );
  };

  return (
    <PageShell region="person">
      <article className="w-full max-w-4xl">
        <header className="mb-10">
          <h1 className="font-headline text-4xl font-bold text-stone-900 dark:text-stone-100 mb-4 uppercase tracking-tighter">Tags</h1>
          <p className="font-label text-xs uppercase tracking-[0.3em] text-stone-400 dark:text-stone-500 font-medium mb-0">
            The whole archive, by theme — books, blogs, races, treks, projects and micro-posts.
          </p>
          <div className="h-px w-full bg-stone-100 dark:bg-stone-800 mt-8" />
        </header>

        {loading && !tags.length && <LoadingBlock label="Loading tags…" />}
        {error && <ErrorBlock />}

        {!error && used.length > 0 && (
          <>
            <div className="flex flex-col gap-4 mb-8">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${used.length} tags…`}
                aria-label="Search tags"
                className="w-full md:w-80 px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:border-secondary"
              />
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
                  {chip("", "All")}
                  {categories.map((c) => chip(c, c))}
                </div>
              )}
            </div>

            {visible.length === 0 ? (
              <EmptyBlock label="No tags match." />
            ) : (
              <ul className="flex flex-wrap gap-2.5 list-none p-0 m-0">
                {visible.map((t) => (
                  <li key={t.id} className="m-0">
                    <Link
                      to={tagPath(t.name)}
                      title={t.description || undefined}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:border-secondary transition-colors no-underline"
                      // Busier tags read a little larger, capped so the cloud stays scannable.
                      style={{ fontSize: `${0.8 + Math.min(t.total / max, 1) * 0.35}rem` }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: colorForTag(t.name, t.color) }}
                      />
                      {t.displayName || t.name}
                      <span className="font-mono text-[10px] text-stone-400">{t.total}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {!loading && !error && used.length === 0 && <EmptyBlock label="No tags yet." />}
      </article>
    </PageShell>
  );
};

export default TagsHub;
