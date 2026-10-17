// The page as plain HTML, put inside #root by functions/_middleware.js.
//
// Every URL used to arrive as an empty <div id="root"></div>. Google renders
// the JavaScript eventually; GPTBot, ClaudeBot, PerplexityBot and most other
// crawlers never do, so for them the site had no words at all. This is the same
// page reduced to what a reader takes away from it — a heading, the facts, the
// text, the links — and every visitor gets it, bots and people alike. React's
// createRoot clears it on mount, and index.html hides it once JS is running so
// it never flashes (`.js .seo-fallback`).
//
// Pure and import-light: strings in, a string out.

import ROUTES from "../../data/routes";
import { PAGE_META } from "../../data/pageMeta";
import { IDENTITY, LOCATION_LABEL } from "../../data/identity";
import { escHtml, tagHref } from "./text";

const attrLang = (lang) => (lang && lang !== "en" ? ` lang="${escHtml(lang)}"` : "");

const link = (href, text, extra = "") => `<a href="${escHtml(href)}"${extra}>${escHtml(String(text).trim())}</a>`;

// The nav is src/data/routes.js, the same list the header and footer render,
// so the fallback can never point at a page the site no longer has. It comes
// after the page's own content: a reader (or a crawler weighing what a page is
// about) meets the heading first, not thirty links.
function navHtml() {
  const groups = ROUTES.filter((r) => !r.index).map((r) => (r.subRoutes
    ? `<li>${escHtml(r.label)}: ${r.subRoutes.map((c) => link(c.path, c.label)).join(" · ")}</li>`
    : `<li>${link(r.path, r.label)}</li>`));
  return `<nav aria-label="Site"><ul>${groups.join("")}</ul></nav>`;
}

function footerHtml() {
  const profiles = IDENTITY.sameAs
    .map((url) => `<li>${link(url, url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), ' rel="me"')}</li>`)
    .join("");
  return `<footer><p>${escHtml(IDENTITY.name)} — ${escHtml(IDENTITY.jobTitle)} at ${escHtml(IDENTITY.worksFor)}, ${escHtml(LOCATION_LABEL)}.</p><ul>${profiles}</ul></footer>`;
}

const factsHtml = (facts) => (facts?.length
  ? `<dl>${facts.map(([k, v]) => `<dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd>`).join("")}</dl>`
  : "");

const itemsHtml = (items) => (items?.length
  ? `<ul>${items.map((i) => `<li>${link(i.href, i.text)}${i.note ? ` <small>${escHtml(i.note)}</small>` : ""}</li>`).join("")}</ul>`
  : "");

const tagsHtml = (tags) => (tags?.length
  ? `<p>Tags: ${tags.map((t) => link(tagHref(t), `#${t}`)).join(", ")}</p>`
  : "");

/**
 * @param {object} page
 * @param {string} page.heading         the <h1>
 * @param {string} [page.lede]          one paragraph under it
 * @param {Array}  [page.facts]         [[label, value], …]
 * @param {Array}  [page.body]          paragraphs of plain text
 * @param {string} [page.bodyHtml]      pre-escaped HTML (the newsletter letter)
 * @param {Array}  [page.bullets]       plain-text list
 * @param {Array}  [page.outbound]      [{ href, label }]
 * @param {Array}  [page.items]         [{ href, text, note }] — a section's rows
 * @param {Array}  [page.tags]          tag names
 * @param {string} [page.lang]          "mr" for Marathi content
 * @param {object} [page.parent]        { href, label } — back to the section
 * @param {string} [page.image]         the row's own photo
 */
export function renderFallback(page) {
  const main = [
    page.parent ? `<p>${link(page.parent.href, `← ${page.parent.label}`)}</p>` : "",
    `<h1>${escHtml(String(page.heading).trim())}</h1>`,
    page.lede ? `<p>${escHtml(page.lede)}</p>` : "",
    // loading="lazy" inside a display:none parent is never fetched, so a
    // visitor with JS pays nothing for it; a crawler reads the src and alt.
    page.image ? `<p><img src="${escHtml(page.image)}" alt="${escHtml(String(page.heading).trim())}" loading="lazy" width="600"></p>` : "",
    factsHtml(page.facts),
    (page.body || []).map((p) => `<p>${escHtml(p)}</p>`).join(""),
    page.bodyHtml || "",
    page.bullets?.length ? `<ul>${page.bullets.map((b) => `<li>${escHtml(b)}</li>`).join("")}</ul>` : "",
    (page.outbound || []).map((o) => `<p>${link(o.href, o.label, ' rel="noopener"')}</p>`).join(""),
    itemsHtml(page.items),
    tagsHtml(page.tags),
  ].join("");

  return `<div class="seo-fallback"><header><p>${link("/", IDENTITY.name)}</p></header>`
    + `<main${attrLang(page.lang)}>${main}</main>${navHtml()}${footerHtml()}</div>`;
}

// The home page: who this is, then every section with a line on what it holds.
// It is the page a "who is Sanket Tambare" crawl lands on, so it carries the
// bio and the facts outright rather than a link to them.
export function homeFallback() {
  const sections = ROUTES.filter((r) => !r.index)
    .flatMap((r) => r.subRoutes || [r])
    .map((r) => ({ href: r.path, text: r.label, note: PAGE_META[r.path]?.description || "" }));
  return renderFallback({
    heading: IDENTITY.name,
    lede: IDENTITY.bio,
    facts: [
      ["Work", `${IDENTITY.jobTitle} at ${IDENTITY.worksFor}`],
      ["Based in", LOCATION_LABEL],
      ["Education", IDENTITY.alumniOf.map((s) => `${s.name} — ${s.detail}`).join("; ")],
      ["Interests", IDENTITY.knowsAbout.join(", ")],
    ],
    items: sections,
  });
}
