import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import SkillModal from "./SkillModal";

const SkillBar = ({ data, categories, onSelect, isSelected }) => {
  const { category, competency, title } = data;
  const barRef = useRef(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = "0%";
      setTimeout(() => {
        barRef.current.style.width = `${String(
          Math.min(100, Math.max((competency / 5.0) * 100.0, 0))
        )}%`;
      }, 100);
    }
  }, [competency]);

  // TODO: Consider averaging colors
  const titleStyle = {
    background: categories
      .filter((cat) => category.includes(cat.name))
      .map((cat) => cat.color)[0],
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <>
      <div
        className={`skillbar clearfix ${isSelected ? "selected" : ""}`}
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      >
        <div className="skillbar-title" style={titleStyle}>
          <span>{title}</span>
        </div>
        <div className="skillbar-bar" ref={barRef} style={titleStyle} />
        <div className="skill-bar-percent">{competency} / 5</div>
        {isSelected && <div className="skill-selected-indicator">✓</div>}
      </div>
      {showModal && (
        <SkillModal skill={data} onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

SkillBar.propTypes = {
  data: PropTypes.shape({
    category: PropTypes.arrayOf(PropTypes.string).isRequired,
    competency: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      color: PropTypes.string,
    })
  ),
  onSelect: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
};

SkillBar.defaultProps = {
  categories: [],
  isSelected: false,
};

export default SkillBar;
