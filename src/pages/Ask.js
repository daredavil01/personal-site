import React from "react";
import Main from "../layouts/Main";
import AskChat from "../components/Ask/AskChat";
import { PAGE_META } from "../data/pageMeta";

const meta = PAGE_META["/ask"] || {};

// The full-page surface. AskLauncher renders the same AskChat in a corner
// panel, so this file is only the frame around it.
const Ask = () => (
  <Main title={meta.title} description={meta.description} image={meta.image}>
    <article className="flex flex-col gap-6 max-w-3xl">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold">Ask the archive</h1>
        <p className="text-[15px] text-stone-600 dark:text-stone-300 mb-0">
          A second brain over everything on this site — books, races, treks,
          projects, the 100 Days ledger and years of short posts. It searches the
          same database the pages render from, so every answer comes with the
          pages it came from.
        </p>
      </header>

      <div className="min-h-[55vh] flex">
        <AskChat />
      </div>

      <footer className="text-[12px] text-stone-500 dark:text-stone-400 border-t border-stone-200 dark:border-stone-800 pt-4">
        Runs on free tiers with a hard daily cap, so it can run out of answers
        before the day does. Short posts are old, unedited and sometimes
        reblogged — treat them as passing thoughts, not positions.
      </footer>
    </article>
  </Main>
);

export default Ask;
