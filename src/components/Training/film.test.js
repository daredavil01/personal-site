// The /training film points at four committed files in public/video/. Like
// the /videos and /logbook guards, this fails the build if one is missing,
// the web encode outgrows its budget (a phone that presses play downloads all
// of it) or the chapters stop describing a one-minute film.

import fs from "fs";
import path from "path";
import { FILM } from "./TrainingFilm";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const file = (ext) => path.join(ROOT, "public", `${FILM}.${ext}`);

describe("the /training film", () => {
  it("has its video, poster, captions and chapters committed", () => {
    ["mp4", "jpg", "vtt", "json"].forEach((ext) => {
      expect({ ext, exists: fs.existsSync(file(ext)) }).toEqual({ ext, exists: true });
    });
    const { size } = fs.statSync(file("mp4"));
    expect(size).toBeGreaterThan(100000);
    expect(size).toBeLessThan(6 * 1024 * 1024);
    expect(fs.statSync(file("jpg")).size).toBeLessThan(300 * 1024);
  });

  it("captions are WebVTT with the narration", () => {
    const vtt = fs.readFileSync(file("vtt"), "utf8");
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt.split("-->").length - 1).toBeGreaterThanOrEqual(8);
  });

  it("chapters run in order inside one minute", () => {
    const { duration, chapters } = JSON.parse(fs.readFileSync(file("json"), "utf8"));
    expect(duration).toBeLessThanOrEqual(60);
    expect(chapters.length).toBeGreaterThanOrEqual(6);
    expect(chapters[0].t).toBe(0);
    chapters.forEach((c, k) => {
      expect(typeof c.title).toBe("string");
      if (k) expect(c.t).toBeGreaterThan(chapters[k - 1].t);
    });
    expect(chapters[chapters.length - 1].t).toBeLessThan(duration);
  });
});
