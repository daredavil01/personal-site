import React, {
  useCallback, useEffect, useMemo, useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import FormField, { COMPOSITE_TYPES } from "./FormField";
import PageHeader from "./ui/PageHeader";
import DataTable from "./ui/DataTable";
import Field from "./ui/Field";
import Button, { IconButton } from "./ui/Button";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useToast } from "./ui/ToastContext";
import useUnsavedGuard from "./ui/useUnsavedGuard";
import {
  ExternalLink, Pencil, Plus, Trash2,
} from "./ui/icons";
import { hairline, mutedText, surface } from "./ui/tokens";

const emptyForm = (fields) => fields.reduce((acc, f) => {
  if (f.type === "tags" || f.type === "stringList" || f.type === "slideImages") acc[f.name] = [];
  else if (f.type === "boolean") acc[f.name] = false;
  else if (f.type === "json") acc[f.name] = {};
  else acc[f.name] = "";
  return acc;
}, {});

const isBlank = (value) => value === null
  || value === undefined
  || value === ""
  || (Array.isArray(value) && value.length === 0);

/**
 * The generic list + editor for every resource declared in resources.js.
 *
 * The list is a DataTable (searchable, sortable, multi-selectable); the editor
 * is a two-column grid over a sticky action bar. `?new=1` opens a blank form on
 * mount, which is how the command palette's "New …" actions land here.
 */
const ResourceManager = ({ resource }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null); // null = list view, object = editing
  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [missing, setMissing] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirming, setConfirming] = useState(null); // { rows } | null
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(baseline);
  const unsaved = useUnsavedGuard(dirty);

  const refresh = useCallback(() => {
    setRows(null);
    setError(null);
    resource.api.list().then(setRows).catch(setError);
  }, [resource]);

  const openForm = useCallback((row) => {
    const next = row ?? emptyForm(resource.fields);
    setForm(next);
    setBaseline(next);
    setFormError(null);
    setMissing([]);
  }, [resource]);

  const closeForm = () => {
    setForm(null);
    setBaseline(null);
    setMissing([]);
  };

  useEffect(() => {
    closeForm();
    setSearch("");
    setSelectedIds([]);
    refresh();
  }, [refresh]);

  // ?new=1 is a one-shot instruction, not state — strip it once it's consumed
  // so a refresh doesn't reopen a blank form over the user's list.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    openForm(null);
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, openForm]);

  const onField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const save = async (e) => {
    e.preventDefault();
    // Native `required` covers the simple inputs; composites (tags, lists,
    // slides, JSON) have no such attribute, so they are checked here.
    const blanks = resource.fields
      .filter((f) => f.required && COMPOSITE_TYPES.has(f.type) && isBlank(form[f.name]))
      .map((f) => f.name);
    setMissing(blanks);
    if (blanks.length) {
      setFormError("Fill in the highlighted fields.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (form.id) await resource.api.update(form.id, form);
      else await resource.api.create(form);
      toast.success(`${resource.label}: ${form.id ? "changes saved" : "entry created"}.`);
      closeForm();
      refresh();
    } catch (err) {
      setFormError(err.message);
      toast.error(`Couldn't save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const runDelete = async () => {
    const targets = confirming?.rows ?? [];
    try {
      await Promise.all(targets.map((row) => resource.api.remove(row.id)));
      toast.success(targets.length === 1 ? "Entry deleted." : `${targets.length} entries deleted.`);
      setConfirming(null);
      setSelectedIds([]);
      refresh();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
      setConfirming(null);
    }
  };

  const selectedRows = useMemo(
    () => (rows ?? []).filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds],
  );

  const guardDialog = (
    <ConfirmDialog
      open={unsaved.pending}
      title="Discard your changes?"
      message="This entry has unsaved edits. Leaving now throws them away."
      confirmLabel="Discard"
      destructive
      onConfirm={unsaved.confirm}
      onClose={unsaved.cancel}
    />
  );

  if (form) {
    return (
      <form onSubmit={save} className="flex flex-col gap-6 pb-20">
        <PageHeader
          title={`${form.id ? "Edit" : "New"} ${resource.singular ?? resource.label.toLowerCase()}`}
          description={form.id ? `Row #${form.id} in ${resource.api.table}` : `Adds a row to ${resource.api.table}`}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {resource.fields.map((field) => (
            <Field
              key={field.name}
              label={field.label}
              required={field.required}
              hint={field.hint}
              error={missing.includes(field.name) ? "Required." : undefined}
              span={field.span}
            >
              <FormField
                field={field}
                value={form[field.name]}
                folder={resource.key}
                onChange={onField}
              />
            </Field>
          ))}
        </div>

        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-0" role="alert">{formError}</p>
        )}

        <div className={`fixed bottom-0 left-0 right-0 md:left-60 z-30 flex items-center gap-2 px-4 md:px-8 py-3 border-t ${hairline} ${surface}`}>
          <div className="mx-auto w-full max-w-5xl flex items-center gap-2">
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" onClick={() => unsaved.guard(closeForm)}>Cancel</Button>
            {dirty && <span className={`text-xs ${mutedText}`}>Unsaved changes</span>}
            {form.id && (
              <Button
                type="button"
                variant="dangerGhost"
                icon={Trash2}
                className="ml-auto"
                onClick={() => setConfirming({ rows: [form] })}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={!!confirming}
          title="Delete this entry?"
          message={confirming ? `"${resource.title(confirming.rows[0])}" will be removed permanently.` : ""}
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            await runDelete();
            closeForm();
          }}
          onClose={() => setConfirming(null)}
        />
        {guardDialog}
      </form>
    );
  }

  const renderActions = (row) => (
    <>
      <IconButton icon={Pencil} label="Edit" size="sm" onClick={() => openForm(row)} />
      {resource.viewPath && (
        <a
          href={resource.viewPath(row)}
          target="_blank"
          rel="noreferrer"
          title="View on site"
          aria-label="View on site"
          className={`inline-flex items-center justify-center h-8 w-8 rounded-md ${mutedText} hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors no-underline`}
        >
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
      <IconButton
        icon={Trash2}
        label="Delete"
        size="sm"
        variant="dangerGhost"
        onClick={() => setConfirming({ rows: [row] })}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={resource.label}
        description={rows ? `${rows.length} ${rows.length === 1 ? "entry" : "entries"}` : "Loading…"}
        actions={(
          <Button variant="primary" icon={Plus} onClick={() => openForm(null)}>
            {`New ${resource.singular ?? "entry"}`}
          </Button>
        )}
      />

      <DataTable
        rows={rows}
        error={error}
        columns={resource.columns ?? [{ key: "id", label: "Entry", primary: true, render: resource.title }]}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${resource.label.toLowerCase()}…`}
        searchKeys={resource.searchKeys ?? []}
        selectable
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
        renderActions={renderActions}
        emptyAction={(
          <Button variant="primary" icon={Plus} size="sm" onClick={() => openForm(null)}>
            {`New ${resource.singular ?? "entry"}`}
          </Button>
        )}
        toolbar={selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className={`text-xs ${mutedText}`}>{`${selectedIds.length} selected`}</span>
            <Button size="sm" variant="dangerGhost" icon={Trash2} onClick={() => setConfirming({ rows: selectedRows })}>
              Delete
            </Button>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!confirming}
        title={confirming?.rows.length === 1 ? "Delete this entry?" : `Delete ${confirming?.rows.length ?? 0} entries?`}
        message={confirming?.rows.length === 1
          ? `"${resource.title(confirming.rows[0])}" will be removed permanently.`
          : "These entries will be removed permanently."}
        confirmLabel="Delete"
        destructive
        onConfirm={runDelete}
        onClose={() => setConfirming(null)}
      />
      {guardDialog}
    </div>
  );
};

export default ResourceManager;
