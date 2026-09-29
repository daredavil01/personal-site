import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Markdown from "markdown-to-jsx";
import IssueItems from "./IssueItems";
import MonthCalendarStrip from "./MonthCalendarStrip";
import IssueFeedback, { SectionReactions } from "./IssueFeedback";
import {
  DraftNotice, IssueActions, IssueAsk, IssueNav, SectionShare,
} from "./IssueParts";
import NowStatsSection from "../Now/NowStatsSection";
import RelatedContent from "../Ask/RelatedContent";

// The atlas-theme issue: a letter posted from Hometown Square. It arrives as a
// sealed envelope stamped with the month; opening it unfolds the letter,
// written in a hand, with the month's numbers as postage stamps and each
// section as a postcard pinned beneath.

const HAND = { fontFamily: "'Caveat', 'Noto Serif', cursive" };
const PAPER = "bg-[#fbf6ea] dark:bg-stone-900 text-stone-800 dark:text-stone-200";
// Faint ruled lines, like writing paper.
const RULED = {
  backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 2.1rem, rgba(120,113,108,0.18) 2.1rem, rgba(120,113,108,0.18) calc(2.1rem + 1px))",
};

const seenKey = (slug) => `newsletter.opened.${slug}`;
const wasOpened = (slug) => {
  try {
    return window.localStorage.getItem(seenKey(slug)) === "1"
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    return false;
  }
};

const Stamp = ({ top, bottom, tilt }) => (
  <div className={`shrink-0 w-24 h-28 p-1.5 bg-amber-400 dark:bg-amber-500 ${tilt} shadow-md`}>
    <div className="w-full h-full border-2 border-dashed border-amber-50/90 flex flex-col items-center justify-center text-center text-stone-900 px-1">
      <span className="font-headline text-3xl font-black leading-none">{top}</span>
      <span className="font-label text-[9px] uppercase tracking-widest mt-1 leading-tight">{bottom}</span>
    </div>
  </div>
);

Stamp.propTypes = { top: PropTypes.string.isRequired, bottom: PropTypes.string.isRequired, tilt: PropTypes.string };
Stamp.defaultProps = { tilt: "" };

const Envelope = ({ model, opening, onOpen }) => (
  <div className="relative w-full max-w-xl mx-auto aspect-[16/10] [perspective:1200px]">
    <div className={`absolute inset-0 rounded-2xl border-2 border-amber-700/30 shadow-xl ${PAPER}`}>
      <div className="absolute left-8 bottom-8 flex flex-col gap-1" style={HAND}>
        <span className="text-2xl">To: you, the reader</span>
        <span className="text-lg text-stone-500">{`${model.label} · ${model.headline}`}</span>
      </div>
    </div>
    <div
      aria-hidden="true"
      className={`absolute inset-x-0 top-0 h-3/5 origin-top transition-transform duration-700 ease-out bg-amber-100 dark:bg-stone-800 border-2 border-amber-700/30 [clip-path:polygon(0_0,100%_0,50%_100%)] ${opening ? "[transform:rotateX(180deg)]" : ""}`}
    />
    {/* Stamp and postmark sit over the flap, where the eye lands first. */}
    <div className="absolute right-5 top-5">
      <Stamp top={model.label.split(" ")[0].slice(0, 3)} bottom={model.label.split(" ")[1]} tilt="rotate-3" />
    </div>
    <div className="absolute right-20 top-24 w-24 h-24 rounded-full border-2 border-stone-600/50 dark:border-stone-300/40 flex items-center justify-center -rotate-12 pointer-events-none">
      <span className="font-label text-[9px] uppercase tracking-widest text-stone-600 dark:text-stone-300 text-center leading-tight">
        Hometown
        <br />
        Square
      </span>
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <button
        type="button"
        onClick={onOpen}
        className="rounded-full bg-secondary text-white px-6 py-3 font-label text-xs uppercase tracking-[0.25em] font-bold shadow-lg hover:scale-105 transition-transform"
      >
        Open the letter
      </button>
    </div>
  </div>
);

Envelope.propTypes = { model: PropTypes.shape({ label: PropTypes.string, headline: PropTypes.string }).isRequired, opening: PropTypes.bool.isRequired, onOpen: PropTypes.func.isRequired };

// Written out whole so Tailwind sees each class.
const TILTS = ["@2xl:-rotate-1", "@2xl:rotate-1", "@2xl:rotate-[0.5deg]", "@2xl:-rotate-[0.5deg]"];

const Postcard = ({
  section, index, model, fb, find,
}) => (
  <section
    aria-labelledby={`pc-${section.key}`}
    className={`relative rounded-xl border border-stone-300/70 dark:border-stone-700 shadow-md p-5 sm:p-6 flex flex-col gap-4 ${TILTS[index % TILTS.length]} ${PAPER}`}
  >
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-stone-300 dark:border-stone-700 pb-3">
      <div>
        <p className="font-label text-[9px] uppercase tracking-[0.3em] text-stone-500 mb-1">Postcard from</p>
        <h2 id={`pc-${section.key}`} className="text-3xl leading-none text-stone-900 dark:text-stone-100 mb-0" style={HAND}>
          {section.label}
        </h2>
      </div>
      <div className="shrink-0 w-12 h-14 border-2 border-dashed border-secondary/50 rounded-sm flex items-center justify-center">
        <span className="material-symbols-outlined text-secondary">{section.icon}</span>
      </div>
    </div>
    <IssueItems sectionKey={section.key} items={section.items} find={find} />
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      {fb ? <SectionReactions sectionKey={section.key} fb={fb} /> : <span />}
      <SectionShare model={model} section={section} />
    </div>
  </section>
);

Postcard.propTypes = {
  section: PropTypes.shape({ key: PropTypes.string, label: PropTypes.string, icon: PropTypes.string, items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})])) }).isRequired,
  index: PropTypes.number.isRequired,
  model: PropTypes.shape({}).isRequired,
  fb: PropTypes.shape({}),
  find: PropTypes.func.isRequired,
};
Postcard.defaultProps = { fb: null };

const IssueLetter = ({
  row, model, hero, fb, find, prev, next,
}) => {
  const [opened, setOpened] = useState(() => wasOpened(model.slug));
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setOpened(wasOpened(model.slug));
    setOpening(false);
  }, [model.slug]);

  const open = () => {
    setOpening(true);
    try {
      window.localStorage.setItem(seenKey(model.slug), "1");
    } catch (_) {
      // Storage blocked: the envelope simply shows again next time.
    }
    setTimeout(() => setOpened(true), 650);
  };

  return (
    <article className="@container w-full max-w-3xl mx-auto flex flex-col gap-10">
      <Helmet>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap" />
      </Helmet>
      <Link to="/newsletter" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors no-underline self-start">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        All letters
      </Link>
      {model.isDraft && <DraftNotice />}

      {!opened ? (
        <Envelope model={model} opening={opening} onOpen={open} />
      ) : (
        <>
          <div className={`relative rounded-2xl border border-stone-300/70 dark:border-stone-700 shadow-xl px-6 sm:px-12 py-10 ${PAPER}`} style={RULED}>
            {hero && (
              <img src={hero} alt="" className="float-right ml-4 mb-4 w-32 sm:w-44 rotate-2 border-[6px] border-white dark:border-stone-800 shadow-md" />
            )}
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-stone-500 mb-4">{`Hometown Square · ${model.label}`}</p>
            <h1 className="text-5xl sm:text-6xl leading-none text-stone-900 dark:text-stone-50 mb-6" style={HAND}>{model.headline}</h1>
            <div className="text-2xl leading-[2.1rem] [&_p]:mb-[2.1rem] [&_a]:text-secondary" style={HAND}>
              {model.note
                ? <Markdown options={{ forceBlock: true, disableParsingRawHTML: true }}>{model.note}</Markdown>
                : <p>{`Dear reader, here is everything ${model.label} held.`}</p>}
              <p className="text-right mb-0">— Sanket</p>
            </div>
            {model.stats.length > 0 && (
              <div className="clear-both flex flex-wrap gap-4 pt-6">
                {model.stats.map((s, i) => (
                  <Stamp key={s.label} top={s.value} bottom={s.label} tilt={i % 2 ? "rotate-2" : "-rotate-2"} />
                ))}
              </div>
            )}
          </div>

          <IssueActions model={model} hero={hero} />
          <MonthCalendarStrip days={model.days} grid={model.grid} label={model.label} />

          <div className="grid @2xl:grid-cols-2 items-start gap-6 @2xl:gap-8">
            {model.sections.map((section, i) => (
              <Postcard key={section.key} section={section} index={i} model={model} fb={fb} find={find} />
            ))}
          </div>

          {model.extraStats && (
            <section className={`rounded-2xl border border-stone-300/70 dark:border-stone-700 p-6 ${PAPER}`}>
              <NowStatsSection stats={model.extraStats} />
            </section>
          )}

          {fb && (
            <div className={`rounded-2xl border border-stone-300/70 dark:border-stone-700 p-6 sm:p-10 ${PAPER}`}>
              <IssueFeedback model={model} fb={fb} />
            </div>
          )}
          <IssueAsk row={row} model={model} />
          <RelatedContent type="now" id={model.id} title="Months like this" />
        </>
      )}
      <IssueNav prev={prev} next={next} />
    </article>
  );
};

const issue = PropTypes.shape({ slug: PropTypes.string, label: PropTypes.string });
IssueLetter.propTypes = {
  row: PropTypes.shape({}).isRequired,
  model: PropTypes.shape({ slug: PropTypes.string }).isRequired,
  hero: PropTypes.string,
  fb: PropTypes.shape({}),
  find: PropTypes.func.isRequired,
  prev: issue,
  next: issue,
};
IssueLetter.defaultProps = {
  hero: null, fb: null, prev: null, next: null,
};

export default IssueLetter;
