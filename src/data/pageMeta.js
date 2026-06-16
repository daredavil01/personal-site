// Single source of truth for per-route meta tags (title / description / OG image).
// Consumed by BOTH:
//   - src/layouts/Main.js          (client-side <head> via react-helmet-async)
//   - functions/_middleware.js     (Cloudflare Pages Function for crawlers)
// The middleware is bundled with esbuild, so this module must stay
// dependency-free: no imports, no process.env, plain object literals only.

export const BASE_URL = "https://daredavil.pages.dev";
export const SITE_NAME = "Sanket Tambare";
export const DEFAULT_IMAGE = `${BASE_URL}/images/logo.png`;
export const PERSON_IMAGE = `${BASE_URL}/images/me.jpg`;

// `title` is the bare page title; consumers compose "<title> | Sanket Tambare".
// `title: null` means the route uses the site name alone (home page).
export const PAGE_META = {
  "/": {
    title: null,
    description:
      "Sanket Tambare's personal portfolio hub. Software engineer, marathoner, and digital curator.",
    image: PERSON_IMAGE,
  },
  "/about": {
    title: "About",
    description:
      "Full-stack software developer, ultra-marathoner, fort-trekker, and writer. Read about Sanket Tambare's background, interests, and what drives him.",
    image: PERSON_IMAGE,
  },
  "/books": {
    title: "Books",
    description:
      "An interactive catalog of 100+ books read, with reviews and ratings spanning design, philosophy, technology, and Marathi literature.",
    image: DEFAULT_IMAGE,
  },
  "/challenges": {
    title: "Challenges",
    description:
      "Tracking personal challenges like #100DaysToOffload — a public commitment to consistent creative output, technical growth, and pushing personal limits.",
    image: DEFAULT_IMAGE,
  },
  "/changelog": {
    title: "Changelog",
    description:
      "A transparent record of every meaningful change made to this website — features added, improvements shipped, and decisions documented.",
    image: DEFAULT_IMAGE,
  },
  "/contact": {
    title: "Contact",
    description:
      "Get in touch with Sanket Tambare to discuss technology, endurance sports, or collaboration opportunities. Open to projects, research, and meaningful conversations.",
    image: DEFAULT_IMAGE,
  },
  "/instagram": {
    title: "Instagram",
    description:
      "A curated visual archive of captured moments, textures, and stories — preserved from before the Instagram account was deleted.",
    image: DEFAULT_IMAGE,
  },
  "/interactive-me": {
    title: "Interactive Me",
    description:
      "A shuffled, image-first visual timeline of every marathon run and mountain trek — connected by curves and auto-scrolling through the moments.",
    image: DEFAULT_IMAGE,
  },
  "/micro-blog": {
    title: "Micro Blog",
    description:
      "A searchable archive of short posts, quotes, and captures imported from Tumblr — years of thoughts, one micro-post at a time.",
    image: DEFAULT_IMAGE,
  },
  "/mindmap": {
    title: "Mind Map",
    description:
      "An interactive mindmap of everything on Sanket's personal site — books, marathons, treks, projects, and blogs.",
    image: DEFAULT_IMAGE,
  },
  "/now": {
    title: "Now",
    description:
      "What Sanket Tambare is working on right now — current projects, daily rituals, books in progress, and ideas being explored. Updated monthly.",
    image: DEFAULT_IMAGE,
  },
  "/100-days-to-offload": {
    title: "100 Days To Offload",
    description:
      "Following the #100DaysToOffload challenge — publishing 100 blog posts in a year, with progress tracking, pace status, and interactive filtering of every post.",
    image: DEFAULT_IMAGE,
  },
  "/projects": {
    title: "Projects",
    description:
      "Full-stack experiments and production apps — social platforms, AI-powered tools, and web applications built with modern tech stacks.",
    image: DEFAULT_IMAGE,
  },
  "/resume": {
    title: "Resume",
    description:
      "Professional background of Sanket Tambare — full-stack engineer with experience in cloud infrastructure, AI integration, and enterprise software. Includes work history, education, and certifications.",
    image: PERSON_IMAGE,
  },
  "/sports": {
    title: "Physical Endurance",
    description:
      "Race logs, marathon results, and performance stats from 10K to Full Marathon — tracking every kilometer of the endurance journey from 2023 onwards.",
    image: DEFAULT_IMAGE,
  },
  "/stats": {
    title: "Stats",
    description:
      "Metrics of Intent: A quantitative deep-dive into a year of technical growth, artistic captures, and consistent physical output.",
    image: DEFAULT_IMAGE,
  },
  "/treks": {
    title: "My Treks",
    description:
      "Trek log across Maharashtra's historic forts and mountain trails — with statistics, difficulty breakdowns, yearly timelines, and detailed route stories.",
    image: DEFAULT_IMAGE,
  },
};

export const DEFAULT_META = {
  title: null,
  description: "Sanket Tambare's personal website.",
  image: DEFAULT_IMAGE,
};

// "About" -> "About | Sanket Tambare"; null -> "Sanket Tambare"
export function composeTitle(title) {
  return title ? `${title} | ${SITE_NAME}` : SITE_NAME;
}

// Build OG/Helmet meta for a single micro-blog post from its raw fields.
// Pure and import-free so both the client (src/pages/MicroBlogPost.js) and the
// esbuild-bundled Cloudflare middleware (functions/_middleware.js) can share it
// without the two layers drifting. Returns a BARE title — callers wrap it via
// composeTitle / Helmet's titleTemplate, matching the PAGE_META convention.
export function buildMicroblogMeta({ title, text, date, image } = {}) {
  const truncate = (str, max) => (str.length > max ? `${str.slice(0, max - 3)}…` : str);
  const raw = (text || title || "").replace(/\s+/g, " ").trim();
  const metaTitle = raw ? truncate(raw, 70) : `Post · ${date}`;
  const description = raw ? truncate(raw, 160) : "A micro-blog post.";
  return { title: metaTitle, description, image: image || DEFAULT_IMAGE };
}

// The helpers below mirror buildMicroblogMeta: pure, import-free, returning a
// bare { title, description, image } so the client detail pages and the
// esbuild-bundled middleware share ONE derivation per content type. Each caller
// extracts the item fields (client camelCase / REST snake_case) and resolves the
// image URL, then passes normalised primitives in.

export function buildTrekMeta({ fortName, enduranceLevel, trekTime, date, image } = {}) {
  return {
    title: `${fortName} Trek`,
    description: `A ${(enduranceLevel || "medium").toLowerCase()} endurance trek to ${fortName} fort on ${date}. Trek duration: ${trekTime}.`,
    image: image || DEFAULT_IMAGE,
  };
}

export function buildSportMeta({ title, distance, place, date, time, description, image } = {}) {
  return {
    title,
    description: description || `Participated in the ${distance} race at ${place} on ${date}. Finishing time: ${time}.`,
    image: image || DEFAULT_IMAGE,
  };
}

export function buildBookMeta({ title, author, description, image } = {}) {
  return {
    title: `${title} by ${author}`,
    description: description || `Read ${title} by ${author} — a review and analysis from Sanket Tambare's personal library.`,
    image: image || DEFAULT_IMAGE,
  };
}

export function buildBlogMeta({ title, description, image } = {}) {
  return {
    title,
    description: description || `A blog post from the 100 Days to Offload challenge: ${title}.`,
    image: image || DEFAULT_IMAGE,
  };
}

export function buildProjectMeta({ title, subtitle, description, image } = {}) {
  return {
    title,
    description: description || subtitle || `Detailed view of the project: ${title}.`,
    image: image || DEFAULT_IMAGE,
  };
}
