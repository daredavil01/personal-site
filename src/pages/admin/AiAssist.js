import React, { useEffect, useMemo, useState } from "react";
import FormField from "./FormField";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Field from "./ui/Field";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import DataTable from "./ui/DataTable";
import ConfirmDialog from "./ui/ConfirmDialog";
import { Select } from "./ui/Input";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import useUnsavedGuard from "./ui/useUnsavedGuard";
import { faintText, hairline, mutedText } from "./ui/tokens";
import { refreshAiFeatures } from "./useAiFeatures";
import { TierRows } from "./AskSettingsEditor";
import { AI_FEATURES, AI_MASTER_KEY } from "../../data/askConfig";
import {
  getAssistConfig, listAssistLog, pruneAssistLog, saveAssistConfig,
} from "../../lib/api/assist";

// The admin assist features — Draft, Suggest tags, alt text — in one place:
// their switches, the model ladder they run on, and every call they made
// (assist_log, 0034). The endpoint is functions/api/assist.js.

const TASKS = [
  { key: "tags", label: "Tag suggestions", feature: "tag_suggest" },
  { key: "draft", label: "Field drafts", feature: "draft_fields" },
  { key: "alt", label: "Image alt text", feature: "image_alt" },
];
const FEATURES = TASKS.map((t) => AI_FEATURES.find((f) => f.key === t.feature)).filter(Boolean);
const STATUS_TONE = { ok: "success", error: "danger", disabled: "warning" };
const DAYS = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"]];
const KEEP_DAYS = 90;

const percentile = (sorted, p) => (sorted.length
  ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
  : null);
const ms = (v) => (v == null ? "—" : `${v} ms`);
const dt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

/** Per-task numbers for the summary cards, from the rows already loaded. */
export function summarise(rows) {
  return TASKS.map((task) => {
    const mine = rows.filter((r) => r.task === task.key);
    const latencies = mine.filter((r) => r.status === "ok" && r.latency_ms != null)
      .map((r) => r.latency_ms).sort((a, b) => a - b);
    const tiers = {};
    mine.forEach((r) => { if (r.tier) tiers[r.tier] = (tiers[r.tier] || 0) + 1; });
    return {
      ...task,
      total: mine.length,
      ok: mine.filter((r) => r.status === "ok").length,
      errors: mine.filter((r) => r.status === "error").length,
      fallbacks: mine.filter((r) => r.failed_rungs?.length).length,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      tiers,
    };
  });
}

const outputText = (r) => {
  if (!r.output) return "";
  if (r.output.text) return r.output.text;
  const { suggested = [], maybe = [] } = r.output;
  return [suggested.join(", "), maybe.length ? `maybe: ${maybe.join(", ")}` : ""]
    .filter(Boolean).join(" · ");
};

const AiAssist = () => {
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [askTiers, setAskTiers] = useState([]);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState("30");
  const [filters, setFilters] = useState({ task: "", status: "" });
  const [search, setSearch] = useState("");
  const [pruning, setPruning] = useState(false);
  const toast = useToast();

  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(baseline);
  const unsaved = useUnsavedGuard(dirty);

  useEffect(() => {
    getAssistConfig()
      .then(({ aiFeatures, assistTiers, askTiers: ask }) => {
        const next = { aiFeatures, assistTiers };
        setForm(next);
        setBaseline(next);
        setAskTiers(ask);
      })
      .catch(setError);
  }, []);

  const loadLog = () => {
    setRows(null);
    listAssistLog({ days: Number(days) }).then(setRows).catch(setError);
  };
  useEffect(loadLog, [days]);

  const setFeature = (key, value) => setForm((prev) => ({
    ...prev, aiFeatures: { ...prev.aiFeatures, [key]: !!value },
  }));

  const save = async () => {
    setSaving(true);
    try {
      await saveAssistConfig(form);
      refreshAiFeatures();
      setBaseline(form);
      toast.success("Saved. The next call uses it.");
    } catch (err) {
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const prune = async () => {
    try {
      await pruneAssistLog(KEEP_DAYS);
      toast.success(`Deleted log rows older than ${KEEP_DAYS} days.`);
      setPruning(false);
      loadLog();
    } catch (err) {
      toast.error(err.message || "Could not delete.");
      setPruning(false);
    }
  };

  const summary = useMemo(() => (rows ? summarise(rows) : null), [rows]);
  const tierNames = useMemo(() => [...new Set((rows || []).map((r) => r.tier).filter(Boolean))], [rows]);
  const visible = useMemo(() => (rows || []).filter((r) => (!filters.task || r.task === filters.task)
    && (!filters.status || r.status === filters.status)
    && (!filters.tier || r.tier === filters.tier)), [rows, filters]);

  if (error) return <ErrorState error={error} />;
  if (!form) return <Spinner />;

  const usingAsk = !form.assistTiers.length;
  const columns = [
    { key: "created_at", label: "When", width: "11rem", sortable: true, render: (r) => dt(r.created_at) },
    {
      key: "task",
      label: "Task",
      width: "9rem",
      primary: true,
      render: (r) => (
        <span className="flex flex-col">
          <span className="text-[13px] font-medium">{TASKS.find((t) => t.key === r.task)?.label || r.task}</span>
          <span className={`text-[11px] ${faintText}`}>{[r.resource, r.field].filter(Boolean).join(" · ")}</span>
        </span>
      ),
    },
    { key: "status", label: "Status", width: "6rem", render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
    {
      key: "tier",
      label: "Model",
      width: "10rem",
      render: (r) => (
        <span className="flex flex-col">
          <span className="text-[13px]">{r.tier || "—"}</span>
          {!!r.failed_rungs?.length && (
            <span className={`text-[11px] ${faintText}`} title={r.failed_rungs.join("\n")}>
              {`after ${r.failed_rungs.length} failed`}
            </span>
          )}
        </span>
      ),
    },
    { key: "latency_ms", label: "Latency", width: "6rem", sortable: true, render: (r) => ms(r.latency_ms) },
    {
      key: "output",
      label: "Result",
      render: (r) => (
        <span className={`text-[12px] ${r.error ? "text-red-600 dark:text-red-400" : ""} line-clamp-2`} title={r.error || outputText(r)}>
          {r.error || outputText(r) || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI assist"
        description="The Draft, Suggest tags and alt-text helpers in the admin forms: whether they run, which models they run on, and every call they made."
        actions={(
          <Button variant="primary" size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      />

      <Card title="Switches" description="Each is off until switched on. The master switch is shared with every AI feature outside /ask.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Field label="AI features enabled (master)" hint="Off means nothing here runs, and neither do the other AI features in Ask · Settings." span="full">
            <FormField
              field={{ name: AI_MASTER_KEY, type: "boolean" }}
              value={!!form.aiFeatures[AI_MASTER_KEY]}
              onChange={setFeature}
            />
          </Field>
          {FEATURES.map((feature) => (
            <Field key={feature.key} label={feature.label} hint={feature.hint}>
              <FormField
                field={{ name: feature.key, type: "boolean" }}
                value={!!form.aiFeatures[feature.key]}
                onChange={setFeature}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card
        title="Model ladder"
        description="Tried top to bottom; the first rung that answers wins. Alt text only uses Gemini rungs — the others cannot see images."
      >
        {usingAsk && (
          <p className={`text-xs ${mutedText} mt-0 mb-3`}>
            {`Empty — using the /ask ladder: ${askTiers.filter((t) => t.enabled !== false).map((t) => t.name).join(" → ") || "none"}. Add a rung to give assist its own.`}
          </p>
        )}
        <TierRows
          rows={form.assistTiers}
          onChange={(v) => setForm((prev) => ({ ...prev, assistTiers: v }))}
          blank={{ name: "", provider: "gemini", model: "gemini-flash-lite-latest", timeout_ms: 8000, enabled: true }}
          noun="rung"
        />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-[11px] uppercase tracking-wide ${mutedText}`}>Window</span>
        <Select value={days} onChange={(e) => setDays(e.target.value)} className="w-32">
          {DAYS.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
        </Select>
        <Button size="sm" variant="dangerGhost" className="ml-auto" onClick={() => setPruning(true)}>
          {`Delete rows older than ${KEEP_DAYS} days`}
        </Button>
      </div>

      {summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {summary.map((s) => (
            <div key={s.key} className={`border ${hairline} rounded-xl p-4 flex flex-col gap-2`}>
              <p className="text-[13px] font-semibold mb-0">{s.label}</p>
              <p className="text-[22px] font-semibold tabular-nums mb-0">{s.total}</p>
              <p className={`text-[12px] ${mutedText} mb-0`}>
                {`${s.ok} ok · ${s.errors} errors · ${s.fallbacks} fell back`}
              </p>
              <p className={`text-[12px] ${mutedText} mb-0`}>{`p50 ${ms(s.p50)} · p95 ${ms(s.p95)}`}</p>
              {!!Object.keys(s.tiers).length && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(s.tiers).map(([tier, n]) => <Badge key={tier} tone="accent">{`${tier} ${n}`}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : <Spinner />}

      <Card title="Log">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Select value={filters.task} onChange={(e) => setFilters((f) => ({ ...f, task: e.target.value }))}>
            <option value="">Any task</option>
            {TASKS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Any status</option>
            {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={filters.tier || ""} onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value }))}>
            <option value="">Any model</option>
            {tierNames.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <DataTable
          rows={rows ? visible : null}
          columns={columns}
          search={search}
          onSearchChange={setSearch}
          searchKeys={["resource", "field", "tier", "error"]}
          searchPlaceholder="Search resource, field, model, error…"
          emptyTitle="No calls yet"
          emptyDescription="Press Suggest, Draft or upload an image in a form and it shows up here."
        />
        <p className={`text-[11px] ${faintText} mt-3 mb-0`}>
          Prompts and image bytes are never stored — only what was asked for and what came back.
        </p>
      </Card>

      <ConfirmDialog
        open={pruning}
        title="Delete old log rows?"
        message={`Every assist_log row older than ${KEEP_DAYS} days is deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={prune}
        onClose={() => setPruning(false)}
      />

      <ConfirmDialog
        open={unsaved.pending}
        title="Discard your changes?"
        message="AI assist has unsaved edits. Leaving now throws them away."
        confirmLabel="Discard"
        destructive
        onConfirm={unsaved.confirm}
        onClose={unsaved.cancel}
      />
    </div>
  );
};

export default AiAssist;
