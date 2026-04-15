import React from "react";
import { Link } from "react-router-dom";
import Main from "../layouts/Main";

const PageNotFound = () => (
  <Main
    title="404 Not Found"
    description="The page you are looking for cannot be found. Return to the homepage."
  >
    <article className="flex flex-col gap-8 w-full">
      <header>
        <span className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-4 block">Error 404</span>
        <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-6">
          Page Not Found.
        </h1>
        <p className="font-body text-lg text-stone-500 dark:text-stone-400 max-w-xl leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </header>
      <div>
        <Link
          to="/"
          className="inline-block px-8 py-3 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-950 transition-all rounded-sm no-underline"
        >
          Return Home
        </Link>
      </div>
    </article>
  </Main>
);

export default PageNotFound;
