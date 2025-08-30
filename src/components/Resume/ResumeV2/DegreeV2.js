import React, { useState } from "react";
import PropTypes from "prop-types";

const DegreeV2 = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);

  const styles = {
    container: {
      background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
      borderRadius: "16px",
      padding: "2rem",
      boxShadow: isHovered
        ? "0 8px 32px rgba(0,0,0,0.15)"
        : "0 4px 16px rgba(0,0,0,0.1)",
      transition: "all 0.3s ease",
      border: "1px solid #e0e0e0",
      position: "relative",
      overflow: "hidden",
    },
    header: {
      textAlign: "center",
      marginBottom: "1.5rem",
    },
    degree: {
      fontSize: "1.4rem",
      fontWeight: "700",
      color: "#2c3e50",
      marginBottom: "1rem",
    },
    school: {
      fontSize: "1.1rem",
      color: "#667eea",
      fontWeight: "600",
      marginBottom: "0.5rem",
    },
    link: {
      color: "#667eea",
      textDecoration: "none",
      fontWeight: "600",
      transition: "color 0.3s ease",
    },
    year: {
      fontSize: "1rem",
      color: "#666",
      fontStyle: "italic",
    },
    icon: {
      fontSize: "3rem",
      marginBottom: "1rem",
      opacity: "0.8",
    },
    badge: {
      position: "absolute",
      top: "1rem",
      right: "1rem",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "0.3rem 0.8rem",
      borderRadius: "15px",
      fontSize: "0.7rem",
      fontWeight: "600",
    },
  };

  return (
    <div
      style={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.badge}>🎓 Degree</div>
      <div style={styles.header}>
        <div style={styles.icon}>🎓</div>
        <h3 style={styles.degree}>{data.degree}</h3>
        <h4 style={styles.school}>
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            {data.school}
          </a>
        </h4>
        <p style={styles.year}>📅 Graduated {data.year}</p>
      </div>
    </div>
  );
};

DegreeV2.propTypes = {
  data: PropTypes.shape({
    school: PropTypes.string.isRequired,
    degree: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
  }).isRequired,
};

export default DegreeV2;
