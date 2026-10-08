import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { ENTITY_TYPES, tagPath } from "../../lib/api/tags";
import { ENTITY_PLURALS } from "../../data/askConfig";
import { colorForTag } from "../../lib/generativeArt";
import { fmt } from "./features";

// Sheet A-06: the central tag table, drawn as a loom. Collections are the
// warp on the left, the most-used tags the weft on the right, and every thread
// is the number of rows of that type carrying that tag — live, from the same
// /api/stats snapshot the /stats page renders. The micro-blog carries most of
// the threads, so it can be lifted off the loom to see the rest.

const TOP = 16;
const LEFT_X = 230;
const RIGHT_X = 770;
const ROW = 30;
const PAD = 34;

const activate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const plural = (type) => ENTITY_PLURALS[type] || type;

const TagLoom = ({ tags, loading }) => {
  const navigate = useNavigate();
  const [withMicro, setWithMicro] = useState(true);
  const [focus, setFocus] = useState(null); // { kind: "tag" | "type", key }

  const loom = useMemo(() => {
    const types = ENTITY_TYPES.filter((t) => withMicro || t !== "microblog");
    const count = (tag, type) => Number((tag.counts || {})[type]) || 0;
    const rows = (tags || [])
      .map((tag) => ({ ...tag, weight: types.reduce((sum, type) => sum + count(tag, type), 0) }))
      .filter((tag) => tag.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, TOP);
    const usedTypes = types.filter((type) => rows.some((tag) => count(tag, type) > 0));
    const threads = rows.flatMap((tag) => usedTypes
      .map((type) => ({ tag: tag.name, type, n: count(tag, type), color: colorForTag(tag.name, tag.color) }))
      .filter((t) => t.n > 0));
    const max = Math.max(1, ...threads.map((t) => t.n));
    const typeTotals = Object.fromEntries(usedTypes.map((type) => [
      type, threads.filter((t) => t.type === type).reduce((sum, t) => sum + t.n, 0),
    ]));
    return { rows, usedTypes, threads, max, typeTotals };
  }, [tags, withMicro]);

  if (loading) {
    return <p className="bp-mono text-xs bp-soft bp-blink m-0">Measuring the threads…</p>;
  }
  if (!loom.rows.length) {
    return <p className="font-body text-sm bp-soft m-0">The tag counts are unavailable right now.</p>;
  }

  const { rows, usedTypes, threads, max, typeTotals } = loom;
  const height = PAD * 2 + Math.max(rows.length, usedTypes.length) * ROW;
  const tagY = (i) => PAD + (i + 0.5) * ((height - PAD * 2) / rows.length);
  const typeY = (i) => PAD + (i + 0.5) * ((height - PAD * 2) / usedTypes.length);
  const yOfTag = Object.fromEntries(rows.map((t, i) => [t.name, tagY(i)]));
  const yOfType = Object.fromEntries(usedTypes.map((t, i) => [t, typeY(i)]));

  const involved = (thread) => !focus
    || (focus.kind === "tag" && thread.tag === focus.key)
    || (focus.kind === "type" && thread.type === focus.key);

  // The readout under the loom says, in words, what the focused end holds.
  let readout = `${rows.length} most-used tags across ${usedTypes.length} collections, ${fmt(threads.reduce((s, t) => s + t.n, 0)) || 0} links in all.`;
  if (focus && focus.kind === "tag") {
    const tag = rows.find((t) => t.name === focus.key);
    const parts = threads.filter((t) => t.tag === focus.key).sort((a, b) => b.n - a.n)
      .map((t) => `${fmt(t.n)} ${plural(t.type)}`);
    readout = `${tag ? tag.displayName || tag.name : focus.key}: ${parts.join(" · ")}. Press to open the tag.`;
  } else if (focus && focus.kind === "type") {
    const top = threads.filter((t) => t.type === focus.key).sort((a, b) => b.n - a.n).slice(0, 3)
      .map((t) => `${t.tag} (${fmt(t.n)})`);
    readout = `${plural(focus.key)}: ${fmt(typeTotals[focus.key])} tag links among these, most often ${top.join(", ")}.`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={withMicro}
          onClick={() => { setWithMicro((v) => !v); setFocus(null); }}
          className="bp-chip bp-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5"
        >
          {`${withMicro ? "●" : "○"} include the micro-blog`}
        </button>
        <p className="bp-mono text-[11px] bp-ink m-0 flex-1 min-w-[14rem]" aria-live="polite">{readout}</p>
      </div>

      <div className="bp-scroll">
        <svg viewBox={`0 0 1000 ${height}`} className="w-full min-w-[720px] h-auto block" role="group" aria-label="Tags woven across collections">
          {/* Beams the warp and weft hang from. */}
          <line x1={LEFT_X} y1={PAD - 12} x2={LEFT_X} y2={height - PAD + 12} className="bp-stroke" strokeWidth="5" />
          <line x1={RIGHT_X} y1={PAD - 12} x2={RIGHT_X} y2={height - PAD + 12} className="bp-stroke" strokeWidth="5" />
          <text x={LEFT_X} y={PAD - 18} textAnchor="middle" className="bp-svg-label bp-fill-soft" fontSize="10">Collections</text>
          <text x={RIGHT_X} y={PAD - 18} textAnchor="middle" className="bp-svg-label bp-fill-soft" fontSize="10">Tags</text>

          {threads
            .slice()
            .sort((a, b) => Number(involved(a)) - Number(involved(b)))
            .map((t) => {
              const y1 = yOfType[t.type];
              const y2 = yOfTag[t.tag];
              let opacity = 0.06;
              if (involved(t)) opacity = focus ? 0.9 : 0.5;
              return (
                <path
                  key={`${t.type}-${t.tag}`}
                  d={`M${LEFT_X},${y1} C${(LEFT_X + RIGHT_X) / 2},${y1} ${(LEFT_X + RIGHT_X) / 2},${y2} ${RIGHT_X},${y2}`}
                  fill="none"
                  stroke={t.color}
                  strokeWidth={1 + 11 * Math.sqrt(t.n / max)}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  style={{ transition: "stroke-opacity 0.2s" }}
                />
              );
            })}

          {usedTypes.map((type) => (
            <g
              key={type}
              className="bp-hit"
              role="button"
              tabIndex={0}
              aria-label={`${plural(type)}: ${typeTotals[type]} tag links`}
              onMouseEnter={() => setFocus({ kind: "type", key: type })}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus({ kind: "type", key: type })}
              onBlur={() => setFocus(null)}
              onClick={() => setFocus({ kind: "type", key: type })}
              onKeyDown={activate(() => setFocus({ kind: "type", key: type }))}
            >
              <rect className="bp-hit-shape" x={20} y={yOfType[type] - 14} width={LEFT_X - 20} height="28" />
              <circle cx={LEFT_X} cy={yOfType[type]} r="6" className="bp-fill-paper bp-stroke" strokeWidth="2" />
              <text x={LEFT_X - 16} y={yOfType[type] - 1} textAnchor="end" className="bp-svg-label bp-fill-ink" fontSize="11">
                {plural(type)}
              </text>
              <text x={LEFT_X - 16} y={yOfType[type] + 12} textAnchor="end" className="bp-svg-mono bp-fill-soft" fontSize="10">
                {`${fmt(typeTotals[type])} links`}
              </text>
            </g>
          ))}

          {rows.map((tag) => {
            const color = colorForTag(tag.name, tag.color);
            const open = () => navigate(tagPath(tag.name));
            return (
              <g
                key={tag.name}
                className="bp-hit"
                role="link"
                tabIndex={0}
                aria-label={`Tag ${tag.displayName || tag.name}, ${tag.weight} links. Open the tag page.`}
                onMouseEnter={() => setFocus({ kind: "tag", key: tag.name })}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus({ kind: "tag", key: tag.name })}
                onBlur={() => setFocus(null)}
                onClick={open}
                onKeyDown={activate(open)}
              >
                <rect className="bp-hit-shape" x={RIGHT_X} y={yOfTag[tag.name] - 13} width={1000 - RIGHT_X - 10} height="26" />
                <circle cx={RIGHT_X} cy={yOfTag[tag.name]} r="7" fill={color} className="bp-stroke" strokeWidth="1.5" />
                <text x={RIGHT_X + 16} y={yOfTag[tag.name] + 4} className="bp-svg-mono bp-fill-ink" fontSize="12">
                  {tag.displayName || tag.name}
                </text>
                <text x={985} y={yOfTag[tag.name] + 4} textAnchor="end" className="bp-svg-mono bp-fill-soft" fontSize="11">
                  {fmt(tag.weight)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

TagLoom.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.shape({})),
  loading: PropTypes.bool,
};

TagLoom.defaultProps = {
  tags: null,
  loading: false,
};

export default TagLoom;
