import React from "react";

// Pune drawn in one ink line — fort wall and bastion for Shaniwar Wada, a
// temple shikhara, the modern towers behind — replacing the old hot-linked
// Google-CDN photograph so the card has no external dependency.
const PuneSkyline = () => (
  <div className="mt-8 rounded-lg border border-stone-100 dark:border-stone-800 bg-secondary/[0.03] dark:bg-secondary/[0.06] p-4">
    <svg viewBox="0 0 280 84" className="w-full h-auto block" role="img" aria-label="Line drawing of the Pune skyline">
      {/* distant towers */}
      <g className="stroke-stone-300 dark:stroke-stone-600" fill="none" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M18,72 L18,34 L34,34 L34,72" />
        <path d="M22,34 L22,28 L30,28 L30,34" />
        <path d="M196,72 L196,26 L214,26 L214,72" />
        <path d="M204,26 L204,18" />
        <path d="M248,72 L248,38 L264,38 L264,72" />
      </g>
      {/* fort wall with bastion (Shaniwar Wada) */}
      <g className="stroke-secondary" fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M48,72 L48,52 L54,52 L54,46 L60,46 L60,52 L66,52 L66,46 L72,46 L72,52 L78,52 L78,72" />
        <path d="M78,72 L78,58 L120,58 L120,72" />
        <path d="M92,58 L92,48 L106,48 L106,58" />
        <path d="M94,48 C94,42 104,42 104,48" />
      </g>
      {/* temple shikhara */}
      <g className="stroke-secondary" fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M138,72 L138,54 L146,54 L152,24 L158,54 L166,54 L166,72" />
        <path d="M152,24 L152,16" />
        <circle cx="152" cy="13" r="2.5" />
      </g>
      {/* hill line (Sinhagad on the horizon) */}
      <path d="M222,72 L236,58 L246,66" className="stroke-stone-300 dark:stroke-stone-600" fill="none" strokeWidth="1.5" strokeLinejoin="round" />
      {/* ground */}
      <line x1="6" y1="72" x2="274" y2="72" className="stroke-stone-400 dark:stroke-stone-500" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <p className="font-label text-[9px] uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500 text-center mt-2 mb-0">
      Pune · 18.52°N 73.86°E
    </p>
  </div>
);

export default PuneSkyline;
