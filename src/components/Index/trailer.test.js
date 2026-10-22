// The homepage trailer points at three committed files in public/video/. Like
// the Logbook tour's guard, this fails the build if one is missing or the web
// encode outgrows its budget — a phone that presses play downloads all of it.

import fs from "fs";
import path from "path";
import { TRAILER } from "./Trailer";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const file = (ext) => path.join(ROOT, "public", `${TRAILER}.${ext}`);

describe("the homepage trailer", () => {
  it("has its video, poster and captions committed", () => {
    ["mp4", "jpg", "vtt"].forEach((ext) => {
      expect({ ext, exists: fs.existsSync(file(ext)) }).toEqual({ ext, exists: true });
    });
    const { size } = fs.statSync(file("mp4"));
    expect(size).toBeGreaterThan(100000);
    expect(size).toBeLessThan(8 * 1024 * 1024);
  });

  it("captions are WebVTT", () => {
    expect(fs.readFileSync(file("vtt"), "utf8").startsWith("WEBVTT")).toBe(true);
  });
});
