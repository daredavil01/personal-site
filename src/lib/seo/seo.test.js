import fs from "fs";
import path from "path";

import { tagPath } from "../api/tags";
import contact from "../../data/contact";
import { IDENTITY } from "../../data/identity";
import { ROUTE_MANIFEST } from "../../data/routeManifest";
import { PAGE_META } from "../../data/pageMeta";
import { tagHref, jsonLdScript, clip } from "./text";
import { matchRoute } from "./routeMatch";
import { isIndexableMicroblog, isNeverIndexed } from "./indexing";
import {
  KINDS, detailQuery, listQuery, viewOf, entityHref,
} from "./entities";
import { rest, restAll, PAGE_SIZE } from "./rest";
import { sitemapEntries, buildSitemap, indexableFixedRoutes } from "./sitemap";
import { feedItems, buildFeed } from "./feed";
import { buildLlmsTxt, buildLlmsFullTxt } from "./llms";
import { pageGraph } from "./structuredData";
import { renderFallback } from "./fallbackHtml";

const ROOT = path.resolve(__dirname, "../../..");

describe("one identity", () => {
  // Every profile the site links to is one search engines should tie to the
  // Person; a profile added to contact.js but not here would be a loose end.
  it("lists every profile from contact.js as sameAs", () => {
    contact
      .map((c) => c.link)
      .filter((link) => /^https:\/\//.test(link))
      .forEach((link) => expect(IDENTITY.sameAs).toContain(link));
  });

  it("keeps agents.md saying what identity.js says", () => {
    const agents = fs.readFileSync(path.join(ROOT, "public", "agents.md"), "utf8");
    expect(agents).toContain(IDENTITY.worksFor);
    expect(agents).toContain(IDENTITY.homeLocation.locality);
    IDENTITY.sameAs.forEach((url) => expect(agents).toContain(url));
    // The contradictions this file used to carry.
    expect(agents).not.toMatch(/Emtec|Decap|100\+ books|Date of birth/);
  });
});

describe("text helpers", () => {
  it("builds tag links exactly as tagPath does, Marathi included", () => {
    ["Running", "घर", "public policy"].forEach((name) => expect(tagHref(name)).toBe(tagPath(name)));
  });

  it("clips at a word boundary", () => {
    expect(clip("one two three four five", 12)).toBe("one two…");
    expect(clip("short", 12)).toBe("short");
  });

  it("writes JSON-LD that cannot close its own script tag", () => {
    expect(jsonLdScript({ a: "</script>" })).not.toContain("</script><");
  });
});

describe("matchRoute", () => {
  it("matches literal routes before parameterised ones", () => {
    expect(matchRoute("/changelog/graph").entry.path).toBe("/changelog/graph");
  });

  it("matches what React Router would, case-insensitively, and spells it properly", () => {
    const m = matchRoute("/Books/12");
    expect(m.entry.path).toBe("/books/:id");
    expect(m.canonicalPath).toBe("/books/12");
  });

  it("leaves parameters alone", () => {
    expect(matchRoute("/tags/Running").canonicalPath).toBe("/tags/Running");
  });

  it("claims the bare /admin as well as everything under it", () => {
    expect(matchRoute("/admin").entry.path).toBe("/admin/*");
    expect(matchRoute("/admin/books/new").entry.path).toBe("/admin/*");
  });

  it("matches nothing for a path no route claims", () => {
    expect(matchRoute("/no-such-page")).toBeNull();
    expect(matchRoute("/books/12/extra")).toBeNull();
  });
});

describe("indexing rules", () => {
  it("indexes a micro-post only when it has words", () => {
    expect(isIndexableMicroblog({ text: "Rain." })).toBe(true);
    expect(isIndexableMicroblog({ text: "  \n " })).toBe(false);
    expect(isIndexableMicroblog({ text: "" })).toBe(false);
  });

  it("never indexes the dashboard or shared conversations", () => {
    expect(isNeverIndexed("/admin")).toBe(true);
    expect(isNeverIndexed("/admin/tags")).toBe(true);
    expect(isNeverIndexed("/ask/s/abc12345")).toBe(true);
    expect(isNeverIndexed("/ask")).toBe(false);
    expect(isNeverIndexed("/administrator-notes")).toBe(false);
  });
});

describe("entity queries", () => {
  it("lists only micro-posts with words, using the same test as the noindex rule", () => {
    expect(listQuery("microblog").path).toContain("text=match.%5CS");
  });

  it("encodes a Marathi tag name in its detail query", () => {
    expect(detailQuery("tag", "घर")).toContain(`name=eq.${encodeURIComponent("घर")}`);
  });

  it("reads only published newsletter issues", () => {
    expect(detailQuery("newsletter", "2026-09")).toContain("published_at=not.is.null");
    expect(listQuery("newsletter").path).toContain("published_at=not.is.null");
  });

  it("links every tag_entities type that has a page", () => {
    expect(entityHref("book", 3)).toBe("/books/3");
    expect(entityHref("blog", 3)).toBe("/100-days-to-offload/3");
    expect(entityHref("instagram", 3)).toBe("/instagram");
    expect(entityHref("unknown", 3)).toBeNull();
  });

  it("reads a list row without the detail-only columns", () => {
    Object.keys(KINDS).filter((k) => k !== "tag").forEach((kind) => {
      const key = KINDS[kind].keyColumn || "id";
      expect(() => viewOf(kind, { [key]: kind === "newsletter" ? "2026-09" : 1, title: "t" })).not.toThrow();
    });
  });
});

describe("rest", () => {
  const ORIGINAL = global.fetch;
  afterEach(() => { global.fetch = ORIGINAL; });

  it("tells a missing row from an unreachable database", async () => {
    const env = { VITE_SUPABASE_URL: "https://db.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" };
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => [] }));
    expect(await rest(env, "books?id=eq.1")).toEqual({ ok: true, rows: [] });
    global.fetch = jest.fn(async () => { throw new Error("down"); });
    expect(await rest(env, "books?id=eq.1")).toEqual({ ok: false, rows: null });
    expect(await rest({}, "books?id=eq.1")).toEqual({ ok: false, rows: null });
  });

  it("pages past PostgREST's 1,000-row cap", async () => {
    const env = { VITE_SUPABASE_URL: "https://db.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" };
    global.fetch = jest.fn(async (url) => {
      const offset = Number(String(url).match(/offset=(\d+)/)[1]);
      const n = offset === 0 ? PAGE_SIZE : 674;
      return { ok: true, json: async () => Array.from({ length: n }, (_, i) => ({ id: offset + i })) };
    });
    const res = await restAll(env, "microblog?select=id");
    expect(res.rows).toHaveLength(1674);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("sitemap", () => {
  const inventory = {
    book: [{ id: 12, updated_at: "2026-10-01T00:00:00+00:00" }, { id: 13, updated_at: "2026-10-05T00:00:00+00:00" }],
    microblog: [{ id: 5, updated_at: "2026-01-01T00:00:00+00:00" }],
    newsletter: [{ slug: "2026-09", updated_at: "2026-10-02T00:00:00+00:00" }],
    tag: [{ name: "घर", total: 3 }, { name: "unused", total: 0 }],
  };

  it("lists exactly the manifest's indexable, parameter-free routes", () => {
    const expected = ROUTE_MANIFEST
      .filter((e) => e.indexable && !e.path.includes(":") && !e.path.includes("*"))
      .map((e) => e.path);
    expect(indexableFixedRoutes().sort()).toEqual(expected.sort());
    expect(indexableFixedRoutes()).not.toContain("/ask/s/:token");
  });

  it("lists every row, dated by its own updated_at", () => {
    const entries = sitemapEntries(inventory);
    expect(entries).toContainEqual({ path: "/books/12", lastmod: "2026-10-01T00:00:00+00:00" });
    expect(entries).toContainEqual({ path: "/newsletter/2026-09", lastmod: "2026-10-02T00:00:00+00:00" });
    expect(entries).toContainEqual({ path: "/micro-blog/5", lastmod: "2026-01-01T00:00:00+00:00" });
    expect(entries).toContainEqual({ path: "/writing-ledger.html", lastmod: null });
  });

  it("dates a section page by its newest row", () => {
    expect(sitemapEntries(inventory)).toContainEqual({ path: "/books", lastmod: "2026-10-05T00:00:00+00:00" });
  });

  it("lists tags in use, and only those", () => {
    const paths = sitemapEntries(inventory).map((e) => e.path);
    expect(paths).toContain(`/tags/${encodeURIComponent("घर")}`);
    expect(paths).not.toContain("/tags/unused");
  });

  it("still lists the fixed pages when a table could not be read", () => {
    const paths = sitemapEntries({ book: null }).map((e) => e.path);
    expect(paths).toContain("/books");
    expect(paths).not.toContain("/books/12");
  });

  it("writes valid, escaped XML", () => {
    const xml = buildSitemap([{ path: "/tags/a&b", lastmod: null }, { path: "/", lastmod: "2026-10-01" }]);
    expect(xml).toContain("<loc>https://sankettambare.in/tags/a&amp;b</loc>");
    expect(xml).toContain("<loc>https://sankettambare.in/</loc><lastmod>2026-10-01</lastmod>");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });
});

describe("feed", () => {
  const inventory = {
    blog: [{ id: 1, blog_title: "Old essay", blog_description: "d", blog_date: "2025-01-01" }],
    sport: [{ id: 2, title: "Pune Half", date: "October 5, 2026", description: "r" }],
    microblog: [{ id: 3, title: "", text: "A short post on the fort.", date: "2026-10-10" }],
  };

  it("puts the newest thing first, whatever its type", () => {
    expect(feedItems(inventory).map((i) => i.path)).toEqual(["/micro-blog/3", "/sports/2", "/100-days-to-offload/1"]);
  });

  it("writes RSS with local links and RFC 822 dates", () => {
    const xml = buildFeed(feedItems(inventory));
    expect(xml).toContain("<link>https://sankettambare.in/sports/2</link>");
    expect(xml).toMatch(/<pubDate>\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT<\/pubDate>/);
    expect(xml).toContain('<atom:link href="https://sankettambare.in/feed.xml" rel="self"');
  });
});

describe("llms.txt", () => {
  it("names every indexable page exactly once", () => {
    const txt = buildLlmsTxt();
    indexableFixedRoutes().filter((p) => p !== "/").forEach((p) => {
      const url = `https://sankettambare.in${p})`;
      expect({ p, count: txt.split(url).length - 1 }).toEqual({ p, count: 1 });
    });
  });

  it("says who this is, from identity.js", () => {
    const txt = buildLlmsTxt();
    expect(txt.startsWith("# Sanket Tambare")).toBe(true);
    expect(txt).toContain(IDENTITY.bio);
    expect(txt).toContain("Bridgenext");
    expect(txt).not.toContain("100+ books");
  });

  it("adds one line per row in the full version", () => {
    const txt = buildLlmsFullTxt({
      book: [{ id: 12, title: "Sapiens", author: "Yuval Noah Harari", year: 2023, description: "History of us." }],
      tag: [{ name: "running", display_name: "Running", total: 9 }],
    });
    expect(txt).toContain("- [Sapiens — Yuval Noah Harari](https://sankettambare.in/books/12): read 2023 — History of us.");
    expect(txt).toContain("[#Running](https://sankettambare.in/tags/running) (9)");
  });
});

describe("structured data", () => {
  it("cites an essay at its real home, with Sanket as its author", () => {
    const view = viewOf("blog", {
      id: 4, blog_title: "On running", blog_description: "d", blog_date: "2026-10-01", blog_link: "https://sankettambare.substack.com/p/on-running", language: "English",
    });
    const graph = pageGraph({ path: "/100-days-to-offload/4", meta: view.meta, view, section: "/100-days-to-offload" })["@graph"];
    const post = graph.find((n) => n["@type"] === "BlogPosting");
    expect(post.url).toBe("https://sankettambare.substack.com/p/on-running");
    expect(post.mainEntityOfPage).toBe("https://sankettambare.in/100-days-to-offload/4");
    expect(post.author).toEqual({ "@id": "https://sankettambare.in/#person" });
    expect(post.datePublished).toBe("2026-10-01");
  });

  it("makes a section page a CollectionPage listing its rows", () => {
    const graph = pageGraph({ path: "/treks", meta: PAGE_META["/treks"], items: [{ href: "/treks/7", text: "Ghangad Trek" }] })["@graph"];
    expect(graph[0]["@type"]).toBe("CollectionPage");
    expect(graph.find((n) => n["@type"] === "ItemList").itemListElement[0].url).toBe("https://sankettambare.in/treks/7");
  });

  it("marks a Marathi book as Marathi", () => {
    const view = viewOf("book", { id: 1, title: "पट्यारा", author: "a", language: "Marathi", description: "d", year: 2026 });
    expect(view.lang).toBe("mr");
    expect(pageGraph({ path: "/books/1", meta: view.meta, view })["@graph"].find((n) => n["@type"] === "Book").inLanguage).toBe("mr");
  });
});

describe("fallback HTML", () => {
  it("escapes everything it is given", () => {
    const html = renderFallback({ heading: "<b>x</b>", body: ['"quoted" & <i>'], items: [{ href: '/a"b', text: "t" }] });
    expect(html).toContain("<h1>&lt;b&gt;x&lt;/b&gt;</h1>");
    expect(html).toContain("<p>&quot;quoted&quot; &amp; &lt;i&gt;</p>");
    expect(html).toContain('href="/a&quot;b"');
  });

  it("links the profiles with rel=me", () => {
    expect(renderFallback({ heading: "x" })).toContain('<a href="https://github.com/daredavil01" rel="me">');
  });
});
