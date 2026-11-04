// src/data/about.md as a string, for the /about and /resume pages. Vite's
// `?raw` inlines the file at build time; scripts/about.mjs edits the same file
// and scripts/ask-sources/page.mjs indexes it for /ask.
// eslint-disable-next-line import/no-unresolved -- a Vite query, not a path
import aboutMd from "./about.md?raw";

export default aboutMd;
