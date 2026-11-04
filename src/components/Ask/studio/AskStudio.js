import React, {
  useEffect, useMemo, useRef, useState,
} from "react";
import { useTagColors } from "../../../context/ContentContext";
import { colorForTag } from "../../../lib/generativeArt";
import useAskConversation from "../useAskConversation";
import { SHARE_LABELS, TYPE_FILTERS } from "../askUi";
import {
  buildShelves, categoryLabel, categoryOf, shelfLabel, shelfTotal, surpriseQuestion,
} from "../../../lib/askShelves";
import { validPool } from "../../../lib/askQuestions";
import Composer from "./Composer";
import Shelves from "./Shelves";
import StudioTurn from "./StudioTurn";
import SourceRail from "./SourceRail";
import "./studio.css";

// The /ask page. Before the first question it is a search page: one big box,
// six starter cards from different subjects, a Surprise me, and the shelves of
// what the archive has read. After it, a reading layout: the thread with each
// question as a heading, the composer docked beneath it, and on wide screens a
// rail with the questions so far and the sources of the answer in view.
//
// The conversation is useAskConversation — the same state machine the corner
// launcher draws — so this file is layout and interaction only.

const STARTER_COUNT = 6;
const nf = new Intl.NumberFormat("en-IN");

// Typing "/" anywhere outside a field puts the cursor in the box, the
// shortcut most search pages have taught people.
function useSlashFocus(ref) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}

const AskStudio = () => {
  const colors = useTagColors();
  const conv = useAskConversation({ chipCount: STARTER_COUNT, follow: false });
  const {
    turns, info, blocked, pending, types, toggleType, starters, drawStarters,
    send, retry, askFollowup, setFeedback, reset, shareable, doShare, shareThread, phase,
    questionFor,
  } = conv;
  const inputRef = useRef(null);
  const threadRef = useRef(null);
  const [active, setActive] = useState(null);
  const [hoverCite, setHoverCite] = useState(null);
  useSlashFocus(inputRef);

  const pool = info?.questionPool;
  const shelves = useMemo(() => buildShelves(info?.shelves, pool), [info]);
  const total = shelfTotal(shelves);
  const placeholderLines = useMemo(
    () => validPool(pool).map((p) => p.q.trim()).slice(0, 12),
    [pool],
  );
  const hasTurns = turns.length > 0;
  const lastAnswer = turns.length - 1;

  // A new question becomes the answer in view, and the page scrolls to the
  // question rather than to the bottom, so the answer reads from its top.
  useEffect(() => {
    if (!turns.length) {
      setActive(null);
      return;
    }
    setActive(lastAnswer);
    const q = document.getElementById(`ask-turn-${lastAnswer - 1}`);
    q?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [turns.length]);

  const asked = turns.filter((t) => t.role === "user").map((t) => t.content);
  const surprise = () => {
    const q = surpriseQuestion(pool, asked);
    if (q) send(q);
  };

  // One listener for the whole thread: which answer the pointer or focus is
  // in, and which [n] marker, so the rail can follow without every marker
  // carrying a handler.
  const track = (e) => {
    const turnEl = e.target.closest?.("[data-turn]");
    const i = turnEl ? Number(turnEl.dataset.turn) : null;
    if (i != null && turns[i]?.role === "assistant") setActive(i);
    const cite = e.target.closest?.("[data-cite]");
    setHoverCite(cite ? Number(cite.dataset.cite) : null);
  };

  const jump = (i) => {
    document.getElementById(`ask-turn-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(i + 1);
  };

  // Lights the [n] in the answer in view while its card is hovered. A style
  // rule rather than a prop: the markers are rendered by markdown, deep down.
  const highlight = active != null && hoverCite
    ? `.ask-studio [data-turn="${active}"] [data-cite="${hoverCite}"]{background:var(--ask-ink);color:var(--ask-surface)}`
    : "";

  // The dock's preference chips: the usual set, plus any shelf picked above
  // that is not in it, so a choice made on a tile never silently disappears.
  const chips = [
    ...TYPE_FILTERS,
    ...types.filter((t) => !TYPE_FILTERS.some((f) => f.id === t)).map((t) => ({ id: t, label: shelfLabel(t) })),
  ];

  const dockToolbar = hasTurns ? (
    <div className="flex flex-col gap-1.5">
      <div className="ask-dock__chips">
      {chips.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={types.includes(f.id)}
          onClick={() => toggleType(f.id)}
          className={`ask-chip ${types.includes(f.id) ? "ask-chip--on" : ""}`}
        >
          {f.label}
        </button>
      ))}
      </div>
      <span className="flex items-center justify-end gap-3">
        {shareable && (
          <button
            type="button"
            onClick={doShare}
            disabled={shareThread.status === "sharing"}
            className="ask-link"
          >
            {SHARE_LABELS[shareThread.status] || "Share conversation"}
          </button>
        )}
        <button type="button" onClick={reset} className="ask-link">
          New conversation
        </button>
      </span>
      {shareThread.note && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 m-0 break-all">
          {shareThread.note}
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className={`ask-studio ${hasTurns ? "ask-studio--thread" : "ask-studio--start"}`}>
      {highlight && <style>{highlight}</style>}

      {!hasTurns && (
        <header className="ask-hero">
          <p className="ask-eyebrow">
            <span className="ask-eyebrow__dot" aria-hidden="true" />
            Second brain
            {total > 0 && ` · ${nf.format(total)} passages · English and मराठी`}
          </p>
          <h1 className="ask-title">Ask the archive</h1>
          <p className="ask-lede">
            Books, races, treks, projects, essays and years of short posts — searched
            by words and by meaning. Every answer shows the pages it came from,
            and every [1] opens the page behind it.
          </p>
        </header>
      )}

      {hasTurns && (
        <div
          ref={threadRef}
          className="ask-thread"
          onMouseOver={track}
          onFocus={track}
          onMouseLeave={() => setHoverCite(null)}
        >
          {turns.map((turn, i) => (
            <StudioTurn
              // Turns are append-only and never reordered, so index is a stable key.
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              turn={turn}
              index={i}
              number={Math.floor(i / 2) + 1}
              question={questionFor(i)}
              phase={i === lastAnswer ? phase : null}
              colors={colors}
              active={active === i}
              hoverCite={active === i ? hoverCite : null}
              onShowSources={() => setActive(i)}
              onFollowup={askFollowup}
              onFeedback={(feedback) => setFeedback(i, feedback)}
              // Only the newest answer offers it: it shares the whole thread, and
              // an older one would imply it shares up to that point.
              onShareThread={i === lastAnswer ? doShare : null}
              shareStatus={i === lastAnswer ? shareThread.status : null}
              // Only the newest turn can retry: a retry replaces the last pair.
              onRetry={i === lastAnswer ? retry : null}
            />
          ))}
          <div ref={conv.endRef} />
        </div>
      )}

      {/* Always the same element in the same place in the tree, so it keeps
          its Turnstile widget and its focus when the page changes layout. */}
      <div className={hasTurns ? "ask-dock" : "ask-hero-box"}>
        {blocked ? (
          <p className="ask-blocked">{blocked}</p>
        ) : (
          <Composer
            conv={conv}
            docked={hasTurns}
            inputRef={inputRef}
            placeholderLines={placeholderLines}
            toolbar={dockToolbar}
          />
        )}
      </div>

      {!hasTurns && (
        <div className="ask-start">
          <section aria-labelledby="ask-starters-title" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 id="ask-starters-title" className="ask-section-title">Start somewhere</h2>
              <div className="flex items-center gap-3">
                {starters.length > 1 && (
                  <button type="button" onClick={drawStarters} className="ask-link">
                    Shuffle ↻
                  </button>
                )}
                {validPool(pool).length > 0 && (
                  <button
                    type="button"
                    onClick={surprise}
                    disabled={pending || !!blocked}
                    className="ask-btn ask-btn--ghost ask-btn--sm"
                  >
                    <span aria-hidden="true">🎲</span>
                    Surprise me
                  </button>
                )}
              </div>
            </div>
            <ul className="ask-cards">
              {starters.map((q, i) => {
                const c = categoryOf(q, pool);
                return (
                  <li key={q} style={{ "--i": i }}>
                    <button
                      type="button"
                      onClick={() => send(q)}
                      disabled={pending || !!blocked}
                      className="ask-card"
                      style={{ "--card": colorForTag(c || "ask", null) }}
                    >
                      <span className="ask-card__cat">{categoryLabel(c)}</span>
                      <span className="ask-card__q">{q}</span>
                      <span className="ask-card__go" aria-hidden="true">→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <Shelves
            shelves={shelves}
            types={types}
            onToggle={toggleType}
            onAsk={(q) => send(q)}
            disabled={pending || !!blocked}
          />
        </div>
      )}

      {hasTurns && (
        <SourceRail
          turns={turns}
          active={active}
          hoverCite={hoverCite}
          onHoverCite={setHoverCite}
          onJump={jump}
          colors={colors}
        />
      )}
    </div>
  );
};

export default AskStudio;
