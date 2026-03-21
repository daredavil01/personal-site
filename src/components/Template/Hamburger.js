import React, { Suspense, lazy, useState } from 'react';

import { Link } from 'react-router-dom';
import routes from '../../data/routes';

const Menu = lazy(() => import('react-burger-menu/lib/menus/slide'));

const Hamburger = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="hamburger-container">
      <nav className="main" id="hambuger-nav">
        <ul>
          {open ? (
            <li className="menu close-menu">
              <div onClick={() => setOpen(!open)} className="menu-hover">&#10005;</div>
            </li>
          ) : (
            <li className="menu open-menu">
              <div onClick={() => setOpen(!open)} className="menu-hover">&#9776;</div>
            </li>
          )}
        </ul>
      </nav>
      <Suspense fallback={<></>}>
        <Menu right isOpen={open}>
          <ul className="hamburger-ul">
            {routes.map((l) => (
              <React.Fragment key={l.label}>
                <li>
                  <Link to={l.path} onClick={() => setOpen(false)}>
                    <h3 className={l.index && 'index-li'}>{l.label}</h3>
                  </Link>
                </li>
                {l.subRoutes && l.subRoutes.map((sub) => (
                  <li key={sub.label} className="pl-6">
                    <Link to={sub.path} onClick={() => setOpen(false)}>
                      <p className="text-stone-400 text-xs py-2 uppercase tracking-widest">{sub.label}</p>
                    </Link>
                  </li>
                ))}
              </React.Fragment>
            ))}
          </ul>
        </Menu>
      </Suspense>
    </div>
  );
};

export default Hamburger;
