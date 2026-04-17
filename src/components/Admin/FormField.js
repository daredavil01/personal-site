import React from 'react';

const FormField = ({ label, hint, children }) => (
  <div className="flex flex-col gap-1">
    <label className="font-label text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
      {label}
    </label>
    {children}
    {hint && (
      <span className="text-xs text-stone-400 dark:text-stone-500">{hint}</span>
    )}
  </div>
);

export default FormField;
