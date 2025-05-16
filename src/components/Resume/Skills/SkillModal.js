import React from "react";
import PropTypes from "prop-types";

const SkillModal = ({ skill, onClose }) => {
  if (!skill) return null;

  return (
    <div className="skill-modal-overlay" onClick={onClose}>
      <div className="skill-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="skill-modal-close" onClick={onClose}>
          ×
        </button>
        <h3>{skill.title}</h3>
        <div className="skill-modal-content">
          <div className="skill-modal-categories">
            <h4>Categories:</h4>
            <div className="skill-modal-category-tags">
              {skill.category.map((cat) => (
                <span key={cat} className="skill-modal-category-tag">
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <div className="skill-modal-competency">
            <h4>Proficiency Level:</h4>
            <div className="skill-modal-stars">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={`star-${skill.title}-${i}`}
                  className={`star ${i < skill.competency ? "filled" : ""}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

SkillModal.propTypes = {
  skill: PropTypes.shape({
    title: PropTypes.string.isRequired,
    competency: PropTypes.number.isRequired,
    category: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),
  onClose: PropTypes.func.isRequired,
};

SkillModal.defaultProps = {
  skill: null,
};

export default SkillModal;
