import React from "react";
import FormField from "../FormField";
import Button, { IconButton } from "../ui/Button";
import Field from "../ui/Field";
import { Checkbox, Input, Textarea } from "../ui/Input";
import { Plus, Trash2 } from "../ui/icons";
import { hairline, labelClass } from "../ui/tokens";
import { STAT_PRESETS, blankRow } from "./sectionSpecs";

const rowClass = `border ${hairline} rounded-md p-3 flex flex-col gap-2`;

/**
 * Repeatable object rows driven by a section spec — the same shape as
 * FormField's SlideImages, generalised over an arbitrary field list.
 */
export const RepeatableRows = ({ spec, value, folder, onChange }) => {
  const rows = Array.isArray(value) ? value : [];
  const update = (i, name, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [name]: v } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        // Rows have no stable id; index is the identity here, as in SlideImages.
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className={rowClass}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {spec.fields.map((field) => (
              <Field
                key={field.name}
                label={field.label}
                required={field.required}
                hint={field.hint}
                span={field.full ? "full" : "half"}
              >
                <FormField
                  field={field}
                  value={row[field.name]}
                  folder={folder}
                  onChange={(name, v) => update(i, name, v)}
                />
              </Field>
            ))}
          </div>
          <Button
            size="xs"
            variant="dangerGhost"
            icon={Trash2}
            className="self-end"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        icon={Plus}
        className="self-start"
        onClick={() => onChange([...rows, blankRow(spec)])}
      >
        {`Add ${spec.label.toLowerCase()}`}
      </Button>
    </div>
  );
};

/** Plain string list, one item per line (sections.website / sections.misc). */
export const StringLines = ({ value, placeholder, onChange }) => (
  <Textarea
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
    <Checkbox checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
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
    <div className="flex flex-col gap-3">
      {STAT_PRESETS.map((preset) => (
        <div key={preset.key} className={rowClass}>
          <span className={labelClass}>{preset.label}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {preset.fields.map((field) => (
              <Field key={field.name} label={field.label}>
                <FormField
                  field={{ name: field.name, type: "number" }}
                  value={stats[preset.key]?.[field.name] ?? ""}
                  onChange={(name, v) => setGroup(preset.key, { [name]: v })}
                />
              </Field>
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
        <div key={i} className={rowClass}>
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <Field label="Group name">
                <Input
                  placeholder="e.g. Reading"
                  value={group.label || ""}
                  onChange={(e) => patchCustom(i, { label: e.target.value })}
                />
              </Field>
            </div>
            <IconButton
              icon={Trash2}
              label={`Remove ${group.label || "group"}`}
              variant="dangerGhost"
              onClick={() => setCustom(custom.filter((_, idx) => idx !== i))}
            />
          </div>

          {(group.tiles || []).map((tile, j) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={j} className="flex flex-wrap items-center gap-2">
              <Input
                className="flex-1 min-w-[140px]"
                placeholder="Label"
                aria-label="Tile label"
                value={tile.label || ""}
                onChange={(e) => patchCustom(i, {
                  tiles: group.tiles.map((t, idx) => (idx === j ? { ...t, label: e.target.value } : t)),
                })}
              />
              <Input
                className="w-24"
                placeholder="Value"
                aria-label="Tile value"
                value={tile.value ?? ""}
                onChange={(e) => patchCustom(i, {
                  tiles: group.tiles.map((t, idx) => (idx === j ? { ...t, value: e.target.value } : t)),
                })}
              />
              <Input
                className="w-20"
                placeholder="Unit"
                aria-label="Tile unit"
                value={tile.unit || ""}
                onChange={(e) => patchCustom(i, {
                  tiles: group.tiles.map((t, idx) => (idx === j ? { ...t, unit: e.target.value } : t)),
                })}
              />
              <IconButton
                icon={Trash2}
                label={`Remove tile ${j + 1}`}
                size="sm"
                variant="dangerGhost"
                onClick={() => patchCustom(i, { tiles: group.tiles.filter((_, idx) => idx !== j) })}
              />
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button
              size="sm"
              icon={Plus}
              onClick={() => patchCustom(i, { tiles: [...(group.tiles || []), { label: "", value: "", unit: "" }] })}
            >
              Add tile
            </Button>
            <ApproximateToggle
              checked={group.approximate}
              onChange={(v) => patchCustom(i, { approximate: v })}
            />
          </div>
        </div>
      ))}

      <Button
        size="sm"
        icon={Plus}
        className="self-start"
        onClick={() => setCustom([...custom, { label: "", approximate: false, tiles: [{ label: "", value: "", unit: "" }] }])}
      >
        Add stat group
      </Button>
    </div>
  );
};

export default RepeatableRows;
