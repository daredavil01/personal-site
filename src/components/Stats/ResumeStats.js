import React from "react";
import PropTypes from "prop-types";

import Table from "./Table";
import initialData from "../../data/stats/resumeStats";

const ResumeStats = ({ resumeData }) => {
  const data = initialData.map((field) => ({
    ...field,
    value: Object.keys(resumeData).includes(field.key)
      ? resumeData[field.key]
      : field.value,
  }));

  return (
    <div>
      <h3>Some stats about technical stuff</h3>
      <Table data={data} />
    </div>
  );
};

ResumeStats.propTypes = {
  resumeData: PropTypes.shape({
    organizations_count: PropTypes.number,
    certifications_count: PropTypes.number,
    skills_count: PropTypes.number,
    categories_count: PropTypes.number,
  }),
};

ResumeStats.defaultProps = {
  resumeData: {
    organizations_count: 0,
    certifications_count: 0,
    skills_count: 0,
    categories_count: 0,
  },
};

export default ResumeStats;
