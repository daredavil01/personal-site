import React from 'react';
import PropTypes from 'prop-types';

const BookStats = ({
  data,
  onTagSelect,
  selectedTags,
  onClearTags,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(false);
  const totalBooks = data.length;
  // const languages = [...new Set(data.map((book) => book.language).filter(Boolean))];
  const uniqueLanguagesCount = new Set(data.map((book) => book.language).filter(Boolean)).size;
  const totalBlogs = data.filter((book) => book.blog_link).length;

  // Blog Platform Stats
  const platformCounts = {};
  data.forEach((book) => {
    if (book.blog_platform) {
      platformCounts[book.blog_platform] = (platformCounts[book.blog_platform] || 0) + 1;
    }
  });

  const sortedPlatforms = Object.entries(platformCounts)
    .sort(([, a], [, b]) => b - a);
  const maxPlatformCount = sortedPlatforms.length > 0 ? sortedPlatforms[0][1] : 1;

  // Tag Stats
  const tagCounts = {};
  data.forEach((book) => {
    if (book.tags) {
      book.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15); // Top 15 tags

  return (
    <div className="book-stats">
      {/* Header with Toggle */}
      <div className="stats-header">
        <div className="key-stats-grid">
          <div className="stat-box">
            <span className="stat-number">{totalBooks}</span>
            <span className="stat-label">Total Books</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{uniqueLanguagesCount}</span>
            <span className="stat-label">Languages</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{totalBlogs}</span>
            <span className="stat-label">Blogs Written</span>
          </div>
        </div>
        <button
          type="button"
          className={`toggle-stats-btn ${isExpanded ? 'active' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label="Toggle stats details"
        >
          ▼
        </button>
      </div>

      {isExpanded && (
        <div className="stats-details-grid">
          {/* Platforms Visualization */}
          <div className="stat-column">
            <h4>Blog Platforms</h4>
            <div className="platform-list">
              {sortedPlatforms.map(([platform, count]) => (
                <div key={platform} className="platform-row">
                  <div className="platform-info">
                    <span className="platform-name">{platform}</span>
                    <span className="platform-count">{count}</span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${(count / maxPlatformCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Tags Cloud */}
          <div className="stat-column">
            <div className="column-header">
              <div
                className="header-title-group"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <h4>Top Topics</h4>
                <div className="info-tooltip-container" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="info-btn"
                    onClick={() => setShowInfo(!showInfo)}
                    onBlur={() => setTimeout(
                      () => setShowInfo(false),
                      200
                    )} // Close on blur with small delay
                    aria-label="Info"
                  >
                    i
                  </button>
                  {showInfo && (
                    <div className="info-tooltip">
                      Tap tags to filter your reading list! 📚✨
                    </div>
                  )}
                </div>
              </div>
              {selectedTags && selectedTags.length > 0 && (
                <button
                  type="button"
                  className="clear-tags-btn"
                  onClick={onClearTags}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="tag-cloud">
              {sortedTags.map(([tag, count]) => (
                <button
                  type="button"
                  key={tag}
                  className={`tag-pill ${selectedTags && selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => onTagSelect && onTagSelect(tag)}
                  style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} // explicit cursor pointer
                >
                  {tag}
                  <span className="tag-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

BookStats.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    language: PropTypes.string,
    blog_link: PropTypes.string,
    blog_platform: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  })).isRequired,
  onTagSelect: PropTypes.func,
  selectedTags: PropTypes.arrayOf(PropTypes.string),
  onClearTags: PropTypes.func,
};

BookStats.defaultProps = {
  onTagSelect: null,
  selectedTags: [],
  onClearTags: null,
};

export default BookStats;
