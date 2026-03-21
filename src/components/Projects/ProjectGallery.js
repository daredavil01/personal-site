import React from 'react';

const ProjectGallery = ({ projects }) => {
  return (
    <div className="editorial-grid w-full">
      {projects.map((project, index) => {
        // Apply different layout styles based on index to maintain editorial feel
        if (index % 6 === 0) {
          // Exhibit 01: Large Feature
          return (
            <section key={index} className="col-span-12 md:col-span-8 group mt-8 md:mt-0">
              <div className="overflow-hidden rounded-lg mb-6 bg-stone-100 border border-stone-200 aspect-video relative">
                <img 
                  alt={project.title} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" 
                  src={project.image}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="absolute top-6 right-6">
                  <span className="bg-stone-900/90 backdrop-blur px-3 py-1 font-label text-[10px] uppercase tracking-tighter text-white border border-stone-700">Case Study 0{index + 1}</span>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="font-headline text-3xl font-bold mb-2 text-stone-800">{project.title}</h2>
                  <p className="font-label text-sm text-stone-400 uppercase tracking-wide">{project.subtitle}</p>
                </div>
                {project.link && (
                  <a className="font-label text-xs uppercase tracking-widest text-secondary border-b border-secondary/20 pb-1 hover:border-secondary transition-all" href={project.link} target="_blank" rel="noopener noreferrer">
                    View Project
                  </a>
                )}
              </div>
            </section>
          );
        }
        
        if (index % 6 === 1) {
          // Exhibit 02: Vertical Staggered
          return (
            <section key={index} className="col-span-12 md:col-span-4 mt-0 md:mt-24 group">
              <div className="overflow-hidden rounded-lg mb-6 bg-stone-100 border border-stone-200 aspect-[3/4] relative">
                <img 
                  alt={project.title} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" 
                  src={project.image}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div className="pr-4">
                <h2 className="font-headline text-2xl font-bold mb-2 text-stone-800">{project.title}</h2>
                <p className="font-body text-stone-600 text-sm leading-relaxed mb-4">{project.desc}</p>
                {project.link && (
                  <a href={project.link} className="font-label text-[10px] uppercase text-stone-400 hover:text-secondary" target="_blank" rel="noopener noreferrer">
                    0{index + 1} — View Link
                  </a>
                )}
              </div>
            </section>
          );
        }
        
        if (index % 6 === 2) {
          // Exhibit 03: Text Heavy Intervention
          return (
            <section key={index} className="col-span-12 md:col-span-5 bg-stone-50 border border-stone-100 p-12 flex flex-col justify-center rounded-lg mt-4 md:mt-0">
              <span className="material-symbols-outlined text-secondary text-4xl mb-6">menu_book</span>
              <h2 className="font-headline text-3xl font-bold mb-6 text-stone-800">{project.title}</h2>
              <p className="font-body text-stone-500 leading-relaxed mb-8">
                {project.desc}
              </p>
              {project.link && (
                <a href={project.link} target="_blank" rel="noopener noreferrer" className="w-fit">
                  <button className="w-fit px-6 py-3 bg-stone-900 text-white font-label text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity">
                    Explore Project
                  </button>
                </a>
              )}
            </section>
          );
        }
        
        if (index % 6 === 3) {
          // Exhibit 04: Wide Content
          return (
            <section key={index} className="col-span-12 md:col-span-7 group mt-4 md:mt-0">
              <div className="overflow-hidden rounded-lg mb-6 bg-stone-100 border border-stone-200 aspect-[16/10] relative">
                <img 
                  alt={project.title} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" 
                  src={project.image}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-headline text-2xl font-bold mb-1 text-stone-800">{project.title}</h2>
                  <p className="font-label text-[11px] text-stone-400 uppercase tracking-widest">{project.subtitle}</p>
                </div>
                <span className="font-label text-4xl text-stone-100 font-black">0{index + 1}</span>
              </div>
            </section>
          );
        }
        
        if (index % 6 === 4) {
          // Exhibit 05: Portrait Focus
          return (
            <section key={index} className="col-span-12 md:col-span-4 group mt-4 md:mt-0">
              <div className="overflow-hidden rounded-lg mb-6 bg-stone-100 border border-stone-200 aspect-[4/5] relative">
                <img 
                  alt={project.title} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" 
                  src={project.image}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <h2 className="font-headline text-xl font-bold mb-2 text-stone-800">{project.title}</h2>
              <p className="font-label text-xs text-stone-400 uppercase">{project.subtitle}</p>
            </section>
          );
        } 

        // Exhibit 06: Experimental Layout
        return (
            <section key={index} className="col-span-12 md:col-span-8 flex flex-col md:flex-row gap-8 items-center mt-4 md:mt-0">
              <div className="flex-1 order-2 md:order-1">
                <h2 className="font-headline text-4xl font-black mb-4 text-stone-800">{project.title}</h2>
                <p className="text-stone-600 leading-relaxed mb-6">
                  {project.desc}
                </p>
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="font-label text-xs uppercase tracking-widest text-secondary hover:underline">
                    View Complete Details
                  </a>
                )}
              </div>
              <div className="flex-1 order-1 md:order-2 overflow-hidden rounded-lg bg-stone-100 border border-stone-200 aspect-square relative group w-full">
                <img 
                  alt={project.title} 
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" 
                  src={project.image}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </section>
        );
      })}
    </div>
  );
};

export default ProjectGallery;
