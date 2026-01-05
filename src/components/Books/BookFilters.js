/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const BookFilters = ({
  tags,
  authors,
  platforms,
  languages,
  years,
  selectedTags,
  selectedAuthor,
  selectedPlatform,
  selectedLanguage,
  selectedYear,
  showOnlyWithBlog, // Re-enabled
  onTagChange,
  onClearTags,
  onAuthorChange,
  onPlatformChange,
  onLanguageChange,
  onYearChange,
  onBlogFilterChange, // Re-enabled
  filteredCount,
  totalCount,
}) => {
  const [activeFilter, setActiveFilter] = useState(null);
  // 'tags', 'authors', 'platforms', 'languages', 'years'
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  const toggleFilter = (filterName) => {
    if (activeFilter === filterName) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filterName);
    }
  };

  const isFilterActive = (val) => val && val.length > 0;

  return (
    <div className="book-filter-container">
      <div className="filter-bar">
        <span className="filter-label">Filters</span>

        {/* Info Button */}
        <div className="filter-info-container">
          <button
            type="button"
            className="filter-info-btn"
            onClick={() => setShowInfoTooltip(!showInfoTooltip)}
            onBlur={() => setTimeout(() => setShowInfoTooltip(false), 200)}
            aria-label="Filter information"
          >
            i
          </button>
          {showInfoTooltip && (
            <div className="filter-info-tooltip">
              <strong>💡 Pro Tip:</strong> Use filters to narrow down books by tags,
              authors, platforms, year, or language. Multi-select tags to find books matching
              ANY of your selected topics!
            </div>
          )}
        </div>

        {/* Books with Blogs Filter */}
        <button
          type="button"
          className={`filter-btn ${showOnlyWithBlog ? 'active' : ''}`}
          onClick={onBlogFilterChange}
          title="Show only books with blogs"
        >
          Books with Blogs
        </button>

        <button
          type="button"
          className={`filter-btn ${isFilterActive(selectedYear) || activeFilter === 'years' ? 'active' : ''}`}
          onClick={() => toggleFilter('years')}
        >
          Year
        </button>

        <button
          type="button"
          className={`filter-btn ${isFilterActive(selectedTags) || activeFilter === 'tags' ? 'active' : ''}`}
          onClick={() => toggleFilter('tags')}
        >
          Tags
        </button>
        <button
          type="button"
          className={`filter-btn ${isFilterActive(selectedAuthor) || activeFilter === 'authors' ? 'active' : ''}`}
          onClick={() => toggleFilter('authors')}
        >
          Authors
        </button>
        <button
          type="button"
          className={`filter-btn ${isFilterActive(selectedPlatform) || activeFilter === 'platforms' ? 'active' : ''}`}
          onClick={() => toggleFilter('platforms')}
        >
          Platforms
        </button>
        <button
          type="button"
          className={`filter-btn ${isFilterActive(selectedLanguage) || activeFilter === 'languages' ? 'active' : ''}`}
          onClick={() => toggleFilter('languages')}
        >
          Language
        </button>

        {/* Clear Filters Button */}
        {(selectedTags.length > 0
          || selectedAuthor
          || selectedPlatform
          || selectedLanguage
          || selectedYear
          || showOnlyWithBlog) && (
            <>
              <div
                className="filter-count"
                style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  fontWeight: '500',
                  marginRight: '8px',
                }}
              >
                Found {filteredCount} of {totalCount}
              </div>
              <button
                type="button"
                className="filter-btn clear-btn"
                onClick={() => {
                  onClearTags();
                  // Triggering clear tags handles the reset of all states in parent,
                  // but we need to ensure the local activeFilter is cleared
                  setActiveFilter(null);
                }}
              >
                &times; Clear
              </button>
            </>
        )}
      </div>

      {activeFilter && (
        <div className="filter-options-panel">
          <div className="panel-header">
            <h4>Select {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}</h4>
            <button type="button" onClick={() => setActiveFilter(null)}>&times;</button>
          </div>

          <div className="options-grid">
            {activeFilter === 'tags' && (
              <>
                <div className="filter-tags-header">
                  <span className="filter-tags-label">Select Tags</span>
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      className="clear-filter-tags-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearTags();
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div
                  className={`option-pill ${selectedTags.length === 0 ? 'selected' : ''}`}
                  onClick={onClearTags}
                >
                  All
                </div>
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className={`option-pill ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => onTagChange(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </>
            )}

            {activeFilter === 'authors' && (
              <>
                <div
                  className={`option-pill ${selectedAuthor === '' ? 'selected' : ''}`}
                  onClick={() => onAuthorChange('')}
                >
                  All
                </div>
                {authors.map((author) => (
                  <div
                    key={author}
                    className={`option-pill ${selectedAuthor === author ? 'selected' : ''}`}
                    onClick={() => onAuthorChange(author)}
                  >
                    {author}
                  </div>
                ))}
              </>
            )}

            {activeFilter === 'platforms' && (
              <>
                <div
                  className={`option-pill ${selectedPlatform === '' ? 'selected' : ''}`}
                  onClick={() => onPlatformChange('')}
                >
                  All
                </div>
                {platforms.map((p) => (
                  <div
                    key={p}
                    className={`option-pill ${selectedPlatform === p ? 'selected' : ''}`}
                    onClick={() => onPlatformChange(p)}
                  >
                    {p}
                  </div>
                ))}
              </>
            )}

            {activeFilter === 'languages' && (
              <>
                <div
                  className={`option-pill ${selectedLanguage === '' ? 'selected' : ''}`}
                  onClick={() => onLanguageChange('')}
                >
                  All
                </div>
                {languages.map((l) => (
                  <div
                    key={l}
                    className={`option-pill ${selectedLanguage === l ? 'selected' : ''}`}
                    onClick={() => onLanguageChange(l)}
                  >
                    {l}
                  </div>
                ))}
              </>
            )}

            {activeFilter === 'years' && (
              <>
                <div
                  className={`option-pill ${selectedYear === '' ? 'selected' : ''}`}
                  onClick={() => onYearChange('')}
                >
                  All
                </div>
                {years.map((y) => (
                  <div
                    key={y}
                    className={`option-pill ${selectedYear === y ? 'selected' : ''}`}
                    onClick={() => onYearChange(y)}
                  >
                    {y}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

BookFilters.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  authors: PropTypes.arrayOf(PropTypes.string).isRequired,
  platforms: PropTypes.arrayOf(PropTypes.string).isRequired,
  languages: PropTypes.arrayOf(PropTypes.string).isRequired,
  years: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedTags: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedAuthor: PropTypes.string.isRequired,
  selectedPlatform: PropTypes.string.isRequired,
  selectedLanguage: PropTypes.string.isRequired,
  selectedYear: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  showOnlyWithBlog: PropTypes.bool.isRequired,
  onTagChange: PropTypes.func.isRequired,
  onAuthorChange: PropTypes.func.isRequired,
  onPlatformChange: PropTypes.func.isRequired,
  onLanguageChange: PropTypes.func.isRequired,
  onYearChange: PropTypes.func.isRequired,
  onClearTags: PropTypes.func.isRequired,
  onBlogFilterChange: PropTypes.func.isRequired,
  filteredCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};

export default BookFilters;
