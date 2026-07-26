import React, { useCallback, useEffect, useState } from "react";
import FormField, { inputClass } from "../FormField";
import { LoadingBlock, ErrorBlock } from "../../../components/common/AsyncStates";
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

// Dedicated manager for `now_months` (not the generic ResourceManager): the
// month's `sections` blob holds nine differently-shaped sub-sections that used
// to be typed as raw JSON. Each gets a real form here, plus two auto-fills —
// one from the content tables, one from the changelog.

// Enough to cover a busy micro-blogging month without shipping the archive.
const MICRO_LIMIT = 50;

const labelClass = "font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400";
const cardClass = "border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col gap-3";

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

  const { data: blogs } = useBlogs();
  const { data: sports } = useSports();
  const { data: books } = useBooks();
  const { data: treks } = useTreks();

  const refresh = useCallback(() => {
    setRows(null);
    setError(null);
    nowMonths.list().then(setRows).catch(setError);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const monthKey = form ? formMonthKey(form) : null;
  const sections = form?.sections || {};

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
    if (!window.confirm(`Delete "${row.month} ${row.year}"?`)) return;
    try {
      await nowMonths.remove(row.id);
      refresh();
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(`Delete failed: ${err.message}`);
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

  // --- Form view -----------------------------------------------------------
  if (form) {
    return (
      <form onSubmit={save} className="flex flex-col gap-5 max-w-3xl">
        <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">
          {form.id ? "Edit" : "New"} Now month
        </h2>

        <div className={cardClass}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Month *</span>
              <select
                className={inputClass}
                value={form.month}
                onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
              >
                {MONTH_ORDER.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Year *</span>
              <FormField
                field={{ name: "year", type: "number" }}
                value={form.year}
                onChange={(name, v) => setForm((prev) => ({ ...prev, [name]: v }))}
              />
            </div>
            {/* The checkbox is nested directly inside this label. */}
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 pb-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-stone-300 text-secondary focus:ring-secondary dark:border-stone-600 dark:bg-stone-800"
                checked={!!form.isCurrent}
                onChange={(e) => setForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
              />
              Current month
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!monthKey || pulling}
              onClick={openContent}
              className="px-4 py-2 bg-secondary text-white rounded-lg font-label text-xs uppercase tracking-widest font-bold disabled:opacity-40"
            >
              {pulling ? "Pulling…" : "Pull records for this month"}
            </button>
            <button
              type="button"
              disabled={!monthKey}
              onClick={openChangelog}
              className="px-4 py-2 bg-stone-200 dark:bg-stone-700 rounded-lg font-label text-xs uppercase tracking-widest font-bold disabled:opacity-40"
            >
              Pull highlights from changelog
            </button>
          </div>
          {contentError && (
            <p className="text-sm text-red-600 mb-0">Could not load micro posts: {contentError}</p>
          )}
          {changelogError && (
            <p className="text-sm text-red-600 mb-0">Could not read the changelog: {changelogError}</p>
          )}
        </div>

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
          <div key={spec.key} className={cardClass}>
            <span className={labelClass}>{spec.label}</span>
            <RepeatableRows
              spec={spec}
              value={sections[spec.key]}
              onChange={(v) => setSection(spec.key, v)}
            />
          </div>
        ))}

        {LIST_SECTIONS.map((section) => (
          <div key={section.key} className={cardClass}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className={labelClass}>{section.label}</span>
              {section.key === "website" && (
                <button
                  type="button"
                  disabled={!monthKey}
                  onClick={openChangelog}
                  className="text-xs font-bold uppercase tracking-wider text-secondary disabled:opacity-40"
                >
                  Pull highlights from changelog
                </button>
              )}
            </div>
            <StringLines
              value={sections[section.key]}
              placeholder={section.hint}
              onChange={(v) => setSection(section.key, v)}
            />
          </div>
        ))}

        <div className={cardClass}>
          <span className={labelClass}>Stats</span>
          <StatsEditor value={sections.stats} onChange={(v) => setSection("stats", v)} />
        </div>

        <details className="border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <summary className="cursor-pointer font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Advanced: raw JSON
          </summary>
          <div className="mt-3">
            <FormField
              key={jsonKey}
              field={{ name: "sections", type: "json" }}
              value={sections}
              onChange={(name, v) => setForm((prev) => ({ ...prev, [name]: v }))}
            />
          </div>
        </details>

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
            onClick={() => { setForm(null); setPreview(null); }}
            className="px-5 py-2.5 bg-stone-200 dark:bg-stone-700 rounded-lg font-label text-xs uppercase tracking-widest font-bold"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // --- List view -----------------------------------------------------------
  const openNew = () => { setForm(emptyForm()); setPreview(null); setJsonKey((k) => k + 1); };
  const openEdit = (row) => {
    setForm({ ...row, year: String(row.year), sections: row.sections || {} });
    setPreview(null);
    setJsonKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">Now · Months</h2>
        <button
          type="button"
          onClick={openNew}
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
              <span className="text-sm text-stone-800 dark:text-stone-200 truncate">
                {row.month} {row.year}
                {row.isCurrent && (
                  <span className="ml-2 font-label text-[9px] uppercase tracking-widest bg-secondary text-white px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </span>
              <span className="flex gap-2 shrink-0">
                <button type="button" onClick={() => openEdit(row)} className="text-xs font-bold uppercase tracking-wider text-secondary">Edit</button>
                <button type="button" onClick={() => remove(row)} className="text-xs font-bold uppercase tracking-wider text-red-600">Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NowMonthEditor;
