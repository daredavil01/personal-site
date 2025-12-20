import React, { useState, useEffect } from 'react';

const BooksFeaturesBanner = () => {
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const features = [
    { id: 'tags', icon: '🏷️', text: 'Filter books by tags—click any tag to explore!' },
    { id: 'blogs', icon: '📝', text: 'Read my blog posts linked to each book' },
    { id: 'stats', icon: '📊', text: 'Track your reading stats across languages & platforms' },
    { id: 'related', icon: '🔗', text: 'Discover related books based on tags and language' },
    { id: 'filters', icon: '🌍', text: 'Filter by language, author, or blogging platform' },
    { id: 'multiselect', icon: '✨', text: 'Multi-select tags for powerful OR-based filtering' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % features.length);
    }, 4000); // Change feature every 4 seconds

    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="books-features-banner">
      <button
        type="button"
        className="banner-info-btn"
        onClick={() => setShowInfo(!showInfo)}
        onBlur={() => setTimeout(() => setShowInfo(false), 200)}
        aria-label="Banner information"
      >
        i
      </button>
      {showInfo && (
        <div className="banner-info-tooltip">
          <strong>ℹ️ About:</strong> This banner showcases key features
          of books page.
        </div>
      )}
      <div className="feature-carousel">
        <span className="feature-icon">{features[currentFeatureIndex].icon}</span>
        <span className="feature-text">{features[currentFeatureIndex].text}</span>
      </div>
      <div className="feature-dots">
        {features.map((feature, index) => (
          <button
            type="button"
            key={feature.id}
            className={`dot ${index === currentFeatureIndex ? 'active' : ''}`}
            onClick={() => setCurrentFeatureIndex(index)}
            aria-label={`Go to feature ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BooksFeaturesBanner;
