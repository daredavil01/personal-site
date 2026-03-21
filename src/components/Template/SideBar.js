import React from "react";
import { Link } from "react-router-dom";
import ContactIcons from "../Contact/ContactIcons";

const { PUBLIC_URL } = process.env;

const SideBar = () => (
  <section className="md:w-80 md:min-w-80 flex-shrink-0 flex flex-col gap-8 md:sticky md:top-24 self-start">
    {/* Intro Section */}
    <section className="flex flex-col gap-4">
      <Link to="/" className="w-16 h-16 rounded-full overflow-hidden border-2 border-stone-200 dark:border-stone-800 hover:scale-105 transition-transform">
        <img src={`${PUBLIC_URL}/images/me.jpg`} alt="Sanket Tambare" className="w-full h-full object-cover" />
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
        Hi, I&apos;m Sanket. I like to build things. I am a software developer
        specialized in full stack development and data analysis. Currently, I am
        working as a software developer at{" "}
        <a href="https://www.linkedin.com/company/bridgenext/" className="text-secondary hover:underline">
          Bridgenext India Pvt Ltd
        </a>
        . I am also interested in blogging, design, and digital wellbeing.
      </p>
      <div className="flex flex-wrap gap-4">
        {!window.location.pathname.includes("/resume") ? (
          <Link 
            to="/resume" 
            className="inline-block px-6 py-2 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-950 transition-all rounded-sm"
          >
            Know more
          </Link>
        ) : (
          <Link 
            to="/about" 
            className="inline-block px-6 py-2 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-950 transition-all rounded-sm"
          >
            About Me
          </Link>
        )}
        <a 
          href={`${process.env.PUBLIC_URL || ''}/sanket-tambare-resume.pdf`} 
          target="_blank"
          download
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2 bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-950 border border-stone-900 dark:border-stone-200 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-800 dark:hover:bg-stone-300 transition-all rounded-sm"
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
        &copy; Sanket Tambare <Link to="/" className="hover:text-secondary">daredavil01.com</Link>
      </p>
    </section>
  </section>
);

export default SideBar;
