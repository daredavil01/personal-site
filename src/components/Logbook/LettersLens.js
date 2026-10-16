import React from "react";
import PropTypes from "prop-types";
import { langProps, shortDate, textLang } from "./shared";

// Letters across time: a passage I wrote years ago beside the recent passage
// closest to it in meaning, found by the /ask embeddings (pairLetters in
// src/lib/logbook.js). Each essay appears once; pairs may cross languages,
// because the embeddings are multilingual.

const Letter = ({ side, post, sentence, onSelect }) => {
  const lang = langProps(post.lang);
  return (
    <div className="lb-panel p-4 flex flex-col gap-2 h-full">
      <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold m-0" style={{ color: side === "then" ? "var(--lb-soft)" : "var(--lb-accent)" }}>
        {`${side === "then" ? "Then" : "Now"} · ${shortDate(post.date)}`}
      </p>
      <p className={`font-headline text-base md:text-lg lb-ink m-0 leading-snug ${lang.className || ""}`} lang={lang.lang}>{`“${sentence}”`}</p>
      <button type="button" onClick={() => onSelect(post.id)} className="mt-auto text-left font-body text-xs lb-soft hover:underline bg-transparent border-0 p-0 cursor-pointer">
        <span {...langProps(textLang(post.title))}>{`— ${post.title}`}</span>
      </button>
    </div>
  );
};

Letter.propTypes = {
  side: PropTypes.oneOf(["then", "now"]).isRequired,
  post: PropTypes.shape({ id: PropTypes.string, date: PropTypes.string, title: PropTypes.string, lang: PropTypes.string }).isRequired,
  sentence: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

const LettersLens = ({ data, byId, onSelect }) => {
  const letters = data.letters.filter((l) => byId.has(l.then.post) && byId.has(l.now.post));
  if (!letters.length) {
    return <p className="lb-panel font-body text-sm lb-soft p-4 m-0">No letters yet: the archive needs older essays that sit close to newer ones.</p>;
  }
  return (
    <div className="lb-sheet p-3 md:p-5 flex flex-col gap-4">
      <p className="font-body text-sm lb-soft m-0 max-w-2xl">
        A sentence from years ago, and the recent sentence closest to it in meaning. Nobody chose these pairs: the same
        embeddings that power the Ask page matched them, at least eighteen months apart, sometimes across languages.
      </p>
      <ol className="list-none p-0 m-0 flex flex-col gap-4">
        {letters.map((l) => {
          const then = byId.get(l.then.post);
          const now = byId.get(l.now.post);
          return (
            <li key={`${l.then.post}-${l.now.post}`} className="grid gap-2 md:grid-cols-[1fr_auto_1fr] items-stretch">
              <Letter side="then" post={then} sentence={l.then.s} onSelect={onSelect} />
              <div className="flex md:flex-col items-center justify-center gap-1 px-1" aria-label={`similarity ${l.sim.toFixed(2)}`}>
                <span className="lb-soft text-lg" aria-hidden="true">⟶</span>
                <span className="font-label text-[10px] lb-soft whitespace-nowrap">{`similarity ${l.sim.toFixed(2)}`}</span>
              </div>
              <Letter side="now" post={now} sentence={l.now.s} onSelect={onSelect} />
            </li>
          );
        })}
      </ol>
    </div>
  );
};

LettersLens.propTypes = {
  data: PropTypes.shape({ letters: PropTypes.arrayOf(PropTypes.shape({})).isRequired }).isRequired,
  byId: PropTypes.instanceOf(Map).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default LettersLens;
