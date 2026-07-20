import React, { useMemo } from "react";

// The river — the archive's pulse as one thin bar per month, oldest to newest,
// gaps included so quiet years read as quiet. Each bar is also a filter:
// clicking narrows the archive to that month; clicking again clears it.
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const nextMonthKey = (key) => {
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

const MonthRiver = ({ months, activeMonth, onSelect }) => {
  // Fill calendar gaps between the first and last posting month with zeros so
  // the strip is honest time, not just a list of busy months.
  const series = useMemo(() => {
    if (!months.length) return [];
    const byKey = new Map(months.map(({ key, count }) => [key, count]));
    const out = [];
    const last = months[months.length - 1].key;
    for (let { key } = months[0]; ; key = nextMonthKey(key)) {
      out.push({ key, count: byKey.get(key) || 0 });
      if (key === last) break;
      if (out.length > 600) break; // corrupt data guard
    }
    return out;
  }, [months]);

  const max = useMemo(() => Math.max(...series.map((m) => m.count), 1), [series]);

  if (!series.length) return null;

  return (
    <div className="overflow-x-auto pb-1" role="group" aria-label="Posts per month — click a bar to filter the archive to that month">
      <div className="flex items-end gap-[3px] h-[68px] min-w-max pt-1">
        {series.map(({ key, count }) => {
          const isActive = activeMonth === key;
          const isJanuary = key.endsWith("-01");
          let barColor = "bg-stone-200 dark:bg-stone-700";
          if (isActive) barColor = "bg-stone-900 dark:bg-stone-100";
          else if (count > 0) barColor = "bg-secondary/80 hover:bg-secondary";
          return (
            <div key={key} className="flex flex-col items-center justify-end h-full shrink-0">
              <div
                role="button"
                tabIndex={count > 0 ? 0 : -1}
                aria-label={`${key}: ${count} posts`}
                aria-pressed={isActive}
                title={`${key} · ${count} post${count === 1 ? "" : "s"}`}
                onClick={() => count > 0 && onSelect(isActive ? null : key)}
                onKeyDown={keyActivate(() => count > 0 && onSelect(isActive ? null : key))}
                className={`w-[9px] rounded-t-[2px] transition-colors ${
                  count > 0 ? "cursor-pointer" : ""
                } ${barColor}`}
                style={{ height: `${count > 0 ? 8 + (count / max) * 48 : 3}px` }}
              />
              <span
                className={`font-mono text-[8px] leading-none mt-1 h-[8px] ${
                  isJanuary ? "text-stone-400 dark:text-stone-500" : "text-transparent"
                }`}
              >
                {isJanuary ? key.slice(0, 4) : "·"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthRiver;
