// The single flip bit for the Wanderer's Atlas redesign (v11.0.0).
// True: the atlas is fully live — it owns `/` as the map route and the old
// /world preview route redirects there. This is separate from which shell a
// visitor lands in by default; that is DEFAULT_VIEW below. Setting this back
// to false restores the dark-build behaviour (atlas only at /world, behind the
// preview flag).
export const ATLAS_LIVE = true;

// Which shell a visitor lands in when nothing else decides for them — no
// `?view=` param, no stored choice, no reduced-motion, no atlas preview flag.
// "classic" since v13.2.0: the atlas is still reachable through `?view=atlas`,
// the compass menu, and a stored preference — it is just no longer the front
// door. Set back to "atlas" to make the map the default again.
// See the full priority order in atlas/useViewMode.js.
export const DEFAULT_VIEW = "classic";
