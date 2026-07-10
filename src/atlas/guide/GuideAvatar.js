// GuideAvatar (§2 decision #8, phase 13) — the mini illustrated Sanket that
// replaces react-joyride in atlas mode. A flat-vector likeness of
// public/images/me.jpg (red pheta with its fan fold and gold border,
// mustache, cream bandi over a dark kurta) pops up bottom-right with one
// speech-bubble prompt at a time from guideScript.js; "Got it" acknowledges
// the beat into world.guide and it never returns. Classic view is the
// simplicity hatch and gets no tour (§4.8).

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useWorld } from "../world/WorldContext";
import { pickBeat } from "./guideScript";
import "./guide.css";

// Flat-vector mini Sanket. Decorative — the bubble carries the content.
const GuideFigure = () => (
  <svg className="atlas-guide-figure" viewBox="0 0 120 140" aria-hidden="true">
    {/* Pheta fan fold (behind the head, like the photo's right side) */}
    <g>
      <path d="M84,44 L112,18 L116,34 L88,50 Z" fill="#d94f30" />
      <path d="M86,48 L118,36 L118,52 L90,56 Z" fill="#e8b64c" />
      <path d="M84,44 L104,10 L112,18 L88,46 Z" fill="#e8b64c" />
      <path d="M82,42 L94,6 L104,10 L86,44 Z" fill="#d94f30" />
    </g>

    {/* Body: cream bandi over dark kurta */}
    <path d="M26,140 C28,110 40,98 60,98 C80,98 92,110 94,140 Z" fill="#f5ead8" />
    <path d="M52,98 L60,112 L68,98 C65,96 55,96 52,98 Z" fill="#463349" />
    <line x1="60" y1="114" x2="60" y2="140" stroke="#d9c9ae" strokeWidth="3" />
    <circle cx="60" cy="120" r="1.6" fill="#b39b74" />
    <circle cx="60" cy="130" r="1.6" fill="#b39b74" />

    {/* Head */}
    <circle cx="60" cy="66" r="26" fill="#c98a5e" />
    <ellipse cx="34" cy="68" rx="4" ry="6" fill="#c98a5e" />
    <ellipse cx="86" cy="68" rx="4" ry="6" fill="#c98a5e" />

    {/* Pheta wrap + gold border band */}
    <path d="M32,60 C32,36 44,24 60,24 C76,24 88,36 88,60 C78,48 42,48 32,60 Z" fill="#d94f30" />
    <path d="M32,60 C42,50 78,50 88,60 C78,54 42,54 32,60 Z" fill="#e8b64c" />
    <path d="M44,32 q8,6 32,4" fill="none" stroke="#b83e24" strokeWidth="2.5" opacity=".7" />

    {/* Face: brows, eyes, nose, mustache, smile */}
    <path d="M46,60 q6,-4 12,-1" fill="none" stroke="#3b2b20" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M64,59 q6,-3 12,1" fill="none" stroke="#3b2b20" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="52" cy="66" r="2.6" fill="#2b1f16" />
    <circle cx="70" cy="66" r="2.6" fill="#2b1f16" />
    <path d="M60,68 q-2,6 1,8" fill="none" stroke="#a96f47" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M47,81 Q60,74 73,81 Q67,85 60,84 Q53,85 47,81 Z" fill="#2b1f16" />
    <path d="M52,87 q8,5 16,0" fill="none" stroke="#8f5a38" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const GuideAvatar = () => {
  const { world, markGuideSeen } = useWorld();
  const { pathname } = useLocation();
  const beat = pickBeat(world, pathname);
  const beatId = beat ? beat.id : null;
  const [shown, setShown] = useState(null); // beat id currently on screen

  // Give page entrances / reward toasts a beat before the guide speaks.
  useEffect(() => {
    if (!beatId) {
      setShown(null);
      return undefined;
    }
    const t = setTimeout(() => setShown(beatId), 1100);
    return () => clearTimeout(t);
  }, [beatId]);

  if (!beat || shown !== beat.id) return null;

  return (
    <div className="atlas-guide" role="status" aria-live="polite">
      <div className="atlas-guide-bubble">
        <p>{beat.text}</p>
        <button type="button" onClick={() => markGuideSeen(beat.id)}>
          Got it
        </button>
      </div>
      <GuideFigure />
    </div>
  );
};

export default GuideAvatar;
