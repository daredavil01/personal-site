// Hand-written markdown pages that are not in Postgres. Stable ids so the
// unique key keeps working across runs. Content hashes (not file times) decide
// what re-embeds, so a CI checkout no longer rebuilds the changelog nightly.

import fs from "fs";
import path from "path";

const PAGE_FILES = [
  { id: 1, file: "src/data/about.md", title: "About", url: "/about" },
  { id: 2, file: "src/data/changelog.md", title: "Changelog", url: "/changelog" },
];

export default {
  type: "page",
  load: ({ ROOT }) => PAGE_FILES
    .map((spec) => {
      const abs = path.join(ROOT, spec.file);
      if (!fs.existsSync(abs)) return null;
      const raw = fs.readFileSync(abs, "utf8").replace(/^---[\s\S]*?---\r?\n/, "");
      return { ...spec, raw };
    })
    .filter(Boolean),
  toChunks: (pages, { compose, splitProse }) => pages.flatMap((spec) => (
    splitProse(spec.raw).map((body, i) => ({
      entity_type: "page",
      entity_id: spec.id,
      chunk_index: i,
      title: spec.title,
      url: spec.url,
      chunk_date: null,
      tags: [],
      image_url: null,
      body: compose([[spec.title, null], [null, body]]) || body,
    }))
  )),
};
