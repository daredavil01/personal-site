import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import routes from '../../data/routes';
import contactData from '../../data/contact';

const Hamburger = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const allRoutes = routes.filter((r) => !r.index);

  // Portal content — rendered directly into document.body to escape
  // the header's backdrop-filter containing block which would otherwise
  // trap fixed-position children within the header's bounds.
  const drawerPortal = ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* Slide-in drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-64 z-[201] bg-stone-950 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <span className="font-headline text-white uppercase tracking-[0.2em] text-sm font-bold">Menu</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-stone-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col px-4 py-4 gap-0.5 flex-grow">
          {allRoutes.map((l) => {
            const isActive = location.pathname === l.path
              || (location.pathname.startsWith(l.path) && l.path !== '/');
            return (
              <div key={l.label}>
                <Link
                  to={l.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between py-3 px-3 rounded-lg font-label text-sm uppercase tracking-widest font-bold transition-colors ${
                    isActive
                      ? 'text-secondary bg-secondary/10'
                      : 'text-stone-200 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  {l.label}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                </Link>
                {l.subRoutes && (
                  <div className="ml-4 mb-1 flex flex-col gap-0.5">
                    {l.subRoutes.map((sub) => {
                      const isSubActive = location.pathname === sub.path;
                      return (
                        <Link
                          key={sub.label}
                          to={sub.path}
                          onClick={() => setOpen(false)}
                          className={`block py-2 px-3 rounded font-label text-xs uppercase tracking-widest transition-colors ${
                            isSubActive ? 'text-secondary' : 'text-stone-400 hover:text-white'
                          }`}
                        >
                          ↳ {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Contact section */}
        <div className="shrink-0 px-5 py-5 border-t border-stone-800">
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 mb-3">Connect</p>
          <div className="flex flex-wrap gap-3 mb-4">
            {contactData.map((s) => (
              <a
                key={s.label}
                href={s.link}
                aria-label={s.label}
                title={s.label}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-stone-700 text-stone-400 hover:text-secondary hover:border-secondary transition-all"
              >
                <FontAwesomeIcon icon={s.icon} size="sm" />
              </a>
            ))}
          </div>
          <a
            href={`${process.env.PUBLIC_URL || ''}/sanket-tambare-resume.pdf`}
            target="_blank"
            download
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-stone-200 rounded font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-700 transition-all"
          >
            <span className="material-symbols-outlined text-[13px]">download</span>
            Resume PDF
          </a>
        </div>
      </div>
    </>,
    document.body,
  );

  return (
    <>
      {/* Hamburger button — stays inside the header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-stone-600 dark:text-stone-400 hover:text-secondary transition-colors"
        aria-label="Toggle Menu"
      >
        <span className="material-symbols-outlined text-2xl">
          {open ? 'close' : 'menu'}
        </span>
      </button>

      {/* Drawer + backdrop rendered into document.body via portal */}
      {drawerPortal}
    </>
  );
};

export default Hamburger;
