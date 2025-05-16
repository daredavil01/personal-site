import React from "react";
import PropTypes from "prop-types";

import { Slide } from "react-slideshow-image";
import "react-slideshow-image/dist/styles.css";

const ImageSlider = ({ data }) => {
  const [dimensions, setDimensions] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getResponsiveStyles = () => {
    const isMobile = dimensions.width < 768;
    return {
      container: {
        width: isMobile ? "100%" : "800px",
        maxWidth: "100%",
        margin: "0 auto",
      },
      slide: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        height: isMobile ? "300px" : "600px",
        width: "100%",
      },
    };
  };

  const styles = getResponsiveStyles();

  return (
    <article className="slide-container" style={styles.container}>
      <Slide autoplay={false} transitionDuration={500} indicators arrows>
        {data.map((image) => (
          <div key={image.caption}>
            <div
              style={{
                ...styles.slide,
                backgroundImage: `url(${image.url})`,
              }}
            />
          </div>
        ))}
      </Slide>
    </article>
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
