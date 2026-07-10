import React from "react";
import PageShell from "../atlas/PageShell";
import NowDocument from "../components/Now/NowDocument";
import { useNowMeta, useNowMonths } from "../context/ContentContext";

const Now = () => {
  const { data: nowMeta } = useNowMeta();
  const { data: nowData } = useNowMonths();

  const current = nowData.find((m) => m.isCurrent);
  const lastUpdated = current ? `${current.month} ${current.year}` : "";

  return (
    <PageShell region="person">
      <div className="flex flex-col gap-10 w-full">
        {/* Hero Section */}
        <section>
          <div className="max-w-3xl">
            <span className="font-label text-xs uppercase tracking-[0.3em] text-secondary font-bold mb-4 block">
              Current Status
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-6">
              Now.
            </h1>
            <p className="font-body text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
              A month-by-month snapshot of what I'm running, reading, writing,
              and building. Pick a month from the timeline to travel through it.
            </p>
            {lastUpdated && (
              <div className="mt-6 inline-flex items-center gap-3 bg-secondary/[0.05] dark:bg-secondary/[0.08] border border-secondary/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label text-xs uppercase tracking-widest text-stone-600 dark:text-stone-300 font-bold">
                  Last updated: {lastUpdated}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Daily Rituals */}
        {nowMeta?.dailyRituals?.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-6">
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">
                Daily Rituals
              </p>
              <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {nowMeta.dailyRituals.map((ritual) => (
                <div
                  key={ritual.label}
                  className="flex items-start gap-4 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-5 hover:border-secondary/30 dark:hover:border-secondary/30 transition-colors"
                >
                  <div className="w-10 h-10 shrink-0 bg-secondary/[0.06] dark:bg-secondary/[0.12] rounded-lg flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-xl">
                      {ritual.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-label font-bold text-xs uppercase tracking-widest text-stone-700 dark:text-stone-300 mb-1">
                      {ritual.label}
                    </h4>
                    <p className="font-body text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-0">
                      {ritual.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <NowDocument months={nowData} />
      </div>
    </PageShell>
  );
};

export default Now;
