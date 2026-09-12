import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import routes from "../../data/routes";
import Hamburger from "./Hamburger";
import Logo from "./Logo";

// Anything served out of /public is a real document, not a route — React Router
// would try to match it client-side and render the 404 page.
const NavLink = ({ route, className, children }) => (route.external ? (
  <a href={route.path} className={className}>{children}</a>
) : (
  <Link to={route.path} className={className}>{children}</Link>
));

NavLink.propTypes = {
  route: PropTypes.shape({ path: PropTypes.string, external: PropTypes.bool }).isRequired,
  className: PropTypes.string,
  children: PropTypes.node,
};
NavLink.defaultProps = { className: "", children: null };

const Navigation = () => {
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null); // Track which item's dropdown is open

  const indexRoute = routes.find((l) => l.index);
  const mainRoutes = routes.filter((l) => !l.index && !l.footerOnly);

  // A group is "current" when any of its children is. Without this, grouping
  // the nav would mean nothing in the bar ever highlights — the bar would stop
  // telling you where you are.
  const isCurrent = (l) => {
    const hit = (p) => p !== "/" && !p.includes(".") && location.pathname.startsWith(p);
    return hit(l.path) || (l.subRoutes ?? []).some((sub) => hit(sub.path));
  };

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
        <nav aria-label="Primary" className="hidden md:flex items-center">
          {mainRoutes.map((l, idx) => {
            const isActive = isCurrent(l);
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
                  <NavLink
                    route={l}
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
                  </NavLink>

                  {/* Nested Dropdown */}
                  {hasSubRoutes && (
                    <div className={`absolute top-full left-0 mt-0 w-48 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 shadow-2xl overflow-hidden transition-all duration-300 origin-top rounded-b-xl ${
                      openDropdown === l.label ? "opacity-100 scale-y-100 visible" : "opacity-0 scale-y-95 invisible"
                    }`}
                    >
                      <div className="py-2">
                        {l.subRoutes.map((sub) => {
                          const isSubActive = location.pathname === sub.path;
                          return (
                            <NavLink
                              key={sub.label}
                              route={sub}
                              className={`block px-6 py-3 font-label text-[10px] uppercase tracking-[0.25em] no-underline transition-colors border-b border-stone-50 last:border-0 dark:border-stone-800/50 ${
                                isSubActive
                                  ? "text-secondary bg-stone-50 dark:bg-stone-800/50"
                                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                              }`}
                            >
                              {sub.label}
                            </NavLink>
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
