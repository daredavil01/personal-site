// Compass menu — the HUD's navigation (§2 decision #9). Doubles as the
// full page directory / touch-device fallback where map panning is clumsy
// (§4.6): every content page is reachable here, grouped by region. Region
// sections + their pages (labels, icons, order) come from the region
// registry — the single source of truth (§4.8) — so this menu never drifts
// from the map. Icons are Material Symbols (the font the site already loads).

import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { REGION_LIST } from "../regions/registry";
import { ATLAS_LIVE } from "../../config/featureFlags";

const MAP_PATH = ATLAS_LIVE ? "/" : "/world";

const CompassMenu = () => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const location = useLocation();
  const here = location.pathname;

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
        aria-label="Compass — open the map directory"
        title="Compass"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">🧭</span>
      </button>

      {open && (
        <nav className="atlas-compass-panel" aria-label="Atlas directory">
          <Link to={MAP_PATH} className="atlas-compass-home">
            <span className="material-symbols-outlined atlas-compass-icon" aria-hidden="true">map</span>
            World Map
          </Link>

          {REGION_LIST.map((region) => (
            <div className="atlas-compass-group" key={region.key} data-region={region.key}>
              <p className="atlas-compass-region">
                <span
                  className="material-symbols-outlined atlas-compass-region-icon"
                  style={{ color: region.color }}
                  aria-hidden="true"
                >
                  {region.icon}
                </span>
                {region.label}
              </p>
              <ul>
                {region.pages.map((page) => {
                  const active = here === page.path || here.startsWith(`${page.path}/`);
                  return (
                    <li key={page.path}>
                      <Link
                        to={page.path}
                        state={{ fromMap: true }}
                        aria-current={active ? "page" : undefined}
                        className={active ? "is-active" : undefined}
                      >
                        <span className="material-symbols-outlined atlas-compass-icon" aria-hidden="true">
                          {page.icon}
                        </span>
                        {page.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
};

export default CompassMenu;
