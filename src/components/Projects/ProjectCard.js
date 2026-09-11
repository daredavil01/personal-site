import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { projectShape } from "./shapes";
import StatusBadge from "./StatusBadge";
import TechChips from "./TechChips";
import { previewFrames } from "./projectMedia";
import { formatProjectMonth } from "../../lib/projectDate";

const PREVIEW_MS = 1200;

// True only on devices with a real pointer and no reduced-motion preference —
// a hover slideshow on a touch screen is a surprise, not an affordance.
const canAnimatePreview = () => typeof window !== "undefined"
  && typeof window.matchMedia === "function"
  && window.matchMedia("(hover: hover)").matches
  && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Placeholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-stone-900">
    <span className="material-symbols-outlined text-stone-300 dark:text-stone-600 text-5xl">
      wallpaper
    </span>
  </div>
);

const ProjectCard = ({ project, onOpen }) => {
  const frames = previewFrames(project);
  const [frame, setFrame] = useState(0);
  const [errored, setErrored] = useState(false);
  const timer = useRef(null);

  // The interval is the only thing that must not outlive the card.
  useEffect(() => () => clearInterval(timer.current), []);

  const startPreview = () => {
    if (frames.length < 2 || !canAnimatePreview()) return;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setFrame((i) => (i + 1) % frames.length);
    }, PREVIEW_MS);
  };

  const stopPreview = () => {
    clearInterval(timer.current);
    setFrame(0);
  };

  const src = frames[frame];
  const showImage = !!src && !errored;

  return (
    <article
      className="break-inside-avoid mb-8 group"
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
    >
      <button
        type="button"
        onClick={() => onOpen(project)}
        aria-label={`Open details for ${project.title}`}
        className="block w-full text-left bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden hover:border-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary transition-colors"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-900">
          {showImage ? (
            <img
              src={src}
              alt={project.title}
              loading="lazy"
              decoding="async"
              onError={() => setErrored(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <Placeholder />
          )}

          {/* Featured projects also appear in the grid, so the card says why it
              is up in the spotlight too rather than looking duplicated. */}
          {(project.status || project.featured) && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              {project.featured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900/90 backdrop-blur font-label text-[10px] uppercase tracking-widest font-bold text-white">
                  ★ Featured
                </span>
              )}
              <StatusBadge status={project.status} />
            </div>
          )}

          {frames.length > 1 && (
            <div className="absolute bottom-3 right-3 flex gap-1" aria-hidden="true">
              {frames.map((f, i) => (
                <span
                  key={f}
                  className={`h-1 rounded-full transition-all ${i === frame ? "w-4 bg-white" : "w-1 bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div>
            <h3 className="font-headline text-xl font-bold text-stone-800 dark:text-stone-100 mb-1 leading-snug">
              {project.title}
            </h3>
            {project.subtitle && (
              <p className="font-body text-sm text-stone-500 dark:text-stone-400 mb-0 leading-relaxed">
                {project.subtitle}
              </p>
            )}
          </div>

          <p className="mb-0 font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {[project.category, project.org, formatProjectMonth(project.date)]
              .filter(Boolean).join(" · ")}
          </p>

          <TechChips tech={project.techStack} size="xs" max={4} />
        </div>
      </button>

      <div className="px-5 pt-2">
        <Link
          to={`/projects/${project.id}`}
          className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors"
        >
          Permalink ↗
        </Link>
      </div>
    </article>
  );
};

ProjectCard.propTypes = {
  project: projectShape.isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default ProjectCard;
