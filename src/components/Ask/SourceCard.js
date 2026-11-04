import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { entityLabel } from "../../data/askConfig";
import { colorForTag } from "../../lib/generativeArt";
import { isExternal } from "../../lib/askFormat";

// One retrieved page under an answer: its picture or a numbered dot in its
// tag's colour, title, kind and date. Shared by the launcher chat and /ask.
// `active` is the /ask page's cross-highlight with the answer's [n] markers.
const SourceCard = ({
  source, index, colors, active, className: extra,
}) => {
  const accent = colorForTag(
    source.tags?.[0] || source.entity_type,
    source.tags?.[0] ? colors.get(source.tags[0]) : null,
  );
  const className = `group flex items-start gap-3 rounded-xl border px-3 py-2 transition-colors ${
    active
      ? "border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-900"
      : "border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600"
  } ${extra}`;
  const body = (
    <>
      {source.image ? (
        <img
          src={source.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-10 w-10 shrink-0 rounded-md object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {index}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[13px] font-medium truncate group-hover:underline">
          {source.image ? `${index}. ` : ""}
          {source.title || "Untitled"}
        </span>
        <span className="block text-[11px] text-stone-500 dark:text-stone-400 truncate">
          {entityLabel(source.entity_type)}
          {source.date ? ` · ${source.date}` : ""}
          {source.domain ? ` · ${source.domain} ↗` : ""}
        </span>
      </span>
    </>
  );
  // Essays with no ledger row link out to Substack or WordPress.
  return isExternal(source.url) ? (
    <a href={source.url} target="_blank" rel="noreferrer" className={className}>{body}</a>
  ) : (
    <Link to={source.url || "/"} className={className}>{body}</Link>
  );
};

SourceCard.propTypes = {
  source: PropTypes.shape({
    entity_type: PropTypes.string,
    title: PropTypes.string,
    url: PropTypes.string,
    date: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  index: PropTypes.number.isRequired,
  colors: PropTypes.instanceOf(Map).isRequired,
  active: PropTypes.bool,
  className: PropTypes.string,
};

SourceCard.defaultProps = { active: false, className: "" };

export default SourceCard;
