// node --test scripts/lib/dataFile.test.mjs  (npm run test:scripts)

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeJsonIfChanged } from "./dataFile.mjs";

test("rewrites a data file only when more than its timestamps changed", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "data-file-")), "out.json");
  const doc = (at, posts) => `${JSON.stringify({ generatedAt: at, currentPeriod: { at }, posts })}\n`;

  assert.equal(writeJsonIfChanged(file, doc("2026-10-16", [1])), true);
  assert.equal(writeJsonIfChanged(file, doc("2026-10-17", [1])), false);
  assert.equal(fs.readFileSync(file, "utf8"), doc("2026-10-16", [1]));
  assert.equal(writeJsonIfChanged(file, doc("2026-10-17", [1, 2])), true);
  assert.equal(fs.readFileSync(file, "utf8"), doc("2026-10-17", [1, 2]));
});
