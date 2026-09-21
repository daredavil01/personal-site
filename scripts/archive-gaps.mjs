#!/usr/bin/env node
/**
 * What readers asked that the archive could not answer.
 *
 * `ask_messages` has recorded every question, every answer, every reader
 * thumb and every grade since the log shipped, and nothing reads it in
 * aggregate except the tiles on /admin/ask/conversations. This is the pass
 * that turns it into a sentence worth acting on: "eleven people asked about X
 * and there was nothing to answer with".
 *
 * Report only. It writes a JSON file to knowledge_base/ and changes no row —
 * deciding what to write next is not a model's call.
 *
 * Usage:
 *   npm run ask:gaps                      last 90 days
 *   npm run ask:gaps -- --days 30
 *   npm run ask:gaps -- --limit 200       cap the questions sent for clustering
 *   npm run ask:gaps -- --dry-run         list the gaps, skip the model
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY in .env, and the
 * archive_gaps switch on under AI features in /admin/ask/settings.
 * --dry-run needs neither the key nor the switch to be useful; it still reads
 * the switch, because a script is the same spend as the endpoint.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeClient } from "./build-docs.mjs";
import { askGemini, parseJson, tiersForFeature } from "./lib/gemini.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "knowledge_base");

const DRY_RUN = process.argv.includes("--dry-run");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const DAYS = Number(argValue("--days")) || 90;
// Gemini gets one prompt, not one per question. 200 questions is a long
// prompt and still well inside the window; more than that says the site is
// busy enough to want a real clustering pass rather than a batch script.
const LIMIT = Number(argValue("--limit")) || 200;

const SYSTEM = [
  "You group questions readers asked a personal website's search assistant, and that it could not answer.",
  "The site covers books, running and trekking, software projects, blog posts, micro-posts and a résumé.",
  "Group the questions into at most 8 themes. A theme needs at least two questions; put the rest under the theme \"one-offs\".",
  "For each theme give: name (3 words or fewer), the question numbers in it, and one sentence saying what the archive would need in order to answer them.",
  "Do not invent questions. Do not suggest that the assistant be reworded — the suggestion is about content that does not exist.",
  "Return JSON only: {\"themes\":[{\"name\":\"\",\"questions\":[1,2],\"needs\":\"\"}]}",
].join(" ");

/**
 * Why one answer counts as a gap.
 *
 * Three independent signals, cheapest first, and any of them is enough:
 * retrieval found nothing at all, the grader called the refusal wrong, or a
 * reader pressed thumbs down. The first is the only one that is always
 * present — grades and thumbs are both sparse — so it carries the report.
 */
function gapReason(row) {
  const disposition = row.eval_auto?.disposition || "";
  if (disposition === "refused_wrongly") return "graded over-refusal";
  if ((row.eval_tags || []).includes("over-refusal")) return "graded over-refusal";
  if (row.feedback === -1) return "reader thumbs down";
  if (!row.source_count) return "no sources retrieved";
  return null;
}

/** Collapses near-identical askings so one chip clicked 40 times is one gap. */
function normalise(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const supabase = makeClient();
  const tiers = DRY_RUN ? null : await tiersForFeature(supabase, "archive_gaps");

  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const { data: rows, error } = await supabase
    .from("ask_messages")
    .select("id, conversation_id, turn_index, role, content, source_count, feedback, eval_tags, eval_auto, created_at")
    .gte("created_at", since)
    .order("conversation_id")
    .order("turn_index");
  if (error) throw error;

  // The question is the user row immediately before its answer. ask_log()
  // writes the pair in one call, so the index is always n and n+1.
  const byTurn = new Map(rows.map((r) => [`${r.conversation_id}:${r.turn_index}`, r]));
  const answers = rows.filter((r) => r.role === "assistant");

  const gaps = new Map();
  answers.forEach((row) => {
    const reason = gapReason(row);
    if (!reason) return;
    const asked = byTurn.get(`${row.conversation_id}:${row.turn_index - 1}`);
    const question = String(asked?.content || "").trim();
    if (!question) return;

    const key = normalise(question);
    const entry = gaps.get(key) || { question, times: 0, reasons: new Set(), lastAt: row.created_at };
    entry.times += 1;
    entry.reasons.add(reason);
    if (row.created_at > entry.lastAt) entry.lastAt = row.created_at;
    gaps.set(key, entry);
  });

  const ranked = [...gaps.values()]
    .map((g) => ({ ...g, reasons: [...g.reasons] }))
    .sort((a, b) => b.times - a.times || (a.lastAt < b.lastAt ? 1 : -1));

  console.log(
    `${answers.length} answers in the last ${DAYS} days, `
    + `${ranked.length} distinct questions the archive did not answer`,
  );
  ranked.slice(0, 20).forEach((g, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ×${g.times}  ${g.question}  [${g.reasons.join(", ")}]`);
  });

  let themes = [];
  const shortlist = ranked.slice(0, LIMIT);
  if (!DRY_RUN && shortlist.length >= 2) {
    const prompt = shortlist
      .map((g, i) => `${i + 1}. (asked ${g.times}×) ${g.question}`)
      .join("\n");
    try {
      themes = parseJson(await askGemini({ tiers, system: SYSTEM, prompt }))?.themes || [];
    } catch (err) {
      // The list above is the report; the clustering is the nice-to-have.
      console.error(`\nClustering failed, writing the raw list anyway — ${err.message}`);
    }
  }

  themes.forEach((t) => {
    const qs = (t.questions || [])
      .map((n) => shortlist[Number(n) - 1]?.question)
      .filter(Boolean);
    console.log(`\n${t.name} (${qs.length})\n  needs: ${t.needs}`);
    qs.forEach((q) => console.log(`  - ${q}`));
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUT_DIR, `archive-gaps-${stamp}.json`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    days: DAYS,
    answersConsidered: answers.length,
    gaps: ranked,
    themes,
  }, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${path.relative(ROOT, file)}. Nothing else was changed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
