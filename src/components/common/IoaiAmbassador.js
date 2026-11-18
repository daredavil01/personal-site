import React from "react";

const IOAI_URL = "https://theinstituteofai.co.uk/r/san-tam";

// The Institute of AI ambassador card, shown on the homepage and /about.
const IoaiAmbassador = ({ className = "" }) => (
  <section
    aria-labelledby="ioai-h"
    className={`flex flex-col gap-6 p-6 md:p-8 border border-stone-200 dark:border-stone-800 rounded-xl ${className}`}
  >
    <a href={IOAI_URL} target="_blank" rel="noopener noreferrer" className="block w-full max-w-sm">
      <img
        src="/images/ioai-ambassador.png"
        alt="The Institute of AI — AI Ambassador badge"
        width="1080"
        height="360"
        loading="lazy"
        className="w-full h-auto rounded-lg bg-white"
      />
    </a>
    <div className="min-w-0">
      <p className="font-label text-xs uppercase tracking-widest font-bold text-stone-500 dark:text-stone-400 mb-1">
        AI Ambassador, the Institute of AI (IoAI)
      </p>
      <h2 id="ioai-h" className="font-headline text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
        Exploring AI, or already using it?
      </h2>
      <p className="font-body text-stone-600 dark:text-stone-300 mb-2">
        I&apos;d love to hear your questions and experiences. As an AI Ambassador
        for IoAI, an independent UK-based professional body for AI, I can point
        you to learning resources, events and information about Professional and
        Organisation Accreditation — a practical project, AI governance, or the
        standards behind Accreditation.
      </p>
      <p className="font-body text-stone-500 dark:text-stone-400 mb-4">
        What would help you put AI to use and develop your practice, and what
        would you like to share?
      </p>
      <a
        href={IOAI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center min-h-[44px] px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 font-label text-xs uppercase tracking-widest font-bold hover:bg-secondary dark:hover:bg-secondary dark:hover:text-white transition-colors rounded-sm no-underline"
      >
        Explore IoAI
      </a>
    </div>
  </section>
);

export default IoaiAmbassador;
