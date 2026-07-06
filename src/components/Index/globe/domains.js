// Shared definition of the six "worlds" shown on the homepage globe.
// Each domain anchors a pin spiral at (lat, lng), tints the terrain/atmosphere
// with `color`, cross-fades `bg` behind the globe, and links out to `path`.
export const DOMAINS = [
  {
    key: "marathons",
    type: "marathon",
    lat: 15,
    lng: 0,
    color: "#3b82f6",
    label: "Marathons",
    icon: "directions_run",
    bg: "bg-marathon.jpg",
    desc: "Every race I've run — from 5Ks to 50K ultras.",
    path: "/sports",
  },
  {
    key: "treks",
    type: "trek",
    lat: 15,
    lng: 60,
    color: "#22c55e",
    label: "Treks",
    icon: "landscape",
    bg: "bg-trek.jpg",
    desc: "Sahyadri forts and trails I've climbed.",
    path: "/treks",
  },
  {
    key: "writer",
    type: "blog",
    lat: 15,
    lng: 120,
    color: "#ec4899",
    label: "Writer",
    icon: "history_edu",
    bg: "bg-writer.jpg",
    desc: "Essays and posts from my writing challenges.",
    path: "/100-days-to-offload",
  },
  {
    key: "reader",
    type: "book",
    lat: 15,
    lng: 180,
    color: "#f97316",
    label: "Reader",
    icon: "auto_stories",
    bg: "bg-reader.jpg",
    desc: "Books that shaped how I think.",
    path: "/books",
  },
  {
    key: "creator",
    type: "project",
    lat: 15,
    lng: 240,
    color: "#a855f7",
    label: "Creator",
    icon: "code",
    bg: "bg-creator.jpg",
    desc: "Projects and technical experiments.",
    path: "/projects",
  },
  {
    key: "person",
    type: "feature",
    lat: 15,
    lng: 300,
    color: "#b22200",
    label: "Person",
    icon: "person",
    bg: "bg-person.jpg",
    desc: "Everything this site holds — start exploring here.",
    path: "/about",
  },
];

export const PIN_ICONS = {
  marathon: "directions_run",
  trek: "landscape",
  blog: "article",
  book: "auto_stories",
  project: "code",
  feature: "stars",
};

export const findDomainIndexByKey = (key) => DOMAINS.findIndex((d) => d.key === key);

// "#3b82f6" + 0.3 -> "rgba(59,130,246,0.3)"
export const hexToRgba = (hex, alpha) => {
  const v = parseInt(hex.slice(1), 16);
  /* eslint-disable no-bitwise */
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  /* eslint-enable no-bitwise */
  return `rgba(${r},${g},${b},${alpha})`;
};
