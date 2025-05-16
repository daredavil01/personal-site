/* eslint-disable jsx-a11y/media-has-caption */
import React from "react";

import first from "../../static/reels/1.mp4";
import third from "../../static/reels/3.mp4";
import fifth from "../../static/reels/5.mp4";

const Videos = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const styles = {
    container: {
      padding: isMobile ? "0.5rem" : "1.5rem",
    },
    title: {
      fontSize: isMobile ? "1.5rem" : "2.5rem",
      fontWeight: "600",
      marginBottom: isMobile ? "0.5rem" : "1rem",
    },
    subtitle: {
      fontSize: isMobile ? "1rem" : "1.5rem",
      color: "#666",
      marginBottom: isMobile ? "1rem" : "2rem",
    },
    video: {
      width: isMobile ? "100%" : "750px",
      height: isMobile ? "auto" : "500px",
      marginBottom: isMobile ? "1rem" : "2rem",
    },
  };

  return (
    <article className="Post" style={styles.container}>
      <h1 className="Post-title" style={styles.title}>
        Some Good Reels!
      </h1>
      <p className="Post-subtitle" style={styles.subtitle}>
        Adding Reels here since Instagram Account is now Deleted!
      </p>
      <video src={first} style={styles.video} controls />
      <video src={third} style={styles.video} controls />
      <video src={fifth} style={styles.video} controls />
    </article>
  );
};

export default Videos;
