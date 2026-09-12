import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link, useSearchParams } from "react-router-dom";
import { askQuestionStream, getAskInfo } from "../../lib/api/ask";
import { entityLabel } from "../../data/askConfig";
import { colorForTag } from "../../lib/generativeArt";
import { useTagColors } from "../../context/ContentContext";
import useTurnstile from "./useTurnstile";
import AnswerBody from "./AnswerBody";
import AnswerActions from "./AnswerActions";
import { clearThread, loadThread, saveThread } from "./askStorage";

// The one chat component. /ask renders it full-page; AskLauncher renders the
// same thing in a corner panel, so there is exactly one implementation of the
// conversation to keep working.

// Scopes retrieval to one kind of content. The values are entity_type values in
// content_chunks — the RPC already takes a p_types filter.
const TYPE_FILTERS = [
  { id: "book", label: "Books" },
  { id: "microblog", label: "Micro posts" },
  { id: "blog", label: "Blog" },
  { id: "project", label: "Projects" },
  { id: "sport", label: "Races" },
  { id: "trek", label: "Treks" },
];

const SourceCard = ({ source, index, colors }) => {
  const accent = colorForTag(
    source.tags?.[0] || source.entity_type,
    source.tags?.[0] ? colors.get(source.tags[0]) : null,
  );
  return (
    <Link
      to={source.url || "/"}
      className="group flex items-start gap-3 rounded-xl border border-stone-200 dark:border-stone-800 px-3 py-2 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ backgroundColor: accent }}
      >
        {index}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium truncate group-hover:underline">
          {source.title || "Untitled"}
        </span>
        <span className="block text-[11px] text-stone-500 dark:text-stone-400">
          {entityLabel(source.entity_type)}
          {source.date ? ` · ${source.date}` : ""}
        </span>
      </span>
    </Link>
  );
};

SourceCard.propTypes = {
  source: PropTypes.shape({
    entity_type: PropTypes.string,
    title: PropTypes.string,
    url: PropTypes.string,
    date: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  index: PropTypes.number.isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
};

const Bubble = ({ turn, question, colors, onFollowup }) => {
  const mine = turn.role === "user";
  return (
    <div className={`flex flex-col gap-2 ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
          mine
            ? "bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 whitespace-pre-wrap"
            : "bg-stone-100 dark:bg-stone-900"
        }`}
      >
        {mine ? turn.content : <AnswerBody text={turn.content} sources={turn.sources} />}
        {turn.streaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-current animate-pulse" />
        )}
        {turn.streaming && !turn.content && (
          <span className="text-stone-500 dark:text-stone-400">Reading the archive…</span>
        )}
      </div>

      {!!turn.sources?.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
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

      {!mine && !turn.streaming && !!turn.content && (
        <AnswerActions question={question} answer={turn.content} sources={turn.sources || []} />
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

      {turn.note && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-0">{turn.note}</p>
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
    followups: PropTypes.arrayOf(PropTypes.string),
    browse: PropTypes.arrayOf(PropTypes.shape({})),
    sources: PropTypes.arrayOf(PropTypes.shape({})),
  }).isRequired,
  question: PropTypes.string,
  colors: PropTypes.instanceOf(Map).isRequired,
  onFollowup: PropTypes.func.isRequired,
};

Bubble.defaultProps = { question: "" };

const AskChat = ({ compact }) => {
  const [turns, setTurns] = useState(() => loadThread());
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [types, setTypes] = useState([]);
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const sendRef = useRef(null);
  const colors = useTagColors();
  const turnstile = useTurnstile(info?.turnstileSiteKey, info?.turnstileRequired);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    getAskInfo()
      .then((i) => {
        setInfo(i);
        if (!i.enabled) setBlocked(i.note || "The second brain is off right now.");
      })
      .catch(() => setInfo({ maxMessageChars: 500, suggestedQuestions: [] }));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  // The thread outlives a reload for a day. Saved on every change so a crash
  // mid-answer still leaves the question behind.
  useEffect(() => {
    if (turns.length) saveThread(turns);
  }, [turns]);

  // Updates the assistant turn being streamed — always the last one.
  const patchLast = (patch) => setTurns((prev) => {
    const next = [...prev];
    const last = next[next.length - 1];
    if (!last || last.role !== "assistant") return prev;
    next[next.length - 1] = { ...last, ...patch(last) };
    return next;
  });

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const send = async (text) => {
    const message = (text ?? draft).trim();
    if (!message || pending || blocked) return;
    setDraft("");
    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [
      ...prev,
      { role: "user", content: message },
      { role: "assistant", content: "", sources: [], streaming: true },
    ]);
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const done = await askQuestionStream({
        message,
        history,
        types,
        turnstileToken: turnstile.consume(),
        signal: controller.signal,
        onSources: ({ sources, browse }) => patchLast(() => ({
          sources: sources || [],
          browse: browse || [],
        })),
        onDelta: (chunk) => patchLast((last) => ({ content: last.content + chunk })),
      });
      patchLast((last) => ({
        streaming: false,
        followups: done.followups || [],
        // Honest about degradation rather than silently answering worse.
        note: done.degraded
          ? "Answered from search alone — no model was available."
          : null,
        content: last.content,
      }));
    } catch (err) {
      if (err.name === "AbortError") {
        patchLast((last) => ({
          streaming: false,
          content: last.content || "Stopped.",
          note: last.content ? "Stopped." : null,
        }));
      } else {
        if (err.status === 429 || err.status === 503) setBlocked(err.message);
        patchLast(() => ({ streaming: false, content: err.message }));
      }
    } finally {
      abortRef.current = null;
      setPending(false);
    }
  };
  sendRef.current = send;

  // ?q= makes a question shareable: the link lands pre-asked rather than
  // replaying a cached answer, so it always reflects the archive as it is now.
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || turns.length || !info) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      return next;
    }, { replace: true });
    sendRef.current(q);
    // Intentionally keyed on `info` alone — this fires once, when the
    // endpoint's limits are known, and must not re-fire as the thread grows.
  }, [info]);

  const reset = () => {
    stop();
    clearThread();
    setTurns([]);
    setBlocked(null);
  };

  const toggleType = (id) => setTypes((prev) => (
    prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
  ));

  const max = info?.maxMessageChars || 500;
  const suggestions = info?.suggestedQuestions || [];
  // The question each answer belongs to, for its copy / permalink / share row.
  const questionFor = (i) => turns[i - 1]?.content || "";

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 ${compact ? "pr-1" : ""}`}>
        {!turns.length && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-stone-600 dark:text-stone-300 mb-0">
              Ask about the books, races, treks, projects and years of short posts
              on this site. Answers link back to the pages they came from.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-[12px] hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
                >
                  {q}
                </button>
              ))}
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
            onFollowup={send}
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
            {!!turns.length && (
              <button
                type="button"
                onClick={reset}
                className="ml-auto text-[11px] text-stone-500 dark:text-stone-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Only rendered when /admin has verification on; "interaction-only"
              means most visitors never see a challenge. */}
          <div ref={turnstile.containerRef} />

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={draft}
              maxLength={max}
              placeholder="Ask something…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="flex-1 resize-none rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-[14px] focus:outline-none focus:border-stone-400 dark:focus:border-stone-600"
            />
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
                disabled={!draft.trim() || !turnstile.ready}
                className="rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2 text-[13px] font-medium disabled:opacity-40"
              >
                Ask
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

AskChat.propTypes = { compact: PropTypes.bool };
AskChat.defaultProps = { compact: false };

export default AskChat;
