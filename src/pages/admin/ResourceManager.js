import React, { useCallback, useEffect, useState } from "react";
import FormField from "./FormField";
import { LoadingBlock, ErrorBlock } from "../../components/common/AsyncStates";

const emptyForm = (fields) => fields.reduce((acc, f) => {
  if (f.type === "tags" || f.type === "stringList" || f.type === "slideImages") acc[f.name] = [];
  else if (f.type === "boolean") acc[f.name] = false;
  else if (f.type === "json") acc[f.name] = {};
  else acc[f.name] = "";
  return acc;
}, {});

const ResourceManager = ({ resource }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null); // null = list view, object = editing
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const refresh = useCallback(() => {
    setRows(null);
    setError(null);
    resource.api.list().then(setRows).catch(setError);
  }, [resource]);

  useEffect(() => {
    setForm(null);
    refresh();
  }, [refresh]);

  const onField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (form.id) await resource.api.update(form.id, form);
      else await resource.api.create(form);
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
    if (!window.confirm(`Delete "${resource.title(row)}"?`)) return;
    try {
      await resource.api.remove(row.id);
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
          {form.id ? "Edit" : "New"} {resource.label}
        </h2>
        {resource.fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {field.label}{field.required ? " *" : ""}
            </span>
            <FormField field={field} value={form[field.name]} folder={resource.key} onChange={onField} />
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">{resource.label}</h2>
        <button
          type="button"
          onClick={() => setForm(emptyForm(resource.fields))}
          className="px-4 py-2 bg-secondary text-white rounded-lg font-label text-xs uppercase tracking-widest font-bold"
        >
          + New
        </button>
      </div>

      {error && <ErrorBlock />}
      {!error && rows === null && <LoadingBlock label="Loading…" />}
      {!error && rows && rows.length === 0 && (
        <p className="text-stone-500 dark:text-stone-400 italic">No entries yet.</p>
      )}
      {!error && rows && rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-stone-100 dark:divide-stone-800 border border-stone-100 dark:border-stone-800 rounded-lg">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-stone-800 dark:text-stone-200 truncate">{resource.title(row)}</span>
              <span className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setForm(row)} className="text-xs font-bold uppercase tracking-wider text-secondary">Edit</button>
                <button type="button" onClick={() => remove(row)} className="text-xs font-bold uppercase tracking-wider text-red-600">Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ResourceManager;
