import React, { useRef } from "react";
import { useParams, Link } from "react-router-dom";
import RelatedContent from "../components/Ask/RelatedContent";
import PageShell from "../atlas/PageShell";
import { buildPresentationMeta } from "../data/pageMeta";
import { usePresentations } from "../context/ContentContext";
import { LoadingBlock } from "../components/common/AsyncStates";
import TagLinks from "../components/common/TagLinks";
import { formatProjectDate } from "../lib/projectDate";

const toolLink = "inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors cursor-pointer no-underline";

const BackLink = () => (
  <Link to="/presentations" className={toolLink}>
    <span className="material-symbols-outlined text-sm">arrow_back</span> All presentations
  </Link>
);

const PresentationPost = () => {
  const { id } = useParams();
  const { data: decks, loading } = usePresentations();
  const frameWrap = useRef(null);

  if (loading) return <PageShell region="creator"><LoadingBlock label="Loading presentation…" /></PageShell>;

  const deck = decks.find((d) => String(d.id) === id);
  if (!deck) {
    return (
      <PageShell region="creator" title="Presentation Not Found">
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <BackLink />
          <p className="font-body text-stone-500 dark:text-stone-400">Presentation not found.</p>
        </div>
      </PageShell>
    );
  }

  const meta = buildPresentationMeta({ title: deck.title, description: deck.description });
  const fullscreen = () => frameWrap.current?.requestFullscreen?.();

  return (
    <PageShell region="creator" title={meta.title} description={meta.description} image={meta.image}>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink />
          <div className="flex items-center gap-5">
            <div
              role="button"
              tabIndex={0}
              onClick={fullscreen}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fullscreen(); } }}
              className={toolLink}
            >
              <span className="material-symbols-outlined text-sm">fullscreen</span> Fullscreen
            </div>
            <a href={deck.url} target="_blank" rel="noopener noreferrer" className={toolLink}>
              <span className="material-symbols-outlined text-sm">open_in_new</span> Open original
            </a>
          </div>
        </div>

        <div ref={frameWrap} className="relative w-full aspect-video bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
          <iframe
            src={deck.url}
            title={deck.title}
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
            className="absolute inset-0 w-full h-full border-0 bg-white"
          />
        </div>
        <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
          Click the deck, then use the arrow keys. Blank? Use Open original.
        </p>

        <article className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-8 flex flex-col gap-4">
            <h1 className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-0 leading-tight">{deck.title}</h1>
            {deck.date && (
              <p className="font-body text-xs text-stone-400 dark:text-stone-500 mb-0">{formatProjectDate(deck.date)}</p>
            )}
            {deck.description && (
              <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed mb-0">{deck.description}</p>
            )}
            <TagLinks tags={deck.tags} />
          </div>
          <RelatedContent type="presentation" id={id} />
        </article>
      </div>
    </PageShell>
  );
};

export default PresentationPost;
