import React, { useState, useEffect } from "react";
import Main from "../layouts/Main";
import NowDocument from "../components/Now/NowDocument";

const Now = () => {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    import("../data/now.md")
      .then((res) => {
        fetch(res.default)
          .then((r) => r.text())
          .then(setMarkdown);
      })
      .catch(console.error);
  }, []);

  return (
    <Main
      title="Now"
      description="A snapshot of my current focus, projects, and the curiosities I'm chasing right now."
    >
      <style>{`
        .editorial-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 2rem;
        }
      `}</style>
      <div className="flex flex-col gap-12 w-full">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="max-w-3xl">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-4 block">Current Status</span>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 leading-tight mb-8">Now.</h1>
            <p className="font-body text-xl text-stone-500 leading-relaxed">
              A snapshot of my current focus, projects, and the curiosities I'm chasing right now. Updated monthly to keep the narrative honest and intentional.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
              <span className="font-label text-sm text-stone-400 italic">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </section>

          {/* Current Activities / Habits */}
          <div className="col-span-12 md:col-span-12 bg-secondary/[0.03] border border-secondary/10 p-12 rounded-xl mt-8">
            <h3 className="font-headline text-3xl font-bold mb-12 text-center text-stone-800">Daily Rituals</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white border border-stone-100 rounded-full flex items-center justify-center mx-auto text-secondary">
                  <span className="material-symbols-outlined text-2xl">potted_plant</span>
                </div>
                <h4 className="font-label font-bold text-sm uppercase tracking-widest text-stone-700">Digital Detox</h4>
                <p className="font-body text-sm text-stone-500">1 Hour of sunlight before screens.</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white border border-stone-100 rounded-full flex items-center justify-center mx-auto text-secondary">
                  <span className="material-symbols-outlined text-2xl">code</span>
                </div>
                <h4 className="font-label font-bold text-sm uppercase tracking-widest text-stone-700">Creative Code</h4>
                <p className="font-body text-sm text-stone-500">Refactoring one old project weekly.</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white border border-stone-100 rounded-full flex items-center justify-center mx-auto text-secondary">
                  <span className="material-symbols-outlined text-2xl">directions_run</span>
                </div>
                <h4 className="font-label font-bold text-sm uppercase tracking-widest text-stone-700">Movement</h4>
                <p className="font-body text-sm text-stone-500">Training for a spring 10k race.</p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white border border-stone-100 rounded-full flex items-center justify-center mx-auto text-secondary">
                  <span className="material-symbols-outlined text-2xl">headphones</span>
                </div>
                <h4 className="font-label font-bold text-sm uppercase tracking-widest text-stone-700">Audio Deep Dive</h4>
                <p className="font-body text-sm text-stone-500">Exploring 70s Japanese Jazz Fusion.</p>
              </div>
            </div>
          </div>

        {markdown && <NowDocument content={markdown} />}
      </div>
    </Main>
  );
};

export default Now;
