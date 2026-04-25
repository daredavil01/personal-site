#!/usr/bin/env node
/**
 * Seeds src/cms-content/ from existing src/data/*.js files.
 * Run once to populate Decap CMS editors with existing data.
 * Usage: node scripts/seed-cms-content.js
 */
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const ROOT = path.resolve(__dirname, '..');

// ── Utilities ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeMd(filePath, frontmatter) {
  ensureDir(path.dirname(filePath));
  const yaml = YAML.stringify(frontmatter, { lineWidth: 0 }).trimEnd();
  fs.writeFileSync(filePath, `---\n${yaml}\n---\n`, 'utf8');
  console.log(`  ✓ ${path.relative(ROOT, filePath)}`);
}

function slugify(str) {
  const s = String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'entry';
}

/** Remove null/undefined values recursively so YAML stays clean. */
function omitNulls(obj) {
  if (Array.isArray(obj)) return obj.map(omitNulls);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, omitNulls(v)])
    );
  }
  return obj;
}

/**
 * Load an ES module data file in Node.js CJS context.
 * Transforms: export const, export default, export { }, ${PUBLIC_URL} literals.
 */
function loadESModule(relPath) {
  const absPath = path.join(ROOT, relPath);
  let src = fs.readFileSync(absPath, 'utf8');

  // Remove `const { PUBLIC_URL } = process.env;` and replace ${PUBLIC_URL} in template literals
  src = src.replace(/const\s*\{\s*PUBLIC_URL\s*\}\s*=\s*process\.env[^;]*;?\s*\n?/g, '');
  src = src.replace(/`\$\{PUBLIC_URL\}([^`]*)`/g, '"$1"');

  // Track `export const X =` → `const X =`, remember X for later
  const namedExports = [];
  src = src.replace(/\bexport const (\w+)\s*=/g, (_, name) => {
    namedExports.push(name);
    return `const ${name} =`;
  });

  // `export default X;` → `exports.default = X;`
  src = src.replace(/\bexport default (\w+);/g, 'exports.default = $1;');

  // `export { X, Y }` → `exports.X = X; exports.Y = Y;`
  src = src.replace(/\bexport\s*\{([^}]+)\}/g, (_, names) =>
    names.split(',').map(n => {
      const t = n.trim();
      return `exports.${t} = ${t};`;
    }).join('\n')
  );

  // Append named export assignments
  if (namedExports.length > 0) {
    src += '\n' + namedExports.map(n => `exports.${n} = ${n};`).join('\n');
  }

  const exportsObj = {};
  try {
    // new Function runs in global scope — has access to Array, Object, Set, Map, etc.
    // eslint-disable-next-line no-new-func
    const fn = new Function('exports', 'require', 'console', src);
    fn(exportsObj, require, console);
  } catch (e) {
    throw new Error(`Failed to load ${relPath}: ${e.message}\n${src.slice(0, 300)}`);
  }
  return exportsObj;
}

// ── Now ───────────────────────────────────────────────────────────────────────

function seedNowMeta() {
  const { nowMeta } = loadESModule('src/data/now-data.js');
  writeMd(path.join(ROOT, 'src/cms-content/now/meta.md'), omitNulls(nowMeta));
}

function seedNowMonths() {
  const { nowData } = loadESModule('src/data/now-data.js');
  const dir = path.join(ROOT, 'src/cms-content/now/months');
  for (const entry of nowData) {
    const { month, year, isCurrent, sections } = entry;
    // Flatten sections to top-level (CMS stores them without a `sections` wrapper)
    const frontmatter = { month, year, isCurrent: !!isCurrent, ...(sections || {}) };
    writeMd(path.join(dir, `${year}-${month}.md`), omitNulls(frontmatter));
  }
  console.log(`  ${nowData.length} months`);
}

// ── Books ─────────────────────────────────────────────────────────────────────

function seedBooks() {
  const { default: books } = loadESModule('src/data/books.js');
  const dir = path.join(ROOT, 'src/cms-content/books');
  for (const book of books) {
    const slug = `${book.id}-${slugify(book.title)}`;
    writeMd(path.join(dir, `${slug}.md`), omitNulls(book));
  }
  console.log(`  ${books.length} books`);
}

// ── 100 Days To Offload ───────────────────────────────────────────────────────

function seedHundredDays() {
  const { default: posts } = loadESModule('src/data/100DaysToOffload.js');
  const dir = path.join(ROOT, 'src/cms-content/100days');
  for (const post of posts) {
    const d = new Date(post.blog_date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const slug = `${year}-${month}-${day}-${slugify(post.blog_title)}`;
    writeMd(path.join(dir, `${slug}.md`), omitNulls(post));
  }
  console.log(`  ${posts.length} posts`);
}

// ── Sports ────────────────────────────────────────────────────────────────────

function seedSports() {
  const { default: sports } = loadESModule('src/data/sports.js');
  const dir = path.join(ROOT, 'src/cms-content/sports');
  for (const race of sports) {
    const slug = `${race.id}-${slugify(race.title)}`;
    writeMd(path.join(dir, `${slug}.md`), omitNulls(race));
  }
  console.log(`  ${sports.length} races`);
}

// ── Treks ─────────────────────────────────────────────────────────────────────

function seedTreks() {
  const { default: treks } = loadESModule('src/data/treks.js');
  const dir = path.join(ROOT, 'src/cms-content/treks');
  for (const trek of treks) {
    const slug = `${trek.id}-${slugify(trek.fort_name)}`;
    writeMd(path.join(dir, `${slug}.md`), omitNulls(trek));
  }
  console.log(`  ${treks.length} treks`);
}

// ── Projects ──────────────────────────────────────────────────────────────────

function seedProjects() {
  const { default: projects } = loadESModule('src/data/projects.js');
  const dir = path.join(ROOT, 'src/cms-content/projects');
  for (const project of projects) {
    // Normalize subTitle → subtitle (inconsistency in source data)
    const { subTitle, ...rest } = project;
    const normalized = { ...rest };
    if (subTitle && !normalized.subtitle) normalized.subtitle = subTitle;
    const slug = slugify(project.title);
    writeMd(path.join(dir, `${slug}.md`), omitNulls(normalized));
  }
  console.log(`  ${projects.length} projects`);
}

// ── Instagram ─────────────────────────────────────────────────────────────────

function seedInstagram() {
  const { default: posts } = loadESModule('src/data/instagram.js');
  const dir = path.join(ROOT, 'src/cms-content/instagram');
  posts.forEach((post, i) => {
    // Source data has no id — add sequential 1-based id
    const id = i + 1;
    const data = { id, ...post };
    const slug = `${id}-${slugify(post.title)}`;
    writeMd(path.join(dir, `${slug}.md`), omitNulls(data));
  });
  console.log(`  ${posts.length} posts`);
}

// ── Resume ────────────────────────────────────────────────────────────────────

function seedResumePositions() {
  const { default: positions } = loadESModule('src/data/resume/positions.js');
  const dir = path.join(ROOT, 'src/cms-content/resume/positions');
  for (const pos of positions) {
    writeMd(path.join(dir, `${slugify(pos.company)}.md`), omitNulls(pos));
  }
  console.log(`  ${positions.length} positions`);
}

function seedResumeDegrees() {
  const { default: degrees } = loadESModule('src/data/resume/degrees.js');
  const dir = path.join(ROOT, 'src/cms-content/resume/degrees');
  for (const deg of degrees) {
    writeMd(path.join(dir, `${slugify(deg.school)}.md`), omitNulls(deg));
  }
  console.log(`  ${degrees.length} degrees`);
}

function seedResumeSkills() {
  const { skills } = loadESModule('src/data/resume/skills.js');
  const dir = path.join(ROOT, 'src/cms-content/resume/skills');
  for (const skill of skills) {
    writeMd(path.join(dir, `${slugify(skill.title)}.md`), omitNulls(skill));
  }
  console.log(`  ${skills.length} skills`);
}

function seedResumeCertifications() {
  const { default: certs } = loadESModule('src/data/resume/certifications.js');
  const dir = path.join(ROOT, 'src/cms-content/resume/certifications');
  for (const cert of certs) {
    writeMd(path.join(dir, `${slugify(cert.name)}.md`), omitNulls(cert));
  }
  console.log(`  ${certs.length} certifications`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\nCMS Seed: src/data/*.js → src/cms-content/\n');

console.log('Now — Meta:');    seedNowMeta();
console.log('\nNow — Months:'); seedNowMonths();
console.log('\nBooks:');        seedBooks();
console.log('\n100 Days:');     seedHundredDays();
console.log('\nSports:');       seedSports();
console.log('\nTreks:');        seedTreks();
console.log('\nProjects:');     seedProjects();
console.log('\nInstagram:');    seedInstagram();
console.log('\nResume — Positions:');      seedResumePositions();
console.log('\nResume — Degrees:');        seedResumeDegrees();
console.log('\nResume — Skills:');         seedResumeSkills();
console.log('\nResume — Certifications:'); seedResumeCertifications();

console.log('\nDone. Commit src/cms-content/ and push to redeploy.\n');
