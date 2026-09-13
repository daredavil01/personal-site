import React, { useState } from "react";
import PropTypes from "prop-types";
import ShareImageModal from "../share/ShareImageModal";
import { SITE_URL } from "../../data/pageMeta";
import { stripMarkdownImages } from "../../lib/askFormat";
import { sendAskFeedback } from "../../lib/api/ask";

// Copy / permalink / share-as-image, and the reader's verdict, under a
// finished answer.
//
// The image export reuses the site's existing share module — same card, same
// editor, same PNG pipeline as a book or a trek — with an `ask` adapter in
// shareCardConfig.js. Nothing new to maintain.
//
// Feedback is written onto this answer's row in the conversation log
// (ask_feedback), where it doubles as evals data for tuning the prompt and
// deciding what to ingest next.

export const FEEDBACK_TAGS = [
  "Wrong facts",
  "Missing data",
  "Bad links",
  "Formatting",
  "Too long",
  "Other",
];

const Action = ({ onClick, icon, children, title, pressed }) => (
  <div
    role="button"
    tabIndex={0}
    aria-pressed={pressed}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    }}
    title={title}
    className={`flex cursor-pointer items-center gap-1 font-label text-xs uppercase tracking-widest transition-colors hover:text-secondary ${
      pressed ? "text-secondary" : "text-stone-400 dark:text-stone-500"
    }`}
  >
    <span className="material-symbols-outlined text-sm">{icon}</span>
    {children}
  </div>
);

Action.propTypes = {
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.string.isRequired,
  children: PropTypes.node,
  title: PropTypes.string,
  pressed: PropTypes.bool,
};

Action.defaultProps = { children: null, title: undefined, pressed: undefined };

const AnswerActions = ({
  question, answer, sources, messageId, feedback, onFeedback,
}) => {
  const [copied, setCopied] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tags, setTags] = useState(feedback?.tags || []);
  const [comment, setComment] = useState(feedback?.comment || "");
  const [status, setStatus] = useState(null); // saving | saved | error
  const rating = feedback?.rating ?? null;

  // A permalink re-asks the question on load rather than storing the answer:
  // the archive changes, and a stale answer under a live URL would be a lie.
  const permalink = `${SITE_URL}/ask?q=${encodeURIComponent(question)}`;

  const copy = (label, text) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(label);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => setCopied("failed"));
  };

  const plain = [
    stripMarkdownImages(answer),
    "",
    ...sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url?.startsWith("http") ? s.url : `${SITE_URL}${s.url}`}`),
  ].join("\n");

  const save = async (next) => {
    onFeedback({ ...next, saved: false });
    setStatus("saving");
    try {
      const ok = await sendAskFeedback({ messageId, ...next });
      setStatus(ok ? "saved" : "error");
      onFeedback({ ...next, saved: ok });
    } catch (_) {
      setStatus("error");
    }
  };

  const rate = (value) => {
    const nextRating = rating === value ? null : value;
    if (nextRating === -1) setPanelOpen(true);
    save({ rating: nextRating, tags, comment });
  };

  const toggleTag = (tag) => setTags((prev) => (
    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
  ));

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <Action icon="content_copy" onClick={() => copy("answer", plain)}>
          {copied === "answer" ? "Copied" : "Copy"}
        </Action>
        <Action icon="link" onClick={() => copy("link", permalink)} title={permalink}>
          {copied === "link" ? "Copied" : "Permalink"}
        </Action>
        <Action icon="image" onClick={() => setShareOpen(true)} title="Share as image">
          Image
        </Action>
        {messageId && (
          <>
            <Action icon="thumb_up" title="Good answer" pressed={rating === 1} onClick={() => rate(1)} />
            <Action icon="thumb_down" title="Poor answer" pressed={rating === -1} onClick={() => rate(-1)} />
            <Action icon="edit_note" title="Suggest an improvement" pressed={panelOpen} onClick={() => setPanelOpen((v) => !v)}>
              Suggest
            </Action>
          </>
        )}
        {status === "saved" && <span className="text-[11px] text-stone-400 dark:text-stone-500">Thanks — noted.</span>}
        {status === "error" && (
          <span className="text-[11px] text-red-600 dark:text-red-400">Couldn&apos;t save that. Try again in a moment.</span>
        )}
      </div>

      {messageId && panelOpen && (
        <div className="flex w-full flex-col gap-2 rounded-xl border border-stone-200 dark:border-stone-800 p-3">
          <p className="text-[12px] text-stone-600 dark:text-stone-300 mb-0">What could be better?</p>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_TAGS.map((tag) => (
              <div
                key={tag}
                role="button"
                tabIndex={0}
                aria-pressed={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleTag(tag);
                  }
                }}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  tags.includes(tag)
                    ? "border-secondary bg-secondary/10 text-secondary"
                    : "border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600"
                }`}
              >
                {tag}
              </div>
            ))}
          </div>
          <textarea
            rows={2}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional — what was missing or wrong?"
            className="w-full resize-none rounded-lg border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:border-stone-400 dark:focus:border-stone-600"
          />
          <div className="flex items-center gap-3">
            <div
              role="button"
              tabIndex={0}
              onClick={() => { save({ rating, tags, comment }); setPanelOpen(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  save({ rating, tags, comment });
                  setPanelOpen(false);
                }
              }}
              className="cursor-pointer rounded-lg bg-stone-900 dark:bg-stone-100 px-3 py-1.5 text-[12px] font-medium text-stone-50 dark:text-stone-900"
            >
              Send feedback
            </div>
            <span className="text-[11px] text-stone-400 dark:text-stone-500">Stored with this answer to improve the archive.</span>
          </div>
        </div>
      )}

      {shareOpen && (
        <ShareImageModal
          kind="ask"
          item={{ question, answer, sources }}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
};

AnswerActions.propTypes = {
  question: PropTypes.string.isRequired,
  answer: PropTypes.string.isRequired,
  sources: PropTypes.arrayOf(PropTypes.shape({})),
  messageId: PropTypes.string,
  feedback: PropTypes.shape({
    rating: PropTypes.number,
    tags: PropTypes.arrayOf(PropTypes.string),
    comment: PropTypes.string,
  }),
  onFeedback: PropTypes.func,
};

AnswerActions.defaultProps = {
  sources: [],
  messageId: null,
  feedback: null,
  onFeedback: () => {},
};

export default AnswerActions;
