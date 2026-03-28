import React, { useState, useEffect } from "react";
import Main from "../layouts/Main";
import NowDocument from "../components/Now/NowDocument";

const Changelog = () => {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/changelog.md`)
      .then((r) => r.text())
      .then(setMarkdown)
      .catch(console.error);
  }, []);

  return (
    <Main
      title="Changelog"
      description="A transparent record of every meaningful change made to this website — features added, improvements shipped, and decisions documented."
    >
      <div className="flex flex-col gap-12 w-full">
        {/* Hero Section */}
        <section className="mb-4">
          <div className="max-w-3xl">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-4 block">
              Version History
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-8">
              Changelog.
            </h1>
            <p className="font-body text-xl text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl">
              A transparent, human-readable record of every meaningful change made to this website.
              Features added, improvements shipped, bugs fixed, and design decisions documented — version by version.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 dark:bg-secondary/20 border border-secondary/20 rounded-full font-label text-xs text-secondary font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  Latest: v5.0.0
                </span>
              </div>
              <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 font-label text-xs uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                {new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <a
                href="https://github.com/daredavil01/personal-site/commits/main"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors font-label text-xs uppercase tracking-widest"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Full Git History
              </a>
            </div>
          </div>
        </section>

        {/* Quick nav badges */}
        <div className="flex flex-wrap gap-2 -mt-4">
          {["v5.0.0", "v4.0.0", "v3.5.0", "v3.0.0", "v2.5.0", "v2.0.0", "v1.0.0"].map((v) => (
            <a
              key={v}
              href={`#${v}`}
              className="px-3 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest hover:border-secondary/40 hover:text-secondary transition-colors"
            >
              {v}
            </a>
          ))}
        </div>

        {/* Markdown content */}
        {markdown && <NowDocument content={markdown} />}
      </div>
    </Main>
  );
};

export default Changelog;
