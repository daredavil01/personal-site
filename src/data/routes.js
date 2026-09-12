// The site map, and the single source for the top nav, the mobile drawer and
// the footer.
//
// Five top-level entries instead of ten-plus-a-More-bin. Seventeen flat links
// in a bar is not navigation, it is a list — nothing is findable because
// nothing is grouped. Each group below is a verb: what was I doing when this
// page happened.
//
// Conventions:
//   subRoutes   - children, shown as a dropdown on desktop and indented in the
//                 drawer. A group's own `path` is its most useful child, so
//                 clicking the parent always lands somewhere real.
//   external    - render as <a href>, not <Link>. Needed for anything served
//                 straight out of /public, which React Router cannot route to.
//   footerOnly  - kept out of the top bar; still in the footer and the mobile
//                 drawer.

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
    label: "Ask Me",
    path: "/ask",
  },
  {
    label: "Writing",
    path: "/micro-blog",
    subRoutes: [
      { label: "Micro Blog", path: "/micro-blog" },
      { label: "Challenges", path: "/challenges" },
      { label: "100 Days To Offload", path: "/100-days-to-offload" },
      { label: "Writing Ledger", path: "/writing-ledger.html", external: true },
      { label: "Tags", path: "/tags" },
    ],
  },
  {
    label: "Living",
    path: "/now",
    subRoutes: [
      { label: "Now", path: "/now" },
      { label: "Books", path: "/books" },
      { label: "Sports", path: "/sports" },
      { label: "Treks", path: "/treks" },
    ],
  },
  {
    label: "Work",
    path: "/projects",
    subRoutes: [
      { label: "Projects", path: "/projects" },
      { label: "Resume", path: "/resume" },
    ],
  },
  {
    label: "Play",
    path: "/interactive-me",
    subRoutes: [
      { label: "Interactive Me", path: "/interactive-me" },
      { label: "Mind Map", path: "/mindmap" },
      { label: "Instagram", path: "/instagram" },
      { label: "Stats", path: "/stats" },
    ],
  },
  {
    label: "More",
    path: "/contact",
    footerOnly: true,
    subRoutes: [
      { label: "Contact", path: "/contact" },
      { label: "Changelog", path: "/changelog" },
    ],
  },
];

export default routes;
