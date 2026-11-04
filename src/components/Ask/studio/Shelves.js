import React, { useState } from "react";
import PropTypes from "prop-types";
import { colorForTag } from "../../../lib/generativeArt";

// "What it has read": one tile per kind of content, sized by the passages the
// search reads. Pressing a tile does two things at once — it tells the search
// to prefer that kind, and it opens the questions that kind answers best. A
// preference, never a filter: the worker still searches everything and only
// re-ranks, which the note under the tiles says in so many words.

const nf = new Intl.NumberFormat("en-IN");

const Shelves = ({
  shelves, types, onToggle, onAsk, disabled,
}) => {
  const [open, setOpen] = useState(null);
  if (!shelves.length) return null;
  const opened = shelves.find((s) => s.type === open);

  const press = (type) => {
    // Turning a shelf on opens its questions; turning the open one off closes them.
    const on = types.includes(type);
    onToggle(type);
    if (!on) setOpen(type);
    else if (open === type) setOpen(null);
  };

  return (
    <section className="ask-shelves" aria-labelledby="ask-shelves-title">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 id="ask-shelves-title" className="ask-section-title">What it has read</h2>
        <p className="text-[12px] text-stone-500 dark:text-stone-400 m-0">
          Tap a shelf to lean the search towards it.
        </p>
      </div>

      <ul className="ask-shelves__grid">
        {shelves.map((s) => {
          const on = types.includes(s.type);
          return (
            <li key={s.type}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => press(s.type)}
                className={`ask-shelf ${on ? "ask-shelf--on" : ""}`}
                style={{ "--shelf": colorForTag(s.type, null) }}
              >
                <span className="ask-shelf__count">{nf.format(s.passages)}</span>
                <span className="ask-shelf__label">{s.label}</span>
                {s.newest && (
                  <span className="ask-shelf__newest" title={`Newest: ${s.newest}`}>
                    {`Newest: ${s.newest}`}
                  </span>
                )}
                <span className="ask-shelf__bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, s.share * 100)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {opened && (
        <div className="ask-shelf-panel" style={{ "--shelf": colorForTag(opened.type, null) }}>
          <p className="ask-shelf-panel__head">
            {`${opened.label} · ${nf.format(opened.passages)} passages · ${(opened.share * 100).toFixed(opened.share < 0.01 ? 1 : 0)}% of what it reads`}
          </p>
          {opened.questions.length ? (
            <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
              {opened.questions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => onAsk(q)}
                    disabled={disabled}
                    className="ask-shelf-panel__q"
                  >
                    <span>{q}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-stone-600 dark:text-stone-300 m-0">
              No ready-made questions for this shelf — type your own; the search now leans this way.
            </p>
          )}
        </div>
      )}

      {!!types.length && (
        <p className="text-[12px] text-stone-500 dark:text-stone-400 m-0">
          {"Leaning towards "}
          <strong className="font-medium text-stone-700 dark:text-stone-200">
            {shelves.filter((s) => types.includes(s.type)).map((s) => s.label.toLowerCase()).join(", ") || "your picks"}
          </strong>
          {" — it still searches everything, and says so when nothing there matched."}
        </p>
      )}
    </section>
  );
};

Shelves.propTypes = {
  shelves: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string,
    label: PropTypes.string,
    passages: PropTypes.number,
    share: PropTypes.number,
    newest: PropTypes.string,
    questions: PropTypes.arrayOf(PropTypes.string),
  })).isRequired,
  types: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
  onAsk: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

Shelves.defaultProps = { disabled: false };

export default Shelves;
