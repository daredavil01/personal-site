import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const NowMiscSection = ({ misc }) => {
  if (!misc?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Other" icon="more_horiz" />
      <ul className="list-disc list-inside space-y-2 marker:text-secondary">
        {misc.map((item, i) => (
          <li key={i} className="font-body text-sm text-stone-500 dark:text-stone-400">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NowMiscSection;
