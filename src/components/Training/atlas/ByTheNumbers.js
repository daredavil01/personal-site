import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Fact, GROUP_ICONS, GroupViz, Inventory,
} from "../FactsParts";
import { useInView } from "../shared";
import { factsOf, inventory } from "../../../lib/trainingFacts";

// Groups with six-odd facts and a figure get the full row.
const WIDE = new Set(["volume", "habits", "bests"]);

// Atlas chapter: the same facts as the classic Facts tab on a night panel,
// group by group as they scroll in, numbers counting up; then the inventory
// of every variable behind a toggle.

const Group = ({ g, k }) => {
  const [ref, seen] = useInView(0.2);
  return (
    <section
      ref={ref}
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${seen ? "tr-rise" : ""} ${WIDE.has(g.id) ? "md:col-span-2" : ""}`}
      style={{ animationDelay: `${(k % 2) * 90}ms` }}
      aria-labelledby={`tr-num-${g.id}`}
    >
      <h3 id={`tr-num-${g.id}`} className="flex items-center gap-2 font-headline text-2xl mb-4" style={{ color: "var(--tr-ink)" }}>
        <span className="material-symbols-outlined" style={{ color: "var(--tr-accent)" }} aria-hidden="true">{GROUP_ICONS[g.id]}</span>
        {g.title}
      </h3>
      <div className={`grid gap-5 ${WIDE.has(g.id) ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        {g.facts.map((f) => <Fact key={f.label} f={f} dark animate={seen} />)}
      </div>
      {seen && <GroupViz group={g} dark />}
    </section>
  );
};
Group.propTypes = { g: PropTypes.shape({ id: PropTypes.string, title: PropTypes.string, facts: PropTypes.arrayOf(PropTypes.shape({})) }).isRequired, k: PropTypes.number.isRequired };

const ByTheNumbers = ({ rows }) => {
  const groups = useMemo(() => factsOf(rows), [rows]);
  const items = useMemo(() => inventory(rows), [rows]);
  const [open, setOpen] = useState(false);
  if (!groups.length) return null;
  const count = groups.reduce((n, g) => n + g.facts.length, 0);
  return (
    <section className="tr-night tr-stars px-4 py-8 md:px-10 md:py-10" aria-labelledby="tr-numbers-title">
      <p className="tr-kicker mb-2" style={{ color: "var(--tr-accent)" }}>By the numbers</p>
      <h2 id="tr-numbers-title" className="font-headline text-3xl md:text-5xl mb-1" style={{ color: "var(--tr-ink)" }}>
        {`${count} things the watch knows`}
      </h2>
      <p className="text-sm mb-6 max-w-xl" style={{ color: "var(--tr-muted)" }}>
        {`Drawn from ${items.length} variables across ${rows.length} activities — every second of heart rate, cadence, altitude and stride, boiled down.`}
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {groups.map((g, k) => <Group key={g.id} g={g} k={k} />)}
      </div>
      <div className="mt-6">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-full border tr-kicker"
          style={{ borderColor: "var(--tr-line)", color: "var(--tr-ink)" }}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">{open ? "expand_less" : "dataset"}</span>
          {open ? "Hide the variables" : `Every variable (${items.length})`}
        </button>
        {open && (
          <div className="mt-5 tr-rise">
            <Inventory items={items} total={rows.length} dark />
          </div>
        )}
      </div>
    </section>
  );
};

ByTheNumbers.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default ByTheNumbers;
