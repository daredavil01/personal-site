import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const SECTION_LABELS = {
  dashboard: 'Dashboard',
  now: 'Now Page',
  books: 'Books',
  sports: 'Sports',
  treks: 'Treks',
  projects: 'Projects',
  hundreddays: '100 Days',
  instagram: 'Instagram',
  positions: 'Resume — Positions',
  degrees: 'Resume — Degrees',
  skills: 'Resume — Skills',
  certifications: 'Resume — Certifications',
  integrations: 'Integrations',
};

const AdminNav = ({ section, onNavigate, onLogout }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    onLogout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="font-headline text-lg text-stone-900 dark:text-stone-100 hover:text-secondary transition-colors"
        >
          ST Admin
        </button>
        {section !== 'dashboard' && (
          <>
            <span className="text-stone-300 dark:text-stone-600">/</span>
            <span className="font-label text-sm text-stone-500 dark:text-stone-400 uppercase tracking-widest">
              {SECTION_LABELS[section] ?? section}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle light/dark mode"
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors text-lg leading-none"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="font-label text-xs uppercase tracking-widest text-stone-400 hover:text-red-400 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default AdminNav;
