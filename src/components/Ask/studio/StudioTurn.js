import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import AnswerBody, { MediaStrip } from "../AnswerBody";
import AnswerActions from "../AnswerActions";
import SourceCard from "../SourceCard";
import { hasInlineImage } from "../../../lib/askFormat";
import { entityLabel } from "../../../data/askConfig";

// One turn of the /ask thread. A question is set as a heading the reader can
// jump back to; an answer shows what retrieval is doing while it works, then
// the answer with hover cards on its [n] markers, then what to do next.

// The three things the endpoint actually reports, in the order it reports
// them: the request is out, the sources are back, the words are arriving.
const STEPS = [
  { id: "search", label: "Searching words and meaning" },
  { id: "read", label: "Reading the sources" },
  { id: "write", label: "Writing" },
];

export const Progress = ({ phase, sources }) => {
  const at = STEPS.findIndex((s) => s.id === phase);
  return (
    <ol className="ask-steps" aria-live="polite">
      {STEPS.map((s, i) => {
        let state = "next";
        if (i < at) state = "done";
        else if (i === at) state = "now";
        const label = s.id === "read" && i <= at && sources
          ? `Read ${sources} source${sources === 1 ? "" : "s"}`
          : s.label;
        return (
          <li key={s.id} className={`ask-step ask-step--${state}`}>
            <span className="ask-step__dot" aria-hidden="true" />
            {label}
          </li>
        );
      })}
    </ol>
  );
};

Progress.propTypes = { phase: PropTypes.string.isRequired, sources: PropTypes.number };
Progress.defaultProps = { sources: 0 };

const StudioTurn = ({
  turn, index, number, question, phase, colors, active, hoverCite,
  onShowSources, onFollowup, onRetry, onFeedback, onShareThread, shareStatus,
}) => {
  if (turn.role === "user") {
    return (
      <h2 id={`ask-turn-${index}`} data-turn={index} className="ask-q">
        <span className="ask-q__num" aria-hidden="true">{number}</span>
        <span className="min-w-0">{turn.content}</span>
      </h2>
    );
  }

  const sources = turn.sources || [];
  const kinds = [...new Set(sources.map((s) => entityLabel(s.entity_type)))];
  const done = !turn.streaming;

  return (
    <section
      data-turn={index}
      className={`ask-a ${active ? "ask-a--active" : ""}`}
      aria-label={`Answer ${number}`}
    >
      {phase && <Progress phase={phase} sources={sources.length} />}

      {(turn.content || done) && (
        <div className="ask-a__body">
          <AnswerBody text={turn.content} sources={sources} linkable={turn.linkable} previews />
          {turn.streaming && turn.content && <span className="ask-caret" aria-hidden="true" />}
        </div>
      )}

      {!!sources.length && (
        <div className="ask-a__sources">
          <button
            type="button"
            onClick={onShowSources}
            className="ask-a__sources-head"
            aria-label={`Show the ${sources.length} sources beside the thread`}
          >
            {`${sources.length} source${sources.length === 1 ? "" : "s"}`}
            {kinds.length ? ` · ${kinds.slice(0, 3).join(", ")}${kinds.length > 3 ? "…" : ""}` : ""}
            <span className="ask-only-rail" aria-hidden="true">{active ? " · shown →" : " · show →"}</span>
          </button>
          {/* Without the rail beside the thread, the cards sit under the answer. */}
          <div className="ask-a__cards grid grid-cols-[repeat(auto-fill,minmax(min(15rem,100%),1fr))] gap-2">
            {sources.map((s, i) => (
              <SourceCard
                key={`${s.entity_type}-${s.entity_id}`}
                source={s}
                index={i + 1}
                colors={colors}
                active={active && hoverCite === i + 1}
              />
            ))}
          </div>
        </div>
      )}

      {done && !!turn.browse?.length && (
        <p className="text-[12px] text-stone-500 dark:text-stone-400 m-0">
          {"Browse everything: "}
          {turn.browse.map((b, i) => (
            <React.Fragment key={b.type}>
              {i > 0 && " · "}
              <Link to={b.url} className="underline underline-offset-2">{b.label}</Link>
            </React.Fragment>
          ))}
        </p>
      )}

      {done && !!turn.media?.length && !hasInlineImage(turn.content) && (
        <MediaStrip media={turn.media} />
      )}

      {done && !!turn.content && !turn.retry && (
        <AnswerActions
          question={question}
          answer={turn.content}
          sources={sources}
          messageId={turn.messageId || null}
          feedback={turn.feedback || null}
          onFeedback={onFeedback}
          onShareThread={onShareThread}
          shareStatus={shareStatus}
        />
      )}

      {done && turn.retry && onRetry && (
        <button type="button" onClick={() => onRetry(turn.retry)} className="ask-btn ask-btn--ghost self-start">
          Verify and retry
        </button>
      )}

      {done && turn.widened && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 m-0">
          {`Searched everything — nothing in ${turn.scope} matched.`}
        </p>
      )}

      {turn.note && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 m-0">{turn.note}</p>
      )}

      {done && !!turn.followups?.length && (
        <div className="ask-followups">
          <p className="ask-followups__head">Keep pulling the thread</p>
          <ul className="list-none p-0 m-0">
            {turn.followups.map((q) => (
              <li key={q}>
                <button type="button" onClick={() => onFollowup(q)} className="ask-followup">
                  <span aria-hidden="true">↳</span>
                  <span>{q}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

StudioTurn.propTypes = {
  turn: PropTypes.shape({
    role: PropTypes.string,
    content: PropTypes.string,
    streaming: PropTypes.bool,
    sources: PropTypes.arrayOf(PropTypes.shape({})),
    linkable: PropTypes.arrayOf(PropTypes.string),
    browse: PropTypes.arrayOf(PropTypes.shape({})),
    media: PropTypes.arrayOf(PropTypes.shape({})),
    followups: PropTypes.arrayOf(PropTypes.string),
    retry: PropTypes.string,
    widened: PropTypes.bool,
    scope: PropTypes.string,
    note: PropTypes.string,
    messageId: PropTypes.string,
    feedback: PropTypes.shape({}),
  }).isRequired,
  index: PropTypes.number.isRequired,
  number: PropTypes.number.isRequired,
  question: PropTypes.string,
  phase: PropTypes.string,
  colors: PropTypes.instanceOf(Map).isRequired,
  active: PropTypes.bool,
  hoverCite: PropTypes.number,
  onShowSources: PropTypes.func,
  onFollowup: PropTypes.func.isRequired,
  onRetry: PropTypes.func,
  onFeedback: PropTypes.func,
  onShareThread: PropTypes.func,
  shareStatus: PropTypes.string,
};

StudioTurn.defaultProps = {
  question: "",
  phase: null,
  active: false,
  hoverCite: null,
  onShowSources: () => {},
  onRetry: null,
  onFeedback: () => {},
  onShareThread: null,
  shareStatus: null,
};

export default StudioTurn;
