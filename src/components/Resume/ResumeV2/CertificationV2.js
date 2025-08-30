import React, { useState } from "react";
import PropTypes from "prop-types";

import CourseV2 from "./CourseV2";

const CertificationV2 = ({ data }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filterSource, setFilterSource] = useState("all");

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
    controls: {
      display: "flex",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: "1rem",
      marginBottom: "2rem",
    },
    filterButton: {
      padding: "0.6rem 1.2rem",
      borderRadius: "20px",
      border: "2px solid #667eea",
      background: "transparent",
      color: "#667eea",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "0.9rem",
      transition: "all 0.3s ease",
    },
    filterButtonActive: {
      background: "#667eea",
      color: "white",
    },
    certificationsGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(350px, 1fr))",
      gap: "1.5rem",
      padding: "1rem",
    },
    statsContainer: {
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap: "1rem",
      marginBottom: "2rem",
    },
    statCard: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "1.5rem",
      borderRadius: "12px",
      textAlign: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    },
    statValue: {
      fontSize: isMobile ? "1.5rem" : "2rem",
      fontWeight: "700",
      marginBottom: "0.5rem",
    },
    statLabel: {
      fontSize: "0.8rem",
      opacity: "0.9",
    },
  };

  const sources = ["all", ...new Set(data.map((cert) => cert.source))];
  const filteredCertifications = filterSource === "all"
    ? data
    : data.filter((cert) => cert.source === filterSource);

  const stats = {
    total: data.length,
    sources: sources.length - 1, // Exclude "all"
    recent: data.filter((cert) => {
      const year = parseInt(cert.issuedDate.split(" ")[1], 10);
      return year >= 2020;
    }).length,
    oldest: data.filter((cert) => {
      const year = parseInt(cert.issuedDate.split(" ")[1], 10);
      return year < 2020;
    }).length,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🏆 Certifications</h2>
        <p style={styles.subtitle}>
          Professional certifications and achievements
        </p>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Certifications</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.sources}</div>
          <div style={styles.statLabel}>Sources</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.recent}</div>
          <div style={styles.statLabel}>Recent (2020+)</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.oldest}</div>
          <div style={styles.statLabel}>Earlier</div>
        </div>
      </div>

      <div style={styles.controls}>
        {sources.map((source) => (
          <button
            key={source}
            type="button"
            style={{
              ...styles.filterButton,
              ...(filterSource === source ? styles.filterButtonActive : {}),
            }}
            onClick={() => setFilterSource(source)}
          >
            {source === "all" ? "All Sources" : source}
          </button>
        ))}
      </div>

      <div style={styles.certificationsGrid}>
        {filteredCertifications.map((cert) => (
          <CourseV2 key={cert.name} data={cert} />
        ))}
      </div>
    </div>
  );
};

CertificationV2.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    source: PropTypes.string.isRequired,
    issuedDate: PropTypes.string.isRequired,
  })).isRequired,
};

export default CertificationV2;
