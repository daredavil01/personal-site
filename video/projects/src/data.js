// Everything the film counts comes from the captured rows (scripts/capture.mjs).
// The purpose lines are copy, written from each row's problem and outcome.
import footage from "./footage.json";
import { T } from "./timeline";

export const PROJECTS = footage.projects;
export const CLIPS = footage.clips;
export const ASK = footage.ask;
export const FPS_REC = footage.fpsRec;

const byId = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));
const year = (p) => (p.date ? Number(p.date.slice(0, 4)) : null);
// "Astro 7" and "Astro" are one tool.
const toolKey = (t) => t.replace(/\s+\d+(\.\d+)*$/, "").toLowerCase();

const tools = new Map();
PROJECTS.forEach((p) => p.tech.forEach((t) => {
  const k = toolKey(t);
  tools.set(k, { name: t.replace(/\s+\d+(\.\d+)*$/, ""), n: (tools.get(k)?.n || 0) + 1 });
}));
export const TOOLS = [...tools.values()].sort((a, b) => b.n - a.n);

const tagCount = new Map();
PROJECTS.forEach((p) => p.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
export const TAGS = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));

const cats = new Map();
PROJECTS.forEach((p) => p.category && cats.set(p.category, (cats.get(p.category) || 0) + 1));
export const CATEGORIES = [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));

const years = PROJECTS.map(year).filter(Boolean);
export const STATS = {
  projects: PROJECTS.length,
  tools: TOOLS.length,
  from: Math.min(...years),
  to: Math.max(...years),
  orgs: new Set(PROJECTS.map((p) => p.org).filter(Boolean)).size,
  live: PROJECTS.filter((p) => p.status === "Live").length,
};

// The collage: newest first, so the latest work lands on top.
export const COVERS = PROJECTS.filter((p) => p.cover);

// A long path will not fit under the phone; the domain alone will.
const host = (u) => {
  const h = u.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "");
  return h.length > 34 ? h.split("/")[0] : h;
};

// The seven spotlights. `clips` play one after another in the device.
export const SPOTS = [
  {
    at: T.vtbm, until: T.ngo, chapter: "For a cause", accent: "#7ee081", ids: [23], clips: ["vtbm"],
    title: "Vetal Tekdi Birding Marathon",
    line: "A week of birding, turned into evidence to save Pune's last wild hill.",
  },
  {
    at: T.ngo, until: T.dividend, chapter: "For NGOs", accent: "#7ee081", ids: [6, 11, 9], clips: ["yung", "antyodaya", "nisarg"],
    title: "Sites for grassroots NGOs",
    line: "A voice for YUNG and Antyodaya — and a school portal that spots dropouts early.",
  },
  {
    at: T.dividend, until: T.feed, chapter: "For a question", accent: "#ffc857", ids: [18], clips: ["dividend"],
    title: "The Dividend Question",
    line: "India has the youth. Does it have the flourishing? Seven modules test the evidence.",
  },
  {
    at: T.feed, until: T.escape, chapter: "For a question", accent: "#ffc857", ids: [21, 22], clips: ["feed", "days"],
    title: "After the Feed · 45 Days",
    line: "What really happens after you leave social media — a story, then a page a day.",
  },
  {
    at: T.escape, until: T.runfolio, chapter: "For play", accent: "#ffc857", ids: [15], clips: ["escape"],
    title: "The Wanderer's Digital Escape",
    line: "A game about attention: every choice moves your focus, dopamine and calm.",
  },
  {
    at: T.runfolio, until: T.site, chapter: "For people", accent: "#5ee7ff", ids: [7], clips: ["runfolio"],
    title: "RunFolio",
    line: "Every finish line, worth framing — one link for a runner's whole history.",
  },
  {
    at: T.site, until: T.ask, chapter: "For people", accent: "#5ee7ff", ids: [2], clips: ["site"],
    title: "This website",
    line: "One home for everything I make — and it can answer questions about itself.",
  },
].map((s) => {
  const rows = s.ids.map((id) => byId[id]).filter(Boolean);
  const tech = [...new Set(rows.flatMap((r) => r.tech.map((t) => t.replace(/\s+\d+(\.\d+)*$/, ""))))].slice(0, 5);
  return {
    ...s,
    rows,
    tech,
    orgs: [...new Set(rows.map((r) => r.org).filter(Boolean))],
    url: host(rows[0]?.link || ""),
  };
});
