import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

const SkillBarV2 = ({ skill, categories, onSelect, isSelected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animateProgress, setAnimateProgress] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateProgress(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (barRef.current && animateProgress) {
      barRef.current.style.width = "0%";
      setTimeout(() => {
        barRef.current.style.width = `${(skill.competency / 5) * 100}%`;
      }, 100);
    }
  }, [animateProgress, skill.competency]);

  const styles = {
    container: {
      background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
      borderRadius: "12px",
      padding: "1.5rem",
      boxShadow: isHovered
        ? "0 8px 32px rgba(0,0,0,0.15)"
        : "0 4px 16px rgba(0,0,0,0.1)",
      transition: "all 0.3s ease",
      border: isSelected ? "3px solid #667eea" : "1px solid #e0e0e0",
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1rem",
    },
    title: {
      fontSize: "1.1rem",
      fontWeight: "700",
      color: "#2c3e50",
      margin: "0",
    },
    competency: {
      fontSize: "0.9rem",
      fontWeight: "600",
      color: "#667eea",
    },
    progressContainer: {
      width: "100%",
      height: "12px",
      background: "#e0e0e0",
      borderRadius: "6px",
      overflow: "hidden",
      marginBottom: "0.5rem",
    },
    progressBar: {
      height: "100%",
      background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
      borderRadius: "6px",
      transition: "width 1s ease-out",
      position: "relative",
    },
    progressText: {
      fontSize: "0.8rem",
      color: "#666",
      textAlign: "right",
    },
    categories: {
      display: "flex",
      flexWrap: "wrap",
      gap: "0.3rem",
      marginTop: "0.5rem",
    },
    category: {
      background: "rgba(102, 126, 234, 0.1)",
      color: "#667eea",
      padding: "0.2rem 0.6rem",
      borderRadius: "12px",
      fontSize: "0.7rem",
      fontWeight: "600",
    },
    selectedIndicator: {
      position: "absolute",
      top: "0.5rem",
      right: "0.5rem",
      background: "#667eea",
      color: "white",
      borderRadius: "50%",
      width: "20px",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.8rem",
      fontWeight: "700",
    },
    stars: {
      display: "flex",
      gap: "0.2rem",
      marginTop: "0.5rem",
    },
    star: {
      fontSize: "0.8rem",
      color: "#ffd700",
    },
    starEmpty: {
      fontSize: "0.8rem",
      color: "#e0e0e0",
    },
  };

  const categoryColor = categories.find((cat) => skill.category.includes(cat.name))?.color || "#667eea";

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i += 1) {
      stars.push(
        <span
          key={i}
          style={i <= skill.competency ? styles.star : styles.starEmpty}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div
      style={styles.container}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {isSelected && <div style={styles.selectedIndicator}>✓</div>}
      <div style={styles.header}>
        <h4 style={styles.title}>{skill.title}</h4>
        <span style={styles.competency}>{skill.competency}/5</span>
      </div>

      <div style={styles.progressContainer}>
        <div
          ref={barRef}
          style={{
            ...styles.progressBar,
            background: `linear-gradient(90deg, ${categoryColor} 0%, ${categoryColor}80 100%)`,
          }}
        />
      </div>

      <div style={styles.progressText}>
        {((skill.competency / 5) * 100).toFixed(0)}% proficiency
      </div>

      <div style={styles.stars}>
        {renderStars()}
      </div>

      <div style={styles.categories}>
        {skill.category.map((cat) => (
          <span key={cat} style={styles.category}>
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
};

SkillBarV2.propTypes = {
  skill: PropTypes.shape({
    title: PropTypes.string.isRequired,
    competency: PropTypes.number.isRequired,
    category: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  categories: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  })).isRequired,
  onSelect: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
};

SkillBarV2.defaultProps = {
  isSelected: false,
};

export default SkillBarV2;
