import React, { Suspense, lazy, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import ShareImageButton from "../share/ShareImageButton";
import { issueQuestions, itemTitle } from "../../lib/newsletterIssue";
import { SUBSTACK_URL } from "./issueHooks";

// The pieces both layouts share: the action row, section share, the draft
// notice, "ask about this issue" and prev/next navigation.

const AskChat = lazy(() => import("../Ask/AskChat"));

const action = "inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-secondary transition-colors no-underline";

export const IssueActions = ({ model, hero }) => {
  const [state, setState] = useState("idle");
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${model.headline} — ${model.label}`, url });
        setState("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setState("copied");
      }
    } catch (_) {
      // Dismissed share sheet — nothing to report.
    }
    setTimeout(() => setState("idle"), 2000);
  };
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <ShareImageButton kind="newsletter" item={{ ...model, hero }} label="Share as image" />
      <button type="button" onClick={share} className={action}>
        <span className="material-symbols-outlined text-sm">{state === "idle" ? "share" : "check"}</span>
        {{ shared: "Shared!", copied: "Link copied" }[state] || "Share link"}
      </button>
      <a href={SUBSTACK_URL} target="_blank" rel="noopener noreferrer" className={action}>
        <span className="material-symbols-outlined text-sm">mail</span>
        Get it by email
      </a>
      <a href="#ask-issue" className={action}>
        <span className="material-symbols-outlined text-sm">forum</span>
        Ask about it
      </a>
    </div>
  );
};

IssueActions.propTypes = {
  model: PropTypes.shape({ headline: PropTypes.string, label: PropTypes.string }).isRequired,
  hero: PropTypes.string,
};
IssueActions.defaultProps = { hero: null };

/** "Books I read in September" as an image. */
export const SectionShare = ({ model, section }) => (
  <ShareImageButton
    kind="newsletter-section"
    item={{ issue: model, section, titles: section.items.map((item) => itemTitle(section.key, item).split(/\r?\n/)[0].slice(0, 90)) }}
    label="Share"
  />
);

SectionShare.propTypes = {
  model: PropTypes.shape({}).isRequired,
  section: PropTypes.shape({ key: PropTypes.string, items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})])) }).isRequired,
};

export const DraftNotice = () => (
  <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 font-body text-sm text-amber-900 dark:text-amber-200">
    Draft preview — readers cannot open this issue until it is published from /admin.
  </div>
);

/** A chat pinned to this issue: its letter, sections and the items it names. */
export const IssueAsk = ({ row, model }) => (
  <section id="ask-issue" aria-label="Ask about this issue" className="flex flex-col gap-3">
    <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold mb-0">Ask about this month</p>
    <p className="font-body text-sm text-stone-600 dark:text-stone-400 mb-0">
      {`Curious about something in ${model.label}? The archive answers from this letter and everything it links to.`}
    </p>
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-4 max-h-[32rem] flex flex-col">
      <Suspense fallback={<p className="font-body text-sm text-stone-500 mb-0">Waking up…</p>}>
        <AskChat
          compact
          focus={{ type: "now", id: model.id, refs: model.refs }}
          starters={issueQuestions(row)}
        />
      </Suspense>
    </div>
  </section>
);

IssueAsk.propTypes = {
  row: PropTypes.shape({}).isRequired,
  model: PropTypes.shape({ id: PropTypes.number, label: PropTypes.string, refs: PropTypes.arrayOf(PropTypes.shape({})) }).isRequired,
};

export const IssueNav = ({ prev, next }) => (
  <nav aria-label="More issues" className="grid grid-cols-2 gap-4">
    {prev ? (
      <Link to={`/newsletter/${prev.slug}`} className="group rounded-xl border border-stone-200 dark:border-stone-800 p-4 no-underline hover:border-secondary transition-colors">
        <span className="font-label text-[10px] uppercase tracking-widest text-stone-400">← Earlier</span>
        <span className="block font-headline font-bold text-stone-900 dark:text-stone-100 group-hover:text-secondary">{prev.label}</span>
      </Link>
    ) : <span />}
    {next ? (
      <Link to={`/newsletter/${next.slug}`} className="group rounded-xl border border-stone-200 dark:border-stone-800 p-4 text-right no-underline hover:border-secondary transition-colors">
        <span className="font-label text-[10px] uppercase tracking-widest text-stone-400">Later →</span>
        <span className="block font-headline font-bold text-stone-900 dark:text-stone-100 group-hover:text-secondary">{next.label}</span>
      </Link>
    ) : <span />}
  </nav>
);

const navShape = PropTypes.shape({ slug: PropTypes.string, label: PropTypes.string });
IssueNav.propTypes = { prev: navShape, next: navShape };
IssueNav.defaultProps = { prev: null, next: null };
