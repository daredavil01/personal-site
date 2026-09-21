import React, { useEffect, useState } from "react";
import FormField from "./FormField";
import {
  getAskSettings,
  updateAskSettings,
  getAskUsage,
  getAskEvalUsage,
} from "../../lib/api/askSettings";
import {
  AI_FEATURES, AI_MASTER_KEY, ASK_JUDGE_PROVIDERS, ASK_PROVIDERS, QUESTION_CATEGORIES,
} from "../../data/askConfig";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Field from "./ui/Field";
import Button from "./ui/Button";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "./ui/icons";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import useUnsavedGuard from "./ui/useUnsavedGuard";
import { refreshAiFeatures } from "./useAiFeatures";
import ConfirmDialog from "./ui/ConfirmDialog";
import { hairline, labelClass, mutedText, surface } from "./ui/tokens";
import { RepeatableRows } from "./now/SectionEditors";

const JUDGE_TIER_FIELDS = [
  { name: "name", label: "Label", type: "text" },
  { name: "provider", label: "Provider", type: "select", options: ASK_JUDGE_PROVIDERS },
  {
    name: "route",
    label: "Route (jev only)",
    type: "selectOrOther",
    options: ["gateway", "typesafe"],
    hint: "gateway spends the free AI Gateway credit; typesafe bills per token.",
  },
  { name: "model", label: "Model", type: "text" },
  { name: "timeout_ms", label: "Timeout (ms)", type: "number" },
  { name: "enabled", label: "Enabled", type: "boolean" },
];

const BLANK_JUDGE_TIER = {
  name: "",
  provider: "gemini",
  model: "gemini-flash-lite-latest",
  timeout_ms: 12000,
  enabled: true,
};

// Automatic evaluation of logged answers by a decision model (migration 0022).
// Separate from the ladder above: this grades answers, it does not write them.
const AUTO_EVAL = [
  {
    name: "autoEvalEnabled",
    label: "Grade answers automatically",
    type: "boolean",
    hint: "Off by default. Needs AI_GATEWAY_API_KEY or TYPESAFE_API_KEY on the deployment.",
  },
  {
    name: "autoEvalExplainEnabled",
    label: "Let Gemini explain low-confidence grades",
    type: "boolean",
    hint: "The judge returns probabilities, never prose. This writes the reason underneath.",
  },
  {
    name: "autoEvalAllowMetered",
    label: "Allow rungs that cost money",
    type: "boolean",
    hint: "Off means a rung billed per token is skipped however it is configured. This is the switch that keeps grading free.",
  },
  {
    name: "autoEvalBatchCap",
    label: "Answers per press",
    type: "number",
    hint: "The most one press of Grade these may grade.",
  },
  {
    name: "autoEvalRequestBatch",
    label: "Answers per request",
    type: "number",
    hint: "Small on purpose — Workers Free allows about 10ms of CPU per request.",
  },
  {
    name: "autoEvalMinConfidence",
    label: "Low-confidence threshold",
    type: "number",
    hint: "0-1. Below this a grade is tagged needs-review instead of trusted.",
  },
  {
    name: "autoEvalMonthlyTokenCap",
    label: "Input tokens per month",
    type: "number",
    hint: "Fails closed. 2,000,000 is about $0.08 at the judge's rate; 0 grades nothing.",
  },
];

const SWITCHES = [
  { name: "enabled", label: "Second brain enabled", type: "boolean" },
  {
    name: "turnstileRequired",
    label: "Require Turnstile",
    type: "boolean",
    hint: "Needs TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY on the deployment",
  },
];

const LIMITS = [
  { name: "dailyGlobalCap", label: "Questions per day (everyone)", type: "number" },
  { name: "dailyIpCap", label: "Questions per day (per visitor)", type: "number" },
  { name: "maxMessageChars", label: "Max question length", type: "number" },
  { name: "maxHistoryTurns", label: "Turns of history sent", type: "number" },
  {
    name: "dailyVoiceGlobalCap",
    label: "Transcriptions per day (everyone)",
    type: "number",
    hint: "Counted separately from questions, so a hot microphone cannot spend the day's answers",
  },
  { name: "dailyVoiceIpCap", label: "Transcriptions per day (per visitor)", type: "number" },
];

const RETRIEVAL = [
  { name: "matchCount", label: "Items retrieved", type: "number", hint: "1–30" },
  { name: "fullTextWeight", label: "Keyword weight", type: "number" },
  { name: "semanticWeight", label: "Meaning weight", type: "number" },
  {
    name: "semanticFloor",
    label: "Meaning floor",
    type: "number",
    hint: "0–1 similarity. Raise it if answers cite loosely related items; lower it if good questions come back empty",
  },
  {
    name: "keywordFloor",
    label: "Keyword floor",
    type: "number",
    hint: "0–1 normalised rank. The same idea for the keyword half: raise it if weak word matches crowd out good ones, 0 to disable",
  },
];

// One starter chip. `c` is the subject the draw stratifies by, so a question
// filed under the wrong category quietly skews what visitors are offered.
const QUESTION_POOL_SPEC = {
  label: "question",
  fields: [
    { name: "q", label: "Question", type: "text", full: true },
    { name: "c", label: "Category", type: "select", options: QUESTION_CATEGORIES },
  ],
};

const COPY = [
  {
    name: "systemPersona",
    label: "System prompt",
    type: "textarea",
    span: "full",
    hint: "Prepended to every question. The archive card from docs/ is appended automatically.",
  },
  { name: "refusalNote", label: "When nothing matches", type: "textarea", span: "full" },
  { name: "quotaNote", label: "When the daily cap is hit", type: "textarea", span: "full" },
  { name: "disabledNote", label: "When switched off", type: "textarea", span: "full" },
];

const TIER_FIELDS = [
  { name: "name", label: "Label", type: "text" },
  { name: "provider", label: "Provider", type: "select", options: ASK_PROVIDERS },
  { name: "model", label: "Model", type: "text" },
  { name: "timeout_ms", label: "Timeout (ms)", type: "number" },
  { name: "enabled", label: "Enabled", type: "boolean" },
];

const BLANK_TIER = {
  name: "",
  provider: "gemini",
  model: "",
  timeout_ms: 6000,
  enabled: true,
};

// The ladder is ordered, so this needs move up/down — which the shared
// RepeatableRows does not do. Everything else about it is the same.
const TierRows = ({ rows, onChange, fields = TIER_FIELDS, blank = BLANK_TIER, noun = "tier" }) => {
  const set = (i, name, value) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [name]: value } : r)));
  const move = (i, delta) => {
    const next = [...rows];
    const target = i + delta;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        // Tiers have no stable id; index is the identity, as in SlideImages.
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className={`border ${hairline} rounded-xl p-4 flex flex-col gap-3`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${mutedText}`}>{`${noun} ${i + 1}`}</span>
            <div className="ml-auto flex items-center gap-1">
              <Button size="xs" icon={ChevronUp} onClick={() => move(i, -1)} disabled={i === 0}>
                Up
              </Button>
              <Button
                size="xs"
                icon={ChevronDown}
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1}
              >
                Down
              </Button>
              <Button
                size="xs"
                variant="dangerGhost"
                icon={Trash2}
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              >
                Remove
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {fields.map((field) => (
              <Field key={field.name} label={field.label} hint={field.hint}>
                <FormField
                  field={field}
                  value={row[field.name]}
                  onChange={(name, v) => set(i, name, v)}
                />
              </Field>
            ))}
          </div>
        </div>
      ))}
      <Button size="sm" icon={Plus} className="self-start" onClick={() => onChange([...rows, blank])}>
        {`Add ${noun}`}
      </Button>
    </div>
  );
};

const AskSettingsEditor = () => {
  const [form, setForm] = useState(null);
  const [meta, setMeta] = useState(null);
  const [usage, setUsage] = useState([]);
  const [evalUsage, setEvalUsage] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(meta?.baseline);
  const unsaved = useUnsavedGuard(dirty);

  useEffect(() => {
    getAskSettings()
      .then((s) => {
        if (!s) throw new Error("No ask_settings row — apply migration 0009 first.");
        const next = { ...s };
        delete next.contextDoc;
        delete next.contextDocUpdatedAt;
        setForm(next);
        setMeta({
          baseline: next,
          contextDoc: s.contextDoc,
          contextDocUpdatedAt: s.contextDocUpdatedAt,
        });
      })
      .catch(setError);
    // Usage is a nice-to-have; a failure here must not blank the editor.
    getAskUsage(14).then(setUsage).catch(() => setUsage([]));
    // Missing before migration 0022 is applied; an empty panel is the right
    // degradation, not an error page over a settings form.
    getAskEvalUsage(3).then(setEvalUsage).catch(() => setEvalUsage([]));
  }, []);

  const onField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  // The AI switchboard is one jsonb column, so its toggles write into that
  // object rather than onto a field of their own.
  const setFeature = (key, value) => setForm((prev) => ({
    ...prev,
    aiFeatures: { ...(prev.aiFeatures || {}), [key]: !!value },
  }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAskSettings(form);
      // The AI switches are cached per page load, so the Draft button would keep
      // its old visibility until a reload without this.
      refreshAiFeatures();
      setMeta((prev) => ({ ...prev, baseline: form }));
      toast.success("Ask settings saved. Live within a minute.");
    } catch (err) {
      toast.error(`Couldn't save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState error={error} title="Couldn't load Ask settings" />;
  if (!form) return <Spinner />;

  const today = usage[0];

  return (
    <form onSubmit={save} className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Ask · Settings"
        description="Everything /ask reads at request time. Changes go live within a minute — no redeploy."
      />

      <Card collapsible title="Switch">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {SWITCHES.map((field) => (
            <Field key={field.name} label={field.label} hint={field.hint}>
              <FormField field={field} value={form[field.name]} onChange={onField} />
            </Field>
          ))}
        </div>
      </Card>

      <Card
        collapsible
        title="Limits"
        description="The endpoint fails closed: past these caps it answers with the note below instead of calling a model."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {LIMITS.map((field) => (
            <Field key={field.name} label={field.label} hint={field.hint}>
              <FormField field={field} value={form[field.name]} onChange={onField} />
            </Field>
          ))}
        </div>
        {today && (
          <p className={`text-xs ${mutedText} mt-4`}>
            {`Today: ${today.total} question${today.total === 1 ? "" : "s"} from ${
              today.visitors
            } visitor${today.visitors === 1 ? "" : "s"}.`}
          </p>
        )}
      </Card>

      <Card
        collapsible
        title="Model ladder"
        description="Tried top to bottom until one answers. If they all fail, /ask still returns the matching pages with a short note."
      >
        <TierRows rows={form.tiers} onChange={(v) => onField("tiers", v)} />
      </Card>

      <Card
        collapsible
        title="Retrieval"
        description="How many chunks to pull, and how keyword and meaning are weighted when the two rankings are fused."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
          {RETRIEVAL.map((field) => (
            <Field key={field.name} label={field.label} hint={field.hint}>
              <FormField field={field} value={form[field.name]} onChange={onField} />
            </Field>
          ))}
        </div>
      </Card>

      <Card collapsible title="Copy" description="The prompt and the three canned replies.">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5">
          {COPY.map((field) => (
            <Field key={field.name} label={field.label} hint={field.hint} span={field.span}>
              <FormField field={field} value={form[field.name]} onChange={onField} />
            </Field>
          ))}
          <Field
            label="Question pool"
            hint="Four chips are drawn per page load, one from each of four random categories — so the category matters as much as the wording"
            span="full"
          >
            <RepeatableRows
              spec={QUESTION_POOL_SPEC}
              value={form.questionPool}
              onChange={(rows) => onField("questionPool", rows)}
            />
          </Field>
          <Field
            label="Fallback questions"
            hint="Shown only when the pool above is empty"
            span="full"
          >
            <FormField
              field={{ name: "suggestedQuestions", type: "stringList" }}
              value={form.suggestedQuestions}
              onChange={onField}
            />
          </Field>
        </div>
      </Card>

      <Card
        collapsible
        title="AI features"
        description="Everything outside /ask that calls a model: the admin Draft button and the batch scripts. Each is off until switched on here, and the master switch overrides all of them."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Field
            label="AI features enabled"
            hint="Master switch. Off means none of the features below run, whatever their own switch says."
            span="full"
          >
            <FormField
              field={{ name: AI_MASTER_KEY, type: "boolean" }}
              value={!!(form.aiFeatures || {})[AI_MASTER_KEY]}
              onChange={setFeature}
            />
          </Field>
          {AI_FEATURES.map((feature) => (
            <Field key={feature.key} label={feature.label} hint={feature.hint}>
              <FormField
                field={{ name: feature.key, type: "boolean" }}
                value={!!(form.aiFeatures || {})[feature.key]}
                onChange={setFeature}
              />
            </Field>
          ))}
        </div>
        <p className={`text-xs ${mutedText} mt-4 mb-0`}>
          A batch script reads these too, so turning one off stops the next run as well as the
          button. Every one of them is owner-only or offline — none adds a model call a visitor
          can reach.
        </p>
      </Card>

      <Card
        collapsible
        title="Automatic evaluation"
        description="Grades logged answers on demand from Ask · Conversations. A grade you typed yourself is never overwritten."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {AUTO_EVAL.map((field) => (
            <Field key={field.name} label={field.label} hint={field.hint}>
              <FormField field={field} value={form[field.name]} onChange={onField} />
            </Field>
          ))}
        </div>
        <div className="mt-6">
          <p className={`${labelClass} mb-1`}>Judge ladder</p>
          <p className={`text-xs ${mutedText} mb-3`}>
            Tried in order until one answers. Only `jev` returns calibrated probabilities —
            a grade from a language model rung is tagged `judge-fallback`, because the
            review threshold was chosen on Jev&apos;s calibration, not on a self-reported number.
            `gemini` and `workers-ai` cost nothing.
          </p>
          <TierRows
            rows={form.autoEvalTiers || []}
            onChange={(rows) => onField("autoEvalTiers", rows)}
            fields={JUDGE_TIER_FIELDS}
            blank={BLANK_JUDGE_TIER}
            noun="rung"
          />
        </div>
        {evalUsage[0] && (
          <p className={`text-xs ${mutedText} mt-4`}>
            {`This month: ${evalUsage[0].graded} answer${
              evalUsage[0].graded === 1 ? "" : "s"
            } graded over ${evalUsage[0].runs} run${
              evalUsage[0].runs === 1 ? "" : "s"
            }, ${evalUsage[0].inputTokens.toLocaleString()} input tokens of ${
              Number(form.autoEvalMonthlyTokenCap || 0).toLocaleString()
            }.`}
          </p>
        )}
      </Card>

      <Card
        collapsible
        title="Archive card"
        description="Generated by `npm run ask:index` from docs/chatbot-context.md and appended to the system prompt. Read-only here."
      >
        <p className={`text-xs ${mutedText} mb-2`}>
          {meta?.contextDocUpdatedAt
            ? `Last regenerated ${new Date(meta.contextDocUpdatedAt).toLocaleString()}`
            : "Never generated — run npm run ask:index"}
        </p>
        <pre className={`text-xs whitespace-pre-wrap border ${hairline} rounded-xl p-3 max-h-64 overflow-auto`}>
          {meta?.contextDoc || "(empty)"}
        </pre>
      </Card>

      {usage.length > 1 && (
        <Card collapsible title="Last 14 days" description="Which tier actually answered.">
          <div className="overflow-x-auto">
            <table className="text-[13px] w-full">
              <thead>
                <tr className={mutedText}>
                  <th className="text-left py-1 pr-4">Day</th>
                  <th className="text-left py-1 pr-4">Questions</th>
                  <th className="text-left py-1 pr-4">Visitors</th>
                  <th className="text-left py-1">Tiers</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((d) => (
                  <tr key={d.day} className={`border-t ${hairline}`}>
                    <td className="py-1 pr-4">{d.day}</td>
                    <td className="py-1 pr-4">{d.total}</td>
                    <td className="py-1 pr-4">{d.visitors}</td>
                    <td className="py-1">
                      {Object.entries(d.tiers || {})
                        .map(([k, v]) => `${k} ${v}`)
                        .join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 md:left-60 z-30 flex items-center gap-2 px-4 md:px-8 py-3 border-t ${hairline} ${surface}`}
      >
        <div className="mx-auto w-full max-w-5xl flex items-center gap-2">
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {dirty && <span className={`text-xs ${mutedText}`}>Unsaved changes</span>}
        </div>
      </div>

      <ConfirmDialog
        open={unsaved.pending}
        title="Discard your changes?"
        message="Ask settings has unsaved edits. Leaving now throws them away."
        confirmLabel="Discard"
        destructive
        onConfirm={unsaved.confirm}
        onClose={unsaved.cancel}
      />
    </form>
  );
};

export default AskSettingsEditor;
