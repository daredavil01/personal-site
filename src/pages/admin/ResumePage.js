import React from "react";
import { Navigate, NavLink, useParams } from "react-router-dom";
import ResourceManager from "./ResourceManager";
import { byKey } from "./resources";
import { RESUME_SECTIONS } from "./navigation";
import { hairline } from "./ui/tokens";

const tabClass = ({ isActive }) => [
  "inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors no-underline",
  isActive
    ? "border-admin-600 text-admin-700 dark:text-admin-300"
    : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100",
].join(" ");

/**
 * The four resume tables under one route. They were four sidebar entries out of
 * thirteen before the redesign, which made the nav read as mostly résumé.
 */
const ResumePage = () => {
  const { section } = useParams();
  const active = RESUME_SECTIONS.find((s) => s.slug === section);
  if (!active) return <Navigate to="/admin/resume/experience" replace />;
  const resource = byKey(active.resource);

  return (
    <div className="flex flex-col gap-5">
      <nav className={`flex gap-1 overflow-x-auto border-b ${hairline}`}>
        {RESUME_SECTIONS.map((s) => (
          <NavLink key={s.slug} to={`/admin/resume/${s.slug}`} className={tabClass}>
            <s.icon size={14} aria-hidden="true" />
            {s.label}
          </NavLink>
        ))}
      </nav>
      <ResourceManager key={resource.key} resource={resource} />
    </div>
  );
};

export default ResumePage;
