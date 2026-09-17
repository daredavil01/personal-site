// Parses the route table out of `src/App.js` source text.
//
// Pure and import-free, so all three consumers can share exactly one
// implementation of "what routes does this app have":
//   - src/data/routeManifest.test.js  (Jest, no network — the CI guard)
//   - scripts/lib/routes.mjs          (adds the file read)
//   - scripts/build-docs.mjs          (renders docs/routes.md)
//
// They used to be able to disagree, which is how docs/routes.md fell behind.

const ROUTE_RE = /<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g;

export function scrapeRoutes(appSource) {
  return [...String(appSource).matchAll(ROUTE_RE)].map(([, route, component]) => ({ route, component }));
}

export default scrapeRoutes;
