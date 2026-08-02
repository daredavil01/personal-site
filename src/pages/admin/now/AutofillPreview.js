import React, { useEffect, useState } from "react";
import Button from "../ui/Button";
import { Checkbox, Input } from "../ui/Input";
import { faintText, labelClass, mutedText } from "../ui/tokens";

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
    <div className="flex flex-col gap-4 border border-admin-300 dark:border-admin-800 rounded-xl p-4 bg-admin-50/60 dark:bg-admin-950/30">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold tracking-tight text-sm text-stone-900 dark:text-stone-50 mb-0">{title}</h3>
        {total > 0 && (
          <span className="flex items-center gap-2">
            <span className={`text-xs ${mutedText}`}>{`${selected} of ${total} selected`}</span>
            <Button size="xs" variant="ghost" onClick={() => setAll(true)}>All</Button>
            <Button size="xs" variant="ghost" onClick={() => setAll(false)}>None</Button>
          </span>
        )}
      </div>

      {total === 0 && <p className={`text-sm ${mutedText} mb-0`}>{emptyMessage}</p>}

      {state.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <span className={labelClass}>
            {group.label}
            {group.note && <span className={`font-normal ${faintText}`}>{` · ${group.note}`}</span>}
          </span>
          <ul className="flex flex-col gap-2 list-none pl-0 mb-0">
            {group.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <Checkbox
                  className="mt-2 shrink-0"
                  checked={item.checked}
                  onChange={(e) => patch(group.key, item.id, { checked: e.target.checked })}
                  aria-label={`Include ${item.text}`}
                />
                <div className="flex-1 min-w-0">
                  {item.editable ? (
                    <Input
                      value={item.text}
                      aria-label={`Text for ${item.meta || item.id}`}
                      onChange={(e) => patch(group.key, item.id, { text: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-stone-800 dark:text-stone-200 mb-0">{item.text}</p>
                  )}
                  {item.meta && <p className={`text-xs ${faintText} mt-0.5 mb-0`}>{item.meta}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={apply} disabled={selected === 0}>
          {selected > 0 ? `Apply ${selected}` : "Apply"}
        </Button>
        <Button size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default AutofillPreview;
