import React from "react";

import Main from "../layouts/Main";
import Posts from "../components/Instagram/Posts";

const Instagram = () => {
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
      maxWidth: "100%",
      margin: "0 auto",
    },
    title: {
      fontSize: isMobile ? "1.2rem" : "1.5rem",
      marginBottom: isMobile ? "0.5rem" : "1rem",
      fontWeight: "600",
    },
    description: {
      fontSize: isMobile ? "0.8rem" : "1rem",
      color: "#666",
      marginBottom: isMobile ? "1rem" : "1.5rem",
      lineHeight: "1.4",
    },
  };

  return (
    <Main
      title="Instagram"
      description="Here are archived instagram posts..."
      style={styles.container}
    >
      <h1 style={styles.title}>Instagram</h1>
      <p style={styles.description}>Here are archived instagram posts...</p>
      <Posts />
    </Main>
  );
};

export default Instagram;
