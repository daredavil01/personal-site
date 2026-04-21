import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const NowWebsiteSection = ({ website }) => {
  if (!website?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Website Updates" icon="web" />
      <ul className="list-disc list-inside space-y-2 marker:text-secondary">
        {website.map((item, i) => (
          <li key={i} className="font-body text-sm text-stone-500 dark:text-stone-400">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NowWebsiteSection;
