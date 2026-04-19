import React from 'react';

// eslint-disable-next-line max-len
const base = 'w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 font-body text-sm text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none transition-colors placeholder:text-stone-400 dark:placeholder:text-stone-500';

const TextInput = ({ value, onChange, placeholder, multiline, rows = 3, type = 'text', ...rest }) => {
  if (multiline) {
    return (
      <textarea
        className={base}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        {...rest}
      />
    );
  }
  return (
    <input
      className={base}
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  );
};

export default TextInput;
