import React, { useEffect, useState } from "react";
import FormField from "./FormField";
import { getNowMeta, updateNowMeta } from "../../lib/api/now";
import { LoadingBlock, ErrorBlock } from "../../components/common/AsyncStates";

const FIELDS = [
  { name: "introStory", label: "Intro story", type: "textarea" },
  { name: "categoryLabels", label: "Category labels", type: "tags" },
  { name: "nownownowUrl", label: "nownownow URL", type: "url" },
  { name: "inspiredBy", label: "Inspired by (JSON)", type: "json" },
  { name: "dailyRituals", label: "Daily rituals (JSON)", type: "json" },
];

const NowMetaEditor = () => {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getNowMeta()
      .then((m) => setForm({
        introStory: m.introStory ?? "",
        categoryLabels: m.categoryLabels ?? [],
        nownownowUrl: m.nownownowUrl ?? "",
        inspiredBy: m.inspiredBy ?? {},
        dailyRituals: m.dailyRituals ?? [],
      }))
      .catch(setError);
  }, []);

  const onField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateNowMeta(form);
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorBlock />;
  if (!form) return <LoadingBlock label="Loading…" />;

  return (
    <form onSubmit={save} className="flex flex-col gap-4 max-w-2xl">
      <h2 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-0">Now · Meta</h2>
      {FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <span className="font-label text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {field.label}
          </span>
          <FormField field={field} value={form[field.name]} folder="now" onChange={onField} />
        </div>
      ))}
      <div className="flex gap-3 items-center">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-secondary text-white rounded-lg font-label text-xs uppercase tracking-widest font-bold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved!</span>}
      </div>
    </form>
  );
};

export default NowMetaEditor;
