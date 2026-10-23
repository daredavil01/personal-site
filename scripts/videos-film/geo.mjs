// Where the /videos film's opening shot lands, and which satellite tiles it
// needs on the way down. Shared by capture.mjs (which downloads them) and
// render.mjs (which hands the same numbers to film.html), so the film never
// asks for a tile that was not fetched.

export const TARGET = { lat: 18.5195, lon: 73.8553, name: "Pune", place: "Shaniwar Wada" };

// The map phase runs on tile levels FIRST..LAST: the globe hands over at
// FIRST and the camera stops just short of LAST.
export const FIRST = 5;
export const LAST = 16;
export const TILE = 256;
export const VIEW = { w: 1080, h: 1920 };

// Esri World Imagery: real satellite photography, credited on screen.
export const IMAGERY_CREDIT = "Imagery © Esri, Maxar, Earthstar Geographics";
export const tileUrl = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

// The globe is NASA's Blue Marble (public domain), as three-globe ships it.
export const GLOBE_URL = "https://unpkg.com/three-globe@2.45.6/example/img/earth-blue-marble.jpg";
export const GLOBE_CREDIT = "Blue Marble: NASA";

/** Web Mercator pixel position of a point at zoom `z` (fractional allowed). */
export function worldPx(lat, lon, z) {
  const size = TILE * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * size,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size,
  };
}

/**
 * Tiles of `level` that can be on screen while the camera, centred on TARGET,
 * draws that level at any scale from 0.5 to 1 (zoom level-1 to level).
 */
export function tilesFor(level) {
  const { x, y } = worldPx(TARGET.lat, TARGET.lon, level);
  const n = 2 ** level;
  const out = [];
  for (let ty = Math.floor((y - VIEW.h) / TILE); ty <= Math.floor((y + VIEW.h) / TILE); ty += 1) {
    for (let tx = Math.floor((x - VIEW.w) / TILE); tx <= Math.floor((x + VIEW.w) / TILE); tx += 1) {
      if (ty >= 0 && ty < n) out.push([((tx % n) + n) % n, ty]);
    }
  }
  return out;
}
