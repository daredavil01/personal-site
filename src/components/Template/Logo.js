import React from "react";

const Logo = ({ size = 32, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Sanket Tambare"
  >
    <rect width="40" height="40" rx="5" fill="#b22200" />
    <text
      x="20"
      y="28"
      textAnchor="middle"
      fontFamily="'Noto Serif', Georgia, serif"
      fontWeight="900"
      fontSize="20"
      fill="white"
      letterSpacing="-0.5"
    >
      ST
    </text>
  </svg>
);

export default Logo;
