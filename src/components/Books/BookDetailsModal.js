import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { bookShape } from "./shapes";
import BookCover from "./BookCover";
import Stars from "./Stars";
import TagLinks from "../common/TagLinks";
import ShareImageButton from "../share/ShareImageButton";
import { formatReadDate } from "../../lib/bookDate";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

const Fact = ({ label, value }) => (value ? (
  <div>
    <p className="mb-0.5 font-label text-[9px] uppercase tracking-widest text-stone-400 dark:text-stone-500">{label}</p>
    <p className="mb-0 font-body text-sm text-stone-700 dark:text-stone-300">{value}</p>
  </div>
) : null);

Fact.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node };
Fact.defaultProps = { value: null };

// Quick look at a book without losing your place on the shelf. Same focus
// contract as ProjectDetailsModal — trap Tab, close on Escape, and hand focus
// back to the card that opened it. Full-screen on a phone, centred dialog above.
const BookDetailsModal = ({ isOpen, onClose, book }) => {
  const [shareState, setShareState] = useState("idle");
  const dialogRef = useRef(null);
  const restoreFocusTo = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    restoreFocusTo.current = document.activeElement;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector(FOCUSABLE)?.focus();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "auto";
      if (restoreFocusTo.current instanceof HTMLElement) restoreFocusTo.current.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !book) return null;

  const handleShare = async () => {
    const url = `${window.location.origin}/books/${book.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: book.title, url });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      }
    } catch (_) {
      // Ignored — a dismissed share sheet is not an error.
    }
    setTimeout(() => setShareState("idle"), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-stone-900/50 backdrop-blur-sm cursor-default border-0"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-modal-title"
        className="relative bg-white dark:bg-stone-900 w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-y-auto shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex justify-between items-start gap-4 sticky top-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md z-10">
          <div className="min-w-0">
            <h2 id="book-modal-title" className="font-headline text-xl sm:text-2xl text-stone-900 dark:text-stone-100 mb-1 leading-snug">
              {book.title}
            </h2>
            <p className="mb-0 font-body text-sm text-stone-500 dark:text-stone-400 italic">
              {book.author}
              {book.translator && <span className="not-italic">{` · tr. ${book.translator}`}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-2 rounded-full bg-transparent border-0 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-6 flex-1">
          <div className="flex gap-5">
            <BookCover book={book} size="md" className="w-28 sm:w-36 shrink-0" />

            <div className="min-w-0 flex flex-col gap-3">
              <Stars rating={book.rating} size="md" />
              <div className="flex flex-wrap gap-2">
                {book.category && (
                  <span className="px-3 py-1 bg-secondary/10 dark:bg-secondary/20 text-secondary rounded-full font-label text-[10px] uppercase tracking-widest border border-secondary/20">
                    {book.category}
                  </span>
                )}
                <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                  {book.language}
                </span>
                {book.status && book.status !== "read" && (
                  <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                    {book.status.replace("-", " ")}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Fact label="Read" value={formatReadDate(book)} />
                <Fact label="First published" value={book.first_published} />
                <Fact label="Publisher" value={book.publisher} />
                <Fact label="Pages" value={book.page_count} />
                <Fact label="Format" value={book.format} />
                <Fact label="ISBN" value={book.isbn} />
              </div>
            </div>
          </div>

          {book.quote && (
            <blockquote className="m-0 border-l-2 border-secondary pl-4 font-headline text-lg text-stone-700 dark:text-stone-200 italic leading-relaxed">
              {book.quote}
            </blockquote>
          )}

          {book.description && (
            <p className="mb-0 font-body text-stone-700 dark:text-stone-300 leading-relaxed">{book.description}</p>
          )}

          {book.note && (
            <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-xl p-4">
              <p className="mb-1 font-label text-[9px] uppercase tracking-widest text-stone-400 dark:text-stone-500">Why it stayed with me</p>
              <p className="mb-0 font-body text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{book.note}</p>
            </div>
          )}

          <TagLinks tags={book.tags} />
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {book.blog_link && (
              <a
                href={book.blog_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 rounded-xl font-label font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all no-underline"
              >
                <span className="material-symbols-outlined text-sm">article</span>
                Read review
                {book.blog_platform && <span className="opacity-60">{`· ${book.blog_platform}`}</span>}
              </a>
            )}
            {book.goodreads_url && (
              <a
                href={book.goodreads_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 font-label font-bold text-xs uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:border-secondary hover:text-secondary transition-colors no-underline"
              >
                Goodreads
              </a>
            )}
          </div>

          <div className="flex items-center gap-4">
            <ShareImageButton kind="book" item={book} />
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 bg-transparent border-0 font-label text-[10px] uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{shareState === "idle" ? "share" : "check"}</span>
              {{ shared: "Shared!", copied: "Copied!" }[shareState] || "Share"}
            </button>
            <Link
              to={`/books/${book.id}`}
              className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Permalink →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

BookDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  book: bookShape,
};

BookDetailsModal.defaultProps = { book: null };

export default BookDetailsModal;
