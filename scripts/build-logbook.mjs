#!/usr/bin/env node
/**
 * Builds public/data/logbook.json — everything /logbook draws — from the post
 * text cache (knowledge_base/blog-posts-text.json, `npm run blogs:wordcount`)
 * and the embeddings /ask already stores in content_chunks. No model calls.
 *
 * Run after `npm run ask:index`: a post with no chunks yet is left off the
 * atlas (no `xy`), never placed at the origin.
 *
 * The text cache is gitignored and stays that way. What ships is derived:
 * counts, punctuation, sentence lengths, phrases, and single sentences that
 * each link back to their post (MAX_EXCERPT_WORDS in src/lib/logbook.js).
 *
 * Usage: npm run logbook [-- --dry-run]
 * .env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { UMAP } from "umap-js";
import { makeClient } from "./build-docs.mjs";
import { splitProse, syntheticId } from "./lib/chunking.mjs";
import { seededRandom } from "../src/lib/generativeArt.js";
import {
  MIN_POST_WORDS, cleanText, cosine, isMarathi, openingOf, pairLetters, phrases,
  pickLines, punctuationOf, splitSentences, topWords, wordsOf,
} from "../src/lib/logbook.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEXT_CACHE = path.join(ROOT, "knowledge_base/blog-posts-text.json");
const OUT = path.join(ROOT, "public/data/logbook.json");
const DRY_RUN = process.argv.includes("--dry-run");
const PAGE = 1000;
const SEED = 20201;
const REGIONS = 6;
// Tags that say where a post was filed, not what it is about.
const META_TAGS = new Set(["100_days_to_offload", "100 days to offload", "life"]);

const parseVec = (v) => (Array.isArray(v) ? v : JSON.parse(v));
const normalise = (v) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};
const mean = (vs) => vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0) / vs.length);

async function loadChunks(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("content_chunks")
      .select("entity_type, entity_id, chunk_index, embedding")
      .in("entity_type", ["blog", "writing"])
      .not("embedding", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`content_chunks: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// Lloyd's k-means on the 2D layout, seeded k-means++ start. Clustering the
// projection rather than the 1024-d vectors keeps each region where it is drawn.
function kmeans(points, k, rand) {
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const centres = [points[Math.floor(rand() * points.length)]];
  while (centres.length < k) {
    const w = points.map((p) => Math.min(...centres.map((c) => d2(p, c))));
    let r = rand() * w.reduce((a, b) => a + b, 0);
    centres.push(points[w.findIndex((x) => (r -= x) <= 0)] || points[points.length - 1]);
  }
  let assign = [];
  for (let it = 0; it < 50; it += 1) {
    const next = points.map((p) => centres.reduce((best, c, i) => (d2(p, c) < d2(p, centres[best]) ? i : best), 0));
    if (next.every((a, i) => a === assign[i])) break;
    assign = next;
    centres.forEach((_, c) => {
      const mine = points.filter((__, i) => assign[i] === c);
      if (mine.length) centres[c] = mean(mine);
    });
  }
  return { assign, centres };
}

const label = (tag) => tag.toLowerCase().replace(/[_-]+/g, " ");

// Each region is named by its two commonest topical tags. Two passes: every
// region first claims a primary tag no larger region holds, then takes as its
// second the commonest tag nobody else has used — so two neighbouring
// islands of digital-wellbeing essays are not both called "digital wellbeing".
function nameRegions(regions) {
  const ranked = regions.map((members) => {
    const count = new Map();
    members.forEach((p) => p.tags.map(label).filter((t) => !META_TAGS.has(t))
      .forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
    return [...count].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  });
  const primary = [];
  const claimed = new Set();
  regions
    .map((members, id) => ({ id, size: members.length }))
    .sort((a, b) => b.size - a.size)
    .forEach(({ id }) => {
      primary[id] = ranked[id].find((t) => !claimed.has(t)) || null;
      if (primary[id]) claimed.add(primary[id]);
    });
  return regions.map((members, id) => {
    if (!primary[id]) return members.some((p) => p.lang === "mr") ? "भटकंती" : "musings";
    const second = ranked[id].find((t) => !claimed.has(t));
    if (second) claimed.add(second);
    return second ? `${primary[id]} & ${second}` : primary[id];
  });
}

const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

async function main() {
  if (!fs.existsSync(TEXT_CACHE)) throw new Error("knowledge_base/blog-posts-text.json is missing — run `npm run blogs:wordcount` first");
  const { posts: raw, missing = [] } = JSON.parse(fs.readFileSync(TEXT_CACHE, "utf8"));
  // An incomplete cache (Substack unreachable, as on CI) would drop those
  // essays from the map; the last full build is the better answer.
  if (missing.length) {
    console.log(`  • ${missing.length} posts have no text (Substack unreachable?) — kept ${path.relative(ROOT, OUT)} as it is`);
    return;
  }

  const posts = raw
    .filter((p) => p.text && p.words >= MIN_POST_WORDS)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.url < b.url ? -1 : 1))
    .map((p) => {
      const tracked = Number.isFinite(p.blogId);
      const text = cleanText(p.text);
      const sentences = splitSentences(text);
      return {
        src: p,
        id: syntheticId(p.url).toString(36),
        ref: tracked ? { type: "blog", id: p.blogId } : { type: "writing", id: syntheticId(p.url) },
        lang: isMarathi(text) ? "mr" : "en",
        year: p.date.slice(0, 4),
        tags: p.tags || [],
        text,
        sentences,
      };
    });

  // Each post's vector is the mean of every chunk it has — for a tracked post
  // that includes blog.mjs's metadata chunk 0, so a post whose body is not
  // embedded yet still lands on the atlas. writing.mjs numbers the body chunks
  // from splitProse(text): 1..n for a tracked post, 0..n-1 for the rest — the
  // same split rebuilds each body chunk's text here for the letters.
  const supabase = makeClient();
  const chunkRows = await loadChunks(supabase);
  const byKey = new Map(chunkRows.map((r) => [`${r.entity_type}:${r.entity_id}:${r.chunk_index}`, normalise(parseVec(r.embedding))]));
  const letterChunks = [];
  posts.forEach((p) => {
    const offset = p.ref.type === "blog" ? 1 : 0;
    const vecs = offset && byKey.has(`blog:${p.ref.id}:0`) ? [byKey.get(`blog:${p.ref.id}:0`)] : [];
    splitProse(p.src.text).forEach((part, i) => {
      const vec = byKey.get(`${p.ref.type}:${p.ref.id}:${i + offset}`);
      if (!vec) return;
      vecs.push(vec);
      letterChunks.push({ postId: p.id, date: p.src.date, lang: p.lang, vec, text: cleanText(part) });
    });
    if (vecs.length) p.vec = normalise(mean(vecs));
  });

  const placed = posts.filter((p) => p.vec);
  const rand = seededRandom(SEED);
  // Wide neighbourhoods and a loose minDist: with ~100 essays the defaults
  // pull the Marathi treks and the privacy essays off into far islands and
  // squash everything else into a corner of the map.
  const umap = new UMAP({ nComponents: 2, nNeighbors: 40, minDist: 0.8, spread: 2, random: rand });
  const xy = umap.fit(placed.map((p) => p.vec));
  const xs = xy.map((v) => v[0]);
  const ys = xy.map((v) => v[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  placed.forEach((p, i) => { p.xy = [round((xy[i][0] - x0) / (x1 - x0)), round((xy[i][1] - y0) / (y1 - y0))]; });

  const { assign, centres } = kmeans(placed.map((p) => p.xy), REGIONS, rand);
  placed.forEach((p, i) => { p.cluster = assign[i]; });
  const regions = centres.map((_, i) => placed.filter((p) => p.cluster === i));
  const names = nameRegions(regions);
  const clusters = centres
    .map((c, i) => ({ id: i, label: names[i], xy: [round(c[0]), round(c[1])], size: regions[i].length }))
    .filter((c) => c.size);

  placed.forEach((p) => {
    p.near = placed
      .filter((q) => q !== p)
      .map((q) => [q.id, cosine(p.vec, q.vec)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  });

  const marks = (p, re) => (p.text.match(re) || []).length;
  const years = [...new Set(posts.map((p) => p.year))].sort();
  const byYear = years.map((y) => {
    const ps = posts.filter((p) => p.year === y);
    const words = ps.reduce((s, p) => s + p.src.words, 0);
    return {
      year: Number(y),
      posts: ps.length,
      words,
      en: ps.filter((p) => p.lang === "en").length,
      mr: ps.filter((p) => p.lang === "mr").length,
      exclaims: ps.reduce((s, p) => s + marks(p, /!/g), 0),
      questions: ps.reduce((s, p) => s + marks(p, /\?/g), 0),
    };
  });
  const sum = (k) => byYear.reduce((s, y) => s + y[k], 0);
  const sentenceCount = posts.reduce((s, p) => s + p.sentences.length, 0);

  const out = {
    generatedAt: new Date().toISOString(),
    totals: {
      posts: posts.length,
      words: sum("words"),
      en: sum("en"),
      mr: sum("mr"),
      exclaims: sum("exclaims"),
      questions: sum("questions"),
      sentences: sentenceCount,
      avgSentence: round(posts.reduce((s, p) => s + p.sentences.reduce((t, x) => t + wordsOf(x).length, 0), 0) / sentenceCount, 1),
      firstYear: Number(years[0]),
      lastYear: Number(years[years.length - 1]),
    },
    byYear,
    clusters,
    posts: posts.map((p) => ({
      id: p.id,
      ref: p.ref,
      title: p.src.title,
      date: p.src.date,
      url: p.src.url,
      platform: p.src.platform,
      lang: p.lang,
      tags: p.tags,
      words: p.src.words,
      ...(p.src.image ? { image: p.src.image } : {}),
      ...(p.xy ? { xy: p.xy, cluster: p.cluster, near: p.near } : {}),
      opening: openingOf(p.sentences),
      exclaims: (p.text.match(/!/g) || []).length,
      punct: punctuationOf(p.text, 360),
      rhythm: p.sentences.slice(0, 90).map((s) => wordsOf(s).length),
    })),
    phrases: { en: phrases(posts, "en"), mr: phrases(posts, "mr", { minPosts: 2 }) },
    words: { en: topWords(posts, "en"), mr: topWords(posts, "mr") },
    lines: posts.flatMap((p) => pickLines(p.src.url, p.sentences).map((l) => ({ ...l, post: p.id }))),
    letters: pairLetters(letterChunks),
  };

  const json = JSON.stringify(out);
  console.log(`${out.posts.length} posts (${placed.length} on the atlas, ${clusters.length} regions), `
    + `${out.lines.length} lines, ${out.letters.length} letters, ${(json.length / 1024).toFixed(0)} KB`);
  clusters.forEach((c) => console.log(`  region ${c.id}: ${c.label} (${c.size})`));
  if (DRY_RUN) return;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${json}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
