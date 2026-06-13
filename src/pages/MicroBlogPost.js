import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Main from "../layouts/Main";
import { getMicroblogPost } from "../lib/api/microblog";
import { LoadingBlock, ErrorBlock } from "../components/common/AsyncStates";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const sourceLabels = { tumblr: "Tumblr", instagram: "Instagram", manual: "Manual" };

const typeColors = {
  text: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  quote: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
  photo: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
};

const MicroBlogPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMicroblogPost(id)
      .then(setPost)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const [shareState, setShareState] = useState("idle");
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.date ? `Post · ${post.date}` : "Post", url });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      }
    } catch (_) {
      // Ignored
    }
    setTimeout(() => setShareState("idle"), 2000);
  };

  const body = post?.text || post?.title || "";
  const pageTitle = post ? `Post · ${post.date}` : "Post";
  const description = body ? body.replace(/\s+/g, " ").trim().slice(0, 160) : "A micro-blog post.";

  return (
    <Main title={pageTitle} description={description}>
      <div className="flex flex-col gap-8 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link
            to="/micro-blog"
            className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Micro Blog
          </Link>
          <div
            role="button"
            tabIndex={0}
            onClick={handleShare}
            onKeyDown={keyActivate(handleShare)}
            className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {shareState === "idle" ? "share" : "check"}
            </span>
            { { shared: "Shared!", copied: "Copied!" }[shareState] || "Share" }
          </div>
        </div>

        {loading && <LoadingBlock label="Loading post…" />}
        {error && <ErrorBlock />}

        {post && (
          <article className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-stone-400 dark:text-stone-500">{post.date}</span>
              <span
                className={`font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  typeColors[post.postType] ?? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                }`}
              >
                {post.postType}
              </span>
            </div>

            {post.imageUrl && (
              <img src={post.imageUrl} alt="" className="w-full rounded-xl" />
            )}

            {body ? (
              <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line mb-0">
                {body}
              </p>
            ) : (
              <p className="font-body italic text-stone-400 dark:text-stone-500 mb-0">
                Photo post (no caption).
              </p>
            )}

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
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

            <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
              <p className="text-xs text-stone-400 font-label uppercase tracking-widest mb-0">
                <span className="font-bold">Source:</span>{" "}
                {sourceLabels[post.source] || post.source}
              </p>
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-label uppercase tracking-wider text-secondary hover:underline"
                >
                  Original ↗
                </a>
              )}
            </div>
          </article>
        )}
      </div>
    </Main>
  );
};

export default MicroBlogPost;
