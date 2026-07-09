// CloudBloom — the three layered cloud sheets + white bloom core that carry
// the dive's whiteout (§4.2). Pure decoration (aria-hidden); DiveSequence
// animates the sheets (`.atlas-cloud-sheet`) and the core (`.atlas-bloom-core`)
// on a GSAP timeline. Inline SVG so the puffs scale crisply to the whiteout.

import React from "react";

// Each sheet is a cluster of soft white ellipses at a different depth; scaling
// them past the viewport with the core blooming reads as clouds rushing past.
const SHEETS = [
  [[300, 620, 260, 120], [640, 660, 300, 130], [980, 600, 240, 120], [120, 700, 200, 100]],
  [[220, 380, 240, 110], [560, 340, 300, 140], [900, 400, 260, 120], [1080, 300, 180, 90]],
  [[380, 150, 220, 100], [720, 120, 280, 120], [1000, 190, 200, 96], [140, 220, 190, 92]],
];

const CloudBloom = () => (
  <div className="atlas-bloom" aria-hidden="true">
    {SHEETS.map((puffs, i) => (
      <svg
        // eslint-disable-next-line react/no-array-index-key -- fixed-length static layer list
        key={i}
        className={`atlas-cloud-sheet atlas-cloud-sheet-${i}`}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="#ffffff">
          {puffs.map(([cx, cy, rx, ry]) => (
            <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />
          ))}
        </g>
      </svg>
    ))}
    <div className="atlas-bloom-core" />
  </div>
);

export default CloudBloom;
