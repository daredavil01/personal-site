import React, { useState } from "react";
import uploadImage from "../../lib/api/storage";

const inputClass = "w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:border-secondary";

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
          className="w-5 h-5 accent-[color:var(--color-secondary,#eb6c4f)]"
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
      return (
        <input
          className={inputClass}
          placeholder="Comma-separated"
          value={(Array.isArray(value) ? value : []).join(", ")}
          onChange={(e) => set(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
        />
      );
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
    case "slideImages":
      return <SlideImages value={value} folder={folder} onChange={set} />;
    case "json":
      return <JsonField value={value} onChange={set} />;
    default:
      return <input type="text" className={inputClass} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
  }
};

export default FormField;
