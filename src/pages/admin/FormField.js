import React, { useRef, useState } from "react";
import uploadImage from "../../lib/api/storage";
import Button, { IconButton } from "./ui/Button";
import { Checkbox, Input, Select, Textarea } from "./ui/Input";
import {
  ChevronDown, ChevronUp, ImageIcon, Trash2, Upload, X,
} from "./ui/icons";
import { useToast } from "./ui/ToastContext";
import { faintText, hairline, inputClass } from "./ui/tokens";

// Re-exported for the Now editors (now/SectionEditors.js, now/AutofillPreview.js,
// now/NowMonthEditor.js), which have imported it from here since before the
// tokens module existed.
export { inputClass };

// CLAUDE.md's hard cap for the media bucket — the audience is on mobile data.
const MAX_BYTES = 300 * 1024;

const useUploader = (folder) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const upload = async (file, onUploaded) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name} is not an image.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name} is ${Math.round(file.size / 1024)} KB — compress it below 300 KB before uploading.`);
      return;
    }
    setBusy(true);
    try {
      onUploaded(await uploadImage(file, folder));
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return { busy, upload };
};

/**
 * Click-or-drop upload target with a live thumbnail. Replaces the old
 * text-input-plus-Upload-button pair, which showed the URL as raw text and gave
 * no way to tell a good upload from a 404.
 */
const ImagePicker = ({ value, folder, onChange, compact = false }) => {
  const { busy, upload } = useUploader(folder);
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState(false);
  const inputRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files?.[0], onChange);
  };

  const thumb = value && !broken
    ? (
      <img
        src={value}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
        onLoad={() => setBroken(false)}
      />
    )
    : (
      <ImageIcon
        size={compact ? 14 : 18}
        className={broken ? "text-red-400" : "text-stone-300 dark:text-stone-600"}
        aria-hidden="true"
      />
    );

  return (
    <div className="flex items-start gap-2">
      <div
        role="presentation"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`shrink-0 grid place-items-center overflow-hidden cursor-pointer rounded-md border border-dashed transition-colors ${
          compact ? "h-9 w-9" : "h-16 w-16"
        } ${dragging ? "border-admin-500 bg-admin-50 dark:bg-admin-950/40" : `${hairline} bg-stone-50 dark:bg-stone-950`}`}
        title={value ? "Replace image" : "Click or drop an image"}
      >
        {busy ? <Upload size={14} className="animate-pulse text-admin-600" aria-hidden="true" /> : thumb}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Input
            value={value ?? ""}
            onChange={(e) => { setBroken(false); onChange(e.target.value); }}
            placeholder="Click the tile to upload, or paste a URL"
            aria-label="Image URL"
          />
          {value && (
            <IconButton icon={X} label="Clear image" size="sm" onClick={() => onChange("")} />
          )}
        </div>
        {broken && value && (
          <span className="text-xs text-red-600 dark:text-red-400">This URL didn&apos;t load.</span>
        )}
        {!compact && !value && (
          <span className={`text-xs ${faintText}`}>Drag an image onto the tile. Max 300 KB — compress first.</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            upload(e.target.files?.[0], onChange);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
};

const SlideImages = ({ value, folder, onChange }) => {
  const rows = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const move = (i, delta) => {
    const target = i + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={i} className={`flex flex-col sm:flex-row sm:items-start gap-2 p-2 rounded-md border ${hairline}`}>
          <div className="flex-1 min-w-0">
            <ImagePicker
              value={row.url}
              folder={folder}
              onChange={(url) => update(i, { url })}
              compact
            />
          </div>
          <Input
            className="sm:w-40"
            placeholder="Caption"
            aria-label={`Caption for slide ${i + 1}`}
            value={row.caption || ""}
            onChange={(e) => update(i, { caption: e.target.value })}
          />
          <div className="flex items-center gap-0.5 shrink-0">
            <IconButton icon={ChevronUp} label={`Move slide ${i + 1} up`} size="sm" disabled={i === 0} onClick={() => move(i, -1)} />
            <IconButton icon={ChevronDown} label={`Move slide ${i + 1} down`} size="sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)} />
            <IconButton
              icon={Trash2}
              label={`Remove slide ${i + 1}`}
              size="sm"
              variant="dangerGhost"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            />
          </div>
        </div>
      ))}
      <Button
        size="sm"
        icon={ImageIcon}
        className="self-start"
        onClick={() => onChange([...rows, { url: "", caption: `Slide ${rows.length + 1}` }])}
      >
        Add image
      </Button>
    </div>
  );
};

const JsonField = ({ value, onChange }) => {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState(null);
  return (
    <div className="flex flex-col gap-1">
      <Textarea
        className={`font-mono text-xs ${error ? "border-red-500 dark:border-red-500" : ""}`}
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
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-0">{`Invalid JSON: ${error}`}</p>}
    </div>
  );
};

// "February 22, 2026" → "2026-02-22"  (for input[type=date])
export function toDateInput(str) {
  if (!str) return "";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "2026-02-22" → "February 22, 2026"  (stored format)
export function fromDateInput(str) {
  if (!str) return "";
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// "17-02-2019" ↔ "2019-02-17". The treks table stores DD-MM-YYYY, which was a
// free-text box until now; hand-typing a date column is how blogs ended up with
// "2026--07-09" in it.
export function toDdmmyyyyInput(str) {
  const parts = String(str || "").split("-");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  if (y.length !== 4 || !d || !m) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function fromDdmmyyyyInput(str) {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}-${m}-${y}`;
}

const SelectOrOther = ({ options, value, onChange, placeholder, required }) => {
  const isOther = value && !options.includes(value);
  const selectVal = isOther ? "Other" : (value ?? "");
  return (
    <div className="flex flex-col gap-2">
      <Select
        value={selectVal}
        required={required}
        onChange={(e) => onChange(e.target.value === "Other" ? "" : e.target.value)}
      >
        <option value="">—</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        <option value="Other">Other</option>
      </Select>
      {(selectVal === "Other" || isOther) && (
        <Input
          type="text"
          placeholder={placeholder ?? "Enter a value"}
          aria-label={placeholder ?? "Custom value"}
          required={required}
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
    <div className={`${inputClass} flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-admin-500/40 focus-within:border-admin-500`}>
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-xs text-stone-700 dark:text-stone-200"
        >
          {tag}
          <button
            type="button"
            className="leading-none text-stone-400 hover:text-red-600 p-0.5"
            onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
            aria-label={`Remove ${tag}`}
          >
            <X size={11} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[120px] bg-transparent text-sm text-stone-900 dark:text-stone-100 outline-none"
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

// Composite widgets can't carry a native `required`, so the form validates them
// on submit instead. See ResourceManager.
export const COMPOSITE_TYPES = new Set(["tags", "stringList", "slideImages", "json"]);

const FormField = ({ field, value, folder, onChange }) => {
  const set = (v) => onChange(field.name, v);
  const required = !!field.required;

  switch (field.type) {
    case "textarea":
      return <Textarea required={required} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
    case "number":
      return (
        <Input
          type="number"
          required={required}
          min={field.min}
          max={field.max}
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
        />
      );
    case "url":
      return <Input type="url" required={required} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
    case "boolean":
      return <Checkbox checked={!!value} onChange={(e) => set(e.target.checked)} />;
    case "select":
      return (
        <Select required={required} value={value ?? ""} onChange={(e) => set(e.target.value)}>
          <option value="">—</option>
          {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </Select>
      );
    case "tags":
      return <TagInput value={Array.isArray(value) ? value : []} onChange={set} />;
    case "stringList":
      return (
        <Textarea
          rows={4}
          placeholder="One item per line"
          value={(Array.isArray(value) ? value : []).join("\n")}
          onChange={(e) => set(e.target.value.split("\n"))}
        />
      );
    case "image":
      return <ImagePicker value={value} folder={folder} onChange={set} />;
    case "date":
      return (
        <Input
          type="date"
          required={required}
          value={toDateInput(value)}
          onChange={(e) => set(fromDateInput(e.target.value))}
        />
      );
    // Like "date" but stores the picker's own "YYYY-MM-DD" value verbatim —
    // for columns that are real Postgres dates (microblog) or JSON fields the
    // Now components feed straight to new Date().
    case "isoDate":
      return (
        <Input
          type="date"
          required={required}
          disabled={field.disabled}
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
        />
      );
    // Treks store DD-MM-YYYY. Same picker, different serialization.
    case "ddmmyyyy":
      return (
        <Input
          type="date"
          required={required}
          value={toDdmmyyyyInput(value)}
          onChange={(e) => set(fromDdmmyyyyInput(e.target.value))}
        />
      );
    case "selectOrOther":
      return (
        <SelectOrOther
          options={field.options}
          value={value}
          onChange={set}
          required={required}
          placeholder={field.otherPlaceholder}
        />
      );
    case "slideImages":
      return <SlideImages value={value} folder={folder} onChange={set} />;
    case "json":
      return <JsonField value={value} onChange={set} />;
    default:
      return <Input type="text" required={required} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
  }
};

export default FormField;
