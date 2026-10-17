// Who this site is about, declared once.
//
// Search engines and AI assistants decide "who is Sanket Tambare" from the
// signals a page repeats: the Person JSON-LD the middleware injects, the bio in
// the crawler fallback, /llms.txt, agents.md and the About page. Those used to
// disagree with each other (Emtec vs Bridgenext, Pune vs Barshi), and an entity
// that contradicts itself is one a search engine will not commit to. Every one
// of them now reads this module, so a fact changes in one place.
//
// Import-free, like src/data/pageMeta.js: functions/_middleware.js and the
// Pages Functions bundle it with esbuild.

export const IDENTITY = {
  name: "Sanket Tambare",
  givenName: "Sanket",
  familyName: "Tambare",
  // Handles people actually search for; both appear on the profiles below.
  alternateName: ["daredavil", "i_daredavil"],
  jobTitle: "Software Engineer",
  worksFor: "Bridgenext",
  homeLocation: { locality: "Pune", region: "Maharashtra", country: "IN" },
  alumniOf: [
    { name: "Rajarambapu Institute of Technology", detail: "B.Tech, Computer Science (2021)" },
    { name: "The Takshashila Institution", detail: "Technology and Policy (2024)" },
  ],
  knowsAbout: [
    "Full-stack software development",
    "Data engineering",
    "DORA metrics",
    "AI governance",
    "Technology policy",
    "Marathon and ultramarathon running",
    "Trekking the forts of Maharashtra",
    "Marathi literature",
    "Digital well-being",
  ],
  // One paragraph, said the same way everywhere it appears. Counts are left out
  // on purpose: they go stale here, and /stats is where the live ones live.
  bio:
    "Sanket Tambare is a software engineer at Bridgenext in Pune, India, working on full-stack "
    + "development, data pipelines and DORA metrics. He studied computer science at the "
    + "Rajarambapu Institute of Technology, Sangli, and technology policy at the Takshashila "
    + "Institution, and was a fellow of its Network for Advanced Study of Technology Geopolitics "
    + "(NAST), working on AI governance. Outside work he is an endurance runner, from 10K races "
    + "to a 50K ultra, and a trekker who has climbed the historic forts of the Sahyadri. He reads "
    + "and writes in English and Marathi — essays on Substack and WordPress, a monthly "
    + "newsletter, book notes and more than a thousand short posts — and hosts Dare Write's, a podcast "
    + "on books, technology and travel. This site is his archive of all of it.",
  // Profiles that are this person. Every https link in src/data/contact.js must
  // appear here (src/data/identity.test.js); add a profile there and here.
  sameAs: [
    "https://github.com/daredavil01",
    "https://www.linkedin.com/in/sankettambare/",
    "https://twitter.com/i_daredavil",
    "https://sankettambare.substack.com",
    "https://daredavil453624413.wordpress.com",
    "https://linktr.ee/daredavil",
    "https://card.sankettambare.in/",
  ],
};

// "Pune, Maharashtra, India" — the one-line form for prose and llms.txt.
export const LOCATION_LABEL = `${IDENTITY.homeLocation.locality}, ${IDENTITY.homeLocation.region}, India`;

export default IDENTITY;
