import React, { useRef } from "react";
import PropTypes from "prop-types";
import useImageExport from "../share/useImageExport";
import { monthSeries, pct } from "../../lib/microblogInsights";
import { colorForTag } from "../../lib/generativeArt";
import { fmt } from "./charts";

// One 4:5 card per year, made to be posted: the year, three numbers, its top
// tag, its tone, its months and one line I wrote that year. Colours are fixed
// rather than theme tokens so the PNG looks the same whoever downloads it.
// A number with no value is left out, never printed as 0.

const NO_COLORS = new Map();
// Four lines of the card. Trimmed here, not by CSS line-clamp: html-to-image
// drops the clamp's ellipsis, so the PNG would end mid-sentence.
const QUOTE_CHARS = 96;
const fitQuote = (q) => {
  const t = q.replace(/…$/, "");
  if (t.length <= QUOTE_CHARS && !q.endsWith("…")) return q;
  const cut = t.slice(0, QUOTE_CHARS);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 60)).replace(/[\s/,;:.]+$/, "")}…`;
};
const MOOD_HEX = {
  calm: "#2dd4bf", reflective: "#818cf8", striving: "#fbbf24", warm: "#fb7185", restless: "#94a3b8",
};

export const YearCard = ({ doc, year, tagColors }) => {
  const node = useRef(null);
  const { status, exportNode } = useImageExport();
  const s = doc.perYear[year];
  const worded = s.posts - (s.langs.none || 0);
  const night = s.timed >= 10 ? pct(s.night, s.timed) : null;
  const marathi = worded ? pct(s.langs.mr || 0, worded) : null;
  const months = monthSeries(doc, year);
  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const topTag = s.tags[0] ? s.tags[0][0] : null;
  const quote = doc.yearQuotes && doc.yearQuotes[year];
  let mood = null;
  if (doc.moods && doc.moods.years[year]) {
    const c = doc.moods.years[year];
    const total = c.reduce((a, b) => a + b, 0);
    if (total >= 10) {
      const i = c.indexOf(Math.max(...c));
      mood = { ...doc.moods.list[i], share: pct(c[i], total) };
    }
  }
  const numbers = [
    [fmt(s.posts), "posts"],
    night != null ? [`${night}%`, "after dark"] : null,
    marathi ? [`${marathi}%`, "in Marathi"] : null,
  ].filter(Boolean).slice(0, 3);
  const fileName = `micro-blog-${year}.png`;

  return (
    <div className="flex flex-col gap-2">
      <div ref={node} className="mb-yearcard">
        <span style={{ fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "#a5b4fc", fontWeight: 700 }}>My year in short posts</span>
        <span className="font-headline" style={{ fontSize: 64, lineHeight: 0.9, fontWeight: 900, color: "#fde68a" }}>{year}</span>
        <div style={{ display: "flex", gap: 18 }}>
          {numbers.map(([v, label]) => (
            <div key={label}>
              <div className="font-headline" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{v}</div>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a5b4fc" }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 34 }} aria-hidden="true">
          {months.map((m) => (
            <span key={m.key} style={{ flex: 1, height: `${Math.max(m.count ? 8 : 3, (m.count / maxMonth) * 100)}%`, background: m.count ? "#fde68a" : "rgba(224,231,255,0.15)", borderRadius: 2, opacity: m.count ? 0.85 : 1 }} />
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11 }}>
          {topTag && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 999, background: "rgba(224,231,255,0.1)" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: colorForTag(topTag, tagColors.get(topTag)) }} />
              {`#${topTag}`}
            </span>
          )}
          {mood && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 999, background: "rgba(224,231,255,0.1)" }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: MOOD_HEX[mood.id] || "#e0e7ff" }} />
              {`mostly ${mood.label.toLowerCase()}`}
            </span>
          )}
        </div>
        {quote && (
          <p className="font-headline" style={{ fontSize: 14, lineHeight: "20px", maxHeight: 80, flexShrink: 0, margin: 0, marginTop: "auto", fontStyle: quote.lang === "mr" ? "normal" : "italic", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {`“${fitQuote(quote.quote)}”`}
          </p>
        )}
        <span style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a5b4fc", marginTop: quote ? 0 : "auto" }}>sankettambare.in/micro-blog</span>
      </div>
      <div className="flex gap-2">
        <button type="button" className="mb-chip" disabled={status === "working"} onClick={() => exportNode(node.current, { fileName, title: `My ${year} in short posts` })}>
          <span aria-hidden="true" className="material-symbols-outlined text-[15px]">download</span>
          {status === "working" ? "Drawing…" : "PNG"}
        </button>
        <button type="button" className="mb-chip" disabled={status === "working"} onClick={() => exportNode(node.current, { fileName, title: `My ${year} in short posts`, mode: "share" })}>
          <span aria-hidden="true" className="material-symbols-outlined text-[15px]">ios_share</span>
          Share
        </button>
        {status === "error" && <span className="font-body text-xs mb-accent self-center">Could not draw it.</span>}
      </div>
    </div>
  );
};

const docShape = PropTypes.shape({
  perYear: PropTypes.objectOf(PropTypes.shape({})),
  yearQuotes: PropTypes.objectOf(PropTypes.shape({ quote: PropTypes.string, lang: PropTypes.string })),
  moods: PropTypes.shape({ list: PropTypes.arrayOf(PropTypes.shape({})), years: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.number)) }),
});

YearCard.propTypes = {
  doc: docShape.isRequired,
  year: PropTypes.string.isRequired,
  tagColors: PropTypes.instanceOf(Map),
};
YearCard.defaultProps = { tagColors: NO_COLORS };

const YearCards = ({ doc, tagColors }) => (
  <div className="mb-yearcards">
    {[...doc.years].reverse().map((y) => <YearCard key={y} doc={doc} year={y} tagColors={tagColors} />)}
  </div>
);
YearCards.propTypes = { doc: docShape.isRequired, tagColors: PropTypes.instanceOf(Map) };
YearCards.defaultProps = { tagColors: NO_COLORS };

export default YearCards;
