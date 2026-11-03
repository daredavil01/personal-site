import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  Fact, GROUP_ICONS, GroupViz, Inventory,
} from "../FactsParts";
import { factsOf, inventory } from "../../../lib/trainingFacts";

// Groups with six-odd facts and a figure get the full row.
const WIDE = new Set(["volume", "habits", "bests"]);

// The classic Facts tab: every fact the log supports, grouped, each best
// linking to its activity; then every variable the import keeps and how many
// activities carry it. Computed from the rows on the page (src/lib/trainingFacts.js).

const Facts = ({ rows }) => {
  const groups = useMemo(() => factsOf(rows), [rows]);
  const items = useMemo(() => inventory(rows), [rows]);
  const count = groups.reduce((n, g) => n + g.facts.length, 0);
  return (
    <div className="flex flex-col gap-6">
      <p className="font-body text-lg text-stone-600 dark:text-stone-300 mb-0">
        <span className="font-headline text-3xl text-stone-900 dark:text-stone-100">{count}</span>
        {` facts, drawn from ${items.length} variables across ${rows.length} activities.`}
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        {groups.map((g, k) => (
          <section
            key={g.id}
            className={`rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-5 md:p-6 tr-rise ${WIDE.has(g.id) ? "md:col-span-2" : ""}`}
            style={{ animationDelay: `${k * 70}ms` }}
            aria-labelledby={`tr-facts-${g.id}`}
          >
            <h2 id={`tr-facts-${g.id}`} className="flex items-center gap-2 font-headline text-2xl text-stone-900 dark:text-stone-100 mb-4">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">{GROUP_ICONS[g.id]}</span>
              {g.title}
            </h2>
            <div className={`grid gap-5 ${WIDE.has(g.id) ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
              {g.facts.map((f) => <Fact key={f.label} f={f} />)}
            </div>
            <GroupViz group={g} />
          </section>
        ))}
      </div>
      <section className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-5 md:p-6" aria-labelledby="tr-facts-inventory">
        <h2 id="tr-facts-inventory" className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-1">What the watch records</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">
          Every variable the import keeps, and how many of the activities carry it. Positions stay private; everything else here is public.
        </p>
        <Inventory items={items} total={rows.length} />
      </section>
    </div>
  );
};

Facts.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({})).isRequired };

export default Facts;
