// The site itself: what each page is (from the shared route meta) and how to
// get in touch. Answers "what is the Mind Map page?" and "how do I contact him?".
//
// contact.js imports Font Awesome icons, which Node cannot load, so its links
// and labels are read out of the file text rather than imported.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export default {
  type: "site",
  load: async ({ ROOT }) => {
    const { PAGE_META } = await import(pathToFileURL(path.join(ROOT, "src/data/pageMeta.js")).href);
    const contactSrc = fs.readFileSync(path.join(ROOT, "src/data/contact.js"), "utf8");
    const contacts = [...contactSrc.matchAll(/link:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)]
      .map(([, link, label]) => ({ link, label }));
    return { pages: Object.entries(PAGE_META), contacts };
  },
  toChunks: ({ pages, contacts }, { compose, syntheticId }) => {
    const base = { entity_type: "site", chunk_index: 0, chunk_date: null, tags: [], image_url: null };
    const out = pages
      .filter(([, meta]) => meta?.description)
      .map(([route, meta]) => ({
        ...base,
        entity_id: syntheticId(`route:${route}`),
        title: meta.title || route,
        url: route,
        body: compose([
          ["Site page", meta.title],
          ["Address", route],
          [null, meta.description],
        ]),
      }));
    if (contacts.length) {
      out.push({
        ...base,
        entity_id: syntheticId("contact"),
        title: "Contact",
        url: "/contact",
        body: compose([
          ["Contact", "ways to reach Sanket Tambare"],
          ...contacts.map((c) => [c.label, c.link]),
        ]),
      });
    }
    return out;
  },
};
