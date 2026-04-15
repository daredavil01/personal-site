const BASE_URL = "https://daredavil.pages.dev";
const DEFAULT_IMAGE = `${BASE_URL}/images/logo.png`;
const PERSON_IMAGE = `${BASE_URL}/images/me.jpg`;

const PAGE_META = {
  "/": {
    title: "Sanket Tambare",
    description:
      "Sanket Tambare's personal portfolio hub. Software engineer, marathoner, and digital curator.",
    image: PERSON_IMAGE,
  },
  "/about": {
    title: "About | Sanket Tambare",
    description:
      "Full-stack software engineer, marathoner, and digital thinker. Read about Sanket Tambare's background, interests, and what drives him.",
    image: PERSON_IMAGE,
  },
  "/books": {
    title: "Books | Sanket Tambare",
    description:
      "An interactive catalog of 100+ books read, with reviews and ratings spanning design, philosophy, technology, and Marathi literature.",
    image: DEFAULT_IMAGE,
  },
  "/challenges": {
    title: "Challenges | Sanket Tambare",
    description:
      "Tracking personal challenges like #100DaysToOffload — a public commitment to consistent creative output, technical growth, and pushing personal limits.",
    image: DEFAULT_IMAGE,
  },
  "/changelog": {
    title: "Changelog | Sanket Tambare",
    description:
      "A transparent record of every meaningful change made to this website — features added, improvements shipped, and decisions documented.",
    image: DEFAULT_IMAGE,
  },
  "/contact": {
    title: "Contact | Sanket Tambare",
    description:
      "Get in touch with Sanket Tambare to discuss technology, endurance sports, or collaboration opportunities. Open to projects, research, and meaningful conversations.",
    image: DEFAULT_IMAGE,
  },
  "/instagram": {
    title: "Instagram | Sanket Tambare",
    description:
      "A curated visual archive of captured moments, textures, and stories — preserved from before the Instagram account was deleted.",
    image: DEFAULT_IMAGE,
  },
  "/now": {
    title: "Now | Sanket Tambare",
    description:
      "What Sanket Tambare is working on right now — current projects, daily rituals, books in progress, and ideas being explored. Updated monthly.",
    image: DEFAULT_IMAGE,
  },
  "/100-days-to-offload": {
    title: "100 Days To Offload | Sanket Tambare",
    description:
      "Following the #100DaysToOffload challenge — publishing 100 blog posts in a year, with progress tracking, tag cloud, platform breakdown, and full post history.",
    image: DEFAULT_IMAGE,
  },
  "/projects": {
    title: "Projects | Sanket Tambare",
    description:
      "Full-stack experiments and production apps — social platforms, AI-powered tools, and web applications built with modern tech stacks.",
    image: DEFAULT_IMAGE,
  },
  "/resume": {
    title: "Resume | Sanket Tambare",
    description:
      "Professional background of Sanket Tambare — full-stack engineer with experience in cloud infrastructure, AI integration, and enterprise software.",
    image: PERSON_IMAGE,
  },
  "/sports": {
    title: "Physical Endurance | Sanket Tambare",
    description:
      "Race logs, marathon results, and performance stats from 10K to Full Marathon — tracking every kilometer of the endurance journey from 2023 onwards.",
    image: DEFAULT_IMAGE,
  },
  "/stats": {
    title: "Stats | Sanket Tambare",
    description:
      "Metrics of Intent: A quantitative deep-dive into a year of technical growth, artistic captures, and consistent physical output.",
    image: DEFAULT_IMAGE,
  },
  "/treks": {
    title: "My Treks | Sanket Tambare",
    description:
      "Trek log across Maharashtra's historic forts and mountain trails — with statistics, difficulty breakdowns, yearly timelines, and detailed route stories.",
    image: DEFAULT_IMAGE,
  },
};

const DEFAULT_META = {
  title: "Sanket Tambare",
  description: "Sanket Tambare's personal website.",
  image: DEFAULT_IMAGE,
};

function escAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Updates the text content of the existing <title> element.
class TitleRewriter {
  constructor(title) {
    this.title = title;
  }
  element(element) {
    element.setInnerContent(this.title);
  }
}

// Appends all per-page meta/link tags at the end of <head>.
// index.html no longer carries static OG/Twitter/canonical tags (they were
// removed to prevent first-match conflicts with Helmet's client-side tags),
// so HTMLRewriter must INSERT rather than update.
class HeadInjector {
  constructor(html) {
    this.html = html;
    this.done = false;
  }
  element(element) {
    if (!this.done) {
      element.append(this.html, { html: true });
      this.done = true;
    }
  }
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  // Skip static asset requests (anything with a file extension).
  // Do not use the Accept header as a gate — scrapers commonly send
  // Accept: */* which does not contain "text/html" and would cause the
  // middleware to bail before injecting any metadata.
  const lastSegment = pathname.split("/").pop();
  if (lastSegment.includes(".")) {
    return next();
  }

  const response = await next();

  // Only rewrite HTML responses (definitive gate on the actual content type).
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const meta = PAGE_META[pathname] ?? DEFAULT_META;
  const canonicalUrl = `${BASE_URL}${pathname === "/" ? "" : pathname}`;

  const tags = `
    <link rel="canonical" href="${escAttr(canonicalUrl)}">
    <meta name="description" content="${escAttr(meta.description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escAttr(canonicalUrl)}">
    <meta property="og:title" content="${escAttr(meta.title)}">
    <meta property="og:description" content="${escAttr(meta.description)}">
    <meta property="og:image" content="${escAttr(meta.image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escAttr(meta.title)}">
    <meta name="twitter:description" content="${escAttr(meta.description)}">
    <meta name="twitter:image" content="${escAttr(meta.image)}">`;

  return new HTMLRewriter()
    .on("title", new TitleRewriter(meta.title))
    .on("head", new HeadInjector(tags))
    .transform(response);
}
