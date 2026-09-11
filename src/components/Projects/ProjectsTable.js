import React from "react";
import PropTypes from "prop-types";
import { filtersShape, projectShape } from "./shapes";
import StatusBadge from "./StatusBadge";
import { formatProjectMonth } from "../../lib/projectDate";

const sortIcon = (sorted, dir) => {
  if (!sorted) return "unfold_more";
  return dir === "asc" ? "arrow_upward" : "arrow_downward";
};

const ariaSort = (sorted, dir) => {
  if (!sorted) return "none";
  return dir === "asc" ? "ascending" : "descending";
};

const TH = ({
  children, onSort, sorted, dir, className,
}) => (
  <th
    scope="col"
    aria-sort={ariaSort(sorted, dir)}
    className={`text-left font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-bold py-3 px-4 ${className}`}
  >
    {onSort ? (
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 hover:text-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded"
      >
        {children}
        <span className="material-symbols-outlined text-[14px]">{sortIcon(sorted, dir)}</span>
      </button>
    ) : children}
  </th>
);

TH.propTypes = {
  children: PropTypes.node.isRequired,
  onSort: PropTypes.func,
  sorted: PropTypes.bool,
  dir: PropTypes.string,
  className: PropTypes.string,
};
TH.defaultProps = {
  onSort: null, sorted: false, dir: "desc", className: "",
};

// Dense scannable list — the fastest way to take in everything at once. Sorting
// is delegated upward so it stays the same comparator the other views use.
const ProjectsTable = ({
  projects, onOpen, filters, onSort,
}) => (
  <div className="w-full overflow-x-auto border border-stone-100 dark:border-stone-800 rounded-2xl">
    <table className="w-full min-w-[44rem] border-collapse">
      <thead className="bg-stone-50 dark:bg-stone-900/60 border-b border-stone-100 dark:border-stone-800">
        <tr>
          <TH onSort={() => onSort("title")} sorted={filters.sort === "title"} dir={filters.dir}>Project</TH>
          <TH onSort={() => onSort("category")} sorted={filters.sort === "category"} dir={filters.dir}>Category</TH>
          <TH>Status</TH>
          <TH>Stack</TH>
          <TH onSort={() => onSort("date")} sorted={filters.sort === "date"} dir={filters.dir}>Date</TH>
          <TH className="text-right">Links</TH>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr
            key={project.id}
            onClick={() => onOpen(project)}
            className="border-b border-stone-50 dark:border-stone-800/60 last:border-0 hover:bg-stone-50 dark:hover:bg-stone-900/60 transition-colors cursor-pointer"
          >
            <td className="py-3 px-4">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpen(project); }}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded"
              >
                <span className="block font-body font-bold text-sm text-stone-800 dark:text-stone-100">{project.title}</span>
                {project.subtitle && (
                  <span className="block font-body text-xs text-stone-400 dark:text-stone-500 truncate max-w-xs">
                    {project.subtitle}
                  </span>
                )}
              </button>
            </td>
            <td className="py-3 px-4 font-body text-xs text-stone-500 dark:text-stone-400">{project.category || "—"}</td>
            <td className="py-3 px-4"><StatusBadge status={project.status} /></td>
            <td className="py-3 px-4 font-body text-xs text-stone-500 dark:text-stone-400">
              {(project.techStack ?? []).slice(0, 3).join(", ") || "—"}
              {(project.techStack ?? []).length > 3 && ` +${project.techStack.length - 3}`}
            </td>
            <td className="py-3 px-4 font-body text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
              {formatProjectMonth(project.date) || "—"}
            </td>
            <td className="py-3 px-4 text-right whitespace-nowrap">
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-label text-[10px] uppercase tracking-widest text-secondary hover:underline"
                >
                  Visit ↗
                </a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

ProjectsTable.propTypes = {
  projects: PropTypes.arrayOf(projectShape).isRequired,
  onOpen: PropTypes.func.isRequired,
  filters: filtersShape.isRequired,
  onSort: PropTypes.func.isRequired,
};

export default ProjectsTable;
