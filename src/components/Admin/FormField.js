import React from 'react';

// Uses <p> instead of <label> since FormField wraps arbitrary children
// and cannot reliably associate with a specific control via htmlFor.
const FormField = ({ label, hint, children }) => (
  <div className="flex flex-col gap-1">
    <p className="m-0 font-label text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
      {label}
    </p>
    {children}
    {hint && (
      <span className="text-xs text-stone-400 dark:text-stone-500">{hint}</span>
    )}
  </div>
);

export default FormField;
