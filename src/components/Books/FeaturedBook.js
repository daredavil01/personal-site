import React, { useState } from 'react';
import PropTypes from 'prop-types';

const FeaturedBook = ({
  data,
  label,
  onClick,
  onShuffle,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  if (!data) return null;

  const getTooltipText = () => {
    if (label === 'Featured Read') {
      return 'Books with blog posts I\'ve written. Click shuffle to see another!';
    }
    return 'Randomly selected book from my collection. Click shuffle to discover more!';
  };

  return (
    // eslint-disable-next-line
    // jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="featured-book-card" onClick={() => onClick(data)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="label">{label}</div>
          <button
            type="button"
            className="featured-info-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(!showInfo);
            }}
            onBlur={() => setTimeout(() => setShowInfo(false), 200)}
            aria-label="Book information"
          >
            i
          </button>
          {showInfo && (
            <div className="featured-info-tooltip">
              <strong>ℹ️ Info:</strong> {getTooltipText()}
            </div>
          )}
        </div>
        {onShuffle && (
          <button
            type="button"
            className="shuffle-btn"
            onClick={(e) => {
              e.stopPropagation();
              onShuffle();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2em',
              padding: '0 5px',
              zIndex: 10,
            }}
            title="Shuffle"
          >
            🔄
          </button>
        )}
      </div>
      <h3>{data.title}</h3>
      <p className="author">by {data.author}</p>
      <p className="description-preview">
        {data.description ? `${data.description.substring(0, 120)}...` : 'No description available.'}
      </p>
      {data.tags && (
        <div className="tags">
          {data.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
};

FeaturedBook.propTypes = {
  data: PropTypes.shape({
    title: PropTypes.string.isRequired,
    author: PropTypes.string,
    description: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }),
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onShuffle: PropTypes.func,
};

FeaturedBook.defaultProps = {
  data: null,
  onShuffle: null,
};

export default FeaturedBook;
