// URL → route-manifest entry, the way React Router would match it.
//
// The edge needs to know what the SPA will do with a path before it answers:
// a path no route claims renders NotFound, and should arrive with a 404 rather
// than the 200 every unknown URL used to get. ROUTE_MANIFEST is already the
// declarative copy of src/App.js (its test asserts set equality), so matching
// against it here keeps the edge and the router in step without importing
// React.

import { ROUTE_MANIFEST } from "../../data/routeManifest";

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compile = (entry) => {
  const { path } = entry;
  if (path === "*") return null;
  // "/admin/*" — a splat claims the bare prefix too, as React Router's does.
  if (path.endsWith("/*")) {
    return { entry, rx: new RegExp(`^${escapeRx(path.slice(0, -2))}(?:/.*)?$`, "i"), names: [], splat: true };
  }
  const names = [];
  const body = path.split("/").map((seg) => {
    if (seg.startsWith(":")) {
      names.push(seg.slice(1));
      return "([^/]+)";
    }
    return escapeRx(seg);
  }).join("/");
  return { entry, rx: new RegExp(`^${body}$`, "i"), names, splat: false };
};

// Literal routes before parameterised ones, as React Router ranks them, so
// "/changelog/graph" is never read as a changelog id.
const COMPILED = ROUTE_MANIFEST
  .map(compile)
  .filter(Boolean)
  .sort((a, b) => Number(a.names.length > 0 || a.splat) - Number(b.names.length > 0 || b.splat));

/**
 * @returns {{ entry, params: Record<string,string>, canonicalPath: string } | null}
 * Matching is case-insensitive because React Router's is: "/About" renders the
 * About page, which made it a duplicate of "/about". `canonicalPath` is the
 * same URL with every fixed segment spelled as the manifest spells it, and the
 * parameters (tag names, share tokens — data) left exactly as they came.
 */
export function matchRoute(pathname) {
  const hit = COMPILED.find(({ rx }) => rx.test(pathname));
  if (!hit) return null;
  const { entry, rx, names, splat } = hit;
  const m = pathname.match(rx);
  const params = Object.fromEntries(names.map((n, i) => [n, m[i + 1]]));
  const canonicalPath = splat
    ? pathname
    : entry.path.split("/").map((seg) => (seg.startsWith(":") ? params[seg.slice(1)] : seg)).join("/");
  return { entry, params, canonicalPath };
}

export default matchRoute;
