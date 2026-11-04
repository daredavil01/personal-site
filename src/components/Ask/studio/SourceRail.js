import React from "react";
import PropTypes from "prop-types";
import SourceCard from "../SourceCard";

// The column beside the thread on wide screens: the questions asked so far,
// each a jump link, and the sources of whichever answer the reader is on.
// Hovering a card lights its [n] in the answer; hovering an [n] lights the
// card — the pairing a list of sources at the bottom of an answer never makes.

const SourceRail = ({
  turns, active, hoverCite, onHoverCite, onJump, colors,
}) => {
  const questions = turns
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.role === "user");
  const answer = active != null ? turns[active] : null;
  const sources = answer?.sources || [];
  const activeNumber = active != null ? Math.ceil(active / 2) : null;

  return (
    <aside className="ask-rail" aria-label="This conversation">
      {questions.length > 1 && (
        <nav className="ask-rail__block" aria-label="Questions in this conversation">
          <p className="ask-rail__head">This conversation</p>
          <ol className="list-none p-0 m-0 flex flex-col gap-0.5">
            {questions.map(({ t, i }, n) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  className={`ask-rail__q ${active === i + 1 ? "ask-rail__q--on" : ""}`}
                  aria-current={active === i + 1 ? "true" : undefined}
                >
                  <span className="tabular-nums opacity-60">{n + 1}</span>
                  <span className="truncate">{t.content}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="ask-rail__block">
        <p className="ask-rail__head">
          {activeNumber ? `Sources · answer ${activeNumber}` : "Sources"}
        </p>
        {sources.length ? (
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {sources.map((s, i) => (
              <li
                key={`${s.entity_type}-${s.entity_id}`}
                onMouseEnter={() => onHoverCite(i + 1)}
                onMouseLeave={() => onHoverCite(null)}
                onFocus={() => onHoverCite(i + 1)}
                onBlur={() => onHoverCite(null)}
              >
                <SourceCard source={s} index={i + 1} colors={colors} active={hoverCite === i + 1} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-stone-500 dark:text-stone-400 m-0">
            {answer?.streaming ? "Searching…" : "This answer cited nothing from the archive."}
          </p>
        )}
      </div>
    </aside>
  );
};

SourceRail.propTypes = {
  turns: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  active: PropTypes.number,
  hoverCite: PropTypes.number,
  onHoverCite: PropTypes.func.isRequired,
  onJump: PropTypes.func.isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
};

SourceRail.defaultProps = { active: null, hoverCite: null };

export default SourceRail;
