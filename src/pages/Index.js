import React from "react";
import { Link } from "react-router-dom";
import Main from "../layouts/Main";
import HomeHero from "../components/Index/HomeHero";
import NowStrip from "../components/Index/NowStrip";
import HomeDoors from "../components/Index/HomeDoors";
import LifeStats from "../components/Index/LifeStats";
import LatestPosts from "../components/Index/LatestPosts";
import MonthlyDigest from "../components/Index/MonthlyDigest";
import GlobeShowcase from "../components/Index/GlobeShowcase";
import Trailer from "../components/Index/Trailer";
import SectionHeader from "../components/common/SectionHeader";
import useLatestPosts from "../components/Index/useLatestPosts";

// The feed fails silent; so does its heading, rather than label an empty space.
const LatestWriting = () => {
  const { items, status } = useLatestPosts();
  if (status === "error" || (status === "ready" && !items.length)) return null;
  return (
    <section>
      <SectionHeader label="Latest Writing" />
      <LatestPosts batchSize={5} />
    </section>
  );
};

// The classic homepage, newest-first: who this is and a question box, the most
// recent thing of each kind, four doors into the site, then the writing feed.
// The heavy, playful pieces (the stats tiles, the globe, the trailer) follow
// the content instead of standing in front of it. The crawler fallback
// (homeFallback in src/lib/seo/fallbackHtml.js) mirrors this order.
const Index = () => (
  <Main>
    <article className="w-full flex flex-col gap-12">
      <HomeHero />

      <NowStrip />

      <HomeDoors />

      <LatestWriting />

      <LifeStats />

      <GlobeShowcase />

      <Trailer />

      <section>
        <SectionHeader label="Monthly Digest" />
        <MonthlyDigest />
      </section>

      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 md:p-8 border border-stone-200 dark:border-stone-800 rounded-xl">
        <div>
          <h2 className="font-headline text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
            One letter a month
          </h2>
          <p className="font-body text-stone-500 dark:text-stone-400 mb-0">
            The month's essays, runs, treks and books, with a note on top.
          </p>
        </div>
        <Link
          to="/newsletter"
          className="shrink-0 inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 font-label text-xs uppercase tracking-widest font-bold hover:bg-secondary dark:hover:bg-secondary dark:hover:text-white transition-colors rounded-sm no-underline"
        >
          Read the newsletter
        </Link>
      </section>

      <section className="p-12 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-2xl text-center">
        <h2 className="font-headline text-3xl font-black mb-6 text-stone-900 dark:text-stone-100">
          Let&apos;s build the future together.
        </h2>
        <p className="max-w-xl mx-auto text-stone-500 dark:text-stone-400 font-body mb-8">
          Whether it&apos;s a technical challenge, a research collaboration, or
          sharing a mile on the road, I&apos;m always open to meaningful
          engagement.
        </p>
        <Link
          to="/contact"
          className="inline-block px-8 py-3 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-label text-xs uppercase tracking-widest font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-950 transition-all rounded-sm no-underline"
        >
          Start a Conversation
        </Link>
      </section>
    </article>
  </Main>
);

export default Index;
