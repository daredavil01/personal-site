#!/usr/bin/env node
/**
 * Edit the /about page from the command line.
 *
 * The page's words live in src/data/about.md (hand-written, committed, also
 * indexed by /ask). Its numbers, timeline and most of its "Latest" log come
 * from Supabase and need no editing here. This script reads and writes the
 * markdown through the same parser the page uses (src/lib/aboutModel.js), so
 * what it prints is what the page will show.
 *
 * Usage (npm run about -- <command>):
 *   update "Text" [--date=YYYY-MM-DD] [--career] [--url=https://…]
 *                        add a line to the top of the Latest log (date: today)
 *   updates              list the hand-written updates
 *   unupdate "match"     remove updates whose text contains "match"
 *   show [section]       print one section, or list them all with word counts
 *   set <section> "Text" | --file=path.md
 *                        replace a section's body ("10 seconds", "Short bio", …)
 *   check                reading-time budgets, required sections, evidence
 *   bios                 print the one-line, short and long bios
 *
 * Add --dry-run to any writing command to print the result instead of saving.
 * Commit src/data/about.md afterwards (and log it in src/data/changelog.md);
 * run `npm run ask:index` so /ask reads the new words.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ABOUT_SECTIONS, addUpdate, getSection, parseAbout, parseUpdates, principlesWithEvidence,
  removeUpdate, setSection, splitSections, tierReport, wordCount,
} from "../src/lib/aboutModel.js";
import { IDENTITY } from "../src/data/identity.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "src", "data", "about.md");

const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter((a) => a.startsWith("--")).map((a) => {
  const [k, ...v] = a.slice(2).split("=");
  return [k, v.length ? v.join("=") : true];
}));
const [command, ...args] = argv.filter((a) => !a.startsWith("--"));
const DRY = !!flags["dry-run"];

const read = () => fs.readFileSync(FILE, "utf8");
const write = (md, note) => {
  if (DRY) {
    console.log(md);
    console.log(`\n(dry run — ${note}; nothing saved)`);
    return;
  }
  fs.writeFileSync(FILE, md);
  console.log(`✓ ${note}\n  saved ${path.relative(ROOT, FILE)} — commit it, then \`npm run ask:index\`.`);
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtSeconds = (s) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

// Projects are public rows, so the publishable key in wrangler.toml is enough.
async function loadProjects() {
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  const url = process.env.VITE_SUPABASE_URL || (toml.match(/VITE_SUPABASE_URL\s*=\s*"(.+?)"/) || [])[1];
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || (toml.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"(.+?)"/) || [])[1];
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/projects?select=id,title,subtitle,description,outcome,solution,highlights,tech_stack,featured,visible,date`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    return (await res.json()).map((r) => ({
      ...r, desc: r.description, techStack: r.tech_stack || [], highlights: r.highlights || [],
    }));
  } catch (_) {
    return null;
  }
}

const COMMANDS = {
  update() {
    const text = args.join(" ");
    const md = addUpdate(read(), {
      date: flags.date || today(), text, career: !!flags.career, url: typeof flags.url === "string" ? flags.url : null,
    });
    write(md, `added "${text}"`);
  },

  updates() {
    const list = parseUpdates(read());
    if (!list.length) { console.log("No hand-written updates yet. Add one: npm run about -- update \"…\""); return; }
    list.forEach((u) => console.log(`${u.date}  ${u.kind === "career" ? "[career] " : ""}${u.text}${u.url ? `  ${u.url}` : ""}`));
    console.log("\nCertifications, roles, projects, races and forts are added to the log automatically from Supabase.");
  },

  unupdate() {
    const needle = args.join(" ");
    if (!needle) throw new Error("Say which update: npm run about -- unupdate \"part of its text\"");
    const { md, removed } = removeUpdate(read(), needle);
    if (!removed) { console.log(`No update matches "${needle}".`); return; }
    write(md, `removed ${removed} update${removed > 1 ? "s" : ""}`);
  },

  show() {
    const md = read();
    if (args.length) {
      const body = getSection(md, args.join(" "));
      if (body == null) throw new Error(`No section "${args.join(" ")}". Run \`npm run about -- show\` for the list.`);
      console.log(body);
      return;
    }
    splitSections(md).forEach((s) => console.log(`# ${s.title.padEnd(14)} ${String(wordCount(s.body)).padStart(4)} words`));
  },

  set() {
    const [section, ...rest] = args;
    if (!section) throw new Error("npm run about -- set \"<section>\" \"text\"  (or --file=path.md)");
    const body = typeof flags.file === "string" ? fs.readFileSync(path.resolve(flags.file), "utf8") : rest.join(" ");
    if (!body.trim()) throw new Error("Nothing to set: pass the text, or --file=path.md");
    const known = ABOUT_SECTIONS.find((s) => s.key === section.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    if (!known) console.warn(`(note: "${section}" is not a section the page reads — it is saved but not shown)`);
    write(setSection(read(), section, body), `replaced "${section}"`);
  },

  async check() {
    const md = read();
    const model = parseAbout(md);
    const keys = splitSections(md).map((s) => s.key);
    let ok = true;
    console.log("Sections");
    ABOUT_SECTIONS.forEach((s) => {
      const has = keys.includes(s.key);
      if (!has) ok = false;
      console.log(`  ${has ? "✓" : "✗"} ${s.key}${s.note ? `  — ${s.note}` : ""}`);
    });
    console.log("\nReading time (230 words a minute)");
    tierReport(model).forEach((r) => {
      if (!r.ok) ok = false;
      console.log(`  ${r.ok ? "✓" : "✗"} ${r.key.padEnd(11)} ${String(r.words).padStart(4)} words  ${fmtSeconds(r.seconds).padStart(7)} of ${fmtSeconds(r.budget)}`);
    });
    const projects = await loadProjects();
    console.log("\nHow I work — evidence in the projects table");
    if (!projects) console.log("  (projects could not be read; skipped)");
    else {
      principlesWithEvidence(model.principles, projects).forEach((p) => {
        if (!p.count) ok = false;
        console.log(`  ${p.count ? "✓" : "✗"} ${p.title} — ${p.count} project${p.count === 1 ? "" : "s"}${p.projects.length ? ` (${p.projects.map((x) => x.title).join(", ")})` : ""}`);
      });
    }
    const bad = model.updates.length !== parseUpdates(md).length;
    if (bad) ok = false;
    console.log(`\nUpdates: ${model.updates.length} hand-written line${model.updates.length === 1 ? "" : "s"}`);
    if (!ok) { console.log("\nSome checks failed."); process.exitCode = 1; } else console.log("\nAll good.");
  },

  bios() {
    const model = parseAbout(read());
    console.log(`One line (${wordCount(model.tenSeconds)} words)\n  ${model.tenSeconds}\n`);
    console.log(`Short (${wordCount(model.shortBio)} words)\n  ${model.shortBio}\n`);
    console.log(`Long (${wordCount(IDENTITY.bio)} words — src/data/identity.js)\n  ${IDENTITY.bio}`);
  },
};

const run = COMMANDS[command];
if (!run) {
  const usage = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").match(/Usage[\s\S]*?\*\//)[0];
  console.log(usage.replace(/^ \* ?/gm, "").replace(/\*\/$/, ""));
  process.exitCode = command ? 1 : 0;
} else {
  Promise.resolve().then(run).catch((err) => { console.error(`✗ ${err.message}`); process.exitCode = 1; });
}
