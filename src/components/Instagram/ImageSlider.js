import React from "react";
import PropTypes from "prop-types";

import { Slide } from "react-slideshow-image";
import "react-slideshow-image/dist/styles.css";

const divStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundSize: "cover",
  height: "800px",
};

const ImageSlider = ({ data }) => {
  console.log(data);
  return (
    <div style={{ width: "800px" }}>
      <article className="slide-container">
        <Slide>
          {data.map((image) => (
            <div key={image.caption}>
              <div
                style={{
                  ...divStyle,
                  backgroundImage: `url(${image.url})`,
                }}
              />
            </div>
          ))}
        </Slide>
      </article>
    </div>
  );
};

ImageSlider.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string,
      caption: PropTypes.string,
    })
  ),
};

ImageSlider.defaultProps = {
  data: [],
};

export default ImageSlider;
