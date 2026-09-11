import React from "react";
import PropTypes from "prop-types";
import { projectShape } from "./shapes";
import ProjectCard from "./ProjectCard";
import ProjectSpotlight from "./ProjectSpotlight";

// Spotlight (featured survivors of the current filters) plus a masonry grid.
// CSS columns rather than a fixed grid so cards keep their natural height
// instead of being forced into six hard-coded shapes the way the old gallery's
// index%6 layout did — which also meant a card changed shape when you filtered.
const ProjectsShowcase = ({ projects, onOpen }) => {
  const featured = projects.filter((p) => p.featured);
  const rest = featured.length ? projects.filter((p) => !p.featured) : projects;

  return (
    <div className="flex flex-col gap-10 w-full">
      {featured.length > 0 && <ProjectSpotlight projects={featured} onOpen={onOpen} />}

      {rest.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8">
          {rest.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
};

ProjectsShowcase.propTypes = {
  projects: PropTypes.arrayOf(projectShape).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default ProjectsShowcase;
