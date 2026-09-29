import React, { useEffect, useState } from "react";
import FormField from "../FormField";
import Card from "../ui/Card";
import Field from "../ui/Field";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { Input } from "../ui/Input";
import { StringLines } from "./SectionEditors";
import { useToast } from "../ui/ToastContext";
import { ExternalLink, FileText, MessagesSquare } from "../ui/icons";
import { mutedText } from "../ui/tokens";
import {
  REACTIONS, issueModel, issueToHtml, itemTitle, slugLabel,
} from "../../../lib/newsletterIssue";
import { monthSlug } from "../../../lib/api/now";
import { getFeedbackSummary, listReplies } from "../../../lib/api/newsletter";
import { SITE_URL } from "../../../data/pageMeta";

// The newsletter half of a now_months row (0032): the letter, the poll, the
// publish switch, the Substack copy and what readers sent back. The month's
// sections above are the issue's content; this is what makes it an issue.

/** Headline, letter and poll. `rows` supplies earlier letters as draft examples. */
export const IssueFields = ({ form, rows, onChange }) => {
  const slug = monthSlug(form.month, Number(form.year));
  const model = issueModel({ ...form, slug });
  const poll = form.poll || { q: "", options: [] };
  const words = (form.headline || "").trim().split(/\s+/).filter(Boolean).length;
  return (
    <Card title="Newsletter letter">
      <div className="flex flex-col gap-4">
        <Field label="Headline" hint={`Six words or fewer — it is the share card's title.${words > 6 ? ` Now ${words}.` : ""}`}>
          <Input value={form.headline || ""} maxLength={80} onChange={(e) => onChange({ headline: e.target.value })} />
        </Field>
        <Field label="Letter" hint="Markdown. Numbers must come from the sections above — the draft button is told so.">
          <FormField
            field={{
              name: "note", label: "Newsletter letter (first person, warm, ≤250 words)", type: "textarea", aiDraft: true,
            }}
            value={form.note || ""}
            onChange={(_, v) => onChange({ note: v })}
            draftContext={{
              resource: "monthly newsletter letter",
              values: {
                month: slugLabel(slug),
                headline: form.headline,
                numbers: model.stats.map((s) => `${s.value} ${s.label}`).join(", "),
                ...Object.fromEntries(model.sections.map((s) => [
                  s.label, s.items.map((i) => itemTitle(s.key, i).split(/\r?\n/)[0].slice(0, 120)).join("; "),
                ])),
              },
              examples: (rows || []).filter((r) => r.note && r.id !== form.id).slice(0, 3).map((r) => r.note),
            }}
          />
        </Field>
        <Field label="Poll question" hint="Optional. Readers vote on the issue page; the result belongs in next month's letter.">
          <Input value={poll.q} maxLength={140} onChange={(e) => onChange({ poll: { ...poll, q: e.target.value } })} />
        </Field>
        {poll.q && (
          <Field label="Poll options" hint="Two to six, one per line.">
            <StringLines
              value={poll.options}
              placeholder="One option per line"
              onChange={(options) => onChange({ poll: { ...poll, options: options.slice(0, 6) } })}
            />
          </Field>
        )}
      </div>
    </Card>
  );
};

/** Draft/published state, the publish switch, the Substack copy and a link out. */
export const IssuePublish = ({ form, onChange }) => {
  const toast = useToast();
  const slug = monthSlug(form.month, Number(form.year));
  const published = !!form.publishedAt;

  // The Substack editor keeps headings, lists and links from pasted HTML.
  const copy = async () => {
    const html = issueToHtml({ ...form, slug }, SITE_URL);
    try {
      await navigator.clipboard.write([new window.ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([html.replace(/<[^>]+>/g, "")], { type: "text/plain" }),
      })]);
      toast.success("Copied — paste it into a new Substack post.");
    } catch (_) {
      await navigator.clipboard.writeText(html);
      toast.success("Copied as HTML — paste it into Substack's HTML block.");
    }
  };

  return (
    <Card title="Issue">
      <div className="flex flex-wrap items-center gap-3">
        {published ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>}
        <span className={`text-xs ${mutedText}`}>
          {slug ? `/newsletter/${slug}` : "Pick a month"}
          {form.cardUrl ? " · card ready" : " · no card yet (npm run newsletter:draft)"}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={published ? "ghost" : "primary"}
            onClick={() => onChange({ publishedAt: published ? null : new Date().toISOString() })}
          >
            {published ? "Unpublish" : "Publish on save"}
          </Button>
          <Button size="sm" icon={FileText} disabled={!slug} onClick={copy}>Copy for Substack</Button>
          {slug && (
            <a
              href={`/newsletter/${slug}`}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 text-xs ${mutedText} hover:underline`}
            >
              <ExternalLink size={12} aria-hidden="true" />
              Preview
            </a>
          )}
        </div>
      </div>
    </Card>
  );
};

/** Counts and the private replies for a saved, published issue. */
export const IssueFeedbackPanel = ({ issueId }) => {
  const [summary, setSummary] = useState(null);
  const [replies, setReplies] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!issueId) return;
    Promise.all([getFeedbackSummary(issueId), listReplies(issueId)])
      .then(([s, r]) => {
        setSummary(s);
        setReplies(r);
      })
      .catch((err) => setError(err.message));
  }, [issueId]);

  if (!issueId) return null;
  const reactions = Object.entries(summary?.reactions || {});
  const emoji = Object.fromEntries(REACTIONS.map((r) => [r.key, r.emoji]));
  return (
    <Card title="Reader feedback">
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-0">{error}</p>}
      {!summary && !error && <p className={`text-sm ${mutedText} mb-0`}>Loading…</p>}
      {summary && (
        <div className="flex flex-col gap-4 text-[13px]">
          <div className="flex flex-wrap gap-4">
            <span>{summary.rating?.n ? `★ ${summary.rating.avg} from ${summary.rating.n}` : "No ratings yet"}</span>
            <span>{`${replies?.length || 0} replies`}</span>
            {Object.keys(summary.poll || {}).length > 0 && (
              <span>{`Poll: ${Object.entries(summary.poll).map(([i, n]) => `option ${Number(i) + 1} × ${n}`).join(", ")}`}</span>
            )}
          </div>
          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {reactions.map(([section, counts]) => (
                <span key={section}>
                  {`${section}: ${Object.entries(counts).map(([k, n]) => `${emoji[k] || k} ${n}`).join(" ")}`}
                </span>
              ))}
            </div>
          )}
          {Object.keys(summary.picks || {}).length > 0 && (
            <span>{`Most useful: ${Object.entries(summary.picks).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(", ")}`}</span>
          )}
          {replies?.length > 0 && (
            <ul className="flex flex-col gap-3 list-none p-0 m-0">
              {replies.map((r) => (
                <li key={r.id} className="border-l-2 border-stone-200 dark:border-stone-700 pl-3">
                  <p className="whitespace-pre-line mb-1">{r.message}</p>
                  <span className={`text-xs ${mutedText} inline-flex items-center gap-1`}>
                    <MessagesSquare size={12} aria-hidden="true" />
                    {`${r.name || "Anonymous"} · ${new Date(r.created_at).toLocaleDateString()}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
};
