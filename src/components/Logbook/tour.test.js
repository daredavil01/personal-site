// The /logbook tour points at four committed files in public/video/. Like the
// Blueprint film's guard, this fails the build if one is missing, the chapters
// disagree with the film, or the web encode outgrows its budget — a phone
// that presses play downloads all of it.

import fs from "fs";
import path from "path";
import { TOUR } from "./TourDialog";
import { CHAPTERS } from "./Chapters";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const file = (ext) => path.join(ROOT, "public", `${TOUR}.${ext}`);

describe("the Logbook tour on /logbook", () => {
  it("has its video, poster, captions and chapters committed", () => {
    ["mp4", "jpg", "vtt", "json"].forEach((ext) => {
      expect({ ext, exists: fs.existsSync(file(ext)) }).toEqual({ ext, exists: true });
    });
    const { size } = fs.statSync(file("mp4"));
    expect(size).toBeGreaterThan(100000);
    expect(size).toBeLessThan(6 * 1024 * 1024);
  });

  it("captions are WebVTT", () => {
    expect(fs.readFileSync(file("vtt"), "utf8").startsWith("WEBVTT")).toBe(true);
  });

  it("starts at the cover and visits every chapter in the page's order", () => {
    const meta = JSON.parse(fs.readFileSync(file("json"), "utf8"));
    const ids = meta.chapters.map((c) => c.id);
    expect(ids[0]).toBe("cover");
    expect(meta.chapters[0].start).toBe(0);
    const shown = CHAPTERS.map((c) => c.id).filter((id) => ids.includes(id));
    expect(shown).toEqual(["atlas", "sky", "fingerprint", "phrases", "letters", "poem"]);
    meta.chapters.forEach((c, i) => {
      expect(c.start).toBeLessThan(meta.duration);
      if (i) expect(c.start).toBeGreaterThan(meta.chapters[i - 1].start);
    });
  });
});
