/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

const BookModal = ({
  book,
  onClose,
  allBooks,
  onSelectBook,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Find related books based on tags, or fallback to language
  const relatedBooks = useMemo(() => {
    if (!book || !allBooks) return [];

    let related = [];

    // Strategy 1: Common Tags
    if (book.tags && book.tags.length > 0) {
      related = allBooks
        .filter((b) => b.id !== book.id && b.tags) // Exclude current book
        .map((b) => ({
          ...b,
          commonTags: b.tags.filter((tag) => book.tags.includes(tag)).length,
        }))
        .filter((b) => b.commonTags > 0) // Must have at least one common tag
        .sort((a, b) => b.commonTags - a.commonTags); // Sort by most common tags
    }

    // Strategy 2: Same Language (Fallback)
    if (related.length === 0 && book.language) {
      related = allBooks.filter((b) => b.id !== book.id && b.language === book.language);
    }

    return related.slice(0, 3); // Take top 3
  }, [book, allBooks]);

  if (!book) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="document"
        tabIndex="-1"
      >
        <div className="modal-header">
          <h2>
            {book.title}
            {book.blog_link && (
              <span className="blog-badge">
                Blog
              </span>
            )}
          </h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="meta-info">
            <span><strong>Author:</strong> {book.author}</span>
            {book.language && <span><strong>Language:</strong> {book.language}</span>}
            {book.category && <span><strong>Category:</strong> {book.category}</span>}
          </div>

          <p className="description">{book.description || 'No description available.'}</p>

          {relatedBooks.length > 0 && (
            <div className="related-books">
              <h4>Related Books</h4>
              <div className="related-tags">
                {relatedBooks.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    className="related-book-tag"
                    onClick={() => onSelectBook && onSelectBook(b)}
                  >
                    {b.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          {book.blog_link && (
            <a
              href={book.blog_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Read Blog {book.blog_platform ? `(${book.blog_platform})` : ''}
            </a>
          )}
          <button type="button" className="btn btn-text" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

BookModal.propTypes = {
  book: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    author: PropTypes.string,
    language: PropTypes.string,
    category: PropTypes.string,
    description: PropTypes.string,
    blog_link: PropTypes.string,
    blog_platform: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }),
  onClose: PropTypes.func.isRequired,
  allBooks: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onSelectBook: PropTypes.func,
};

BookModal.defaultProps = {
  book: null,
  onSelectBook: null,
};

export default BookModal;
