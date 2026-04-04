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
    label: "Now",
    path: "/now",
  },
  {
    label: "Challenges",
    path: "/challenges",
    subRoutes: [
      {
        label: "100 Days To Offload",
        path: "/100-days-to-offload",
      },
    ],
  },
  {
    label: "Books",
    path: "/books",
  },
  {
    label: "Instagram",
    path: "/instagram",
    dropdown: true,
  },
  {
    label: "Resume",
    path: "/resume"
  },
  {
    label: "Projects",
    path: "/projects",
    dropdown: true,
  },
  {
    label: "Stats",
    path: "/stats",
  },
  {
    label: "Sports",
    path: "/sports",
  },
  {
    label: "Treks",
    path: "/treks",
  },
  {
    label: "Contact",
    path: "/contact",
    dropdown: true,
  },
  {
    label: "Changelog",
    path: "/changelog",
    dropdown: true,
  },
];

export default routes;
