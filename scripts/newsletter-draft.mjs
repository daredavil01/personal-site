#!/usr/bin/env node
/**
 * Drafts a newsletter issue — the deterministic half of the monthly workflow.
 *
 *   npm run newsletter:draft -- 2026-09                  # collect + card + brief
 *   npm run newsletter:draft -- 2026-09 --dry-run        # brief only, writes nothing
 *   npm run newsletter:draft -- 2026-09 --note knowledge_base/newsletter/2026-09.md
 *   npm run newsletter:draft -- --all                    # every existing month (backfill)
 *   npm run newsletter:draft -- 2026-09 --no-card        # skip the card render
 *
 * What it does, per month:
 *   1. Merges every blog, race, book, trek and micro-post dated in the month into
 *      that month's now_months.sections (mergeMonthRecords — idempotent: re-runs
 *      add nothing twice and backfill archive refs onto older rows).
 *   2. With --note, writes the headline, poll and letter from a markdown file
 *      with YAML frontmatter (the /newsletter Claude skill writes that file).
 *   3. Renders the 1200x630 share card and uploads it to Storage at
 *      media/og/newsletter-<slug>.png, then stores its URL as card_url.
 *   4. Writes knowledge_base/newsletter/<slug>.brief.json: what the month holds,
 *      the last two letters (for voice) and last month's poll result — the
 *      only facts the note may use.
 *
 * It NEVER publishes. Publishing is a human pressing Publish in /admin.
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import { makeClient } from "./build-docs.mjs";
import { createRenderer, inlineImage } from "./lib/og-render.mjs";
import { mergeMonthRecords } from "../src/lib/nowAutofill.js";
import { monthRange } from "../src/lib/monthDigest.js";
import { issueModel, itemTitle, slugLabel } from "../src/lib/newsletterIssue.js";
import { issueCardModel } from "../src/lib/og/model.js";
import { pageCard } from "../src/lib/og/layouts/page.js";
import { firstSlideImage, storageUrl } from "../src/lib/og/paths.js";
import { SITE_URL } from "../src/data/pageMeta.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "knowledge_base", "newsletter");
const SLUG_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const CARD_CAP = 300 * 1024;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const dryRun = flag("--dry-run");
const all = flag("--all");
const noCard = flag("--no-card");
const notePath = option("--note");
const slugArg = args.find((a) => SLUG_RE.test(a));

if (!all && !slugArg) {
  console.error("Usage: npm run newsletter:draft -- <YYYY-MM> [--note file.md] [--dry-run] [--no-card] | --all");
  process.exit(1);
}
if (all && notePath) {
  console.error("--note writes one month's letter; pass a month, not --all.");
  process.exit(1);
}

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

// Raw rows, shaped the way src/lib/api/* hands them to collectMonthRecords.
// Those modules cannot be imported here: they pull in the browser client.
async function loadContent(supabase) {
  const [blogs, sports, books, treks] = await Promise.all([
    supabase.from("blogs").select("id, blog_title, blog_description, blog_date, blog_link, blog_platform, created_at"),
    supabase.from("sports").select("id, title, date, description, place, distance, time, time_certificate_link, slide_images, created_at"),
    supabase.from("books").select("id, title, author, blog_link, date_finished, date_precision, created_at"),
    supabase.from("treks").select("id, fort_name, trek_time, endurance_level, date, blog_link, slide_images, created_at"),
  ]);
  return {
    blogs: must(blogs, "blogs"),
    sports: must(sports, "sports").map((s) => ({ ...s, timeCertificateLink: s.time_certificate_link })),
    books: must(books, "books"),
    treks: must(treks, "treks"),
  };
}

async function loadMicro(supabase, slug, url) {
  const { start, endExclusive } = monthRange(slug);
  const rows = must(await supabase
    .from("microblog")
    .select("id, date, post_type, title, text, image_url, tag_names")
    .gte("date", start)
    .lt("date", endExclusive)
    .order("date", { ascending: true })
    .limit(200), `microblog ${slug}`);
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    postType: r.post_type,
    title: r.title,
    text: r.text,
    tags: r.tag_names || [],
    imageUrl: storageUrl(r.image_url, url) || "",
  }));
}

function readNote(file) {
  const raw = fs.readFileSync(path.resolve(ROOT, file), "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const front = match ? YAML.parse(match[1]) || {} : {};
  const body = (match ? match[2] : raw).trim();
  const poll = front.poll && front.poll.q && Array.isArray(front.poll.options) && front.poll.options.length >= 2
    ? { q: String(front.poll.q), options: front.poll.options.map(String).slice(0, 6) }
    : null;
  const headline = String(front.headline || "").trim();
  if (headline.split(/\s+/).length > 6) {
    console.warn(`  ! headline is ${headline.split(/\s+/).length} words; the card wants 6 or fewer`);
  }
  return { headline, note: body, poll };
}

// The first decodable photo among the month's races, then treks, then photo
// posts. resvg cannot draw WebP, so a candidate that is not JPEG/PNG is skipped.
async function heroPhoto(sections, content, url) {
  const byId = (list, id) => list.find((r) => String(r.id) === String(id));
  const candidates = [
    ...(sections.running || []).map((r) => r.ref && byId(content.sports, r.ref.id))
      .map((row) => row && firstSlideImage(row.slide_images, url)),
    ...(sections.events || []).map((e) => e.ref?.type === "trek" && byId(content.treks, e.ref.id))
      .map((row) => row && firstSlideImage(row.slide_images, url)),
    ...(sections.micro || []).map((p) => p.imageUrl),
  ].filter(Boolean).slice(0, 8);
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop -- first decodable wins; order matters
    const inlined = await inlineImage(candidate);
    if (inlined) return inlined;
  }
  return null;
}

const camel = (row) => ({
  id: row.id,
  month: row.month,
  year: row.year,
  isCurrent: row.is_current,
  sections: row.sections || {},
  slug: row.slug,
  headline: row.headline,
  note: row.note,
  poll: row.poll,
  publishedAt: row.published_at,
  cardUrl: row.card_url,
});

async function lastPoll(supabase, months, slug) {
  const previous = months
    .filter((m) => m.slug < slug && m.published_at && m.poll?.q)
    .sort((a, b) => b.slug.localeCompare(a.slug))[0];
  if (!previous) return null;
  try {
    const summary = must(await supabase.rpc("newsletter_feedback_summary", { p_issue: previous.id }), "poll summary");
    return {
      issue: previous.slug,
      q: previous.poll.q,
      results: previous.poll.options.map((option, i) => ({ option, votes: Number(summary?.poll?.[i] || 0) })),
    };
  } catch (err) {
    console.warn(`  ! could not read last month's poll (${err.message})`);
    return null;
  }
}

async function draftMonth(slug, ctx) {
  const {
    supabase, url, content, months, render,
  } = ctx;
  const year = Number(slug.slice(0, 4));
  const existing = months.find((m) => m.slug === slug);
  const before = existing?.sections || {};

  const micro = await loadMicro(supabase, slug, url);
  const sections = mergeMonthRecords({ ...content, micro }, slug, before);
  const letter = notePath ? readNote(notePath) : {};

  const row = {
    ...(existing ? camel(existing) : {
      month: slugLabel(slug).split(" ")[0], year, isCurrent: false, publishedAt: null,
    }),
    slug,
    sections,
    ...(letter.headline ? { headline: letter.headline } : {}),
    ...(letter.note ? { note: letter.note } : {}),
    ...(letter.poll ? { poll: letter.poll } : {}),
  };
  const issue = issueModel(row);

  const added = Object.keys(sections)
    .map((key) => [key, (sections[key]?.length || 0) - (before[key]?.length || 0)])
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `+${n} ${key}`);
  console.info(`${slug}  ${existing ? "update" : "new"}  ${added.join(", ") || "no new records"}${letter.note ? "  + letter" : ""}`);

  let saved = existing;
  if (!dryRun) {
    const patch = {
      month: row.month,
      year: row.year,
      slug,
      sections,
      ...(letter.headline ? { headline: letter.headline } : {}),
      ...(letter.note ? { note: letter.note } : {}),
      ...(letter.poll ? { poll: letter.poll } : {}),
    };
    saved = existing
      ? must(await supabase.from("now_months").update(patch).eq("id", existing.id).select().single(), `update ${slug}`)
      : must(await supabase.from("now_months").insert(patch).select().single(), `insert ${slug}`);

    if (!noCard) {
      // A photo PNG runs 500 KB–1 MB, past the site's 300 KB card cap, and
      // WhatsApp drops an oversized thumbnail entirely. Over the cap, the card
      // falls back to the calendar alone, which is the section's shape anyway.
      let photo = await heroPhoto(sections, content, url);
      let png = await render(pageCard(issueCardModel(issue, { photo })));
      if (photo && png.length > CARD_CAP) {
        photo = null;
        png = await render(pageCard(issueCardModel(issue, { photo })));
      }
      const file = `og/newsletter-${slug}.png`;
      must(await supabase.storage.from("media").upload(file, png, {
        contentType: "image/png", upsert: true, cacheControl: "3600",
      }), `upload ${file}`);
      const cardUrl = supabase.storage.from("media").getPublicUrl(file).data.publicUrl;
      must(await supabase.from("now_months").update({ card_url: cardUrl }).eq("id", saved.id), `card_url ${slug}`);
      console.info(`         card ${(png.length / 1024).toFixed(0)} KB${photo ? " (with photo)" : ""}${png.length > CARD_CAP ? "  ! over the 300 KB cap" : ""}`);
    }
  }

  return { issue, saved, sections };
}

async function writeBrief(slug, { issue, saved }, ctx) {
  const previousNotes = ctx.months
    .filter((m) => m.slug < slug && m.note)
    .sort((a, b) => b.slug.localeCompare(a.slug))
    .slice(0, 2)
    .map((m) => ({ slug: m.slug, headline: m.headline, note: m.note }));
  const brief = {
    slug,
    label: slugLabel(slug),
    status: saved?.published_at ? "published" : "draft",
    headline: issue.headline,
    stats: issue.stats,
    activeDays: Object.keys(issue.days).length,
    // Micro-posts run to paragraphs; the first line is enough to write about.
    sections: Object.fromEntries(issue.sections.map((s) => [
      s.label,
      s.items.map((item) => itemTitle(s.key, item).split(/\r?\n/)[0].slice(0, 160)),
    ])),
    customStats: issue.extraStats,
    lastPoll: await lastPoll(ctx.supabase, ctx.months, slug),
    previousNotes,
    adminUrl: saved?.id ? `${SITE_URL}/admin/now/months?edit=${saved.id}` : null,
    issueUrl: `${SITE_URL}/newsletter/${slug}`,
  };
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${slug}.brief.json`);
  fs.writeFileSync(file, `${JSON.stringify(brief, null, 2)}\n`);
  console.info(`         brief ${path.relative(ROOT, file)}`);
}

async function main() {
  const supabase = makeClient();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const months = must(await supabase.from("now_months").select("*"), "now_months");
  const content = await loadContent(supabase);
  const render = dryRun || noCard ? null : await createRenderer();
  const ctx = {
    supabase, url, content, months, render,
  };

  const slugs = all ? months.map((m) => m.slug).filter(Boolean).sort() : [slugArg];
  for (const slug of slugs) {
    // eslint-disable-next-line no-await-in-loop -- sequential keeps the log readable and the renderer's memory flat
    const result = await draftMonth(slug, ctx);
    // eslint-disable-next-line no-await-in-loop
    if (!all) await writeBrief(slug, result, ctx);
  }
  if (dryRun) console.info("\nDry run: nothing was written to Supabase or Storage.");
  else console.info("\nNothing was published. Review and publish at /admin/now/months.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
