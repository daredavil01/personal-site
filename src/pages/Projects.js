import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { useProjects } from "../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";
import useProjectFilters from "../components/Projects/useProjectFilters";
import ProjectFilters from "../components/Projects/ProjectFilters";
import ProjectsShowcase from "../components/Projects/ProjectsShowcase";
import ProjectsTimeline from "../components/Projects/ProjectsTimeline";
import ProjectsStatistics from "../components/Projects/ProjectsStatistics";
import ProjectsTable from "../components/Projects/ProjectsTable";
import ProjectDetailsModal from "../components/Projects/ProjectDetailsModal";
import { projectYear } from "../lib/projectDate";

const VIEWS = [
  { id: "showcase", label: "Showcase" },
  { id: "timeline", label: "Timeline" },
  { id: "stats", label: "Statistics" },
  { id: "table", label: "Table" },
];

const Projects = () => {
  const { data: projectsData, loading, error } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);

  const view = VIEWS.some((v) => v.id === searchParams.get("view"))
    ? searchParams.get("view")
    : "showcase";

  const {
    filters, setFilter, toggleFilter, clearFilters, hasFilters, filtered, facets,
  } = useProjectFilters(projectsData);

  // Merge, never replace — `view` and the filter params share the query string.
  const setView = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === "showcase") params.delete("view");
    else params.set("view", next);
    setSearchParams(params, { replace: true });
  };

  const onSort = (column) => {
    if (filters.sort === column) setFilter("dir", filters.dir === "asc" ? "desc" : "asc");
    else setFilter("sort", column);
  };

  const onSelectTech = (name) => {
    toggleFilter("tech", name);
    setView("showcase");
  };

  const summary = useMemo(() => {
    if (!projectsData.length) return "";
    const live = projectsData.filter((p) => p.status === "Live").length;
    const years = projectsData.map((p) => projectYear(p.date)).filter(Boolean).sort();
    const span = years.length ? `${years[0]}–${years[years.length - 1]}` : null;
    return [
      `${projectsData.length} project${projectsData.length === 1 ? "" : "s"}`,
      live ? `${live} live` : null,
      span,
    ].filter(Boolean).join(" · ");
  }, [projectsData]);

  return (
    <PageShell region="creator">
      <div className="flex flex-col gap-10 w-full">
        {/* Hero */}
        <header>
          <p className="font-label text-xs uppercase tracking-widest text-secondary mb-4 font-bold">Portfolio Exhibit</p>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-8">
            Curated <br />Works.
          </h1>
          <div className="max-w-2xl">
            <p className="text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed mb-3">
              A selection of projects that define my creative trajectory. Each piece is treated as a
              singular exhibit, documenting the intersection of human intent and digital execution.
            </p>
            {summary && (
              <p className="mb-0 font-label text-[11px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {summary}
              </p>
            )}
          </div>
        </header>

        {/* View tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-stone-100 dark:bg-stone-800/50 p-1.5 rounded-xl self-start">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-current={view === id}
              className={`px-5 py-2.5 rounded-lg font-label text-xs uppercase tracking-widest font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                view === id
                  ? "text-secondary bg-white dark:bg-stone-700 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <LoadingBlock label="Loading projects…" />}
        {error && <ErrorBlock />}

        {!loading && !error && (
          <>
            <ProjectFilters
              filters={filters}
              setFilter={setFilter}
              toggleFilter={toggleFilter}
              clearFilters={clearFilters}
              hasFilters={hasFilters}
              facets={facets}
              resultCount={filtered.length}
              totalCount={projectsData.length}
            />

            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-body text-stone-500 dark:text-stone-400 mb-4">
                  No projects match those filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-label text-xs uppercase tracking-widest text-secondary font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="w-full">
                {view === "showcase" && <ProjectsShowcase projects={filtered} onOpen={setSelected} />}
                {view === "timeline" && <ProjectsTimeline projects={filtered} onOpen={setSelected} />}
                {view === "stats" && (
                  <ProjectsStatistics projects={filtered} facets={facets} onSelectTech={onSelectTech} />
                )}
                {view === "table" && (
                  <ProjectsTable projects={filtered} onOpen={setSelected} filters={filters} onSort={onSort} />
                )}
              </div>
            )}
          </>
        )}

        {/* Call to action */}
        <footer className="mt-8 border-t border-stone-100 dark:border-stone-900 pt-16 text-center w-full">
          <h3 className="font-headline text-3xl font-bold mb-6 text-stone-800 dark:text-stone-200" id="discuss-vision">
            Have a project in mind?
          </h3>
          <button
            type="button"
            className="group inline-flex items-center gap-4 text-xl font-label uppercase tracking-widest text-secondary hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            Let&apos;s discuss the vision
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-2">arrow_forward</span>
          </button>
        </footer>
      </div>

      <ProjectDetailsModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        project={selected}
      />
    </PageShell>
  );
};

export default Projects;
