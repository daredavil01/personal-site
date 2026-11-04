import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTagColors } from "../../context/ContentContext";
import AnswerBody, { MediaStrip } from "./AnswerBody";
import { hasInlineImage } from "../../lib/askFormat";
import AnswerActions from "./AnswerActions";
import SourceCard from "./SourceCard";
import useAskConversation from "./useAskConversation";
import { SHARE_LABELS, TYPE_FILTERS } from "./askUi";

// The corner launcher's chat, and the chat a page pins to itself. The
// conversation lives in useAskConversation; /ask draws the same one as
// AskStudio, so there is still exactly one implementation to keep working.

const Bubble = ({
  turn, question, colors, onFollowup, onRetry, onFeedback, onShareThread, shareStatus,
}) => {
  const mine = turn.role === "user";
  return (
    <div
      className={`flex flex-col gap-2 ${mine ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
          mine
            ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 whitespace-pre-wrap"
            : "bg-stone-100 dark:bg-stone-900"
        }`}
      >
        {mine ? (
          turn.content
        ) : (
          <AnswerBody text={turn.content} sources={turn.sources} linkable={turn.linkable} />
        )}
        {turn.streaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-current animate-pulse" />
        )}
        {turn.streaming && !turn.content && (
          <span className="text-stone-500 dark:text-stone-400">
            Reading the archive…
          </span>
        )}
      </div>

      {!!turn.sources?.length && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-2 w-full">
          {turn.sources.map((s, i) => (
            <SourceCard
              key={`${s.entity_type}-${s.entity_id}`}
              source={s}
              index={i + 1}
              colors={colors}
            />
          ))}
        </div>
      )}

      {!mine && !!turn.browse?.length && (
        <p className="text-[12px] text-stone-500 dark:text-stone-400 mb-0">
          {"Browse everything: "}
          {turn.browse.map((b, i) => (
            <React.Fragment key={b.type}>
              {i > 0 && " · "}
              <Link to={b.url} className="underline underline-offset-2">
                {b.label}
              </Link>
            </React.Fragment>
          ))}
        </p>
      )}

      {!mine && !turn.streaming && !!turn.media?.length && !hasInlineImage(turn.content) && (
        <MediaStrip media={turn.media} />
      )}

      {!mine && !turn.streaming && !!turn.content && !turn.retry && (
        <AnswerActions
          question={question}
          answer={turn.content}
          sources={turn.sources || []}
          messageId={turn.messageId || null}
          feedback={turn.feedback || null}
          onFeedback={onFeedback || (() => {})}
          onShareThread={onShareThread}
          shareStatus={shareStatus}
        />
      )}

      {!mine && !turn.streaming && !!turn.followups?.length && (
        <div className="flex flex-wrap gap-2">
          {turn.followups.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onFollowup(q)}
              className="rounded-full border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-[12px] hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {!mine && !turn.streaming && turn.retry && onRetry && (
        <button
          type="button"
          onClick={() => onRetry(turn.retry)}
          className="rounded-full border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-[12px] font-medium hover:border-stone-500 dark:hover:border-stone-500 transition-colors"
        >
          Verify and retry
        </button>
      )}

      {!mine && !turn.streaming && turn.widened && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0">
          {`Searched everything — nothing in ${turn.scope} matched.`}
        </p>
      )}

      {turn.note && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0">
          {turn.note}
        </p>
      )}
    </div>
  );
};

Bubble.propTypes = {
  turn: PropTypes.shape({
    role: PropTypes.string,
    content: PropTypes.string,
    note: PropTypes.string,
    streaming: PropTypes.bool,
    widened: PropTypes.bool,
    scope: PropTypes.string,
    linkable: PropTypes.arrayOf(PropTypes.string),
    followups: PropTypes.arrayOf(PropTypes.string),
    browse: PropTypes.arrayOf(PropTypes.shape({})),
    sources: PropTypes.arrayOf(PropTypes.shape({})),
  }).isRequired,
  question: PropTypes.string,
  colors: PropTypes.instanceOf(Map).isRequired,
  onFollowup: PropTypes.func.isRequired,
  onRetry: PropTypes.func,
  onFeedback: PropTypes.func,
  onShareThread: PropTypes.func,
  shareStatus: PropTypes.string,
};

Bubble.defaultProps = {
  question: "", onRetry: null, onFeedback: null, onShareThread: null, shareStatus: null,
};

const CHIP_COUNT = { page: 4, compact: 3 };

// The launcher panel and the chats pinned to a page (a newsletter issue). The
// /ask page draws the same conversation as AskStudio.
const AskChat = ({ compact, focus, starters: givenStarters }) => {
  const colors = useTagColors();
  const {
    turns, draft, setDraft, pending, info, blocked, types, toggleType,
    starters, drawStarters, matches, send, stop, retry, askFollowup,
    setFeedback, reset, shareable, doShare, shareThread, turnstile, voice,
    endRef, max, questionFor,
  } = useAskConversation({
    focus,
    starters: givenStarters,
    chipCount: compact ? CHIP_COUNT.compact : CHIP_COUNT.page,
  });

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div
        className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 ${compact ? "pr-1" : ""}`}
      >
        {!turns.length && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-stone-600 dark:text-stone-300 mb-0">
              Ask about the books, races, treks, projects and years of short
              posts on this site. Answers link back to the pages they came from.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {starters.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-[12px] hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
                >
                  {q}
                </button>
              ))}
              {/* Re-rolls without a reload — "none of these interest me" should
                  cost a click, not a refresh. */}
              {starters.length > 1 && (
                <button
                  type="button"
                  onClick={drawStarters}
                  className="text-[12px] text-stone-500 dark:text-stone-400 hover:underline px-1"
                >
                  Try others ↻
                </button>
              )}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          // Turns are append-only and never reordered, so index is a stable key.
          // eslint-disable-next-line react/no-array-index-key
          <Bubble
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            turn={turn}
            question={questionFor(i)}
            colors={colors}
            onFollowup={askFollowup}
            onFeedback={(feedback) => setFeedback(i, feedback)}
            // Only the newest answer offers it: it shares the whole thread, and
            // an older one would imply it shares up to that point.
            onShareThread={i === turns.length - 1 ? doShare : null}
            shareStatus={i === turns.length - 1 ? shareThread.status : null}
            // Only the newest turn can retry: a retry replaces the last pair.
            onRetry={i === turns.length - 1 ? retry : null}
          />
        ))}

        <div ref={endRef} />
      </div>

      {blocked ? (
        <p className="rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2.5 text-[13px] text-stone-600 dark:text-stone-300 mb-0">
          {blocked}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleType(f.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  types.includes(f.id)
                    ? "border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                    : "border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600"
                }`}
              >
                {f.label}
              </button>
            ))}
            {shareable && (
              <button
                type="button"
                onClick={doShare}
                disabled={shareThread.status === "sharing"}
                className="ml-auto text-[11px] text-stone-500 dark:text-stone-400 hover:underline disabled:opacity-50"
              >
                {SHARE_LABELS[shareThread.status] || "Share conversation"}
              </button>
            )}
            {!!turns.length && (
              <button
                type="button"
                onClick={reset}
                className={`${shareable ? "" : "ml-auto "}text-[11px] text-stone-500 dark:text-stone-400 hover:underline`}
              >
                Clear
              </button>
            )}
          </div>

          {shareThread.note && (
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0 break-all">
              {shareThread.note}
            </p>
          )}

          {/* Only rendered when /admin has verification on; "interaction-only"
              means most visitors never see a challenge. */}
          <div ref={turnstile.containerRef} />

          {matches.length > 0 && (
            <ul className="list-none pl-0 mb-2 flex flex-wrap gap-1.5">
              {matches.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    // Fills the box, never sends. Same rule the microphone
                    // follows: the visitor presses Ask.
                    onClick={() => setDraft(q)}
                    className="rounded-full border border-stone-200 dark:border-stone-800 px-3 py-1 text-[12px] text-stone-600 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-600"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={draft}
              maxLength={max}
              placeholder="Ask something…"
              aria-label="Ask the archive a question"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="flex-1 resize-none rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-[14px] focus:outline-none focus:border-stone-400 dark:focus:border-stone-600"
            />
            {voice.supported && info?.voiceInput && !pending && (
              <button
                type="button"
                onClick={voice.toggle}
                disabled={voice.busy}
                title={voice.recording ? "Stop recording" : "Ask by voice — the audio is not stored"}
                aria-label={voice.recording ? "Stop recording" : "Ask by voice"}
                className={`rounded-xl border px-3 py-2 text-[13px] font-medium ${
                  voice.recording
                    ? "border-red-400 text-red-500"
                    : "border-stone-300 dark:border-stone-700"
                } disabled:opacity-40`}
              >
                {voice.busy ? "…" : "🎙"}
              </button>
            )}
            {pending ? (
              <button
                type="button"
                onClick={stop}
                className="rounded-xl border border-stone-300 dark:border-stone-700 px-4 py-2 text-[13px] font-medium"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-[13px] font-medium disabled:opacity-40"
              >
                Ask
              </button>
            )}
          </div>

          {voice.supported && info?.voiceInput && (
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-2 mb-0">
              {voice.error || "Voice: the recording is transcribed and discarded — nothing is stored, and nothing sends until you press Ask."}
            </p>
          )}
        </form>
      )}
    </div>
  );
};

AskChat.propTypes = {
  compact: PropTypes.bool,
  focus: PropTypes.shape({
    type: PropTypes.string.isRequired,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    refs: PropTypes.arrayOf(PropTypes.shape({ type: PropTypes.string, id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) })),
  }),
  starters: PropTypes.arrayOf(PropTypes.string),
};
AskChat.defaultProps = { compact: false, focus: null, starters: null };

export default AskChat;
