import React from "react";

const Logo = ({ size = 32, className = "" }) => (
  <img
    src={`${process.env.PUBLIC_URL}/images/logo.svg`}
    width={size}
    height={size}
    alt="Sanket Tambare"
    className={className}
    style={{ display: "block" }}
  />
);

export default Logo;
