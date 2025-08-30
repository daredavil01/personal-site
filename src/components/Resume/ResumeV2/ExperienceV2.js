import React, { useState } from "react";
import PropTypes from "prop-types";

import JobV2 from "./JobV2";

const ExperienceV2 = ({ data }) => {
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
    timeline: {
      position: "relative",
      paddingLeft: isMobile ? "20px" : "50px",
    },
    timelineLine: {
      position: "absolute",
      left: isMobile ? "10px" : "25px",
      top: "0",
      bottom: "0",
      width: "2px",
      background: "linear-gradient(180deg, #667eea 0%, #764ba2 100%)",
    },
    jobContainer: {
      position: "relative",
      marginBottom: "2rem",
    },
    timelineDot: {
      position: "absolute",
      left: isMobile ? "-15px" : "-37px",
      top: "20px",
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      background: "#667eea",
      border: "3px solid white",
      boxShadow: "0 0 0 3px #667eea",
      zIndex: "2",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>💼 Professional Experience</h2>
        <p style={styles.subtitle}>
          My journey through various roles and responsibilities
        </p>
      </div>

      <div style={styles.timeline}>
        <div style={styles.timelineLine} />
        {data.map((job, index) => (
          <div key={job.company} style={styles.jobContainer}>
            <div style={styles.timelineDot} />
            <JobV2 data={job} index={index} />
          </div>
        ))}
      </div>
    </div>
  );
};

ExperienceV2.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    company: PropTypes.string.isRequired,
    position: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    daterange: PropTypes.string.isRequired,
    points: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
};

export default ExperienceV2;
