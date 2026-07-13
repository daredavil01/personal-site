// RegionShell — the atlas-mode page wrapper (§4.1/§4.8). Renders real semantic
// HTML (skip link, shared PageMeta, <main id="main">, a breadcrumb) inside a
// themed biome band so a deep-linked page is instantly usable while the map's
// HUD (mounted once in AtlasFrame) provides all navigation.
//
// Migration contract: a wave-1 wrap leaves the inner content visually
// identical — the content keeps its own <h1>; the band adds region context as
// non-heading text so the page still has exactly one <h1>. Later waves restyle
// the interiors. On arrival from the map (state.fromMap) it plays a short
// entrance; on mount it records the region visit (which stamps + toasts on a
// genuine first visit, via WorldContext + RewardToaster).

import React, { Suspense, useEffect } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import "../theme/atlasTokens.css";
import "./regionShell.css";
import PageMeta from "../../components/Template/PageMeta";
import Footer from "../../components/Template/Footer";
import { ATLAS_LIVE } from "../../config/featureFlags";
import { useWorld } from "../world/WorldContext";
import { resolveTime } from "../theme/timeOfDay";
import { getRegion } from "./registry";

const MAP_PATH = ATLAS_LIVE ? "/" : "/world";

const RegionShell = ({
  region, title, description, image, children,
}) => {
  const meta = getRegion(region);
  const { world, visitRegion } = useWorld();
  const { state } = useLocation();
  const time = resolveTime(world.time);
  const fromMap = !!(state && state.fromMap);
  const { Header } = meta;

  useEffect(() => {
    visitRegion(region);
  }, [region, visitRegion]);

  return (
    <div
      className={`atlas-root ${meta.tokensClass} atlas-region${fromMap ? " atlas-region-enter" : ""}`}
      data-region={region}
      data-time={time}
    >
      <a href="#main" className="atlas-region-skip">Skip to main content</a>
      <PageMeta title={title} description={description} image={image} />

      <header className="atlas-region-header">
        <div className="atlas-region-art" aria-hidden="true">
          {Header && (
            <Suspense fallback={null}>
              <Header />
            </Suspense>
          )}
        </div>
        <div className="atlas-region-header-veil" aria-hidden="true" />
        <div className="atlas-region-header-inner">
          <nav className="atlas-breadcrumb" aria-label="Breadcrumb">
            <Link to={MAP_PATH}>Map</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{meta.label}</span>
          </nav>
          <p className="atlas-region-name">{meta.label}</p>
          <p className="atlas-region-tagline">{meta.tagline}</p>
        </div>
      </header>

      <main id="main" className="atlas-region-main">
        <div className="atlas-region-column">
          {children}
        </div>
      </main>

      {/* Same footer as the classic shell, so every content page ends the
          same way in both modes. The map hub stays footer-free. */}
      <Footer />
    </div>
  );
};

RegionShell.propTypes = {
  region: PropTypes.oneOf(["marathons", "treks", "writer", "reader", "creator", "person"]),
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  children: PropTypes.node,
};

RegionShell.defaultProps = {
  region: "person",
  title: null,
  description: null,
  image: null,
  children: null,
};

export default RegionShell;
