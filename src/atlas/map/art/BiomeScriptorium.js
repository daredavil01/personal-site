// Scriptorium (writer) — final art (phase 11): the writer's hall and press
// tower at the Book Forest detail benchmark. A proper giant quill writes in
// the ink pond, drying pages sway on a line between hall and tower, the
// press arm stamps, letters wait in a postbox, and signs point to LETTERS /
// PINBOARD (blogs / micro-posts). Windows and the door lantern light up at
// night (§4.10). Local coords; [data-region="writer"] supplies
// --atlas-accent.

import React from "react";
import "./biomeLife.css";

// Drying pages pegged along the line between hall roof and press tower.
const PAGES_ON_LINE = [
  [222, 133],
  [258, 140],
  [300, 138],
  [340, 126],
];

const BiomeScriptorium = () => (
  <g>
    {/* Ink pond with ripples */}
    <ellipse cx="95" cy="255" rx="75" ry="22" fill="var(--atlas-water)" opacity=".9" />
    <ellipse cx="95" cy="256" rx="52" ry="14" fill="var(--atlas-ink)" opacity=".35" />
    <path d="M52,258 q10,-5 20,0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".4" />
    <path d="M116,264 q9,-4 18,0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".35" />

    {/* The giant quill, writing (slow rock about its nib) */}
    <g className="atlas-quill">
      <path d="M112,170 C102,132 110,98 132,74 C146,94 142,140 124,174 Z" fill="var(--atlas-accent)" opacity=".92" />
      <path d="M112,170 C102,132 110,98 132,74" fill="none" stroke="var(--atlas-ink)" strokeWidth="2" opacity=".45" />
      <g stroke="var(--atlas-ink)" strokeWidth="1.5" opacity=".3">
        <path d="M113,150 l14,-6" />
        <path d="M110,128 l16,-7" />
        <path d="M113,106 l14,-8" />
      </g>
      <line x1="112" y1="170" x2="98" y2="250" stroke="var(--atlas-ink)" strokeWidth="3" opacity=".7" />
      <polygon points="94,248 104,248 98,260" fill="var(--atlas-ink)" opacity=".8" />
    </g>

    {/* Writer's hall */}
    <rect x="180" y="130" width="190" height="120" rx="6" fill="var(--atlas-parchment)" />
    <polygon points="168,132 275,62 382,132" fill="var(--atlas-accent)" opacity=".92" />
    <rect x="258" y="196" width="34" height="54" rx="4" fill="var(--atlas-ink)" opacity=".45" />
    <rect x="205" y="155" width="26" height="30" rx="3" fill="var(--atlas-window)" />
    <rect x="320" y="155" width="26" height="30" rx="3" fill="var(--atlas-window)" />
    <rect x="205" y="208" width="26" height="24" rx="3" fill="var(--atlas-window)" />
    <rect x="320" y="208" width="26" height="24" rx="3" fill="var(--atlas-window)" />

    {/* Door lantern (halo wakes at night) */}
    <line x1="252" y1="204" x2="244" y2="208" stroke="var(--atlas-stone)" strokeWidth="3" strokeLinecap="round" />
    <circle className="atlas-halo" cx="244" cy="214" r="12" fill="var(--atlas-glow)" />
    <circle cx="244" cy="214" r="5" fill="var(--atlas-glow)" />

    {/* Drying line: hall roof → press tower, pages swaying together */}
    <path d="M186,118 Q280,152 372,104" fill="none" stroke="var(--atlas-ink)" strokeWidth="2" opacity=".4" />
    <g className="atlas-bunting">
      {PAGES_ON_LINE.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <line x1={x} y1={y - 4} x2={x} y2={y} stroke="var(--atlas-ink)" strokeWidth="1.5" opacity=".5" />
          <rect x={x - 7} y={y} width="14" height="18" rx="2" fill="var(--atlas-parchment)" />
          <path d={`M${x - 4},${y + 5} h8 M${x - 4},${y + 10} h8`} stroke="var(--atlas-ink)" strokeWidth="1.5" opacity=".3" />
        </g>
      ))}
    </g>

    {/* Press tower: spoked wheel turns, press arm stamps, pages emerge */}
    <rect x="372" y="96" width="54" height="154" rx="5" fill="var(--atlas-stone)" />
    <rect x="388" y="140" width="22" height="26" rx="3" fill="var(--atlas-window)" />
    <g className="atlas-gear-slow">
      <circle cx="399" cy="88" r="19" fill="var(--atlas-stone)" />
      <line x1="399" y1="71" x2="399" y2="105" stroke="var(--atlas-parchment)" strokeWidth="3" opacity=".8" />
      <line x1="382" y1="88" x2="416" y2="88" stroke="var(--atlas-parchment)" strokeWidth="3" opacity=".8" />
      <circle cx="399" cy="88" r="7" fill="var(--atlas-parchment)" />
    </g>
    <rect className="atlas-press-arm" x="390" y="180" width="18" height="26" rx="3" fill="var(--atlas-ink)" opacity=".55" />
    <rect x="380" y="236" width="26" height="6" rx="2" fill="var(--atlas-parchment)" />
    <rect x="382" y="229" width="22" height="6" rx="2" fill="var(--atlas-parchment)" />
    <rect x="352" y="222" width="15" height="20" rx="2" fill="var(--atlas-parchment)" transform="rotate(-10 359 232)" />

    {/* Postbox for outgoing letters */}
    <rect x="156" y="264" width="15" height="22" rx="3" fill="var(--atlas-accent)" />
    <rect x="159" y="269" width="9" height="2.5" rx="1" fill="var(--atlas-parchment)" />

    {/* Trail signs: LETTERS (blogs) / PINBOARD (micro-posts) */}
    <rect x="438" y="262" width="7" height="46" rx="3" fill="var(--atlas-stone)" />
    <rect x="414" y="256" width="58" height="17" rx="4" fill="var(--atlas-accent)" />
    <polygon points="472,256 484,264.5 472,273" fill="var(--atlas-accent)" />
    <text x="443" y="268.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff" letterSpacing="1">LETTERS</text>
    <polygon points="420,278 408,286 420,294" fill="var(--atlas-parchment)" />
    <rect x="420" y="278" width="60" height="16" rx="4" fill="var(--atlas-parchment)" />
    <text x="450" y="290" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--atlas-ink)" letterSpacing="1">PINBOARD</text>

    {/* Scattered pages */}
    <g fill="var(--atlas-parchment)" opacity=".95">
      <rect x="150" y="256" width="20" height="26" rx="2" transform="rotate(-12 160 269)" />
      <rect x="330" y="258" width="20" height="26" rx="2" transform="rotate(9 340 271)" />
      <rect x="228" y="268" width="18" height="24" rx="2" transform="rotate(5 237 280)" />
    </g>

    {/* Page-birds (shared motif with the Book Forest) */}
    <path d="M60,92 q8,-9 16,0 q8,-9 16,0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
    <path d="M126,70 q6,-7 12,0 q6,-7 12,0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".75" />
  </g>
);

export default BiomeScriptorium;
