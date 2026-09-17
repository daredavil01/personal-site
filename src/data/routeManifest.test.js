// The guard that stops a route shipping without share metadata and a card.
//
// Runs in Jest with NO network, deliberately: `npm run docs:build` needs live
// Supabase credentials, so it cannot run in CI, and that is precisely how
// docs/routes.md drifted. This test can run anywhere, so it actually gates.

import fs from "fs";
import path from "path";

import { ROUTE_MANIFEST, OG_EXEMPT_PATHS, manifestFor } from "./routeManifest";
import * as pageMeta from "./pageMeta";
import { scrapeRoutes } from "./routeScrape";
import { PAGE_SLUGS } from "../lib/og/model";
import { CARD_FALLBACKS } from "../lib/og/paths";
import NAV_ROUTES from "./routes";

const ROOT = path.resolve(__dirname, "..", "..");
const appRoutes = scrapeRoutes(fs.readFileSync(path.join(ROOT, "src", "App.js"), "utf8"));

const isParameterised = (p) => p.includes(":") || p.includes("*");

describe("route manifest matches src/App.js", () => {
  // Set equality both ways: adding a route without a manifest entry fails, and
  // so does deleting one without removing its entry.
  it("lists exactly the routes App.js declares", () => {
    const inApp = appRoutes.map((r) => r.route).sort();
    const inManifest = ROUTE_MANIFEST.map((r) => r.path).sort();
    expect(inManifest).toEqual(inApp);
  });

  it("names the same component App.js renders", () => {
    appRoutes.forEach(({ route, component }) => {
      expect(manifestFor(route)).not.toBeNull();
      expect(manifestFor(route).component).toBe(component);
    });
  });
});

describe("every route has a share card", () => {
  it("declares an og strategy", () => {
    ROUTE_MANIFEST.forEach((entry) => {
      expect(["page", "entity", "none"]).toContain(entry.og.strategy);
    });
  });

  it("only exempts the paths on the explicit allow-list", () => {
    const exempt = ROUTE_MANIFEST.filter((e) => e.og.strategy === "none").map((e) => e.path);
    expect(exempt.sort()).toEqual([...OG_EXEMPT_PATHS].sort());
  });

  it("never marks an exempt route indexable", () => {
    ROUTE_MANIFEST.filter((e) => e.og.strategy === "none").forEach((entry) => {
      expect(entry.indexable).toBe(false);
    });
  });

  // The teeth. Every route's og:image is a file in the repo — a page card
  // directly, an entity route when the row has no photo of its own — so the
  // guard is simply that the file is there and is a real PNG.
  const expectCard = (slug) => {
    expect(PAGE_SLUGS).toContain(slug);
    const file = path.join(ROOT, "public", "og", `${slug}.png`);
    expect({ slug, exists: fs.existsSync(file) }).toEqual({ slug, exists: true });
    // A truncated or placeholder file is worse than a missing one, because
    // nothing would flag it.
    expect(fs.statSync(file).size).toBeGreaterThan(5000);
  };

  it("has a committed PNG for every page card", () => {
    ROUTE_MANIFEST
      .filter((e) => e.og.strategy === "page")
      .forEach((entry) => expectCard(entry.og.slug));
  });

  it("has a committed PNG behind every entity route", () => {
    ROUTE_MANIFEST.filter((e) => e.og.strategy === "entity").forEach((entry) => {
      const slug = CARD_FALLBACKS[entry.og.kind];
      expect({ kind: entry.og.kind, slug }).toEqual({ kind: entry.og.kind, slug: expect.any(String) });
      expectCard(slug);
    });
  });
});

describe("every route has meta", () => {
  it("gives each literal indexable route a complete PAGE_META entry", () => {
    ROUTE_MANIFEST
      .filter((e) => e.indexable && !isParameterised(e.path))
      .forEach((entry) => {
        const meta = pageMeta.PAGE_META[entry.path];
        expect(meta).toBeDefined();
        expect(meta.description).toBeTruthy();
        expect(meta.image).toBeTruthy();
        expect(meta.imageAlt).toBeTruthy();
        expect(meta.type).toBeTruthy();
        // The manifest and PAGE_META must agree on which card this route uses.
        expect(meta.ogSlug).toBe(entry.og.slug);
      });
  });

  it("names a real builder for each parameterised indexable route", () => {
    ROUTE_MANIFEST
      .filter((e) => e.indexable && isParameterised(e.path))
      .forEach((entry) => {
        expect(entry.meta).toBeTruthy();
        expect(typeof pageMeta[entry.meta]).toBe("function");
      });
  });
});

describe("navigation points at routes that exist", () => {
  // Catches a nav link to a route that was renamed or removed.
  const paths = new Set(ROUTE_MANIFEST.map((e) => e.path));

  const check = (entry) => {
    if (entry.external) return;
    expect(paths.has(entry.path)).toBe(true);
  };

  it("resolves every nav entry", () => {
    NAV_ROUTES.forEach((entry) => {
      check(entry);
      (entry.subRoutes || []).forEach(check);
    });
  });
});
