import React from "react";
import posts from "../../data/instagram";
import Post from "./Post";

const Posts = () => {
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
  };

  return (
    <article className="Post" style={styles.container}>
      <h1 className="Post-title" style={styles.title}>
        Some Good Posts!
      </h1>
      <p className="Post-subtitle" style={styles.subtitle}>
        Adding posts here since Instagram Account is now Deleted!
      </p>
      {posts.map((p) => (
        <Post key={p.title} data={p} />
      ))}
    </article>
  );
};

export default Posts;
