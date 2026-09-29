import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import useViewMode from "../atlas/useViewMode";
import { buildNewsletterMeta } from "../data/pageMeta";
import { issueModel } from "../lib/newsletterIssue";
import { LoadingBlock } from "../components/common/AsyncStates";
import { heroPhoto, useArchiveLookup, useIssues } from "../components/Newsletter/issueHooks";
import { useIssueFeedback } from "../components/Newsletter/IssueFeedback";
import IssueLetter from "../components/Newsletter/IssueLetter";
import IssueMagazine from "../components/Newsletter/IssueMagazine";
import useSession from "./admin/useSession";

// One monthly issue. The same row renders as a Letter in the atlas and as a
// Magazine in the classic view — two presentations of one issueModel().
const NewsletterIssue = () => {
  const { slug } = useParams();
  const mode = useViewMode();
  const { issues, published, loading } = useIssues();
  const find = useArchiveLookup();
  const session = useSession();

  const row = issues.find((i) => i.slug === slug) || null;
  const model = useMemo(() => issueModel(row), [row]);
  const hero = useMemo(() => heroPhoto(model, find), [model, find]);
  // Feedback is for published issues only — the RPC refuses a draft.
  const fb = useIssueFeedback(row?.id, !!row?.publishedAt);

  if ((loading && !row) || (row && !row.publishedAt && session === undefined)) {
    return <PageShell region="person"><LoadingBlock label="Opening the letter…" /></PageShell>;
  }

  // An unpublished month is readable here only when signed in (the owner's
  // preview). The public can read the current month's row — /now shows it —
  // but its letter is not written yet, so it gets pointed at /now instead.
  if (!row || (!row.publishedAt && !session)) {
    return (
      <PageShell region="person" title="Issue not found">
        <div className="flex flex-col gap-4 max-w-xl">
          <h1 className="font-headline text-3xl font-black text-stone-900 dark:text-stone-100">No letter for that month</h1>
          <p className="font-body text-stone-500 dark:text-stone-400">
            It may not be written yet — this month so far is on
            {" "}
            <Link to="/now">Now</Link>
            .
          </p>
          <Link to="/newsletter" className="font-label text-xs uppercase tracking-widest text-secondary">All issues →</Link>
        </div>
      </PageShell>
    );
  }

  const meta = buildNewsletterMeta({
    label: model.label,
    headline: row.headline,
    stats: model.stats.map((s) => `${s.value} ${s.label}`).join(", "),
    image: row.cardUrl,
  });

  // Newest first, so the older issue is the next one in the list.
  const index = published.findIndex((i) => i.slug === slug);
  const prev = index >= 0 ? published[index + 1] : null;
  const next = index > 0 ? published[index - 1] : null;
  const nav = (i) => (i ? { slug: i.slug, label: issueModel(i).label } : null);

  const Layout = mode === "atlas" ? IssueLetter : IssueMagazine;
  return (
    <PageShell region="person" title={meta.title} description={meta.description} image={meta.image} ogType="article">
      <Layout
        key={row.id}
        row={row}
        model={model}
        hero={hero}
        fb={row.publishedAt ? fb : null}
        find={find}
        prev={nav(prev)}
        next={nav(next)}
      />
    </PageShell>
  );
};

export default NewsletterIssue;
