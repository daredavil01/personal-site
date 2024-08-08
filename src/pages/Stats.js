import React from "react";
import { Link } from "react-router-dom";

import Main from "../layouts/Main";

import Personal from "../components/Stats/Personal";
import ResumeStats from "../components/Stats/ResumeStats";
import Site from "../components/Stats/Site";
import StravaLatestRides from "../components/Stats/stravaLatestRides";

import positions from "../data/resume/positions";
import certifications from "../data/resume/certifications";
import { skills, categories } from "../data/resume/skills";

const Stats = () => {
  const resumeStats = {
    organizations_count: positions.length,
    certifications_count: certifications.length,
    skills_count: skills.length,
    categories_count: categories.length,
  };
  return (
    <Main title="Stats" description="Some statistics about Sanket Tambare!">
      <article className="post" id="stats">
        <header>
          <div className="title">
            <h2>
              <Link to="/stats">Stats</Link>
            </h2>
          </div>
        </header>
        <StravaLatestRides />
        <Personal />
        <ResumeStats resumeData={resumeStats} />
        <Site />
      </article>
    </Main>
  );
};

export default Stats;
