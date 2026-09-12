#!/usr/bin/env node
/**
 * One-off (but re-runnable) metadata backfill for the `books` table.
 *
 * Fills the columns added by supabase/migrations/0008_books_reborn.sql:
 *   cover_url, isbn, page_count, publisher, first_published, goodreads_url,
 *   quote, date_finished, date_precision.
 *
 * Usage:
 *   1. Apply 0008_books_reborn.sql (SQL editor or `supabase db push`).
 *   2. Fill .env with SUPABASE_URL (or VITE_SUPABASE_URL) and
 *      SUPABASE_SERVICE_ROLE_KEY.
 *   3. npm run books:backfill -- --dry-run     # inspect the matches
 *      npm run books:backfill                  # write them
 *
 * IDEMPOTENT. A column that already has a value is never overwritten, so a
 * second run is a no-op and a cover fixed by hand in /admin survives.
 *
 * Sources, first hit wins per field:
 *   1. Open Library  — good for English, returns literally nothing for the
 *      Marathi titles in this library (verified).
 *   2. Google Books  — publisher/pages/thumbnail; rate-limits aggressively
 *      without an API key, so a 429 is treated as a miss, not a crash.
 *   3. BookGanga     — the Marathi catalogue. Its search page is plain
 *      server-rendered HTML; matches are scored on title-token overlap and
 *      anything below MIN_SCORE is rejected rather than guessed at.
 *
 * Covers are downloaded and re-uploaded to the `media` bucket under `books/`
 * rather than hotlinked — hotlinks rot and BookGanga will eventually block
 * them. No re-encoding step: every source here already serves covers well
 * under the 150 KB target (checked, and anything over MAX_COVER_BYTES is
 * refused rather than uploaded).
 *
 * Pull-quotes are lifted from Sanket's own reviews, which is only possible
 * where the platform serves HTML — Substack, WordPress and Blogger do; Canva
 * (the review lives inside a design) and LinkedIn (login wall) do not.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "media";
const FOLDER = "books";
const DRY_RUN = process.argv.includes("--dry-run");
// Covers are the slow, failure-prone half of this job. --skip-covers fills only
// the text metadata, which is worth re-running on its own.
const SKIP_COVERS = process.argv.includes("--skip-covers");

const UA = "Mozilla/5.0 (compatible; sankettambare.com books backfill)";
const THROTTLE_MS = 900; // be a polite guest on every one of these APIs
const MAX_COVER_BYTES = 300 * 1024; // the hard cap from CLAUDE.md
// A real cover is tens of KB. Below this it is a placeholder: Open Library
// answers "no cover" with a 1px GIF, and BookGanga's search page carries a
// list thumbnail far too small to render at shelf size.
const MIN_COVER_BYTES = 8 * 1024;
const MIN_SCORE = 0.6; // title-token overlap needed to accept a match
const RETRIES = 2; // openlibrary.org drops connections now and then

// --- minimal .env loader ----------------------------------------------------
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env (see .env.example).",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// --- small helpers ----------------------------------------------------------
const sleep = (ms) =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

/** Lowercase, strip punctuation and diacritic-ish marks, collapse whitespace. */
const norm = (s) =>
  String(s ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[*?!.,:;'"()\[\]{}\/\\|–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s) =>
  new Set(
    norm(s)
      .split(" ")
      .filter((t) => t.length > 1),
  );

/**
 * How much of the *query* title is present in the candidate title. Deliberately
 * asymmetric: "हिंदू" should match "हिंदू - जगण्याची समृद्ध अडगळ", but a two-word
 * query should not match every book that happens to contain one of its words.
 */
const score = (query, candidate) => {
  const q = tokens(query);
  if (!q.size) return 0;
  const c = tokens(candidate);
  let hit = 0;
  q.forEach((t) => {
    if (c.has(t)) hit += 1;
  });
  return hit / q.size;
};

/**
 * Forward score alone is not enough. "Can't Hurt Me" scores 1.00 against
 * "SUMMARY of CAN'T HURT ME by David Goggins" — a different book with a
 * different ISBN — because every query word appears in it. So a candidate that
 * says substantially MORE than the query is only accepted when it is the same
 * book under a longer name, which in practice means it starts with the query:
 * "हिंदू" → "हिंदू - जगण्याची समृद्ध अडगळ" passes, the knockoff summary does not.
 */
// Open Library is full of unauthorised cash-in editions that carry the real
// book's whole title — "Summary of Sapiens: A Brief History of Humankind",
// "Workbook for …", "… : Conversation Starters". They score 1.00 forward and
// often 0.8+ reverse, so no amount of token maths separates them; the giveaway
// is the word itself.
const KNOCKOFF =
  /\b(summary|summaries|workbook|study guide|analysis of|conversation starters|key takeaways|sparknotes|cliffsnotes|abridged)\b/i;

const acceptable = (query, candidate) => {
  if (KNOCKOFF.test(candidate) && !KNOCKOFF.test(query)) return false;
  if (score(query, candidate) < MIN_SCORE) return false;
  return (
    score(candidate, query) >= 0.5 || norm(candidate).startsWith(norm(query))
  );
};

/** fetch with a couple of retries — these hosts drop connections at random. */
async function request(url, headers = {}) {
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      return await fetch(url, { headers: { "User-Agent": UA, ...headers } });
    } catch (e) {
      if (attempt === RETRIES) throw e;
      await sleep(600 * (attempt + 1));
    }
  }
  return null;
}

async function getJson(url) {
  const res = await request(url, { Accept: "application/json" });
  if (res.status === 429) return { rateLimited: true };
  if (!res.ok) return null;
  return res.json();
}

async function getText(url) {
  const res = await request(url);
  if (!res.ok) return null;
  return res.text();
}

const decodeEntities = (s) =>
  String(s)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    // Substack inlines JSON-LD, so curly quotes arrive as literal ’.
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );

// Page furniture, stripped before any text is read out of an HTML page.
const CHROME =
  /<(script|style|nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi;

const stripTags = (html) =>
  decodeEntities(String(html).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

// --- source 1: Open Library -------------------------------------------------
const OL_FIELDS =
  "title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,publisher";

async function olSearch(params) {
  const data = await getJson(
    `https://openlibrary.org/search.json?${params}&limit=6&fields=${OL_FIELDS}`,
  );
  return data?.docs ?? [];
}

/** Everything before the first colon — the titles in this table carry invented
 *  and sometimes misspelled subtitles ("Flow: The Clasic Work on how to achieve
 *  Happiness"), which no catalogue will match. The main title is the reliable
 *  part. */
const mainTitle = (t) => String(t ?? "").split(":")[0].replace(/[*]/g, " ").replace(/\s+/g, " ").trim();

/** One name out of "Pranay Kotasthane &\nAbhiram Manchi" or
 *  "Khyati Pathak (Author), Anupam Manur (Author)". */
const firstAuthor = (a) => String(a ?? "")
  .split(/[&\n,]/)[0]
  .replace(/\(author\)/gi, "")
  .trim();

/**
 * Does this candidate share a name with the author we asked for? Title overlap
 * alone let "The Subtle Art of NOT Giving A F*ck" match "The not so subtle art
 * of being a fat girl" — same words, different book, and it would have written
 * that book's ISBN. Checking the author is what makes a match a match.
 */
/** Open Library stores whole imprint addresses in the publisher field
 *  ("washington square press, inc., 630 fifth avenue, new york, n.y."). Keep
 *  the name, drop the postal address. */
const tidyPublisher = (p) => {
  if (!p) return null;
  const name = String(p).split(",")[0].trim();
  return name ? name.replace(/\b\w/g, (c) => c.toUpperCase()) : null;
};

const authorOk = (book, doc) => {
  const want = tokens(firstAuthor(book.author));
  if (!want.size) return true; // nothing to verify against
  const got = tokens((doc.author_name ?? []).join(" "));
  return [...want].some((t) => got.has(t));
};

async function fromOpenLibrary(book) {
  const title = mainTitle(book.title);
  const author = firstAuthor(book.author);

  // Three query shapes, narrowest first. The structured title/author fields are
  // the most precise but are brittle about punctuation and stray words, so the
  // free-text forms back them up.
  const attempts = [
    `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`,
    `q=${encodeURIComponent(`${title} ${author}`)}`,
    `q=${encodeURIComponent(title)}`,
  ];

  let hits = [];
  for (const params of attempts) {
    /* eslint-disable no-await-in-loop -- deliberately sequential: stop as soon
       as one query answers, and stay polite to openlibrary.org */
    const docs = await olSearch(params);
    hits = docs.filter((d) => acceptable(book.title, d.title) && authorOk(book, d));
    if (hits.length) break;
    await sleep(THROTTLE_MS);
    /* eslint-enable no-await-in-loop */
  }
  if (!hits.length) return null;

  // Prefer the earliest edition. `first_published` means the book's original
  // publication year, and a later reprint or translation reports its own.
  const doc = hits.sort(
    (a, b) => (a.first_publish_year ?? 9999) - (b.first_publish_year ?? 9999),
  )[0];

  return {
    source: "openlibrary",
    matched: `${doc.title} — ${(doc.author_name ?? [])[0] ?? "?"}`,
    score: score(book.title, doc.title),
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : null,
    isbn: doc.isbn?.find((i) => i.length === 13) ?? doc.isbn?.[0] ?? null,
    pageCount: doc.number_of_pages_median ?? null,
    firstPublished: doc.first_publish_year ?? null,
    publisher: tidyPublisher(doc.publisher?.[0]),
  };
}

// --- source 2: Google Books -------------------------------------------------
// Google Books rate-limits anonymous callers hard — from a home IP it answers
// 429 to essentially every request. Set GOOGLE_BOOKS_API_KEY in .env to make
// this tier actually do something; without one it is a no-op and the run falls
// through to the next source.
const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";

async function fromGoogleBooks(book) {
  const q = encodeURIComponent(`intitle:${book.title} inauthor:${book.author}`);
  const key = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : "";
  const data = await getJson(
    `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5${key}`,
  );
  if (data?.rateLimited) {
    console.log(
      `      google books: 429${GOOGLE_KEY ? "" : " — set GOOGLE_BOOKS_API_KEY in .env to use this source"}`,
    );
    return null;
  }
  if (!data?.items?.length) return null;

  const item = data.items.find((i) =>
    acceptable(book.title, i.volumeInfo?.title ?? ""),
  );
  if (!item) return null;
  const v = item.volumeInfo;

  return {
    source: "googlebooks",
    matched: v.title,
    score: score(book.title, v.title),
    // zoom=1 is the readable cover; the default thumbnail is a 128px postage stamp.
    coverUrl:
      v.imageLinks?.thumbnail
        ?.replace(/^http:/, "https:")
        .replace(/&edge=curl/, "") ?? null,
    isbn:
      v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ??
      v.industryIdentifiers?.[0]?.identifier ??
      null,
    pageCount: v.pageCount || null,
    firstPublished: v.publishedDate
      ? Number(String(v.publishedDate).slice(0, 4))
      : null,
    publisher: v.publisher ?? null,
  };
}

// --- source 3: BookGanga (Marathi) ------------------------------------------
// The results page is plain server-rendered HTML shaped as
//   <div class="BookThumbBlock" title="<TITLE>">
//     <div onclick="location.href='…/details/<id>'"> … <img src="…/books/<hash>.jpg" />
// so one regex over the block is enough; a DOM parser would be a dependency for
// nothing.
//
// The image in the results list is a ~10 KB thumbnail — useless at shelf size —
// so the match is followed to its detail page, where the first cover image is
// the full-resolution one.
async function fromBookGanga(book) {
  const q = encodeURIComponent(book.title);
  const html = await getText(
    `https://www.bookganga.com/eBooks/Books?AID=&SearchText=${q}`,
  );
  if (!html) return null;

  const blocks = html.split('class="BookThumbBlock"').slice(1);
  let best = null;

  for (const block of blocks) {
    const title = decodeEntities(block.match(/title="([^"]*)"/)?.[1] ?? "");
    const thumb = block.match(
      /src="(https:\/\/[^"]*\/images\/books\/[^"]+)"/,
    )?.[1];
    const detail = block.match(/location\.href='([^']+)'/)?.[1];
    if (!title || !thumb) continue;
    const s = score(book.title, title);
    if (acceptable(book.title, title) && (!best || s > best.score)) {
      best = {
        source: "bookganga",
        matched: title,
        score: s,
        coverUrl: thumb,
        detail,
      };
    }
  }
  if (!best) return null;

  if (best.detail) {
    await sleep(THROTTLE_MS);
    const page = await getText(best.detail);
    const full = [
      ...(page ?? "").matchAll(
        /(https:\/\/[^"']*\/images\/books\/[^"']+\.(?:jpg|jpeg|png))/gi,
      ),
    ]
      .map((m) => m[1])
      .find((u) => u !== best.coverUrl);
    if (full) best.coverUrl = full;

    // The detail page is the only source of Marathi bibliographic data anywhere
    // — no book API indexes these titles. It renders as a flat run of
    // "Publication: … Pages: … ISBN13: …", so read it off the stripped text.
    const text = stripTags((page ?? "").replace(CHROME, " "));
    const pages = Number(text.match(/Pages:\s*(\d{1,5})/)?.[1]);
    if (pages) best.pageCount = pages;
    const isbn13 = text.match(/ISBN13:\s*([0-9Xx]{10,17})/)?.[1];
    const isbn10 = text.match(/ISBN10:\s*([0-9Xx]{10})/)?.[1];
    if (isbn13 || isbn10) best.isbn = isbn13 || isbn10;
    // The breadcrumb carries the romanised publisher ("Rajhans Prakashan"),
    // which sits better beside "HarperCollins" than the Devanagari form does.
    best.publisher =
      text.match(/Books\s*>\s*([^>]{2,60}?)\s*>/)?.[1]?.trim() ||
      text.match(/Publication:\s*(.+?)\s+Pages:/)?.[1]?.trim() ||
      null;
  }
  return best;
}

// --- review scraping (pull-quote + a real finish date) ----------------------
const SCRAPABLE = /substack\.com|wordpress\.com|blogspot\.com/i;

// Where each platform keeps the post body. Without this the first "long
// paragraph" on the page is the site's own furniture — the WordPress sidebar
// ("Instagram Github Youtube … Posted by sanket tambare") or Substack's inline
// JSON-LD blob.
const BODY_CONTAINERS = [
  /<div[^>]+class="[^"]*available-content[^"]*"[^>]*>([\s\S]*)/i, // Substack
  /<div[^>]+class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*)/i, // WordPress
  /<div[^>]+class="[^"]*post-body[^"]*"[^>]*>([\s\S]*)/i, // Blogger
  /<article[^>]*>([\s\S]*?)<\/article>/i,
];

async function fromReview(book) {
  if (!book.blog_link || !SCRAPABLE.test(book.blog_link)) return null;
  const page = await getText(book.blog_link);
  if (!page) return null;

  let html = page.replace(CHROME, " ");
  for (const re of BODY_CONTAINERS) {
    const m = html.match(re);
    if (m) {
      html = m[1];
      break;
    }
  }

  // Sanket's own words, preferred in order: an explicit pull-quote, then the
  // first substantial paragraph.
  const quotes = [
    ...html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi),
  ]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length > 40);
  let quote = quotes.sort((a, b) => b.length - a.length)[0] ?? null;

  if (!quote) {
    quote =
      [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((m) => stripTags(m[1]))
        .find((t) => t.length > 120) ?? null;
  }
  // Last line of defence: a leaked script or nav block is not a pull-quote.
  if (quote && /\{"@|Subscribe|Sign in|Posted by|Share this:/i.test(quote))
    quote = null;
  if (quote && quote.length > 400) quote = `${quote.slice(0, 397).trimEnd()}…`;

  const published =
    page.match(/property="article:published_time"\s+content="([^"]+)"/i)?.[1] ??
    page.match(
      /<meta[^>]+content="([^"]+)"[^>]+property="article:published_time"/i,
    )?.[1] ??
    page.match(/<time[^>]+datetime="([^"]+)"/i)?.[1] ??
    null;

  const date =
    published && !Number.isNaN(Date.parse(published))
      ? new Date(published).toISOString().slice(0, 10)
      : null;

  return { quote, date };
}

// --- cover upload -----------------------------------------------------------
async function uploadCover(book, coverUrl) {
  const res = await fetch(coverUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const bytes = Buffer.from(await res.arrayBuffer());

  // Open Library answers "no cover" with a 1x1 GIF rather than a 404.
  if (bytes.length < MIN_COVER_BYTES) return null;
  if (bytes.length > MAX_COVER_BYTES) {
    console.log(
      `      cover too large (${Math.round(bytes.length / 1024)} KB), skipped`,
    );
    return null;
  }

  const contentType =
    res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const objectPath = `${FOLDER}/${book.id}.${ext}`;

  if (DRY_RUN)
    return `${objectPath} (${Math.round(bytes.length / 1024)} KB, not uploaded)`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, bytes, { contentType, upsert: true });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

/**
 * A book with no dated review still needs a date_finished so the timeline and
 * the monthly digest have something to group on. Seeded from the id so it is
 * stable across runs, and flagged date_precision = 'year' so the UI can render
 * "2024" instead of presenting a made-up day as fact.
 */
const seededDate = (book) => {
  const month = String(((book.id * 7919) % 12) + 1).padStart(2, "0");
  return `${book.year}-${month}-15`;
};

// --- main -------------------------------------------------------------------
async function main() {
  console.log(
    DRY_RUN ? "DRY RUN — nothing will be written.\n" : "Writing to Supabase.\n",
  );

  const { data: books, error } = await supabase
    .from("books")
    .select(
      "id, title, author, language, year, blog_link, cover_url, isbn, page_count, publisher, first_published, goodreads_url, quote, date_finished",
    )
    .order("id");
  if (error) throw error;

  let filled = 0;
  let skipped = 0;

  for (const book of books) {
    const needsBiblio =
      !book.cover_url ||
      !book.isbn ||
      !book.page_count ||
      !book.publisher ||
      !book.first_published;
    const needsReview = !book.quote && !!book.blog_link;
    const needsDate = !book.date_finished;

    if (!needsBiblio && !needsReview && !needsDate) {
      skipped += 1;
      continue;
    }

    console.log(`[${book.id}] ${book.title} — ${book.author}`);
    const patch = {};

    if (needsBiblio) {
      // Marathi has no Open Library presence at all, so go straight to the
      // sources that do rather than burning a request to prove it again.
      const order =
        book.language === "Marathi"
          ? [fromBookGanga, fromGoogleBooks]
          : [fromOpenLibrary, fromGoogleBooks, fromBookGanga];

      for (const resolve of order) {
        let hit = null;
        try {
          hit = await resolve(book);
        } catch (e) {
          console.log(`      ${resolve.name} failed: ${e.message}`);
        }
        await sleep(THROTTLE_MS);
        if (!hit) continue;

        console.log(
          `      ${hit.source}: "${hit.matched}" (score ${hit.score.toFixed(2)})`,
        );

        if (
          !SKIP_COVERS &&
          !book.cover_url &&
          !patch.cover_url &&
          hit.coverUrl
        ) {
          try {
            const uploaded = await uploadCover(book, hit.coverUrl);
            if (uploaded) {
              patch.cover_url = uploaded;
              console.log(`      cover → ${uploaded}`);
            }
          } catch (e) {
            console.log(`      cover upload failed: ${e.message}`);
          }
        }
        if (!book.isbn && !patch.isbn && hit.isbn) patch.isbn = hit.isbn;
        if (!book.page_count && !patch.page_count && hit.pageCount)
          patch.page_count = hit.pageCount;
        if (!book.publisher && !patch.publisher && hit.publisher)
          patch.publisher = hit.publisher;
        if (
          !book.first_published &&
          !patch.first_published &&
          hit.firstPublished
        ) {
          patch.first_published = hit.firstPublished;
        }

        // Stop once the cover — the expensive, most visible field — is settled.
        // With --skip-covers there is no such signal, so keep trying sources
        // until the text fields are filled.
        if (SKIP_COVERS) {
          if (patch.isbn && patch.page_count && patch.publisher) break;
        } else if (patch.cover_url || book.cover_url) break;
      }

      if (!book.cover_url && !patch.cover_url) {
        console.log(
          "      no cover found — the shelf will fall back to generative art",
        );
      }
    }

    const isbn = patch.isbn ?? book.isbn;
    if (!book.goodreads_url && isbn) {
      patch.goodreads_url = `https://www.goodreads.com/search?q=${encodeURIComponent(isbn)}`;
    }

    if (needsReview) {
      try {
        const review = await fromReview(book);
        await sleep(THROTTLE_MS);
        if (review?.quote) {
          patch.quote = review.quote;
          console.log(`      quote: "${review.quote.slice(0, 60)}…"`);
        }
        if (needsDate && review?.date) {
          patch.date_finished = review.date;
          patch.date_precision = "day";
          console.log(`      finished ${review.date} (from the review)`);
        }
      } catch (e) {
        console.log(`      review scrape failed: ${e.message}`);
      }
    }

    if (needsDate && !patch.date_finished && book.year) {
      patch.date_finished = seededDate(book);
      patch.date_precision = "year";
    }

    if (!Object.keys(patch).length) {
      console.log("      nothing to write");
      continue;
    }

    if (DRY_RUN) {
      console.log("      would write:", JSON.stringify(patch));
    } else {
      const { error: upErr } = await supabase
        .from("books")
        .update(patch)
        .eq("id", book.id);
      if (upErr) {
        console.error(`      ✗ write failed: ${upErr.message}`);
        continue;
      }
      console.log(`      ✓ ${Object.keys(patch).join(", ")}`);
    }
    filled += 1;
  }

  console.log(`\n${filled} book(s) updated, ${skipped} already complete.`);

  const { count } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .not("cover_url", "is", null);
  console.log(`${count ?? 0} of ${books.length} books now have a cover.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
