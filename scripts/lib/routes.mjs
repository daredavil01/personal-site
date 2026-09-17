// File-reading wrapper around the pure scraper in src/data/routeScrape.js.
// The parsing itself lives there so the Jest guard can use it without pulling
// in Node's fs (and without Jest needing to transform .mjs).

import fs from "fs";
import path from "path";

import { scrapeRoutes } from "../../src/data/routeScrape.js";

export { scrapeRoutes };

export function readRoutes(root) {
  return scrapeRoutes(fs.readFileSync(path.join(root, "src", "App.js"), "utf8"));
}

export default readRoutes;
