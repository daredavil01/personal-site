// Coastal Road (marathons) — final art (phase 11): the winding shoreline
// route at the Book Forest detail benchmark. START gantry, medal monument,
// mile markers (5/10/21), a PB road sign, checkered finish flag, palms,
// lapping waves, a bobbing buoy and sailboat, gulls, and the striped
// lighthouse whose beam only sweeps at night. Local coords;
// [data-region="marathons"] supplies --atlas-accent.

import React from "react";
import PropTypes from "prop-types";
import "./biomeLife.css";

const ROAD = "M60,340 C200,300 260,240 380,215 C520,185 640,165 780,120";

// One roadside palm, reused via <use>.
const Palm = () => (
  <g id="atlas-palm">
    <path d="M0,0 C2,-14 8,-26 6,-40" stroke="var(--atlas-stone)" strokeWidth="7" fill="none" strokeLinecap="round" />
    <g stroke="var(--atlas-foliage-2)" strokeWidth="5" fill="none" strokeLinecap="round">
      <path d="M6,-40 q-16,-9 -30,-3" />
      <path d="M6,-40 q-4,-16 -15,-21" />
      <path d="M6,-40 q10,-13 24,-13" />
      <path d="M6,-40 q15,-3 24,8" />
    </g>
  </g>
);

// A mile marker: post + numbered accent roundel.
const MileMarker = ({ x, y, label }) => (
  <g>
    <rect x={x - 5} y={y} width="10" height="30" rx="3" fill="var(--atlas-parchment)" />
    <circle cx={x} cy={y - 6} r="10" fill="var(--atlas-accent)" />
    <text x={x} y={y - 2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{label}</text>
  </g>
);

MileMarker.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};

const BiomeCoast = () => (
  <g>
    <defs>
      <Palm />
    </defs>

    {/* The road: verge, tarmac, center dashes */}
    <path d={ROAD} fill="none" stroke="var(--atlas-foliage-3)" strokeWidth="36" strokeLinecap="round" opacity=".4" />
    <path d={ROAD} fill="none" stroke="var(--atlas-horizon)" strokeWidth="28" strokeLinecap="round" />
    <path d={ROAD} fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="20 16" opacity=".75" />

    {/* START gantry */}
    <rect x="70" y="296" width="9" height="48" fill="var(--atlas-accent)" />
    <rect x="124" y="296" width="9" height="48" fill="var(--atlas-accent)" />
    <rect x="62" y="278" width="80" height="20" rx="5" fill="var(--atlas-accent)" />
    <text x="102" y="292" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" letterSpacing="1.5">START</text>

    {/* Medal monument beside the start */}
    <rect x="176" y="292" width="8" height="34" rx="3" fill="var(--atlas-stone)" />
    <polygon points="172,286 188,286 180,296" fill="var(--atlas-accent)" />
    <circle cx="180" cy="278" r="13" fill="var(--atlas-glow)" />
    <circle cx="180" cy="278" r="8" fill="none" stroke="var(--atlas-ink)" strokeWidth="2" opacity=".4" />

    {/* Mile markers along the route */}
    <MileMarker x={301} y={216} label="5" />
    <MileMarker x={521} y={172} label="10" />
    <MileMarker x={651} y={146} label="21" />

    {/* PB road sign (§3: PBs celebrated as road signs) */}
    <rect x="420" y="152" width="7" height="40" rx="3" fill="var(--atlas-stone)" />
    <rect x="398" y="140" width="52" height="18" rx="4" fill="var(--atlas-glow)" />
    <text x="424" y="153" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--atlas-ink)" letterSpacing="1">PB 42K</text>

    {/* Checkered finish flag at the road's end */}
    <line x1="792" y1="120" x2="792" y2="84" stroke="var(--atlas-ink)" strokeWidth="3" />
    <g className="atlas-flag">
      <rect x="792" y="84" width="11" height="9" fill="var(--atlas-ink)" opacity=".8" />
      <rect x="803" y="84" width="11" height="9" fill="var(--atlas-parchment)" />
      <rect x="792" y="93" width="11" height="9" fill="var(--atlas-parchment)" />
      <rect x="803" y="93" width="11" height="9" fill="var(--atlas-ink)" opacity=".8" />
    </g>

    {/* Roadside palms */}
    <use href="#atlas-palm" transform="translate(262,262)" />
    <use href="#atlas-palm" transform="translate(438,218) scale(-.95,.95)" />
    <use href="#atlas-palm" transform="translate(600,182) scale(.85)" />

    {/* Lighthouse: stripes by day, lamp + sweeping beam at night */}
    <polygon className="atlas-beam" points="736,140 920,92 920,196" fill="var(--atlas-glow)" />
    <polygon points="686,272 694,150 730,150 738,272" fill="var(--atlas-parchment)" />
    <rect x="687" y="228" width="49" height="19" fill="var(--atlas-accent)" />
    <rect x="690" y="188" width="43" height="19" fill="var(--atlas-accent)" />
    <rect x="700" y="160" width="24" height="16" rx="3" fill="var(--atlas-window)" />
    <rect x="696" y="128" width="32" height="24" rx="3" fill="var(--atlas-ink)" opacity=".65" />
    <circle cx="712" cy="140" r="8" fill="var(--atlas-glow)" />
    <polygon points="694,128 712,106 730,128" fill="var(--atlas-accent)" />
    <ellipse cx="700" cy="276" rx="42" ry="10" fill="var(--atlas-stone)" />

    {/* The sea's edge: sailboat, buoy, lapping waves, foam */}
    <g className="atlas-bob">
      <path d="M176,330 h46 l-9,13 h-28 Z" fill="var(--atlas-accent)" />
      <line x1="199" y1="330" x2="199" y2="300" stroke="var(--atlas-ink)" strokeWidth="2.5" />
      <polygon points="199,300 224,326 199,326" fill="var(--atlas-parchment)" />
    </g>
    <g className="atlas-bob" style={{ animationDelay: "-2s" }}>
      <circle cx="118" cy="252" r="10" fill="var(--atlas-accent)" />
      <line x1="118" y1="242" x2="118" y2="226" stroke="var(--atlas-ink)" strokeWidth="3" />
    </g>
    <g className="atlas-wave" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
      <path d="M52,300 q14,-8 28,0 q14,8 28,0" />
      <path d="M96,368 q14,-8 28,0 q14,8 28,0" />
    </g>
    <g className="atlas-wave" style={{ animationDelay: "-2.7s" }} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
      <path d="M256,352 q14,-8 28,0 q14,8 28,0" />
      <path d="M170,394 q12,-7 24,0 q12,7 24,0" />
    </g>
    <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity=".35">
      <path d="M60,262 h34" />
      <path d="M310,330 h30" />
      <path d="M240,300 h24" />
    </g>

    {/* Gulls */}
    <path d="M350,120 q8,-9 16,0 q8,-9 16,0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
    <path d="M428,98 q6,-7 12,0 q6,-7 12,0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".75" />
  </g>
);

export default BiomeCoast;
