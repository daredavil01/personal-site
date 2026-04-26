import React, { useState, useEffect } from "react";
import Main from "../layouts/Main";
import NowDocument from "../components/Now/NowDocument";
import { loadNowMeta, loadNowMonths } from "../utils/parseNowCms";

const Now = () => {
  const [nowMeta, setNowMeta] = useState(null);
  const [nowData, setNowData] = useState([]);

  useEffect(() => {
    Promise.all([loadNowMeta(), loadNowMonths()]).then(([meta, months]) => {
      setNowMeta(meta);
      setNowData(months);
    });
  }, []);

  const current = nowData.find((m) => m.isCurrent);
  const lastUpdated = current ? `${current.month} ${current.year}` : "";

  return (
    <Main
      title="Now"
      description="What Sanket Tambare is working on right now — current projects, daily rituals, books in progress, and ideas being explored. Updated monthly."
    >
      <div className="flex flex-col gap-12 w-full">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="max-w-3xl">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-4 block">
              Current Status
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-8">
              Now.
            </h1>
            <p className="font-body text-xl text-stone-500 dark:text-stone-400 leading-relaxed">
              A snapshot of my current focus, projects, and the curiosities I'm
              chasing right now. Updated monthly to keep the narrative honest
              and intentional.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
              <span className="font-label text-sm text-stone-400 dark:text-stone-500 italic">
                Last updated: {lastUpdated}
              </span>
            </div>
          </div>
        </section>

        {/* Daily Rituals */}
        {nowMeta?.dailyRituals?.length > 0 && (
          <div className="bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 p-12 rounded-xl">
            <h3 className="font-headline text-3xl font-bold mb-12 text-center text-stone-800 dark:text-stone-200">
              Daily Rituals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {nowMeta.dailyRituals.map((ritual) => (
                <div key={ritual.label} className="text-center space-y-4">
                  <div className="w-16 h-16 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-full flex items-center justify-center mx-auto text-secondary">
                    <span className="material-symbols-outlined text-2xl">
                      {ritual.icon}
                    </span>
                  </div>
                  <h4 className="font-label font-bold text-sm uppercase tracking-widest text-stone-700 dark:text-stone-300">
                    {ritual.label}
                  </h4>
                  <p className="font-body text-sm text-stone-500 dark:text-stone-400">
                    {ritual.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <NowDocument months={nowData} />
      </div>
    </Main>
  );
};

export default Now;
