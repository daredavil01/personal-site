import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const SkillVisualization = ({ selectedSkills, categories }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !selectedSkills.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 50;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw radar chart
    const numPoints = selectedSkills.length;
    const angleStep = (Math.PI * 2) / numPoints;

    // Draw background circles
    for (let i = 1; i <= 5; i += 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
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
      ctx.fillStyle = categoryColor || "#6adcfa";
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw skill label
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(skill.title, x, y - 10);
    });

    // Draw connecting lines
    ctx.beginPath();
    ctx.strokeStyle = "rgba(106, 220, 250, 0.5)";
    ctx.lineWidth = 2;
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

  if (!selectedSkills.length) return null;

  const gcc = (skill) => categories.find((cat) => skill.category.includes(cat.name))?.color
  || "#6adcfa";

  return (
    <div className="skill-visualization">
      <h4>Skill Visualization</h4>
      <div className="visualization-container">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="radar-chart"
        />
        <div className="skill-tree">
          {selectedSkills.map((skill) => (
            <div key={skill.title} className="skill-tree-item">
              <div
                className="skill-tree-node"
                style={{ backgroundColor: gcc(skill) }}
              >
                {skill.title}
              </div>
              <div className="skill-tree-connections">
                {skill.category.map((cat) => (
                  <div key={cat} className="skill-tree-category">
                    {cat}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

SkillVisualization.propTypes = {
  selectedSkills: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      competency: PropTypes.number.isRequired,
      category: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      color: PropTypes.string,
    })
  ).isRequired,
};

export default SkillVisualization;
