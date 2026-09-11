import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { projectShape } from "./shapes";
import ImageSlider from "../Instagram/ImageSlider";
import StatusBadge from "./StatusBadge";
import TechChips from "./TechChips";
import TagLinks from "../common/TagLinks";
import { formatProjectDate } from "../../lib/projectDate";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

const MetaRow = ({ icon, children }) => (children ? (
  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
    <span className="material-symbols-outlined text-lg text-secondary">{icon}</span>
    <span className="font-label font-bold">{children}</span>
  </div>
) : null);

MetaRow.propTypes = { icon: PropTypes.string.isRequired, children: PropTypes.node };
MetaRow.defaultProps = { children: null };

// Quick look at a project without leaving the grid. Structure follows
// TrekDetailsModal so the two feel like the same component family; focus
// handling is stricter here because the whole grid is keyboard-navigable.
const ProjectDetailsModal = ({ isOpen, onClose, project }) => {
  const [shareState, setShareState] = useState("idle");
  const dialogRef = useRef(null);
  const restoreFocusTo = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    restoreFocusTo.current = document.activeElement;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector(FOCUSABLE)?.focus();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "auto";
      // Send the reader back to the card they opened, not to the top of the page.
      if (restoreFocusTo.current instanceof HTMLElement) restoreFocusTo.current.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  const handleShare = async () => {
    const url = `${window.location.origin}/projects/${project.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: project.title, url });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      }
    } catch (_) {
      // Ignored — a dismissed share sheet is not an error.
    }
    setTimeout(() => setShareState("idle"), 2000);
  };

  const meta = [project.category, project.org, project.role].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* A real button rather than a clickable div, so dismissing by backdrop is
          reachable by keyboard and announced instead of being a silent target. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-stone-900/50 backdrop-blur-sm cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        className="relative bg-white dark:bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            <h2 id="project-modal-title" className="font-headline text-2xl text-stone-900 dark:text-stone-100 truncate">
              {project.title}
            </h2>
            <StatusBadge status={project.status} className="shrink-0" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-4 shrink-0 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          <div className="flex flex-wrap gap-6 text-sm">
            <MetaRow icon="calendar_today">{formatProjectDate(project.date)}</MetaRow>
            <MetaRow icon="category">{meta}</MetaRow>
          </div>

          {project.subtitle && (
            <p className="font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
              {project.subtitle}
            </p>
          )}

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
              <span className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 block">
                {`Screenshots (${project.slideImages.length})`}
              </span>
              <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800">
                <ImageSlider data={project.slideImages} />
              </div>
            </div>
          )}

          <TagLinks tags={project.tags} />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 rounded-xl font-label font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all no-underline"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                View project
              </a>
            )}
            {(project.links ?? []).map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 font-label font-bold text-xs uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:border-secondary hover:text-secondary transition-colors no-underline"
              >
                {l.label || "Link"}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{shareState === "idle" ? "share" : "check"}</span>
              {{ shared: "Shared!", copied: "Copied!" }[shareState] || "Share"}
            </button>
            <Link
              to={`/projects/${project.id}`}
              className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Full case study →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

ProjectDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  project: projectShape,
};

ProjectDetailsModal.defaultProps = { project: null };

export default ProjectDetailsModal;
