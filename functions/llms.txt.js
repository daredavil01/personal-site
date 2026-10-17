// /llms.txt (https://llmstxt.org) — who Sanket is and what each page holds,
// built from src/data/identity.js, the nav and PAGE_META (src/lib/seo/llms.js).
// No database read, so it cannot fail and cannot go stale the way the
// hand-written file in public/ did.
//
// The site-wide _middleware.js skips this path: it has a file extension.
import { buildLlmsTxt } from "../src/lib/seo/llms";
import { serveCached } from "../src/lib/seo/serve";

export async function onRequestGet(context) {
  return serveCached(context, async () => ({ body: buildLlmsTxt() }), "text/plain; charset=utf-8");
}
