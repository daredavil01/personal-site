import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTags } from "../../context/ContentContext";
import { tagPath } from "../../lib/api/tags";

// The Stats page's tag appendix, read from the central tag tables
// (tags_with_counts) rather than three per-table tag dumps: how many themes,
// which ones run through the whole archive, and where each content type's tags
// sit. Shared by StatsAlmanac and StatsClassic.
//
// Content-type colors are categorical slots 1–7 of the dataviz reference
// palette in fixed order, validated for CVD separation on white (light) and
// stone-900 (dark). Several sit under 3:1 on white, so every bar carries a text
// label and the per-type table below is the table view.
const TYPES = [
  { key: "blog", label: "Blogs", swatch: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  { key: "book", label: "Books", swatch: "bg-[#eb6834] dark:bg-[#d95926]" },
  { key: "microblog", label: "Micro-posts", swatch: "bg-[#1baf7a] dark:bg-[#199e70]" },
  { key: "instagram", label: "Instagram", swatch: "bg-[#eda100] dark:bg-[#c98500]" },
  { key: "sport", label: "Races", swatch: "bg-[#e87ba4] dark:bg-[#d55181]" },
  { key: "trek", label: "Treks", swatch: "bg-[#008300] dark:bg-[#008300]" },
  { key: "project", label: "Projects", swatch: "bg-[#4a3aa7] dark:bg-[#9085e9]" },
];

const TOP_THEMES = 12;
const TOP_BRIDGES = 8;

// The challenge's own marker tag is on every 100 Days post; it's bookkeeping,
// not a theme, so it would only drown the chart.
const isChallengeTag = (name) => name === "100_days_to_offload";

const labelOf = (t) => t.displayName || t.name;
const typesOf = (t) => TYPES.filter((type) => t.counts[type.key] > 0);

const overline = "font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-500 font-bold mb-4";

const TagAnalysis = () => {
  const { data: tags, loading, error } = useTags();

  const stats = useMemo(() => {
    const used = tags.filter((t) => t.total > 0 && !isChallengeTag(t.name));
    const links = used.reduce((n, t) => n + t.total, 0);
    const bridges = used
      .filter((t) => typesOf(t).length >= 2)
      .sort((a, b) => typesOf(b).length - typesOf(a).length || b.total - a.total);
    const perType = TYPES.map((type) => {
      const withType = used
        .filter((t) => t.counts[type.key] > 0)
        .sort((a, b) => b.counts[type.key] - a.counts[type.key]);
      return {
        ...type,
        tags: withType.length,
        links: withType.reduce((n, t) => n + t.counts[type.key], 0),
        top: withType.slice(0, 3),
      };
    }).filter((type) => type.tags > 0);
    return {
      used,
      links,
      bridges,
      perType,
      once: used.filter((t) => t.total === 1).length,
      top: used.slice(0, TOP_THEMES), // already sorted by total
    };
  }, [tags]);

  if (loading && !tags.length) {
    return <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 mb-0">Loading tags…</p>;
  }
  if (error || !stats.used.length) {
    return <p className="font-body text-sm text-stone-500 mb-0">Tag data isn&apos;t available right now.</p>;
  }

  const { used, links, bridges, perType, once, top } = stats;
  const max = top[0].total;
  const presentTypes = perType.map((p) => p.key);

  const kpis = [
    { value: used.length, label: "Themes in use" },
    { value: links, label: "Tag links" },
    { value: bridges.length, label: "Cross-content themes" },
    { value: `${Math.round((once / used.length) * 100)}%`, label: "Used only once" },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ value, label }) => (
          <div key={label} className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800">
            <div className="font-headline text-3xl text-stone-900 dark:text-stone-100">{value}</div>
            <div className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Most-used themes, split by where they're used */}
        <div className="xl:col-span-7">
          <p className={overline}>Most-used themes · by content type</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-5" aria-label="Legend">
            {TYPES.filter((type) => presentTypes.includes(type.key)).map((type) => (
              <span key={type.key} className="inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest text-stone-600 dark:text-stone-400">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${type.swatch}`} />
                {type.label}
              </span>
            ))}
          </div>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
            {top.map((t) => {
              const parts = typesOf(t);
              const breakdown = parts.map((type) => `${type.label} ${t.counts[type.key]}`).join(" · ");
              return (
                <li key={t.id} className="m-0 grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3">
                  <Link
                    to={tagPath(t.name)}
                    className="font-body text-xs text-stone-700 dark:text-stone-300 hover:text-secondary truncate no-underline"
                    title={labelOf(t)}
                  >
                    {labelOf(t)}
                  </Link>
                  <div
                    className="h-2.5 flex gap-[2px]"
                    style={{ width: `${(t.total / max) * 100}%` }}
                    role="img"
                    aria-label={`${labelOf(t)}: ${t.total} — ${breakdown}`}
                    title={breakdown}
                  >
                    {parts.map((type, i) => (
                      <span
                        key={type.key}
                        className={`h-full ${type.swatch} ${i === 0 ? "rounded-l-[4px]" : ""} ${i === parts.length - 1 ? "rounded-r-[4px]" : ""}`}
                        style={{ flexGrow: t.counts[type.key], flexBasis: 0 }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400 text-right">{t.total}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Themes that cross the most content types */}
        <div className="xl:col-span-5">
          <p className={overline}>Bridges · themes spanning content types</p>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {bridges.slice(0, TOP_BRIDGES).map((t) => (
              <li key={t.id} className="m-0">
                <Link
                  to={tagPath(t.name)}
                  className="group flex flex-col gap-1 px-3 py-2 rounded-lg border border-stone-100 dark:border-stone-800 hover:border-secondary/40 transition-colors no-underline"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-body text-sm text-stone-800 dark:text-stone-200 group-hover:text-secondary truncate">{labelOf(t)}</span>
                    <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400 shrink-0">{t.total}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {typesOf(t).map((type) => (
                      <span key={type.key} className="inline-flex items-center gap-1 font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400">
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${type.swatch}`} />
                        {`${type.label} ${t.counts[type.key]}`}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Per-type table — also the chart's table view */}
      <div className="overflow-x-auto">
        <p className={overline}>By content type</p>
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700">
              {["Type", "Themes", "Links", "Top themes"].map((h) => (
                <th key={h} className="py-2 pr-4 font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perType.map((type) => (
              <tr key={type.key} className="border-b border-stone-100 dark:border-stone-800">
                <td className="py-2.5 pr-4 font-body text-sm text-stone-800 dark:text-stone-200 whitespace-nowrap">
                  <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-sm mr-2 align-middle ${type.swatch}`} />
                  {type.label}
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs text-stone-600 dark:text-stone-300">{type.tags}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-stone-600 dark:text-stone-300">{type.links}</td>
                <td className="py-2.5 font-body text-xs text-stone-600 dark:text-stone-300">
                  {type.top.map((t, i) => (
                    <React.Fragment key={t.id}>
                      {i > 0 && ", "}
                      <Link to={tagPath(t.name)} className="hover:text-secondary no-underline">{labelOf(t)}</Link>
                      <span className="text-stone-400">{` ${t.counts[type.key]}`}</span>
                    </React.Fragment>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        to="/tags"
        className="self-start inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-secondary hover:opacity-80 no-underline"
      >
        {`Browse all ${used.length} themes`}
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </Link>
    </div>
  );
};

export default TagAnalysis;
