import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Main from "../layouts/Main";
import { useBooks } from "../context/ContentContext";
import { LoadingBlock } from "../components/common/AsyncStates";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const BookPost = () => {
  const { id } = useParams();
  const { data: books, loading } = useBooks();
  const [shareState, setShareState] = useState("idle");

  const book = books.find((b) => String(b.id) === id);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: book?.title || "Book", url });
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

  if (loading) return <Main><LoadingBlock label="Loading book…" /></Main>;

  if (!book) {
    return (
      <Main title="Book Not Found">
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/books" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Books
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Book not found.</p>
        </div>
      </Main>
    );
  }

  return (
    <Main
      title={book.title}
      description={book.description || `${book.title} by ${book.author}.`}
    >
      <div className="flex flex-col gap-8 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link to="/books" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Books
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
          <div>
            <h1 className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-2 leading-tight">{book.title}</h1>
            <p className="font-body text-lg text-stone-500 dark:text-stone-400 italic mb-0">{book.author}</p>
            {book.translator && (
              <p className="font-label text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">
                Translated by {book.translator}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {book.year && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                {book.year}
              </span>
            )}
            {book.language && (
              <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                {book.language}
              </span>
            )}
            {book.category && book.category.split(",").map((c) => (
              <span key={c.trim()} className="px-3 py-1 bg-secondary/10 dark:bg-secondary/20 text-secondary rounded-full font-label text-[10px] uppercase tracking-widest border border-secondary/20">
                {c.trim()}
              </span>
            ))}
          </div>

          {book.description && (
            <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed mb-0">
              {book.description}
            </p>
          )}

          {book.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {book.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-md text-xs border border-stone-100 dark:border-stone-800">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {book.blog_link && (
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <a
                href={book.blog_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-sm">article</span>
                Read Review
                {book.blog_platform && <span className="opacity-60">· {book.blog_platform}</span>}
              </a>
            </div>
          )}
        </article>
      </div>
    </Main>
  );
};

export default BookPost;
