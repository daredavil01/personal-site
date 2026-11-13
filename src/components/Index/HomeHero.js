import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IDENTITY, ROLE_LINE } from "../../data/identity";
import { getAskInfo } from "../../lib/api/ask";
import { pickQuestions } from "../../lib/askQuestions";

// The first screen: who this is in two lines, a box that asks the archive a
// question, and one door for someone who wants the whole story. The two lines
// come from src/data/identity.js, the same facts the JSON-LD and the crawler
// fallback state.
const HomeHero = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [chips, setChips] = useState([]);

  // Starter questions from the same pool /ask uses. Optional: if the endpoint
  // is unreachable the box still works, it just offers no suggestions.
  useEffect(() => {
    let alive = true;
    getAskInfo()
      .then((info) => {
        if (!alive || info?.enabled === false) return;
        const picked = pickQuestions(info?.questionPool, 3);
        setChips(picked.length ? picked : (info?.suggestedQuestions ?? []).slice(0, 3));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const ask = (q) => {
    const text = String(q ?? "").trim();
    if (!text) return;
    navigate(`/ask?q=${encodeURIComponent(text)}`);
  };

  return (
    <header className="flex flex-col gap-6">
      {/* The name is the heading: it is what a search for it should find. */}
      <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-0">
        {IDENTITY.name}.
      </h1>
      <p className="font-body text-xl md:text-2xl text-stone-600 dark:text-stone-300 max-w-2xl leading-snug mb-0">
        {ROLE_LINE}
        {" "}
        {IDENTITY.tagline}
      </p>

      <form
        role="search"
        aria-label="Ask the archive"
        className="max-w-2xl"
        onSubmit={(e) => { e.preventDefault(); ask(question); }}
      >
        <p id="home-ask-label" className="font-label text-xs uppercase tracking-widest font-bold text-stone-500 dark:text-stone-400 mb-2">
          Ask me anything the archive can answer
        </p>
        <div className="flex gap-2">
          <input
            id="home-ask"
            aria-labelledby="home-ask-label"
            type="search"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Which fort was hardest?"
            autoComplete="off"
            className="flex-1 min-w-0 min-h-[48px] px-4 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-secondary focus:ring-secondary"
          />
          <button
            type="submit"
            className="shrink-0 min-h-[48px] px-5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 font-label text-xs uppercase tracking-widest font-bold hover:bg-secondary dark:hover:bg-secondary dark:hover:text-white transition-colors"
          >
            Ask
          </button>
        </div>
        {chips.length > 0 && (
          <ul className="list-none pl-0 mt-3 mb-0 flex flex-wrap gap-2" aria-label="Try asking">
            {chips.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => ask(q)}
                  className="min-h-[36px] px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700 text-sm text-stone-600 dark:text-stone-300 hover:border-secondary hover:text-secondary transition-colors text-left"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <Link
        to="/about"
        className="self-start font-label text-xs uppercase tracking-[0.2em] font-bold text-secondary inline-flex items-center gap-2 hover:gap-4 transition-all no-underline"
      >
        Start here: the one-minute version
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_right_alt</span>
      </Link>
    </header>
  );
};

export default HomeHero;
