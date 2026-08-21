import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { useWorld } from "../../atlas/world/WorldContext";
import useViewMode from "../../atlas/useViewMode";
import atlasEvent from "../../atlas/lib/atlasEvent";

// Floating action buttons (bottom right) for the classic shell:
//   1. "Enter the Atlas" — the way back INTO the gamified world. The passport
//      offers "Switch to Classic"; this button is its mirror and the only
//      in-classic affordance that returns a visitor to the atlas (§4.4).
//      Setting the stored view outranks the reduced-motion default, so it
//      works even for a visitor who was auto-routed to classic.
//   2. The light/dark theme toggle.
// The old "Get Started" joyride tour that lived here was retired with the
// Wanderer's Atlas guide (atlas mode has GuideAvatar; classic view is the
// simplicity hatch and gets no tour).
// `showAtlasSwitch={false}` keeps only the theme toggle — the admin dashboard
// uses it so no map/atlas affordance renders over the editing UI.
const FloatingToggle = ({ showAtlasSwitch = true }) => {
  const { theme, toggleTheme } = useTheme();
  const { setView } = useWorld();
  const mode = useViewMode();

  const buttonCls = "p-4 rounded-full bg-stone-900 dark:bg-stone-50 text-stone-50 dark:text-stone-900 shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group flex items-center justify-center border border-stone-200/10";
  const labelCls = "max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-label text-[10px] uppercase tracking-widest ml-0 group-hover:ml-2 font-bold opacity-0 group-hover:opacity-100";

  const enterAtlas = () => {
    atlasEvent("atlas_view_switch", { to: "atlas" });
    setView("atlas");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {/* Guard against the transient <Main/> Suspense fallback rendering this
          while an atlas page is still loading. */}
      {showAtlasSwitch && mode === "classic" && (
        <button
          type="button"
          onClick={enterAtlas}
          className="p-4 rounded-full bg-gradient-to-br from-sky-600 to-emerald-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group flex items-center justify-center border border-white/10"
          aria-label="Enter the Wanderer's Atlas"
        >
          <span className="material-symbols-outlined text-2xl transition-transform duration-500 group-hover:rotate-12">
            explore
          </span>
          <span className={labelCls}>Enter the Atlas</span>
        </button>
      )}

      <button
        type="button"
        onClick={toggleTheme}
        className={buttonCls}
        aria-label="Toggle Dark Mode"
      >
        <span className="material-symbols-outlined text-2xl transition-transform duration-500 group-hover:rotate-12">
          {theme === "dark" ? "light_mode" : "dark_mode"}
        </span>
        <span className={labelCls}>{theme === "dark" ? "Light View" : "Dark View"}</span>
      </button>
    </div>
  );
};

export default FloatingToggle;
