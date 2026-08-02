import React from "react";
import { inputClass } from "./tokens";

export const Input = ({ className = "", ...rest }) => (
  <input className={`${inputClass} ${className}`} {...rest} />
);

export const Textarea = ({ className = "", rows = 3, ...rest }) => (
  <textarea className={`${inputClass} resize-y ${className}`} rows={rows} {...rest} />
);

export const Select = ({ className = "", children, ...rest }) => (
  <select className={`${inputClass} pr-8 ${className}`} {...rest}>{children}</select>
);

export const Checkbox = ({ className = "", ...rest }) => (
  <input
    type="checkbox"
    className={`h-4 w-4 rounded-[3px] border-stone-300 dark:border-stone-600 dark:bg-stone-800 text-admin-600 focus:ring-2 focus:ring-admin-500/40 focus:ring-offset-0 cursor-pointer ${className}`}
    {...rest}
  />
);

export default Input;
