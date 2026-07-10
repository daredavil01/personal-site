// Sun/moon toggle (§4.10). Sets the atlas scene time AND keeps ThemeContext's
// Tailwind `dark` class in lockstep — one-way coupling so region interiors
// (Tailwind-styled content) always match the surrounding scene.

import React from "react";
import PropTypes from "prop-types";

const TimeToggle = ({ time, onChange }) => (
  <button
    type="button"
    className="atlas-hud-btn"
    aria-label={time === "night" ? "Switch to day" : "Switch to night"}
    title={time === "night" ? "Switch to day" : "Switch to night"}
    onClick={() => onChange(time === "night" ? "day" : "night")}
  >
    <span aria-hidden="true">{time === "night" ? "🌙" : "☀️"}</span>
  </button>
);

TimeToggle.propTypes = {
  time: PropTypes.oneOf(["day", "night"]).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TimeToggle;
