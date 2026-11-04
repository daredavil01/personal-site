// The seven page films point at committed files in public/video/page-films/.
// Like the /projects and /videos film guards, this fails the build if one is
// missing or a web encode outgrows its budget — a phone that presses play
// downloads all of it — or the captions stop being a WebVTT file.

import fs from "fs";
import path from "path";
import { PAGE_FILMS, PAGE_FILM_DIR } from "../../data/pageFilms";
import { ROUTE_MANIFEST } from "../../data/routeManifest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const file = (slug, ext) => path.join(ROOT, "public", `${PAGE_FILM_DIR}/${slug}.${ext}`);

describe("the page films", () => {
  it("are seven, each for a route that exists", () => {
    expect(PAGE_FILMS).toHaveLength(7);
    const paths = new Set(ROUTE_MANIFEST.map((r) => r.path));
    PAGE_FILMS.forEach((f) => expect({ film: f.key, route: paths.has(f.route) }).toEqual({ film: f.key, route: true }));
  });

  it.each(PAGE_FILMS.map((f) => [f.slug]))("%s has its video, poster and captions committed", (slug) => {
    ["mp4", "jpg", "vtt"].forEach((ext) => {
      expect({ ext, exists: fs.existsSync(file(slug, ext)) }).toEqual({ ext, exists: true });
    });
    const { size } = fs.statSync(file(slug, "mp4"));
    expect(size).toBeGreaterThan(100000);
    expect(size).toBeLessThan(4 * 1024 * 1024);
    expect(fs.statSync(file(slug, "jpg")).size).toBeLessThan(300 * 1024);
    expect(fs.readFileSync(file(slug, "vtt"), "utf8").startsWith("WEBVTT")).toBe(true);
  });

  it("each has a storyline and an accessible name", () => {
    PAGE_FILMS.forEach((f) => {
      expect(f.story.length).toBeGreaterThan(60);
      expect(f.alt.length).toBeGreaterThan(60);
    });
  });
});
