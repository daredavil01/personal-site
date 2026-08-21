import React, { useEffect, useState } from "react";
import FormField from "./FormField";
import { RepeatableRows } from "./now/SectionEditors";
import { getNowMeta, updateNowMeta } from "../../lib/api/now";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Field from "./ui/Field";
import Button from "./ui/Button";
import { Spinner, ErrorState } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import useUnsavedGuard from "./ui/useUnsavedGuard";
import ConfirmDialog from "./ui/ConfirmDialog";
import { hairline, mutedText, surface } from "./ui/tokens";

const FIELDS = [
  { name: "introStory", label: "Intro story", type: "textarea", span: "full" },
  { name: "categoryLabels", label: "Category labels", type: "tags", span: "full" },
  { name: "nownownowUrl", label: "nownownow URL", type: "url", span: "full" },
];

// `daily_rituals` is a jsonb array of {label, icon, description} — src/pages/Now.js
// renders `icon` as a Material Symbols glyph name. It used to be typed as raw
// JSON in a textarea; these are the same fields as a form.
const RITUALS_SPEC = {
  label: "ritual",
  fields: [
    { name: "label", label: "Label", type: "text", required: true },
    { name: "icon", label: "Icon", type: "text", hint: "Material Symbols name, e.g. directions_run" },
    { name: "description", label: "Description", type: "textarea", full: true },
  ],
};

// `inspired_by` is a single object ({name, url, nownownow}), not a list.
const INSPIRED_FIELDS = [
  { name: "name", label: "Name", type: "text" },
  { name: "url", label: "URL", type: "url" },
  { name: "nownownow", label: "nownownow link", type: "url" },
];

const NowMetaEditor = () => {
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(baseline);
  const unsaved = useUnsavedGuard(dirty);

  useEffect(() => {
    getNowMeta()
      .then((m) => {
        const next = {
          introStory: m.introStory ?? "",
          categoryLabels: m.categoryLabels ?? [],
          nownownowUrl: m.nownownowUrl ?? "",
          inspiredBy: m.inspiredBy ?? {},
          dailyRituals: Array.isArray(m.dailyRituals) ? m.dailyRituals : [],
        };
        setForm(next);
        setBaseline(next);
      })
      .catch(setError);
  }, []);

  const onField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const setInspired = (name, value) => setForm((prev) => ({
    ...prev, inspiredBy: { ...(prev.inspiredBy || {}), [name]: value },
  }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateNowMeta(form);
      setBaseline(form);
      toast.success("Now · Meta saved.");
    } catch (err) {
      toast.error(`Couldn't save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState error={error} title="Couldn't load Now · Meta" />;
  if (!form) return <Spinner />;

  return (
    <form onSubmit={save} className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Now · Meta"
        description="The standing copy around the Now page's monthly entries."
      />

      <Card title="Intro">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {FIELDS.map((field) => (
            <Field key={field.name} label={field.label} hint={field.hint} span={field.span}>
              <FormField field={field} value={form[field.name]} folder="now" onChange={onField} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Daily rituals" description="Rendered as the tile row under the Now page intro">
        <RepeatableRows
          spec={RITUALS_SPEC}
          value={form.dailyRituals}
          folder="now"
          onChange={(v) => onField("dailyRituals", v)}
        />
      </Card>

      <Card title="Inspired by" description="Credit for the /now page idea">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
          {INSPIRED_FIELDS.map((field) => (
            <Field key={field.name} label={field.label}>
              <FormField
                field={field}
                value={form.inspiredBy?.[field.name] ?? ""}
                folder="now"
                onChange={setInspired}
              />
            </Field>
          ))}
        </div>
      </Card>

      {/* Escape hatch, as on the month editor: the structured fields above
          cover every documented key, but a row written by hand or by a future
          import can carry more, and this is how you see and fix it. Keyed on
          the value so the textarea reseeds after a structured edit. */}
      <details className={`border ${hairline} rounded-xl px-4 py-3`}>
        <summary className="text-[13px] font-medium cursor-pointer">Advanced: raw JSON</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-4">
          <Field label="Daily rituals" span="half">
            <FormField
              key={`rituals-${JSON.stringify(form.dailyRituals)}`}
              field={{ name: "dailyRituals", type: "json" }}
              value={form.dailyRituals}
              onChange={onField}
            />
          </Field>
          <Field label="Inspired by" span="half">
            <FormField
              key={`inspired-${JSON.stringify(form.inspiredBy)}`}
              field={{ name: "inspiredBy", type: "json" }}
              value={form.inspiredBy}
              onChange={onField}
            />
          </Field>
        </div>
      </details>

      <div className={`fixed bottom-0 left-0 right-0 md:left-60 z-30 flex items-center gap-2 px-4 md:px-8 py-3 border-t ${hairline} ${surface}`}>
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
        message="Now · Meta has unsaved edits. Leaving now throws them away."
        confirmLabel="Discard"
        destructive
        onConfirm={unsaved.confirm}
        onClose={unsaved.cancel}
      />
    </form>
  );
};

export default NowMetaEditor;
