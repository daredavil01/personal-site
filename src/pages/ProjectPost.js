import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useParams, Link } from "react-router-dom";
import PageShell from "../atlas/PageShell";
import { buildProjectMeta } from "../data/pageMeta";
import { useProjects } from "../context/ContentContext";
import { useWorld } from "../atlas/world/WorldContext";
import { LoadingBlock } from "../components/common/AsyncStates";
import TagLinks from "../components/common/TagLinks";
import ImageSlider from "../components/Instagram/ImageSlider";
import StatusBadge from "../components/Projects/StatusBadge";
import TechChips from "../components/Projects/TechChips";
import { coverFor } from "../components/Projects/projectMedia";
import { formatProjectDate } from "../lib/projectDate";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const CaseSection = ({ title, body }) => (body ? (
  <section>
    <h2 className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">{title}</h2>
    <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed mb-0 whitespace-pre-line">{body}</p>
  </section>
) : null);

CaseSection.propTypes = { title: PropTypes.string.isRequired, body: PropTypes.string };
CaseSection.defaultProps = { body: "" };

const ProjectPost = () => {
  const { id } = useParams();
  const { data: projects, loading } = useProjects();
  const { track } = useWorld();
  const [shareState, setShareState] = useState("idle");
  const [imgError, setImgError] = useState(false);

  const project = projects.find((p) => String(p.id) === id);

  // Opening a project counts toward the Tinkerer collector quest (§4.5).
  useEffect(() => {
    if (project && project.id != null) track("project:open", String(project.id));
  }, [project, track]);

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

  if (loading) return <PageShell region="creator"><LoadingBlock label="Loading project…" /></PageShell>;

  // Also the branch a hidden project lands in: RLS keeps it out of the payload
  // entirely, so signed-out visitors simply never find it.
  if (!project) {
    return (
      <PageShell region="creator" title="Project Not Found">
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/projects" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Projects
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Project not found.</p>
        </div>
      </PageShell>
    );
  }

  const cover = coverFor(project);

  // Shared with the Cloudflare middleware so crawler + client OG tags match.
  const meta = buildProjectMeta({
    title: project.title,
    subtitle: project.subtitle,
    description: project.desc,
    image: cover,
  });

  const metaLine = [project.category, project.org, project.role, formatProjectDate(project.date)]
    .filter(Boolean).join(" · ");

  return (
    <PageShell region="creator" title={meta.title} description={meta.description} image={meta.image}>
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
          {cover && !imgError && (
            <div className="aspect-video overflow-hidden bg-stone-100 dark:bg-stone-800">
              <img
                src={cover}
                alt={project.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          )}

          <div className="p-8 flex flex-col gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-0 leading-tight">{project.title}</h1>
                <StatusBadge status={project.status} />
              </div>
              {project.subtitle && (
                <p className="font-label text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">{project.subtitle}</p>
              )}
              {metaLine && (
                <p className="font-body text-xs text-stone-400 dark:text-stone-500 mb-0">{metaLine}</p>
              )}
            </div>

            {project.desc && (
              <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed mb-0">{project.desc}</p>
            )}

            {project.highlights?.length > 0 && (
              <ul className="flex flex-col gap-1.5 m-0 pl-0 list-none">
                {project.highlights.map((h) => (
                  <li key={h} className="flex gap-2 font-body text-sm text-stone-600 dark:text-stone-300">
                    <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5">check_small</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}

            <TechChips tech={project.techStack} size="sm" />

            {project.slideImages?.length > 0 && (
              <div className="w-full">
                <span className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 block">
                  {`Screenshots (${project.slideImages.length})`}
                </span>
                <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800">
                  <ImageSlider data={project.slideImages} />
                </div>
              </div>
            )}

            {(project.problem || project.solution || project.outcome) && (
              <div className="flex flex-col gap-6 pt-2 border-t border-stone-100 dark:border-stone-800">
                <CaseSection title="Problem" body={project.problem} />
                <CaseSection title="Solution" body={project.solution} />
                <CaseSection title="Outcome" body={project.outcome} />
              </div>
            )}

            <TagLinks tags={project.tags} />

            <div className="flex flex-wrap items-center gap-3">
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all no-underline"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  View Project
                </a>
              )}
              {(project.links ?? []).map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-stone-200 dark:border-stone-700 font-label font-bold text-sm uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:border-secondary hover:text-secondary transition-colors no-underline"
                >
                  {l.label || "Link"}
                </a>
              ))}
            </div>
          </div>
        </article>
      </div>
    </PageShell>
  );
};

export default ProjectPost;
