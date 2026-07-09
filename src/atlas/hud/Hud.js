// The world HUD (§2 decision #9) — in atlas mode this chrome replaces the
// classic nav/sidebar/footer (which disappear per-page as RegionShell
// adoption rolls through phases 5–10). Skeleton for now: compass, sun/moon,
// sound, passport, return-to-map. RewardToaster joins in phase 5 and
// GuideAvatar in phase 13 (both live in AtlasFrame, not here).

import React from "react";
import PropTypes from "prop-types";
import CompassMenu from "./CompassMenu";
import ReturnPortal from "./ReturnPortal";
import PassportButton from "./PassportButton";
import SoundToggle from "./SoundToggle";
import TimeToggle from "./TimeToggle";

const Hud = ({ time, onTimeChange }) => (
  <div className="atlas-hud">
    <CompassMenu />
    <div className="atlas-hud-corner atlas-hud-tr">
      <TimeToggle time={time} onChange={onTimeChange} />
      <SoundToggle />
      <PassportButton />
    </div>
    <ReturnPortal />
  </div>
);

Hud.propTypes = {
  time: PropTypes.oneOf(["day", "night"]).isRequired,
  onTimeChange: PropTypes.func.isRequired,
};

export default Hud;
