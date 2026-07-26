import books from "../../lib/api/books";
import sports from "../../lib/api/sports";
import treks from "../../lib/api/treks";
import projects from "../../lib/api/projects";
import blogs from "../../lib/api/blogs";
import instagram from "../../lib/api/instagram";
import {
  positions, degrees, certifications, skills,
} from "../../lib/api/resume";

// Schema-driven CRUD config. `api` is a resource from lib/api/_crud (list /
// create / update / remove). `title` derives a list-row label. `fields` drive
// the generic form; field `name`s match the shape the api's toRow expects.
const resources = [
  {
    key: "books",
    label: "Books",
    api: books,
    title: (r) => r.title,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "author", label: "Author", type: "text", required: true },
      { name: "category", label: "Category", type: "text", required: true },
      {
        name: "language", label: "Language", type: "select", options: ["English", "Marathi"], required: true,
      },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "year", label: "Year", type: "number", required: true },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "translator", label: "Translator" },
      { name: "blog_link", label: "Review link", type: "url" },
      { name: "blog_platform", label: "Review platform" },
    ],
  },
  {
    key: "sports",
    label: "Sports / Races",
    api: sports,
    title: (r) => r.title,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "place", label: "Place", type: "text", required: true },
      {
        name: "distance",
        label: "Distance",
        type: "selectOrOther",
        options: ["10 Kms", "21 Kms", "35 Kms", "42 Kms", "50 Kms"],
        required: true,
      },
      { name: "time", label: "Finish time", type: "text", required: true },
      { name: "timeCertificateLink", label: "Certificate link", type: "url" },
      { name: "bibNumber", label: "Bib number" },
      { name: "slideImages", label: "Images", type: "slideImages" },
    ],
  },
  {
    key: "treks",
    label: "Treks",
    api: treks,
    title: (r) => r.fort_name,
    fields: [
      { name: "fort_name", label: "Fort / location", type: "text", required: true },
      { name: "trek_time", label: "Duration", type: "text", required: true },
      {
        name: "endurance_level", label: "Endurance", type: "select", options: ["Easy", "Medium", "Hard"], required: true,
      },
      { name: "date", label: "Date (DD-MM-YYYY)", type: "text", required: true },
      { name: "blog_link", label: "Blog link", type: "url" },
      { name: "slideImages", label: "Images", type: "slideImages" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    api: projects,
    title: (r) => r.title,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "subtitle", label: "Subtitle" },
      { name: "link", label: "Link", type: "url", required: true },
      { name: "image", label: "Image", type: "image", required: true },
      { name: "date", label: "Date", type: "text", required: true },
      { name: "desc", label: "Description", type: "textarea", required: true },
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
  },
  {
    key: "blogs",
    label: "100 Days (Blogs)",
    api: blogs,
    title: (r) => r.blog_title,
    fields: [
      { name: "blog_title", label: "Title", type: "text", required: true },
      { name: "blog_description", label: "Description", type: "textarea", required: true },
      { name: "blog_date", label: "Date (YYYY-MM-DD)", type: "text", required: true },
      { name: "blog_link", label: "Link", type: "url", required: true },
      { name: "blog_platform", label: "Platform", type: "text", required: true },
      {
        name: "language", label: "Language", type: "select", options: ["English", "Marathi"], required: true,
      },
      { name: "blog_tags", label: "Tags", type: "tags" },
      { name: "challenge_id", label: "Challenge id" },
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    api: instagram,
    title: (r) => r.title,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "caption", label: "Caption", type: "textarea", required: true },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "slideImages", label: "Images", type: "slideImages" },
    ],
  },
  {
    key: "resume_positions",
    label: "Resume · Experience",
    api: positions,
    title: (r) => `${r.position} — ${r.company}`,
    fields: [
      { name: "company", label: "Company", type: "text", required: true },
      { name: "position", label: "Position", type: "text", required: true },
      { name: "link", label: "Link", type: "url", required: true },
      { name: "daterange", label: "Date range", type: "text", required: true },
      { name: "points", label: "Bullet points", type: "stringList" },
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
  },
  {
    key: "resume_degrees",
    label: "Resume · Education",
    api: degrees,
    title: (r) => r.school,
    fields: [
      { name: "school", label: "School", type: "text", required: true },
      { name: "degree", label: "Degree", type: "text", required: true },
      { name: "link", label: "Link", type: "url", required: true },
      { name: "year", label: "Year", type: "number", required: true },
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
  },
  {
    key: "resume_certifications",
    label: "Resume · Certifications",
    api: certifications,
    title: (r) => r.name,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "link", label: "Link", type: "url", required: true },
      { name: "source", label: "Source", type: "text", required: true },
      { name: "issuedDate", label: "Issued date", type: "text", required: true },
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
  },
  {
    key: "resume_skills",
    label: "Resume · Skills",
    api: skills,
    title: (r) => r.title,
    fields: [
      { name: "title", label: "Skill", type: "text", required: true },
      { name: "competency", label: "Competency (1-5)", type: "number", required: true },
      { name: "category", label: "Categories", type: "tags" },
      { name: "sortOrder", label: "Sort order", type: "number" },
    ],
  },
  // `now_months` is not here: its `sections` blob needs per-section forms, so it
  // has a dedicated editor (src/pages/admin/now/NowMonthEditor.js) wired as a
  // Dashboard tab instead of a generic resource.
];

export default resources;
