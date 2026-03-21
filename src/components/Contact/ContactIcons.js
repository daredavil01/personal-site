import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import data from '../../data/contact';

const ContactIcons = () => (
  <ul className="flex items-center gap-4 list-none p-0 m-0 flex-wrap">
    {data.map((s) => (
      <li key={s.label}>
        <a
          href={s.link}
          aria-label={s.label}
          title={s.label}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:text-secondary dark:hover:text-secondary hover:border-secondary dark:hover:border-secondary transition-all duration-200 hover:scale-110"
        >
          <FontAwesomeIcon icon={s.icon} />
        </a>
      </li>
    ))}
  </ul>
);

export default ContactIcons;
