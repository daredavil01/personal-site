import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import RelatedContent from "../components/Ask/RelatedContent";

import PageShell from "../atlas/PageShell";
import { buildBookMeta } from "../data/pageMeta";
import { useBooks } from "../context/ContentContext";
import { useWorld } from "../atlas/world/WorldContext";
import { LoadingBlock } from "../components/common/AsyncStates";
import BooksFonts from "../components/Books/BooksFonts";
import BookSpread from "../components/Books/BookSpread";
import { isMarathi } from "../lib/bookShelf";

// Module-level so the array identity is stable: RelatedContent re-fetches when
// `types` changes, and a literal would be a new array on every render.
const SHELF = ["book"];

const BookPost = () => {
  const { id } = useParams();
  const { data: books, loading } = useBooks();
  const { track } = useWorld();

  const book = books.find((b) => String(b.id) === id);

  // Opening a book counts toward the Bibliophile collector quest (§4.5);
  // track() is a no-op-safe dedupe and runs in both view modes.
  useEffect(() => {
    if (book && book.id != null) track("book:open", String(book.id));
  }, [book, track]);

  if (loading) return <PageShell region="reader"><LoadingBlock label="Loading book…" /></PageShell>;

  if (!book) {
    return (
      <PageShell region="reader" title="Book Not Found" noindex>
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/books" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Books
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Book not found.</p>
        </div>
      </PageShell>
    );
  }

  // The shelf is newest-first, so "next" is the book read before this one.
  const at = books.findIndex((b) => b.id === book.id);
  const neighbours = [
    { label: "Previous on the shelf", item: books[at - 1] },
    { label: "Next on the shelf", item: books[at + 1] },
  ].filter((n) => n.item);

  // Shared with the Cloudflare middleware so crawler + client OG tags match.
  // No image argument: books have no photo, so this unfurls as the shelf card.
  const meta = buildBookMeta({
    title: book.title,
    author: book.author,
    description: book.description,
  });

  return (
    <PageShell region="reader" title={meta.title} description={meta.description} image={meta.image}>
      <BooksFonts />
      <div className="bk-root flex flex-col gap-6 max-w-5xl">
        <Link to="/books" className="inline-flex items-center gap-1.5 bk-small no-underline self-start min-h-[44px]">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_back</span>
          Back to the shelf
        </Link>

        <BookSpread book={book} heading="h1" page />

        {neighbours.length > 0 && (
          <nav className="flex justify-between gap-6" aria-label="Neighbours on the shelf">
            {neighbours.map(({ label, item }) => (
              <Link key={label} to={`/books/${item.id}`} className={`no-underline min-w-0 ${label === "Next on the shelf" ? "text-right ml-auto" : ""}`}>
                <span className="bk-small block">{label}</span>
                <span className="bk-serif block font-semibold mt-1 truncate" style={{ color: "var(--bk-ink)" }} lang={isMarathi(item) ? "mr" : undefined}>
                  {item.title.trim()}
                </span>
              </Link>
            ))}
          </nav>
        )}

        <RelatedContent type="book" id={id} types={SHELF} limit={3} title="If you liked this" />
        <RelatedContent type="book" id={id} excludeTypes={SHELF} />
      </div>
    </PageShell>
  );
};

export default BookPost;
