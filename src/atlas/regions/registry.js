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

const ForestHeader = lazy(() => import("./headers/ForestHeader"));

// key -> presentation. `label` is the biome name (distinct from the globe
// domain label); `Header` is the lazy biome header band or null until its wave.
const PRESENTATION = {
  marathons: {
    label: "Coastal Road",
    tagline: "a winding shoreline of mile-markers and medals",
    Header: null,
  },
  treks: {
    label: "Sahyadri Ridge",
    tagline: "fort-crowned summits, each a flag on the skyline",
    Header: null,
  },
  writer: {
    label: "Scriptorium",
    tagline: "the writer's desk — letters, posts and a pinboard",
    Header: null,
  },
  reader: {
    label: "Book Forest",
    tagline: "shelves as tree rows, every book a leaf-card",
    Header: ForestHeader,
  },
  creator: {
    label: "Workshop",
    tagline: "drafting tables, blueprints and turning gears",
    Header: null,
  },
  person: {
    label: "Hometown Square",
    tagline: "the personal center — home, now and everything else",
    Header: null,
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
      path: domain.path,
      Header: p.Header,
      stamp: key,
      tokensClass: `region-${key}`,
    }];
  }),
);

export const getRegion = (key) => REGIONS[key] || REGIONS.person;
