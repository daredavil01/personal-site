import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import changelogUrl from "../../data/changelog.md?url";
import { parseChangelog, VERSION_HEADING_RE } from "../../lib/changelogParse";
import changelog, { getChangelog } from "../../lib/api/changelog";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { Checkbox } from "./ui/Input";
import { Spinner } from "./ui/Feedback";
import { useToast } from "./ui/ToastContext";
import { hairline, mutedText } from "./ui/tokens";

// Reviews src/data/changelog.md against the `changelog` table and publishes
// what you approve.
//
// The markdown file is the staging buffer: a code change appends its entry
// there, in the same commit and the same diff as the code it describes, so the
// entry is reviewed as code review. This page is where that entry becomes a
// published row. It runs as the owner under RLS, so it needs no service-role
// key — unlike `npm run changelog:push`, which does the same job headlessly and
// can also empty the file afterwards. A browser cannot write to the repo, so
// clearing the buffer is always a commit or that script, never this page.

// new      — not in the table yet
// changed  — published, but the buffer's copy differs
// same     — published, identical
const STATE_TONE = { new: "success", changed: "warning", same: "neutral" };

// `npm run changelog:notes` writes the reader-facing paragraph into the row,
// not back into the buffer, so a buffer entry almost never carries one. It is
// therefore never a difference, and publishing never blanks a summary that is
// already there — only a buffer entry that has its own replaces it.
const sameEntry = (entry, row) => entry.date === row.date
  && (!entry.summary || entry.summary === (row.summary || ""))
  && JSON.stringify(entry.changes) === JSON.stringify(row.changes);

const ChangelogSync = () => {
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      const [md, rows] = await Promise.all([
        fetch(changelogUrl).then((r) => {
          if (!r.ok) throw new Error(`buffer fetch failed (${r.status})`);
          return r.text();
        }),
        getChangelog(),
      ]);
      const body = md.replace(/^---[\s\S]*?---\s*\n/, "");
      const entries = parseChangelog(body);

      // A heading the parser does not recognise is a version whose bullets are
      // silently attached to the version above it. Counted rather than
      // trusted: the eight oldest headings in this file did exactly that until
      // the date pattern was widened to accept a month with no day.
      const headings = body.split(/\r?\n/).filter((l) => VERSION_HEADING_RE.test(l)).length;
      if (headings !== entries.length) {
        throw new Error(
          `${headings} version headings in the buffer but ${entries.length} parsed — one is malformed. Fix the heading and reload.`,
        );
      }

      const byVersion = new Map(rows.map((r) => [r.version, r]));
      const next = entries.map((entry) => {
        const row = byVersion.get(entry.version) || null;
        let state = "new";
        if (row) state = sameEntry(entry, row) ? "same" : "changed";
        return { entry, row, state };
      });
      setItems(next);
      // Anything already published identically starts unchecked: re-running the
      // same buffer should be a no-op you have to opt into.
      setSelected(new Set(next.filter((i) => i.state !== "same").map((i) => i.entry.version)));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => (items || []).reduce(
    (acc, i) => ({ ...acc, [i.state]: (acc[i.state] || 0) + 1 }),
    {},
  ), [items]);

  const toggle = (version) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(version)) next.delete(version);
    else next.add(version);
    return next;
  });

  const selectAll = () => setSelected(new Set((items || []).map((i) => i.entry.version)));
  const selectNone = () => setSelected(new Set());

  const save = async () => {
    const targets = (items || []).filter((i) => selected.has(i.entry.version));
    if (!targets.length) return;
    setSaving(true);
    let done = 0;
    try {
      // Indexed rather than for…of: airbnb bans the iterator protocol in src/.
      for (let i = 0; i < targets.length; i += 1) {
        const { entry, row } = targets[i];
        const values = {
          version: entry.version,
          date: entry.date,
          summary: entry.summary || row?.summary || "",
          changes: entry.changes,
        };
        // Sequential on purpose: 91 parallel writes on the first run is a
        // thundering herd for no gain, and a failure halfway through should be
        // able to say which version it stopped on.
        // eslint-disable-next-line no-await-in-loop
        if (row) await changelog.update(row.id, values);
        // eslint-disable-next-line no-await-in-loop
        else await changelog.create(values);
        done += 1;
      }
      toast.success(`Published ${done} version${done === 1 ? "" : "s"}.`);
      await load();
    } catch (err) {
      toast.error(`Stopped after ${done}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Sync changelog" />
        <Card>
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          <Button onClick={load}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Sync changelog" />
        <Spinner label="Reading the buffer…" />
      </div>
    );
  }

  const allPublished = items.length > 0 && counts.same === items.length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sync changelog"
        description="src/data/changelog.md is the staging buffer. Review what it holds, then publish it into the changelog table that /changelog and /ask read."
        actions={(
          <>
            <Button variant="ghost" onClick={load} disabled={saving}>Reload</Button>
            <Button onClick={save} disabled={saving || !selected.size}>
              {saving ? "Publishing…" : `Publish ${selected.size} selected`}
            </Button>
          </>
        )}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <p className={`text-sm ${mutedText} mb-0`}>
            {`${items.length} version${items.length === 1 ? "" : "s"} in the buffer — `}
            {`${counts.new || 0} new, ${counts.changed || 0} edited, ${counts.same || 0} already published.`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={selectAll} disabled={saving}>Select all</Button>
            <Button size="sm" variant="ghost" onClick={selectNone} disabled={saving}>Select none</Button>
          </div>
        </div>
        {allPublished && (
          <p className={`text-sm ${mutedText} mt-2 mb-0`}>
            Everything in the buffer is published. Empty the file in your next
            commit — a browser cannot write to the repo, so clearing it stays a
            commit (or npm run changelog:push, which clears it for you).
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        {items.map(({ entry, row, state }) => (
          <div key={entry.version} className={`rounded-md border p-3 ${hairline}`}>
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox
                checked={selected.has(entry.version)}
                onChange={() => toggle(entry.version)}
                aria-label={`Publish ${entry.version}`}
              />
              <span className="font-semibold">{entry.version}</span>
              <span className={`text-xs ${mutedText}`}>{entry.date}</span>
              <Badge tone={STATE_TONE[state]}>{state}</Badge>
              <span className={`text-xs ${mutedText}`}>
                {`${entry.changes.length} change${entry.changes.length === 1 ? "" : "s"}`}
              </span>
              {row && (
                <Link to="/admin/changelog" className="text-xs text-secondary hover:underline ml-auto">
                  Edit the published row
                </Link>
              )}
            </div>

            {entry.summary && (
              <p className={`text-sm ${mutedText} mt-2 mb-0 pl-8`}>{entry.summary}</p>
            )}

            <ul className="mt-2 mb-0 pl-8 list-disc flex flex-col gap-1">
              {entry.changes.map((change, i) => (
                <li key={i} className="text-sm">
                  <span className={`text-xs ${mutedText} mr-2`}>{change.kind}</span>
                  {change.name && <strong>{change.name}</strong>}
                  {change.name && change.body && ": "}
                  <span className={mutedText}>{change.body}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {!items.length && (
          <Card>
            <p className={`text-sm ${mutedText} mb-0`}>
              The buffer is empty — every version is published. Nothing to do here.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChangelogSync;
