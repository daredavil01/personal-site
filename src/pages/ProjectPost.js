import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Main from "../layouts/Main";
import { useProjects } from "../context/ContentContext";
import { LoadingBlock } from "../components/common/AsyncStates";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const ProjectPost = () => {
  const { id } = useParams();
  const { data: projects, loading } = useProjects();
  const [shareState, setShareState] = useState("idle");
  const [imgError, setImgError] = useState(false);

  const project = projects.find((p) => String(p.id) === id);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: project?.title || "Project", url });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      }
    } catch (_) {
      // Ignored
    }
    setTimeout(() => setShareState("idle"), 2000);
  };

  if (loading) return <Main><LoadingBlock label="Loading project…" /></Main>;

  if (!project) {
    return (
      <Main title="Project Not Found">
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/projects" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Projects
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Project not found.</p>
        </div>
      </Main>
    );
  }

  return (
    <Main
      title={project.title}
      description={project.desc || project.subtitle || `${project.title} — a project by Sanket Tambare.`}
    >
      <div className="flex flex-col gap-8 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link to="/projects" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Projects
          </Link>
          <div
            role="button"
            tabIndex={0}
            onClick={handleShare}
            onKeyDown={keyActivate(handleShare)}
            className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">{shareState === "idle" ? "share" : "check"}</span>
            { { shared: "Shared!", copied: "Copied!" }[shareState] || "Share" }
          </div>
        </div>

        <article className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden flex flex-col gap-0">
          {project.image && !imgError && (
            <div className="aspect-video overflow-hidden bg-stone-100 dark:bg-stone-800">
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          )}

          <div className="p-8 flex flex-col gap-6">
            <div>
              <h1 className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-1 leading-tight">{project.title}</h1>
              {project.subtitle && (
                <p className="font-label text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest">{project.subtitle}</p>
              )}
            </div>

            {project.desc && (
              <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed mb-0">{project.desc}</p>
            )}

            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all self-start"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                View Project
              </a>
            )}
          </div>
        </article>
      </div>
    </Main>
  );
};

export default ProjectPost;
