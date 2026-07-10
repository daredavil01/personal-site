// The single flip bit for the Wanderer's Atlas redesign (v11.0.0).
// Now true: the atlas is the default shell for every visitor, and the old
// /world preview route redirects to /. Classic mode remains reachable through
// `?view=classic`, the passport's "Switch to Classic" kill switch, and
// prefers-reduced-motion — see the priority order in atlas/useViewMode.js.
// Setting this back to false restores the dark-build behaviour (classic by
// default, atlas only behind the preview flag).
// eslint-disable-next-line import/prefer-default-export -- flag registry, more flags may join
export const ATLAS_LIVE = true;
