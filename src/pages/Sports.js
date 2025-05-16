import React from "react";

import Main from "../layouts/Main";
import Sports from "../components/Sports/Sports";

const SportsPage = () => {
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
  };

  return (
    <Main
      title="Sports"
      description="Sanket Tambare's Sports"
      style={styles.container}
    >
      <h1 style={styles.title}>Sports</h1>
      <Sports />
    </Main>
  );
};

export default SportsPage;
