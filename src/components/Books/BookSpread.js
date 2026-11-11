import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { bookShape } from "./shapes";
import BookCover from "./BookCover";
import Stars from "./Stars";
import TagLinks from "../common/TagLinks";
import ShareImageButton from "../share/ShareImageButton";
import { formatReadDate } from "../../lib/bookDate";
import { clothFor, isMarathi, waitOf } from "../../lib/bookShelf";

const Row = ({ label, value }) => (value ? (
  <div>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
) : null);
Row.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node };
Row.defaultProps = { value: null };

// A book laid open: the cover on its binding cloth to the left, its library
// card to the right. The quick-look sheet on /books and the /books/:id page
// are this one component, so they cannot drift apart.
const BookSpread = ({
  book, heading: Heading, titleId, permalink, page, children,
}) => {
  const [shareState, setShareState] = useState("idle");
  const wait = waitOf(book);
  const read = formatReadDate(book);

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
      // A dismissed share sheet is not an error.
    }
    setTimeout(() => setShareState("idle"), 2000);
  };

  return (
    <div className="bk-spread-box">
    <article
      className={`bk-spread${page ? " bk-spread--page" : ""}`}
      lang={isMarathi(book) ? "mr" : undefined}
      style={{ "--cloth": clothFor(book.category) }}
    >
      <div className="bk-spread__left">
        <BookCover book={book} eager />
        {read && <span className="bk-stampmark" style={{ "--tilt": "-3deg" }}>{`Read ${read}`}</span>}
      </div>

      <div className="bk-spread__right" lang={isMarathi(book) ? undefined : "en"}>
        <header>
          <p className="bk-eyebrow">{book.category}</p>
          <Heading id={titleId} className="bk-spread__title" lang={isMarathi(book) ? "mr" : undefined}>{book.title.trim()}</Heading>
          <p className="bk-spread__by" lang={isMarathi(book) ? "mr" : undefined}>
            {book.author}
            {book.translator && <span className="not-italic">{` · tr. ${book.translator.trim()}`}</span>}
          </p>
          <Stars rating={book.rating} size="md" className="mt-3" />
        </header>

        {book.quote && (
          <blockquote className="bk-quote" lang={/[ऀ-ॿ]/.test(book.quote) ? "mr" : undefined}>{book.quote.trim()}</blockquote>
        )}

        {book.description && (
          <p className="bk-prose" lang={/[ऀ-ॿ]/.test(book.description) ? "mr" : undefined}>{book.description}</p>
        )}

        {book.note && (
          <div className="bk-note">
            <p className="bk-small mb-1">Why it stayed with me</p>
            <p className="bk-prose">{book.note}</p>
          </div>
        )}

        <dl className="bk-card-rows">
          <Row label="Language" value={book.language} />
          <Row label="Pages" value={book.page_count} />
          <Row label="First published" value={book.first_published} />
          <Row label="Waited for me" value={wait ? `${wait} year${wait === 1 ? "" : "s"}` : null} />
          <Row label="Publisher" value={book.publisher} />
          <Row label="Format" value={book.format} />
          <Row label="Status" value={book.status && book.status !== "read" ? book.status.replace("-", " ") : null} />
          <Row label="ISBN" value={book.isbn} />
        </dl>

        <TagLinks tags={book.tags} />

        <div className="bk-spread__actions">
          {book.blog_link && (
            <a href={book.blog_link} target="_blank" rel="noopener noreferrer" className="bk-btn">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">article</span>
              Read my review
              {book.blog_platform && <span className="opacity-60">{`· ${book.blog_platform}`}</span>}
            </a>
          )}
          {book.goodreads_url && (
            <a href={book.goodreads_url} target="_blank" rel="noopener noreferrer" className="bk-btn bk-btn--ghost">Goodreads</a>
          )}
          <span className="flex items-center gap-4 ml-auto">
            <ShareImageButton kind="book" item={book} />
            <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 bk-small cursor-pointer min-h-[44px]">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">{shareState === "idle" ? "share" : "check"}</span>
              {{ shared: "Shared!", copied: "Copied!" }[shareState] || "Share"}
            </button>
            {permalink && (
              <Link to={`/books/${book.id}`} className="bk-small no-underline" style={{ color: "var(--bk-red)" }}>
                Its own page →
              </Link>
            )}
          </span>
        </div>

        {children}
      </div>
    </article>
    </div>
  );
};

BookSpread.propTypes = {
  book: bookShape.isRequired,
  heading: PropTypes.oneOf(["h1", "h2"]),
  titleId: PropTypes.string,
  permalink: PropTypes.bool,
  page: PropTypes.bool,
  children: PropTypes.node,
};

BookSpread.defaultProps = {
  heading: "h2", titleId: undefined, permalink: false, page: false, children: null,
};

export default BookSpread;
