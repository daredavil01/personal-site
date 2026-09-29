import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { issueModel } from "../lib/newsletterIssue";
import { EmptyBlock, LoadingBlock } from "../components/common/AsyncStates";
import { SUBSTACK_URL, useIssues } from "../components/Newsletter/issueHooks";

// /newsletter — what the monthly letter is, why it exists, and every issue.

const WHY = [
  {
    icon: "inventory_2",
    title: "The month, gathered",
    body: "Every race, trek, book, blog and short post I logged that month, pulled straight from this site's archive. Nothing retyped, nothing forgotten.",
  },
  {
    icon: "edit_note",
    title: "Then written by hand",
    body: "A short letter on what it all meant — the part a list of links cannot say. The numbers are the month's own; the words are mine.",
  },
  {
    icon: "forum",
    title: "And you can write back",
    body: "React to a section, vote on next month's question, rate the letter, or ask the archive about anything in it.",
  },
];

const IssueCard = ({ row, featured }) => {
  const model = issueModel(row);
  return (
    <Link
      to={`/newsletter/${row.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 no-underline hover:border-secondary transition-colors ${featured ? "@2xl:col-span-2" : ""}`}
    >
      {row.cardUrl ? (
        <img src={row.cardUrl} alt={`Share card for ${model.label}`} loading="lazy" className="w-full aspect-[1200/630] object-cover" />
      ) : (
        <div className="aspect-[1200/630] bg-gradient-to-br from-amber-100 to-amber-300 dark:from-stone-800 dark:to-stone-700 flex items-end p-6">
          <span className="font-headline text-4xl font-black text-stone-900/80 dark:text-stone-100/80">{model.label}</span>
        </div>
      )}
      <div className="flex flex-col gap-2 p-5">
        <span className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold">{model.label}</span>
        <span className={`font-headline font-black text-stone-900 dark:text-stone-100 group-hover:text-secondary transition-colors ${featured ? "text-3xl" : "text-xl"}`}>
          {model.headline}
        </span>
        {model.stats.length > 0 && (
          <span className="font-label text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {model.stats.map((s) => `${s.value} ${s.label}`).join(" · ")}
          </span>
        )}
      </div>
    </Link>
  );
};

IssueCard.propTypes = {
  row: PropTypes.shape({ slug: PropTypes.string, cardUrl: PropTypes.string }).isRequired,
  featured: PropTypes.bool,
};
IssueCard.defaultProps = { featured: false };

const Newsletter = () => {
  const { published, loading, error } = useIssues();
  const [latest, ...rest] = published;
  const years = useMemo(() => {
    const byYear = new Map();
    rest.forEach((row) => {
      const y = row.slug.slice(0, 4);
      byYear.set(y, [...(byYear.get(y) || []), row]);
    });
    return [...byYear.entries()];
  }, [rest]);

  return (
    <PageShell region="person">
      <div className="@container flex flex-col gap-14 w-full">
        <section className="max-w-3xl">
          <span className="font-label text-xs uppercase tracking-[0.3em] text-secondary font-bold mb-4 block">
            The monthly letter
          </span>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-6">
            Newsletter.
          </h1>
          <p className="font-body text-lg text-stone-600 dark:text-stone-300 leading-relaxed">
            Once a month I stop and look back. This site already keeps a record of
            everything I run, climb, read and write — so at the end of each month it
            gathers that month into one issue, and I add a letter about what it
            meant.
          </p>
          <p className="font-body text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
            It exists because a log is not a memory. Races blur into each other,
            books into shelves; a monthly letter is how a month gets remembered as a
            month, and how the people who follow along get the story rather than the
            spreadsheet.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {latest && (
              <Link to={`/newsletter/${latest.slug}`} className="rounded-full bg-secondary text-white px-5 py-2.5 font-label text-xs uppercase tracking-widest font-bold no-underline hover:opacity-90">
                Read the latest
              </Link>
            )}
            <a href={SUBSTACK_URL} target="_blank" rel="noopener noreferrer" className="rounded-full border border-stone-300 dark:border-stone-700 px-5 py-2.5 font-label text-xs uppercase tracking-widest font-bold text-stone-700 dark:text-stone-200 no-underline hover:border-secondary">
              Get it by email
            </a>
            <Link to="/now" className="rounded-full border border-stone-300 dark:border-stone-700 px-5 py-2.5 font-label text-xs uppercase tracking-widest font-bold text-stone-700 dark:text-stone-200 no-underline hover:border-secondary">
              This month so far
            </Link>
          </div>
        </section>

        <section aria-label="How it works" className="grid grid-cols-1 @2xl:grid-cols-3 gap-4">
          {WHY.map((w) => (
            <div key={w.title} className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 flex flex-col gap-3">
              <span className="material-symbols-outlined text-secondary text-3xl">{w.icon}</span>
              <h2 className="font-headline text-xl font-black text-stone-900 dark:text-stone-100 mb-0">{w.title}</h2>
              <p className="font-body text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-0">{w.body}</p>
            </div>
          ))}
        </section>

        <section aria-label="Issues" className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">Every issue</p>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-0">{`${published.length} letters`}</p>
          </div>
          {loading && !published.length && <LoadingBlock label="Fetching the letters…" />}
          {error && <EmptyBlock label="The letters could not be loaded right now." />}
          {!loading && !error && !published.length && <EmptyBlock label="The first letter is being written." />}
          {latest && (
            <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-6">
              <IssueCard row={latest} featured />
            </div>
          )}
          {years.map(([year, rows]) => (
            <div key={year} className="flex flex-col gap-4">
              <h2 className="font-headline text-2xl font-black text-stone-400 dark:text-stone-600 mb-0">{year}</h2>
              <div className="grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 gap-6">
                {rows.map((row) => <IssueCard key={row.slug} row={row} />)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </PageShell>
  );
};

export default Newsletter;
