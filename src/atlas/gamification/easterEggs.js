// Hidden easter eggs baked into the map art (§4.5, §11.3). Each is a small
// hotspot on the 2000×1250 map canvas, tucked into its region; clicking one
// stamps it (foundEgg) and toasts. The personal references are Sanket's —
// the §11.3 default set (refine the art/props in the phase-11 pass).

export const EGGS = [
  {
    id: "ultra-medal",
    at: [430, 1035],
    region: "marathons",
    title: "The 50K medal",
    hint: "A glint half-buried on the Coastal Road",
    found: "Tata Ultra 50K — the ultra-marathon medal.",
  },
  {
    id: "pawankhind-tent",
    at: [520, 372],
    region: "treks",
    title: "A lone tent",
    hint: "Something pitched high on the ridge",
    found: "Panhala → Pawankhind — the 22-hour night trek.",
  },
  {
    id: "paper-boat",
    at: [360, 726],
    region: "writer",
    title: "A paper boat",
    hint: "Adrift near the Scriptorium",
    found: "A paper boat — a nod to The Wanderer's Substack.",
  },
  {
    id: "nirman-sapling",
    at: [1015, 690],
    region: "person",
    title: "A young sapling",
    hint: "Newly planted in the square",
    found: "A Nirman sapling — growing something new.",
  },
  {
    id: "birthday-star",
    at: [1585, 175],
    region: "reader",
    title: "A bright star",
    hint: "Twinkles only after dark",
    found: "The Jan-22 birthday constellation.",
    night: true,
  },
];

export const EGG_COUNT = EGGS.length;

export const getEgg = (id) => EGGS.find((e) => e.id === id) || null;
