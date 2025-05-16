import React from "react";
import sportsData from "../../data/sports";
import Sport from "./Sport";

sportsData.sort((a, b) => b.id - a.id);

const Sports = () => {
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
      lineHeight: "1.4",
    },
    highlight: {
      fontWeight: "bold",
      color: "#2e59ba",
    },
  };

  return (
    <article className="Post" style={styles.container}>
      <h1 className="Post-title" style={styles.title}>
        Marathons run till date!
      </h1>
      <p className="Post-subtitle" style={styles.subtitle}>
        Till date, I have run 1000+ Kms in running practice and participated in{" "}
        <span style={styles.highlight}>{sportsData.length}</span> marathons.
      </p>
      {sportsData.map((p) => (
        <Sport key={p.id} data={p} />
      ))}
    </article>
  );
};

export default Sports;
