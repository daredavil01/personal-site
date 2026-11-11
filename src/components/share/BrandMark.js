import React, { useState } from "react";

// Renders a brand asset (logo / signature) for the share card. The files live
// at /images/brand/* and may not be committed yet, so on a 404 (or any load
// error) the element removes itself rather than showing a broken image — the
// rest of the card still exports cleanly. `crossOrigin` is set so html-to-image
// can inline the pixels without tainting the canvas.
const BrandMark = ({
  src, alt, className, style,
}) => {
  // Keyed on the src: switching theme swaps logo files, and one missing file
  // must not hide the next one.
  const [failedSrc, setFailedSrc] = useState(null);
  if (failedSrc === src) return null;
  return (
    <img
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      className={className}
      style={style}
      onError={() => setFailedSrc(src)}
    />
  );
};

export default BrandMark;
