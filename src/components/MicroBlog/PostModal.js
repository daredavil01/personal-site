import React, { useEffect } from "react";

const sourceLabels = { tumblr: "Tumblr", instagram: "Instagram", manual: "Manual" };

const PostModal = ({ post, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!post) return null;
  const body = post.text || post.title || "";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-6 text-3xl text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors leading-none p-0 bg-transparent border-0 cursor-pointer"
        >
          &times;
        </button>

        <div className="flex items-center gap-2 mb-4 pr-8">
          <span className="font-mono text-xs text-stone-400 dark:text-stone-500">{post.date}</span>
          <span className="font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {post.postType}
          </span>
        </div>

        {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full rounded-lg mb-4" />}

        {body ? (
          <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line mb-6">
            {body}
          </p>
        ) : (
          <p className="font-body italic text-stone-400 dark:text-stone-500 mb-6">Photo post (no caption).</p>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-md text-xs border border-stone-100 dark:border-stone-800"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-stone-500 dark:text-stone-500 font-label uppercase tracking-widest pt-4 border-t border-stone-100 dark:border-stone-800 mb-0">
          <span className="font-bold text-stone-400">Source:</span>
          {" "}
          {sourceLabels[post.source] || post.source}
          {post.url && (
            <>
              {" | "}
              <a href={post.url} target="_blank" rel="noreferrer" className="text-secondary hover:underline">
                Original ↗
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default PostModal;
