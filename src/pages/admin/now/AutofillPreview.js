import React, { useEffect, useState } from "react";
import { inputClass } from "../FormField";

// Shared "here's what I found — pick what you want" panel for both month
// auto-fills (content records and changelog highlights). Nothing is applied
// until Apply is pressed, and existing section content is never overwritten.
//
// groups: [{ key, label, note?, items: [{ id, text, meta?, checked, editable? }] }]
// onApply receives the same shape, filtered to checked items with edited text.

const AutofillPreview = ({
  title, groups, emptyMessage, onApply, onCancel,
}) => {
  const [state, setState] = useState(groups);
  useEffect(() => setState(groups), [groups]);

  const total = state.reduce((n, g) => n + g.items.length, 0);
  const selected = state.reduce((n, g) => n + g.items.filter((i) => i.checked).length, 0);

  const patch = (groupKey, id, changes) => setState((prev) => prev.map((g) => (
    g.key === groupKey
      ? { ...g, items: g.items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }
      : g
  )));

  const setAll = (checked) => setState((prev) => prev.map((g) => ({
    ...g, items: g.items.map((i) => ({ ...i, checked })),
  })));

  const apply = () => onApply(
    state
      .map((g) => ({ ...g, items: g.items.filter((i) => i.checked) }))
      .filter((g) => g.items.length),
  );

  return (
    <div className="flex flex-col gap-4 border border-secondary/40 rounded-xl p-5 bg-secondary/[0.03]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-headline text-lg text-stone-900 dark:text-stone-100 mb-0">{title}</h3>
        {total > 0 && (
          <span className="flex items-center gap-3">
            <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {selected} of {total} selected
            </span>
            <button type="button" onClick={() => setAll(true)} className="text-xs font-bold uppercase tracking-wider text-secondary">All</button>
            <button type="button" onClick={() => setAll(false)} className="text-xs font-bold uppercase tracking-wider text-stone-500">None</button>
          </span>
        )}
      </div>

      {total === 0 && (
        <p className="text-sm text-stone-500 dark:text-stone-400 italic mb-0">{emptyMessage}</p>
      )}

      {state.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {group.label}
            {group.note && <span className="normal-case tracking-normal text-stone-400"> · {group.note}</span>}
          </span>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-2 h-4 w-4 shrink-0 rounded border-stone-300 text-secondary focus:ring-secondary dark:border-stone-600 dark:bg-stone-800"
                  checked={item.checked}
                  onChange={(e) => patch(group.key, item.id, { checked: e.target.checked })}
                  aria-label={`Include ${item.text}`}
                />
                <div className="flex-1 min-w-0">
                  {item.editable ? (
                    <input
                      className={inputClass}
                      value={item.text}
                      onChange={(e) => patch(group.key, item.id, { text: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-stone-800 dark:text-stone-200 mb-0">{item.text}</p>
                  )}
                  {item.meta && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 mb-0">{item.meta}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={selected === 0}
          className="px-4 py-2 bg-secondary text-white rounded-lg font-label text-xs uppercase tracking-widest font-bold disabled:opacity-40"
        >
          Apply {selected > 0 ? selected : ""}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-stone-200 dark:bg-stone-700 rounded-lg font-label text-xs uppercase tracking-widest font-bold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AutofillPreview;
