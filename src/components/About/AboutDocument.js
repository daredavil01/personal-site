import React from "react";
import Markdown from "markdown-to-jsx";

const AboutDocument = ({ markdown, count }) => {
  return (
    <div className="flex flex-col gap-12 w-full max-w-3xl mx-auto">
      <header className="mb-4">
        <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary mb-4">Sanket Tambare</p>
        <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 leading-[0.9] tracking-tighter mb-6">
          About Me.
        </h1>
        <p className="font-label text-sm text-stone-400 italic block">
          (in about {count} words)
        </p>
      </header>
      <div className="bg-secondary/[0.03] border border-secondary/10 p-8 md:p-12 rounded-xl">
        <article className="prose prose-stone prose-lg font-body leading-relaxed text-stone-600 w-full max-w-none">
          <Markdown>{markdown}</Markdown>
        </article>
      </div>
    </div>
  );
};

export default AboutDocument;
