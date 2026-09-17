import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { useTags } from "../context/ContentContext";
import { getTagEntities } from "../lib/api/tags";
import { SITE_URL } from "../data/pageMeta";
import { ogCardUrl } from "../lib/og/paths";
import { colorForTag } from "../lib/generativeArt";
import { ErrorBlock, LoadingBlock } from "../components/common/AsyncStates";

// Section order, heading, and where each kind of row lives on the site.
// Instagram has no per-post page, so it links to the gallery.
const GROUPS = [
  { type: "blog", label: "Blog posts", href: (id) => `/100-days-to-offload/${id}` },
  { type: "book", label: "Books", href: (id) => `/books/${id}` },
  { type: "sport", label: "Races", href: (id) => `/sports/${id}` },
  { type: "trek", label: "Treks", href: (id) => `/treks/${id}` },
  { type: "project", label: "Projects", href: (id) => `/projects/${id}` },
  { type: "presentation", label: "Presentations", href: (id) => `/presentations/${id}` },
  { type: "microblog", label: "Micro-posts", href: (id) => `/micro-blog/${id}` },
  { type: "instagram", label: "Instagram", href: () => "/instagram" },
];

const BackLink = () => (
  <Link to="/tags" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
    <span className="material-symbols-outlined text-sm">arrow_back</span> All tags
  </Link>
);

const TagDetail = () => {
  const { name: rawName } = useParams();
  const name = (rawName || "").toLowerCase();
  const { data: tags, loading: tagsLoading } = useTags();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setItems(null);
    setError(null);
    getTagEntities(name)
      .then((rows) => { if (live) setItems(rows); })
      .catch((err) => { if (live) setError(err); });
    return () => { live = false; };
  }, [name]);

  const tag = tags.find((t) => t.name === name);
  const label = tag?.displayName || name;
  const color = colorForTag(name, tag?.color);

  if (error) return <PageShell region="person"><ErrorBlock /></PageShell>;
  if (!items || (tagsLoading && !tag)) return <PageShell region="person"><LoadingBlock label="Loading tag…" /></PageShell>;

  if (!items.length) {
    return (
      <PageShell region="person" title={`#${name}`}>
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <BackLink />
          <p className="font-body text-stone-500 dark:text-stone-400">{`Nothing is tagged #${name} yet.`}</p>
        </div>
      </PageShell>
    );
  }

  const groups = GROUPS
    .map((g) => ({ ...g, rows: items.filter((i) => i.entityType === g.type) }))
    .filter((g) => g.rows.length);

  return (
    <PageShell
      region="person"
      title={`#${label}`}
      description={tag?.description || `Everything on the site tagged #${label} — ${items.length} item${items.length === 1 ? "" : "s"}.`}
      imageAlt={`Tag card for ${label}`}
      // Keyed on the tag's numeric id so the image path stays ASCII while the
      // route keeps its un-slugified (often Devanagari) name.
      image={tag?.id
        ? ogCardUrl({ kind: "tag", id: tag.id, fallbackSlug: "tags", siteUrl: SITE_URL })
        : undefined}
    >
      <article className="flex flex-col gap-10 w-full max-w-3xl">
        <BackLink />

        <header>
          <h1 className="font-headline text-4xl text-stone-900 dark:text-stone-100 mb-3 leading-tight flex items-center gap-3">
            <span aria-hidden="true" className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {`#${label}`}
          </h1>
          <p className="font-label text-xs uppercase tracking-[0.25em] text-stone-400 dark:text-stone-500 mb-0">
            {`${items.length} item${items.length === 1 ? "" : "s"} · ${groups.map((g) => `${g.rows.length} ${g.label.toLowerCase()}`).join(" · ")}`}
            {tag?.category ? ` · ${tag.category}` : ""}
          </p>
          {tag?.description && (
            <p className="font-body text-stone-600 dark:text-stone-300 leading-relaxed mt-4 mb-0">{tag.description}</p>
          )}
          <div className="h-px w-full mt-8" style={{ backgroundColor: color, opacity: 0.35 }} />
        </header>

        {groups.map((g) => (
          <section key={g.type}>
            <h2 className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-900 dark:text-stone-300 font-bold mb-4">
              {`${g.label} · ${g.rows.length}`}
            </h2>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {g.rows.map((r) => (
                <li key={r.entityId} className="m-0">
                  <Link
                    to={g.href(r.entityId)}
                    className="group flex items-baseline justify-between gap-4 px-4 py-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-secondary/40 transition-colors no-underline"
                  >
                    <span className="min-w-0">
                      <span className="block font-body text-sm text-stone-800 dark:text-stone-100 group-hover:text-secondary transition-colors line-clamp-2">
                        {r.title || "Untitled"}
                      </span>
                      {r.subtitle && (
                        <span className="block font-label text-[11px] text-stone-400 dark:text-stone-500 mt-0.5 truncate">{r.subtitle}</span>
                      )}
                    </span>
                    {r.date && <span className="font-mono text-[10px] text-stone-400 shrink-0">{r.date}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </PageShell>
  );
};

export default TagDetail;
