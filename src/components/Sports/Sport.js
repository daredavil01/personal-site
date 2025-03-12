import React from "react";
import PropTypes from "prop-types";

import ImageSlider from "../Instagram/ImageSlider";

const Sport = ({ data }) => (
  <article
    className="Post"
    style={{ border: "2px solid gray", margin: "20px", padding: "20px" }}
  >
    <h1 className="Post-title">{data.title}</h1>
    <p className="Post-subtitle">
      {data.date} | {data.place} | {data.distance} | {data.time}
    </p>
    <a href={data.timeCertificateLink}>Time Certificate</a>
    <br />
    <div className="Post-user">
      <ImageSlider data={data.slideImages} />
    </div>
  </article>
);

Sport.propTypes = {
  data: {
    id: PropTypes.number,
    title: PropTypes.string,
    date: PropTypes.string,
    place: PropTypes.string,
    distance: PropTypes.string,
    time: PropTypes.string,
    timeCertificateLink: PropTypes.string,
    slideImages: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        caption: PropTypes.string,
      })
    ),
  },
};

Sport.defaultProps = {
  data: {
    id: 0,
    title: "",
    date: "",
    place: "",
    distance: "",
    time: "",
    timeCertificateLink: "",
    slideImages: [],
  },
};

export default Sport;
