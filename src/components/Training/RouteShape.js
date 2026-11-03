import React, { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { decodePolyline } from "../../lib/strava";

// A route drawn as a line, no map tiles: the public polyline (both ends already
// trimmed at import) projected flat with longitude scaled by cos(latitude), so
// a route keeps its shape. vector-effect keeps the stroke one width at any size.

export function projectRoute(encoded, size = 100, pad = 6) {
  const pts = decodePolyline(encoded);
  if (pts.length < 2) return null;
  const midLat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xy = pts.map(([lat, lng]) => [lng * k, -lat]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const scale = (size - pad * 2) / span;
  const offX = (size - (Math.max(...xs) - minX) * scale) / 2;
  const offY = (size - (Math.max(...ys) - minY) * scale) / 2;
  return xy.map(([x, y]) => `${((x - minX) * scale + offX).toFixed(1)},${((y - minY) * scale + offY).toFixed(1)}`).join(" ");
}

const RouteShape = ({
  polyline, label, className, strokeWidth, animate, color,
}) => {
  const points = useMemo(() => projectRoute(polyline), [polyline]);
  const ref = useRef(null);

  // Draw the line in once. The dash is measured in screen pixels, because a
  // non-scaling stroke dashes in screen space (pathLength would be wrong as
  // soon as the drawing is scaled up).
  useEffect(() => {
    const el = ref.current;
    if (!animate || !el || typeof el.getTotalLength !== "function") return;
    const scale = el.getScreenCTM ? Math.abs(el.getScreenCTM()?.a || 1) : 1;
    const len = Math.ceil(el.getTotalLength() * scale) + 4;
    el.style.transition = "none";
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.strokeDashoffset = "0";
  }, [animate, points]);

  if (!points) return null;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label} className={className}>
      <polyline
        points={points}
        fill="none"
        stroke={color || "currentColor"}
        strokeWidth={strokeWidth}
        ref={ref}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

RouteShape.propTypes = {
  polyline: PropTypes.string,
  label: PropTypes.string,
  className: PropTypes.string,
  strokeWidth: PropTypes.number,
  // Draw the line in, once, when it mounts (training.css).
  animate: PropTypes.bool,
  color: PropTypes.string,
};

RouteShape.defaultProps = {
  polyline: null,
  label: "Route",
  className: "w-full h-full",
  strokeWidth: 2,
  animate: false,
  color: null,
};

export default RouteShape;
