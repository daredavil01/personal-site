import React from "react";
import PropTypes from "prop-types";

// A card photo shown whole: object-contain over a blurred, enlarged copy of
// the same photo, so cards stay one size without cropping a portrait medal
// shot or a wide panorama.
const CardPhoto = ({ src }) => (
  <>
    <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-70 dark:opacity-50" />
    <img src={src} alt="" loading="lazy" decoding="async" className="relative w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500" />
  </>
);

CardPhoto.propTypes = { src: PropTypes.string.isRequired };

export default CardPhoto;
