import React from "react";
import FormField, { inputClass } from "../FormField";
import { STAT_PRESETS, blankRow } from "./sectionSpecs";

const labelClass = "font-label text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400";
const ghostBtn = "self-start px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-700 rounded-lg";

/**
 * Repeatable object rows driven by a section spec — the same shape as
 * FormField's SlideImages, generalised over an arbitrary field list.
 */
export const RepeatableRows = ({ spec, value, onChange }) => {
  const rows = Array.isArray(value) ? value : [];
  const update = (i, name, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [name]: v } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <div
          // Rows have no stable id; index is the identity here, as in SlideImages.
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="border border-stone-200 dark:border-stone-700 rounded-lg p-3 flex flex-col gap-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {spec.fields.map((field) => (
              <div
                key={field.name}
                className={`flex flex-col gap-1 ${field.full ? "sm:col-span-2" : ""}`}
              >
                <span className={labelClass}>{field.label}{field.required ? " *" : ""}</span>
                <FormField
                  field={field}
                  value={row[field.name]}
                  onChange={(name, v) => update(i, name, v)}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="self-end text-xs font-bold uppercase tracking-wider text-red-600"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={ghostBtn}
        onClick={() => onChange([...rows, blankRow(spec)])}
      >
        + Add {spec.label.toLowerCase()}
      </button>
    </div>
  );
};

/** Plain string list, one item per line (sections.website / sections.misc). */
export const StringLines = ({ value, placeholder, onChange }) => (
  <textarea
    className={inputClass}
    rows={4}
    placeholder={placeholder}
    value={(Array.isArray(value) ? value : []).join("\n")}
    onChange={(e) => onChange(e.target.value.split("\n"))}
  />
);

const ApproximateToggle = ({ checked, onChange }) => (
  // The checkbox is nested directly inside this label.
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  <label className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 cursor-pointer">
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-stone-300 text-secondary focus:ring-secondary dark:border-stone-600 dark:bg-stone-800"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    Approximate (shows ~)
  </label>
);

/**
 * Stats: the two branded presets NowStatsSection styles by hand, plus any
 * number of free-form custom groups. Values are bare numbers — the component
 * appends the unit.
 */
export const StatsEditor = ({ value, onChange }) => {
  const stats = value || {};
  const custom = Array.isArray(stats.custom) ? stats.custom : [];

  const setGroup = (key, patch) => onChange({ ...stats, [key]: { ...(stats[key] || {}), ...patch } });
  const setCustom = (next) => onChange({ ...stats, custom: next });
  const patchCustom = (i, patch) => setCustom(custom.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));

  return (
    <div className="flex flex-col gap-4">
      {STAT_PRESETS.map((preset) => (
        <div key={preset.key} className="border border-stone-200 dark:border-stone-700 rounded-lg p-3 flex flex-col gap-2">
          <span className={labelClass}>{preset.label}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {preset.fields.map((field) => (
              <div key={field.name} className="flex flex-col gap-1">
                <span className={labelClass}>{field.label}</span>
                <FormField
                  field={{ name: field.name, type: "number" }}
                  value={stats[preset.key]?.[field.name] ?? ""}
                  onChange={(name, v) => setGroup(preset.key, { [name]: v })}
                />
              </div>
            ))}
          </div>
          <ApproximateToggle
            checked={stats[preset.key]?.approximate}
            onChange={(v) => setGroup(preset.key, { approximate: v })}
          />
        </div>
      ))}

      {custom.map((group, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="border border-stone-200 dark:border-stone-700 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <span className={labelClass}>Group name</span>
              <input
                className={inputClass}
                placeholder="e.g. Reading"
                value={group.label || ""}
                onChange={(e) => patchCustom(i, { label: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-red-600"
              onClick={() => setCustom(custom.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>

          {(group.tiles || []).map((tile, j) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={j} className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputClass} flex-1 min-w-[140px]`}
                placeholder="Label"
                value={tile.label || ""}
                onChange={(e) => patchCustom(i, {
                  tiles: group.tiles.map((t, idx) => (idx === j ? { ...t, label: e.target.value } : t)),
                })}
              />
              <input
                className={`${inputClass} w-24`}
                placeholder="Value"
                value={tile.value ?? ""}
                onChange={(e) => patchCustom(i, {
                  tiles: group.tiles.map((t, idx) => (idx === j ? { ...t, value: e.target.value } : t)),
                })}
              />
              <input
                className={`${inputClass} w-20`}
                placeholder="Unit"
                value={tile.unit || ""}
                onChange={(e) => patchCustom(i, {
                  tiles: group.tiles.map((t, idx) => (idx === j ? { ...t, unit: e.target.value } : t)),
                })}
              />
              <button
                type="button"
                className="px-2 py-2 text-xs text-red-600"
                onClick={() => patchCustom(i, { tiles: group.tiles.filter((_, idx) => idx !== j) })}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              className={ghostBtn}
              onClick={() => patchCustom(i, { tiles: [...(group.tiles || []), { label: "", value: "", unit: "" }] })}
            >
              + Add tile
            </button>
            <ApproximateToggle
              checked={group.approximate}
              onChange={(v) => patchCustom(i, { approximate: v })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        className={ghostBtn}
        onClick={() => setCustom([...custom, { label: "", approximate: false, tiles: [{ label: "", value: "", unit: "" }] }])}
      >
        + Add stat group
      </button>
    </div>
  );
};

export default RepeatableRows;
