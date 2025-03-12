import React from "react";
import PropTypes from "prop-types";

import ImageSlider from "../Instagram/ImageSlider";

const Sport = ({ data }) => (
  <article
    className="Post"
    style={{ border: "2px solid gray", margin: "20px", padding: "20px" }}
  >
    <h1 className="Post-title">{data.title}</h1>
    <p>
      Description: <b>{data.description}</b> <br />
      Date: <b>{data.date}</b>
      <br />
      Place: <b>{data.place}</b> <br />
      Distance: <b>{data.distance}</b> <br />
      Time: <b>{data.time}</b> <br />
      Timing Certificate:{" "}
      <b>
        <a href={data.timeCertificateLink}>Link</a>
      </b>
    </p>
    Some glorious <u>moments</u> from the event:
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
    description: PropTypes.string,
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
    description: "",
    place: "",
    distance: "",
    time: "",
    timeCertificateLink: "",
    slideImages: [],
  },
};

export default Sport;
