import React from "react";
import { Link } from "react-router-dom";
import { typeColors } from "./constants";

// Clickable cards use div[role="button"] like the rest of the site (see
// OneHundredDays.js). That began as a workaround for the legacy HTML5UP CSS,
// which force-styled bare <button>; the stylesheet is gone, so these can become
// real buttons whenever someone sweeps the pattern.
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const PostCard = ({ post, onOpen }) => {
  const body = post.text || post.title || "";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={keyActivate(() => onOpen(post))}
      className="text-left bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-5 cursor-pointer hover:border-secondary/40 hover:shadow-md transition-all group flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">{post.date}</span>
        <div className="flex items-center gap-2">
          <span
            className={`font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
              typeColors[post.postType] || "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
            }`}
          >
            {post.postType}
          </span>
          <Link
            to={`/micro-blog/${post.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-label text-[10px] text-stone-300 dark:text-stone-600 hover:text-secondary dark:hover:text-secondary transition-colors leading-none"
            title="Permalink"
          >
            ↗
          </Link>
        </div>
      </div>

      {post.imageUrl && (
        <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-40 object-cover rounded-lg" />
      )}

      {body ? (
        <p className="font-body text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line line-clamp-4 mb-0 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">
          {body}
        </p>
      ) : (
        <p className="font-body text-sm italic text-stone-400 dark:text-stone-500 mb-0">Photo post</p>
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-1">
          {post.tags.slice(0, 6).map((tag) => (
            <span key={tag} className="font-label text-[9px] text-stone-400 dark:text-stone-500">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostCard;
