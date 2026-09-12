import React from "react";
import books, { BOOK_CATEGORIES, BOOK_FORMATS, BOOK_STATUSES } from "../../lib/api/books";
import sports from "../../lib/api/sports";
import treks from "../../lib/api/treks";
import projects from "../../lib/api/projects";
import blogs from "../../lib/api/blogs";
import instagram from "../../lib/api/instagram";
import {
  positions, degrees, certifications, skills,
} from "../../lib/api/resume";
import Badge from "./ui/Badge";

// Schema-driven CRUD config. `api` is a resource from lib/api/_crud (list /
// create / update / remove). `title` derives a list-row label. `fields` drive
// the generic form; field `name`s match the shape the api's toRow expects.
//
// The list view is driven by the same config:
//   columns     - what DataTable shows. `primary` titles the row on mobile;
//                 `render(row)` overrides the raw value.
//   searchKeys  - which fields the search box matches against.
//   viewPath    - the public URL for a row, for the "View on site" action.
//                 Omitted for resources with no detail page.
// Fields may carry `span: "full"` to take both columns of the editor grid;
// anything long (textareas, images, lists, JSON) should.

const tagList = (value) => {
  const tags = Array.isArray(value) ? value : [];
  if (!tags.length) return "—";
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.slice(0, 3).map((tag) => <Badge key={tag}>{tag}</Badge>)}
      {tags.length > 3 && <Badge tone="neutral">{`+${tags.length - 3}`}</Badge>}
    </span>
  );
};

const imageCount = (row) => {
  const n = Array.isArray(row.slideImages) ? row.slideImages.length : 0;
  return n ? `${n}` : "—";
};

const resources = [
  {
    key: "books",
    label: "Books",
    singular: "book",
    api: books,
    title: (r) => r.title,
    searchKeys: ["title", "author", "category", "tags", "publisher", "isbn"],
    viewPath: (r) => `/books/${r.id}`,
    columns: [
      { key: "title", label: "Title", sortable: true, primary: true },
      { key: "author", label: "Author", sortable: true },
      { key: "category", label: "Category", sortable: true, width: "11rem" },
      { key: "year", label: "Read", sortable: true, width: "5rem" },
      {
        key: "rating", label: "Rating", sortable: true, width: "6rem", render: (r) => (r.rating ? "★".repeat(r.rating) : "—"),
      },
      { key: "language", label: "Language", width: "7rem", render: (r) => <Badge>{r.language}</Badge> },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "author", label: "Author", type: "text", required: true },
      {
        name: "category", label: "Category", type: "select", options: BOOK_CATEGORIES, required: true,
      },
      {
        name: "language", label: "Language", type: "select", options: ["English", "Marathi"], required: true,
      },
      {
        name: "year", label: "Year read", type: "number", required: true, hint: "Not the publication year — that is First published",
      },
      { name: "date_finished", label: "Date finished", type: "isoDate" },
      {
        name: "date_precision",
        label: "Date precision",
        type: "select",
        options: ["year", "day"],
        hint: "Set to day once the finish date is a real one, not a seeded placeholder",
      },
      {
        name: "rating", label: "Rating", type: "number", hint: "1–5",
      },
      { name: "status", label: "Status", type: "select", options: BOOK_STATUSES },
      { name: "format", label: "Format", type: "select", options: BOOK_FORMATS },
      { name: "translator", label: "Translator" },
      { name: "publisher", label: "Publisher" },
      { name: "first_published", label: "First published", type: "number" },
      { name: "page_count", label: "Pages", type: "number" },
      { name: "isbn", label: "ISBN" },
      { name: "goodreads_url", label: "Goodreads link", type: "url" },
      { name: "blog_link", label: "Review link", type: "url" },
      { name: "blog_platform", label: "Review platform" },
      {
        name: "cover_url", label: "Cover", type: "image", span: "full", hint: "Full-size files are fine — they are compressed in the browser",
      },
      {
        name: "tags", label: "Tags", type: "tags", suggest: true, span: "full",
      },
      { name: "description", label: "Description", type: "textarea", required: true, span: "full" },
      {
        name: "quote", label: "Pull-quote", type: "textarea", span: "full", hint: "A line worth surfacing on the card",
      },
      {
        name: "note", label: "Personal note", type: "textarea", span: "full", hint: "Why this one mattered",
      },
    ],
  },
  {
    key: "sports",
    label: "Races",
    singular: "race",
    api: sports,
    title: (r) => r.title,
    searchKeys: ["title", "place", "distance", "bibNumber"],
    viewPath: (r) => `/sports/${r.id}`,
    columns: [
      { key: "title", label: "Race", sortable: true, primary: true },
      {
        key: "date",
        label: "Date",
        sortable: true,
        width: "9rem",
        sortValue: (r) => (r.date ? new Date(r.date).getTime() : null),
      },
      { key: "distance", label: "Distance", sortable: true, width: "7rem" },
      { key: "time", label: "Time", width: "6rem" },
      { key: "slideImages", label: "Photos", width: "5rem", render: imageCount },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "place", label: "Place", type: "text", required: true },
      {
        name: "distance",
        label: "Distance",
        type: "selectOrOther",
        options: ["10 Kms", "21 Kms", "35 Kms", "42 Kms", "50 Kms"],
        otherPlaceholder: "Enter custom distance",
        required: true,
      },
      { name: "time", label: "Finish time", type: "text", required: true, hint: "HH:MM:SS" },
      { name: "bibNumber", label: "Bib number" },
      { name: "timeCertificateLink", label: "Certificate link", type: "url", span: "full" },
      {
        name: "tags", label: "Tags", type: "tags", suggest: true, span: "full",
      },
      { name: "description", label: "Description", type: "textarea", required: true, span: "full" },
      { name: "slideImages", label: "Images", type: "slideImages", span: "full" },
    ],
  },
  {
    key: "treks",
    label: "Treks",
    singular: "trek",
    api: treks,
    title: (r) => r.fort_name,
    searchKeys: ["fort_name", "endurance_level", "trek_time"],
    viewPath: (r) => `/treks/${r.id}`,
    columns: [
      { key: "fort_name", label: "Fort / location", sortable: true, primary: true },
      {
        key: "date",
        label: "Date",
        sortable: true,
        width: "8rem",
        // Stored DD-MM-YYYY, which sorts as a string by day. Sort on the real date.
        sortValue: (r) => {
          const [d, m, y] = String(r.date || "").split("-");
          return y ? Number(y) * 10000 + Number(m) * 100 + Number(d) : null;
        },
      },
      { key: "trek_time", label: "Duration", width: "7rem" },
      { key: "endurance_level", label: "Endurance", sortable: true, width: "7rem", render: (r) => <Badge>{r.endurance_level}</Badge> },
      { key: "slideImages", label: "Photos", width: "5rem", render: imageCount },
    ],
    fields: [
      { name: "fort_name", label: "Fort / location", type: "text", required: true },
      { name: "date", label: "Date", type: "ddmmyyyy", required: true, hint: "Stored as DD-MM-YYYY" },
      { name: "trek_time", label: "Duration", type: "text", required: true, hint: "e.g. 2 Hrs" },
      {
        name: "endurance_level", label: "Endurance", type: "select", options: ["Easy", "Medium", "Hard"], required: true,
      },
      { name: "blog_link", label: "Blog link", type: "url", span: "full" },
      {
        name: "tags", label: "Tags", type: "tags", suggest: true, span: "full",
      },
      { name: "slideImages", label: "Images", type: "slideImages", span: "full" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    singular: "project",
    api: projects,
    title: (r) => r.title,
    searchKeys: ["title", "subtitle", "desc", "category", "org", "role"],
    viewPath: (r) => `/projects/${r.id}`,
    columns: [
      { key: "title", label: "Title", sortable: true, primary: true },
      { key: "featured", label: "★", width: "3rem", render: (r) => (r.featured ? "★" : "") },
      {
        key: "visible",
        label: "Live",
        sortable: true,
        width: "5rem",
        render: (r) => (r.visible ? "Visible" : <Badge>Hidden</Badge>),
      },
      {
        key: "date",
        label: "Date",
        sortable: true,
        width: "9rem",
        // Nullable now, and DataTable sinks null sort values — undated projects
        // land at the bottom rather than sorting as the empty string.
        sortValue: (r) => (r.date ? new Date(r.date).getTime() : null),
      },
      { key: "category", label: "Category", sortable: true, width: "8rem" },
      { key: "status", label: "Status", sortable: true, width: "7rem" },
      { key: "techStack", label: "Tech", render: (r) => tagList(r.techStack) },
      { key: "slideImages", label: "Shots", width: "5rem", render: imageCount },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "subtitle", label: "Subtitle" },
      { name: "date", label: "Date", type: "isoDate", hint: "Optional — stored as YYYY-MM-DD" },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: ["Web App", "Website", "Data Story", "Tool", "Design", "Other"],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["Live", "In Progress", "Archived", "Concept"],
      },
      { name: "role", label: "Role", hint: "e.g. Solo build, Frontend" },
      { name: "org", label: "Organization", hint: "e.g. YUNG Foundation — blank for personal" },
      { name: "featured", label: "Featured", type: "boolean", hint: "Pins it to the spotlight on /projects" },
      {
        name: "visible",
        label: "Visible",
        type: "boolean",
        default: true,
        hint: "Off = draft. Hidden projects are blocked by RLS, not just the UI",
      },
      { name: "link", label: "Primary link", type: "url", required: true, span: "full" },
      {
        name: "image",
        label: "Cover image",
        type: "image",
        span: "full",
        hint: "Optional — the first screenshot is used when this is empty",
      },
      {
        name: "techStack",
        label: "Tech stack",
        type: "tags",
        suggestFrom: "techStack",
        span: "full",
        hint: "React, Supabase, Tailwind… — suggestions come from tech you have already used",
      },
      {
        name: "tags", label: "Tags", type: "tags", suggest: true, span: "full", hint: "Topical tags, shared with /tags",
      },
      {
        name: "links",
        label: "Other links",
        type: "linkList",
        span: "full",
        hint: "GitHub repo, live demo, write-up…",
      },
      { name: "desc", label: "Description", type: "textarea", required: true, span: "full" },
      {
        name: "highlights",
        label: "Highlights",
        type: "stringList",
        span: "full",
        hint: "One outcome per line — shown as bullets on the card and detail page",
      },
      { name: "problem", label: "Problem", type: "textarea", span: "full" },
      { name: "solution", label: "Solution", type: "textarea", span: "full" },
      { name: "outcome", label: "Outcome", type: "textarea", span: "full" },
      { name: "slideImages", label: "Screenshots", type: "slideImages", span: "full" },
    ],
  },
  {
    key: "blogs",
    label: "100 Days",
    singular: "post",
    api: blogs,
    title: (r) => r.blog_title,
    searchKeys: ["blog_title", "blog_description", "blog_platform", "blog_tags"],
    viewPath: (r) => `/100-days-to-offload/${r.id}`,
    columns: [
      { key: "blog_title", label: "Title", sortable: true, primary: true },
      { key: "blog_date", label: "Date", sortable: true, width: "8rem" },
      { key: "blog_platform", label: "Platform", sortable: true, width: "8rem" },
      { key: "language", label: "Language", width: "7rem", render: (r) => <Badge>{r.language}</Badge> },
      { key: "blog_tags", label: "Tags", render: (r) => tagList(r.blog_tags) },
    ],
    fields: [
      { name: "blog_title", label: "Title", type: "text", required: true },
      { name: "blog_date", label: "Date", type: "isoDate", required: true, hint: "Stored as YYYY-MM-DD" },
      {
        name: "blog_platform",
        label: "Platform",
        type: "selectOrOther",
        options: ["Substack", "Medium", "Ghost", "WordPress"],
        otherPlaceholder: "Enter platform",
        required: true,
      },
      {
        name: "language", label: "Language", type: "select", options: ["English", "Marathi"], required: true,
      },
      { name: "challenge_id", label: "Challenge id", hint: "e.g. 100_days_to_offload" },
      { name: "blog_link", label: "Link", type: "url", required: true },
      {
        name: "blog_tags", label: "Tags", type: "tags", suggest: true, span: "full",
      },
      { name: "blog_description", label: "Description", type: "textarea", required: true, span: "full" },
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    singular: "post",
    api: instagram,
    title: (r) => r.title,
    searchKeys: ["title", "caption", "tags"],
    columns: [
      { key: "title", label: "Title", sortable: true, primary: true },
      { key: "caption", label: "Caption" },
      { key: "tags", label: "Tags", render: (r) => tagList(r.tags) },
      { key: "slideImages", label: "Photos", width: "5rem", render: imageCount },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "tags", label: "Tags", type: "tags", suggest: true,
      },
      { name: "caption", label: "Caption", type: "textarea", required: true, span: "full" },
      { name: "slideImages", label: "Images", type: "slideImages", span: "full" },
    ],
  },
  {
    key: "resume_positions",
    label: "Experience",
    singular: "position",
    api: positions,
    title: (r) => `${r.position} — ${r.company}`,
    searchKeys: ["company", "position", "daterange"],
    columns: [
      { key: "position", label: "Position", sortable: true, primary: true },
      { key: "company", label: "Company", sortable: true },
      { key: "daterange", label: "Dates", width: "12rem" },
      { key: "sortOrder", label: "Order", sortable: true, width: "5rem" },
    ],
    fields: [
      { name: "position", label: "Position", type: "text", required: true },
      { name: "company", label: "Company", type: "text", required: true },
      { name: "daterange", label: "Date range", type: "text", required: true },
      { name: "sortOrder", label: "Sort order", type: "number" },
      { name: "link", label: "Link", type: "url", required: true, span: "full" },
      { name: "points", label: "Bullet points", type: "stringList", span: "full" },
    ],
  },
  {
    key: "resume_degrees",
    label: "Education",
    singular: "degree",
    api: degrees,
    title: (r) => r.school,
    searchKeys: ["school", "degree"],
    columns: [
      { key: "school", label: "School", sortable: true, primary: true },
      { key: "degree", label: "Degree", sortable: true },
      { key: "year", label: "Year", sortable: true, width: "5rem" },
      { key: "sortOrder", label: "Order", sortable: true, width: "5rem" },
    ],
    fields: [
      { name: "school", label: "School", type: "text", required: true },
      { name: "degree", label: "Degree", type: "text", required: true },
      { name: "year", label: "Year", type: "number", required: true },
      { name: "sortOrder", label: "Sort order", type: "number" },
      { name: "link", label: "Link", type: "url", required: true, span: "full" },
    ],
  },
  {
    key: "resume_certifications",
    label: "Certifications",
    singular: "certification",
    api: certifications,
    title: (r) => r.name,
    searchKeys: ["name", "source"],
    columns: [
      { key: "name", label: "Name", sortable: true, primary: true },
      { key: "source", label: "Source", sortable: true },
      { key: "issuedDate", label: "Issued", width: "9rem" },
      { key: "sortOrder", label: "Order", sortable: true, width: "5rem" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "source", label: "Source", type: "text", required: true },
      { name: "issuedDate", label: "Issued date", type: "text", required: true },
      { name: "sortOrder", label: "Sort order", type: "number" },
      { name: "link", label: "Link", type: "url", required: true, span: "full" },
    ],
  },
  {
    key: "resume_skills",
    label: "Skills",
    singular: "skill",
    api: skills,
    title: (r) => r.title,
    searchKeys: ["title", "category"],
    columns: [
      { key: "title", label: "Skill", sortable: true, primary: true },
      { key: "competency", label: "Competency", sortable: true, width: "8rem" },
      { key: "category", label: "Categories", render: (r) => tagList(r.category) },
      { key: "sortOrder", label: "Order", sortable: true, width: "5rem" },
    ],
    fields: [
      { name: "title", label: "Skill", type: "text", required: true },
      {
        name: "competency", label: "Competency", type: "number", required: true, hint: "1–5", min: 1, max: 5,
      },
      { name: "sortOrder", label: "Sort order", type: "number" },
      { name: "category", label: "Categories", type: "tags", span: "full" },
    ],
  },
  // `now_months` is not here: its `sections` blob needs per-section forms, so it
  // has a dedicated editor (src/pages/admin/now/NowMonthEditor.js) wired as its
  // own route instead of a generic resource.
];

export const byKey = (key) => resources.find((r) => r.key === key);

export default resources;
