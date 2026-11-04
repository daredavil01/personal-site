import React, { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import useViewMode from "../atlas/useViewMode";
import { useTagColors } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import OverviewTab from "../components/MicroBlog/OverviewTab";
import PostsTab from "../components/MicroBlog/PostsTab";
import StatsTab from "../components/MicroBlog/StatsTab";
import PostModal from "../components/MicroBlog/PostModal";
import useInsights from "../components/MicroBlog/useInsights";
import { getMicroblogPostsByIds } from "../lib/api/microblog";
import "../components/MicroBlog/microblog.css";

// /micro-blog in three tabs:
//   Overview — today's ten, then the whole archive read as a story
//   Posts    — every post, searched and paged in Postgres
//   Stats    — the derived numbers, for every year or one
// Overview and Stats read public/data/microblog-insights.json
// (npm run microblog:insights); Posts queries Supabase directly.
// Both shells draw the same tabs: the atlas at night, with chapters that rise
// into view; classic on paper, still. `?tab=` is the tab (`list` is the old
// name for Posts), `?year=` the Stats scope, and `view` is never touched.

const TABS = [
  { id: "overview", label: "Overview", icon: "auto_stories" },
  { id: "posts", label: "Posts", icon: "notes" },
  { id: "stats", label: "Stats", icon: "monitoring" },
];
const tabOf = (raw) => {
  if (raw === "list") return "posts";
  return TABS.some((t) => t.id === raw) ? raw : "overview";
};
// Keys that belong to a tab; switching tabs drops the others' keys.
const POST_KEYS = ["q", "tags", "source", "type", "kind", "month", "sort", "layout"];

const MicroBlog = () => {
  const mode = useViewMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabOf(searchParams.get("tab"));
  const year = searchParams.get("year") || "";
  const tagColors = useTagColors();
  const { doc, error } = useInsights();
  const [selected, setSelected] = useState(null);
  const tabsRef = useRef(null);

  const navigate = useCallback((nextTab, params = {}, { replace = false } = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ["tab", "year", ...POST_KEYS].forEach((k) => {
        if (nextTab !== tabOf(prev.get("tab")) || k in params) next.delete(k);
      });
      if (nextTab !== "overview") next.set("tab", nextTab);
      Object.entries(params).forEach(([k, v]) => { if (v) next.set(k, v); });
      return next;
    }, { replace });
    if (tabsRef.current && tabsRef.current.getBoundingClientRect().top < 0) {
      tabsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [setSearchParams]);

  // The topic map and its regions name posts by id; fetch the row to open it.
  const openById = useCallback((id) => {
    getMicroblogPostsByIds([id]).then(([post]) => { if (post) setSelected(post); }).catch(() => {});
  }, []);

  const goPosts = useCallback((params) => navigate("posts", params), [navigate]);
  const goStats = useCallback((y) => navigate("stats", { year: y }), [navigate]);
  const setYear = useCallback((y) => navigate("stats", { year: y }, { replace: true }), [navigate]);

  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = TABS[(i + step + TABS.length) % TABS.length];
    navigate(next.id);
    document.getElementById(`mb-tab-${next.id}`)?.focus();
  };

  const needsDoc = tab !== "posts";

  return (
    <PageShell region="writer" title="Micro Blog">
      <div className={`mb-root mb-${mode} flex flex-col gap-8 w-full max-w-5xl`} id="micro-blog">
        <header className="flex flex-col gap-4">
          <span className="font-label text-xs uppercase tracking-[0.3em] mb-accent font-bold">Archive</span>
          <h1 className="font-headline text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter mb-0">Micro Blog.</h1>
          <p className="font-body mb-muted leading-relaxed mb-0 max-w-2xl">
            Years of short posts, quotes and photo captions in English and Marathi, kept, searchable and read here as data.
          </p>
        </header>

        <div ref={tabsRef} className="sticky top-[4.5rem] z-20 scroll-mt-24">
          {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- focus sits on the active tab (roving tabindex) */}
          <div className="mb-tabs" role="tablist" aria-label="Micro Blog" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`mb-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="mb-panel"
                tabIndex={tab === t.id ? 0 : -1}
                className="mb-tab"
                onClick={() => navigate(t.id)}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div id="mb-panel" role="tabpanel" aria-labelledby={`mb-tab-${tab}`}>
          {needsDoc && !doc && !error && <LoadingBlock label="Reading the archive…" />}
          {needsDoc && error && <ErrorBlock />}
          {tab === "overview" && doc && (
            <OverviewTab doc={doc} onOpen={setSelected} onOpenId={openById} goPosts={goPosts} goStats={goStats} tagColors={tagColors} />
          )}
          {tab === "posts" && <PostsTab onOpen={setSelected} tagColors={tagColors} />}
          {tab === "stats" && doc && (
            <StatsTab doc={doc} year={doc.perYear[year] ? year : ""} setYear={setYear} goPosts={goPosts} tagColors={tagColors} />
          )}
        </div>
      </div>

      <PostModal post={selected} onClose={() => setSelected(null)} />
    </PageShell>
  );
};

export default MicroBlog;
