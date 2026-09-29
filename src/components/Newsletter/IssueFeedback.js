import React, {
  useCallback, useEffect, useState,
} from "react";
import PropTypes from "prop-types";
import { REACTIONS } from "../../lib/newsletterIssue";
import { getFeedbackSummary, sendFeedback } from "../../lib/api/newsletter";
import { getAskInfo } from "../../lib/api/ask";
import useTurnstile from "../Ask/useTurnstile";

// Reader feedback on an issue: a reaction per section, the month's poll, a
// 1–5 rating with a favourite section, and a private reply. Everything is
// anonymous. What this browser already did is remembered locally so the
// buttons show it — that is a courtesy, not the limit; the server's per-visitor
// cap and one-vote-per-visitor rule (0032) are.

const storeKey = (id) => `newsletter.feedback.${id}`;

const readMine = (id) => {
  try {
    return JSON.parse(window.localStorage.getItem(storeKey(id))) || {};
  } catch (_) {
    return {};
  }
};

const writeMine = (id, mine) => {
  try {
    window.localStorage.setItem(storeKey(id), JSON.stringify(mine));
  } catch (_) {
    // Private mode or blocked storage: the buttons just will not remember.
  }
};

export function useIssueFeedback(issueId, enabled) {
  const [summary, setSummary] = useState(null);
  const [mine, setMine] = useState(() => readMine(issueId));
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [info, setInfo] = useState(null);
  const turnstile = useTurnstile(info?.turnstileSiteKey, info?.turnstileRequired);

  useEffect(() => {
    setMine(readMine(issueId));
    setSummary(null);
    if (!enabled) return;
    getFeedbackSummary(issueId).then(setSummary).catch(() => setSummary({}));
    getAskInfo().then(setInfo).catch(() => setInfo({}));
  }, [issueId, enabled]);

  const remember = useCallback((patch) => setMine((prev) => {
    const next = { ...prev, ...patch };
    writeMine(issueId, next);
    return next;
  }), [issueId]);

  const send = useCallback(async (body, tag) => {
    setPending(tag);
    setError(null);
    try {
      const turnstileToken = info?.turnstileRequired ? await turnstile.take() : undefined;
      const next = await sendFeedback({ issueId, turnstileToken, ...body });
      setSummary(next);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setPending(null);
    }
  }, [issueId, info, turnstile]);

  return {
    summary, mine, remember, send, error, pending, turnstileRef: turnstile.containerRef,
  };
}

// border-solid: the atlas button reset sets `border: 0`, which clears the style too.
const chip = (on) => `inline-flex items-center gap-1.5 rounded-full border border-solid px-3 py-1.5 font-label text-xs transition-colors ${
  on
    ? "border-secondary bg-secondary/[0.08] text-secondary"
    : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-secondary/60"
}`;

/** The four reactions under one section, with counts. */
export const SectionReactions = ({ sectionKey, fb }) => {
  const counts = fb.summary?.reactions?.[sectionKey] || {};
  const given = fb.mine.reactions?.[sectionKey] || [];
  const react = async (key) => {
    if (given.includes(key)) return;
    const ok = await fb.send({ kind: "reaction", section: sectionKey, value: key }, `r-${sectionKey}`);
    if (ok) fb.remember({ reactions: { ...(fb.mine.reactions || {}), [sectionKey]: [...given, key] } });
  };
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="React to this section">
      {REACTIONS.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => react(r.key)}
          disabled={fb.pending === `r-${sectionKey}`}
          aria-pressed={given.includes(r.key)}
          title={r.label}
          className={chip(given.includes(r.key))}
        >
          <span aria-hidden="true">{r.emoji}</span>
          <span className="sr-only">{r.label}</span>
          {counts[r.key] ? <span>{counts[r.key]}</span> : null}
        </button>
      ))}
    </div>
  );
};

SectionReactions.propTypes = {
  sectionKey: PropTypes.string.isRequired,
  fb: PropTypes.shape({}).isRequired,
};

const Block = ({ title, children }) => (
  <div className="flex flex-col gap-3">
    <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold mb-0">{title}</p>
    {children}
  </div>
);

Block.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

const Poll = ({ poll, fb }) => {
  const votes = fb.summary?.poll || {};
  const total = Object.values(votes).reduce((a, b) => a + Number(b), 0);
  const voted = fb.mine.poll;
  const vote = async (i) => {
    const ok = await fb.send({ kind: "poll", value: String(i) }, "poll");
    if (ok) fb.remember({ poll: i });
  };
  return (
    <Block title="This month's question">
      <p className="font-headline text-xl font-bold text-stone-900 dark:text-stone-100 mb-0">{poll.q}</p>
      <div className="flex flex-col gap-2">
        {poll.options.map((option, i) => {
          const n = Number(votes[i] || 0);
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <button
              // eslint-disable-next-line react/no-array-index-key -- the index IS the vote value
              key={i}
              type="button"
              onClick={() => vote(i)}
              disabled={fb.pending === "poll"}
              aria-pressed={voted === i}
              className={`relative flex w-full justify-start overflow-hidden text-left rounded-lg border border-solid px-4 py-2.5 font-body text-sm transition-colors ${
                voted === i ? "border-secondary" : "border-stone-200 dark:border-stone-700 hover:border-secondary/60"
              }`}
            >
              {voted != null && (
                <span className="absolute inset-y-0 left-0 bg-secondary/[0.1]" style={{ width: `${pct}%` }} aria-hidden="true" />
              )}
              <span className="relative flex w-full justify-between gap-4 text-stone-800 dark:text-stone-200">
                <span>{option}</span>
                {voted != null && <span className="font-label text-xs text-stone-500">{`${pct}%`}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="font-label text-[11px] text-stone-400 mb-0">
        {voted != null ? `${total} ${total === 1 ? "vote" : "votes"} so far — the result goes in next month's letter.` : "Vote to see the results."}
      </p>
    </Block>
  );
};

Poll.propTypes = {
  poll: PropTypes.shape({ q: PropTypes.string, options: PropTypes.arrayOf(PropTypes.string) }).isRequired,
  fb: PropTypes.shape({}).isRequired,
};

const Rating = ({ sections, fb }) => {
  const [stars, setStars] = useState(fb.mine.rating || 0);
  const [pick, setPick] = useState(fb.mine.pick || null);
  const done = !!fb.mine.rating;
  const submit = async () => {
    const ok = await fb.send({ kind: "rating", value: String(stars), section: pick }, "rating");
    if (ok) fb.remember({ rating: stars, pick });
  };
  const rating = fb.summary?.rating;
  return (
    <Block title="How was this letter?">
      <div className="flex gap-1" role="radiogroup" aria-label="Rating out of five">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} of 5`}
            onClick={() => setStars(n)}
            className={`text-2xl leading-none transition-transform hover:scale-110 ${n <= stars ? "text-amber-500" : "text-stone-300 dark:text-stone-700"}`}
          >
            ★
          </button>
        ))}
      </div>
      <p className="font-body text-sm text-stone-600 dark:text-stone-400 mb-0">The part worth reading was…</p>
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button key={s.key} type="button" onClick={() => setPick(s.key)} aria-pressed={pick === s.key} className={chip(pick === s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!stars || fb.pending === "rating"}
          className="rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 font-label text-xs uppercase tracking-widest font-bold disabled:opacity-40"
        >
          {done ? "Update" : "Send"}
        </button>
        {rating?.n > 0 && (
          <span className="font-label text-[11px] text-stone-400">{`${rating.avg} ★ from ${rating.n} ${rating.n === 1 ? "reader" : "readers"}`}</span>
        )}
      </div>
    </Block>
  );
};

Rating.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string })).isRequired,
  fb: PropTypes.shape({}).isRequired,
};

const Reply = ({ fb }) => {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const ok = await fb.send({ kind: "reply", message, name }, "reply");
    if (ok) {
      setSent(true);
      setMessage("");
    }
  };
  if (sent) {
    return (
      <Block title="Write back">
        <p className="font-body text-sm text-stone-700 dark:text-stone-300 mb-0">Thank you — only I can read it, and I read every one.</p>
      </Block>
    );
  }
  return (
    <Block title="Write back">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          aria-label="Your reply"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="A thought, a question, a trek I should do next… Only I will see it."
          className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 font-body text-sm text-stone-800 dark:text-stone-200"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Name (optional)"
            className="flex-1 min-w-[10rem] rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 font-body text-sm text-stone-800 dark:text-stone-200"
          />
          <button
            type="submit"
            disabled={!message.trim() || fb.pending === "reply"}
            className="rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 font-label text-xs uppercase tracking-widest font-bold disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </Block>
  );
};

Reply.propTypes = { fb: PropTypes.shape({}).isRequired };

/** Poll, rating and reply, at the foot of an issue. */
const IssueFeedback = ({ model, fb }) => (
  <section id="feedback" aria-label="Your feedback" className="flex flex-col gap-8">
    {model.poll && <Poll poll={model.poll} fb={fb} />}
    <Rating sections={model.sections} fb={fb} />
    <Reply fb={fb} />
    {fb.error && <p role="alert" className="font-body text-sm text-red-600 dark:text-red-400 mb-0">{fb.error}</p>}
    <div ref={fb.turnstileRef} />
  </section>
);

IssueFeedback.propTypes = {
  model: PropTypes.shape({
    poll: PropTypes.shape({}),
    sections: PropTypes.arrayOf(PropTypes.shape({})),
  }).isRequired,
  fb: PropTypes.shape({}).isRequired,
};

export default IssueFeedback;
