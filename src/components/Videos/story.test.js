// The /videos film points at three committed files in public/video/. Like
// the homepage trailer's guard, this fails the build if one is missing or the
// web encode outgrows its budget — a phone that presses play downloads all of it.

import fs from "fs";
import path from "path";
import { STORY } from "./Story";

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
