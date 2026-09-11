import React from "react";
import PropTypes from "prop-types";
import { colorForTag } from "../../lib/generativeArt";

// Tech-stack chips. Colors come from colorForTag — the same hash the tag system
// uses — so a tech chip and a tag chip read as one family. Tech has no stored
// color, so it always takes the hashed hue.
//
// With `onToggle` these render as real filter buttons (aria-pressed); without
// it they are static labels.
const SIZES = {
  xs: "text-[10px] px-2 py-0.5",
  sm: "text-[11px] px-2.5 py-1",
  md: "text-xs px-3 py-1.5",
};

const TechChips = ({
  tech, size, max, active, onToggle, className,
}) => {
  const list = (tech ?? []).filter(Boolean);
  if (!list.length) return null;

  const shown = max ? list.slice(0, max) : list;
  const overflow = list.length - shown.length;
  const activeSet = new Set((active ?? []).map((t) => t.toLowerCase()));
  const sizeClass = SIZES[size] ?? SIZES.sm;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {shown.map((name) => {
        const isActive = activeSet.has(name.toLowerCase());
        const color = colorForTag(name);
        const style = isActive
          ? { backgroundColor: color, borderColor: color, color: "#fff" }
          : { borderColor: `${color}66`, color };
        const base = `font-label uppercase tracking-wider rounded-full border transition-colors ${sizeClass}`;

        if (!onToggle) {
          return (
            <span key={name} className={base} style={style}>{name}</span>
          );
        }
        return (
          <button
            key={name}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(name)}
            className={`${base} cursor-pointer hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1`}
            style={style}
          >
            {name}
          </button>
        );
      })}
      {overflow > 0 && (
        <span className={`font-label text-stone-400 dark:text-stone-500 ${sizeClass}`}>{`+${overflow}`}</span>
      )}
    </div>
  );
};

TechChips.propTypes = {
  tech: PropTypes.arrayOf(PropTypes.string),
  size: PropTypes.oneOf(["xs", "sm", "md"]),
  max: PropTypes.number,
  active: PropTypes.arrayOf(PropTypes.string),
  onToggle: PropTypes.func,
  className: PropTypes.string,
};

TechChips.defaultProps = {
  tech: [],
  size: "sm",
  max: null,
  active: null,
  onToggle: null,
  className: "",
};

export default TechChips;
