import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

// The /ask question box. One instance for the life of the page: it is the
// hero's search box before the first question and the dock under the thread
// after it, re-styled rather than re-mounted, because the Turnstile widget
// lives inside it and would be lost on a remount.

const TYPE_MS = 45;
const HOLD_MS = 2200;

/**
 * Types the pool's questions into the placeholder one after another, so the
 * empty box shows what it can be asked. Static (the first line) when the
 * reader prefers reduced motion, and paused while the box is focused or full.
 */
function useTypewriter(lines, active) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!lines.length) return undefined;
    const still = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still || !active) {
      setText(lines[0]);
      return undefined;
    }
    let line = 0;
    let at = 0;
    let timer;
    const tick = () => {
      const full = lines[line % lines.length];
      at += 1;
      setText(full.slice(0, at));
      if (at >= full.length) {
        line += 1;
        at = 0;
        timer = setTimeout(tick, HOLD_MS);
      } else {
        timer = setTimeout(tick, TYPE_MS);
      }
    };
    timer = setTimeout(tick, TYPE_MS);
    return () => clearTimeout(timer);
  }, [lines.join("\n"), active]);
  return text;
}

const Composer = ({
  conv, docked, inputRef, placeholderLines, toolbar,
}) => {
  const [focused, setFocused] = useState(false);
  const {
    draft, setDraft, send, stop, pending, matches, max, voice, info, turnstile,
  } = conv;
  const typed = useTypewriter(placeholderLines, !docked && !focused && !draft);
  const placeholder = docked ? "Ask a follow-up…" : (typed || "Ask something…");
  const voiceOn = voice.supported && info?.voiceInput;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className={`ask-composer ${docked ? "ask-composer--dock" : "ask-composer--hero"}`}
    >
      {toolbar}

      {/* Only rendered when /admin has verification on; "interaction-only"
          means most visitors never see a challenge. */}
      <div ref={turnstile.containerRef} />

      {matches.length > 0 && (
        <ul className="list-none pl-0 m-0 flex flex-wrap gap-1.5" aria-label="Questions like yours">
          {matches.map((q) => (
            <li key={q}>
              <button
                type="button"
                // Fills the box, never sends. Same rule the microphone
                // follows: the visitor presses Ask.
                onClick={() => setDraft(q)}
                className="ask-pill"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="ask-composer__box">
        <textarea
          ref={inputRef}
          rows={docked ? 1 : 2}
          value={draft}
          maxLength={max}
          placeholder={placeholder}
          aria-label="Ask the archive a question"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="ask-composer__input"
        />
        <div className="ask-composer__actions">
          {!docked && !draft && (
            <kbd className="ask-kbd hidden md:inline-flex" title="Press / to type a question">/</kbd>
          )}
          {draft.length > max * 0.8 && (
            <span className="text-[11px] tabular-nums text-stone-500 dark:text-stone-400">
              {`${draft.length}/${max}`}
            </span>
          )}
          {voiceOn && !pending && (
            <button
              type="button"
              onClick={voice.toggle}
              disabled={voice.busy}
              title={voice.recording ? "Stop recording" : "Ask by voice — the audio is not stored"}
              aria-label={voice.recording ? "Stop recording" : "Ask by voice"}
              className={`ask-icon-btn ${voice.recording ? "ask-icon-btn--rec" : ""}`}
            >
              {voice.busy ? "…" : "🎙"}
            </button>
          )}
          {pending ? (
            <button type="button" onClick={stop} className="ask-btn ask-btn--ghost">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!draft.trim()} className="ask-btn">
              Ask
              <span aria-hidden="true">↵</span>
            </button>
          )}
        </div>
      </div>

      {voiceOn && (voice.error || !docked) && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 m-0">
          {voice.error || "Voice: the recording is transcribed and discarded — nothing is stored, and nothing sends until you press Ask."}
        </p>
      )}
    </form>
  );
};

Composer.propTypes = {
  conv: PropTypes.shape({
    draft: PropTypes.string,
    setDraft: PropTypes.func,
    send: PropTypes.func,
    stop: PropTypes.func,
    pending: PropTypes.bool,
    matches: PropTypes.arrayOf(PropTypes.string),
    max: PropTypes.number,
    voice: PropTypes.shape({}),
    info: PropTypes.shape({}),
    turnstile: PropTypes.shape({}),
  }).isRequired,
  docked: PropTypes.bool,
  inputRef: PropTypes.shape({ current: PropTypes.instanceOf(typeof Element === "undefined" ? Object : Element) }),
  placeholderLines: PropTypes.arrayOf(PropTypes.string),
  toolbar: PropTypes.node,
};

Composer.defaultProps = {
  docked: false, inputRef: null, placeholderLines: [], toolbar: null,
};

export default Composer;
