import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import routes from "../../data/routes";
import Hamburger from "./Hamburger";

const Navigation = () => {
  const location = useLocation();
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // Track which item's dropdown is open
  
  const indexRoute = routes.find((l) => l.index);
  const mainRoutes = routes.filter((l) => !l.index && !l.dropdown);
  const dropdownRoutes = routes.filter((l) => l.dropdown);

  return (
    <header className="fixed top-0 w-full z-50 bg-white dark:bg-stone-950 border-b border-stone-100 dark:border-stone-900 shadow-sm transition-colors duration-300">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1400px] mx-auto">
        <Link to={indexRoute ? indexRoute.path : "/"} className="text-lg font-headline font-bold text-stone-900 dark:text-stone-50 tracking-[0.2em] uppercase no-underline">
          {indexRoute ? indexRoute.label : "Sanket Tambare"}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center">
          {mainRoutes.map((l) => {
            const isActive = location.pathname.includes(l.path) && l.path !== "/";
            const hasSubRoutes = l.subRoutes && l.subRoutes.length > 0;
            
            return (
              <React.Fragment key={l.label}>
                <div 
                  className="relative group"
                  onMouseEnter={() => hasSubRoutes && setOpenDropdown(l.label)}
                  onMouseLeave={() => hasSubRoutes && setOpenDropdown(null)}
                >
                  <Link
                    to={l.path}
                    className={`px-4 py-2 font-label text-[10px] uppercase tracking-[0.25em] no-underline transition-colors flex items-center gap-1 ${
                      isActive
                        ? "text-secondary font-bold"
                        : "text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                    }`}
                  >
                    {l.label}
                    {hasSubRoutes && (
                      <span className={`material-symbols-outlined text-[12px] transition-transform duration-200 ${openDropdown === l.label ? 'rotate-180' : ''}`}>expand_more</span>
                    )}
                  </Link>

                  {/* Nested Dropdown */}
                  {hasSubRoutes && (
                    <div className={`absolute top-full left-0 mt-0 w-48 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-xl overflow-hidden transition-all duration-200 origin-top ${
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
                <span className="text-stone-200 dark:text-stone-800 last:hidden">|</span>
              </React.Fragment>
            );
          })}

          {/* More Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setIsMoreDropdownOpen(true)}
            onMouseLeave={() => setIsMoreDropdownOpen(false)}
          >
            <span className="text-stone-200 dark:text-stone-800 ml-4 mr-0">|</span>
            <button
              className={`px-4 py-2 font-label text-[10px] uppercase tracking-[0.25em] no-underline transition-colors flex items-center gap-1 ${
                isMoreDropdownOpen ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
              }`}
            >
              More
              <span className={`material-symbols-outlined text-[12px] transition-transform duration-200 ${isMoreDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {/* Dropdown Menu */}
            <div className={`absolute top-full right-0 mt-0 w-48 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-xl overflow-hidden transition-all duration-200 origin-top ${
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
