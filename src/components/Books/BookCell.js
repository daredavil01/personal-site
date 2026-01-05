import React from 'react';
import PropTypes from 'prop-types';

const BookCell = ({ data, onClick }) => {
  // Use book ID to predictably select a gradient (so it doesn't change on re-renders)
  const gradientIndex = (data.id || 0) % 8;

  return (
    <div className="book-card" onClick={() => onClick(data)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onClick(data); }}>
      <div className="card-header" data-gradient-id={gradientIndex}>
        <h3>{data.title}</h3>
        <div className="author">by {data.author}</div>
      </div>
      <div className="card-content">
        <div className="stats-row">
          {data.year && <span className="year">{data.year}</span>}
          {data.language && <span className="language">{data.language}</span>}
        </div>
        {data.tags && data.tags.length > 0 && (
          <div className="tags">
            {data.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
            {data.tags.length > 3 && <span className="tag">+{data.tags.length - 3}</span>}
          </div>
        )}
      </div>
      <div className="card-actions" style={{ justifyContent: data.blog_link ? 'space-between' : 'flex-end' }}>
        {data.blog_link && (
          <span className="blog-indicator">
            Blog
          </span>
        )}
        <button type="button" style={{ color: '#555' }}>Details</button>
      </div>
    </div>
  );
};

BookCell.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    author: PropTypes.string,
    language: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    blog_link: PropTypes.string,
    year: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default BookCell;
