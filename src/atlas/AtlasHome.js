// AtlasHome — the atlas-mode homepage. Target shape (§4.2) is the
// orbit -> dive -> map state machine; phases 3 and 4 build those stages.
// Until then this is the /world preview stub: it turns the preview flag on
// (so navigation across the site stays in atlas mode in this browser) and
// shows a placeholder dressed in the atlas tokens. Noindexed via Helmet
// here + X-Robots-Tag in functions/_middleware.js for the preview period.

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./theme/atlasTokens.css";
import PageMeta from "../components/Template/PageMeta";
import { useWorld } from "./world/WorldContext";
import { resolveTime } from "./theme/timeOfDay";

const AtlasHome = () => {
  const { world, enablePreview, disablePreview } = useWorld();
  const navigate = useNavigate();
  const time = resolveTime(world.time);

  useEffect(() => {
    enablePreview();
  }, [enablePreview]);

  const exitPreview = () => {
    disablePreview();
    navigate("/");
  };

  return (
    <>
      <PageMeta
        title="The Wanderer's Atlas"
        description="A living, explorable map of everything on this site — in the making."
        noindex
      />
      <div
        className="atlas-root"
        data-time={time}
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "linear-gradient(to bottom, var(--atlas-sky) 0%, var(--atlas-horizon) 78%, var(--atlas-foliage-1) 100%)",
        }}
      >
        <h1 style={{ fontSize: "clamp(2.25rem, 6vw, 3.25rem)", letterSpacing: "-0.02em" }}>
          The Wanderer&apos;s Atlas
        </h1>
        <p style={{ maxWidth: "28rem", fontSize: "1.1rem", color: "var(--atlas-ink-soft)" }}>
          Six regions. One world. The cartographers are still at their desks —
          the globe, the dive, and the map land here piece by piece.
        </p>

        <button
          type="button"
          onClick={exitPreview}
          className="atlas-hud-pill"
          style={{ marginTop: "0.5rem" }}
        >
          Exit preview
        </button>
      </div>
    </>
  );
};

export default AtlasHome;
