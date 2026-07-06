// Content-aware site-tour definitions. `getTourSteps(pathname, { isMobile })`
// returns the ordered step list for whatever page the visitor is on. The
// homepage gets a full menu + highlights walkthrough; every other page gets a
// tour tailored to that page's content. TourGuide filters out any step whose
// target isn't currently visible, so partially-loaded pages degrade gracefully.

// Per-page blurbs for the homepage's menu walkthrough (desktop only).
const NAV_BLURBS = {
  "/about": { title: "About", content: "Who I am — my story, my interests, and what drives me." },
  "/now": {
    title: "Now",
    content: "A monthly life log: what I'm running, reading, building and thinking about right now.",
  },
  "/challenges": {
    title: "Challenges",
    content: "Ongoing personal challenges, like the #100DaysToOffload blogging streak.",
  },
  "/books": {
    title: "Books",
    content: "My digital library — 100+ books with reviews, ratings and reading stats.",
  },
  "/micro-blog": {
    title: "Micro Blog",
    content: "Short-form thoughts — a searchable archive of years of micro posts.",
  },
  "/resume": {
    title: "Resume",
    content: "My professional background: engineering roles, education and certifications.",
  },
  "/stats": {
    title: "Stats",
    content: "A data-driven snapshot of everything: kilometers run, books read, code written.",
  },
  "/sports": {
    title: "Sports",
    content: "Every marathon and race — results, bib numbers, photos and personal bests.",
  },
  "/treks": {
    title: "Treks",
    content: "Sahyadri fort treks with difficulty levels, timings and photo slideshows.",
  },
};

const welcomeStep = (title, content) => ({
  id: "welcome",
  target: "body",
  placement: "center",
  title,
  content,
});

// Menu-location steps: one for desktop (top nav) and one for mobile (hamburger).
// TourGuide keeps whichever is actually visible at the current breakpoint.
const menuSteps = (navTarget) => {
  const steps = [
    {
      id: "menu-mobile",
      target: '[data-tour="hamburger"]',
      placement: "bottom",
      title: "Find Your Way Around",
      content: "On mobile, every page of the site lives one tap away inside this menu.",
    },
  ];
  if (navTarget === "nav-more") {
    steps.push({
      id: "menu-desktop",
      target: '[data-tour="nav-more"]',
      placement: "bottom",
      title: "Under the More Menu",
      content: "This page lives under “More” in the top navigation, alongside a few others.",
    });
  } else if (navTarget) {
    steps.push({
      id: "menu-desktop",
      target: `[data-tour="${navTarget}"]`,
      placement: "bottom",
      title: "Menu Location",
      content: "Here's where this page sits in the top navigation — jump between sections anytime.",
    });
  }
  return steps;
};

// Global closing steps — the floating controls exist on every page.
const closingSteps = [
  {
    id: "theme",
    target: '[data-tour="theme-toggle"]',
    placement: "left",
    title: "Make Yourself at Home",
    content: "Prefer the dark? Switch between light and dark mode anytime.",
  },
  {
    id: "finish",
    target: '[data-tour="tour-button"]',
    placement: "left",
    title: "You're All Set",
    content: "Replay this tour on any page from this button. Enjoy exploring!",
  },
];

// ── Homepage: full menu + highlights walkthrough ────────────────────────────
const homepageSteps = ({ isMobile, setForcedMoreOpen }) => {
  const highlights = [
    {
      id: "globe",
      target: '[data-tour="globe"]',
      placement: "top",
      title: "My World",
      content:
        "An interactive globe of everything I do — six worlds of races, treks, books, posts and projects. Drag to spin it, click any pin for the story.",
    },
    {
      id: "stats",
      target: '[data-tour="stats"]',
      placement: "top",
      title: "Life in Numbers",
      content: "Live counters of the things I track — races run, books read, posts written.",
    },
    {
      id: "explore",
      target: '[data-tour="explore"]',
      placement: "top",
      title: "Explore Everything",
      content: "Every section of the site as a card, with a short description of what lives inside.",
    },
  ];

  if (isMobile) {
    return [
      welcomeStep(
        "Welcome to my Digital Hub",
        "Part portfolio, part life archive. Let me show you around in under a minute.",
      ),
      {
        id: "hamburger",
        target: '[data-tour="hamburger"]',
        placement: "bottom",
        title: "All Pages Live Here",
        content:
          "About, Now, Books, Sports, Treks, my Resume and more — every page is one tap away in this menu.",
      },
      ...highlights,
      ...closingSteps,
    ];
  }

  const navSteps = Object.entries(NAV_BLURBS).map(([path, blurb]) => ({
    id: `nav-${path.slice(1)}`,
    target: `[data-tour="nav-${path.slice(1)}"]`,
    placement: "bottom",
    ...blurb,
  }));

  return [
    welcomeStep(
      "Welcome to my Digital Hub",
      "Part portfolio, part life archive. Let me walk you through the menu and the homepage in under a minute.",
    ),
    ...navSteps,
    {
      id: "nav-more",
      target: '[data-tour="nav-more"]',
      placement: "bottom",
      title: "And There's More",
      content:
        "My Instagram archive, project showcase, interactive Mind Map, contact page and the changelog all live under this menu.",
      before: () => setForcedMoreOpen(true),
      after: () => setForcedMoreOpen(false),
    },
    ...highlights,
    ...closingSteps,
  ];
};

// ── Per-page content tours ──────────────────────────────────────────────────
// Each entry: welcome copy, the nav anchor for the "menu location" step, and
// the page-specific content steps (targets are data-tour anchors on the page).
const PAGE_TOURS = {
  "/about": {
    welcome: ["About Me", "A quick look at who I am and what this page covers."],
    nav: "nav-about",
    steps: [
      {
        target: "#main",
        placement: "top",
        title: "My Story",
        content:
          "A personal introduction, plus live counters of my races, treks, books and posts — and quick links into each.",
      },
    ],
  },
  "/now": {
    welcome: ["The Now Page", "What I'm focused on this month — and how to browse past months."],
    nav: "nav-now",
    steps: [
      {
        target: '[data-tour="now-hero"]',
        placement: "bottom",
        title: "Right Now",
        content: "A month-by-month snapshot of what I'm running, reading, writing and building.",
      },
      {
        target: '[data-tour="now-timeline"]',
        placement: "top",
        title: "Travel Through Time",
        content: "Pick any month from the timeline to see what that month held.",
      },
    ],
  },
  "/challenges": {
    welcome: ["Challenges", "My public accountability ledger for personal challenges."],
    nav: "nav-challenges",
    steps: [
      {
        target: '[data-tour="challenges-active"]',
        placement: "top",
        title: "Active Challenges",
        content: "Live challenges I'm holding myself to — tap one to dive into its full tracker.",
      },
    ],
  },
  "/100-days-to-offload": {
    welcome: ["100 Days To Offload", "Can I publish 100 blog posts in a year? Let's see the progress."],
    nav: "nav-challenges",
    steps: [
      {
        target: '[data-tour="offload-progress"]',
        placement: "top",
        title: "Progress & Pace",
        content: "How far along I am toward 100 posts — and whether I'm ahead of or behind pace.",
      },
      {
        target: '[data-tour="offload-calendar"]',
        placement: "top",
        title: "Progress Map",
        content: "Every day of the year — click a filled square to open the post published that day.",
      },
      {
        target: '[data-tour="offload-explore"]',
        placement: "top",
        title: "Explore Every Post",
        content: "Search and filter all posts by keyword, platform, tag or month.",
      },
    ],
  },
  "/books": {
    welcome: ["Digital Library", "My reading journey — reviews, ratings and 100+ books."],
    nav: "nav-books",
    steps: [
      {
        target: '[data-tour="books-featured"]',
        placement: "bottom",
        title: "Featured Review",
        content: "A spotlighted book review — shuffle it for a fresh recommendation.",
      },
      {
        target: "#main",
        placement: "top",
        title: "Browse & Filter",
        content: "Search the whole library and filter by tag, language, or whether I've reviewed it.",
      },
    ],
  },
  "/micro-blog": {
    welcome: ["Micro Blog", "Years of short posts and quotes — fully searchable."],
    nav: "nav-micro-blog",
    steps: [
      {
        target: '[data-tour="micro-tabs"]',
        placement: "bottom",
        title: "Posts & Stats",
        content: "Switch between the post archive and an aggregate stats view of everything.",
      },
      {
        target: '[data-tour="micro-search"]',
        placement: "top",
        title: "Search & Filter",
        content: "Full-text search plus filters by source, type, tag and sort order.",
      },
    ],
  },
  "/resume": {
    welcome: ["Technical Arsenal", "My skills, experience, education and certifications."],
    nav: "nav-resume",
    steps: [
      {
        target: '[data-tour="resume-focus"]',
        placement: "bottom",
        title: "Focus Area",
        content: "What I specialise in today, followed by my full skill set and work history below.",
      },
    ],
  },
  "/stats": {
    welcome: ["Metrics of Intent", "A quantitative deep-dive across everything I track."],
    nav: "nav-stats",
    steps: [
      {
        target: '[data-tour="stats-grid"]',
        placement: "top",
        title: "The Bento Grid",
        content:
          "Reading velocity, endurance, treks, writing themes and more — each card a different slice of the data.",
      },
    ],
  },
  "/sports": {
    welcome: ["Physical Endurance", "Every race I've run, three ways to explore them."],
    nav: "nav-sports",
    steps: [
      {
        target: '[data-tour="sports-views"]',
        placement: "bottom",
        title: "Three Views",
        content:
          "Statistics for the numbers, Interactive for a visual timeline, or the Default list of every race.",
      },
      {
        target: '[data-tour="sports-share"]',
        placement: "left",
        title: "Share It",
        content: "Copy a link to whatever view you're on to share it with someone.",
      },
    ],
  },
  "/treks": {
    welcome: ["My Treks", "Fort and mountain treks across Maharashtra."],
    nav: "nav-treks",
    steps: [
      {
        target: '[data-tour="treks-views"]',
        placement: "bottom",
        title: "Two Views",
        content: "See the aggregate statistics, or browse the full log of every trek with photos.",
      },
    ],
  },
  "/projects": {
    welcome: ["Curated Works", "A gallery of the projects I've built."],
    nav: "nav-more",
    steps: [
      {
        target: "#main",
        placement: "top",
        title: "The Exhibit",
        content: "Each project is treated as a singular exhibit — scroll through the editorial gallery.",
      },
      {
        target: '[data-tour="projects-cta"]',
        placement: "top",
        title: "Got an Idea?",
        content: "Have a project in mind? There's a direct line to start the conversation.",
      },
    ],
  },
  "/instagram": {
    welcome: ["Visual Narrative", "A photo archive preserved after my Instagram was deleted."],
    nav: "nav-more",
    steps: [
      {
        target: '[data-tour="instagram-hero"]',
        placement: "bottom",
        title: "The Archive",
        content: "Captured moments and visual stories, kept alive here as scrollable posts.",
      },
    ],
  },
  "/interactive-me": {
    welcome: ["Interactive Me", "A visual, image-first timeline of races and treks."],
    nav: "nav-more",
    steps: [
      {
        target: '[data-tour="interactive-views"]',
        placement: "bottom",
        title: "Sports or Treks",
        content: "Flip between an auto-scrolling timeline of my races and one of my treks.",
      },
      {
        target: '[data-tour="interactive-controls"]',
        placement: "left",
        title: "Playback Controls",
        content: "Pause the auto-scroll or change its speed to take it in at your own pace.",
      },
    ],
  },
  "/mindmap": {
    welcome: ["Mind Map", "Everything on this site as one explorable map."],
    nav: "nav-more",
    steps: [
      {
        target: '[data-tour="mindmap-hero"]',
        placement: "bottom",
        title: "How It Works",
        content:
          "Click a category bubble to zoom in, drag to pan, and scroll or pinch to zoom. Click any bubble for details.",
      },
    ],
  },
  "/contact": {
    welcome: ["Get In Touch", "The best ways to reach me."],
    nav: "nav-more",
    steps: [
      {
        target: '[data-tour="contact-card"]',
        placement: "top",
        title: "Say Hello",
        content: "Drop me an email or find me on any of these social links — my inbox is always open.",
      },
    ],
  },
  "/changelog": {
    welcome: ["Changelog", "A transparent record of every change to this site."],
    nav: "nav-more",
    steps: [
      {
        target: '[data-tour="changelog-versions"]',
        placement: "bottom",
        title: "Jump by Version",
        content: "Skip to any release, or read the full version-by-version history below.",
      },
    ],
  },
};

const genericTour = (path) => ({
  welcome: ["Welcome", "Here's a quick look at this page."],
  nav: null,
  steps: [
    {
      target: "#main",
      placement: "top",
      title: "This Page",
      content: `Everything on ${path} is right here — have a look around.`,
    },
  ],
});

const getTourSteps = (rawPath, { isMobile, setForcedMoreOpen }) => {
  const path = (rawPath || "/").replace(/\/+$/, "") || "/";
  if (path === "/") return homepageSteps({ isMobile, setForcedMoreOpen });

  const tour = PAGE_TOURS[path] || genericTour(path);
  return [
    welcomeStep(tour.welcome[0], tour.welcome[1]),
    ...tour.steps.map((s, i) => ({ id: `page-${i}`, ...s })),
    ...menuSteps(tour.nav),
    ...closingSteps,
  ];
};

export default getTourSteps;
