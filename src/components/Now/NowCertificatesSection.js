import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const NowCertificatesSection = ({ certificates }) => {
  if (!certificates?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Certificates & Courses" icon="workspace_premium" />
      <ul className="space-y-4">
        {certificates.map((cert, i) => (
          <li key={i} className="flex items-start justify-between gap-4">
            <div>
              <p className="font-body text-sm font-semibold text-stone-800 dark:text-stone-200 leading-snug">
                {cert.name}
              </p>
              {cert.org && (
                <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-0.5">
                  {cert.org}
                </p>
              )}
            </div>
            {cert.link && (
              <a
                href={cert.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-label text-[9px] uppercase tracking-widest bg-secondary text-white px-2 py-1 rounded hover:bg-secondary/80 transition-colors"
              >
                View ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NowCertificatesSection;
