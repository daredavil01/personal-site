// /films lists every feature film from src/data/featureFilms.js. This holds
// the list to the committed files: each film's video and poster exist, its
// captions and chapters exist where the list says so, and the length the page
// prints is the MP4's own (read from the movie header, `mvhd`).

import fs from "fs";
import path from "path";
import { FEATURE_FILMS } from "../data/featureFilms";
import { ROUTE_MANIFEST } from "../data/routeManifest";

const ROOT = path.resolve(__dirname, "..", "..");
const file = (base, ext) => path.join(ROOT, "public", `${base}.${ext}`);

function mp4Seconds(p) {
  const buf = fs.readFileSync(p);
  const at = buf.indexOf("mvhd");
  if (at < 0) return null;
  const v = buf[at + 4];
  return v === 1
    ? Number(buf.readBigUInt64BE(at + 4 + 4 + 16 + 4)) / buf.readUInt32BE(at + 4 + 4 + 16)
    : buf.readUInt32BE(at + 4 + 4 + 8 + 4) / buf.readUInt32BE(at + 4 + 4 + 8);
}

describe("the /films catalogue", () => {
  it("has unique keys and every film's page is a real route", () => {
    expect(new Set(FEATURE_FILMS.map((f) => f.key)).size).toBe(FEATURE_FILMS.length);
    const paths = new Set(ROUTE_MANIFEST.map((r) => r.path));
    expect(paths.has("/films")).toBe(true);
    FEATURE_FILMS.forEach((f) => expect({ film: f.key, route: paths.has(f.route) }).toEqual({ film: f.key, route: true }));
  });

  it.each(FEATURE_FILMS.map((f) => [f.key, f]))("%s: files are committed and the length is true", (key, f) => {
    const need = ["mp4", "jpg", f.captions && "vtt", f.chapters && "json"].filter(Boolean);
    need.forEach((ext) => expect({ key, ext, exists: fs.existsSync(file(f.base, ext)) }).toEqual({ key, ext, exists: true }));
    expect(Math.abs(mp4Seconds(file(f.base, "mp4")) - f.seconds)).toBeLessThan(1);
    if (f.chapters) {
      const j = JSON.parse(fs.readFileSync(file(f.base, "json"), "utf8"));
      expect(j.chapters.length).toBeGreaterThan(1);
      j.chapters.forEach((c) => expect(Number(c.start ?? c.t)).toBeLessThan(f.seconds));
    }
  });
});
