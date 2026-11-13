import React from "react";
import { Link } from "react-router-dom";
import ContactIcons from "../Contact/ContactIcons";
import { IDENTITY } from "../../data/identity";

// Shown on "/" and "/about" only (see layouts/Main.js). The bio is the one in
// src/data/identity.js, so it says what the JSON-LD and the crawler say.
const SideBar = () => (
  <section className="hidden lg:flex lg:w-80 lg:min-w-80 flex-shrink-0 flex-col gap-8 lg:sticky lg:top-24 self-start">
    {/* Intro Section */}
    <section className="flex flex-col gap-4">
      <Link to="/" className="w-16 h-16 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-800 hover:scale-105 transition-transform">
        <img src="/images/me.jpg" alt="Sanket Tambare" className="w-full h-full object-cover" />
      </Link>
      <header>
        <h2 className="text-2xl font-headline font-bold text-stone-900 dark:text-stone-100">Sanket Tambare</h2>
        <p className="text-sm font-label text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors italic">
          <a href="mailto:sanket.tambare01@gmail.com">
            sanket.tambare01@gmail.com
          </a>
        </p>
      </header>
    </section>

    {/* About / Blurb Section */}
    <section className="space-y-4 pt-8 border-t border-stone-100 dark:border-stone-800">
      <h2 className="text-xs uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">About</h2>
      <p className="text-sm font-body leading-relaxed text-stone-600 dark:text-stone-400">
        {IDENTITY.bio}
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          to="/resume"
          className="inline-block px-6 py-2 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-label text-xs uppercase tracking-widest font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-950 transition-all rounded-sm"
        >
          Resume
        </Link>
        <a
          href="https://flowcv.com/resume/4wn6onnkg9"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2 bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-950 border border-stone-900 dark:border-stone-200 font-label text-xs uppercase tracking-widest font-bold hover:bg-stone-800 dark:hover:bg-stone-300 transition-all rounded-sm"
        >
          <span className="material-symbols-outlined text-[14px]">download</span>
          Resume PDF
        </a>
      </div>
    </section>

    {/* Footer / Contact Section */}
    <section className="pt-8 border-t border-stone-100 dark:border-stone-800 mt-auto">
      <ContactIcons />
      <p className="mt-4 text-[10px] uppercase tracking-widest font-bold text-stone-300 dark:text-stone-600">
        &copy; Sanket Tambare <Link to="/" className="hover:text-secondary">sankettambare.in</Link>
      </p>
    </section>
  </section>
);

export default SideBar;
