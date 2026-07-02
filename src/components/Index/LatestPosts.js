import React, { useEffect, useRef, useState } from "react";

const SUBSTACK_URL = "https://sankettambare.substack.com";

// Strips HTML tags from Substack's description field for a clean preview snippet.
const stripHtml = (html) => (html ? html.replace(/<[^>]*>/g, "").trim() : "");

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
};

const SkeletonCard = () => (
  <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 animate-pulse">
    <div className="h-2 w-24 bg-stone-100 dark:bg-stone-800 rounded mb-3" />
    <div className="h-3 w-3/4 bg-stone-100 dark:bg-stone-800 rounded mb-2" />
    <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded" />
  </div>
);

// Live Substack RSS feed (served as JSON by functions/rss-feed.js). Renders the
// full feed inside a scroll region, revealing `batchSize` posts at a time as the
// user scrolls to the bottom (IntersectionObserver on a sentinel).
const LatestPosts = ({ batchSize = 10 }) => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [visibleCount, setVisibleCount] = useState(batchSize);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch("/rss-feed")
      .then((res) => {
        if (!res.ok) throw new Error("Feed request failed");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setStatus("ready");
      })
      .catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((n) => Math.min(n + batchSize, items.length));
        }
      },
      { root, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [batchSize, items.length, status]);

  // Fail silent so the homepage never shows a broken section.
  if (status === "error" || (status === "ready" && items.length === 0)) return null;

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <div>
      <div
        ref={scrollRef}
        className="max-h-[70vh] overflow-y-auto pr-2 scroll-smooth flex flex-col gap-3"
      >
        {visible.map((item) => (
          <div
            key={item.guid || item.link}
            className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 hover:border-secondary transition-colors flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {item.pubDate && (
                <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">
                  {formatDate(item.pubDate)}
                </span>
              )}
              <span className="font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded self-center bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                Substack
              </span>
            </div>
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body font-semibold text-sm text-stone-800 dark:text-stone-200 hover:text-secondary dark:hover:text-secondary transition-colors no-underline"
              >
                {item.title}
              </a>
            ) : (
              <span className="font-body font-semibold text-sm text-stone-800 dark:text-stone-200">
                {item.title}
              </span>
            )}
            {item.description && (
              <p className="font-body text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2 mb-0">
                {stripHtml(item.description)}
              </p>
            )}
          </div>
        ))}
        <div ref={sentinelRef} className="h-px w-full" />
      </div>

      {!hasMore && (
        <div className="mt-4 text-center">
          <a
            href={SUBSTACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-secondary inline-flex items-center gap-2 hover:gap-4 transition-all no-underline"
          >
            Read more on Substack
            <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default LatestPosts;
