const BASE_URL = "https://daredavil.pages.dev";
const DEFAULT_IMAGE = `${BASE_URL}/images/logo.png`;

const PAGE_META = {
  "/": {
    title: "Sanket Tambare",
    description:
      "Sanket Tambare's personal portfolio hub. Software engineer, marathoner, and digital curator.",
    image: DEFAULT_IMAGE,
  },
  "/about": {
    title: "About | Sanket Tambare",
    description:
      "Full-stack software engineer, marathoner, and digital thinker. Read about Sanket Tambare's background, interests, and what drives him.",
    image: `${BASE_URL}/images/me.jpg`,
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
    image: `${BASE_URL}/images/me.jpg`,
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

class MetaRewriter {
  constructor(meta, canonicalUrl) {
    this.meta = meta;
    this.canonicalUrl = canonicalUrl;
    this.titleDone = false;
  }

  element(element) {
    const tag = element.tagName;

    if (tag === "title" && !this.titleDone) {
      element.setInnerContent(this.meta.title);
      this.titleDone = true;
      return;
    }

    const property = element.getAttribute("property");
    const name = element.getAttribute("name");

    if (property === "og:title" || name === "twitter:title") {
      element.setAttribute("content", this.meta.title);
    } else if (
      property === "og:description" ||
      name === "twitter:description" ||
      name === "description"
    ) {
      element.setAttribute("content", this.meta.description);
    } else if (property === "og:image" || name === "twitter:image") {
      element.setAttribute("content", this.meta.image);
    } else if (property === "og:url") {
      element.setAttribute("content", this.canonicalUrl);
    }
  }
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  // Only process HTML navigation requests
  const acceptHeader = request.headers.get("Accept") || "";
  if (!acceptHeader.includes("text/html")) {
    return next();
  }

  const meta = PAGE_META[pathname];
  if (!meta) {
    return next();
  }

  const canonicalUrl = `${BASE_URL}${pathname === "/" ? "" : pathname}`;
  const response = await next();

  // Only rewrite HTML responses
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const rewriter = new MetaRewriter(meta, canonicalUrl);
  return new HTMLRewriter()
    .on("title", rewriter)
    .on("meta[name='description']", rewriter)
    .on("meta[property^='og:']", rewriter)
    .on("meta[name^='twitter:']", rewriter)
    .transform(response);
}
