import React from "react";
import { labelClass, mutedText } from "./tokens";

/**
 * Label + control + optional hint/error. Uses a <label> wrapper rather than
 * htmlFor/id pairs because the controls it wraps (tag chips, slide rows, upload
 * zones) are composites without a single focusable id to point at.
 */
const Field = ({
  label, required, hint, error, span = "half", children,
}) => (
  <div className={`flex flex-col gap-1.5 min-w-0 ${span === "full" ? "md:col-span-2" : ""}`}>
    {label && (
      <span className={`${labelClass} flex items-center gap-1`}>
        {label}
        {required && <span className="text-admin-600 dark:text-admin-400" aria-hidden="true">*</span>}
      </span>
    )}
    {children}
    {hint && !error && <span className={`text-xs ${mutedText}`}>{hint}</span>}
    {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
  </div>
);

export default Field;
