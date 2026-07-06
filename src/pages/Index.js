import React from "react";
import { Link } from "react-router-dom";
import Main from "../layouts/Main";
import LifeStats from "../components/Index/LifeStats";
import OneMinuteIntro from "../components/common/OneMinuteIntro";
import GlobeShowcase from "../components/Index/GlobeShowcase";
import SectionHeader from "../components/common/SectionHeader";
import HOME_FEATURES from "../data/homeFeatures";

const Index = () => (
  <Main>
    <article className="w-full flex flex-col gap-12">
      <header className="mb-4">
        <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary font-bold mb-4">Sanket Tambare</p>
        <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-6">
          The Digital Hub.
        </h1>
        <p className="font-body text-lg text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed">
          Welcome to my digital garden — an intentional archive of professional work, creative pursuits, and physical challenges.
        </p>
      </header>

      <GlobeShowcase />

      <div data-tour="stats">
        <LifeStats />
      </div>

      <section>
        <SectionHeader label="In 1 Minute" />
        <OneMinuteIntro className="font-body text-lg text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed mb-6" />
        <Link
          to="/about"
          className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-secondary inline-flex items-center gap-2 hover:gap-4 transition-all no-underline"
        >
          Read the full story
          <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
        </Link>
      </section>

      <section data-tour="explore">
        <SectionHeader label="Explore" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {HOME_FEATURES.map((item) => (
            <div key={item.path} className="p-8 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-xl hover:border-secondary dark:hover:border-secondary transition-colors group flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-secondary opacity-60 group-hover:opacity-100 transition-opacity">
                    {item.icon}
                  </span>
                  <h3 className="font-headline text-xl font-bold uppercase tracking-widest text-stone-800 dark:text-stone-200">
                    <Link to={item.path} className="no-underline hover:text-secondary transition-colors">{item.title}</Link>
                  </h3>
                </div>
                <p className="font-body text-stone-500 dark:text-stone-400 leading-relaxed text-sm">
                  {item.desc}
                </p>
              </div>
              <div className="mt-6">
                <Link to={item.path} className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-secondary flex items-center gap-2 group-hover:gap-4 transition-all no-underline">
                  Explore Section
                  <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 p-12 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-2xl text-center">
        <h2 className="font-headline text-3xl font-black mb-6 text-stone-900 dark:text-stone-100">Let&apos;s build the future together.</h2>
        <p className="max-w-xl mx-auto text-stone-500 dark:text-stone-400 font-body mb-8">
          Whether it&apos;s a technical challenge, a research collaboration, or sharing a mile
          on the road, I&apos;m always open to meaningful engagement.
        </p>
        <Link
          to="/contact"
          className="inline-block px-8 py-3 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-950 transition-all rounded-sm no-underline"
        >
          Start a Conversation
        </Link>
      </section>
    </article>
  </Main>
);

export default Index;
