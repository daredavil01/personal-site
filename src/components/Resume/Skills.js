import React, { Component } from "react";
import PropTypes from "prop-types";

import CategoryButton from "./Skills/CategoryButton";
import SkillBar from "./Skills/SkillBar";
import SkillVisualization from "./Skills/SkillVisualization";

const handleProps = ({ categories, skills }) => ({
  buttons: categories
    .map((cat) => cat.name)
    .reduce(
      (obj, key) => ({
        ...obj,
        [key]: false,
      }),
      { All: true }
    ),
  skills,
});

class Skills extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...handleProps({ categories: props.categories, skills: props.skills }),
      selectedSkills: [],
    };
  }

  getRows() {
    const actCat = Object.keys(this.state.buttons).reduce(
      (cat, key) => (this.state.buttons[key] ? key : cat),
      "All"
    );

    return this.state.skills
      .sort((a, b) => {
        let ret = 0;
        if (a.competency > b.competency) ret = -1;
        else if (a.competency < b.competency) ret = 1;
        else if (a.category[0] > b.category[0]) ret = -1;
        else if (a.category[0] < b.category[0]) ret = 1;
        else if (a.title > b.title) ret = 1;
        else if (a.title < b.title) ret = -1;
        return ret;
      })
      .filter((skill) => actCat === "All" || skill.category.includes(actCat))
      .map((skill) => (
        <SkillBar
          categories={this.props.categories}
          data={skill}
          key={skill.title}
          onSelect={() => this.handleSkillSelect(skill)}
          isSelected={this.state.selectedSkills.some(
            (s) => s.title === skill.title
          )}
        />
      ));
  }

  getButtons() {
    return Object.keys(this.state.buttons).map((key) => (
      <CategoryButton
        label={key}
        key={key}
        active={this.state.buttons}
        handleClick={this.handleChildClick}
      />
    ));
  }

  handleChildClick = (label) => {
    this.setState((prevState) => {
      const buttons = Object.keys(prevState.buttons).reduce(
        (obj, key) => ({
          ...obj,
          [key]: label === key && !prevState.buttons[key],
        }),
        {}
      );
      buttons.All = !Object.keys(prevState.buttons).some((key) => buttons[key]);
      return { buttons };
    });
  };

  handleSkillSelect = (skill) => {
    this.setState((prevState) => {
      const isSelected = prevState.selectedSkills.some(
        (s) => s.title === skill.title
      );
      const selectedSkills = isSelected
        ? prevState.selectedSkills.filter((s) => s.title !== skill.title)
        : [...prevState.selectedSkills, skill].slice(0, 6);
      return { selectedSkills };
    });
  };

  render() {
    return (
      <div className="skills">
        <div className="link-to" id="skills" />
        <div className="title">
          <h3>Skills</h3>
          <p>
            Click on skills to visualize them. Select up to 6 skills to create a
            radar chart.
          </p>
        </div>
        <div className="skill-button-container">{this.getButtons()}</div>
        <div className="skill-row-container">{this.getRows()}</div>
        <SkillVisualization
          selectedSkills={this.state.selectedSkills}
          categories={this.props.categories}
        />
      </div>
    );
  }
}

Skills.propTypes = {
  skills: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      competency: PropTypes.number,
      category: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      color: PropTypes.string,
    })
  ),
};

Skills.defaultProps = {
  skills: [],
  categories: [],
};

export default Skills;
