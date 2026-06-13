import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ImageWithFallback = ({ src, alt, className }) => {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-stone-300 dark:text-stone-600 text-5xl">broken_image</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} onError={() => setErrored(true)} />;
};

const PermaLink = ({ id }) => (
  <Link
    to={`/projects/${id}`}
    className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors"
    title="Permalink"
  >
    Permalink ↗
  </Link>
);

const ProjectGallery = ({ projects }) => {
  return (
    <div className="grid grid-cols-12 gap-8 w-full">
      {projects.map((project, index) => {
        if (index % 6 === 0) {
          return (
            <section key={index} className="col-span-12 md:col-span-8 group mt-8 md:mt-0">
              <div className="overflow-hidden rounded-lg mb-6 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-video relative">
                <ImageWithFallback
                  alt={project.title}
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                  src={project.image}
                />
                <div className="absolute top-6 right-6">
                  <span className="bg-stone-900/90 dark:bg-stone-950/90 backdrop-blur px-3 py-1 font-label text-[10px] uppercase tracking-tighter text-white border border-stone-700 dark:border-stone-800">Case Study 0{index + 1}</span>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="font-headline text-3xl font-bold mb-2 text-stone-800 dark:text-stone-100">{project.title}</h2>
                  <p className="font-label text-sm text-stone-400 dark:text-stone-500 uppercase tracking-wide">{project.subtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                  {project.link && (
                    <a className="font-label text-xs uppercase tracking-widest text-secondary border-b border-secondary/20 dark:border-secondary/40 pb-1 hover:border-secondary transition-all" href={project.link} target="_blank" rel="noopener noreferrer">
                      View Project
                    </a>
                  )}
                  <PermaLink id={project.id} />
                </div>
              </div>
            </section>
          );
        }

        if (index % 6 === 1) {
          return (
            <section key={index} className="col-span-12 md:col-span-4 mt-0 md:mt-24 group">
              <div className="overflow-hidden rounded-lg mb-6 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-[3/4] relative">
                <ImageWithFallback
                  alt={project.title}
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                  src={project.image}
                />
              </div>
              <div className="pr-4">
                <h2 className="font-headline text-2xl font-bold mb-2 text-stone-800 dark:text-stone-100">{project.title}</h2>
                <p className="font-body text-stone-600 dark:text-stone-400 text-sm leading-relaxed mb-4">{project.desc}</p>
                <div className="flex items-center gap-4">
                  {project.link && (
                    <a href={project.link} className="font-label text-[10px] uppercase text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors" target="_blank" rel="noopener noreferrer">
                      0{index + 1} — View Link
                    </a>
                  )}
                  <PermaLink id={project.id} />
                </div>
              </div>
            </section>
          );
        }

        if (index % 6 === 2) {
          return (
            <section key={index} className="col-span-12 md:col-span-5 bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800 p-12 flex flex-col justify-center rounded-lg mt-4 md:mt-0">
              <span className="material-symbols-outlined text-secondary text-4xl mb-6">menu_book</span>
              <h2 className="font-headline text-3xl font-bold mb-6 text-stone-800 dark:text-stone-100">{project.title}</h2>
              <p className="font-body text-stone-500 dark:text-stone-400 leading-relaxed mb-8">
                {project.desc}
              </p>
              <div className="flex items-center gap-4">
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="w-fit">
                    <button className="w-fit px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 font-label text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg active:scale-95">
                      Explore Project
                    </button>
                  </a>
                )}
                <PermaLink id={project.id} />
              </div>
            </section>
          );
        }

        if (index % 6 === 3) {
          return (
            <section key={index} className="col-span-12 md:col-span-7 group mt-4 md:mt-0">
              <div className="overflow-hidden rounded-lg mb-6 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-[16/10] relative">
                <ImageWithFallback
                  alt={project.title}
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                  src={project.image}
                />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-headline text-2xl font-bold mb-1 text-stone-800 dark:text-stone-100">{project.title}</h2>
                  <p className="font-label text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-widest">{project.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-label text-4xl text-stone-100 dark:text-stone-800 font-black">0{index + 1}</span>
                  <PermaLink id={project.id} />
                </div>
              </div>
            </section>
          );
        }

        if (index % 6 === 4) {
          return (
            <section key={index} className="col-span-12 md:col-span-4 group mt-4 md:mt-0">
              <div className="overflow-hidden rounded-lg mb-6 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-[4/5] relative">
                <ImageWithFallback
                  alt={project.title}
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                  src={project.image}
                />
              </div>
              <h2 className="font-headline text-xl font-bold mb-2 text-stone-800 dark:text-stone-100">{project.title}</h2>
              <p className="font-label text-xs text-stone-400 dark:text-stone-500 uppercase mb-2">{project.subtitle}</p>
              <PermaLink id={project.id} />
            </section>
          );
        }

        return (
          <section key={index} className="col-span-12 md:col-span-12 lg:col-span-8 flex flex-col md:flex-row gap-8 items-center mt-4 md:mt-0">
            <div className="flex-1 order-2 md:order-1">
              <h2 className="font-headline text-4xl font-black mb-4 text-stone-800 dark:text-stone-100">{project.title}</h2>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
                {project.desc}
              </p>
              <div className="flex items-center gap-4">
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="font-label text-xs uppercase tracking-widest text-secondary hover:underline transition-all">
                    View Complete Details
                  </a>
                )}
                <PermaLink id={project.id} />
              </div>
            </div>
            <div className="flex-1 order-1 md:order-2 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-square relative group w-full">
              <ImageWithFallback
                alt={project.title}
                className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                src={project.image}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ProjectGallery;
