import React, { useState } from "react";
import PropTypes from "prop-types";

const CourseV2 = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);

  const styles = {
    container: {
      background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
      borderRadius: "16px",
      padding: "1.5rem",
      boxShadow: isHovered
        ? "0 8px 32px rgba(0,0,0,0.15)"
        : "0 4px 16px rgba(0,0,0,0.1)",
      transition: "all 0.3s ease",
      border: "1px solid #e0e0e0",
      position: "relative",
      overflow: "hidden",
    },
    header: {
      marginBottom: "1rem",
    },
    name: {
      fontSize: "1.2rem",
      fontWeight: "700",
      color: "#2c3e50",
      marginBottom: "0.5rem",
      lineHeight: "1.3",
    },
    link: {
      color: "#667eea",
      textDecoration: "none",
      fontWeight: "600",
      transition: "color 0.3s ease",
    },
    source: {
      fontSize: "1rem",
      color: "#667eea",
      fontWeight: "600",
      marginBottom: "0.5rem",
    },
    date: {
      fontSize: "0.9rem",
      color: "#666",
      fontStyle: "italic",
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
    icon: {
      fontSize: "2rem",
      marginBottom: "1rem",
      opacity: "0.8",
    },
    sourceIcon: {
      fontSize: "1.2rem",
      marginRight: "0.5rem",
    },
  };

  const getSourceIcon = (source) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes("coursera")) return "🎓";
    if (sourceLower.includes("freecodecamp")) return "💻";
    if (sourceLower.includes("udemy")) return "📚";
    if (sourceLower.includes("sololearn")) return "📱";
    if (sourceLower.includes("red hat")) return "🐧";
    if (sourceLower.includes("pristine")) return "🔒";
    return "🏆";
  };

  return (
    <div
      style={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.badge}>🏆 Certified</div>
      <div style={styles.header}>
        <div style={styles.icon}>🏆</div>
        <h3 style={styles.name}>
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            {data.name}
          </a>
        </h3>
        <h4 style={styles.source}>
          <span style={styles.sourceIcon}>
            {getSourceIcon(data.source)}
          </span>
          {data.source}
        </h4>
        <p style={styles.date}>📅 Issued {data.issuedDate}</p>
      </div>
    </div>
  );
};

CourseV2.propTypes = {
  data: PropTypes.shape({
    name: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    source: PropTypes.string.isRequired,
    issuedDate: PropTypes.string.isRequired,
  }).isRequired,
};

export default CourseV2;
