// Shared class strings for the admin chrome.
//
// The dashboard is a workspace, not a page of the site: it drops the public
// shell's serif headlines and uppercase `font-label` overlines for plain Inter
// (`font-body`) and swaps the rust `secondary` accent for the scoped `admin`
// indigo (tailwind.config.js).
//
// RADIUS TRAP: tailwind.config.js overrides the radius scale — `rounded-lg` is
// only 4px and `rounded-xl` is 8px. `md` is NOT overridden, so `rounded-md` is
// the usual 6px. The admin standard is therefore `rounded-md` for controls and
// `rounded-xl` for cards. Never reach for `rounded-lg` here.

export const RADIUS = "rounded-md";
export const RADIUS_CARD = "rounded-xl";

export const focusRing = "focus:outline-none focus:ring-2 focus:ring-admin-500/40 focus:border-admin-500";

export const surface = "bg-white dark:bg-stone-900";
export const surfaceSunken = "bg-stone-50 dark:bg-stone-950";
export const hairline = "border-stone-200 dark:border-stone-800";

export const card = `${surface} border ${hairline} ${RADIUS_CARD}`;

export const heading = "font-body font-semibold tracking-tight text-stone-900 dark:text-stone-50";
export const mutedText = "text-stone-500 dark:text-stone-400";
export const faintText = "text-stone-400 dark:text-stone-500";

export const labelClass = "font-body text-[13px] font-medium text-stone-700 dark:text-stone-300";

// Exported under its historical name too: FormField re-exports `inputClass`,
// which now/SectionEditors.js, now/AutofillPreview.js and now/NowMonthEditor.js
// all import.
export const inputClass = `w-full px-3 py-2 ${surface} border border-stone-300 dark:border-stone-700 ${RADIUS} text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${focusRing}`;
