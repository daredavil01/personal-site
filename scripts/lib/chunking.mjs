// Pure helpers shared by the /ask indexer and every source in scripts/ask-sources/.
// No I/O and no env here, so the registry test can import them without
// credentials.

import crypto from "crypto";

export const MAX_CHUNK_CHARS = 1200;
// What actually gets embedded. A chunk's vector is a function of this text
// alone, so it is also what embed_hash is computed over.
export const EMBED_MAX_CHARS = 4000;

export const clean = (v) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();

// One flat labelled string per chunk. Metadata is inlined on purpose: the
// keyword half of hybrid_search then matches on "Marathi" or "42 Kms" even
// though those live in columns, not prose.
export function compose(parts) {
  return parts
    .filter(([, v]) => v !== null && v !== undefined && clean(v) !== "")
    .map(([label, v]) => (label ? `${label}: ${clean(v)}` : clean(v)))
    .join(" | ");
}

// Splits long prose on paragraph boundaries, never mid-sentence.
//
// Line endings are normalised first: the markdown files in src/data are CRLF,
// and /\n{2,}/ does not match \r\n\r\n — without this the whole changelog comes
// back as one 136KB "paragraph" and everything past its first 4000 characters
// is dropped at embedding time.
export function splitProse(text, limit = MAX_CHUNK_CHARS) {
  const paras = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = [];
  let current = "";
  const flush = () => {
    if (current) out.push(current);
    current = "";
  };
  for (const p of paras) {
    if (p.length > limit) {
      // One paragraph over the limit (a long changelog entry) still has to be
      // cut somewhere; cut on a line break or sentence end rather than mid-word.
      flush();
      let rest = p;
      while (rest.length > limit) {
        const window = rest.slice(0, limit);
        const cut = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(". "));
        const at = cut > limit / 2 ? cut + 1 : limit;
        out.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
    } else if (current && current.length + p.length + 2 > limit) {
      flush();
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  flush();
  return out.length ? out : [""];
}

// Free-text dates: "February 22, 2026" (sports) and "17-02-2019" (treks).
export function parseLooseDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);
  return null;
}

export const sha1 = (text) => crypto.createHash("sha1").update(String(text)).digest("hex");

// Stable bigint-safe id for a row that does not come from a Postgres table (a
// resume position keyed by table, an essay keyed by URL). 12 hex digits is
// 48 bits — well inside Number.MAX_SAFE_INTEGER.
export const syntheticId = (key) => parseInt(sha1(key).slice(0, 12), 16);

export const embedText = (chunk) => String(chunk.body || "").slice(0, EMBED_MAX_CHARS);

// embed_hash decides whether a vector can be reused; content_hash decides
// whether the row needs writing at all. A retitled post keeps its vector but
// still gets its new title upserted.
export function hashChunk(chunk) {
  const embed_hash = sha1(embedText(chunk));
  const content_hash = sha1(JSON.stringify([
    embed_hash,
    chunk.title || "",
    chunk.url || "",
    chunk.chunk_date || null,
    chunk.tags || [],
    chunk.image_url || null,
  ]));
  return { embed_hash, content_hash };
}

// Relative storage paths ("/sports/pune.jpeg") → public bucket URLs, the same
// rule as toStorageUrl in src/lib/supabaseClient.js and functions/_middleware.js.
export function storageUrl(value, supabaseUrl) {
  const raw = typeof value === "object" && value !== null ? value.url : value;
  if (!raw || typeof raw !== "string") return null;
  if (raw.startsWith("http")) return raw;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/media${raw.startsWith("/") ? "" : "/"}${raw}`;
}

export const firstImage = (slides, supabaseUrl) =>
  storageUrl((Array.isArray(slides) ? slides : []).find((s) => (s?.url || s)), supabaseUrl);
