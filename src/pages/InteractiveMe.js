import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Main from "../layouts/Main";
import InteractiveMeTimeline from "../components/InteractiveMe/InteractiveMeTimeline";

const tabs = ["SPORTS", "TREKS"];
const VALID_TABS = new Set(tabs.map((t) => t.toLowerCase()));

const InteractiveMePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab")?.toLowerCase();
  const activeTab = VALID_TABS.has(rawTab) ? rawTab.toUpperCase() : "SPORTS";

  const [copied, setCopied] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState("slow");

  const handleTabChange = (tab) => {
    window.scrollTo({ top: 0 });
    setSearchParams({ tab: tab.toLowerCase() });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Main>
      <div className="flex flex-col gap-12 w-full">
        <header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
            <div>
              <span className="font-label text-secondary uppercase tracking-[0.3em] font-bold text-xs mb-4 block">
                Visual Journey
              </span>
              <h1 className="font-headline text-5xl lg:text-7xl text-stone-900 dark:text-stone-100 leading-none tracking-tight">
                Interactive <br />
                Me
              </h1>
            </div>
            <div className="max-w-md pb-4">
              <p className="font-body text-stone-500 dark:text-stone-400 text-lg leading-relaxed">
                A shuffled, image-first timeline of every marathon and mountain
                trek. Cards scroll automatically — hover to pause and take it
                in.
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div data-tour="interactive-views" className="flex flex-wrap items-center gap-2 bg-stone-100 dark:bg-stone-800/50 p-1.5 rounded-xl">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-6 py-2.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold transition-all ${
                    isActive
                      ? "text-secondary bg-white dark:bg-stone-700 shadow-sm"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-950 px-5 py-2.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? "check" : "share"}
            </span>
            {copied ? "Copied!" : "Share"}
          </button>
        </div>

        <InteractiveMeTimeline
          key={activeTab}
          dataType={activeTab.toLowerCase()}
          scrollEnabled={scrollEnabled}
          scrollSpeed={scrollSpeed}
        />
      </div>

      {/* Floating scroll controls — scoped to this page only */}
      <div data-tour="interactive-controls" className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
        {/* Speed toggle */}
        <div className="flex items-center bg-stone-900 dark:bg-stone-100 rounded-full shadow-lg overflow-hidden">
          <button
            onClick={() => setScrollSpeed("slow")}
            title="Slow scroll (20 seconds)"
            className={`flex items-center gap-1.5 px-4 py-2.5 font-label text-xs uppercase tracking-widest font-bold transition-colors ${
              scrollSpeed === "slow"
                ? "bg-secondary text-white"
                : "text-stone-400 dark:text-stone-500 hover:text-white dark:hover:text-stone-900"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              avg_pace
            </span>
            Slow
          </button>
          <div className="w-px h-4 bg-stone-700 dark:bg-stone-300" />
          <button
            onClick={() => setScrollSpeed("fast")}
            title="Fast scroll (5 seconds)"
            className={`flex items-center gap-1.5 px-4 py-2.5 font-label text-xs uppercase tracking-widest font-bold transition-colors ${
              scrollSpeed === "fast"
                ? "bg-secondary text-white"
                : "text-stone-400 dark:text-stone-500 hover:text-white dark:hover:text-stone-900"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            Fast
          </button>
        </div>

        {/* Pause / Resume toggle */}
        <button
          onClick={() => setScrollEnabled((v) => !v)}
          title={scrollEnabled ? "Pause auto-scroll" : "Resume auto-scroll"}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-label text-xs uppercase tracking-widest font-bold shadow-lg transition-all ${
            scrollEnabled
              ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 hover:bg-stone-700 dark:hover:bg-stone-300"
              : "bg-secondary text-white hover:bg-secondary/80"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {scrollEnabled ? "pause" : "play_arrow"}
          </span>
          {scrollEnabled ? "Pause" : "Scroll"}
        </button>
      </div>
    </Main>
  );
};

export default InteractiveMePage;
