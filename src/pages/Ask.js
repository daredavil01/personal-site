import React from "react";
import PageShell from "../atlas/PageShell";
import AskStudio from "../components/Ask/studio/AskStudio";
import { PAGE_META } from "../data/pageMeta";
import PageFilm from "../components/common/PageFilm";

const meta = PAGE_META["/ask"] || {};

// The full-page surface. AskStudio draws the conversation as a search page and
// then a reading layout; AskLauncher draws the same conversation in a corner
// panel, through AskChat. Both run on useAskConversation.
const Ask = () => (
  <PageShell region="person" title={meta.title} description={meta.description} image={meta.image}>
    <article className="flex flex-col gap-10">
      <div className="ask-frame">
        <AskStudio />
      </div>

      <PageFilm film="ask" />

      <footer className="max-w-3xl text-[12px] text-stone-500 dark:text-stone-400 border-t border-stone-200 dark:border-stone-800 pt-4">
        Runs on free tiers with a hard daily cap, so it can run out of answers
        before the day does. Short posts are old, unedited and sometimes
        reblogged — treat them as passing thoughts, not positions.
      </footer>
    </article>
  </PageShell>
);

export default Ask;
