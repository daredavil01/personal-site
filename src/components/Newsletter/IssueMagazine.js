import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Markdown from "markdown-to-jsx";
import IssueItems from "./IssueItems";
import MonthCalendarStrip from "./MonthCalendarStrip";
import IssueFeedback, { SectionReactions } from "./IssueFeedback";
import {
  DraftNotice, IssueActions, IssueAsk, IssueNav, SectionShare,
} from "./IssueParts";
import NowStatsSection from "../Now/NowStatsSection";
import RelatedContent from "../Ask/RelatedContent";

// The classic-theme issue: an editorial magazine. A photo cover with the
// month's three numbers, the letter with a drop cap, then each section as a
// numbered spread, a pull-quote from the month's shortest post in between.

const Cover = ({ model, hero }) => (
  <header className="relative overflow-hidden rounded-3xl bg-stone-900 text-white">
    {hero && <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/75 to-stone-950/10" />
    <div className="relative flex flex-col justify-end gap-6 min-h-[26rem] p-6 sm:p-10">
      <p className="font-label text-[11px] uppercase tracking-[0.35em] text-amber-300 font-bold mb-0">
        {`The Newsletter · ${model.label}`}
      </p>
      <h1 className="font-headline text-4xl sm:text-6xl font-black leading-[0.95] tracking-tight text-white mb-0">
        {model.headline}
      </h1>
      {model.stats.length > 0 && (
        <dl className="flex flex-wrap gap-x-10 gap-y-4 m-0">
          {model.stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dd className="font-headline text-4xl sm:text-5xl font-black text-amber-300 m-0 leading-none">{s.value}</dd>
              <dt className="font-label text-[10px] uppercase tracking-widest text-stone-300 mt-1">{s.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </div>
  </header>
);

Cover.propTypes = { model: PropTypes.shape({}).isRequired, hero: PropTypes.string };
Cover.defaultProps = { hero: null };

const Spread = ({
  index, section, model, fb, find,
}) => (
  <section aria-labelledby={`sec-${section.key}`} className="grid @2xl:grid-cols-[13rem_1fr] gap-6 border-t border-stone-200 dark:border-stone-800 pt-8">
    <div className="flex flex-col gap-3 @2xl:sticky @2xl:top-24 self-start">
      <span className="font-headline text-5xl font-black text-secondary/80 leading-none">{String(index).padStart(2, "0")}</span>
      <h2 id={`sec-${section.key}`} className="font-headline text-2xl font-black text-stone-900 dark:text-stone-100 mb-0 flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary">{section.icon}</span>
        {section.label}
      </h2>
      <p className="font-label text-[11px] uppercase tracking-widest text-stone-400 mb-0">
        {`${section.items.length} ${section.items.length === 1 ? "entry" : "entries"}`}
      </p>
      {fb && <SectionReactions sectionKey={section.key} fb={fb} />}
      <SectionShare model={model} section={section} />
    </div>
    <IssueItems sectionKey={section.key} items={section.items} find={find} />
  </section>
);

Spread.propTypes = {
  index: PropTypes.number.isRequired,
  section: PropTypes.shape({ key: PropTypes.string, label: PropTypes.string, icon: PropTypes.string, items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.shape({})])) }).isRequired,
  model: PropTypes.shape({}).isRequired,
  fb: PropTypes.shape({}),
  find: PropTypes.func.isRequired,
};
Spread.defaultProps = { fb: null };

const PullQuote = ({ quote }) => (
  <figure className="border-y-4 border-double border-stone-300 dark:border-stone-700 py-8 my-2 text-center">
    <blockquote className="font-headline text-2xl sm:text-3xl italic text-stone-800 dark:text-stone-200 whitespace-pre-line leading-snug m-0">
      {`“${quote.text}”`}
    </blockquote>
    {quote.ref && (
      <figcaption className="mt-4">
        <Link to={`/micro-blog/${quote.ref.id}`} className="font-label text-[10px] uppercase tracking-widest text-secondary no-underline">From the micro-blog</Link>
      </figcaption>
    )}
  </figure>
);

PullQuote.propTypes = { quote: PropTypes.shape({ text: PropTypes.string, ref: PropTypes.shape({ id: PropTypes.number }) }).isRequired };

const IssueMagazine = ({
  row, model, hero, fb, find, prev, next,
}) => (
  <article className="@container w-full max-w-4xl mx-auto flex flex-col gap-12">
    <div className="flex items-center justify-between gap-4">
      <Link to="/newsletter" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors no-underline">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        All issues
      </Link>
    </div>
    {model.isDraft && <DraftNotice />}
    <Cover model={model} hero={hero} />
    <IssueActions model={model} hero={hero} />

    {model.note && (
      <section aria-label="The letter" className="prose prose-stone dark:prose-invert prose-lg max-w-none first-letter:float-left first-letter:font-headline first-letter:text-7xl first-letter:font-black first-letter:leading-[0.8] first-letter:mr-3 first-letter:mt-1 first-letter:text-secondary">
        <Markdown options={{ forceBlock: true, disableParsingRawHTML: true }}>{model.note}</Markdown>
        <p className="font-headline italic text-right">— Sanket</p>
      </section>
    )}

    <MonthCalendarStrip days={model.days} grid={model.grid} label={model.label} />

    {model.sections.map((section, i) => (
      <React.Fragment key={section.key}>
        <Spread index={i + 1} section={section} model={model} fb={fb} find={find} />
        {i === 1 && model.quote && <PullQuote quote={model.quote} />}
      </React.Fragment>
    ))}

    {model.extraStats && (
      <section className="border-t border-stone-200 dark:border-stone-800 pt-8">
        <NowStatsSection stats={model.extraStats} />
      </section>
    )}

    {fb && (
      <div className="rounded-3xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-10">
        <IssueFeedback model={model} fb={fb} />
      </div>
    )}
    <IssueAsk row={row} model={model} />
    <RelatedContent type="now" id={model.id} title="Months like this" />
    <IssueNav prev={prev} next={next} />
  </article>
);

const issue = PropTypes.shape({ slug: PropTypes.string, label: PropTypes.string });
IssueMagazine.propTypes = {
  row: PropTypes.shape({}).isRequired,
  model: PropTypes.shape({}).isRequired,
  hero: PropTypes.string,
  fb: PropTypes.shape({}),
  find: PropTypes.func.isRequired,
  prev: issue,
  next: issue,
};
IssueMagazine.defaultProps = {
  hero: null, fb: null, prev: null, next: null,
};

export default IssueMagazine;
