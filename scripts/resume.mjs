#!/usr/bin/env node
/**
 * Edit the /resume tables from the command line.
 *
 * The resume lives in four Supabase tables (resume_positions, resume_degrees,
 * resume_certifications, resume_skills), edited at /admin/resume. This is the
 * same job without a browser: add a certification the day you pass it, append
 * a bullet to a role, or keep the whole resume in a YAML file and sync it.
 * Every write appears on /resume, /about's Latest log and /stats on next load.
 *
 * Usage (npm run resume -- <command>):
 *   list [section]                         print rows with their ids
 *   add <section> --field=value …          insert a row
 *   edit <section> <id> --field=value …    change fields of one row
 *   bullet <id> "Text"                     append a bullet to a position
 *   remove <section> <id> --yes            delete a row
 *   export [--out=knowledge_base/resume.yaml]
 *                                          write every section to YAML
 *   import <file.yaml> [--prune]           upsert rows from YAML (rows with an
 *                                          id update, rows without one insert;
 *                                          --prune deletes ids not in the file)
 *
 * Sections: experience | education | certifications | skills
 * Fields:
 *   experience      company, position, daterange ("February 2024 - Present"),
 *                   link, point (repeat it for several bullets), sort
 *   education       school, degree, year, link, sort
 *   certifications  name, source, date ("May 2026" or "30-10-2026"), link, sort
 *   skills          title, competency (1–5), category ("Tools,Data Engineering"), sort
 *
 * Add --dry-run to print what would be written. Reads need nothing; writes need
 * SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { makeClient } from "./build-docs.mjs";
import { parseDaterange, parseLooseDate } from "../src/lib/resumeModel.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// One entry per section: the table, the CLI field → column map, the column
// order for listing, and how a YAML/CLI value becomes a column value.
const SECTIONS = {
  experience: {
    table: "resume_positions",
    fields: { company: "company", position: "position", daterange: "daterange", link: "link", point: "points", points: "points", sort: "sort_order" },
    required: ["company", "position", "daterange"],
    show: (r) => `${r.position} — ${r.company} (${r.daterange})${(r.points || []).map((p) => `\n      • ${p}`).join("")}`,
    check: (row) => { if (row.daterange && !parseDaterange(row.daterange).start) throw new Error(`Cannot read daterange "${row.daterange}" — use e.g. "February 2024 - Present"`); },
  },
  education: {
    table: "resume_degrees",
    fields: { school: "school", degree: "degree", year: "year", link: "link", sort: "sort_order" },
    required: ["school", "degree", "year"],
    show: (r) => `${r.degree} — ${r.school} (${r.year})`,
    check: () => {},
  },
  certifications: {
    table: "resume_certifications",
    fields: { name: "name", source: "source", date: "issued_date", issued: "issued_date", link: "link", sort: "sort_order" },
    required: ["name", "source"],
    show: (r) => `${r.name} — ${r.source} (${r.issued_date || "undated"})`,
    check: (row) => { if (row.issued_date && !parseLooseDate(row.issued_date)) throw new Error(`Cannot read date "${row.issued_date}" — use "May 2026", "May 23, 2026" or "30-10-2026"`); },
  },
  skills: {
    table: "resume_skills",
    fields: { title: "title", competency: "competency", category: "category", categories: "category", sort: "sort_order" },
    required: ["title", "competency"],
    show: (r) => `${r.title}  ${"●".repeat(r.competency || 0)}${"○".repeat(5 - (r.competency || 0))}  [${(r.category || []).join(", ")}]`,
    check: (row) => { if (row.competency != null && !(row.competency >= 1 && row.competency <= 5)) throw new Error("competency must be 1–5"); },
  },
};
const ALIASES = { positions: "experience", jobs: "experience", work: "experience", degrees: "education", certs: "certifications", certificates: "certifications", skill: "skills" };

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
argv.forEach((a) => {
  if (!a.startsWith("--")) { positional.push(a); return; }
  const [k, ...v] = a.slice(2).split("=");
  const value = v.length ? v.join("=") : true;
  if (k === "point" || k === "points") (flags.point = flags.point || []).push(value);
  else flags[k] = value;
});
const [command, ...args] = positional;
const DRY = !!flags["dry-run"];

const sectionOf = (name) => {
  const key = ALIASES[String(name || "").toLowerCase()] || String(name || "").toLowerCase();
  const s = SECTIONS[key];
  if (!s) throw new Error(`Unknown section "${name}". Use one of: ${Object.keys(SECTIONS).join(", ")}`);
  return { key, ...s };
};

// CLI flags or a YAML object → a row for the table.
function toRow(section, input) {
  const row = {};
  Object.entries(input).forEach(([k, v]) => {
    const col = section.fields[k] || (Object.values(section.fields).includes(k) ? k : null);
    if (!col || v === true) return;
    if (col === "points") row.points = [...(row.points || []), ...[].concat(v).map(String)];
    else if (col === "category") row.category = Array.isArray(v) ? v.map(String) : String(v).split(",").map((s) => s.trim()).filter(Boolean);
    else if (["year", "competency", "sort_order"].includes(col)) row[col] = Number(v);
    else row[col] = String(v);
  });
  section.check(row);
  return row;
}

let client = null;
const db = () => {
  if (!client) client = makeClient();
  return client;
};

async function readTable(section) {
  // The resume tables are public reads, so listing needs no secret: the
  // publishable key in wrangler.toml is enough. Writes use the service client.
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  const url = toml.match(/VITE_SUPABASE_URL\s*=\s*"(.+?)"/)[1];
  const key = toml.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"(.+?)"/)[1];
  const res = await fetch(`${url}/rest/v1/${section.table}?select=*&order=sort_order,id`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${section.table}: HTTP ${res.status}`);
  return res.json();
}

const clean = (r) => {
  const out = { ...r };
  delete out.created_at;
  delete out.updated_at;
  return out;
};

const preview = (label, payload) => {
  console.log(`${label}\n${YAML.stringify(payload).replace(/^/gm, "  ")}`);
};

const COMMANDS = {
  async list() {
    const names = args.length ? [args[0]] : Object.keys(SECTIONS);
    for (const n of names) {
      const s = sectionOf(n);
      const rows = await readTable(s);
      console.log(`\n${s.key} (${rows.length})`);
      rows.forEach((r) => console.log(`  #${String(r.id).padEnd(4)} ${s.show(r)}`));
    }
  },

  async add() {
    const s = sectionOf(args[0]);
    const row = toRow(s, flags);
    const missing = s.required.filter((f) => row[s.fields[f]] == null || row[s.fields[f]] === "");
    if (missing.length) throw new Error(`Missing --${missing.join(", --")}`);
    if (row.sort_order == null) row.sort_order = 0;
    if (DRY) { preview(`Would insert into ${s.table}:`, row); return; }
    const { data, error } = await db().from(s.table).insert(row).select().single();
    if (error) throw error;
    console.log(`✓ added #${data.id}: ${s.show(data)}`);
  },

  async edit() {
    const s = sectionOf(args[0]);
    const id = Number(args[1]);
    if (!id) throw new Error("Which row? npm run resume -- edit <section> <id> --field=value");
    const patch = toRow(s, flags);
    if (!Object.keys(patch).length) throw new Error("Nothing to change — pass at least one --field=value");
    if (DRY) { preview(`Would update ${s.table} #${id}:`, patch); return; }
    const { data, error } = await db().from(s.table).update(patch).eq("id", id).select().single();
    if (error) throw error;
    console.log(`✓ updated #${id}: ${s.show(data)}`);
  },

  async bullet() {
    const s = SECTIONS.experience;
    const id = Number(args[0]);
    const text = args.slice(1).join(" ").trim();
    if (!id || !text) throw new Error("npm run resume -- bullet <position id> \"What you did, and what it changed\"");
    const rows = await readTable(s);
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error(`No position #${id}. See: npm run resume -- list experience`);
    const points = [...(row.points || []), text];
    if (DRY) { preview(`Would set points on #${id}:`, points); return; }
    const { error } = await db().from(s.table).update({ points }).eq("id", id);
    if (error) throw error;
    console.log(`✓ ${row.company} now has ${points.length} bullets`);
  },

  async remove() {
    const s = sectionOf(args[0]);
    const id = Number(args[1]);
    if (!id) throw new Error("npm run resume -- remove <section> <id> --yes");
    const row = (await readTable(s)).find((r) => r.id === id);
    if (!row) throw new Error(`No ${s.key} row #${id}`);
    if (!flags.yes || DRY) { console.log(`Would delete #${id}: ${s.show(row)}${DRY ? "" : "\nRe-run with --yes to delete it."}`); return; }
    const { error } = await db().from(s.table).delete().eq("id", id);
    if (error) throw error;
    console.log(`✓ deleted #${id}`);
  },

  async export() {
    const out = path.resolve(ROOT, typeof flags.out === "string" ? flags.out : "knowledge_base/resume.yaml");
    const doc = {};
    for (const key of Object.keys(SECTIONS)) doc[key] = (await readTable(SECTIONS[key])).map(clean);
    const text = `# The /resume tables. Edit, then: npm run resume -- import ${path.relative(ROOT, out)}\n# Rows with an id update in place; a row without an id is inserted.\n${YAML.stringify(doc)}`;
    if (DRY) { console.log(text); return; }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log(`✓ wrote ${path.relative(ROOT, out)} (${Object.entries(doc).map(([k, v]) => `${v.length} ${k}`).join(", ")})`);
  },

  async import() {
    const file = args[0];
    if (!file) throw new Error("npm run resume -- import <file.yaml>");
    const doc = YAML.parse(fs.readFileSync(path.resolve(file), "utf8")) || {};
    const plan = [];
    for (const [name, rows] of Object.entries(doc)) {
      const s = sectionOf(name);
      const current = await readTable(s);
      const byId = new Map(current.map((r) => [r.id, r]));
      const seen = new Set();
      (rows || []).forEach((input) => {
        const row = toRow(s, input);
        if (input.id) {
          seen.add(Number(input.id));
          const was = byId.get(Number(input.id));
          if (!was) throw new Error(`${s.key}: id ${input.id} is not in the table — drop the id to insert it`);
          const changed = Object.keys(row).filter((k) => JSON.stringify(row[k]) !== JSON.stringify(was[k]));
          if (changed.length) plan.push({ s, op: "update", id: Number(input.id), row, note: changed.join(", ") });
        } else {
          plan.push({ s, op: "insert", row: { sort_order: 0, ...row }, note: s.show({ ...row }) });
        }
      });
      if (flags.prune) current.filter((r) => !seen.has(r.id)).forEach((r) => plan.push({ s, op: "delete", id: r.id, note: s.show(r) }));
    }
    if (!plan.length) { console.log("Nothing to change — the tables already match the file."); return; }
    plan.forEach((p) => console.log(`  ${p.op.padEnd(6)} ${p.s.key}${p.id ? ` #${p.id}` : ""}: ${p.note}`));
    if (DRY) { console.log("\n(dry run — nothing written)"); return; }
    for (const p of plan) {
      const q = db().from(p.s.table);
      const { error } = p.op === "insert" ? await q.insert(p.row)
        : p.op === "update" ? await q.update(p.row).eq("id", p.id)
          : await q.delete().eq("id", p.id);
      if (error) throw error;
    }
    console.log(`\n✓ ${plan.length} change${plan.length === 1 ? "" : "s"} written`);
  },
};

const run = COMMANDS[command];
if (!run) {
  const usage = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").match(/Usage[\s\S]*?\*\//)[0];
  console.log(usage.replace(/^ \* ?/gm, "").replace(/\*\/$/, ""));
  process.exitCode = command ? 1 : 0;
} else {
  run().catch((err) => { console.error(`✗ ${err.message || err}`); process.exitCode = 1; });
}
