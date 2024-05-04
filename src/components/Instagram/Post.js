import React from "react";
import PropTypes from "prop-types";

import ImageSlider from "./ImageSlider";

const Post = ({ data }) => (
  <article
    className="Post"
    style={{ border: "2px solid gray", margin: "20px", padding: "20px" }}
  >
    <header>
      <text className="Post-title" style={{ fontSize: "40px" }}>
        {data.title}
      </text>
    </header>
    <div className="Post-caption" style={{ fontSize: "25px" }}>
      {data.caption}
    </div>
    <div className="post-tags">
      <span style={{ fontSize: "25px", fontWeight: "bold" }}>Tags: </span>
      {data.tags.map((tag, index) => (
        <span
          key={tag}
          className="tag"
          style={{ fontSize: "25px", fontStyle: "italic" }}
        >
          {" "}
          {tag}
          {index !== data.tags.length - 1 && ","}
        </span>
      ))}
    </div>
    <div className="Post-user">
      <ImageSlider data={data.slideImages} />
    </div>
  </article>
);

Post.propTypes = {
  data: {
    title: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    caption: PropTypes.string,
    slideImages: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        caption: PropTypes.string,
      })
    ),
  },
};

Post.defaultProps = {
  data: {
    title: "",
    tags: [],
    caption: "",
    slideImages: [],
  },
};

export default Post;
