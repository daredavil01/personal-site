// The single flip bit for the Wanderer's Atlas redesign (v11.0.0).
// While false, atlas mode is reachable only via the /world preview route,
// the `atlas.preview` localStorage flag it sets, or `?view=atlas`.
// Phase 15 ("the flip") sets this to true and redirects /world -> /.
// eslint-disable-next-line import/prefer-default-export -- flag registry, more flags may join
export const ATLAS_LIVE = false;
