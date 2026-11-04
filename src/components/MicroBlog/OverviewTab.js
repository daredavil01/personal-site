import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { colorForTag } from "../../lib/generativeArt";
import { getMicroblogPostsByIds } from "../../lib/api/microblog";
import {
  NIGHT_HOURS, WEEKDAYS, cleanPost, dailyPicks, hourLabel, pct, storyLines, todayKey, yearTable,
} from "../../lib/microblogInsights";
import {
  Columns, DayStrip, HourClock, NightSky, Sparkline, dateLabel, fmt, monthLabel, useReveal,
} from "./charts";
import { insightsShape } from "./useInsights";
import { MoodChart, TopicMap, moodColor } from "./MeaningCharts";
import YearCards from "./YearCards";

// Overview: my archive told as a story, in my own voice. The night sky (every
// timed post as a star), today's ten, then the chapters — each one sentence
// written from the numbers (storyLines), a figure, and a way into the posts
// behind it. The chapters are a list: one whose data is missing is left out,
// never drawn empty, and the rest are numbered as they come.

const NO_COLORS = new Map();

export const Chapter = ({
  id, no, title, lede, children, action,
}) => {
  const [ref, inView] = useReveal();
  return (
    <section id={id} ref={ref} className={`scroll-mt-32 mb-reveal${inView ? " is-in" : ""} grid gap-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10 py-10 border-t mb-rule`}>
      <header>
        <p className="mb-chapter-no mb-2">{`Chapter ${no}`}</p>
        <h3 className="font-headline text-2xl md:text-3xl font-black tracking-tight leading-tight mb-3">{title}</h3>
        {lede && <p className="font-body text-[15px] leading-relaxed mb-muted mb-3">{lede}</p>}
        {action}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
};
Chapter.propTypes = {
  id: PropTypes.string, no: PropTypes.number.isRequired, title: PropTypes.string.isRequired, lede: PropTypes.node, children: PropTypes.node, action: PropTypes.node,
};
Chapter.defaultProps = { id: undefined, lede: null, children: null, action: null };

const LangDot = ({ text }) => {
  const mr = /[ऀ-ॿ]/.test(text) && (text.match(/[ऀ-ॿ]/g) || []).length >= (text.match(/[A-Za-z]/g) || []).length * 0.5;
  return <span aria-label={mr ? "Marathi" : "English"} role="img" className={`mb-lang-dot ${mr ? "is-mr" : "is-en"}`} />;
};
LangDot.propTypes = { text: PropTypes.string.isRequired };

/** One of today's ten. The lead card is larger and, in the atlas, at night. */
export const NoteCard = ({
  post, lead, onOpen, tagColors,
}) => {
  const body = cleanPost(post.text || post.title || "");
  return (
    <button type="button" onClick={() => onOpen(post)} className={`mb-note${lead ? " is-lead md:col-span-2 md:row-span-2" : ""}`}>
      <span className="flex w-full items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] mb-muted">
          <LangDot text={body} />
          {dateLabel(post.date)}
        </span>
        <span className="font-label text-[9px] uppercase tracking-widest mb-muted">{post.postType}</span>
      </span>
      {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-40 object-cover rounded-lg" />}
      <span className={`mb-note-text ${lead ? "font-headline text-xl md:text-2xl leading-snug" : "font-body text-[14px] leading-relaxed"}`}>
        {body || "A photo post."}
      </span>
      {post.tags.length > 0 && (
        <span className="flex flex-wrap gap-x-3 gap-y-1 mt-auto pt-1">
          {post.tags.slice(0, 3).map((t) => (
            <span key={t} className="inline-flex items-center gap-1 font-label text-[10px] mb-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: colorForTag(t, tagColors.get(t)) }} />
              {`#${t}`}
            </span>
          ))}
        </span>
      )}
    </button>
  );
};
NoteCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.number, date: PropTypes.string, text: PropTypes.string, title: PropTypes.string, postType: PropTypes.string, imageUrl: PropTypes.string, tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  lead: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
  tagColors: PropTypes.instanceOf(Map),
};
NoteCard.defaultProps = { lead: false, tagColors: NO_COLORS };

const TodaysTen = ({ doc, onOpen, tagColors }) => {
  const day = todayKey();
  const ids = useMemo(() => dailyPicks(doc.pool, day), [doc.pool, day]);
  const [posts, setPosts] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    getMicroblogPostsByIds(ids)
      .then((rows) => live && setPosts(rows))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [ids]);

  // The longest of the ten leads; the rest keep the picked order.
  const ordered = useMemo(() => {
    if (!posts || !posts.length) return [];
    const lead = posts.reduce((a, b) => ((b.text || "").length > (a.text || "").length ? b : a));
    return [lead, ...posts.filter((p) => p !== lead)];
  }, [posts]);

  if (failed) return null;
  const pretty = new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <section aria-labelledby="mb-today">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <p className="mb-chapter-no mb-1">Today&apos;s ten</p>
          <h2 id="mb-today" className="font-headline text-3xl md:text-4xl font-black tracking-tight mb-0">{`Picked for ${pretty}`}</h2>
        </div>
        <p className="font-body text-sm mb-muted mb-0 max-w-sm">
          One post from each year I have written, in both my languages, in my own words. Everyone sees the same ten today and a new ten tomorrow.
        </p>
      </div>
      {!posts && (
        <div className="mb-shelf" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="mb-note animate-pulse h-48" />)}
        </div>
      )}
      {posts && (
        <div className="mb-shelf">
          {ordered.map((p, i) => <NoteCard key={p.id} post={p} lead={i === 0} onOpen={onOpen} tagColors={tagColors} />)}
        </div>
      )}
    </section>
  );
};
TodaysTen.propTypes = { doc: insightsShape.isRequired, onOpen: PropTypes.func.isRequired, tagColors: PropTypes.instanceOf(Map) };
TodaysTen.defaultProps = { tagColors: NO_COLORS };

const MOMENT_LABEL = {
  first: "My first post",
  longest: "My longest",
  "latest-hour": "Written latest into the night",
  newest: "My newest",
};

// [label, count] rows: tags, emoji, words.
const pairShape = PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]));

const SectionLabel = ({ children }) => (
  <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-2">{children}</p>
);
SectionLabel.propTypes = { children: PropTypes.node.isRequired };

/** One language's column in the side-by-side chapter. */
const LanguageColumn = ({
  lang, label, s, words, total, goPosts, tagColor,
}) => {
  const night = s.timed >= 20 ? pct(s.night, s.timed) : null;
  const busiestDay = s.posts ? s.weekdays.indexOf(Math.max(...s.weekdays)) : null;
  const max = Math.max(1, ...s.hours);
  return (
    <div className="mb-card p-5 flex flex-col gap-4" style={{ borderTop: `3px solid var(--mb-${lang})` }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`inline-flex items-center gap-2 font-headline text-xl font-black mb-${lang}`}>
          <span className={`mb-lang-dot is-${lang}`} />
          {label}
        </span>
        <span className="font-mono text-xs mb-muted">{`${fmt(s.posts)} posts · ${pct(s.posts, total)}%`}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 m-0">
        {[
          s.medianWords != null && ["Typical length", `${s.medianWords} words`],
          night != null && ["After dark", `${night}%`],
          s.peakHour != null && s.timed >= 20 && ["Busiest hour", hourLabel(s.peakHour)],
          busiestDay != null && ["Busiest day", WEEKDAYS[busiestDay]],
        ].filter(Boolean).map(([k, v]) => (
          <div key={k}>
            <dt className="font-label text-[10px] uppercase tracking-widest mb-muted">{k}</dt>
            <dd className="m-0 font-headline text-lg font-black mb-num">{v}</dd>
          </div>
        ))}
      </dl>
      {s.timed >= 20 && (
        <div>
          <SectionLabel>Hour of day</SectionLabel>
          <div className="flex items-end gap-[2px] h-12" aria-hidden="true">
            {s.hours.map((n, h) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={h} className="mb-grow flex-1 rounded-t-[2px]" style={{ height: `${Math.max(n ? 6 : 2, (n / max) * 100)}%`, background: n ? `var(--mb-${lang})` : "var(--mb-line)", opacity: NIGHT_HOURS.includes(h) ? 1 : 0.55 }} />
            ))}
          </div>
          <div className="flex justify-between font-mono text-[9px] mb-faint mt-1"><span>12am</span><span>noon</span><span>11pm</span></div>
        </div>
      )}
      {s.tags.length > 0 && (
        <div>
          <SectionLabel>What it carries</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {s.tags.filter(([t]) => t !== "marathi").slice(0, 5).map(([t, n]) => (
              <button key={t} type="button" className="mb-chip" onClick={() => goPosts({ tags: t })}>
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tagColor(t) }} />
                {`#${t}`}
                <span className="font-mono mb-faint">{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {words.length > 0 && (
        <p className="font-body text-[13px] mb-muted mb-0">
          <span className="font-label text-[10px] uppercase tracking-widest mr-2">Its words</span>
          {words.slice(0, 7).map(([w]) => w).join(" · ")}
        </p>
      )}
      {s.emoji.length > 0 && <p className="mb-0 text-lg tracking-wider" aria-label="Favourite emoji">{s.emoji.slice(0, 6).map(([e]) => e).join(" ")}</p>}
    </div>
  );
};
LanguageColumn.propTypes = {
  lang: PropTypes.oneOf(["en", "mr"]).isRequired,
  label: PropTypes.string.isRequired,
  s: PropTypes.shape({
    posts: PropTypes.number, timed: PropTypes.number, night: PropTypes.number, medianWords: PropTypes.number, peakHour: PropTypes.number, hours: PropTypes.arrayOf(PropTypes.number), weekdays: PropTypes.arrayOf(PropTypes.number), tags: PropTypes.arrayOf(pairShape), emoji: PropTypes.arrayOf(pairShape),
  }).isRequired,
  words: PropTypes.arrayOf(pairShape).isRequired,
  total: PropTypes.number.isRequired,
  goPosts: PropTypes.func.isRequired,
  tagColor: PropTypes.func.isRequired,
};

const OverviewTab = ({
  doc, onOpen, onOpenId, goPosts, goStats, tagColors,
}) => {
  const lines = useMemo(() => storyLines(doc), [doc]);
  const table = useMemo(() => yearTable(doc), [doc]);
  const { all } = doc;
  const nightShare = pct(all.night, all.timed);
  const span = doc.years.length;
  const ownShare = pct(all.kinds.own || 0, all.posts);
  const peakYear = [...table].sort((a, b) => b.posts - a.posts)[0];
  const tagColor = (t) => colorForTag(t, tagColors.get(t));
  const worded = (all.langs.en || 0) + (all.langs.mr || 0);

  const chapters = [
    lines.clock && {
      id: "night",
      short: "Night",
      title: "A night writer",
      lede: lines.clock,
      body: (
        <div className="grid gap-8 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)] items-center">
          <HourClock hours={all.hours} />
          <div>
            <SectionLabel>Share I wrote at night, by year</SectionLabel>
            <Columns
              height={90}
              items={table.filter((r) => r.night != null).map((r) => ({ key: r.year, label: `’${r.year.slice(2)}`, value: r.night, title: `${r.year}: ${r.night}% at night` }))}
              color="var(--mb-accent)"
            />
            <p className="font-body text-xs mb-faint mt-3 mb-0">
              {`Night is ${NIGHT_HOURS.length} hours of the 24, so an evenly spread day would put 25% there. The time comes from the signature I leave at the end of a post; ${fmt(all.posts - all.timed)} posts carry none.`}
            </p>
          </div>
        </div>
      ),
    },
    lines.years && {
      id: "years",
      short: "Years",
      title: "The shape of my years",
      lede: lines.years,
      action: <button type="button" className="mb-link" onClick={() => goStats(peakYear.year)}>{`Open ${peakYear.year} in Stats →`}</button>,
      body: (
        <>
          <Columns height={150} highlight={peakYear.year} onPick={goStats} items={table.map((r) => ({ key: r.year, label: r.year, value: r.posts }))} />
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 list-none p-0 mt-6 mb-0">
            {table.filter((r) => r.topTag).map((r) => (
              <li key={r.year} className="flex items-center gap-2 font-body text-[13px]">
                <span className="font-mono text-[11px] mb-faint">{r.year}</span>
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: tagColor(r.topTag) }} />
                <span className="truncate">{`#${r.topTag}`}</span>
              </li>
            ))}
          </ul>
          <p className="font-body text-xs mb-faint mt-2 mb-0">My most-used tag of each year. Pick a year to open it in Stats.</p>
        </>
      ),
    },
    lines.language && {
      id: "languages",
      short: "Languages",
      title: "Two languages",
      lede: lines.language,
      action: doc.tagLives.top.some((t) => t.tag === "marathi")
        ? <button type="button" className="mb-link" onClick={() => goPosts({ tags: "marathi" })}>Read my Marathi posts →</button>
        : null,
      body: (
        <>
          <div className="flex flex-col gap-3">
            {doc.years.map((y) => {
              const s = doc.perYear[y];
              return (
                <div key={y} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3">
                  <span className="font-mono text-[11px] mb-muted">{y}</span>
                  <div className="flex w-full h-3 overflow-hidden rounded-full mb-track" title={`${y}: ${s.langs.en || 0} English, ${s.langs.mr || 0} Marathi`}>
                    {[["en", "var(--mb-en)"], ["mr", "var(--mb-mr)"], ["none", "var(--mb-none)"]].map(([k, c]) => (
                      <span key={k} className="mb-grow-x block h-full" style={{ width: `${((s.langs[k] || 0) / s.posts) * 100}%`, background: c }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 font-label text-[11px] mb-muted">
            <span className="inline-flex items-center gap-1.5"><span className="mb-lang-dot is-en" />English</span>
            <span className="inline-flex items-center gap-1.5"><span className="mb-lang-dot is-mr" />Marathi</span>
            <span className="inline-flex items-center gap-1.5"><span className="mb-lang-dot" style={{ background: "var(--mb-none)" }} />No words (a photo alone)</span>
          </div>
        </>
      ),
    },
    lines.languages && doc.byLang && {
      id: "side-by-side",
      short: "Side by side",
      title: "English and Marathi, side by side",
      lede: lines.languages,
      body: (
        <div className="grid md:grid-cols-2 gap-4">
          <LanguageColumn lang="en" label="English" s={doc.byLang.en} words={doc.words.en} total={worded} goPosts={goPosts} tagColor={tagColor} />
          <LanguageColumn lang="mr" label="मराठी" s={doc.byLang.mr} words={doc.words.mr} total={worded} goPosts={goPosts} tagColor={tagColor} />
        </div>
      ),
    },
    doc.tagLives.top.length > 0 && {
      id: "tags",
      short: "Tags",
      title: "What I write about",
      lede: `${fmt(all.tagCount)} tags, and a few of them carry most of the archive. Each line follows one tag from ${doc.years[0]} to ${doc.years[doc.years.length - 1]}.`,
      body: (
        <>
          <ul className="flex flex-col gap-1 list-none p-0 m-0">
            {doc.tagLives.top.slice(0, 9).map((t) => (
              <li key={t.tag}>
                <button type="button" onClick={() => goPosts({ tags: t.tag })} className="w-full grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3.5rem] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3.5rem_4.5rem] items-center gap-3 py-1.5 bg-transparent border-0 cursor-pointer text-left rounded hover:bg-[var(--mb-wash)]" style={{ color: "inherit" }}>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full shrink-0" style={{ background: tagColor(t.tag) }} />
                    <span className="truncate font-body text-sm">{`#${t.tag}`}</span>
                  </span>
                  <Sparkline values={t.years} color={tagColor(t.tag)} />
                  <span className="font-mono text-xs text-right mb-num">{fmt(t.total)}</span>
                  <span className="hidden sm:block font-mono text-[10px] mb-faint text-right">{`peak ${t.peak}`}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="grid sm:grid-cols-2 gap-6 mt-8">
            {[["Arriving", doc.tagLives.rising, "mostly in my later years"], ["Fading", doc.tagLives.fading, "mostly in my early years"]].map(([label, list, note]) => (list.length > 0 && (
              <div key={label}>
                <SectionLabel>{`${label} — ${note}`}</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {list.map((t) => (
                    <button key={t.tag} type="button" className="mb-chip" onClick={() => goPosts({ tags: t.tag })}>
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tagColor(t.tag) }} />
                      {`#${t.tag}`}
                      <span className="font-mono mb-faint">{t.total}</span>
                    </button>
                  ))}
                </div>
              </div>
            )))}
          </div>
        </>
      ),
    },
    lines.map && doc.map && {
      id: "map",
      short: "Map",
      title: "A map of what I write",
      lede: (
        <>
          {lines.map}
          <span className="block mt-2 text-[13px]">Posts that say similar things sit close together. Hover for where a dot belongs; click it to read the post.</span>
        </>
      ),
      body: <TopicMap map={doc.map} years={doc.years} moods={doc.moods} onOpenId={onOpenId} />,
    },
    lines.mood && doc.moods && {
      id: "tone",
      short: "Tone",
      title: "The tone of my years",
      lede: lines.mood,
      body: (
        <>
          <MoodChart moods={doc.moods} />
          <div className="flex flex-wrap gap-2 mt-6">
            {doc.years.filter((y) => doc.moods.years[y]).map((y) => {
              const c = doc.moods.years[y];
              const i = c.indexOf(Math.max(...c));
              const m = doc.moods.list[i];
              return (
                <button key={y} type="button" className="mb-chip" onClick={() => goStats(y)}>
                  <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: moodColor(m.id) }} />
                  <span className="font-mono">{y}</span>
                  {m.label.toLowerCase()}
                </button>
              );
            })}
          </div>
          <p className="font-body text-xs mb-faint mt-4 mb-0">
            {`No sentiment model reads these posts. Each tone is defined by the posts I tagged with it (${doc.moods.list.map((m) => `${m.label.toLowerCase()}: ${m.tags.map((t) => `#${t}`).join(", ")}`).join("; ")}), and every other post takes the tone it sits closest to in meaning. As a check, the method puts ${Math.round(doc.moods.agreement * 100)}% of the tagged posts back in their own tone. Faded columns are quarters with fewer than six posts.`}
          </p>
        </>
      ),
    },
    (doc.phrases.en.length > 0 || doc.phrases.mr.length > 0) && {
      id: "phrases",
      short: "Phrases",
      title: "The words I keep returning to",
      lede: "Phrases that come back across many of my posts, counted once per post, and the words each language leans on most. Pick one to search for it.",
      body: (
        <div className="grid sm:grid-cols-2 gap-8">
          {[["en", "English"], ["mr", "Marathi"]].map(([lang, label]) => (doc.phrases[lang].length > 0 && (
            <div key={lang}>
              <p className={`font-label text-[10px] uppercase tracking-widest font-bold mb-3 mb-${lang}`}>{label}</p>
              <ol className="flex flex-col gap-1.5 list-none p-0 m-0 mb-5">
                {doc.phrases[lang].slice(0, 6).map(([p, n]) => (
                  <li key={p}>
                    <button type="button" onClick={() => goPosts({ q: p })} className="flex items-baseline gap-3 bg-transparent border-0 p-0 cursor-pointer text-left hover:underline" style={{ color: "inherit" }}>
                      <span className="font-headline text-lg leading-snug">{`“${p}”`}</span>
                      <span className="font-mono text-[11px] mb-faint">{`${n} posts`}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="font-body text-[13px] leading-loose mb-muted mb-0">
                {doc.words[lang].slice(0, 14).map(([w, n], i) => {
                  const top = doc.words[lang][0][1];
                  return (
                    <React.Fragment key={w}>
                      {i > 0 && <span className="mb-faint"> · </span>}
                      <span style={{ fontSize: `${0.8 + (n / top) * 0.45}rem`, fontWeight: n / top > 0.6 ? 700 : 400 }}>{w}</span>
                    </React.Fragment>
                  );
                })}
              </p>
            </div>
          )))}
        </div>
      ),
    },
    lines.silence && all.streak && all.gap && {
      id: "streaks",
      short: "Streaks",
      title: "Streaks and silences",
      lede: lines.silence,
      action: <button type="button" className="mb-link" onClick={() => goPosts({ month: all.streak.from.slice(0, 7) })}>{`Read ${monthLabel(all.streak.from.slice(0, 7))} →`}</button>,
      body: (
        <>
          <DayStrip
            days={doc.days}
            from={all.first}
            to={all.last}
            marks={[
              { label: "streak", from: all.streak.from, to: all.streak.to, color: "var(--mb-accent)" },
              { label: "gap", from: all.gap.from, to: all.gap.to, color: "var(--mb-en)" },
            ]}
          />
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {[
              ["Longest streak", `${all.streak.days} days`, `${dateLabel(all.streak.from)} – ${dateLabel(all.streak.to)}`, "var(--mb-accent)"],
              ["Longest silence", `${fmt(all.gap.days)} days`, `${dateLabel(all.gap.from)} – ${dateLabel(all.gap.to)}`, "var(--mb-en)"],
              all.busiestDay ? ["Busiest day", `${all.busiestDay.posts} posts`, dateLabel(all.busiestDay.date), "var(--mb-ink)"] : null,
            ].filter(Boolean).map(([label, value, when, c]) => (
              <div key={label} className="mb-card p-4" style={{ borderLeft: `3px solid ${c}` }}>
                <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-1">{label}</p>
                <p className="font-headline text-2xl font-black mb-1 mb-num">{value}</p>
                <p className="font-mono text-[11px] mb-faint mb-0">{when}</p>
              </div>
            ))}
          </div>
          <p className="font-body text-xs mb-faint mt-4 mb-0">{`I have posted on ${fmt(all.days)} days. Each line in the strip is one of them.`}</p>
        </>
      ),
    },
    doc.moments.length > 0 && {
      id: "moments",
      short: "Moments",
      title: "Four moments",
      lede: "My first post, my longest, the one I wrote latest into the night, and my newest.",
      body: (
        <div className="grid sm:grid-cols-2 gap-4">
          {doc.moments.map((m) => (
            <Link key={m.why} to={`/micro-blog/${m.id}`} className="mb-card p-5 no-underline flex flex-col gap-3 hover:border-[var(--mb-accent)] transition-colors" style={{ color: "inherit" }}>
              <span className="flex items-center justify-between gap-2">
                <span className="mb-chapter-no">{MOMENT_LABEL[m.why] || m.why}</span>
                <span className="font-mono text-[11px] mb-faint">{dateLabel(m.date)}</span>
              </span>
              <span className={`font-headline text-lg leading-snug ${m.lang === "mr" ? "" : "italic"}`}>{`“${m.quote}”`}</span>
              <span className="font-mono text-[11px] mb-faint mt-auto">{`${fmt(m.words)} words ↗`}</span>
            </Link>
          ))}
        </div>
      ),
    },
    (all.emoji.length > 0 || doc.serial) && {
      id: "marks",
      short: "Marks",
      title: "Small marks",
      lede: doc.serial
        ? `${fmt(doc.serial.count)} of my posts open with a running number, which reaches #${fmt(doc.serial.max)}. ${fmt(all.emojiPosts)} carry at least one emoji.`
        : `${fmt(all.emojiPosts)} of my posts carry at least one emoji.`,
      body: (
        <>
          {all.emoji.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              {all.emoji.map(([e, n], i) => (
                <span key={e} className="mb-card inline-flex flex-col items-center px-3 py-2 min-w-[3.5rem]">
                  <span className="leading-none" style={{ fontSize: i < 3 ? "2rem" : "1.5rem" }} role="img" aria-label={`emoji used ${n} times`}>{e}</span>
                  <span className="font-mono text-[10px] mb-faint mt-1">{fmt(n)}</span>
                </span>
              ))}
            </div>
          )}
          {doc.hashtags.length > 0 && (
            <>
              <SectionLabel>Hashtags I write into the text</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {doc.hashtags.map(([h, n]) => (
                  <button key={h} type="button" className="mb-chip" onClick={() => goPosts({ q: h.replace(/_/g, " ") })}>
                    {`#${h}`}
                    <span className="font-mono mb-faint">{n}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ),
    },
    doc.yearQuotes && Object.keys(doc.yearQuotes).length > 0 && {
      id: "cards",
      short: "Year cards",
      title: "Each year on a card",
      lede: "One card a year, made for sharing: the year's numbers, its tag, its tone, its months and one line I wrote that year. Download one as a PNG or send it straight from your phone.",
      body: <YearCards doc={doc} tagColors={tagColors} />,
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-12">
      {/* ── Hero: the night sky ─────────────────────────────────────── */}
      <section className="mb-sky p-5 md:p-8" aria-labelledby="mb-hero">
        <div className="flex flex-col gap-5 mb-6">
          <div>
            <p className="mb-chapter-no mb-3">The deep read</p>
            <h2 id="mb-hero" className="font-headline text-4xl md:text-6xl font-black tracking-tighter leading-[0.95] mb-3">
              {nightShare != null && nightShare >= 40 ? "I write mostly after dark." : `${span} ${span === 1 ? "year" : "years"} of short posts.`}
            </h2>
            <p className="font-body text-[15px] leading-relaxed mb-muted mb-0 max-w-xl">
              {`Each dot below is one of my posts, placed by the day it went up and the time I signed it. The shaded band runs from 9 pm to 3 am${nightShare != null ? `, and ${nightShare}% of the dots fall inside it` : ""}.`}
            </p>
          </div>
          <dl className="flex flex-wrap gap-x-10 gap-y-3 m-0">
            {[
              [fmt(all.posts), "posts"],
              [String(span), span === 1 ? "year" : "years"],
              [ownShare != null ? `${ownShare}%` : null, "in my own words"],
            ].filter(([v]) => v).map(([v, label]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="font-label text-[10px] uppercase tracking-widest mb-muted">{label}</dt>
                <dd className="font-headline text-3xl md:text-4xl font-black m-0 mb-num">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <NightSky sky={doc.sky} height={260} />
      </section>

      <TodaysTen doc={doc} onOpen={onOpen} tagColors={tagColors} />

      {/* ── The chapters ────────────────────────────────────────────── */}
      <div>
        <nav aria-label="Chapters" className="flex flex-wrap items-center gap-1.5 pb-6">
          <span className="font-label text-[10px] uppercase tracking-widest mb-muted mr-2">{`${chapters.length} chapters`}</span>
          {chapters.map((c, i) => (
            <a key={c.id} href={`#${c.id}`} className="mb-chip no-underline">
              <span className="font-mono mb-faint">{i + 1}</span>
              {c.short}
            </a>
          ))}
        </nav>
        {chapters.map((c, i) => (
          <Chapter key={c.id} id={c.id} no={i + 1} title={c.title} lede={c.lede} action={c.action || null}>
            {c.body}
          </Chapter>
        ))}
      </div>

      <p className="font-body text-xs mb-faint mb-0 border-t mb-rule pt-6">
        {`Every number here is computed from my ${fmt(all.posts)} posts by npm run microblog:insights; tone and the map come from the vectors /ask already keeps, so no model reads the posts to draw this page. Last built ${dateLabel(doc.generatedAt.slice(0, 10))}.`}
      </p>
    </div>
  );
};

OverviewTab.propTypes = {
  doc: insightsShape.isRequired,
  onOpen: PropTypes.func.isRequired,
  onOpenId: PropTypes.func.isRequired,
  goPosts: PropTypes.func.isRequired,
  goStats: PropTypes.func.isRequired,
  tagColors: PropTypes.instanceOf(Map),
};
OverviewTab.defaultProps = { tagColors: NO_COLORS };

export default OverviewTab;
