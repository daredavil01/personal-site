// The site map, and the single source for the top nav, the mobile drawer, the
// footer, the homepage's doors and the crawler fallback.
//
// Six top-level entries, each named for a part of a life rather than a kind of
// page: who (About), a way in (Ask), and four things done — writing, running
// and trekking, work, everything else. The pages about the site itself (the
// Blueprint, the changelog, the stats) are real but secondary, so they live in
// the footer instead of competing with the content for the bar.
//
// Conventions:
//   subRoutes   - children, shown as a dropdown on desktop and indented in the
//                 drawer. A group's own `path` is its most useful child, so
//                 clicking the parent always lands somewhere real.
//   external    - render as <a href>, not <Link>. Needed for anything served
//                 straight out of /public, which React Router cannot route to.
//   footerOnly  - kept out of the top bar; still in the footer and the mobile
//                 drawer.
//
// Each path appears once (llms.txt lists every page exactly once) and labels
// are unique (they are React keys in the drawer and footer).

const routes = [
  {
    index: true,
    label: "Sanket Tambare",
    path: "/",
  },
  {
    label: "About",
    path: "/about",
  },
  {
    label: "Ask",
    path: "/ask",
  },
  {
    label: "Writing",
    path: "/writing-ledger",
    subRoutes: [
      { label: "Writing Ledger", path: "/writing-ledger" },
      { label: "Wanderer's Logbook", path: "/logbook" },
      { label: "100 Days To Offload", path: "/100-days-to-offload" },
      { label: "Micro Blog", path: "/micro-blog" },
      { label: "Challenges", path: "/challenges" },
      { label: "Tags", path: "/tags" },
    ],
  },
  {
    label: "Running & Treks",
    path: "/sports",
    subRoutes: [
      { label: "Races", path: "/sports" },
      { label: "Training", path: "/training" },
      { label: "Treks", path: "/treks" },
    ],
  },
  {
    label: "Work",
    path: "/projects",
    subRoutes: [
      { label: "Projects", path: "/projects" },
      { label: "Presentations", path: "/presentations" },
      { label: "Resume", path: "/resume" },
    ],
  },
  {
    label: "Life",
    path: "/now",
    subRoutes: [
      { label: "Now", path: "/now" },
      { label: "Newsletter", path: "/newsletter" },
      { label: "Books", path: "/books" },
      { label: "Instagram", path: "/instagram" },
      { label: "Videos", path: "/videos" },
    ],
  },
  {
    label: "How this site works",
    path: "/blueprint",
    footerOnly: true,
    subRoutes: [
      { label: "Blueprint", path: "/blueprint" },
      { label: "Stats", path: "/stats" },
      { label: "Changelog", path: "/changelog" },
      { label: "Changelog Graph", path: "/changelog/graph" },
      { label: "Films", path: "/films" },
      { label: "Mind Map", path: "/mindmap" },
      { label: "Interactive Me", path: "/interactive-me" },
    ],
  },
  {
    label: "Contact",
    path: "/contact",
    footerOnly: true,
  },
];

export default routes;
