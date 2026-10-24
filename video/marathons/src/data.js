// Everything the film says about the races comes from the captured rows.
import footage from "./footage.json";

export const RACES = footage.races;
export const SHOTS = footage.shots;

// Where each place string was run. Venues inside Pune (NDA, CME, MILIT,
// Sinhgad) and "Pune, India" count as Pune.
const COORDS = {
  Mumbai: [72.8777, 19.076],
  Lonavala: [73.4062, 18.7546],
  Pune: [73.8567, 18.5204],
  Satara: [74.0183, 17.6805],
  Hyderabad: [78.4867, 17.385],
};
// Label offset [dx, dy, anchor] so neighbouring pins never collide.
const LABELS = {
  Mumbai: [-30, -10, "end"],
  Lonavala: [6, -62, "start"],
  Pune: [34, 10, "start"],
  Satara: [-30, 40, "end"],
  Hyderabad: [30, -20, "start"],
};

export const cityOf = (place) => Object.keys(COORDS).find((c) => place.toLowerCase().includes(c.toLowerCase())) || "Pune";

export const CITIES = Object.keys(COORDS).map((name) => ({
  name,
  coord: COORDS[name],
  label: LABELS[name],
  count: RACES.filter((r) => cityOf(r.place) === name).length,
}));

const km = (d) => parseInt(d, 10) || 0;
export const STATS = {
  races: RACES.length,
  km: RACES.reduce((a, r) => a + km(r.distance), 0),
  years: new Set(RACES.map((r) => new Date(r.date).getFullYear())).size,
  cities: CITIES.length,
};

export const PHOTOS = RACES.filter((r) => r.photo);
