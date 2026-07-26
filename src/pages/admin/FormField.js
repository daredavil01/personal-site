import React, { useState } from "react";
import uploadImage from "../../lib/api/storage";

export const inputClass = "w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:border-secondary";

const UploadButton = ({ folder, onUploaded }) => {
  const [busy, setBusy] = useState(false);
  return (
    // The file input is nested directly inside this label (click-to-upload).
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label className="shrink-0 inline-flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-700 rounded-lg cursor-pointer hover:bg-stone-300 dark:hover:bg-stone-600">
      {busy ? "Uploading…" : "Upload"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const url = await uploadImage(file, folder);
            onUploaded(url);
          } catch (err) {
            // eslint-disable-next-line no-alert
            window.alert(`Upload failed: ${err.message}`);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
};

const SlideImages = ({ value, folder, onChange }) => {
  const rows = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} flex-1 min-w-[200px]`}
            placeholder="/images/... or uploaded URL"
            value={row.url || ""}
            onChange={(e) => update(i, { url: e.target.value })}
          />
          <input
            className={`${inputClass} w-32`}
            placeholder="Caption"
            value={row.caption || ""}
            onChange={(e) => update(i, { caption: e.target.value })}
          />
          <UploadButton folder={folder} onUploaded={(url) => update(i, { url })} />
          <button
            type="button"
            className="shrink-0 px-2 py-2 text-xs text-red-600"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="self-start px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-700 rounded-lg"
        onClick={() => onChange([...rows, { url: "", caption: `Slide ${rows.length + 1}` }])}
      >
        + Add image
      </button>
    </div>
  );
};

const JsonField = ({ value, onChange }) => {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState(null);
  return (
    <div>
      <textarea
        className={`${inputClass} font-mono text-xs ${error ? "border-red-500" : ""}`}
        rows={10}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setError(null);
          } catch (err) {
            setError(err.message);
          }
        }}
      />
      {error && <p className="text-xs text-red-600 mt-1 mb-0">Invalid JSON: {error}</p>}
    </div>
  );
};

// "February 22, 2026" → "2026-02-22"  (for input[type=date])
function toDateInput(str) {
  if (!str) return "";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "2026-02-22" → "February 22, 2026"  (stored format)
function fromDateInput(str) {
  if (!str) return "";
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

const SelectOrOther = ({ options, value, onChange }) => {
  const isOther = value && !options.includes(value);
  const selectVal = isOther ? "Other" : (value ?? "");
  return (
    <div className="flex flex-col gap-2">
      <select
        className={inputClass}
        value={selectVal}
        onChange={(e) => {
          if (e.target.value === "Other") onChange("");
          else onChange(e.target.value);
        }}
      >
        <option value="">—</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        <option value="Other">Other</option>
      </select>
      {(selectVal === "Other" || isOther) && (
        <input
          type="text"
          className={inputClass}
          placeholder="Enter custom distance"
          value={isOther ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
};

// Chip-style multi-tag editor. Type a tag and press Enter or comma to add it as
// a removable chip; Backspace on an empty input removes the last chip; pasting a
// comma-separated string adds each piece. Value stays a string[] (deduped,
// case-insensitive) so every consumer of `type: "tags"` is unchanged.
const TagInput = ({ value, onChange }) => {
  const [buffer, setBuffer] = useState("");
  const tags = Array.isArray(value) ? value : [];

  const addTags = (raw) => {
    const incoming = raw.split(",").map((t) => t.trim()).filter(Boolean);
    if (!incoming.length) return;
    const next = [...tags];
    incoming.forEach((tag) => {
      if (!next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) next.push(tag);
    });
    onChange(next);
  };

  const commit = () => {
    if (buffer.trim()) addTags(buffer);
    setBuffer("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !buffer && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className={`${inputClass} flex flex-wrap items-center gap-1.5 focus-within:border-secondary`}>
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded text-xs text-stone-700 dark:text-stone-200"
        >
          {tag}
          <button
            type="button"
            className="leading-none text-stone-400 hover:text-red-600"
            onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
            aria-label={`Remove ${tag}`}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[120px] bg-transparent text-sm text-stone-800 dark:text-stone-200 outline-none"
        placeholder={tags.length ? "" : "Type and press Enter"}
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text.includes(",")) {
            e.preventDefault();
            addTags(text);
          }
        }}
      />
    </div>
  );
};

const FormField = ({ field, value, folder, onChange }) => {
  const set = (v) => onChange(field.name, v);

  switch (field.type) {
    case "textarea":
      return <textarea className={inputClass} rows={3} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
    case "number":
      return <input type="number" className={inputClass} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
    case "url":
      return <input type="url" className={inputClass} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
    case "boolean":
      return (
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-stone-300 text-secondary focus:ring-secondary dark:border-stone-600 dark:bg-stone-800"
          checked={!!value}
          onChange={(e) => set(e.target.checked)}
        />
      );
    case "select":
      return (
        <select className={inputClass} value={value ?? ""} onChange={(e) => set(e.target.value)}>
          <option value="">—</option>
          {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case "tags":
      return <TagInput value={Array.isArray(value) ? value : []} onChange={set} />;
    case "stringList":
      return (
        <textarea
          className={inputClass}
          rows={4}
          placeholder="One item per line"
          value={(Array.isArray(value) ? value : []).join("\n")}
          onChange={(e) => set(e.target.value.split("\n"))}
        />
      );
    case "image":
      return (
        <div className="flex items-center gap-2">
          <input className={`${inputClass} flex-1`} value={value ?? ""} onChange={(e) => set(e.target.value)} />
          <UploadButton folder={folder} onUploaded={set} />
        </div>
      );
    case "date":
      return (
        <input
          type="date"
          className={inputClass}
          value={toDateInput(value)}
          onChange={(e) => set(fromDateInput(e.target.value))}
        />
      );
    // Like "date" but stores the picker's own "YYYY-MM-DD" value verbatim —
    // for columns that are real Postgres dates (microblog) or JSON fields the
    // Now components feed straight to new Date().
    case "isoDate":
      return (
        <input
          type="date"
          className={inputClass}
          disabled={field.disabled}
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
        />
      );
    case "selectOrOther":
      return <SelectOrOther options={field.options} value={value} onChange={set} />;
    case "slideImages":
      return <SlideImages value={value} folder={folder} onChange={set} />;
    case "json":
      return <JsonField value={value} onChange={set} />;
    default:
      return <input type="text" className={inputClass} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
  }
};

export default FormField;
