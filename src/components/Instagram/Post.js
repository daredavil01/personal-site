import React from "react";
import PropTypes from "prop-types";

import ImageSlider from "./ImageSlider";

const Post = ({ data }) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const styles = {
    article: {
      border: "2px solid gray",
      margin: isMobile ? "10px" : "20px",
      padding: isMobile ? "10px" : "20px",
      borderRadius: "8px",
    },
    title: {
      fontSize: isMobile ? "1.2rem" : "1.8rem",
      fontWeight: "600",
      marginBottom: isMobile ? "0.5rem" : "1rem",
    },
    caption: {
      fontSize: isMobile ? "0.9rem" : "1.2rem",
      marginBottom: isMobile ? "0.5rem" : "1rem",
      lineHeight: "1.4",
    },
    tagsContainer: {
      marginBottom: isMobile ? "0.5rem" : "1rem",
    },
    tagsLabel: {
      fontSize: isMobile ? "0.9rem" : "1.2rem",
      fontWeight: "bold",
    },
    tag: {
      fontSize: isMobile ? "0.9rem" : "1.2rem",
      fontStyle: "italic",
      marginRight: "0.3rem",
    },
  };

  return (
    <article className="Post" style={styles.article}>
      <header>
        <h2 className="Post-title" style={styles.title}>
          {data.title}
        </h2>
      </header>
      <div className="Post-caption" style={styles.caption}>
        {data.caption}
      </div>
      <div className="post-tags" style={styles.tagsContainer}>
        <span style={styles.tagsLabel}>Tags: </span>
        {data.tags.map((tag, index) => (
          <span key={tag} className="tag" style={styles.tag}>
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
};

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
