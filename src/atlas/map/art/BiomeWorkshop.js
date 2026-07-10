// Workshop (creator) — final art (phase 11): the maker's shed at the Book
// Forest detail benchmark. Two meshing gears (counter-rotating), a drafting
// table with a blueprint, a crane swinging a crate, a wall gauge (§3: resume
// as gauge dials), toolbox, chimney smoke, and a door lamp whose halo lights
// at night with glow-sparks by the gears. Local coords;
// [data-region="creator"] supplies --atlas-accent.

import React from "react";
import "./biomeLife.css";

const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315];
const SMALL_TEETH = [0, 60, 120, 180, 240, 300];

const SPARKS = [
  [366, 218, 2.5, "0s"],
  [384, 234, 2, "-1.1s"],
  [356, 240, 2, "-1.9s"],
];

const BiomeWorkshop = () => (
  <g>
    <ellipse cx="260" cy="245" rx="230" ry="42" fill="var(--atlas-stone)" opacity=".4" />

    {/* The shed */}
    <rect x="96" y="120" width="236" height="128" rx="6" fill="var(--atlas-parchment)" />
    <polygon points="84,124 214,54 344,124" fill="var(--atlas-accent)" opacity=".92" />
    <rect x="150" y="176" width="72" height="72" rx="6" fill="var(--atlas-ink)" opacity=".45" />
    <rect x="250" y="160" width="30" height="32" rx="3" fill="var(--atlas-window)" />

    {/* Blueprint pinned to the wall */}
    <rect x="110" y="146" width="32" height="23" rx="2" fill="var(--atlas-water)" opacity=".9" />
    <g stroke="#fff" strokeWidth="1.5" opacity=".8">
      <path d="M115,152 h16" />
      <path d="M115,158 h22" />
      <circle cx="132" cy="163" r="3" fill="none" />
    </g>

    {/* Wall gauge dial */}
    <circle cx="264" cy="216" r="11" fill="var(--atlas-parchment)" stroke="var(--atlas-stone)" strokeWidth="3" />
    <line x1="264" y1="216" x2="270" y2="209" stroke="var(--atlas-accent)" strokeWidth="2.5" strokeLinecap="round" />
    <g stroke="var(--atlas-ink)" strokeWidth="1.5" opacity=".5">
      <path d="M257,209 l2,2" />
      <path d="M264,206 v3" />
      <path d="M271,209 l-2,2" />
    </g>

    {/* Door lamp (halo wakes at night) */}
    <line x1="186" y1="176" x2="186" y2="170" stroke="var(--atlas-stone)" strokeWidth="3" strokeLinecap="round" />
    <circle className="atlas-halo" cx="186" cy="166" r="13" fill="var(--atlas-glow)" />
    <circle cx="186" cy="166" r="5" fill="var(--atlas-glow)" />

    {/* Chimney + smoke */}
    <rect x="292" y="74" width="26" height="50" fill="var(--atlas-stone)" />
    <circle className="atlas-smoke" cx="305" cy="58" r="10" fill="var(--atlas-parchment)" opacity=".5" />
    <circle className="atlas-smoke" style={{ animationDelay: "1.6s" }} cx="312" cy="48" r="13" fill="var(--atlas-parchment)" opacity=".45" />
    <circle className="atlas-smoke" style={{ animationDelay: "3.2s" }} cx="318" cy="36" r="15" fill="var(--atlas-parchment)" opacity=".4" />

    {/* Drafting table with blueprint */}
    <line x1="112" y1="300" x2="116" y2="270" stroke="var(--atlas-stone)" strokeWidth="5" strokeLinecap="round" />
    <line x1="180" y1="296" x2="176" y2="264" stroke="var(--atlas-stone)" strokeWidth="5" strokeLinecap="round" />
    <polygon points="100,272 190,258 196,272 106,286" fill="var(--atlas-stone)" />
    <polygon points="112,271 180,261 184,271 116,281" fill="var(--atlas-water)" opacity=".9" />
    <g stroke="#fff" strokeWidth="1.5" opacity=".8">
      <path d="M124,268 l24,-3" />
      <path d="M126,274 l32,-4" />
    </g>

    {/* Toolbox + wrench */}
    <rect x="238" y="262" width="36" height="19" rx="3" fill="var(--atlas-accent)" />
    <path d="M248,262 q8,-9 16,0" fill="none" stroke="var(--atlas-accent)" strokeWidth="4" />
    <rect x="252" y="266" width="8" height="5" rx="1" fill="var(--atlas-parchment)" />
    <line x1="286" y1="278" x2="304" y2="268" stroke="var(--atlas-stone)" strokeWidth="4" strokeLinecap="round" />
    <circle cx="306" cy="267" r="4.5" fill="none" stroke="var(--atlas-stone)" strokeWidth="3" />

    {/* Meshing gears: the big one slow, the pinion counter-rotating */}
    <g className="atlas-gear" transform="translate(420,180)">
      <g fill="var(--atlas-stone)">
        {GEAR_TEETH.map((deg) => (
          <rect key={deg} x="-7" y="-64" width="14" height="20" rx="3" transform={`rotate(${deg})`} />
        ))}
        <circle r="48" />
      </g>
      <circle r="16" fill="var(--atlas-parchment)" />
      <circle r="6" fill="var(--atlas-ink)" opacity=".5" />
    </g>
    <g className="atlas-gear-rev" transform="translate(343,232)">
      <g fill="var(--atlas-stone)">
        {SMALL_TEETH.map((deg) => (
          <rect key={deg} x="-5" y="-34" width="10" height="13" rx="2" transform={`rotate(${deg})`} />
        ))}
        <circle r="24" />
      </g>
      <circle r="9" fill="var(--atlas-parchment)" />
      <circle r="3.5" fill="var(--atlas-ink)" opacity=".5" />
    </g>

    {/* Glow-sparks by the gear train (night only) */}
    <g fill="var(--atlas-glow)">
      {SPARKS.map(([cx, cy, r, delay]) => (
        <circle key={`${cx}-${cy}`} className="atlas-ff" style={{ animationDelay: delay }} cx={cx} cy={cy} r={r} />
      ))}
    </g>

    {/* Crane: post, jib, and a crate swinging on its rope */}
    <rect x="468" y="140" width="10" height="122" fill="var(--atlas-stone)" />
    <rect x="428" y="138" width="50" height="9" rx="3" fill="var(--atlas-stone)" />
    <line x1="468" y1="192" x2="436" y2="146" stroke="var(--atlas-stone)" strokeWidth="4" strokeLinecap="round" />
    <g className="atlas-sway">
      <line x1="438" y1="147" x2="438" y2="204" stroke="var(--atlas-ink)" strokeWidth="2" opacity=".6" />
      <rect x="424" y="204" width="28" height="24" rx="2" fill="var(--atlas-stone)" />
      <g stroke="var(--atlas-parchment)" strokeWidth="2" opacity=".7">
        <path d="M424,212 h28" />
        <path d="M438,204 v24" />
      </g>
    </g>
  </g>
);

export default BiomeWorkshop;
