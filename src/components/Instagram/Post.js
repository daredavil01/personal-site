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
      backgroundColor: "white",
    },
    title: {
      fontSize: isMobile ? "1.2rem" : "1.8rem",
      fontWeight: "900",
      marginBottom: isMobile ? "0.5rem" : "1rem",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "#333",
    },
    caption: {
      fontSize: isMobile ? "0.9rem" : "1.1rem",
      marginBottom: isMobile ? "0.5rem" : "1rem",
      lineHeight: "1.6",
      color: "#444",
    },
    tagsContainer: {
      marginBottom: isMobile ? "0.5rem" : "1rem",
      fontSize: "0.9rem",
    },
    tagsLabel: {
      fontWeight: "bold",
      color: "#555",
    },
    tag: {
      fontStyle: "italic",
      marginRight: "0.3rem",
      color: "#3d94ff",
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
  data: PropTypes.shape({
    title: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    caption: PropTypes.string,
    slideImages: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        caption: PropTypes.string,
      })
    ),
  }).isRequired,
};

export default Post;
