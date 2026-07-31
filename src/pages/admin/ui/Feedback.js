import React from "react";
import { AlertTriangle, Inbox, Loader2 } from "./icons";
import { heading, mutedText } from "./tokens";

/**
 * The admin's async states. Deliberately not `components/common/AsyncStates` —
 * those use the public shell's uppercase `font-label` idiom, which the admin
 * chrome drops.
 */
export const Spinner = ({ label = "Loading…", className = "" }) => (
  <div className={`flex items-center justify-center gap-2 py-10 text-sm ${mutedText} ${className}`} role="status">
    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
    {label}
  </div>
);

export const EmptyState = ({
  icon: Icon = Inbox, title = "Nothing here yet", description, action,
}) => (
  <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-6">
    <Icon size={28} className="text-stone-300 dark:text-stone-700" aria-hidden="true" />
    <p className={`${heading} text-sm mt-1 mb-0`}>{title}</p>
    {description && <p className={`text-sm ${mutedText} max-w-sm mb-0`}>{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const ErrorState = ({ error, title = "Something went wrong", action }) => (
  <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-6">
    <AlertTriangle size={28} className="text-red-500" aria-hidden="true" />
    <p className={`${heading} text-sm mt-1 mb-0`}>{title}</p>
    <p className={`text-sm ${mutedText} max-w-lg mb-0`}>{error?.message || String(error || "")}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default Spinner;
