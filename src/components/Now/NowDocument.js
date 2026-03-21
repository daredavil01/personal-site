import React from 'react';
import Markdown from 'markdown-to-jsx';

const NowDocument = ({ content }) => {
  return (
    <article className="prose prose-stone max-w-none mt-16 w-full">
      <div className="bg-secondary/[0.03] border border-secondary/10 p-8 md:p-12 rounded-xl">
        <Markdown
          options={{
            overrides: {
              h1: { component: 'h1', props: { className: 'font-headline text-4xl font-bold mb-6 text-stone-900' } },
              h2: { component: 'h2', props: { className: 'font-headline text-2xl font-bold mt-12 mb-4 text-stone-800 border-b border-stone-100 pb-2' } },
              h3: { component: 'h3', props: { className: 'font-headline text-xl font-bold mt-8 mb-3 text-stone-800' } },
              p: { component: 'p', props: { className: 'font-body text-base text-stone-500 leading-relaxed mb-6' } },
              ul: { component: 'ul', props: { className: 'list-disc list-inside space-y-2 mb-6 text-stone-500 marker:text-secondary' } },
              li: { component: 'li', props: { className: 'font-body text-base' } },
              a: { component: 'a', props: { className: 'text-secondary hover:underline underline-offset-4 transition-all' } },
              strong: { component: 'strong', props: { className: 'font-bold text-stone-900' } },
              em: { component: 'em', props: { className: 'italic text-stone-700' } },
              blockquote: { component: 'blockquote', props: { className: 'border-l-4 border-secondary pl-4 italic my-6 text-stone-500 bg-stone-50 p-4 rounded-r' } },
              hr: { component: 'hr', props: { className: 'border-stone-100 my-10' } },
              code: { component: 'code', props: { className: 'bg-stone-100 text-secondary px-1.5 py-0.5 rounded text-sm font-mono' } },
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    </article>
  );
};

export default NowDocument;
