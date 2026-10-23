// /llms-full.txt — /llms.txt plus one line for every essay, issue, book, race,
// trek, project and deck, read from the live tables (src/lib/seo/llms.js).
//
// The site-wide _middleware.js skips this path: it has a file extension.
import { loadInventory } from "../src/lib/seo/inventory";
import { buildLlmsFullTxt } from "../src/lib/seo/llms";
import { serveCached, isComplete, HOUR } from "../src/lib/seo/serve";

// The micro-blog is summarised, not listed — 1,600+ lines would bury the rest.
const KINDS = ["book", "trek", "sport", "project", "blog", "presentation", "video", "newsletter", "tag"];

export async function onRequestGet(context) {
  return serveCached(context, async () => {
    const inventory = await loadInventory(context.env, {
      kinds: KINDS,
      cacheOrigin: new URL(context.request.url).origin,
      ttl: HOUR,
    });
    return { body: buildLlmsFullTxt(inventory), complete: isComplete(inventory) };
  }, "text/plain; charset=utf-8");
}
