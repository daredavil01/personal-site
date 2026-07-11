// Hand-maintained fallback counts for the atlas arrival (orbit) stage.
//
// The orbit is the very first thing a fresh visitor sees, so it has to paint
// instantly — even on a cold, slow mobile connection. Deriving the teaser
// counts from Supabase meant the arrival scene waited on five list fetches
// plus a microblog COUNT query before it could animate, which stalled that
// first paint on mobile networks. The orbit now reads these hardcoded numbers
// and makes NO network call; the live data still loads the moment the visitor
// enters the world (WorldMap / region pages), which is where accuracy matters.
//
// These only drive the fast-loading teaser, never the real pages, so they can
// drift a little without harm. Refresh them when a collection grows enough to
// notice. Last synced against Supabase on 2026-07-11.
const ATLAS_STATS = {
  races: 21,
  treks: 18,
  books: 48,
  microPosts: 1631,
};

export default ATLAS_STATS;
