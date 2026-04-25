#!/usr/bin/env node
/**
 * Syncs Decap CMS markdown files → src/data/*.js
 *
 * Run after Decap commits new content:  npm run cms:sync
 *
 * Reads:
 *   src/cms-content/now/meta.md             → nowMeta in src/data/now-data.js
 *   src/cms-content/now/months/*.md         → nowData in src/data/now-data.js
 *   src/cms-content/books/*.md              → src/data/books.js
 *   src/cms-content/100days/*.md            → src/data/100DaysToOffload.js
 *   src/cms-content/sports/*.md             → src/data/sports.js
 *   src/cms-content/treks/*.md              → src/data/treks.js
 *   src/cms-content/projects/*.md           → src/data/projects.js
 *   src/cms-content/instagram/*.md          → src/data/instagram.js
 *   src/cms-content/resume/positions/*.md   → src/data/resume/positions.js
 *   src/cms-content/resume/degrees/*.md     → src/data/resume/degrees.js
 *   src/cms-content/resume/skills/*.md      → src/data/resume/skills.js
 *   src/cms-content/resume/certifications/*.md → src/data/resume/certifications.js
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const ROOT = path.resolve(__dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────────

function readMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return null;
      return YAML.parse(match[1]);
    })
    .filter(Boolean);
}

function readSingleMarkdownFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return YAML.parse(match[1]);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** JS serializer: outputs template literals for /images/ URL fields. */
function serialize(value, key, indent) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (key === 'url' && value.startsWith('/images/')) {
      return `\`\${process.env.PUBLIC_URL}${value}\``;
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const pad = '  '.repeat(indent + 1);
    const close = '  '.repeat(indent);
    const items = value.map((item) => `${pad}${serialize(item, null, indent + 1)}`);
    return `[\n${items.join(',\n')},\n${close}]`;
  }
  if (typeof value === 'object') {
    const pad = '  '.repeat(indent + 1);
    const close = '  '.repeat(indent);
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${pad}${k}: ${serialize(v, k, indent + 1)}`);
    return `{\n${entries.join(',\n')},\n${close}}`;
  }
  return JSON.stringify(value);
}

function jsSerialize(data) {
  return serialize(data, null, 0);
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ Written: ${path.relative(ROOT, filePath)}`);
}

// ── MONTH ORDER for sorting nowData ──────────────────────────────────────────

const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function compareMonths(a, b) {
  if (b.year !== a.year) return b.year - a.year;
  return MONTH_ORDER.indexOf(b.month) - MONTH_ORDER.indexOf(a.month);
}

// ── sync now-data.js ──────────────────────────────────────────────────────────

function syncNow() {
  const metaPath = path.join(ROOT, 'src/cms-content/now/meta.md');
  const monthsDir = path.join(ROOT, 'src/cms-content/now/months');
  const outPath = path.join(ROOT, 'src/data/now-data.js');

  const metaRaw = readSingleMarkdownFile(metaPath);
  const monthFiles = readMarkdownFiles(monthsDir);

  if (!metaRaw && monthFiles.length === 0) {
    console.log('  – No Now CMS content found. Skipping.');
    return;
  }

  // nowMeta: use CMS file if present
  const nowMeta = metaRaw ?? {};

  // nowData: each month file has top-level fields + section arrays/objects
  // Re-nest them under `sections` to match the app's data shape
  const nowData = monthFiles
    .map(({ month, year, isCurrent, ...sections }) => ({
      month,
      year,
      isCurrent: !!isCurrent,
      sections: Object.fromEntries(
        Object.entries(sections).filter(([, v]) => {
          if (Array.isArray(v)) return v.length > 0;
          if (v && typeof v === 'object') return Object.keys(v).length > 0;
          return false;
        })
      ),
    }))
    .sort(compareMonths);

  // Ensure only one month is marked current
  let foundCurrent = false;
  const deduped = nowData.map((m) => {
    if (m.isCurrent) {
      if (foundCurrent) return { ...m, isCurrent: false };
      foundCurrent = true;
    }
    return m;
  });

  const content =
    `/* eslint-disable max-len */\n` +
    `export const nowMeta = ${jsSerialize(nowMeta)};\n\n` +
    `export const nowData = ${jsSerialize(deduped)};\n`;

  writeFile(outPath, content);
  console.log(`     nowMeta + nowData (${deduped.length} months)`);
}

// ── sync books ────────────────────────────────────────────────────────────────

function syncBooks() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/books'));
  if (entries.length === 0) { console.log('  – No books files. Skipping.'); return; }
  const sorted = entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  writeFile(
    path.join(ROOT, 'src/data/books.js'),
    `/* eslint-disable max-len */\nconst books = ${JSON.stringify(sorted, null, 2)};\n\nexport default books;\n`
  );
  console.log(`     ${sorted.length} books`);
}

// ── sync 100 days ─────────────────────────────────────────────────────────────

function syncHundredDays() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/100days'));
  if (entries.length === 0) { console.log('  – No 100days files. Skipping.'); return; }
  const sorted = entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  writeFile(
    path.join(ROOT, 'src/data/100DaysToOffload.js'),
    `/* eslint-disable max-len */\nconst blogs = ${JSON.stringify(sorted, null, 2)};\n\nexport default blogs;\n`
  );
  console.log(`     ${sorted.length} posts`);
}

// ── sync sports ───────────────────────────────────────────────────────────────

function syncSports() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/sports'));
  if (entries.length === 0) { console.log('  – No sports files. Skipping.'); return; }
  const sorted = entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  writeFile(
    path.join(ROOT, 'src/data/sports.js'),
    `/* eslint-disable max-len */\nconst { PUBLIC_URL } = process.env;\n\nconst sportsData = ${jsSerialize(sorted)};\n\nexport default sportsData;\n`
  );
  console.log(`     ${sorted.length} races`);
}

// ── sync treks ────────────────────────────────────────────────────────────────

function syncTreks() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/treks'));
  if (entries.length === 0) { console.log('  – No treks files. Skipping.'); return; }
  const sorted = entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  writeFile(
    path.join(ROOT, 'src/data/treks.js'),
    `/* eslint-disable max-len */\nconst { PUBLIC_URL } = process.env;\n\nconst treks = ${jsSerialize(sorted)};\n\nexport default treks;\n`
  );
  console.log(`     ${sorted.length} treks`);
}

// ── sync projects ─────────────────────────────────────────────────────────────

function syncProjects() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/projects'));
  if (entries.length === 0) { console.log('  – No projects files. Skipping.'); return; }
  writeFile(
    path.join(ROOT, 'src/data/projects.js'),
    `/* eslint-disable max-len */\nconst { PUBLIC_URL } = process.env;\n\nconst data = ${jsSerialize(entries)};\n\nexport default data;\n`
  );
  console.log(`     ${entries.length} projects`);
}

// ── sync instagram ────────────────────────────────────────────────────────────

function syncInstagram() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/instagram'));
  if (entries.length === 0) { console.log('  – No instagram files. Skipping.'); return; }
  const sorted = entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  writeFile(
    path.join(ROOT, 'src/data/instagram.js'),
    `/* eslint-disable max-len */\nconst { PUBLIC_URL } = process.env;\n\nconst posts = ${jsSerialize(sorted)};\n\nexport default posts;\n`
  );
  console.log(`     ${sorted.length} posts`);
}

// ── sync resume ───────────────────────────────────────────────────────────────

function syncResume() {
  const base = path.join(ROOT, 'src/cms-content/resume');
  const outBase = path.join(ROOT, 'src/data/resume');

  const collections = [
    { dir: 'positions',      out: 'positions.js',      varName: 'positions',      sort: false },
    { dir: 'degrees',        out: 'degrees.js',         varName: 'degrees',        sort: false },
    { dir: 'certifications', out: 'certifications.js',  varName: 'certifications', sort: false },
  ];

  for (const { dir, out, varName, sort } of collections) {
    const entries = readMarkdownFiles(path.join(base, dir));
    if (entries.length === 0) { console.log(`  – No resume/${dir} files. Skipping.`); continue; }
    const data = sort ? entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0)) : entries;
    writeFile(
      path.join(outBase, out),
      `/* eslint-disable max-len */\nconst ${varName} = ${JSON.stringify(data, null, 2)};\n\nexport default ${varName};\n`
    );
    console.log(`     ${data.length} ${dir}`);
  }

  // Skills uses a named export
  const skills = readMarkdownFiles(path.join(base, 'skills'));
  if (skills.length > 0) {
    writeFile(
      path.join(outBase, 'skills.js'),
      `/* eslint-disable max-len */\nexport const skills = ${JSON.stringify(skills, null, 2)};\n`
    );
    console.log(`     ${skills.length} skills`);
  } else {
    console.log('  – No resume/skills files. Skipping.');
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('\nCMS Sync: markdown → JS data files\n');

console.log('Now Page:');     syncNow();
console.log('\nBooks:');       syncBooks();
console.log('\n100 Days:');    syncHundredDays();
console.log('\nSports:');      syncSports();
console.log('\nTreks:');       syncTreks();
console.log('\nProjects:');    syncProjects();
console.log('\nInstagram:');   syncInstagram();
console.log('\nResume:');      syncResume();

console.log('\nDone. Commit updated data files and push to redeploy.\n');
