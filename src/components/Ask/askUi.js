// Labels shared by the launcher chat (AskChat) and the /ask page (AskStudio).

// Prefers one kind of content. The values are entity_type values in
// content_chunks. They no longer scope the search itself: the worker searches
// everything and re-ranks with these, then says so quietly when a chip found
// nothing and had to be ignored. A chip that hard-filtered the query returned
// eight books for "which forts has he trekked?".
export const TYPE_FILTERS = [
  { id: "book", label: "Books" },
  { id: "microblog", label: "Micro posts" },
  { id: "blog", label: "Blog" },
  { id: "project", label: "Projects" },
  { id: "sport", label: "Races" },
  { id: "trek", label: "Treks" },
  { id: "writing", label: "Essays" },
  { id: "resume", label: "Résumé" },
  { id: "stats", label: "Stats" },
];

// What the share control says while it is working. "Link copied" rather than
// "Shared", because on desktop that is literally what happened.
export const SHARE_LABELS = {
  sharing: "Sharing…",
  copied: "Link copied",
  shared: "Shared",
  manual: "Copy this link",
  error: "Could not share",
};
