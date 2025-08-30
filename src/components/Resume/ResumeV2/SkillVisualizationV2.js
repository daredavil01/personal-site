import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const SkillVisualizationV2 = ({ selectedSkills, categories }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !selectedSkills.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 60;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw radar chart
    const numPoints = selectedSkills.length;
    const angleStep = (Math.PI * 2) / numPoints;

    // Draw background circles
    for (let i = 1; i <= 5; i += 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(102, 126, 234, 0.1)";
      ctx.lineWidth = 1;
      for (let j = 0; j < numPoints; j += 1) {
        const angle = j * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * ((radius * i) / 5);
        const y = centerY + Math.sin(angle) * ((radius * i) / 5);
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw skill points and labels
    selectedSkills.forEach((skill, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const value = skill.competency / 5;
      const x = centerX + Math.cos(angle) * (radius * value);
      const y = centerY + Math.sin(angle) * (radius * value);

      // Draw skill point
      ctx.beginPath();
      const categoryColor = categories.find((cat) => skill.category.includes(cat.name))?.color;
      ctx.fillStyle = categoryColor || "#667eea";
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw skill label
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(skill.title, x, y - 15);
    });

    // Draw connecting lines
    ctx.beginPath();
    ctx.strokeStyle = "rgba(102, 126, 234, 0.6)";
    ctx.lineWidth = 3;
    selectedSkills.forEach((skill, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const value = skill.competency / 5;
      const x = centerX + Math.cos(angle) * (radius * value);
      const y = centerY + Math.sin(angle) * (radius * value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
  }, [selectedSkills, categories]);

  const styles = {
    container: {
      textAlign: "center",
      padding: "2rem",
    },
    title: {
      fontSize: "1.5rem",
      fontWeight: "700",
      color: "#2c3e50",
      marginBottom: "1rem",
    },
    subtitle: {
      fontSize: "1rem",
      color: "#666",
      marginBottom: "2rem",
    },
    canvasContainer: {
      display: "flex",
      justifyContent: "center",
      marginBottom: "2rem",
    },
    canvas: {
      border: "2px solid #e0e0e0",
      borderRadius: "12px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    },
    skillsList: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "1rem",
      marginTop: "2rem",
    },
    skillCard: {
      background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
      padding: "1rem",
      borderRadius: "12px",
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
    skillTitle: {
      fontSize: "1rem",
      fontWeight: "700",
      color: "#2c3e50",
      marginBottom: "0.5rem",
    },
    skillLevel: {
      fontSize: "0.9rem",
      color: "#667eea",
      fontWeight: "600",
    },
    skillCategories: {
      display: "flex",
      flexWrap: "wrap",
      gap: "0.3rem",
      marginTop: "0.5rem",
    },
    skillCategory: {
      background: "rgba(102, 126, 234, 0.1)",
      color: "#667eea",
      padding: "0.2rem 0.5rem",
      borderRadius: "10px",
      fontSize: "0.7rem",
      fontWeight: "600",
    },
    emptyState: {
      padding: "3rem",
      color: "#666",
      fontSize: "1.1rem",
    },
  };

  if (!selectedSkills.length) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>🎯 Skill Visualization</h3>
        <p style={styles.subtitle}>
          Select up to 6 skills from the bars view to create a radar chart visualization
        </p>
        <div style={styles.emptyState}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
          <p>No skills selected yet</p>
          <p>Choose skills from the bars view to see them visualized here</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🎯 Skill Radar Chart</h3>
      <p style={styles.subtitle}>
        Visual representation of your selected skills and their proficiency levels
      </p>

      <div style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          style={styles.canvas}
        />
      </div>

      <div style={styles.skillsList}>
        {selectedSkills.map((skill) => (
          <div key={skill.title} style={styles.skillCard}>
            <h4 style={styles.skillTitle}>{skill.title}</h4>
            <p style={styles.skillLevel}>Level: {skill.competency}/5</p>
            <div style={styles.skillCategories}>
              {skill.category.map((cat) => (
                <span key={cat} style={styles.skillCategory}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

SkillVisualizationV2.propTypes = {
  selectedSkills: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    competency: PropTypes.number.isRequired,
    category: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
  categories: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  })).isRequired,
};

export default SkillVisualizationV2;
