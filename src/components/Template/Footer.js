import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import routes from "../../data/routes";

// The footer is the site map. The top bar was cut to five grouped entries, so
// this is where the whole site stays visible — every route, under the same
// headings the nav uses, from one source (data/routes.js) so the two can't
// drift apart.

const linkClass = "font-body text-xs text-stone-500 dark:text-stone-400 hover:text-secondary dark:hover:text-secondary transition-colors no-underline";

const socialClass = "font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-secondary dark:hover:text-secondary transition-colors hover:underline decoration-secondary underline-offset-4";

// Where the writing actually lives comes before where the photos do — the two
// blog platforms are the point of the site, so Instagram's profile link gave
// way to them. (The /instagram *page*, which archives the posts, is untouched
// and still sits under Play.)
const SOCIALS = [
  { label: "Mail", href: "mailto:contact@sankettambare.com" },
  { label: "Substack", href: "https://sankettambare.substack.com" },
  { label: "WordPress", href: "https://daredavil453624413.wordpress.com" },
  { label: "GitHub", href: "https://github.com/daredavil01" },
  { label: "LinkedIn", href: "https://linkedin.com/in/sankettambare" },
  { label: "Card", href: "https://card.sankettambare.in/" },
  { label: "LinkTree", href: "https://linktr.ee/daredavil" },
];

const FooterLink = ({ route }) => (route.external ? (
  <a href={route.path} className={linkClass}>{route.label}</a>
) : (
  <Link to={route.path} className={linkClass}>{route.label}</Link>
));

FooterLink.propTypes = {
  route: PropTypes.shape({
    label: PropTypes.string,
    path: PropTypes.string,
    external: PropTypes.bool,
  }).isRequired,
};

const Footer = () => {
  const groups = routes.filter((r) => !r.index && r.subRoutes?.length);
  const loose = routes.filter((r) => !r.index && !r.subRoutes?.length);

  return (
    <footer className="w-full border-t border-stone-200/40 dark:border-stone-800/40 bg-stone-100 dark:bg-stone-900">
      <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col gap-10">
        <nav aria-label="Site map" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-3 font-label text-[10px] uppercase tracking-widest text-stone-700 dark:text-stone-300 font-bold">
                {group.label}
              </p>
              <ul className="list-none pl-0 m-0 flex flex-col gap-2">
                {group.subRoutes.map((sub) => (
                  <li key={sub.label}><FooterLink route={sub} /></li>
                ))}
              </ul>
            </div>
          ))}

          {/* Anything with no group of its own — About today. */}
          {loose.length > 0 && (
            <div>
              <p className="mb-3 font-label text-[10px] uppercase tracking-widest text-stone-700 dark:text-stone-300 font-bold">
                Site
              </p>
              <ul className="list-none pl-0 m-0 flex flex-col gap-2">
                <li><Link to="/" className={linkClass}>Home</Link></li>
                {loose.map((route) => (
                  <li key={route.label}><FooterLink route={route} /></li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-stone-200/60 dark:border-stone-800/60">
          <div className="font-label text-xs uppercase tracking-widest text-stone-600 dark:text-stone-400">
            {`© ${new Date().getFullYear()} sanket tambare. Built with intentionality.`}
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {SOCIALS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                className={socialClass}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
