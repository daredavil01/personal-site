import React from 'react';
import { Link } from 'react-router-dom';
import NowSectionHeader from './NowSectionHeader';

// Micro-posts pulled into a Now month, rendered as small cards rather than the
// list rows the other sections use — they are short, self-contained scraps, and
// a card each reads closer to how they appear on the archive wall.

const TYPE_LABEL = { text: 'Note', quote: 'Quote', photo: 'Photo' };

const CardBody = ({ post }) => (
  <>
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-label text-[9px] uppercase tracking-widest bg-secondary/[0.08] text-secondary px-1.5 py-0.5 rounded font-bold">
        {TYPE_LABEL[post.postType] || 'Note'}
      </span>
      {post.date && (
        <span className="font-label text-[10px] text-stone-400 dark:text-stone-500">
          {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )}
    </div>

    {post.imageUrl && (
      <img
        src={post.imageUrl}
        alt={post.title || 'Micro post'}
        loading="lazy"
        className="w-full h-32 object-cover rounded-md mt-2"
      />
    )}

    {post.title && (
      <p className="font-body text-sm font-semibold text-stone-800 dark:text-stone-200 mt-2 mb-0 line-clamp-2">
        {post.title}
      </p>
    )}

    {post.text && (
      <p
        className={`font-body text-xs text-stone-500 dark:text-stone-400 leading-relaxed mt-1 mb-0 line-clamp-4 ${
          post.postType === 'quote' ? 'italic' : ''
        }`}
      >
        {post.postType === 'quote' ? `“${post.text}”` : post.text}
      </p>
    )}

    {post.tags?.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {post.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="font-label text-[9px] uppercase tracking-wider text-stone-400 dark:text-stone-500"
          >
            #{tag}
          </span>
        ))}
      </div>
    )}
  </>
);

const cardClass = 'flex flex-col h-full p-3 rounded-lg border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/30';

const NowMicroSection = ({ micro }) => {
  if (!micro?.length) return null;
  return (
    <div>
      <NowSectionHeader label="Micro Posts" icon="forum" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {micro.map((post, i) => (
          // Manually-added rows have no archive id, so they render unlinked.
          post.id ? (
            <Link
              key={post.id}
              to={`/micro-blog/${post.id}`}
              className={`${cardClass} no-underline hover:border-secondary/40 transition-colors`}
            >
              <CardBody post={post} />
            </Link>
          ) : (
            // eslint-disable-next-line react/no-array-index-key
            <div key={`local-${i}`} className={cardClass}>
              <CardBody post={post} />
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default NowMicroSection;
