// The globe's "feature" pins (GlobeShowcase): one per section of the site.
// The homepage itself shows the four doors below instead of this list.
const HOME_FEATURES = [
  {
    title: "About Me",
    desc: "I am a software developer specialized in full-stack development. My interests span technology, society, and marathons. I critically engage in new developments and aim to better myself every day.",
    path: "/about",
    icon: "person",
  },
  {
    title: "Now",
    desc: "What I'm doing lately: from developing AI-focused blogs and finishing the Tata Ultra 50K Marathon to publishing thoughts on our digital identities.",
    path: "/now",
    icon: "schedule",
  },
  {
    title: "Challenges",
    desc: "Tracking personal and professional hurdles like the '#100DaysToOffload' blogging challenge to maintain consistency and growth.",
    path: "/challenges",
    icon: "hotel_class",
  },
  {
    title: "Digital Library",
    desc: "An interactive catalog of my reading journey, featuring reviews and ratings for over 100 books that have shaped my perspective.",
    path: "/books",
    icon: "auto_stories",
  },
  {
    title: "Project Archive",
    desc: "A showcase of technical experiments and applications, including social platforms and management tools built with modern tech stacks.",
    path: "/projects",
    icon: "terminal",
  },
  {
    title: "Presentations",
    desc: "Talks, feature dossiers and data stories built as HTML slide decks — open any one and click through it right here.",
    path: "/presentations",
    icon: "co_present",
  },
  {
    title: "Videos",
    desc: "The YouTube channel in one place — long videos and Shorts, searchable and filterable by playlist, tag and year, playable right here.",
    path: "/videos",
    icon: "smart_display",
  },
  {
    title: "Sports Log",
    desc: "A record of my endurance journey, featuring marathon results, training logs, and personal bests from 10K to Full Marathons.",
    path: "/sports",
    icon: "fitness_center",
  },
  {
    title: "Interactive Me",
    desc: "A shuffled, image-first visual timeline of every marathon and mountain trek — cards connected by curves, auto-scrolling through the moments.",
    path: "/interactive-me",
    icon: "timeline",
  },
  {
    title: "Mind Map",
    desc: "Everything on this site visualised in one place — an interactive radial map of books, marathons, treks, projects, and blogs. Click any bubble to explore.",
    path: "/mindmap",
    icon: "account_tree",
  },
  {
    title: "The Blueprint",
    desc: "How this site is built, drawn as architectural sheets — a floor plan of every feature, a section through the stack, the Ask pipeline as a circuit you can switch off rung by rung.",
    path: "/blueprint",
    icon: "architecture",
  },
  {
    title: "Vital Stats",
    desc: "A data-driven snapshot of my activities: from the number of books read and kilometers run to the lines of code written.",
    path: "/stats",
    icon: "query_stats",
  },
  {
    title: "Visual Narrative",
    desc: "A curated archive of captured moments, textures, and digital stories, preserved from a time before my Instagram account was deleted.",
    path: "/instagram",
    icon: "photo_library",
  },
  {
    title: "Professional Resume",
    desc: "Explore my professional background, from full-stack engineering to my work with social organizations and geotechnological research.",
    path: "/resume",
    icon: "badge",
  },
  {
    title: "Get In Touch",
    desc: "Wanna discuss technology, society, or marathons? Reach out for collaborations, discussions, or just a friendly chat.",
    path: "/contact",
    icon: "alternate_email",
  },
];

// The homepage's four doors. Each opens onto one nav group from
// src/data/routes.js (`group` is that group's label), so the links under a door
// are always the nav's. `counts` read the /api/stats snapshot
// (src/lib/siteStats.js); a count with no value is left out, never shown as 0.
export const HOME_DOORS = [
  {
    title: "Writing",
    desc: "Essays in English and Marathi, a field journal of every one, and a decade of short posts.",
    path: "/writing-ledger",
    icon: "edit_note",
    group: "Writing",
    counts: [
      { value: (d) => d?.stats?.offloadCount, noun: "essays" },
      { value: (d) => d?.micro?.total, noun: "micro-posts" },
    ],
  },
  {
    title: "Running & Treks",
    desc: "Every race from 10K to a 50K ultra, the training behind them, and the Sahyadri forts on foot.",
    path: "/sports",
    icon: "directions_run",
    group: "Running & Treks",
    counts: [
      { value: (d) => d?.stats?.totalRaces, noun: "races" },
      { value: (d) => d?.stats?.totalTreks, noun: "treks" },
    ],
  },
  {
    title: "Work",
    desc: "Software I have built and shipped, the talks I have given, and the one-page resume.",
    path: "/projects",
    icon: "terminal",
    group: "Work",
    counts: [
      { value: (d) => d?.stats?.projectCount, noun: "projects" },
      { value: (d) => d?.stats?.presentationCount, noun: "talks" },
    ],
  },
  {
    title: "About & life",
    desc: "Who I am at four reading depths, what I am doing this month, and every book I have read.",
    path: "/about",
    icon: "person",
    group: "Life",
    counts: [
      { value: (d) => d?.stats?.booksCount, noun: "books" },
    ],
  },
];

export default HOME_FEATURES;
