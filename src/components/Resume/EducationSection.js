import React from 'react';

const EducationSection = ({ degrees }) => {
  return (
    <section className="col-span-12 md:col-span-4 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-8 rounded-xl flex flex-col mt-4 md:mt-0 shadow-sm">
      <span className="material-symbols-outlined text-stone-300 dark:text-stone-700 mb-6 text-4xl">school</span>
      <h3 className="font-headline text-2xl mb-8 text-stone-800 dark:text-stone-200">Education</h3>
      <div className="space-y-8 flex-grow">
        {degrees.map((degree, index) => (
          <div key={index}>
            <h4 className="font-body font-bold text-stone-700 dark:text-stone-300 text-lg mb-1">
              <a href={degree.link} target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">{degree.school}</a>
            </h4>
            <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
              {degree.degree}
            </p>
            <p className="font-label text-[10px] uppercase text-stone-400 dark:text-stone-600 mt-2">{degree.year}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 pt-4 border-t border-stone-100 dark:border-stone-800">
        <span className="font-label text-[10px] uppercase tracking-widest text-stone-300 dark:text-stone-700">Academic Background</span>
      </div>
    </section>
  );
};

export default EducationSection;
