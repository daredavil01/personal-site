// Field shapes for each Now-page month section, so the admin can edit them as
// forms instead of hand-written JSON. The source of truth for every field is
// the matching component in src/components/Now/ — keep them in sync.

export const SECTION_SPECS = [
  {
    key: "blogs",
    label: "Blogs",
    titleField: "title",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "url", label: "Link", type: "url" },
      { name: "description", label: "Description", type: "textarea", full: true },
      {
        name: "platform",
        label: "Platform",
        type: "select",
        options: ["Substack", "WordPress", "Blogger", "Medium", "Ghost", "Other"],
      },
      { name: "wip", label: "In progress", type: "boolean" },
    ],
  },
  {
    key: "micro",
    label: "Micro posts",
    titleField: "text",
    // Auto-filled rows also carry `id` (for the archive permalink) and
    // `imageUrl`; both are preserved on save but not edited here.
    fields: [
      { name: "text", label: "Text", type: "textarea", required: true, full: true },
      { name: "date", label: "Date", type: "isoDate" },
      {
        name: "postType", label: "Type", type: "select", options: ["text", "quote", "photo"],
      },
      { name: "title", label: "Title", type: "text" },
      { name: "tags", label: "Tags", type: "tags", full: true },
    ],
  },
  {
    key: "running",
    label: "Running & Marathons",
    titleField: "event",
    fields: [
      { name: "event", label: "Event", type: "text", required: true },
      { name: "date", label: "Date", type: "isoDate" },
      // NowRunningSection renders `{distance} km`, so store a bare number.
      { name: "distance", label: "Distance (km, number only)", type: "text" },
      { name: "time", label: "Finish time", type: "text" },
      { name: "note", label: "Note", type: "text" },
      { name: "link", label: "Link", type: "url" },
    ],
  },
  {
    key: "books",
    label: "Books",
    titleField: "title",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "author", label: "Author", type: "text" },
      { name: "link", label: "Review link", type: "url" },
    ],
  },
  {
    key: "events",
    label: "Events",
    titleField: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "date", label: "Date", type: "isoDate" },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "link", label: "Link", type: "url" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    titleField: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "url", label: "Link", type: "url" },
      { name: "description", label: "Description", type: "textarea", full: true },
    ],
  },
  {
    key: "certificates",
    label: "Certificates",
    titleField: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "org", label: "Issuer", type: "text" },
      { name: "link", label: "Link", type: "url" },
    ],
  },
];

// Sections stored as plain string arrays, edited one item per line.
export const LIST_SECTIONS = [
  { key: "website", label: "Website Updates", hint: "One update per line." },
  { key: "misc", label: "Misc", hint: "One item per line." },
];

// The two branded stat groups NowStatsSection styles by hand. Values are bare
// numbers — the component appends "km" / "hrs" / "m" itself.
export const STAT_PRESETS = [
  {
    key: "strava",
    label: "Strava",
    fields: [
      { name: "activities", label: "Activities" },
      { name: "km", label: "Distance (km)" },
      { name: "hours", label: "Time (hrs)" },
      { name: "elevationMeters", label: "Elevation (m)" },
    ],
  },
  {
    key: "substack",
    label: "Substack",
    fields: [
      { name: "views", label: "Views" },
      { name: "subscribers", label: "Subscribers" },
    ],
  },
];

const blank = (spec) => spec.fields.reduce((acc, f) => {
  if (f.type === "tags") acc[f.name] = [];
  else acc[f.name] = f.type === "boolean" ? false : "";
  return acc;
}, {});

export const blankRow = blank;

const isBlank = (v) => v === undefined || v === null || v === "" || v === false
  || (Array.isArray(v) && v.length === 0);

/** Numeric strings become numbers so the stored JSON keeps its historic shape. */
const coerce = (v) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
  return t;
};

const cleanRow = (row) => Object.entries(row || {}).reduce((acc, [k, v]) => {
  const value = typeof v === "string" ? v.trim() : v;
  if (!isBlank(value)) acc[k] = value;
  return acc;
}, {});

const cleanStatGroup = (group) => Object.entries(group || {}).reduce((acc, [k, v]) => {
  if (k === "approximate") {
    if (v) acc[k] = true;
    return acc;
  }
  const value = coerce(v);
  if (!isBlank(value)) acc[k] = value;
  return acc;
}, {});

// A stat group with only `approximate` set has no numbers to show.
const hasNumbers = (group) => Object.keys(group).some((k) => k !== "approximate");

/**
 * Strip blank rows / empty sections before saving, so MonthSection.js hides the
 * cards it gates on `.length > 0` (and, for stats, on plain truthiness).
 */
export function serializeSections(draft = {}) {
  const out = {};

  SECTION_SPECS.forEach(({ key, titleField }) => {
    const rows = (draft[key] || [])
      .map(cleanRow)
      .filter((row) => row[titleField]);
    if (rows.length) out[key] = rows;
  });

  LIST_SECTIONS.forEach(({ key }) => {
    const items = (draft[key] || [])
      .map((s) => (typeof s === "string" ? s.trim() : s))
      .filter(Boolean);
    if (items.length) out[key] = items;
  });

  const stats = {};
  STAT_PRESETS.forEach(({ key }) => {
    const group = cleanStatGroup(draft.stats?.[key]);
    if (hasNumbers(group)) stats[key] = group;
  });
  const custom = (draft.stats?.custom || [])
    .map((group) => ({
      label: (group.label || "").trim(),
      approximate: !!group.approximate,
      tiles: (group.tiles || [])
        .map((t) => ({
          label: (t.label || "").trim(),
          value: coerce(t.value),
          unit: (t.unit || "").trim(),
        }))
        .filter((t) => t.label && !isBlank(t.value))
        .map((t) => (t.unit ? t : { label: t.label, value: t.value })),
    }))
    .filter((group) => group.label && group.tiles.length)
    .map((group) => (group.approximate ? group : { label: group.label, tiles: group.tiles }));
  if (custom.length) stats.custom = custom;
  if (Object.keys(stats).length) out.stats = stats;

  return out;
}

export default SECTION_SPECS;
