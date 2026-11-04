import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { askQuestionStream, getAskInfo } from "../../lib/api/ask";
import useTurnstile from "./useTurnstile";
import useVoiceCapture from "./useVoiceCapture";
import { clearThread, loadThread, saveThread } from "./askStorage";
import { matchQuestions, pickQuestions } from "../../lib/askQuestions";
import useShareThread from "./useShareThread";

// The conversation itself — thread, streaming, quota, verification, voice,
// sharing — with no markup. AskChat (the launcher panel and pinned page chats)
// and AskStudio (the /ask page) both render from this, so there is exactly one
// implementation of the conversation to keep working however many ways it is
// drawn.

const VERIFY_FAILED = "Could not confirm this browser is not a bot — the check expired or was blocked by an extension.";

// What to say under an answer that did not run at full strength. Degraded is
// the louder of the two, so it wins when both are true.
function noteFor(done) {
  if (done?.degraded) return "Answered from search alone — no model was available.";
  if (done?.keywordOnly) return "Matched on words only — the meaning search was unavailable.";
  return null;
}

/**
 * Where the newest answer is, for a progress line that reports what actually
 * happened rather than a spinner: the request is out, the sources are back,
 * the words are arriving. Null when nothing is in flight.
 */
export function phaseOf(turn) {
  if (!turn || turn.role !== "assistant" || !turn.streaming) return null;
  if (turn.content) return "write";
  if (turn.sourcesIn) return "read";
  return "search";
}

// `focus` pins one page into every question (a newsletter issue asking about
// itself); such a thread is about that page only, so it is neither restored
// from nor saved over the site-wide thread. `starters` replaces the drawn chips.
// `follow` keeps the newest words in view as they stream — right for a panel
// that scrolls itself; the /ask page scrolls to each new question instead and
// leaves the reader where they are.
export default function useAskConversation({
  focus = null, starters: givenStarters = null, chipCount = 4, follow = true,
} = {}) {
  const [turns, setTurns] = useState(() => (focus ? [] : loadThread()));
  const [draft, setDraftRaw] = useState("");
  // Whisper's detected language for the current draft, when it was spoken.
  // Cleared the moment the draft is typed over: it describes this text only.
  const [spokenLanguage, setSpokenLanguage] = useState(null);
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [types, setTypes] = useState([]);
  // Drawn once per mount, never in render: sampling inline would reshuffle the
  // chips on every keystroke, under the reader's cursor.
  const [starters, setStarters] = useState([]);
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const sendRef = useRef(null);
  const turnstile = useTurnstile(info?.turnstileSiteKey, info?.turnstileRequired);
  const voice = useVoiceCapture({
    onTranscript: (text, language) => {
      // Into the box, never into a question. The visitor edits and presses
      // Ask — a misheard sentence must cost a keystroke, not an answer.
      setDraftRaw((prev) => (prev ? `${prev} ${text}` : text));
      setSpokenLanguage(language);
    },
    getTurnstileToken: () => (info?.turnstileRequired ? turnstile.take() : undefined),
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const shareThread = useShareThread();

  // Typing over a spoken draft makes it a typed one.
  const setDraft = (value) => {
    setDraftRaw(value);
    setSpokenLanguage(null);
  };

  // Autocomplete over the same pool the chips are drawn from. Derived in
  // render rather than held in state: it is a function of the draft, and a
  // second copy of it would be a second thing to keep in step.
  const matches = pending ? [] : matchQuestions(info?.questionPool, draft);

  // One draw per page load, from a pool of ~30 across six subjects. A returning
  // visitor gets a different set, and never all about the same thing.
  const drawStarters = (i) => {
    if (givenStarters?.length) {
      setStarters(givenStarters.slice(0, chipCount));
      return;
    }
    const drawn = pickQuestions(i?.questionPool, chipCount);
    // An empty or unseeded pool falls back to the fixed list rather than to
    // nothing — a blank empty state reads as a broken page.
    setStarters(drawn.length ? drawn : (i?.suggestedQuestions || []).slice(0, chipCount));
  };

  useEffect(() => {
    getAskInfo()
      .then((i) => {
        setInfo(i);
        drawStarters(i);
        if (!i.enabled) setBlocked(i.note || "The second brain is off right now.");
      })
      .catch(() => {
        setInfo({ maxMessageChars: 500, suggestedQuestions: [] });
        // A page's own starters (focus) do not depend on the endpoint's pool.
        drawStarters({});
      });
    // Intentionally mount-only: re-running this would redraw the chips while
    // someone is reading them.
  }, []);

  // Follows the conversation, never an empty chat: this effect also runs on
  // mount, and a chat embedded at the foot of a page (a newsletter issue) would
  // otherwise drag the window to the bottom before anyone has read the top.
  useEffect(() => {
    if (!follow || !turns.length) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  // The thread outlives a reload for a day. Saved on every change so a crash
  // mid-answer still leaves the question behind.
  useEffect(() => {
    if (turns.length && !focus) saveThread(turns);
  }, [turns, focus]);

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

  // `scope` overrides the chips for this one question — `setTypes` does not
  // reach the `types` this closure captured, so a follow-up has to say so here.
  const send = async (text, { replaceFailed = false, scope } = {}) => {
    const askTypes = scope ?? types;
    const message = (text ?? draft).trim();
    if (!message || pending || blocked) return;
    setDraft("");
    // A retry replaces the failed question/answer pair rather than stacking a copy.
    const base = replaceFailed ? turns.slice(0, -2) : turns;
    const history = base.map((t) => ({ role: t.role, content: t.content }));
    setTurns([
      ...base,
      { role: "user", content: message },
      { role: "assistant", content: "", sources: [], streaming: true },
    ]);
    // The stored snapshot is of the thread as it was; another turn makes it
    // stale, so the next Share creates a new one rather than re-sending a link
    // to half the conversation.
    shareThread.reset();
    setPending(true);

    // Chips, follow-ups and ?q= links can fire before the widget has solved;
    // wait for a token instead of sending none and taking a 403.
    let turnstileToken;
    if (info?.turnstileRequired) {
      turnstileToken = await turnstile.take();
      if (!turnstileToken) {
        patchLast(() => ({ streaming: false, content: VERIFY_FAILED, retry: message }));
        setPending(false);
        return;
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const done = await askQuestionStream({
        message,
        history,
        types: askTypes,
        spokenLanguage,
        focus,
        turnstileToken,
        signal: controller.signal,
        onSources: (event) => patchLast(() => ({
          sources: event.sources || [],
          browse: event.browse || [],
          linkable: event.linkable || [],
          widened: !!event.widened,
          scope: event.scope || "",
          sourcesIn: true,
        })),
        onDelta: (chunk) => patchLast((last) => ({ content: last.content + chunk })),
      });
      patchLast((last) => ({
        streaming: false,
        followups: done.followups || [],
        // Honest about degradation rather than silently answering worse.
        // keywordOnly means the embedding call failed, so only the half of
        // retrieval that matches words ran, not the half that matches meaning.
        note: noteFor(done),
        // The worker re-sends the finished answer cleaned (links and images
        // checked against the sources); prefer it over the raw streamed text.
        content: done.answer ?? last.content,
        media: done.media || [],
        messageId: done.messageId || null,
        linkable: done.linkable || last.linkable || [],
        widened: done.widened ?? last.widened ?? false,
        scope: done.scope || last.scope || "",
      }));
    } catch (err) {
      if (err.name === "AbortError") {
        patchLast((last) => ({
          streaming: false,
          content: last.content || "Stopped.",
          note: last.content ? "Stopped." : null,
        }));
      } else if (err.status === 403) {
        turnstile.refresh();
        patchLast(() => ({ streaming: false, content: VERIFY_FAILED, retry: message }));
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

  // Follow-ups name things the last answer already showed. Leaving a chip on
  // would scope the search away from exactly what was just offered.
  const askFollowup = (question) => {
    setTypes([]);
    send(question, { scope: [] });
  };

  const retry = (message) => {
    turnstile.refresh();
    send(message, { replaceFailed: true });
  };

  // Kept on the turn itself, so a reload restores the reader's verdict.
  const setFeedback = (index, feedback) => setTurns((prev) => prev.map(
    (t, j) => (j === index ? { ...t, feedback } : t),
  ));

  // ?q= makes a question shareable: the link lands pre-asked rather than
  // replaying a cached answer, so it always reflects the archive as it is now.
  useEffect(() => {
    const q = searchParams.get("q");
    // A focused chat leaves ?q= to the site-wide one, which owns shared links.
    if (!q || focus || turns.length || !info) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("q");
        return next;
      },
      { replace: true },
    );
    sendRef.current(q);
    // Intentionally keyed on `info` alone — this fires once, when the
    // endpoint's limits are known, and must not re-fire as the thread grows.
  }, [info]);

  const reset = () => {
    stop();
    if (!focus) clearThread();
    setTurns([]);
    setBlocked(null);
    // The chips used to survive a clear, so the next question was silently
    // scoped by a filter the reader thought they had just dismissed.
    setTypes([]);
    shareThread.reset();
  };

  const toggleType = (id) => setTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const shareable = turns.some((t) => t.role === "assistant" && !t.streaming && t.content);
  const doShare = () => shareThread.share({ turns, types, turnstileToken: undefined });

  return {
    turns,
    draft,
    setDraft,
    pending,
    info,
    blocked,
    types,
    setTypes,
    toggleType,
    starters,
    drawStarters: () => drawStarters(info),
    matches,
    send,
    stop,
    retry,
    askFollowup,
    setFeedback,
    reset,
    shareable,
    doShare,
    shareThread,
    turnstile,
    voice,
    endRef,
    max: info?.maxMessageChars || 500,
    phase: phaseOf(turns[turns.length - 1]),
    // The question each answer belongs to, for its copy / permalink / share row.
    questionFor: (i) => turns[i - 1]?.content || "",
  };
}
