// node --test scripts/lib/registry.test.mjs  (npm run test:scripts)

import test from "node:test";
import assert from "node:assert/strict";
import { collectChunks, loadSources, planChunks, planOrphans } from "./registry.mjs";
import { hashChunk, splitProse, syntheticId } from "./chunking.mjs";

test("syntheticId is stable and bigint-safe", () => {
  assert.equal(syntheticId("https://example.com/p/a"), syntheticId("https://example.com/p/a"));
  assert.notEqual(syntheticId("a"), syntheticId("b"));
  assert.ok(Number.isSafeInteger(syntheticId("anything")));
});

test("every source file exports type, load and toChunks", async () => {
  const sources = await loadSources();
  assert.ok(sources.length >= 14, `expected the full registry, got ${sources.length}`);
  for (const s of sources) {
    assert.equal(typeof s.load, "function", s.file);
    assert.equal(typeof s.toChunks, "function", s.file);
  }
  assert.equal(new Set(sources.map((s) => s.type)).size, sources.length, "duplicate type");
});

const chunk = (type, id, index, body, extra = {}) => {
  const c = { entity_type: type, entity_id: id, chunk_index: index, title: "t", url: "/", body, ...extra };
  return { ...c, ...hashChunk(c) };
};

test("a throwing source protects its chunks (and owned types) from deletion", async () => {
  const sources = [
    { type: "ok", file: "ok.mjs", load: async () => [1], toChunks: () => [chunk("ok", 1, 0, "hello")] },
    { type: "broken", file: "broken.mjs", owns: ["blog"], load: async () => { throw new Error("offline"); }, toChunks: () => [] },
  ];
  const { chunks, failedTypes, report } = await collectChunks(sources, {});
  assert.equal(chunks.length, 1);
  assert.deepEqual([...failedTypes].sort(), ["blog", "broken"]);
  assert.match(report[1].error, /offline/);

  const existing = [
    { entity_type: "ok", entity_id: 9, chunk_index: 0 },
    { entity_type: "broken", entity_id: 1, chunk_index: 0 },
    { entity_type: "blog", entity_id: 4, chunk_index: 2 },
  ];
  assert.deepEqual(planOrphans(existing, chunks, failedTypes), [existing[0]]);
});

test("only new text is embedded; moved and retitled text is not", () => {
  const a = chunk("page", 2, 0, "first entry");
  const b = chunk("page", 2, 1, "second entry");
  const existing = [a, b].map(({ entity_type, entity_id, chunk_index, content_hash, embed_hash }) => (
    { entity_type, entity_id, chunk_index, content_hash, embed_hash }));

  // A new changelog entry lands on top: every old chunk shifts down one index.
  const next = [
    chunk("page", 2, 0, "brand new entry"),
    chunk("page", 2, 1, "first entry"),
    chunk("page", 2, 2, "second entry"),
  ];
  const plan = planChunks(next, existing);
  assert.equal(plan.embed.length, 1);
  assert.equal(plan.embed[0].body, "brand new entry");
  assert.equal(plan.reuse.length, 2);

  const retitled = chunk("page", 2, 0, "first entry", { title: "renamed" });
  const plan2 = planChunks([retitled, chunk("page", 2, 1, "second entry")], existing);
  assert.equal(plan2.metadata.length, 1);
  assert.equal(plan2.unchanged.length, 1);
  assert.equal(plan2.embed.length, 0);

  assert.equal(planChunks(next, existing, { full: true }).embed.length, 3);
});

test("splitProse never returns a chunk over the limit", () => {
  const long = `${"word ".repeat(700)}\n\n${"sentence. ".repeat(300)}`;
  for (const part of splitProse(long, 1200)) assert.ok(part.length <= 1200, String(part.length));
});
