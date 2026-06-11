// Geometry helpers for the radial mind map. All coordinates are centred on (0, 0).

export const CENTER_RADIUS = 70;
export const CATEGORY_RADIUS = 58;
export const CHILD_RADIUS = 40;

const R1 = 340; // distance from centre node to category nodes
const CHILD_BASE_R = 150; // distance from a category node to its first ring of children
const RING_GAP = 100; // distance between successive child rings
const CHILD_SPACING = 92; // minimum distance between child centres along a ring
const MAX_ARC = Math.PI * 1.2; // angular spread of the child fan (216°), opening away from centre

// Default view that frames the centre node and all five category nodes.
export const OVERVIEW_BOX = {
  x: -620, y: -520, w: 1240, h: 1040,
};

export const layoutCategories = (categories) => categories.map((cat, i) => {
  const angle = ((2 * Math.PI * i) / categories.length) - (Math.PI / 2);
  return {
    ...cat,
    angle,
    x: R1 * Math.cos(angle),
    y: R1 * Math.sin(angle),
  };
});

// Places every item of a category in concentric rings around the category
// node so that no two bubbles overlap, regardless of item count.
export const layoutChildren = (cat) => {
  const positions = [];
  let placed = 0;
  let ring = 0;
  while (placed < cat.items.length) {
    const r = CHILD_BASE_R + (ring * RING_GAP);
    const capacity = Math.max(4, Math.floor((MAX_ARC * r) / CHILD_SPACING));
    const count = Math.min(capacity, cat.items.length - placed);
    const step = CHILD_SPACING / r;
    const stagger = ring % 2 === 1 ? step / 2 : 0; // offset alternate rings for a honeycomb feel
    for (let j = 0; j < count; j += 1) {
      const a = cat.angle + ((j - ((count - 1) / 2)) * step) + stagger;
      positions.push({
        item: cat.items[placed + j],
        x: cat.x + (r * Math.cos(a)),
        y: cat.y + (r * Math.sin(a)),
        ring,
      });
    }
    placed += count;
    ring += 1;
  }
  const maxRadius = CHILD_BASE_R + ((ring - 1) * RING_GAP);
  return { positions, maxRadius };
};

// ViewBox that frames an expanded category cluster while keeping the centre
// node in frame for context.
export const focusBox = (cat, maxRadius) => {
  const extent = maxRadius + CHILD_RADIUS + 70;
  const minX = Math.min(-CENTER_RADIUS - 60, cat.x - extent);
  const maxX = Math.max(CENTER_RADIUS + 60, cat.x + extent);
  const minY = Math.min(-CENTER_RADIUS - 60, cat.y - extent);
  const maxY = Math.max(CENTER_RADIUS + 60, cat.y + extent);
  return {
    x: minX, y: minY, w: maxX - minX, h: maxY - minY,
  };
};
