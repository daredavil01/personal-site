import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FormField from "./FormField";
import microblog, { searchMicroblog } from "../../lib/api/microblog";
import { todayIso } from "../../lib/monthDigest";
import PageHeader from "./ui/PageHeader";
import DataTable from "./ui/DataTable";
import Field from "./ui/Field";
import Badge from "./ui/Badge";
import Button, { IconButton } from "./ui/Button";
import ConfirmDialog from "./ui/ConfirmDialog";
import { Checkbox } from "./ui/Input";
import { useToast } from "./ui/ToastContext";
import useUnsavedGuard from "./ui/useUnsavedGuard";
import {
  ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus, Trash2,
} from "./ui/icons";
import { hairline, mutedText, surface } from "./ui/tokens";

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
  { name: "url", label: "Original URL", type: "url" },
  { name: "text", label: "Text", type: "textarea", required: true, span: "full" },
  { name: "tags", label: "Tags", type: "tags", span: "full" },
  { name: "imageUrl", label: "Image", type: "image", span: "full" },
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

const excerpt = (r) => {
  const body = (r.text || r.title || "").replace(/\s+/g, " ").trim();
  return body.slice(0, 120) || "(no text)";
};

const COLUMNS = [
  { key: "text", label: "Post", primary: true, render: excerpt },
  { key: "date", label: "Date", width: "7rem" },
  { key: "postType", label: "Type", width: "6rem", render: (r) => <Badge>{r.postType}</Badge> },
  {
    key: "tags",
    label: "Tags",
    width: "12rem",
    render: (r) => (r.tags?.length
      ? (
        <span className="inline-flex flex-wrap gap-1">
          {r.tags.slice(0, 2).map((t) => <Badge key={t}>{t}</Badge>)}
          {r.tags.length > 2 && <Badge>{`+${r.tags.length - 2}`}</Badge>}
        </span>
      )
      : "—"),
  },
];

const MicroblogManager = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirming, setConfirming] = useState(null);

  const [form, setForm] = useState(null); // null = list view, object = editing
  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(baseline);
  const unsaved = useUnsavedGuard(dirty);

  const openForm = (row) => {
    setForm(row);
    setBaseline(row);
    setFormError(null);
  };

  const closeForm = () => {
    setForm(null);
    setBaseline(null);
  };

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

  // ?new=1 comes from the command palette's "New Micro Blog" action.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    openForm(newForm());
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
      toast.success(payload.id ? "Post saved." : "Post created.");
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
      await Promise.all(targets.map((row) => microblog.remove(row.id)));
      toast.success(targets.length === 1 ? "Post deleted." : `${targets.length} posts deleted.`);
      setConfirming(null);
      setSelectedIds([]);
      refresh();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
      setConfirming(null);
    }
  };

  const guardDialog = (
    <ConfirmDialog
      open={unsaved.pending}
      title="Discard your changes?"
      message="This post has unsaved edits. Leaving now throws them away."
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
          title={`${form.id ? "Edit" : "New"} micro post`}
          description={form.id ? `Row #${form.id} in microblog` : "Adds a row to microblog"}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Field label="Date" required>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <FormField
                  field={{ name: "date", type: "isoDate", disabled: form.useToday, required: true }}
                  value={form.useToday ? todayIso() : form.date}
                  onChange={onField}
                />
              </div>
              {/* The checkbox is nested directly inside this label. */}
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="shrink-0 flex items-center gap-2 text-[13px] text-stone-700 dark:text-stone-300 cursor-pointer">
                <Checkbox
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
          </Field>

          {FIELDS.map((field) => (
            <Field key={field.name} label={field.label} required={field.required} span={field.span}>
              <FormField field={field} value={form[field.name]} folder="microblog" onChange={onField} />
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
          </div>
        </div>
        {guardDialog}
      </form>
    );
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const renderActions = (row) => (
    <>
      <IconButton icon={Pencil} label="Edit" size="sm" onClick={() => openForm({ ...row, useToday: false })} />
      <a
        href={`/micro-blog/${row.id}`}
        target="_blank"
        rel="noreferrer"
        title="View on site"
        aria-label="View on site"
        className={`inline-flex items-center justify-center h-8 w-8 rounded-md ${mutedText} hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors no-underline`}
      >
        <ExternalLink size={14} aria-hidden="true" />
      </a>
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
        title="Micro Blog"
        description={`${count.toLocaleString()} posts · searched on the server`}
        actions={(
          <Button variant="primary" icon={Plus} onClick={() => openForm(newForm())}>New post</Button>
        )}
      />

      <DataTable
        rows={rows}
        error={error}
        columns={COLUMNS}
        serverMode
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search posts…"
        selectable
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
        renderActions={renderActions}
        emptyTitle={searchTerm ? "No posts match that search" : "No posts yet"}
        toolbar={selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className={`text-xs ${mutedText}`}>{`${selectedIds.length} selected`}</span>
            <Button
              size="sm"
              variant="dangerGhost"
              icon={Trash2}
              onClick={() => setConfirming({ rows: (rows ?? []).filter((r) => selectedIds.includes(r.id)) })}
            >
              Delete
            </Button>
          </div>
        )}
        footer={count > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              icon={ChevronLeft}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            <span className={`text-xs ${mutedText} tabular-nums`}>
              {`Page ${page + 1} of ${totalPages}`}
            </span>
            <Button
              size="sm"
              icon={ChevronRight}
              iconRight
              disabled={(page + 1) * PAGE_SIZE >= count}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!confirming}
        title={confirming?.rows.length === 1 ? "Delete this post?" : `Delete ${confirming?.rows.length ?? 0} posts?`}
        message={confirming?.rows.length === 1
          ? `The ${confirming.rows[0].postType} post from ${confirming.rows[0].date} will be removed permanently.`
          : "These posts will be removed permanently."}
        confirmLabel="Delete"
        destructive
        onConfirm={runDelete}
        onClose={() => setConfirming(null)}
      />
      {guardDialog}
    </div>
  );
};

export default MicroblogManager;
