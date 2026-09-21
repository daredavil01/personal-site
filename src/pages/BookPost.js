import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import RelatedContent from "../components/Ask/RelatedContent";

import PageShell from "../atlas/PageShell";
import { buildBookMeta } from "../data/pageMeta";
import { useBooks } from "../context/ContentContext";
import { useWorld } from "../atlas/world/WorldContext";
import { LoadingBlock } from "../components/common/AsyncStates";
import ShareImageButton from "../components/share/ShareImageButton";
import TagLinks from "../components/common/TagLinks";

import BookCover from "../components/Books/BookCover";
import Stars from "../components/Books/Stars";
import { formatReadDate } from "../lib/bookDate";

// Module-level so the array identity is stable: RelatedContent re-fetches when
// `types` changes, and a literal would be a new array on every render.
const SHELF = ["book"];

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const BookPost = () => {
  const { id } = useParams();
  const { data: books, loading } = useBooks();
  const { track } = useWorld();
  const [shareState, setShareState] = useState("idle");

  const book = books.find((b) => String(b.id) === id);

  // Opening a book counts toward the Bibliophile collector quest (§4.5);
  // track() is a no-op-safe dedupe and runs in both view modes.
  useEffect(() => {
    if (book && book.id != null) track("book:open", String(book.id));
  }, [book, track]);

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

  if (loading) return <PageShell region="reader"><LoadingBlock label="Loading book…" /></PageShell>;

  if (!book) {
    return (
      <PageShell region="reader" title="Book Not Found">
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/books" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Books
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Book not found.</p>
        </div>
      </PageShell>
    );
  }

  // Shared with the Cloudflare middleware so crawler + client OG tags match.
  // No image argument: books have no photo, so this unfurls as the shelf card.
  const meta = buildBookMeta({
    title: book.title,
    author: book.author,
    description: book.description,
  });

  // The bibliographic line. Most of these come from the metadata backfill and
  // are missing for the Marathi half of the shelf, so build it from what exists.
  const facts = [
    book.publisher,
    book.first_published ? `First published ${book.first_published}` : null,
    book.page_count ? `${book.page_count} pages` : null,
    book.format,
    book.isbn ? `ISBN ${book.isbn}` : null,
  ].filter(Boolean);

  return (
    <PageShell region="reader" title={meta.title} description={meta.description} image={meta.image}>
      <div className="flex flex-col gap-8 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link to="/books" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Books
          </Link>
          <div className="flex items-center gap-4">
            <ShareImageButton kind="book" item={book} />
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
        </div>

        <article className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <BookCover book={book} size="lg" className="w-32 sm:w-40 shrink-0" />

            <div className="min-w-0 flex flex-col gap-3">
              <div>
                <h1 className="font-headline text-2xl sm:text-3xl text-stone-900 dark:text-stone-100 mb-2 leading-tight">{book.title}</h1>
                <p className="font-body text-lg text-stone-500 dark:text-stone-400 italic mb-0">{book.author}</p>
                {book.translator && (
                  <p className="font-label text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1 mb-0">
                    Translated by {book.translator}
                  </p>
                )}
              </div>

              <Stars rating={book.rating} size="md" />

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                  <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                  {`Read ${formatReadDate(book)}`}
                </span>
                {book.language && (
                  <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                    {book.language}
                  </span>
                )}
                {book.category && (
                  <span className="px-3 py-1 bg-secondary/10 dark:bg-secondary/20 text-secondary rounded-full font-label text-[10px] uppercase tracking-widest border border-secondary/20">
                    {book.category}
                  </span>
                )}
              </div>

              {facts.length > 0 && (
                <p className="mb-0 font-body text-xs text-stone-400 dark:text-stone-500">{facts.join(" · ")}</p>
              )}
            </div>
          </div>

          {book.quote && (
            <blockquote className="m-0 border-l-2 border-secondary pl-4 font-headline text-lg text-stone-700 dark:text-stone-200 italic leading-relaxed">
              {book.quote}
            </blockquote>
          )}

          {book.description && (
            <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed mb-0">
              {book.description}
            </p>
          )}

          {book.note && (
            <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-xl p-4">
              <p className="mb-1 font-label text-[9px] uppercase tracking-widest text-stone-400 dark:text-stone-500">Why it stayed with me</p>
              <p className="mb-0 font-body text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{book.note}</p>
            </div>
          )}

          <TagLinks tags={book.tags} />

          {(book.blog_link || book.goodreads_url) && (
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-3">
              {book.blog_link && (
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
              )}
              {book.goodreads_url && (
                <a
                  href={book.goodreads_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-stone-200 dark:border-stone-700 font-label font-bold text-sm uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:border-secondary hover:text-secondary transition-colors"
                >
                  Goodreads
                </a>
              )}
            </div>
          )}
          <RelatedContent
            type="book"
            id={id}
            types={SHELF}
            limit={3}
            title="If you liked this"
          />
          <RelatedContent type="book" id={id} excludeTypes={SHELF} />
        </article>
      </div>
    </PageShell>
  );
};

export default BookPost;
