import React from "react";
import { Link } from "react-router-dom";

import Hamburger from "./Hamburger";
import routes from "../../data/routes";
import challenges from "../../data/challenges";

// Websites Navbar, displays routes defined in 'src/data/routes'
const Navigation = () => {
  const primaryRoutes = routes.filter((l) => !l.index && !l.dropdown);
  const dropdownRoutes = routes.filter((l) => !l.index && l.dropdown);

  return (
    <header id="header">
      <h1 className="index-link">
        {routes
          .filter((l) => l.index)
          .map((l) => (
            <Link key={l.label} to={l.path}>
              {l.label}
            </Link>
          ))}
      </h1>
      <nav className="links">
        <ul>
          {primaryRoutes.map((l) => {
            if (l.label === "Challenges") {
              return (
                <li key={l.label} className="dropdown">
                  <Link to={l.path}>{l.label}</Link>
                  <ul className="dropdown-menu">
                    {challenges.map((c) => (
                      <li key={c.id}>
                        <Link to={c.route}>{c.challenge_name}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }
            return (
              <li key={l.label}>
                <Link to={l.path}>{l.label}</Link>
              </li>
            );
          })}
          {dropdownRoutes.length > 0 && (
            <li className="dropdown">
              <span>More</span>
              <ul className="dropdown-menu">
                {dropdownRoutes.map((l) => (
                  <li key={l.label}>
                    <Link to={l.path}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      </nav>
      <Hamburger />
    </header>
  );
};

export default Navigation;
