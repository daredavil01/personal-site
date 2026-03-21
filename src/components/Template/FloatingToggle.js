import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const FloatingToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-[100] p-4 rounded-full bg-stone-900 dark:bg-stone-50 text-stone-50 dark:text-stone-900 shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group flex items-center justify-center border border-stone-200/10"
      aria-label="Toggle Dark Mode"
    >
      <span className="material-symbols-outlined text-2xl transition-transform duration-500 group-hover:rotate-12">
        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-label text-[10px] uppercase tracking-widest ml-0 group-hover:ml-2 font-bold opacity-0 group-hover:opacity-100">
        {theme === 'dark' ? 'Light View' : 'Dark View'}
      </span>
    </button>
  );
};

export default FloatingToggle;
