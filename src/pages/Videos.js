import React from "react";
import PageShell from "../atlas/PageShell";
import { useVideos } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import VideoCard from "../components/Videos/VideoCard";
import Story from "../components/Videos/Story";
import useVideoFilters from "../components/Videos/useVideoFilters";
import { UNDATED, VIDEO_SORTS, VIDEO_TYPES } from "../lib/videoFilters";
import { YOUTUBE_CHANNEL } from "../lib/youtube";

// /videos — the YouTube channel, filled by the owner's sync at
// /admin/videos/sync. Filtering is src/lib/videoFilters.js; the state is in the
// URL (useVideoFilters). The header carries the page's own 90-second film
// (components/Videos/Story.js).

const selectClass = "h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg pl-3 pr-8 font-label text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200 outline-none cursor-pointer hover:border-secondary transition-colors max-w-full";

const chipClass = (active) => `px-3 py-1 rounded-md text-xs border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
  active
    ? "bg-secondary text-white border-secondary"
    : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-secondary/40 hover:text-secondary"
}`;

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const Videos = () => {
  const { data: videos, loading, error } = useVideos();
  const {
    filters, setFilter, toggleTag, clearFilters, hasFilters, filtered, facets,
  } = useVideoFilters(videos);
  const shortsOnly = filters.type === "short";

  return (
    <PageShell region="person">
      <div className="flex flex-col gap-10 w-full">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <p className="font-label text-xs uppercase tracking-widest text-secondary mb-4 font-bold">YouTube</p>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-8">
              Videos.
            </h1>
            <p className="max-w-2xl text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed mb-5">
              Everything on the channel, long videos and Shorts. Search it, filter it, or open one to watch it here.
            </p>
            <a
              href={YOUTUBE_CHANNEL.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-white font-label text-xs uppercase tracking-widest font-bold no-underline hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-base">subscriptions</span>
              Subscribe on YouTube
            </a>
          </div>
          <Story />
        </header>

        {loading && <LoadingBlock label="Loading videos…" />}
        {error && <ErrorBlock />}

        {!loading && !error && videos.length === 0 && (
          <p className="text-stone-500 dark:text-stone-400 font-body italic text-center py-12 mb-0">
            No videos yet.
          </p>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="flex flex-col gap-3 p-4 bg-stone-50 dark:bg-stone-900/60 border border-stone-100 dark:border-stone-800 rounded-xl">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex-1 min-w-[12rem]" htmlFor="video-search">
                <span className="sr-only">Search videos</span>
                <input
                  id="video-search"
                  type="search"
                  value={filters.q}
                  onChange={(e) => setFilter("q", e.target.value)}
                  placeholder="Search videos…"
                  className="w-full h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 font-body text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-secondary transition-colors"
                />
              </label>

              <div role="group" aria-label="Show" className="flex rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                {VIDEO_TYPES.map(({ key, label }) => {
                  const active = filters.type === key;
                  return (
                    <button
                      key={key || "all"}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter("type", key)}
                      className={`h-10 px-3 font-label text-xs uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary ${
                        active
                          ? "bg-secondary text-white"
                          : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:text-secondary"
                      }`}
                    >
                      {`${label} ${facets.types[key] ?? 0}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Filter by year"
                value={filters.year}
                onChange={(e) => setFilter("year", e.target.value)}
                className={selectClass}
              >
                <option value="">All Years</option>
                {facets.years.map(({ name, count }) => (
                  <option key={name} value={name}>{`${name === UNDATED ? "Undated" : name} (${count})`}</option>
                ))}
              </select>

              {facets.playlists.length > 0 && (
                <select
                  aria-label="Filter by playlist"
                  value={filters.playlist}
                  onChange={(e) => setFilter("playlist", e.target.value)}
                  className={selectClass}
                >
                  <option value="">All Playlists</option>
                  {facets.playlists.map(({ name, count }) => (
                    <option key={name} value={name}>{`${name} (${count})`}</option>
                  ))}
                </select>
              )}

              <select
                aria-label="Sort by"
                value={filters.sort}
                onChange={(e) => setFilter("sort", e.target.value)}
                className={selectClass}
              >
                {VIDEO_SORTS.map(({ key, label }) => (
                  <option key={key} value={key}>{`Sort: ${label}`}</option>
                ))}
              </select>
            </div>

            {facets.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">Tags:</span>
                {facets.tags.map(({ name, count }) => {
                  const active = filters.tags.some((t) => t.toLowerCase() === name);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTag(name)}
                      className={chipClass(active)}
                    >
                      {`#${name} ${count}`}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500" aria-live="polite">
                {filtered.length === videos.length
                  ? plural(videos.length, "video")
                  : `${filtered.length} of ${plural(videos.length, "video")}`}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-secondary font-label text-[10px] uppercase tracking-widest font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && videos.length > 0 && filtered.length === 0 && (
          <p className="text-stone-500 dark:text-stone-400 font-body italic text-center py-12 mb-0">
            No videos match these filters.
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div
            className={shortsOnly
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"}
          >
            {filtered.map((v) => <VideoCard key={v.id} video={v} tall={shortsOnly} />)}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Videos;
