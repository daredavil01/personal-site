import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { usePresentations } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import TagLinks from "../components/common/TagLinks";
import { formatProjectDate } from "../lib/projectDate";

// A live, non-interactive thumbnail: the deck renders at 4x the card size and
// is scaled down to fit, so it looks like the first slide at desktop width.
// ponytail: each card loads the whole deck; switch to image thumbnails past ~20 decks.
export const DeckPreview = ({ url, title }) => (
  <div className="relative aspect-video overflow-hidden bg-stone-100 dark:bg-stone-800">
    <iframe
      src={url}
      title={`Preview of ${title}`}
      loading="lazy"
      tabIndex={-1}
      aria-hidden="true"
      sandbox="allow-scripts allow-same-origin"
      className="absolute top-0 left-0 w-[400%] h-[400%] origin-top-left scale-[.25] pointer-events-none border-0"
    />
  </div>
);

DeckPreview.propTypes = { url: PropTypes.string.isRequired, title: PropTypes.string.isRequired };

const Presentations = () => {
  const { data: decks, loading, error } = usePresentations();

  return (
    <PageShell region="creator">
      <div className="flex flex-col gap-10 w-full">
        <header>
          <p className="font-label text-xs uppercase tracking-widest text-secondary mb-4 font-bold">Slide Decks</p>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-8">
            Presentations.
          </h1>
          <p className="max-w-2xl text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed mb-3">
            Talks, dossiers and data stories, built as HTML decks. Open one to click through it here.
          </p>
          {decks.length > 0 && (
            <p className="mb-0 font-label text-[11px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
              {`${decks.length} deck${decks.length === 1 ? "" : "s"}`}
            </p>
          )}
        </header>

        {loading && <LoadingBlock label="Loading presentations…" />}
        {error && <ErrorBlock />}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {decks.map((d) => (
              <article
                key={d.id}
                className="group bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:border-secondary rounded-2xl overflow-hidden flex flex-col transition-colors"
              >
                <Link to={`/presentations/${d.id}`} className="no-underline block" aria-label={d.title}>
                  <DeckPreview url={d.url} title={d.title} />
                </Link>
                <div className="p-6 flex flex-col gap-3">
                  <Link
                    to={`/presentations/${d.id}`}
                    className="font-headline text-xl font-bold text-stone-900 dark:text-stone-100 group-hover:text-secondary transition-colors no-underline"
                  >
                    {d.title}
                  </Link>
                  {d.date && (
                    <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
                      {formatProjectDate(d.date)}
                    </p>
                  )}
                  {d.description && (
                    <p className="font-body text-sm text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-3 mb-0">
                      {d.description}
                    </p>
                  )}
                  <TagLinks tags={d.tags} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Presentations;
