import React from "react";
import { RADIUS, faintText, surfaceSunken } from "./tokens";

/**
 * Thin progress track for the image uploader.
 *
 * `value` is 0..1 for a determinate bar, or null/undefined for an indeterminate
 * one. Compression can be measured — it's a known number of encode attempts —
 * but Supabase's storage client emits no upload progress, so that phase is
 * honestly indeterminate rather than a fabricated percentage.
 */
const ProgressBar = ({ value = null, label }) => {
  const determinate = typeof value === "number" && Number.isFinite(value);
  const pct = determinate ? Math.round(Math.min(1, Math.max(0, value)) * 100) : null;

  return (
    <div className="flex flex-col gap-1">
      <div
        role="progressbar"
        aria-label={label || "Progress"}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        aria-valuenow={determinate ? pct : undefined}
        aria-busy={determinate ? undefined : "true"}
        className={`relative h-1.5 w-full overflow-hidden ${RADIUS} ${surfaceSunken} border border-stone-200 dark:border-stone-800`}
      >
        {determinate ? (
          <div
            className={`h-full ${RADIUS} bg-admin-500 transition-[width] duration-200 ease-out`}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className={`absolute inset-y-0 w-2/5 ${RADIUS} bg-admin-500 animate-progress-slide`} />
        )}
      </div>
      {label && (
        <span className={`text-xs ${faintText}`}>
          {label}
          {determinate ? ` ${pct}%` : ""}
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
