// The /projects film points at two committed files in public/video/. Like
// the /videos film's guard, this fails the build if one is missing or the web
// encode outgrows its budget — a phone that presses play downloads all of it.

import fs from "fs";
import path from "path";
import { STORY } from "./Story";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const file = (ext) => path.join(ROOT, "public", `${STORY}.${ext}`);

describe("the /projects film", () => {
  it("has its video and poster committed, the video under 8 MB", () => {
    ["mp4", "jpg"].forEach((ext) => {
      expect({ ext, exists: fs.existsSync(file(ext)) }).toEqual({ ext, exists: true });
    });
    const { size } = fs.statSync(file("mp4"));
    expect(size).toBeGreaterThan(100000);
    expect(size).toBeLessThan(8 * 1024 * 1024);
  });
});
