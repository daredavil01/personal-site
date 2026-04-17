#!/usr/bin/env node
/**
 * Syncs Decap CMS markdown files → src/data/*.js
 *
 * Run after Decap commits new content:  npm run cms:sync
 *
 * Reads:  src/cms-content/books/*.md      → src/data/books.js
 *         src/cms-content/100days/*.md    → src/data/100DaysToOffload.js
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
      // Parse frontmatter between --- delimiters
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return null;
      return YAML.parse(match[1]);
    })
    .filter(Boolean);
}

function writeJsFile(filePath, varName, data, header = '') {
  const json = JSON.stringify(data, null, 2);
  const content = `${header ? `${header}\n` : ''}const ${varName} = ${json};\n\nexport default ${varName};\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ Written: ${path.relative(ROOT, filePath)} (${data.length} entries)`);
}

// ── sync books ────────────────────────────────────────────────────────────────

function syncBooks() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/books'));
  if (entries.length === 0) {
    console.log('  – No books markdown files found. Skipping.');
    return;
  }
  const sorted = entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  writeJsFile(
    path.join(ROOT, 'src/data/books.js'),
    'books',
    sorted,
    '/* eslint-disable max-len */'
  );
}

// ── sync 100 days ─────────────────────────────────────────────────────────────

function syncHundredDays() {
  const entries = readMarkdownFiles(path.join(ROOT, 'src/cms-content/100days'));
  if (entries.length === 0) {
    console.log('  – No 100days markdown files found. Skipping.');
    return;
  }
  const sorted = entries.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  writeJsFile(
    path.join(ROOT, 'src/data/100DaysToOffload.js'),
    'blogs',
    sorted,
    '/* eslint-disable max-len */'
  );
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('\nCMS Sync: markdown → JS data files\n');
syncBooks();
syncHundredDays();
console.log('\nDone. Commit the updated data files and push to redeploy.\n');
