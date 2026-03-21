import React from 'react';

const Footer = () => (
  <footer className="w-full border-t border-stone-200/40 dark:border-stone-800/40 bg-stone-100 dark:bg-stone-900">
    <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 gap-6 max-w-7xl mx-auto">
      <div className="font-label text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400">
        © {new Date().getFullYear()} sanket tambare. Built with intentionality.
      </div>
      <div className="flex gap-8">
        <a href="mailto:contact@sankettambare.com" className="font-label text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-600 transition-colors hover:underline decoration-orange-700 underline-offset-4">Mail</a>
        <a href="https://github.com/daredavil01" target="_blank" rel="noopener noreferrer" className="font-label text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-600 transition-colors hover:underline decoration-orange-700 underline-offset-4">GitHub</a>
        <a href="https://linkedin.com/in/sankettambare" target="_blank" rel="noopener noreferrer" className="font-label text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-600 transition-colors hover:underline decoration-orange-700 underline-offset-4">LinkedIn</a>
        <a href="https://instagram.com/sanket.tambare" target="_blank" rel="noopener noreferrer" className="font-label text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-600 transition-colors hover:underline decoration-orange-700 underline-offset-4">Instagram</a>
      </div>
    </div>
  </footer>
);

export default Footer;
