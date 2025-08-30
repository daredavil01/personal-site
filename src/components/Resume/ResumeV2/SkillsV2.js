import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";

import SkillBarV2 from "./SkillBarV2";
import SkillVisualizationV2 from "./SkillVisualizationV2";

const SkillsV2 = ({ skills, categories }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [viewMode, setViewMode] = useState("bars");

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
    categoryButton: {
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
    categoryButtonActive: {
      background: "#667eea",
      color: "white",
    },
    viewToggle: {
      display: "flex",
      justifyContent: "center",
      gap: "0.5rem",
      marginBottom: "2rem",
    },
    toggleButton: {
      padding: "0.8rem 1.5rem",
      borderRadius: "25px",
      border: "2px solid #667eea",
      background: "transparent",
      color: "#667eea",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "0.9rem",
      transition: "all 0.3s ease",
    },
    toggleButtonActive: {
      background: "#667eea",
      color: "white",
    },
    skillsGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "1rem",
      marginBottom: "2rem",
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

  const filteredSkills = useMemo(() => {
    if (selectedCategory === "All") {
      return skills;
    }
    return skills.filter((skill) => skill.category.includes(selectedCategory));
  }, [skills, selectedCategory]);

  const stats = {
    totalSkills: skills.length,
    categories: categories.length,
    averageCompetency:
    (skills.reduce((sum, skill) => sum + skill.competency, 0) / skills.length).toFixed(1),
    selectedSkills: selectedSkills.length,
  };

  const handleSkillSelect = (skill) => {
    setSelectedSkills((prev) => {
      const isSelected = prev.some((s) => s.title === skill.title);
      if (isSelected) {
        return prev.filter((s) => s.title !== skill.title);
      }
      return [...prev, skill].slice(0, 6);
    });
  };

  const allCategories = ["All", ...categories.map((cat) => cat.name)];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🛠️ Skills & Expertise</h2>
        <p style={styles.subtitle}>
          My technical skills and proficiency levels
        </p>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalSkills}</div>
          <div style={styles.statLabel}>Total Skills</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.categories}</div>
          <div style={styles.statLabel}>Categories</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.averageCompetency}</div>
          <div style={styles.statLabel}>Avg Level</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.selectedSkills}</div>
          <div style={styles.statLabel}>Selected</div>
        </div>
      </div>

      <div style={styles.controls}>
        {allCategories.map((category) => (
          <button
            key={category}
            type="button"
            style={{
              ...styles.categoryButton,
              ...(selectedCategory === category ? styles.categoryButtonActive : {}),
            }}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div style={styles.viewToggle}>
        <button
          type="button"
          style={{
            ...styles.toggleButton,
            ...(viewMode === "bars" ? styles.toggleButtonActive : {}),
          }}
          onClick={() => setViewMode("bars")}
        >
          📊 Bars View
        </button>
        <button
          type="button"
          style={{
            ...styles.toggleButton,
            ...(viewMode === "visualization" ? styles.toggleButtonActive : {}),
          }}
          onClick={() => setViewMode("visualization")}
        >
          🎯 Visualization
        </button>
      </div>

      {viewMode === "bars" ? (
        <div style={styles.skillsGrid}>
          {filteredSkills.map((skill) => (
            <SkillBarV2
              key={skill.title}
              skill={skill}
              categories={categories}
              onSelect={() => handleSkillSelect(skill)}
              isSelected={selectedSkills.some((s) => s.title === skill.title)}
            />
          ))}
        </div>
      ) : (
        <SkillVisualizationV2
          selectedSkills={selectedSkills}
          categories={categories}
        />
      )}
    </div>
  );
};

SkillsV2.propTypes = {
  skills: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    competency: PropTypes.number.isRequired,
    category: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
  categories: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  })).isRequired,
};

export default SkillsV2;
