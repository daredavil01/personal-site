import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { colorForTag } from "../../lib/generativeArt";
import {
  LENGTH_BINS, WEEKDAYS, hourLabel, monthSeries, pct, scopeOf, yearTable,
} from "../../lib/microblogInsights";
import {
  BarList, CalendarYear, Columns, ShareBar, WeekHourGrid, dateLabel, fmt, monthLabel,
} from "./charts";
import { insightsShape } from "./useInsights";

// Stats: the numbers, dense. One scope switch (every year, or one) re-reads
// the same summary shape from the insights file; nothing is recomputed here.
// A tile with no value is left out, never shown as 0.

const NO_COLORS = new Map();
const TYPE_COLORS = { text: "var(--mb-en)", quote: "#8b5cf6", photo: "var(--mb-mr)" };
const KIND_LABELS = {
  own: "Own words", quote: "Quotes", reblog: "Reblogs", link: "Links", unclassified: "Not classified yet",
};
const KIND_COLORS = {
  own: "var(--mb-accent)", quote: "#8b5cf6", reblog: "#64748b", link: "#0ea5e9", unclassified: "var(--mb-none)",
};

const Panel = ({
  title, note, children, className,
}) => (
  <section className={`mb-card p-5 md:p-6 min-w-0 ${className}`}>
    <header className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
      <h3 className="font-label text-[11px] uppercase tracking-[0.18em] font-bold mb-0">{title}</h3>
      {note && <p className="font-body text-xs mb-faint mb-0">{note}</p>}
    </header>
    {children}
  </section>
);
Panel.propTypes = {
  title: PropTypes.string.isRequired, note: PropTypes.node, children: PropTypes.node, className: PropTypes.string,
};
Panel.defaultProps = { note: null, children: null, className: "" };

const StatsTab = ({
  doc, year, setYear, goPosts, tagColors,
}) => {
  const s = scopeOf(doc, year);
  const months = useMemo(() => monthSeries(doc, year), [doc, year]);
  const table = useMemo(() => yearTable(doc), [doc]);
  const calendarYears = year ? [year] : [...doc.years].reverse();
  const dayMax = useMemo(() => Math.max(1, ...Object.values(doc.days)), [doc.days]);
  const worded = s.posts - (s.langs.none || 0);
  const tagColor = (t) => colorForTag(t, tagColors.get(t));

  const tiles = [
    ["Posts", fmt(s.posts), year ? `in ${year}` : `${dateLabel(s.first)} – ${dateLabel(s.last)}`],
    ["Active days", fmt(s.days), s.days ? `${(s.posts / s.days).toFixed(1)} posts a day when posting` : null],
    ["Words", fmt(s.words), s.medianWords != null ? `median ${s.medianWords} a post` : null],
    ["Marathi", worded ? `${pct(s.langs.mr || 0, worded)}%` : null, `${fmt(s.langs.mr || 0)} of ${fmt(worded)} posts with words`],
    ["Own words", s.kinds.own ? `${pct(s.kinds.own, s.posts)}%` : null, "not quotes, reblogs or links"],
    ["After dark", s.timed >= 10 ? `${pct(s.night, s.timed)}%` : null, s.timed ? `of ${fmt(s.timed)} timed posts, 9 pm–3 am` : null],
    ["Longest streak", s.streak ? `${s.streak.days} days` : null, s.streak ? `from ${dateLabel(s.streak.from)}` : null],
    ["Longest silence", s.gap ? `${fmt(s.gap.days)} days` : null, s.gap ? `after ${dateLabel(s.gap.from)}` : null],
  ].filter(([, v]) => v);

  return (
    <div className="flex flex-col gap-6">
      {/* Scope: every year, or one */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show the numbers for">
        {[["", "All years"], ...doc.years.map((y) => [y, y])].map(([v, label]) => (
          <button key={label} type="button" className="mb-chip" aria-pressed={(year || "") === v} onClick={() => setYear(v)}>{label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="mb-card p-4">
            <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-1">{label}</p>
            <p className="font-headline text-2xl md:text-3xl font-black mb-1 mb-num">{value}</p>
            {sub && <p className="font-body text-[11px] mb-faint mb-0 leading-snug">{sub}</p>}
          </div>
        ))}
      </div>

      <Panel title={year ? `Every month of ${year}` : "Every month"} note="Pick a month to read it">
        <Columns
          height={130}
          items={months.map((m) => ({ key: m.key, label: year ? monthLabel(m.key).slice(0, 3) : m.key.slice(0, 4), title: monthLabel(m.key), value: m.count }))}
          labelEvery={year ? 1 : 12}
          highlight={s.busiestMonth ? s.busiestMonth.key : null}
          onPick={(key) => goPosts({ month: key })}
        />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="When in the week" note={s.timed ? `${fmt(s.timed)} posts with a signed time` : null}>
          {s.timed > 0 ? <WeekHourGrid grid={s.grid} /> : <p className="font-body text-sm mb-muted mb-0">No post this year carries a time.</p>}
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-2">By weekday</p>
              <Columns height={70} items={s.weekdays.map((n, i) => ({ key: WEEKDAYS[i], label: WEEKDAYS[i][0], title: WEEKDAYS[i], value: n }))} />
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-2">{s.peakHour != null ? `By hour · peak ${hourLabel(s.peakHour)}` : "By hour"}</p>
              <Columns height={70} labelEvery={6} items={s.hours.map((n, h) => ({ key: String(h), label: String(h), title: hourLabel(h), value: n, showValue: false }))} highlight={String(s.peakHour)} />
            </div>
          </div>
        </Panel>

        <Panel title="What the posts are">
          <div className="flex flex-col gap-6">
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-2">Format</p>
              <ShareBar parts={Object.entries(s.types).map(([k, v]) => ({ label: k, value: v, color: TYPE_COLORS[k] || "var(--mb-none)" }))} />
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-2">Language</p>
              <ShareBar parts={[
                { label: "English", value: s.langs.en || 0, color: "var(--mb-en)" },
                { label: "Marathi", value: s.langs.mr || 0, color: "var(--mb-mr)" },
                { label: "No words", value: s.langs.none || 0, color: "var(--mb-none)" },
              ]}
              />
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-2">Whose words</p>
              <ShareBar parts={Object.entries(s.kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: KIND_LABELS[k] || k, value: v, color: KIND_COLORS[k] || "var(--mb-none)" }))} />
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-2">Source</p>
              <ShareBar parts={Object.entries(s.sources).map(([k, v], i) => ({ label: k, value: v, color: ["var(--mb-ink)", "var(--mb-faint)", "var(--mb-none)"][i] || "var(--mb-none)" }))} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel title={year ? `Calendar · ${year}` : "Calendar · every day"} note="Darker means more posts that day. Pick a day to read its month.">
        <div className="flex flex-col gap-2">
          {calendarYears.map((y) => <CalendarYear key={y} year={y} days={doc.days} max={dayMax} onPickMonth={(key) => goPosts({ month: key })} />)}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Top tags" note={`${fmt(s.tagCount)} tags in use`}>
          {s.tags.length > 0
            ? <BarList items={s.tags.map(([t, n]) => ({ key: t, label: `#${t}`, value: n, swatch: tagColor(t), color: tagColor(t) }))} onPick={(t) => goPosts({ tags: t })} />
            : <p className="font-body text-sm mb-muted mb-0">No tags this year.</p>}
        </Panel>

        <Panel title="How long the posts are" note={s.medianWords != null ? `median ${s.medianWords} words` : null}>
          <Columns height={120} items={s.lengths.map((n, i) => ({ key: LENGTH_BINS[i].label, label: LENGTH_BINS[i].label, title: `${LENGTH_BINS[i].label} words`, value: n }))} />
          <p className="font-body text-xs mb-faint mt-2 mb-5">Words per post, after the signature, numbers and links are taken out.</p>
          {s.emoji.length > 0 && (
            <>
              <p className="font-label text-[10px] uppercase tracking-widest mb-muted mb-2">{`Emoji · in ${fmt(s.emojiPosts)} posts`}</p>
              <div className="flex flex-wrap gap-2">
                {s.emoji.map(([e, n]) => (
                  <span key={e} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg mb-track">
                    <span className="text-lg leading-none">{e}</span>
                    <span className="font-mono text-[10px] mb-muted">{fmt(n)}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel title="Records">
        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 m-0">
          {[
            s.busiestDay && ["Busiest day", `${s.busiestDay.posts} posts`, dateLabel(s.busiestDay.date), () => goPosts({ month: s.busiestDay.date.slice(0, 7) })],
            s.busiestMonth && ["Busiest month", `${fmt(s.busiestMonth.posts)} posts`, monthLabel(s.busiestMonth.key), () => goPosts({ month: s.busiestMonth.key })],
            s.streak && ["Longest streak", `${s.streak.days} days`, `${dateLabel(s.streak.from)} – ${dateLabel(s.streak.to)}`, () => goPosts({ month: s.streak.from.slice(0, 7) })],
            s.gap && ["Longest silence", `${fmt(s.gap.days)} days`, `${dateLabel(s.gap.from)} – ${dateLabel(s.gap.to)}`, null],
            s.longest && ["Longest post", `${fmt(s.longest.words)} words`, dateLabel(s.longest.date), `/micro-blog/${s.longest.id}`],
            s.first && ["First and last", dateLabel(s.first), `to ${dateLabel(s.last)}`, null],
          ].filter(Boolean).map(([label, value, sub, go]) => (
            <div key={label} className="border-l-2 mb-rule pl-3">
              <dt className="font-label text-[10px] uppercase tracking-widest mb-muted">{label}</dt>
              <dd className="m-0">
                <span className="font-headline text-xl font-black mb-num">{value}</span>
                <span className="block font-mono text-[11px] mb-faint">
                  {typeof go === "string" && <Link to={go} className="mb-accent no-underline hover:underline">{`${sub} ↗`}</Link>}
                  {typeof go === "function" && <button type="button" onClick={go} className="mb-accent bg-transparent border-0 p-0 cursor-pointer hover:underline font-mono text-[11px]">{`${sub} →`}</button>}
                  {!go && sub}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      {!year && (
        <Panel title="Year by year" note="Pick a year for its numbers">
          <div className="mb-scroll-x">
            <table className="w-full min-w-[560px] text-left border-collapse">
              <thead>
                <tr className="font-label text-[10px] uppercase tracking-widest mb-muted">
                  {["Year", "Posts", "Days", "Words", "Median", "Marathi", "After dark", "Top tag"].map((h) => (
                    <th key={h} scope="col" className={`py-2 pr-3 font-bold border-b mb-rule ${h === "Year" || h === "Top tag" ? "" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {table.map((r) => (
                  <tr key={r.year} className="border-b mb-rule">
                    <th scope="row" className="py-2 pr-3">
                      <button type="button" onClick={() => setYear(r.year)} className="mb-accent font-bold bg-transparent border-0 p-0 cursor-pointer hover:underline">{r.year}</button>
                    </th>
                    <td className="py-2 pr-3 text-right">{fmt(r.posts)}</td>
                    <td className="py-2 pr-3 text-right">{fmt(r.days)}</td>
                    <td className="py-2 pr-3 text-right">{fmt(r.words)}</td>
                    <td className="py-2 pr-3 text-right">{r.medianWords ?? ""}</td>
                    <td className="py-2 pr-3 text-right">{r.marathi != null ? `${r.marathi}%` : ""}</td>
                    <td className="py-2 pr-3 text-right">{r.night != null ? `${r.night}%` : ""}</td>
                    <td className="py-2 pr-3 font-body">
                      {r.topTag && (
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tagColor(r.topTag) }} />
                          {`#${r.topTag}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
};

StatsTab.propTypes = {
  doc: insightsShape.isRequired,
  year: PropTypes.string,
  setYear: PropTypes.func.isRequired,
  goPosts: PropTypes.func.isRequired,
  tagColors: PropTypes.instanceOf(Map),
};
StatsTab.defaultProps = { year: "", tagColors: NO_COLORS };

export default StatsTab;
