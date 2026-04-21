import React from 'react';
import NowSectionHeader from './NowSectionHeader';

const platformColors = {
  Substack: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  WordPress: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  Blogger: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
};

const NowBlogsSection = ({ blogs }) => {
  if (!blogs?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Blogs Published" icon="article" />
      <ul className="space-y-4">
        {blogs.map((blog, i) => (
          <li
            key={i}
            className="pl-4 border-l-2 border-secondary/30 hover:border-secondary transition-colors"
          >
            <div className="flex items-start gap-2 flex-wrap">
              {blog.url ? (
                <a
                  href={blog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm font-semibold text-stone-800 dark:text-stone-200 hover:text-secondary dark:hover:text-secondary transition-colors"
                >
                  {blog.title}
                </a>
              ) : (
                <span className="font-body text-sm font-semibold text-stone-800 dark:text-stone-200">
                  {blog.title}
                </span>
              )}
              {blog.wip && (
                <span className="font-label text-[9px] uppercase tracking-widest bg-secondary/10 text-secondary px-1.5 py-0.5 rounded self-center">
                  In progress
                </span>
              )}
              {blog.platform && (
                <span
                  className={`font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded self-center ${
                    platformColors[blog.platform] || 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                  }`}
                >
                  {blog.platform}
                </span>
              )}
            </div>
            {blog.description && (
              <p className="font-body text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                {blog.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NowBlogsSection;
