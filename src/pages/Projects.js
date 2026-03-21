import React from "react";
import Main from "../layouts/Main";
import ProjectGallery from "../components/Projects/ProjectGallery";
import projectsData from "../data/projects";

const Projects = () => {
  return (
    <Main
      title="Projects"
      description="A selection of projects that define my creative trajectory."
    >
      <div className="flex flex-col gap-12 w-full">
        {/* Hero Section */}
        <header className="mb-12">
          <p className="font-label text-xs uppercase tracking-widest text-secondary mb-4 font-bold">Portfolio Exhibit</p>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-none tracking-tight mb-8">
            Curated <br />Works.
          </h1>
          <div className="max-w-2xl">
            <p className="text-xl text-stone-500 dark:text-stone-400 font-light leading-relaxed">
              A selection of projects that define my creative trajectory. Each piece is treated as a singular exhibit, documenting the intersection of human intent and digital execution.
            </p>
          </div>
        </header>

        {/* Projects Gallery (Editorial Layout) */}
        <ProjectGallery projects={projectsData} />

        {/* Pagination / Call to action */}
        <footer className="mt-16 border-t border-stone-100 dark:border-stone-900 pt-16 text-center w-full">
          <h3 className="font-headline text-3xl font-bold mb-6 text-stone-800 dark:text-stone-200" id="discuss-vision">Have a project in mind?</h3>
          <button className="group inline-flex items-center gap-4 text-xl font-label uppercase tracking-widest text-secondary hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
            Let&apos;s discuss the vision
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-2">arrow_forward</span>
          </button>
        </footer>
      </div>
    </Main>
  );
};

export default Projects;
