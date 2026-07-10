// Region truth table (§4.8). Colors, routes and keys stay sourced from the
// globe domain table (§3 single source of truth); this adds the biome
// presentation each RegionShell needs — the header band art, the biome name,
// its tagline, the stamp id and the day/night token class.
//
// Headers land wave by wave (phases 5–10). Book Forest (reader) is the first;
// the others carry a null Header until their wave, and RegionShell falls back
// to a plain region banner for them.

import { lazy } from "react";
import { DOMAINS } from "../../components/Index/globe/domains";

const CoastHeader = lazy(() => import("./headers/CoastHeader"));
const RidgeHeader = lazy(() => import("./headers/RidgeHeader"));
const ScriptoriumHeader = lazy(() => import("./headers/ScriptoriumHeader"));
const ForestHeader = lazy(() => import("./headers/ForestHeader"));
const WorkshopHeader = lazy(() => import("./headers/WorkshopHeader"));
const SquareHeader = lazy(() => import("./headers/SquareHeader"));

// key -> presentation. `label` is the biome name (distinct from the globe
// domain label); `Header` is the lazy biome header band; `pages` is the
// ordered list of every content page inside the region (the first is the
// region's landing route, matching the map hotspot's target). `pages` is the
// single source of truth for atlas navigation — the compass menu and any
// in-region sub-nav render from it. `icon` values are Material Symbols names
// (the font the rest of the site already loads).
const PRESENTATION = {
  marathons: {
    label: "Coastal Road",
    tagline: "a winding shoreline of mile-markers and medals",
    Header: CoastHeader,
    pages: [
      { path: "/sports", label: "Race Log", icon: "directions_run" },
    ],
  },
  treks: {
    label: "Sahyadri Ridge",
    tagline: "fort-crowned summits, each a flag on the skyline",
    Header: RidgeHeader,
    pages: [
      { path: "/treks", label: "Trek Log", icon: "landscape" },
    ],
  },
  writer: {
    label: "Scriptorium",
    tagline: "the writer's desk — letters, posts and a pinboard",
    Header: ScriptoriumHeader,
    pages: [
      { path: "/100-days-to-offload", label: "100 Days to Offload", icon: "history_edu" },
      { path: "/challenges", label: "Challenges", icon: "flag" },
      { path: "/micro-blog", label: "Micro Blog", icon: "chat" },
    ],
  },
  reader: {
    label: "Book Forest",
    tagline: "shelves as tree rows, every book a leaf-card",
    Header: ForestHeader,
    pages: [
      { path: "/books", label: "Books", icon: "auto_stories" },
    ],
  },
  creator: {
    label: "Workshop",
    tagline: "drafting tables, blueprints and turning gears",
    Header: WorkshopHeader,
    pages: [
      { path: "/projects", label: "Projects", icon: "code" },
      { path: "/resume", label: "Résumé", icon: "badge" },
    ],
  },
  person: {
    label: "Hometown Square",
    tagline: "the personal center — home, now and everything else",
    Header: SquareHeader,
    pages: [
      { path: "/about", label: "About", icon: "home" },
      { path: "/now", label: "Now", icon: "schedule" },
      { path: "/instagram", label: "Instagram", icon: "photo_camera" },
      { path: "/stats", label: "Stats", icon: "monitoring" },
      { path: "/mindmap", label: "Observatory", icon: "hub" },
      { path: "/interactive-me", label: "Gallery Trail", icon: "collections" },
      { path: "/contact", label: "Contact", icon: "mail" },
      { path: "/changelog", label: "Changelog", icon: "history" },
    ],
  },
};

const byKey = Object.fromEntries(DOMAINS.map((d) => [d.key, d]));

export const REGIONS = Object.fromEntries(
  Object.entries(PRESENTATION).map(([key, p]) => {
    const domain = byKey[key];
    return [key, {
      key,
      label: p.label,
      tagline: p.tagline,
      color: domain.color,
      icon: domain.icon,
      path: domain.path,
      pages: p.pages,
      Header: p.Header,
      stamp: key,
      tokensClass: `region-${key}`,
    }];
  }),
);

// Ordered region list for menus/nav (the object preserves PRESENTATION order).
export const REGION_LIST = Object.values(REGIONS);

export const getRegion = (key) => REGIONS[key] || REGIONS.person;
