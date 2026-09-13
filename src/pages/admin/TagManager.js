import React, { useCallback, useEffect, useRef, useState } from "react";
import tagsApi, {
  getTagsWithCounts, mergeTags, upsertTagsByName,
} from "../../lib/api/tags";
import { useContentRefresh } from "../../context/ContentContext";
import { colorForTag } from "../../lib/generativeArt";
import PageHeader from "./ui/PageHeader";
import DataTable from "./ui/DataTable";
import Modal from "./ui/Modal";
import ConfirmDialog from "./ui/ConfirmDialog";
import Field from "./ui/Field";
import Badge from "./ui/Badge";
import Button, { IconButton } from "./ui/Button";
import { Input, Select, Textarea } from "./ui/Input";
import {
  Download, ExternalLink, GitMerge, Pencil, Plus, Trash2, Upload,
} from "./ui/icons";
import { useToast } from "./ui/ToastContext";
import { mutedText } from "./ui/tokens";

// The central tag table (0003_centralized_tags.sql). Content rows pick their
// tags in their own forms; this page edits the tags themselves — name, color,
// category — and cleans up duplicates. Rename is a plain update (associations
// point at the id); merge re-points every use onto another tag.

const TYPE_LABELS = {
  book: "books",
  blog: "blogs",
  instagram: "instagram",
  microblog: "micro",
  sport: "races",
  trek: "treks",
  project: "projects",
  presentation: "decks",
};

const EMPTY_FORM = {
  name: "", displayName: "", color: "", category: "", description: "",
};

const Swatch = ({ tag }) => (
  <span
    aria-hidden="true"
    className="inline-block h-3 w-3 rounded-full align-middle"
    style={{ backgroundColor: colorForTag(tag.name, tag.color) }}
  />
);

const countsLine = (counts) => Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .map(([type, n]) => `${TYPE_LABELS[type] ?? type} ${n}`)
  .join(" · ") || "unused";

const COLUMNS = [
  {
    key: "name",
    label: "Tag",
    sortable: true,
    primary: true,
    render: (t) => (
      <span className="inline-flex items-center gap-2">
        <Swatch tag={t} />
        {t.name}
        {!t.color && <span className={`text-xs ${mutedText}`}>(auto color)</span>}
      </span>
    ),
  },
  { key: "displayName", label: "Display name" },
  { key: "category", label: "Category", render: (t) => (t.category ? <Badge>{t.category}</Badge> : "—") },
  { key: "counts", label: "Used in", render: (t) => <span className={`text-xs ${mutedText}`}>{countsLine(t.counts)}</span> },
  { key: "total", label: "Total", sortable: true, width: "5rem" },
];

const UNIQUE_VIOLATION = "23505";

const TagManager = () => {
  const toast = useToast();
  const refreshContent = useContentRefresh();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // form values, `id` present when editing
  const [conflict, setConflict] = useState(null); // existing tag a rename collided with
  const [saving, setSaving] = useState(false);
  const [merging, setMerging] = useState(null); // { from, intoId }
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    getTagsWithCounts()
      .then((data) => { setRows(data); setError(null); })
      .catch(setError);
  }, []);

  useEffect(load, [load]);

  // Every mutation also refreshes the app-wide tag cache that feeds the form
  // autocomplete and the public pages.
  const reload = () => {
    load();
    refreshContent("tags");
  };

  const openForm = (tag) => {
    setConflict(null);
    setEditing(tag ? { ...EMPTY_FORM, ...tag } : { ...EMPTY_FORM });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setConflict(null);
    try {
      if (editing.id) await tagsApi.update(editing.id, editing);
      else await tagsApi.create(editing);
      toast.success(editing.id ? "Tag saved." : "Tag created.");
      setEditing(null);
      reload();
    } catch (err) {
      if (err.code === UNIQUE_VIOLATION) {
        const name = editing.name.trim().toLowerCase();
        setConflict(rows?.find((t) => t.name === name) ?? { name });
      } else {
        toast.error(`Couldn't save: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const runMerge = async () => {
    try {
      await mergeTags(merging.from.id, Number(merging.intoId));
      const into = rows.find((t) => t.id === Number(merging.intoId));
      toast.success(`Merged "${merging.from.name}" into "${into?.name}".`);
      setMerging(null);
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(`Merge failed: ${err.message}`);
      throw err;
    }
  };

  const runDelete = async () => {
    try {
      await tagsApi.remove(deleting.id);
      toast.success(`Deleted "${deleting.name}".`);
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
      throw err;
    }
  };

  const exportJson = () => {
    const data = (rows ?? []).map(({
      name, displayName, color, category, description,
    }) => ({
      name, displayName, color, category, description,
    }));
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tags-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file) => {
    if (!file) return;
    try {
      const list = JSON.parse(await file.text());
      if (!Array.isArray(list)) throw new Error("expected a JSON array of tags");
      await upsertTagsByName(list);
      toast.success(`Imported ${list.length} tag${list.length === 1 ? "" : "s"}.`);
      reload();
    } catch (err) {
      toast.error(`Import failed: ${err.message}`);
    }
  };

  const setField = (name) => (e) => setEditing((prev) => ({ ...prev, [name]: e.target.value }));

  const renderActions = (tag) => (
    <>
      <IconButton icon={Pencil} label="Edit" size="sm" onClick={() => openForm(tag)} />
      <IconButton icon={GitMerge} label="Merge into another tag" size="sm" onClick={() => setMerging({ from: tag, intoId: "" })} />
      <a
        href={`/tags/${encodeURIComponent(tag.name)}`}
        target="_blank"
        rel="noreferrer"
        title="View on site"
        aria-label="View on site"
        className={`inline-flex items-center justify-center h-8 w-8 rounded-md ${mutedText} hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors no-underline`}
      >
        <ExternalLink size={14} aria-hidden="true" />
      </a>
      <IconButton icon={Trash2} label="Delete" size="sm" variant="dangerGhost" onClick={() => setDeleting(tag)} />
    </>
  );

  const unused = rows ? rows.filter((t) => t.total === 0).length : 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tags"
        description={rows
          ? `${rows.length} tags${unused ? ` · ${unused} unused` : ""} — shared by every content type`
          : "Loading…"}
        actions={(
          <>
            <Button icon={Download} onClick={exportJson} disabled={!rows?.length}>Export</Button>
            <Button icon={Upload} onClick={() => fileRef.current?.click()}>Import</Button>
            <Button variant="primary" icon={Plus} onClick={() => openForm(null)}>New tag</Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                importJson(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        )}
      />

      <DataTable
        rows={rows}
        error={error}
        columns={COLUMNS}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tags…"
        searchKeys={["name", "displayName", "category"]}
        renderActions={renderActions}
        emptyTitle="No tags yet"
        emptyDescription="Tags appear here as soon as a book, post, race or trek is saved with one."
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit "${editing.name}"` : "New tag"}
        description="Names are stored lowercase. Renaming keeps every use — they point at the tag, not its name."
        footer={(
          <>
            <Button onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button variant="primary" type="submit" form="tag-form" loading={saving}>Save</Button>
          </>
        )}
      >
        {editing && (
          <form id="tag-form" onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Name" required>
              <Input required value={editing.name} onChange={setField("name")} />
            </Field>
            <Field label="Display name" hint="Optional nicer label, e.g. “Digital Well-being”">
              <Input value={editing.displayName} onChange={setField("displayName")} />
            </Field>
            <Field label="Color" hint={editing.color ? editing.color : "Unset — derived from the name"}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Tag color"
                  className="h-9 w-14 cursor-pointer rounded-md border border-stone-200 dark:border-stone-800 bg-transparent"
                  value={colorForTag(editing.name || "tag", editing.color)}
                  onChange={setField("color")}
                />
                {editing.color && (
                  <Button size="sm" onClick={() => setEditing((prev) => ({ ...prev, color: "" }))}>Reset</Button>
                )}
              </div>
            </Field>
            <Field label="Category" hint="Groups tags on the public hub, e.g. travel, sports">
              <Input value={editing.category} onChange={setField("category")} />
            </Field>
            <Field label="Description" span="full">
              <Textarea value={editing.description} onChange={setField("description")} />
            </Field>
            {conflict && (
              <div className="md:col-span-2 flex flex-wrap items-center gap-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {`A tag named "${conflict.name}" already exists.`}
                {editing.id && conflict.id && (
                  <Button
                    size="sm"
                    icon={GitMerge}
                    onClick={() => {
                      // `editing.name` already holds the colliding name; merge the saved tag.
                      setMerging({ from: rows.find((t) => t.id === editing.id), intoId: String(conflict.id) });
                      setEditing(null);
                    }}
                  >
                    {`Merge into "${conflict.name}" instead`}
                  </Button>
                )}
              </div>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={!!merging}
        onClose={() => setMerging(null)}
        title={merging ? `Merge "${merging.from.name}"` : ""}
        description="Every item tagged with it moves to the target tag, then this tag is deleted."
        size="sm"
        footer={(
          <>
            <Button onClick={() => setMerging(null)}>Cancel</Button>
            <Button variant="primary" icon={GitMerge} disabled={!merging?.intoId} onClick={() => runMerge().catch(() => {})}>
              Merge
            </Button>
          </>
        )}
      >
        {merging && (
          <Field label="Merge into" span="full">
            <Select value={merging.intoId} onChange={(e) => setMerging((prev) => ({ ...prev, intoId: e.target.value }))}>
              <option value="">—</option>
              {(rows ?? []).filter((t) => t.id !== merging.from.id).map((t) => (
                <option key={t.id} value={t.id}>{`${t.name} (${t.total})`}</option>
              ))}
            </Select>
          </Field>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Delete "${deleting.name}"?` : ""}
        message={deleting?.total
          ? `It is removed from ${deleting.total} item${deleting.total === 1 ? "" : "s"} (${countsLine(deleting.counts)}). The items themselves stay.`
          : "It isn't used anywhere."}
        confirmLabel="Delete"
        destructive
        onConfirm={runDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

export default TagManager;
