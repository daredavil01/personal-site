import React, { useEffect, useState } from "react";
import FormField from "./FormField";
import {
  getAskSettings,
  updateAskSettings,
  getAskUsage,
} from "../../lib/api/askSettings";
import { ASK_PROVIDERS } from "../../data/askConfig";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Field from "./ui/Field";
import Button from "./ui/Button";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "./ui/icons";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import useUnsavedGuard from "./ui/useUnsavedGuard";
import ConfirmDialog from "./ui/ConfirmDialog";
import { hairline, mutedText, surface } from "./ui/tokens";

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
];

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
const TierRows = ({ rows, onChange }) => {
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
            <span className={`text-xs ${mutedText}`}>{`Tier ${i + 1}`}</span>
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
            {TIER_FIELDS.map((field) => (
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
      <Button size="sm" icon={Plus} className="self-start" onClick={() => onChange([...rows, BLANK_TIER])}>
        Add tier
      </Button>
    </div>
  );
};

const AskSettingsEditor = () => {
  const [form, setForm] = useState(null);
  const [meta, setMeta] = useState(null);
  const [usage, setUsage] = useState([]);
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
  }, []);

  const onField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAskSettings(form);
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

      <Card title="Switch">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {SWITCHES.map((field) => (
            <Field key={field.name} label={field.label} hint={field.hint}>
              <FormField field={field} value={form[field.name]} onChange={onField} />
            </Field>
          ))}
        </div>
      </Card>

      <Card
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
        title="Model ladder"
        description="Tried top to bottom until one answers. If they all fail, /ask still returns the matching pages with a short note."
      >
        <TierRows rows={form.tiers} onChange={(v) => onField("tiers", v)} />
      </Card>

      <Card
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

      <Card title="Copy" description="The prompt and the three canned replies.">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5">
          {COPY.map((field) => (
            <Field key={field.name} label={field.label} hint={field.hint} span={field.span}>
              <FormField field={field} value={form[field.name]} onChange={onField} />
            </Field>
          ))}
          <Field label="Suggested questions" hint="Shown as chips on the empty /ask page" span="full">
            <FormField
              field={{ name: "suggestedQuestions", type: "stringList" }}
              value={form.suggestedQuestions}
              onChange={onField}
            />
          </Field>
        </div>
      </Card>

      <Card
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
        <Card title="Last 14 days" description="Which tier actually answered.">
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
