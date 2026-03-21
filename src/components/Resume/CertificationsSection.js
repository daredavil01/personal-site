import React from 'react';

const CertificationsSection = ({ certifications }) => {
  // Take top 4 certifications to fit the glass card layout
  const displayCerts = certifications.slice(0, 4);

  return (
    <section className="col-span-12 md:col-span-8 bg-white dark:bg-stone-900 backdrop-blur-md border border-stone-100 dark:border-stone-800 p-10 rounded-xl mt-4 md:mt-0 shadow-sm">
      <h3 className="font-label text-xs uppercase tracking-[0.2em] text-stone-400 dark:text-stone-600 mb-10">Professional Certifications</h3>
      <div className="space-y-8">
        {displayCerts.map((cert, index) => (
          <a key={index} href={cert.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-6">
              <span className="font-headline text-4xl text-stone-100 dark:text-stone-800 group-hover:text-secondary transition-colors">0{index + 1}</span>
              <div>
                <h4 className="font-headline text-xl text-stone-800 dark:text-stone-200 group-hover:text-secondary transition-colors">{cert.name}</h4>
                <p className="font-label text-[10px] uppercase text-stone-400 dark:text-stone-500">{cert.source} · {cert.issuedDate}</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-opacity">verified</span>
          </a>
        ))}
      </div>
      <div className="mt-10 mb-[-10px] text-right">
        <span className="font-label text-[10px] uppercase tracking-widest text-stone-300 dark:text-stone-700">+ {certifications.length - displayCerts.length} More</span>
      </div>
    </section>
  );
};

export default CertificationsSection;
