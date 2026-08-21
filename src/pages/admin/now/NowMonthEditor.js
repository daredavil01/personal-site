import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FormField from "../FormField";
import { nowMonths, MONTH_ORDER } from "../../../lib/api/now";
import {
  useBlogs, useBooks, useSports, useTreks,
} from "../../../context/ContentContext";
import { monthLabel } from "../../../lib/monthDigest";
import { getMicroblogByMonth } from "../../../lib/api/microblog";
import { collectMonthRecords } from "../../../lib/nowAutofill";
import { changelogHighlights, loadChangelog, parseChangelog } from "../../../lib/changelogEntries";
import {
  SECTION_SPECS, LIST_SECTIONS, serializeSections,
} from "./sectionSpecs";
import { RepeatableRows, StringLines, StatsEditor } from "./SectionEditors";
import AutofillPreview from "./AutofillPreview";
import PageHeader from "../ui/PageHeader";
import Card from "../ui/Card";
import Field from "../ui/Field";
import DataTable from "../ui/DataTable";
import Badge from "../ui/Badge";
import Button, { IconButton } from "../ui/Button";
import ConfirmDialog from "../ui/ConfirmDialog";
import { Checkbox, Select } from "../ui/Input";
import { useToast } from "../ui/ToastContext";
import useUnsavedGuard from "../ui/useUnsavedGuard";
import {
  ExternalLink, Pencil, Plus, Sparkles, Trash2,
} from "../ui/icons";
import { hairline, mutedText, surface } from "../ui/tokens";

// Dedicated manager for `now_months` (not the generic ResourceManager): the
// month's `sections` blob holds nine differently-shaped sub-sections that used
// to be typed as raw JSON. Each gets a real form here, plus two auto-fills —
// one from the content tables, one from the changelog.

// Enough to cover a busy micro-blogging month without shipping the archive.
const MICRO_LIMIT = 50;

const emptyForm = () => ({
  month: MONTH_ORDER[new Date().getMonth()],
  year: String(new Date().getFullYear()),
  isCurrent: false,
  sections: {},
});

// "May" + 2026 → "2026-05", the key both auto-fills and monthDigest speak.
const formMonthKey = (form) => {
  const index = MONTH_ORDER.indexOf(form.month);
  if (index < 0 || !form.year) return null;
  return `${form.year}-${String(index + 1).padStart(2, "0")}`;
};

const NowMonthEditor = () => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null); // null = list view
  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  // JsonField seeds its textarea once, so bump this to remount it after any
  // structured edit — otherwise the raw panel shows stale text.
  const [jsonKey, setJsonKey] = useState(0);
  const [preview, setPreview] = useState(null);
  const [pulling, setPulling] = useState(false);
  const [contentError, setContentError] = useState(null);
  const [changelog, setChangelog] = useState(null);
  const [changelogError, setChangelogError] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const { data: blogs } = useBlogs();
  const { data: sports } = useSports();
  const { data: books } = useBooks();
  const { data: treks } = useTreks();

  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(baseline);
  const unsaved = useUnsavedGuard(dirty);

  const refresh = useCallback(() => {
    setRows(null);
    setError(null);
    nowMonths.list().then(setRows).catch(setError);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const monthKey = form ? formMonthKey(form) : null;
  const sections = form?.sections || {};

  const openForm = useCallback((next) => {
    setForm(next);
    setBaseline(next);
    setPreview(null);
    setFormError(null);
    setJsonKey((k) => k + 1);
  }, []);

  const closeForm = () => {
    setForm(null);
    setBaseline(null);
    setPreview(null);
  };

  // ?new=1 from the command palette; ?start=May 2027 from the overview's
  // "Start <month>" button, which pre-seeds the month it wants created.
  useEffect(() => {
    const start = searchParams.get("start");
    const isNew = searchParams.get("new") === "1";
    if (!start && !isNew) return;
    const seeded = emptyForm();
    if (start) {
      const [month, year] = start.split(" ");
      if (MONTH_ORDER.includes(month)) seeded.month = month;
      if (year) seeded.year = year;
      seeded.isCurrent = true;
    }
    openForm(seeded);
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    next.delete("start");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, openForm]);

  const setSection = (key, value) => {
    setForm((prev) => ({ ...prev, sections: { ...prev.sections, [key]: value } }));
    setJsonKey((k) => k + 1);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, sections: serializeSections(form.sections) };
      const saved = payload.id
        ? await nowMonths.update(payload.id, payload)
        : await nowMonths.create(payload);
      // Only one month may be "current" — clear the flag everywhere else, which
      // used to be a manual second edit.
      if (payload.isCurrent) {
        await Promise.all((rows || [])
          .filter((r) => r.isCurrent && r.id !== saved.id)
          .map((r) => nowMonths.update(r.id, { ...r, isCurrent: false })));
      }
      toast.success(`${payload.month} ${payload.year} saved.`);
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
      await Promise.all(targets.map((row) => nowMonths.remove(row.id)));
      toast.success(targets.length === 1 ? "Month deleted." : `${targets.length} months deleted.`);
      setConfirming(null);
      refresh();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
      setConfirming(null);
    }
  };

  // --- Auto-fill: content records ----------------------------------------
  // Micro-posts are not in ContentContext (1,600+ rows), so they are fetched
  // for just this month; everything else is already cached client-side.
  const openContent = async () => {
    setPulling(true);
    setContentError(null);
    let micro = [];
    try {
      ({ rows: micro } = await getMicroblogByMonth(monthKey, MICRO_LIMIT));
    } catch (err) {
      // A failed micro fetch shouldn't hide the records we already have.
      setContentError(err.message);
    } finally {
      setPulling(false);
    }
    const groups = collectMonthRecords({
      blogs, sports, books, treks, micro,
    }, monthKey, sections).map((group) => ({
      key: group.key,
      label: `${group.label} → ${group.section}`,
      note: group.note,
      items: group.rows.map((r, i) => ({
        id: `${group.key}-${i}`,
        text: r.label,
        meta: r.meta,
        checked: true,
        payload: { section: group.section, row: r.row },
      })),
    }));
    setPreview({ kind: "content", groups });
  };

  const applyContent = (groups) => {
    const additions = {};
    groups.forEach((g) => g.items.forEach(({ payload }) => {
      additions[payload.section] = [...(additions[payload.section] || []), payload.row];
    }));
    setForm((prev) => {
      const next = { ...prev.sections };
      Object.entries(additions).forEach(([section, added]) => {
        next[section] = [...(next[section] || []), ...added];
      });
      return { ...prev, sections: next };
    });
    setJsonKey((k) => k + 1);
    setPreview(null);
  };

  // --- Auto-fill: changelog highlights ------------------------------------
  const openChangelog = async () => {
    setChangelogError(null);
    let entries = changelog;
    if (!entries) {
      try {
        entries = parseChangelog(await loadChangelog());
        setChangelog(entries);
      } catch (err) {
        setChangelogError(err.message);
        return;
      }
    }
    const existing = new Set((sections.website || []).map((s) => String(s).trim()));
    const items = changelogHighlights(entries, monthKey)
      .filter((h) => !existing.has(h.line))
      .map((h) => ({
        id: h.id,
        text: h.line,
        meta: `${h.version} · ${h.kind}`,
        // Fixes and tweaks are offered but not assumed — Added is what usually
        // belongs on a Now page.
        checked: h.kind === "Added",
        editable: true,
      }));
    setPreview({ kind: "changelog", groups: items.length ? [{ key: "website", label: "Website Updates", items }] : [] });
  };

  const applyChangelog = (groups) => {
    const lines = groups.flatMap((g) => g.items.map((i) => i.text.trim())).filter(Boolean);
    setForm((prev) => {
      const current = prev.sections.website || [];
      const merged = [...current];
      lines.forEach((line) => { if (!merged.includes(line)) merged.push(line); });
      return { ...prev, sections: { ...prev.sections, website: merged } };
    });
    setJsonKey((k) => k + 1);
    setPreview(null);
  };

  const guardDialog = (
    <ConfirmDialog
      open={unsaved.pending}
      title="Discard your changes?"
      message="This month has unsaved edits. Leaving now throws them away."
      confirmLabel="Discard"
      destructive
      onConfirm={unsaved.confirm}
      onClose={unsaved.cancel}
    />
  );

  // --- Form view -----------------------------------------------------------
  if (form) {
    return (
      <form onSubmit={save} className="flex flex-col gap-5 pb-20">
        <PageHeader
          title={`${form.id ? "Edit" : "New"} Now month`}
          description={monthKey ? monthLabel(monthKey) : "Pick a month and year"}
        />

        <Card title="Month">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Field label="Month" required>
              <Select
                value={form.month}
                onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
              >
                {MONTH_ORDER.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Year" required>
              <FormField
                field={{ name: "year", type: "number", required: true }}
                value={form.year}
                onChange={(name, v) => setForm((prev) => ({ ...prev, [name]: v }))}
              />
            </Field>
            {/* The checkbox is nested directly inside this label. */}
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="flex items-center gap-2 text-[13px] text-stone-700 dark:text-stone-300 pb-2 cursor-pointer">
              <Checkbox
                checked={!!form.isCurrent}
                onChange={(e) => setForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
              />
              Current month
            </label>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              size="sm"
              variant="primary"
              icon={Sparkles}
              disabled={!monthKey || pulling}
              loading={pulling}
              onClick={openContent}
            >
              {pulling ? "Pulling…" : "Pull records for this month"}
            </Button>
            <Button size="sm" icon={Sparkles} disabled={!monthKey} onClick={openChangelog}>
              Pull highlights from changelog
            </Button>
          </div>

          {contentError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-3 mb-0">{`Could not load micro posts: ${contentError}`}</p>
          )}
          {changelogError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-3 mb-0">{`Could not read the changelog: ${changelogError}`}</p>
          )}
        </Card>

        {preview && (
          <AutofillPreview
            title={preview.kind === "changelog"
              ? `Changelog highlights · ${monthLabel(monthKey)}`
              : `Records found · ${monthLabel(monthKey)}`}
            groups={preview.groups}
            emptyMessage={preview.kind === "changelog"
              ? `No changelog entries for ${monthLabel(monthKey)}.`
              : `No new records for ${monthLabel(monthKey)}.`}
            onApply={preview.kind === "changelog" ? applyChangelog : applyContent}
            onCancel={() => setPreview(null)}
          />
        )}

        {SECTION_SPECS.map((spec) => (
          <Card key={spec.key} title={spec.label}>
            <RepeatableRows
              spec={spec}
              value={sections[spec.key]}
              folder="now"
              onChange={(v) => setSection(spec.key, v)}
            />
          </Card>
        ))}

        {LIST_SECTIONS.map((section) => (
          <Card
            key={section.key}
            title={section.label}
            actions={section.key === "website" && (
              <Button size="xs" variant="ghost" icon={Sparkles} disabled={!monthKey} onClick={openChangelog}>
                From changelog
              </Button>
            )}
          >
            <StringLines
              value={sections[section.key]}
              placeholder={section.hint}
              onChange={(v) => setSection(section.key, v)}
            />
          </Card>
        ))}

        <Card title="Stats">
          <StatsEditor value={sections.stats} onChange={(v) => setSection("stats", v)} />
        </Card>

        <details className={`border ${hairline} rounded-xl px-4 py-3`}>
          <summary className="text-[13px] font-medium cursor-pointer">Advanced: raw JSON</summary>
          <div className="mt-3">
            <FormField
              key={jsonKey}
              field={{ name: "sections", type: "json" }}
              value={sections}
              onChange={(name, v) => setForm((prev) => ({ ...prev, [name]: v }))}
            />
          </div>
        </details>

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
          title="Delete this month?"
          message={confirming ? `"${confirming.rows[0].month} ${confirming.rows[0].year}" will be removed permanently.` : ""}
          confirmLabel="Delete"
          destructive
          onConfirm={async () => { await runDelete(); closeForm(); }}
          onClose={() => setConfirming(null)}
        />
        {guardDialog}
      </form>
    );
  }

  // --- List view -----------------------------------------------------------
  const openEdit = (row) => openForm({
    ...row, year: String(row.year), sections: row.sections || {},
  });

  const COLUMNS = [
    {
      key: "month",
      label: "Month",
      primary: true,
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          {`${r.month} ${r.year}`}
          {r.isCurrent && <Badge tone="accent">Current</Badge>}
        </span>
      ),
    },
    { key: "year", label: "Year", sortable: true, width: "6rem" },
    {
      key: "sections",
      label: "Sections",
      width: "8rem",
      sortable: true,
      sortValue: (r) => Object.keys(r.sections || {}).length,
      render: (r) => Object.keys(r.sections || {}).length,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Now · Months"
        description={rows ? `${rows.length} months on record` : "Loading…"}
        actions={(
          <Button variant="primary" icon={Plus} onClick={() => openForm(emptyForm())}>New month</Button>
        )}
      />

      <DataTable
        rows={rows}
        error={error}
        columns={COLUMNS}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search months…"
        searchKeys={["month", "year"]}
        renderActions={(row) => (
          <>
            <IconButton icon={Pencil} label="Edit" size="sm" onClick={() => openEdit(row)} />
            <a
              href="/now"
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
        )}
        emptyAction={(
          <Button size="sm" variant="primary" icon={Plus} onClick={() => openForm(emptyForm())}>New month</Button>
        )}
      />

      <ConfirmDialog
        open={!!confirming}
        title="Delete this month?"
        message={confirming ? `"${confirming.rows[0].month} ${confirming.rows[0].year}" will be removed permanently.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={runDelete}
        onClose={() => setConfirming(null)}
      />
      {guardDialog}
    </div>
  );
};

export default NowMonthEditor;
