import React, { useEffect, useState } from "react";
import FormField from "./FormField";
import microblog, { searchMicroblog } from "../../lib/api/microblog";
import { todayIso } from "../../lib/monthDigest";
import { LoadingBlock, ErrorBlock } from "../../components/common/AsyncStates";

// Dedicated manager (not the generic ResourceManager): the microblog table has
// 1,600+ rows, so the list is server-side searched + paginated rather than
// loaded all at once. Create/edit reuse the shared FormField + microblog CRUD.

const PAGE_SIZE = 20;

const FIELDS = [
  {
    name: "source", label: "Source", type: "select", options: ["tumblr", "instagram", "manual"], required: true,
  },
  {
    name: "postType", label: "Type", type: "select", options: ["text", "quote", "photo"], required: true,
  },
  { name: "title", label: "Title", type: "text" },
  { name: "text", label: "Text", type: "textarea", required: true },
  { name: "tags", label: "Tags", type: "tags" },
  { name: "url", label: "Original URL", type: "url" },
  { name: "imageUrl", label: "Image", type: "image" },
];

// `useToday` is form-only state (never persisted): while it is on, the date
// stays pinned to today and is re-stamped at save time, so a form left open
// across midnight still records the right day.
const newForm = () => ({
  source: "manual",
  date: todayIso(),
  useToday: true,
  postType: "text",
  title: "",
  text: "",
  tags: [],
  url: "",
  imageUrl: "",
});

const rowLabel = (r) => {
  const body = (r.text || r.title || "").replace(/\s+/g, " ").trim();
  return `${r.date} · ${r.postType} — ${body.slice(0, 80) || "(no text)"}`;
};

const MicroblogManager = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState(null); // null = list view, object = editing
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setRows(null);
    setError(null);
    searchMicroblog({ query: searchTerm, page, pageSize: PAGE_SIZE })
      .then(({ rows: r, count: c }) => {
        if (!active) return;
        setRows(r);
        setCount(c);
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => { active = false; };
  }, [searchTerm, page, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);
  const onField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const { useToday, ...rest } = form;
      const payload = { ...rest, date: useToday ? todayIso() : rest.date };
      if (payload.id) await microblog.update(payload.id, payload);
      else await microblog.create(payload);
      setForm(null);
      refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete this ${row.postType} post from ${row.date}?`)) return;
    try {
      await microblog.remove(row.id);
      refresh();
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(`Delete failed: ${err.message}`);
    }
  };

  if (form) {
    return (
      <form onSubmit={save} className="flex flex-col gap-4 max-w-2xl">
        <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">
          {form.id ? "Edit" : "New"} Micro Blog post
        </h2>
        <div className="flex flex-col gap-1">
          <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Date *
          </span>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <FormField
                field={{ name: "date", type: "isoDate", disabled: form.useToday }}
                value={form.useToday ? todayIso() : form.date}
                onChange={onField}
              />
            </div>
            {/* The checkbox is nested directly inside this label. */}
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="shrink-0 flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-stone-300 text-secondary focus:ring-secondary dark:border-stone-600 dark:bg-stone-800"
                checked={!!form.useToday}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  useToday: e.target.checked,
                  // Re-checking snaps back to today; unchecking keeps the value
                  // on screen so it can be nudged into the past.
                  date: e.target.checked ? todayIso() : prev.date,
                }))}
              />
              Today
            </label>
          </div>
        </div>
        {FIELDS.map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {field.label}{field.required ? " *" : ""}
            </span>
            <FormField field={field} value={form[field.name]} folder="microblog" onChange={onField} />
          </div>
        ))}
        {formError && <p className="text-sm text-red-600 mb-0">{formError}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-secondary text-white rounded-lg font-label text-xs uppercase tracking-widest font-bold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setForm(null)}
            className="px-5 py-2.5 bg-stone-200 dark:bg-stone-700 rounded-lg font-label text-xs uppercase tracking-widest font-bold"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">Micro Blog</h2>
        <button
          type="button"
          onClick={() => setForm(newForm())}
          className="px-4 py-2 bg-secondary text-white rounded-lg font-label text-xs uppercase tracking-widest font-bold"
        >
          + New
        </button>
      </div>

      <input
        type="search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search posts…"
        className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:border-secondary"
      />

      {error && <ErrorBlock />}
      {!error && rows === null && <LoadingBlock label="Loading…" />}
      {!error && rows && rows.length === 0 && (
        <p className="text-stone-500 dark:text-stone-400 italic mb-0">No posts found.</p>
      )}
      {!error && rows && rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-stone-100 dark:divide-stone-800 border border-stone-100 dark:border-stone-800 rounded-lg">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-stone-800 dark:text-stone-200 truncate">{rowLabel(row)}</span>
              <span className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setForm({ ...row, useToday: false })} className="text-xs font-bold uppercase tracking-wider text-secondary">Edit</button>
                <button type="button" onClick={() => remove(row)} className="text-xs font-bold uppercase tracking-wider text-red-600">Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!error && count > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-700 rounded-lg disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Page {page + 1} of {totalPages} · {count} total
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= count}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-700 rounded-lg disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default MicroblogManager;
