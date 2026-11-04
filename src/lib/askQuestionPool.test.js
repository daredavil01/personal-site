// Guards the seeded /ask question pool (migrations 0020 and 0041): every
// question well-formed and unique, every category one the page can label, and
// every shelf with a category actually given questions to offer.
import fs from "fs";
import path from "path";
import { validPool } from "./askQuestions";
import { CATEGORY_LABELS, POOL_CATEGORY } from "./askShelves";

const MIGRATIONS = path.join(__dirname, "../../supabase/migrations");

function poolFrom(file) {
  // Comments first: a header that quotes '[...]' would match before the data.
  const sql = fs.readFileSync(path.join(MIGRATIONS, file), "utf8").replace(/^\s*--.*$/gm, "");
  const match = sql.match(/'(\[[\s\S]*?\])'::jsonb/) || sql.match(/question_pool = '(\[[\s\S]*?\])'/);
  return JSON.parse(match[1].replace(/''/g, "'"));
}

const seed = poolFrom("0020_ask_question_pool.sql");
const more = poolFrom("0041_ask_question_pool_more.sql");
const all = [...seed, ...more];

describe("the seeded question pool", () => {
  it("adds at least a hundred questions", () => {
    expect(more.length).toBeGreaterThanOrEqual(100);
    expect(validPool(more)).toHaveLength(more.length);
  });

  it("never repeats a question, ignoring case and spaces", () => {
    const keys = all.map((p) => p.q.trim().toLowerCase().replace(/\s+/g, " "));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps each question short enough for a chip and far under the message cap", () => {
    all.forEach((p) => expect(p.q.length).toBeLessThanOrEqual(90));
  });

  it("uses only categories the page has a label for", () => {
    all.forEach((p) => expect(Object.keys(CATEGORY_LABELS)).toContain(p.c));
  });

  it("gives every shelf with a category at least three questions", () => {
    new Set(Object.values(POOL_CATEGORY)).forEach((c) => {
      expect(all.filter((p) => p.c === c).length).toBeGreaterThanOrEqual(3);
    });
  });

  it("keeps some questions in Marathi", () => {
    expect(more.filter((p) => /[ऀ-ॿ]/.test(p.q)).length).toBeGreaterThanOrEqual(5);
  });
});
