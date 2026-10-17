// Committed data files (public/data/*.json) carry fields every run rewrites:
// the build time, and the month/year-to-date figures readers recompute anyway.
// A file whose rest is unchanged is left alone, so a refresh with nothing new
// leaves no diff. The nightly workflow's commit step strips the same keys.

import fs from "node:fs";
import path from "node:path";

export const VOLATILE = ["generatedAt", "currentPeriod"];

const stable = (text) => {
  const j = JSON.parse(text);
  VOLATILE.forEach((k) => delete j[k]);
  return JSON.stringify(j);
};

/** Write `text` (a JSON document) to `file` unless only VOLATILE fields differ. Returns whether it wrote. */
export function writeJsonIfChanged(file, text) {
  try {
    if (stable(fs.readFileSync(file, "utf8")) === stable(text)) return false;
  } catch { /* missing or unparseable: write it */ }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
  return true;
}
