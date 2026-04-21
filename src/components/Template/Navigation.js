import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import routes from "../../data/routes";
import Hamburger from "./Hamburger";
import Logo from "./Logo";

const Navigation = () => {
  const location = useLocation();
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // Track which item's dropdown is open
  
  const indexRoute = routes.find((l) => l.index);
  const mainRoutes = routes.filter((l) => !l.index && !l.dropdown);
  const dropdownRoutes = routes.filter((l) => l.dropdown);

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-100 dark:border-stone-900 shadow-sm transition-all duration-300">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1440px] mx-auto w-full">
        <Link to={indexRoute ? indexRoute.path : "/"} className="flex items-center gap-3 no-underline group">
          <Logo size={28} />
          <span className="text-lg font-headline font-bold text-stone-900 dark:text-stone-50 tracking-[0.2em] uppercase group-hover:text-secondary dark:group-hover:text-secondary transition-colors">
            {indexRoute ? indexRoute.label : "Sanket Tambare"}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center">
          {mainRoutes.map((l, idx) => {
            const isActive = location.pathname.includes(l.path) && l.path !== "/";
            const hasSubRoutes = l.subRoutes && l.subRoutes.length > 0;
            
            return (
              <React.Fragment key={l.label}>
                <div
                  className="relative group"
                  onMouseEnter={() => hasSubRoutes && setOpenDropdown(l.label)}
                  onMouseLeave={() => hasSubRoutes && setOpenDropdown(null)}
                  onFocus={() => hasSubRoutes && setOpenDropdown(l.label)}
                  onBlur={(e) => { if (hasSubRoutes && !e.currentTarget.contains(e.relatedTarget)) setOpenDropdown(null); }}
                  onKeyDown={(e) => { if (e.key === 'Escape') setOpenDropdown(null); }}
                >
                  <Link
                    to={l.path}
                    className={`px-4 py-2 font-label text-[10px] uppercase tracking-[0.25em] no-underline transition-all flex items-center gap-1 ${
                      isActive
                        ? "text-secondary font-bold"
                        : "text-stone-500 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                    }`}
                  >
                    {l.label}
                    {hasSubRoutes && (
                      <span className={`material-symbols-outlined text-[12px] transition-transform duration-300 ${openDropdown === l.label ? 'rotate-180' : ''}`}>expand_more</span>
                    )}
                  </Link>

                  {/* Nested Dropdown */}
                  {hasSubRoutes && (
                    <div className={`absolute top-full left-0 mt-0 w-48 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-2xl overflow-hidden transition-all duration-300 origin-top rounded-b-xl ${
                      openDropdown === l.label ? "opacity-100 scale-y-100 visible" : "opacity-0 scale-y-95 invisible"
                    }`}
                    >
                      <div className="py-2">
                        {l.subRoutes.map((sub) => {
                          const isSubActive = location.pathname.includes(sub.path);
                          return (
                            <Link
                              key={sub.label}
                              to={sub.path}
                              className={`block px-6 py-3 font-label text-[10px] uppercase tracking-[0.25em] no-underline transition-colors border-b border-stone-50 last:border-0 dark:border-stone-800/50 ${
                                isSubActive
                                  ? "text-secondary bg-stone-50 dark:bg-stone-800/50"
                                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {idx < mainRoutes.length - 1 && <span className="text-stone-100 dark:text-stone-800 pointer-events-none">|</span>}
              </React.Fragment>
            );
          })}

          {/* More Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setIsMoreDropdownOpen(true)}
            onMouseLeave={() => setIsMoreDropdownOpen(false)}
            onFocus={() => setIsMoreDropdownOpen(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsMoreDropdownOpen(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setIsMoreDropdownOpen(false); }}
          >
            <span className="text-stone-100 dark:text-stone-800 ml-4 pointer-events-none">|</span>
            <button
              aria-haspopup="true"
              aria-expanded={isMoreDropdownOpen}
              className={`px-4 py-2 font-label text-[10px] uppercase tracking-[0.25em] no-underline transition-all flex items-center gap-1 ${
                isMoreDropdownOpen ? "text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              More
              <span className={`material-symbols-outlined text-[12px] transition-transform duration-300 ${isMoreDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {/* Dropdown Menu */}
            <div className={`absolute top-full right-0 mt-0 w-48 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-2xl overflow-hidden transition-all duration-300 origin-top rounded-b-xl ${
              isMoreDropdownOpen ? "opacity-100 scale-y-100 visible" : "opacity-0 scale-y-95 invisible"
            }`}
            >
              <div className="py-2">
                {dropdownRoutes.map((l) => {
                  const isActive = location.pathname.includes(l.path);
                  return (
                    <Link
                      key={l.label}
                      to={l.path}
                      className={`block px-6 py-3 font-label text-[10px] uppercase tracking-[0.25em] no-underline transition-colors border-b border-stone-50 last:border-0 dark:border-stone-800/50 ${
                        isActive
                          ? "text-secondary bg-stone-50 dark:bg-stone-800/50"
                          : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                      }`}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
        
        {/* Mobile Hamburger Wrapper */}
        <div className="md:hidden block">
            <Hamburger />
        </div>
      </div>
    </header>
  );
};

export default Navigation;
