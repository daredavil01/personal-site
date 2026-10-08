// The /blueprint player points at four committed files in public/video/,
// written together by `npm run blueprint:film -- --publish`. Like the share
// cards' guard, this fails the build if one is missing or they disagree,
// rather than letting the page ship a player with nothing behind it.

import fs from "fs";
import path from "path";
import { FILM } from "./FilmPlayer";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const file = (ext) => path.join(ROOT, "public", `${FILM}.${ext}`);

describe("the Blueprint film on /blueprint", () => {
  it("has its video, poster, captions and chapters committed", () => {
    ["mp4", "jpg", "vtt", "json"].forEach((ext) => {
      expect({ ext, exists: fs.existsSync(file(ext)) }).toEqual({ ext, exists: true });
    });
    expect(fs.statSync(file("mp4")).size).toBeGreaterThan(100000);
  });

  it("captions are WebVTT", () => {
    expect(fs.readFileSync(file("vtt"), "utf8").startsWith("WEBVTT")).toBe(true);
  });

  it("lists one chapter per sheet, in order, inside the film", () => {
    const meta = JSON.parse(fs.readFileSync(file("json"), "utf8"));
    const sheets = meta.chapters.map((c) => c.sheet);
    expect(sheets).toEqual(["A-01", "A-02", "A-03", "A-04", "A-05", "A-06"]);
    meta.chapters.forEach((c, i) => {
      expect(c.start).toBeGreaterThanOrEqual(0);
      expect(c.start).toBeLessThan(meta.duration);
      if (i) expect(c.start).toBeGreaterThan(meta.chapters[i - 1].start);
    });
  });
});
