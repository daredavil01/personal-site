// Compass menu — the HUD's navigation (§2 decision #9). Doubles as the
// region-list fallback on touch devices where map panning is clumsy (§4.6).
// Region entries derive from the globe's domain table until the region
// registry lands in phase 5.

import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { DOMAINS } from "../../components/Index/globe/domains";
import { ATLAS_LIVE } from "../../config/featureFlags";

const MAP_PATH = ATLAS_LIVE ? "/" : "/world";

const CompassMenu = () => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const location = useLocation();

  // Close when navigating or pressing Escape.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onClick);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="atlas-hud-corner atlas-hud-tl">
      <button
        type="button"
        className="atlas-hud-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Compass — open region menu"
        title="Compass"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">🧭</span>
      </button>

      {open && (
        <nav className="atlas-compass-panel" aria-label="Atlas regions">
          <ul>
            <li>
              <Link to={MAP_PATH}>
                <span className="atlas-compass-dot" style={{ background: "var(--atlas-glow)" }} aria-hidden="true" />
                World Map
              </Link>
            </li>
            {DOMAINS.map((d) => (
              <li key={d.key} data-region={d.key}>
                <Link to={d.path}>
                  <span className="atlas-compass-dot" style={{ background: d.color }} aria-hidden="true" />
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default CompassMenu;
