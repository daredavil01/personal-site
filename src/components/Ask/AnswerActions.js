import React, { useState } from "react";
import PropTypes from "prop-types";
import ShareImageModal from "../share/ShareImageModal";
import { SITE_URL } from "../../data/pageMeta";

// Copy / permalink / share-as-image, under a finished answer.
//
// The image export reuses the site's existing share module — same card, same
// editor, same PNG pipeline as a book or a trek — with an `ask` adapter in
// shareCardConfig.js. Nothing new to maintain.

const Action = ({ onClick, icon, children, title }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    }}
    title={title}
    className="flex cursor-pointer items-center gap-1 font-label text-xs uppercase tracking-widest text-stone-400 transition-colors hover:text-secondary dark:text-stone-500"
  >
    <span className="material-symbols-outlined text-sm">{icon}</span>
    {children}
  </div>
);

Action.propTypes = {
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
};

Action.defaultProps = { title: undefined };

const AnswerActions = ({ question, answer, sources }) => {
  const [copied, setCopied] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

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
    answer,
    "",
    ...sources.map((s, i) => `[${i + 1}] ${s.title} — ${SITE_URL}${s.url}`),
  ].join("\n");

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
      </div>
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
};

AnswerActions.defaultProps = { sources: [] };

export default AnswerActions;
