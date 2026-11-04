import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../atlas/PageShell";
import { ledgerModel, tagLabel } from "../lib/writingLedger";
import { currentPeriod } from "../lib/writingPeriod";
import Cover from "../components/WritingLedger/Cover";
import Shelf from "../components/WritingLedger/Shelf";
import InkCalendar from "../components/WritingLedger/InkCalendar";
import { Cumulative, Months, Years } from "../components/WritingLedger/LongArc";
import { TopicMap, TopicYears } from "../components/WritingLedger/Topics";
import { LengthRuler, Mix, WeekRose } from "../components/WritingLedger/Rhythm";
import Records from "../components/WritingLedger/Records";
import FreshInk from "../components/WritingLedger/FreshInk";
import LedgerTable from "../components/WritingLedger/LedgerTable";
import { Folio, fmt, prefersReducedMotion } from "../components/WritingLedger/shared";
import "../components/WritingLedger/ledger.css";

// /writing-ledger — every essay published on Substack and WordPress, counted
// word by word, inside the site's own shell. It used to be a standalone page
// in public/; it reads the same committed JSON (`npm run blogs:wordcount`),
// and every number it shows comes from src/lib/writingLedger.js, with month-
// and year-to-date recomputed for today by src/lib/writingPeriod.js.

const useLedger = () => {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let alive = true;
    fetch("/data/writing-ledger.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`the data file returned ${r.status}`))))
      .then((data) => { if (alive) setState({ data, error: null }); })
      .catch((error) => { if (alive) setState({ data: null, error }); });
    return () => { alive = false; };
  }, []);
  return state;
};

const WritingLedger = () => {
  const { data, error } = useLedger();
  const m = useMemo(() => (data ? ledgerModel(data) : null), [data]);
  const period = useMemo(() => (data ? currentPeriod(data.posts) : null), [data]);
  const [topic, setTopic] = useState("");

  const pickTopic = useCallback((key) => {
    setTopic(key);
    const el = document.getElementById("wl-ledger-table");
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, []);

  const years = useMemo(() => (m ? m.byYear.map((y) => y.year) : []), [m]);
  const fresh = useMemo(() => (m ? [...m.posts].reverse().slice(0, 5) : []), [m]);

  let body;
  if (error) {
    body = <div className="wl-skeleton">The ledger could not be loaded ({error.message}). Reload to try again.</div>;
  } else if (!m) {
    body = <div className="wl-skeleton">Opening the ledger…</div>;
  } else {
    const silentYears = m.byYear.filter((y) => y.posts === 0).length;
    const topTopics = m.topics.slice(0, 3).map((t) => tagLabel(t.label));
    body = (
      <>
        <Cover m={m} period={period} />

        <Folio
          no="I"
          id="shelf"
          kicker="Every post, side by side"
          title="The shelf"
          note={<>All <b>{fmt(m.posts.length)}</b> posts as spines on a shelf, oldest on the left. The tall ones are the long reads; the thin early years are the ones where writing was occasional. Hover a spine for its title; click to read it.</>}
        >
          <Shelf posts={m.posts} />
        </Folio>

        <Folio
          no="II"
          id="calendar"
          kicker="Every day since the first post"
          title="The ink calendar"
          note={<>{fmt(m.daysSpan)} days, one square each. {m.posts.length} posts landed on {new Set(m.posts.map((p) => p.date)).size} of them{silentYears ? `, and ${silentYears} year${silentYears > 1 ? "s" : ""} stayed blank` : ""}. The right-hand rows fill up: <b>{m.currentStreak} months running</b> without a gap.</>}
        >
          <InkCalendar posts={m.posts} years={years} />
        </Folio>

        <Folio
          no="III"
          id="arc"
          kicker="Six years of words, accumulated"
          title="The long arc"
          note={<>For years the line barely moves. Then it bends: the first 25,000 words took until <b>{m.milestones[0]?.label || "—"}</b>; the last 25,000 took {(() => {
            const ms = m.milestones;
            if (ms.length < 2) return "a few months";
            const a = ms[ms.length - 2].month.split("-").map(Number);
            const b = ms[ms.length - 1].month.split("-").map(Number);
            const n = (b[0] - a[0]) * 12 + (b[1] - a[1]);
            return `${n} month${n === 1 ? "" : "s"}`;
          })()}.</>}
        >
          <Cumulative m={m} />
          <Years m={m} />
          <div style={{ marginTop: 16 }}><Months m={m} /></div>
        </Folio>

        <Folio
          no="IV"
          id="topics"
          kicker="What the words are about"
          title="Recurring themes"
          note={<>Tiles sized by the words written under each topic. <b style={{ textTransform: "capitalize" }}>{topTopics.join(", ")}</b> lead. A post carries several tags, so the shares add up to more than 100%. Press a tile to see its posts in the ledger below.</>}
        >
          <TopicMap topics={m.topics} onPick={pickTopic} />
          <div style={{ marginTop: 16 }}><TopicYears topics={m.topics} posts={m.posts} years={years} onPick={pickTopic} /></div>
        </Folio>

        <Folio
          no="V"
          id="rhythm"
          kicker="When, how long, where"
          title="The rhythm of a post"
        >
          <div className="wl-two">
            <WeekRose weekdays={m.weekdays} />
            <LengthRuler posts={m.posts} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Mix
              groups={[
                { key: "platform", title: "Platform", rows: m.platforms },
                { key: "language", title: "Language", rows: m.languages },
                { key: "format", title: "Format", rows: m.formats },
              ].filter((g) => g.rows.length)}
            />
          </div>
        </Folio>

        <Folio no="VI" id="records" kicker="The record book" title="Ledger entries of note">
          <Records m={m} />
        </Folio>

        <Folio no="VII" id="fresh" kicker="The latest entries" title="Fresh ink">
          <FreshInk posts={fresh} />
        </Folio>

        <Folio
          no="VIII"
          id="ledger"
          kicker="Every post on record"
          title="The full ledger"
          note="Every post counted above, searchable and sortable. Titles open the published piece on its own platform."
        >
          <LedgerTable
            posts={m.posts}
            years={years}
            platforms={m.platforms.map((p) => p.label)}
            topic={topic}
            setTopic={setTopic}
          />
        </Folio>

        <footer className="wl-colophon">
          <div>
            <h3>Sources</h3>
            <p>
              The Substack archive API and the WordPress.com public API, both read unauthenticated. Posts are dated by
              their own publish time in IST. The data is <a href="/data/writing-ledger.json">one JSON file</a>,
              generated {new Date(data.generatedAt).toISOString().slice(0, 10)}.
            </p>
          </div>
          <div>
            <h3>Two counting methods</h3>
            <p>
              Substack publishes its own word count per post, used as-is. WordPress has none, so those counts strip the
              HTML and split on whitespace. Close, not identical. Reading time assumes 238 words a minute.
            </p>
          </div>
          <div>
            <h3>Coverage</h3>
            <p>
              {fmt(m.tracked)} of {fmt(m.posts.length)} posts also have a row on this site&rsquo;s own
              {" "}<a href="/100-days-to-offload">100 Days</a> table; the totals count everything published.
              Unlabelled posts are read as English unless the title is in Devanagari.
            </p>
          </div>
        </footer>
      </>
    );
  }

  return (
    <PageShell region="writer">
      <div className="wl-root">{body}</div>
    </PageShell>
  );
};

export default WritingLedger;
