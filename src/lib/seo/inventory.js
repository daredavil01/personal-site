// Everything the site has, read once for /sitemap.xml, /feed.xml and
// /llms-full.txt (the Pages Functions under functions/).
//
// Each kind is read with its list select (src/lib/seo/entities.js), every row,
// paged past PostgREST's 1,000-row cap. A kind that cannot be read comes back
// as null rather than [], so a caller can tell "no books" from "could not ask"
// and say so instead of publishing a sitemap that silently lost a section.

import { listQuery } from "./entities";
import { rest, restAll } from "./rest";

export const INVENTORY_KINDS = ["book", "trek", "sport", "project", "blog", "presentation", "video", "newsletter", "microblog", "tag"];

/**
 * @param {object} env  Pages env (Supabase URL + publishable key)
 * @param {object} [options]
 * @param {Record<string,string>} [options.select]  per-kind select override
 * @param {Record<string,number>} [options.limit]   per-kind row cap (newest first)
 * @param {string[]} [options.kinds]
 * @returns {Promise<Record<string, any[]|null>>}
 */
export async function loadInventory(env, {
  select = {}, limit = {}, kinds = INVENTORY_KINDS, cacheOrigin, ttl = 3600,
} = {}) {
  const opts = { cacheOrigin, ttl };
  const entries = await Promise.all(kinds.map(async (kind) => {
    const q = listQuery(kind, { select: select[kind], limit: limit[kind] ?? 0 });
    const res = q.body
      ? await rest(env, q.path, { ...opts, body: q.body })
      : await (limit[kind] ? rest(env, q.path, opts) : restAll(env, q.path, opts));
    return [kind, res.ok && Array.isArray(res.rows) ? res.rows : null];
  }));
  return Object.fromEntries(entries);
}

// The newest `updated_at` in a list, for a section page's <lastmod>.
export const newestUpdate = (rows) => (rows || [])
  .map((r) => r.updated_at)
  .filter(Boolean)
  .sort()
  .pop() || null;
