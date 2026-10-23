// Video titles as the film and the slides print them: YouTube titles on this
// channel carry "|| Sanket Tambare" and "#Shorts", which read as noise on a
// card. Shared by render.mjs and slides.mjs.

export const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);

export const cleanTitle = (s) => s.replace(/\|\|\s*Sanket Tambare/gi, "").replace(/#shorts/gi, "").replace(/\s*\|\|\s*/g, " · ")
  .replace(/\s+·\s*$/, "")
  .trim();
