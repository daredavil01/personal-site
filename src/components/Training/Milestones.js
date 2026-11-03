import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { milestones } from "../../lib/training";
import { useInView } from "./shared";

// The road so far: firsts and round numbers as passport stamps along a
// dotted road, oldest on the left. Scrolls sideways; each stamp links to the
// activity that earned it.

const fmt = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const Milestones = ({ rows, dark }) => {
  const [ref, seen] = useInView(0.2);
  const list = useMemo(() => milestones(rows), [rows]);
  if (!list.length) return null;
  return (
    <div ref={ref} className="relative overflow-x-auto tr-scroll-x pb-3 -mx-1 px-1">
      <ol className="relative flex gap-5 pl-0 mb-0 list-none min-w-max pt-2">
        <span aria-hidden="true" className="absolute left-0 right-0 top-[4.4rem] border-t-2 border-dashed" style={{ borderColor: dark ? "#2a3a5a" : "var(--tr-line)" }} />
        {list.map((m, i) => {
          const first = m.kind === "first";
          const ink = first ? "#b22200" : "#2a78d6";
          return (
            <li key={`${m.label}${m.date}`} className={seen ? "tr-pop" : "opacity-0"} style={{ animationDelay: `${i * 110}ms` }}>
              <Link
                to={`/training/${m.row.id}`}
                className="group relative flex flex-col items-center w-32 no-underline"
                style={{ transform: `rotate(${((i * 37) % 11) - 5}deg)` }}
              >
                <span
                  className="w-28 h-28 rounded-full flex flex-col items-center justify-center text-center px-2 transition-transform group-hover:scale-110 group-hover:rotate-0"
                  style={{
                    border: `3px double ${ink}`,
                    color: ink,
                    background: dark ? "#0f1830" : "var(--tr-surface)",
                    boxShadow: `inset 0 0 0 5px ${dark ? "#0f1830" : "var(--tr-surface)"}, inset 0 0 0 6px ${ink}55`,
                  }}
                >
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">{first ? "military_tech" : "flag"}</span>
                  <span className="font-label text-[10px] uppercase tracking-wider font-extrabold leading-tight">{m.label}</span>
                </span>
                <span className="mt-2 font-label text-[10px] uppercase tracking-widest tabular-nums" style={{ color: dark ? "#8fa0bf" : "var(--tr-muted)" }}>{fmt(m.date)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

Milestones.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired, dark: PropTypes.bool };
Milestones.defaultProps = { dark: false };

export default Milestones;
