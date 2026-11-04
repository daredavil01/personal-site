import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { usePresentations } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "../components/common/AsyncStates";
import TagLinks from "../components/common/TagLinks";
import {
  ChipRow, Insight, KpiStrip, NoMatches, Panel, RankBars, ResultLine,
  SearchBox, ShareViewButton, SortControl, TabBar, TabPanel, ViewToggle, useQueryState,
} from "../components/common/LogKit";
import { formatProjectDate } from "../lib/projectDate";
import { deckFacets, filterDecks, UNDATED } from "../lib/deckFilters";
import {
  deckSummary, enrichDecks, monthLabel, readMinutes,
} from "../lib/deckStats";

// /presentations — the deck shelf. The newest deck up front, then every deck
// as a live gallery or a light list (no iframes), filtered by search, year,
// length and topic; a Stats tab reads the cadence, lengths and topics. Slide
// counts come from the descriptions (src/lib/deckStats.js). URL state is
// merged so `view` (useViewMode) survives.

// A live, non-interactive thumbnail: the deck renders at 4x the card size and
// is scaled down to fit, so it looks like the first slide at desktop width.
// ponytail: each card loads the whole deck; the List layout loads none.
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

const TABS = [
  { id: "decks", label: "Decks", icon: "slideshow" },
  { id: "stats", label: "Stats", icon: "insights" },
];
const DEFAULTS = {
  tab: "", q: "", year: "", tags: "", length: "", sort: "date", dir: "desc", layout: "gallery",
};
const SORTS = [
  { value: "date", label: "Date" },
  { value: "slides", label: "Slides" },
  { value: "title", label: "Title" },
];
const TAG_PREVIEW = 10;
const latestLabel = (days) => {
  if (days == null) return null;
  return days === 0 ? "Today" : `${days}d ago`;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const SlideMeta = ({ deck }) => (
  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
    {deck.date && <span>{formatProjectDate(deck.date)}</span>}
    {deck.slides && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">view_carousel</span>{`${deck.slides} slides`}</span>}
    {deck.slides && <span title="At about 25 seconds a slide">{`~${readMinutes(deck.slides)} min`}</span>}
  </span>
);

SlideMeta.propTypes = { deck: PropTypes.shape({}).isRequired };

const Featured = ({ deck }) => (
  <article className="grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
    <Link to={`/presentations/${deck.id}`} className="lg:col-span-3 block no-underline" aria-label={`Open ${deck.title}`}>
      <DeckPreview url={deck.url} title={deck.title} />
    </Link>
    <div className="lg:col-span-2 p-6 lg:p-8 flex flex-col gap-4 justify-center">
      <span className="self-start px-2.5 py-1 rounded-full bg-secondary text-white font-label text-[10px] font-black uppercase tracking-widest">Newest deck</span>
      <h2 className="font-headline text-3xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-0">{deck.title}</h2>
      <SlideMeta deck={deck} />
      {deck.description && <p className="font-body text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-4 mb-0">{deck.description}</p>}
      <div className="flex flex-wrap gap-3 pt-1">
        <Link to={`/presentations/${deck.id}`} className="no-underline inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-label text-xs uppercase tracking-widest font-bold hover:bg-secondary dark:hover:bg-secondary dark:hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">play_arrow</span>
          Click through it
        </Link>
        <a href={deck.url} target="_blank" rel="noopener noreferrer" className="no-underline inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-label text-xs uppercase tracking-widest font-bold hover:border-secondary hover:text-secondary transition-colors">
          Full screen ↗
        </a>
      </div>
    </div>
  </article>
);

Featured.propTypes = { deck: PropTypes.shape({}).isRequired };

const GalleryCard = ({ deck }) => (
  <article className="group bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:border-secondary hover:shadow-lg rounded-2xl overflow-hidden flex flex-col transition-all">
    <Link to={`/presentations/${deck.id}`} className="no-underline block relative" aria-label={deck.title}>
      <DeckPreview url={deck.url} title={deck.title} />
      {deck.slides && (
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-stone-900/80 text-white font-label text-[10px] font-bold tabular-nums">{`${deck.slides} slides`}</span>
      )}
    </Link>
    <div className="p-5 flex flex-col gap-2.5 flex-1">
      <Link to={`/presentations/${deck.id}`} className="font-headline text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-secondary transition-colors no-underline leading-snug">
        {deck.title}
      </Link>
      <SlideMeta deck={deck} />
      {deck.description && <p className="font-body text-sm text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-3 mb-0">{deck.description}</p>}
      <div className="mt-auto pt-1"><TagLinks tags={deck.tags} /></div>
    </div>
  </article>
);

GalleryCard.propTypes = { deck: PropTypes.shape({}).isRequired };

const ListRow = ({ deck, maxSlides }) => (
  <li className="border-t border-stone-100 dark:border-stone-800 first:border-t-0">
    <Link to={`/presentations/${deck.id}`} className="no-underline group grid grid-cols-[1fr_auto] sm:grid-cols-[7rem_1fr_9rem] gap-x-4 gap-y-1 items-center px-4 sm:px-5 py-4 hover:bg-secondary/5 transition-colors">
      <span className="hidden sm:block font-label text-[11px] uppercase tracking-wider text-stone-400 tabular-nums">{deck.date ? formatProjectDate(deck.date) : "Undated"}</span>
      <span className="min-w-0">
        <span className="block font-body font-bold text-stone-900 dark:text-stone-100 group-hover:text-secondary truncate">{deck.title}</span>
        <span className="block font-body text-xs text-stone-500 dark:text-stone-400 truncate">{deck.description}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="font-label text-xs font-bold tabular-nums text-stone-600 dark:text-stone-300">{deck.slides ? `${deck.slides} slides` : "—"}</span>
        {deck.slides && (
          <span className="block h-1.5 w-24 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden" aria-hidden="true">
            <span className="block h-full bg-secondary rounded-full" style={{ width: `${(deck.slides / maxSlides) * 100}%` }} />
          </span>
        )}
      </span>
    </Link>
  </li>
);

ListRow.propTypes = { deck: PropTypes.shape({}).isRequired, maxSlides: PropTypes.number.isRequired };

/** Decks and slides per month, as paired columns. */
const Cadence = ({ months }) => {
  const maxCount = Math.max(1, ...months.map((m) => m.count));
  return (
    <div className="flex items-end gap-3 h-44 overflow-x-auto">
      {months.map((m) => (
        <div key={m.key} className="flex flex-col items-center gap-1 min-w-[3.5rem] h-full justify-end" title={`${monthLabel(m.key)}: ${plural(m.count, "deck")}, ${m.slides} slides counted`}>
          <span className="font-label text-xs font-black tabular-nums text-stone-800 dark:text-stone-200">{m.count || ""}</span>
          <span className="w-8 rounded-t-md bg-secondary" style={{ height: `${(m.count / maxCount) * 75}%`, minHeight: m.count ? 6 : 0 }} />
          <span className="font-label text-[10px] uppercase tracking-wider text-stone-400 whitespace-nowrap">{monthLabel(m.key)}</span>
          <span className="font-body text-[10px] text-stone-400 tabular-nums whitespace-nowrap">{m.slides ? `${m.slides} sl.` : " "}</span>
        </div>
      ))}
    </div>
  );
};

Cadence.propTypes = { months: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

const Presentations = () => {
  const { data, loading, error } = usePresentations();
  const navigate = useNavigate();
  const [state, set] = useQueryState(DEFAULTS);
  const [allTags, setAllTags] = useState(false);
  const tab = TABS.some((t) => t.id === state.tab) ? state.tab : "decks";

  const decks = useMemo(() => enrichDecks(data), [data]);
  const facets = useMemo(() => deckFacets(decks), [decks]);
  const summary = useMemo(() => deckSummary(decks), [decks]);
  const tags = useMemo(() => state.tags.split(",").filter(Boolean), [state.tags]);
  const shown = useMemo(() => filterDecks(decks, { ...state, tags }), [decks, state, tags]);
  const hasFilters = !!(state.q || state.year || state.length || tags.length);
  const clear = () => set({
    q: "", year: "", length: "", tags: "",
  });
  const toggleTag = (name) => set({ tags: (tags.includes(name) ? tags.filter((t) => t !== name) : [...tags, name]).join(",") });
  const maxSlides = Math.max(1, ...decks.map((d) => d.slides ?? 0));
  const featured = !hasFilters && state.sort === "date" && state.dir === "desc" ? shown[0] : null;
  const rest = featured ? shown.slice(1) : shown;
  const visibleTags = allTags ? facets.tags : facets.tags.slice(0, TAG_PREVIEW);
  const surprise = () => {
    const pool = shown.length ? shown : decks;
    navigate(`/presentations/${pool[Math.floor(Math.random() * pool.length)].id}`);
  };

  return (
    <PageShell region="creator">
      <div className="flex flex-col gap-8 w-full">
        <header className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12 items-end">
          <div className="lg:col-span-3">
            <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary mb-4 font-bold">Slide decks</p>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-0">
              Presentations.
            </h1>
          </div>
          <p className="lg:col-span-2 text-lg text-stone-500 dark:text-stone-400 font-body leading-relaxed mb-0">
            Talks, dossiers and data stories, built as HTML decks. Open one to click through it here, or switch to the list for a quick scan.
          </p>
        </header>

        {loading && <LoadingBlock label="Loading presentations…" />}
        {error && <ErrorBlock />}
        {!loading && !error && !decks.length && <EmptyBlock label="No presentations yet." />}

        {!loading && !error && summary && (
          <>
            <KpiStrip
              items={[
                { label: "Decks", icon: "slideshow", value: summary.count, sub: summary.undated ? `${summary.count - summary.undated} dated` : null },
                { label: "Slides", icon: "view_carousel", value: summary.slides, sub: summary.slides ? `Counted in ${summary.counted} of ${summary.count} decks` : null },
                { label: "Topics", icon: "sell", value: summary.topics || null, sub: summary.topTags[0] ? `Most often: ${summary.topTags[0].name}` : null },
                { label: "Latest", icon: "schedule", value: latestLabel(summary.daysSinceLast), sub: summary.latest?.title },
              ]}
            />

            <div className="md:sticky md:top-16 z-20 -mx-4 px-4 py-3 bg-white/90 dark:bg-stone-950/90 backdrop-blur border-b border-stone-200 dark:border-stone-800 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabBar label="Presentation sections" tabs={TABS} active={tab} onChange={(id) => set({ tab: id === "decks" ? "" : id })} />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={surprise}
                    className="h-10 flex items-center gap-2 px-4 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-label text-xs uppercase tracking-widest font-bold hover:border-secondary hover:text-secondary transition-colors"
                    title="Open a random deck from the current selection"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">casino</span>
                    Surprise me
                  </button>
                  <ShareViewButton />
                </div>
              </div>
              {tab === "decks" && (
                <>
                  <ChipRow label="Year" options={facets.years.map((y) => ({ value: y.name, label: y.name === UNDATED ? "Undated" : y.name, count: y.count }))} value={state.year} onChange={(v) => set({ year: v })} />
                  <ChipRow label="Length" options={summary.lengths.filter((l) => l.count).map((l) => ({ value: l.id, label: l.name, count: l.count, title: l.blurb }))} value={state.length} onChange={(v) => set({ length: v })} />
                </>
              )}
            </div>

            {tab === "decks" && (
              <TabPanel id="decks">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <SearchBox id="deck-search" value={state.q} onChange={(v) => set({ q: v })} placeholder="Search titles, descriptions and tags…" />
                    <SortControl options={SORTS} sort={state.sort} dir={state.dir} onChange={set} />
                    <ViewToggle
                      value={state.layout}
                      onChange={(v) => set({ layout: v })}
                      options={[{ value: "gallery", label: "Gallery with live previews", icon: "grid_view" }, { value: "list", label: "Light list (no previews)", icon: "view_list" }]}
                    />
                  </div>

                  {facets.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Topics">
                      <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mr-1">Topics</span>
                      {visibleTags.map(({ name, count }) => {
                        const on = tags.includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleTag(name)}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                              on ? "bg-secondary text-white border-secondary" : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-secondary hover:text-secondary"
                            }`}
                          >
                            {`#${name}`}
                            <span className="ml-1 opacity-60">{count}</span>
                          </button>
                        );
                      })}
                      {facets.tags.length > TAG_PREVIEW && (
                        <button type="button" onClick={() => setAllTags(!allTags)} aria-expanded={allTags} className="px-2 py-1 text-xs font-label font-bold uppercase tracking-wider text-secondary hover:underline">
                          {allTags ? "Fewer" : `+${facets.tags.length - TAG_PREVIEW} more`}
                        </button>
                      )}
                    </div>
                  )}

                  <ResultLine shown={shown.length} total={decks.length} noun="deck" onClear={hasFilters ? clear : undefined} />
                  {!shown.length && <NoMatches noun="presentation" onClear={clear} />}

                  {featured && state.layout === "gallery" && <Featured deck={featured} />}

                  {shown.length > 0 && state.layout === "list" && (
                    <ul className="m-0 p-0 list-none rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
                      {shown.map((d) => <ListRow key={d.id} deck={d} maxSlides={maxSlides} />)}
                    </ul>
                  )}
                  {state.layout !== "list" && rest.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {rest.map((d) => <GalleryCard key={d.id} deck={d} />)}
                    </div>
                  )}
                </div>
              </TabPanel>
            )}

            {tab === "stats" && (
              <TabPanel id="stats">
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Insight icon="view_carousel" label="Average deck" value={summary.avgSlides ? plural(summary.avgSlides, "slide") : null}>
                      {summary.avgSlides && `About ${readMinutes(summary.avgSlides)} minutes to click through.`}
                    </Insight>
                    <Insight icon="height" label="Biggest deck" value={summary.biggest ? plural(summary.biggest.slides, "slide") : null} onClick={summary.biggest ? () => navigate(`/presentations/${summary.biggest.id}`) : undefined}>
                      {summary.biggest?.title}
                    </Insight>
                    <Insight icon="event_repeat" label="Typical gap" value={summary.medianGap != null ? plural(summary.medianGap, "day") : null}>
                      Median time between one dated deck and the next.
                    </Insight>
                    <Insight icon="local_fire_department" label="Busiest month" value={summary.busiestMonth?.count ? monthLabel(summary.busiestMonth.key) : null}>
                      {summary.busiestMonth?.count && `${plural(summary.busiestMonth.count, "deck")}, ${summary.busiestMonth.slides} slides counted.`}
                    </Insight>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <Panel title="Cadence" subtitle={`Decks per month since the first dated one${summary.undated ? `; ${summary.undated} older decks carry no date` : ""}.`}>
                        <Cadence months={summary.months} />
                      </Panel>
                    </div>
                    <Panel title="Length" subtitle="Tap to filter the shelf.">
                      <RankBars
                        rows={summary.lengths.filter((l) => l.count).map((l) => ({ key: l.id, label: `${l.name} · ${l.blurb}`, value: l.count }))}
                        onPick={(r) => set({ tab: "", length: r.key })}
                      />
                    </Panel>
                  </div>
                  <Panel title="Topics" subtitle="How many decks carry each tag. Tap one to see those decks.">
                    <div className="columns-1 md:columns-2 gap-8">
                      <RankBars
                        rows={summary.topTags.slice(0, 16).map((t) => ({ key: t.name, label: `#${t.name}`, value: t.count }))}
                        onPick={(r) => set({ tab: "", tags: r.key })}
                      />
                    </div>
                  </Panel>
                </div>
              </TabPanel>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
};

export default Presentations;
