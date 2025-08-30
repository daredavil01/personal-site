import React, { useState } from "react";
import PropTypes from "prop-types";

import DegreeV2 from "./DegreeV2";

const EducationV2 = ({ data }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const styles = {
    container: {
      padding: "1rem",
    },
    header: {
      textAlign: "center",
      marginBottom: "2rem",
    },
    title: {
      fontSize: isMobile ? "1.8rem" : "2.5rem",
      fontWeight: "700",
      color: "#2c3e50",
      marginBottom: "0.5rem",
    },
    subtitle: {
      fontSize: "1rem",
      color: "#666",
      marginBottom: "2rem",
    },
    educationGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(400px, 1fr))",
      gap: "2rem",
      padding: "1rem",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🎓 Education</h2>
        <p style={styles.subtitle}>
          My academic background and qualifications
        </p>
      </div>

      <div style={styles.educationGrid}>
        {data.map((degree) => (
          <DegreeV2 key={degree.school} data={degree} />
        ))}
      </div>
    </div>
  );
};

EducationV2.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    school: PropTypes.string.isRequired,
    degree: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
  })).isRequired,
};

export default EducationV2;
