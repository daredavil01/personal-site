#!/usr/bin/env node
/**
 * Syncs Decap CMS markdown files → src/data/*.js
 *
 * Run after Decap commits new content:  npm run cms:sync
 *
 * Reads:
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
    .sort() // readdir order is filesystem-dependent; keep output deterministic
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return null;
      return YAML.parse(match[1]);
    })
    .filter(Boolean);
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

// ── sync books ────────────────────────────────────────────────────────────────

function syncBooks() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/books'));
  if (entries.length === 0) { console.log('  – No books files. Skipping.'); return; }
  const sorted = entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  writeFile(
    path.join(ROOT, 'src/data/books.js'),
    `/* eslint-disable max-len */\nconst books = ${jsSerialize(sorted)};\n\nexport default books;\n`
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
    `/* eslint-disable max-len */\nconst blogs = ${jsSerialize(sorted)};\n\nexport default blogs;\n`
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
    `/* eslint-disable max-len */\nconst sportsData = ${jsSerialize(sorted)};\n\nexport default sportsData;\n`
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
    `/* eslint-disable max-len */\nconst treks = ${jsSerialize(sorted)};\n\nexport default treks;\n`
  );
  console.log(`     ${sorted.length} treks`);
}

// ── sync projects ─────────────────────────────────────────────────────────────

function syncProjects() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/projects'));
  if (entries.length === 0) { console.log('  – No projects files. Skipping.'); return; }
  writeFile(
    path.join(ROOT, 'src/data/projects.js'),
    `/* eslint-disable max-len */\nconst data = ${jsSerialize(entries)};\n\nexport default data;\n`
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
    `/* eslint-disable max-len */\nconst posts = ${jsSerialize(sorted)};\n\nexport default posts;\n`
  );
  console.log(`     ${sorted.length} posts`);
}

// ── sync resume ───────────────────────────────────────────────────────────────

function syncResume() {
  const base = path.join(ROOT, 'src/cms-content/resume');
  const outBase = path.join(ROOT, 'src/data/resume');

  const collections = [
    { dir: 'positions', out: 'positions.js', varName: 'positions', sort: false },
    { dir: 'degrees', out: 'degrees.js', varName: 'degrees', sort: false },
    { dir: 'certifications', out: 'certifications.js', varName: 'certifications', sort: false },
  ];

  for (const { dir, out, varName, sort } of collections) {
    const entries = readMarkdownFiles(path.join(base, dir));
    if (entries.length === 0) { console.log(`  – No resume/${dir} files. Skipping.`); continue; }
    const data = sort ? entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0)) : entries;
    writeFile(
      path.join(outBase, out),
      `/* eslint-disable max-len */\nconst ${varName} = ${jsSerialize(data)};\n\nexport default ${varName};\n`
    );
    console.log(`     ${data.length} ${dir}`);
  }

  // Skills uses a named export
  const skills = readMarkdownFiles(path.join(base, 'skills'));
  if (skills.length > 0) {
    writeFile(
      path.join(outBase, 'skills.js'),
      `/* eslint-disable max-len, import/prefer-default-export */\nexport const skills = ${jsSerialize(skills)};\n`
    );
    console.log(`     ${skills.length} skills`);
  } else {
    console.log('  – No resume/skills files. Skipping.');
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('\nCMS Sync: markdown → JS data files\n');

console.log('Books:'); syncBooks();
console.log('\n100 Days:'); syncHundredDays();
console.log('\nSports:'); syncSports();
console.log('\nTreks:'); syncTreks();
console.log('\nProjects:'); syncProjects();
console.log('\nInstagram:'); syncInstagram();
console.log('\nResume:'); syncResume();

console.log('\nDone. Commit updated data files and push to redeploy.\n');
