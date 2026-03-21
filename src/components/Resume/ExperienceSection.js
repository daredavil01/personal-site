import React from 'react';

const ExperienceSection = ({ positions }) => {
  return (
    <section className="col-span-12 bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-10 rounded-xl mt-4 shadow-sm">
      <h3 className="font-label text-xs uppercase tracking-[0.2em] text-stone-400 dark:text-stone-600 mb-10">Professional Experience</h3>
      <div className="space-y-12">
        {positions.map((pos, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-6 md:gap-12 group">
            <div className="w-full md:w-1/4">
              <span className="font-headline text-3xl text-stone-300 dark:text-stone-700 group-hover:text-secondary transition-colors font-bold">0{index + 1}</span>
            </div>
            <div className="w-full md:w-3/4">
              <div className="flex flex-col mb-4">
                <a href={pos.link} target="_blank" rel="noopener noreferrer" className="font-headline text-2xl text-stone-800 dark:text-stone-200 hover:text-secondary transition-colors inline-block w-fit">
                  {pos.company}
                </a>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-label text-sm uppercase text-secondary">{pos.position}</span>
                  <span className="text-stone-300 dark:text-stone-700 font-label text-xs">—</span>
                  <span className="font-label text-xs uppercase text-stone-400 dark:text-stone-500">{pos.daterange}</span>
                </div>
              </div>
              <ul className="list-disc list-inside space-y-2 text-stone-600 dark:text-stone-400 font-body leading-relaxed text-sm">
                {pos.points.map((point, idx) => (
                  <li key={idx} className="marker:text-stone-200 dark:marker:text-stone-700">{point}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExperienceSection;
