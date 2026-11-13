import React from "react";
import { Link } from "react-router-dom";
import routes from "../../data/routes";
import { HOME_DOORS } from "../../data/homeFeatures";
import useSiteStats from "../Stats/useSiteStats";
import SectionHeader from "../common/SectionHeader";

const groupLinks = (label) => routes.find((r) => r.label === label)?.subRoutes ?? [];

// A count is shown only when it is a real, positive number: an unknown total
// is omitted rather than drawn as 0.
const countsOf = (door, data) => door.counts
  .map(({ value, noun }) => ({ n: value(data), noun }))
  .filter(({ n }) => Number.isFinite(n) && n > 0);

// Four doors instead of a fifteen-card directory. Each is one nav group — its
// links are that group's, read from src/data/routes.js — with the live counts
// from the /api/stats snapshot.
const HomeDoors = () => {
  const { data } = useSiteStats();

  return (
    <section>
      <SectionHeader label="Find your way in" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {HOME_DOORS.map((door) => {
          const counts = countsOf(door, data);
          const links = groupLinks(door.group).filter((l) => l.path !== door.path);
          return (
            <article
              key={door.path}
              className="p-6 md:p-8 flex flex-col gap-4 bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-xl hover:border-secondary dark:hover:border-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary" aria-hidden="true">{door.icon}</span>
                <h3 className="font-headline text-2xl font-bold text-stone-900 dark:text-stone-100 mb-0">
                  <Link to={door.path} className="no-underline hover:text-secondary transition-colors">
                    {door.title}
                  </Link>
                </h3>
              </div>
              {counts.length > 0 && (
                <p className="mb-0 font-body text-base text-stone-700 dark:text-stone-300">
                  {counts.map(({ n, noun }, i) => (
                    <span key={noun}>
                      {i > 0 && <span aria-hidden="true"> · </span>}
                      <strong className="font-bold tabular-nums">{n.toLocaleString("en-IN")}</strong>
                      {" "}
                      {noun}
                    </span>
                  ))}
                </p>
              )}
              <p className="mb-0 font-body text-stone-500 dark:text-stone-400 leading-relaxed">{door.desc}</p>
              {links.length > 0 && (
                <ul className="list-none pl-0 m-0 flex flex-wrap gap-x-4 gap-y-2" aria-label={`More in ${door.title}`}>
                  {links.map((l) => (
                    <li key={l.path}>
                      <Link to={l.path} className="font-body text-sm text-stone-600 dark:text-stone-300 hover:text-secondary underline decoration-stone-300 dark:decoration-stone-600 underline-offset-4">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default HomeDoors;
