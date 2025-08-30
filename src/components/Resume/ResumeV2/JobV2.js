import React, { useState } from "react";
import PropTypes from "prop-types";

const JobV2 = ({ data, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
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
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "1rem",
    },
    companyInfo: {
      flex: "1",
    },
    companyName: {
      fontSize: "1.3rem",
      fontWeight: "700",
      color: "#2c3e50",
      marginBottom: "0.3rem",
    },
    position: {
      fontSize: "1rem",
      color: "#667eea",
      fontWeight: "600",
      marginBottom: "0.5rem",
    },
    dateRange: {
      fontSize: "0.9rem",
      color: "#666",
      fontStyle: "italic",
    },
    link: {
      color: "#667eea",
      textDecoration: "none",
      fontWeight: "600",
      transition: "color 0.3s ease",
    },
    expandButton: {
      background: "transparent",
      border: "2px solid #667eea",
      color: "#667eea",
      padding: "0.5rem 1rem",
      borderRadius: "20px",
      cursor: "pointer",
      fontSize: "0.8rem",
      fontWeight: "600",
      transition: "all 0.3s ease",
      marginTop: "0.5rem",
    },
    expandedContent: {
      maxHeight: isExpanded ? "500px" : "0",
      overflow: "hidden",
      transition: "max-height 0.3s ease",
    },
    pointsList: {
      listStyle: "none",
      padding: "0",
      margin: "1rem 0 0 0",
    },
    point: {
      background: "rgba(102, 126, 234, 0.1)",
      padding: "0.8rem",
      marginBottom: "0.5rem",
      borderRadius: "8px",
      borderLeft: "4px solid #667eea",
      fontSize: "0.9rem",
      lineHeight: "1.5",
      color: "#333",
    },
    badge: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "0.3rem 0.8rem",
      borderRadius: "15px",
      fontSize: "0.7rem",
      fontWeight: "600",
      marginLeft: "1rem",
    },
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      style={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div style={styles.header}>
        <div style={styles.companyInfo}>
          <h3 style={styles.companyName}>
            <a
              href={data.link}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
              onClick={(e) => e.stopPropagation()}
            >
              {data.company}
            </a>
            <span style={styles.badge}>#{index + 1}</span>
          </h3>
          <h4 style={styles.position}>{data.position}</h4>
          <p style={styles.dateRange}>📅 {data.daterange}</p>
        </div>
      </div>

      <button
        type="button"
        style={{
          ...styles.expandButton,
          background: isExpanded ? "#667eea" : "transparent",
          color: isExpanded ? "white" : "#667eea",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
      >
        {isExpanded ? "Hide Details" : "Show Details"}
      </button>

      <div style={styles.expandedContent}>
        <ul style={styles.pointsList}>
          {data.points.map((point) => (
            <li key={`point-${point.id}-${point.substring(0, 10)}`} style={styles.point}>
              ✨ {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

JobV2.propTypes = {
  data: PropTypes.shape({
    company: PropTypes.string.isRequired,
    position: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    daterange: PropTypes.string.isRequired,
    points: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
};

export default JobV2;
