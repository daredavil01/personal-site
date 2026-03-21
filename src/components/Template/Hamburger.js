import React, { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router-dom';
import routes from '../../data/routes';

const Menu = lazy(() => import('react-burger-menu/lib/menus/slide'));

const Hamburger = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <nav className="flex items-center">
        <button 
          onClick={() => setOpen(!open)}
          className="p-2 text-stone-600 dark:text-stone-400 hover:text-secondary dark:hover:text-secondary transition-colors"
          aria-label="Toggle Menu"
        >
          <span className="material-symbols-outlined text-2xl">
            {open ? 'close' : 'menu'}
          </span>
        </button>
      </nav>

      <Suspense fallback={<></>}>
        <Menu 
          right 
          isOpen={open} 
          onStateChange={({ isOpen }) => setOpen(isOpen)}
          styles={{
            bmMenuWrap: {
              transition: 'all 0.4s cubic-bezier(0.7, 0, 0.3, 1)',
              top: '0',
            },
            bmMenu: {
              background: 'rgb(28, 25, 23)', // stone-900 match
              padding: '2.5em 1.5em 0',
              fontSize: '1.15em',
            },
            bmItemList: {
              color: '#b8b7ad',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            },
            bmOverlay: {
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
            }
          }}
        >
          <div className="flex flex-col gap-6 py-8 outline-none">
            {routes.map((l) => (
              <div key={l.label}>
                <Link 
                  to={l.path} 
                  onClick={() => setOpen(false)}
                  className="block group"
                >
                  <h3 className={`text-stone-100 font-headline font-bold text-lg uppercase tracking-widest group-hover:text-secondary transition-colors ${l.index ? '' : 'pt-4 border-t border-stone-800'}`}>
                    {l.label}
                  </h3>
                </Link>
                {l.subRoutes && (
                  <div className="mt-2 flex flex-col gap-2">
                    {l.subRoutes.map((sub) => (
                      <Link 
                        key={sub.label} 
                        to={sub.path} 
                        onClick={() => setOpen(false)}
                        className="pl-4 block text-[10px] uppercase tracking-[0.2em] font-bold text-stone-500 hover:text-secondary transition-colors py-1"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Menu>
      </Suspense>
    </div>
  );
};

export default Hamburger;
