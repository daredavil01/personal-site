// The /videos film points at three committed files in public/video/. Like
// the homepage trailer's guard, this fails the build if one is missing or the
// web encode outgrows its budget — a phone that presses play downloads all of it.

import fs from "fs";
import path from "path";
import { STORY } from "./Story";
import { SLIDES, SLIDES_DIR } from "./StorySlides";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const file = (ext) => path.join(ROOT, "public", `${STORY}.${ext}`);

describe("the /videos film", () => {
  it("has its video, poster and captions committed", () => {
    ["mp4", "jpg", "vtt"].forEach((ext) => {
      expect({ ext, exists: fs.existsSync(file(ext)) }).toEqual({ ext, exists: true });
    });
    const { size } = fs.statSync(file("mp4"));
    expect(size).toBeGreaterThan(100000);
    expect(size).toBeLessThan(8 * 1024 * 1024);
  });

  it("captions are WebVTT with the narration", () => {
    const vtt = fs.readFileSync(file("vtt"), "utf8");
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt.split("-->").length - 1).toBeGreaterThan(10);
  });
});

// The six slides under the grid: every one committed, each inside the site's
// 300 KB image cap, and nothing in the folder that the carousel does not show.
describe("the /videos slides", () => {
  const dir = path.join(ROOT, "public", SLIDES_DIR);

  it("has every slide committed, each under 300 KB", () => {
    SLIDES.forEach(({ file: name }) => {
      const p = path.join(dir, name);
      expect({ name, exists: fs.existsSync(p) }).toEqual({ name, exists: true });
      expect(fs.statSync(p).size).toBeLessThan(300 * 1024);
    });
  });

  it("shows every file in the folder, each with alt text", () => {
    expect(fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).sort()).toEqual(SLIDES.map((s) => s.file).sort());
    SLIDES.forEach(({ alt }) => expect(alt.length).toBeGreaterThan(30));
  });
});
