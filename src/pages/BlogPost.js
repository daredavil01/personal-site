import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Main from "../layouts/Main";
import { buildBlogMeta } from "../data/pageMeta";
import { useBlogs } from "../context/ContentContext";
import { LoadingBlock } from "../components/common/AsyncStates";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const platformColors = {
  Substack: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  Medium: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  Ghost: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  WordPress: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
};

const CHALLENGE_TAG = "100_days_to_offload";

const BlogPost = () => {
  const { id } = useParams();
  const { data: blogsData, loading } = useBlogs();
  const [shareState, setShareState] = useState("idle");

  const blog = blogsData.find((b) => String(b.id) === id);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: blog?.blog_title || "Blog Post", url });
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

  if (loading) return <Main><LoadingBlock label="Loading post…" /></Main>;

  if (!blog) {
    return (
      <Main title="Post Not Found">
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/100-days-to-offload" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> 100 Days to Offload
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Post not found.</p>
        </div>
      </Main>
    );
  }

  const visibleTags = (blog.blog_tags || []).filter((t) => t.toLowerCase() !== CHALLENGE_TAG);

  // Shared with the Cloudflare middleware so crawler + client OG tags match.
  const meta = buildBlogMeta({ title: blog.blog_title, description: blog.blog_description });

  return (
    <Main title={meta.title} description={meta.description} image={meta.image}>
      <div className="flex flex-col gap-8 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link to="/100-days-to-offload" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> 100 Days to Offload
          </Link>
          <div
            role="button"
            tabIndex={0}
            onClick={handleShare}
            onKeyDown={keyActivate(handleShare)}
            className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">{shareState === "idle" ? "share" : "check"}</span>
            { { shared: "Shared!", copied: "Copied!" }[shareState] || "Share" }
          </div>
        </div>

        <article className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-stone-400 dark:text-stone-500">{blog.blog_date}</span>
            {blog.blog_platform && (
              <span className={`font-label text-[9px] uppercase tracking-widest px-2 py-0.5 rounded ${platformColors[blog.blog_platform] || "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"}`}>
                {blog.blog_platform}
              </span>
            )}
            {blog.language && (
              <span className="font-label text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {blog.language}
              </span>
            )}
          </div>

          <h1 className="font-headline text-2xl md:text-3xl text-stone-900 dark:text-stone-100 leading-tight mb-0">
            {blog.blog_title}
          </h1>

          {blog.blog_description && (
            <p className="font-body text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800 p-5 rounded-xl border-l-4 border-l-secondary/40 mb-0">
              {blog.blog_description}
            </p>
          )}

          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-md text-xs border border-stone-100 dark:border-stone-800">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {blog.blog_link && (
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <a
                href={blog.blog_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Read Post
              </a>
            </div>
          )}
        </article>
      </div>
    </Main>
  );
};

export default BlogPost;
