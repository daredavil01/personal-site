import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';

import Main from '../layouts/Main';
import BookCell from '../components/Books/BookCell';
import BookStats from '../components/Books/BookStats';
import BookFilters from '../components/Books/BookFilters';
import data from '../data/books';

import BookModal from '../components/Books/BookModal';
import BooksFeaturesBanner from '../components/Books/BooksFeaturesBanner';
import FeaturedBook from '../components/Books/FeaturedBook';
import AchievementBadge from '../components/Books/AchievementBadge';
import TagBubbles from '../components/Books/TagBubbles';
import WelcomePopup from '../components/Books/WelcomePopup';

import { generateBubbles, extractUniqueTags } from '../utils/easterEggUtils';
import './Books.module.css';

const Books = () => {
  /* eslint-disable no-unused-vars */
  const [selectedTags, setSelectedTags] = useState([]);
  /* eslint-enable no-unused-vars */
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [showOnlyWithBlog, setShowOnlyWithBlog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const [featuredBook, setFeaturedBook] = useState(null);
  const [discoveryBook, setDiscoveryBook] = useState(null);

  // Welcome popup state
  const [showWelcome, setShowWelcome] = useState(true);

  // 🎮 EASTER EGG: Speed Reader Mode
  // Desktop: Type "speed" | Mobile: Triple-tap the page title
  const [speedReaderMode, setSpeedReaderMode] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [keyBuffer, setKeyBuffer] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const [tapTimeout, setTapTimeout] = useState(null);

  // 🎮 EASTER EGG #2: Tag Rain Mode
  // Desktop: Type "tag-rain"
  const [tagRainMode, setTagRainMode] = useState(false);
  const [showTagAchievement, setShowTagAchievement] = useState(false);
  const [bubbles, setBubbles] = useState([]);

  const activateSpeedReaderMode = () => {
    setSpeedReaderMode(true);
    setShowAchievement(true);

    // Show achievement for 4 seconds
    setTimeout(() => setShowAchievement(false), 4000);

    // Deactivate speed reader mode after 10 seconds
    setTimeout(() => setSpeedReaderMode(false), 10000);
  };

  const activateTagRainMode = () => {
    setTagRainMode(true);
    setShowTagAchievement(true);

    // Generate random bubbles with tags from actual book data
    const tagsList = extractUniqueTags(data);
    const newBubbles = generateBubbles(tagsList, 20);
    setBubbles(newBubbles);

    // Show achievement for 4 seconds
    setTimeout(() => setShowTagAchievement(false), 4000);

    // Deactivate tag rain mode after 10 seconds
    setTimeout(() => {
      setTagRainMode(false);
      setBubbles([]);
    }, 10000);
  };

  const handleBubblePop = (bubbleId) => {
    setBubbles((prev) => prev.map((bubble) => (
      bubble.id === bubbleId ? { ...bubble, popped: true } : bubble
    )));
    setTimeout(() => {
      setBubbles((prev) => prev.filter((bubble) => bubble.id !== bubbleId));
    }, 500);
  };

  // Desktop trigger: Type "speed" or "tag-rain"
  useEffect(() => {
    const handleKeyPress = (e) => {
      const newBuffer = (keyBuffer + e.key).slice(-8); // Keep last 8 characters for "tag-rain"
      setKeyBuffer(newBuffer);

      if (newBuffer.endsWith('speed')) {
        activateSpeedReaderMode();
        setKeyBuffer(''); // Reset
      } else if (newBuffer === 'tag-rain') {
        activateTagRainMode();
        setKeyBuffer(''); // Reset
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [keyBuffer]);

  const [longPressTimer, setLongPressTimer] = useState(null);

  // Mobile trigger: Triple-tap handler
  const handleTitleTap = () => {
    // Clear existing timeout
    if (tapTimeout) {
      clearTimeout(tapTimeout);
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    if (newTapCount === 3) {
      activateSpeedReaderMode();
      setTapCount(0);
      setTapTimeout(null);
    } else {
      // Reset tap count after 1 second if not completed
      const timeout = setTimeout(() => {
        setTapCount(0);
        setTapTimeout(null);
      }, 1000);
      setTapTimeout(timeout);
    }
  };

  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      activateTagRainMode();
    }, 2000); // 2 second hold
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Recommendation Logic
  const getRandomBook = (candidates) => candidates[Math.floor(Math.random() * candidates.length)];

  const getFeatured = () => {
    const withBlog = data.filter((b) => b.blog_link && b.blog_link.length > 0);
    return getRandomBook(withBlog);
  };

  const getDiscovery = (excludeId) => {
    const candidates = data.filter((b) => b.id !== excludeId);
    return getRandomBook(candidates);
  };

  // Initialize recommendations
  useEffect(() => {
    const featured = getFeatured();
    setFeaturedBook(featured);
    setDiscoveryBook(getDiscovery(featured?.id));
  }, []);

  const handleShuffleFeatured = () => {
    const newFeatured = getFeatured();
    setFeaturedBook(newFeatured);
  };

  const handleShuffleDiscovery = () => {
    const newDiscovery = getDiscovery(featuredBook?.id);
    setDiscoveryBook(newDiscovery);
  };

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) => {
      if (tag === '') return []; // Clear logic handled by reset
      return prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag];
    });
  };

  // Extract unique values for filters
  const allTags = useMemo(() => {
    const tags = new Set();
    data.forEach((book) => book.tags && book.tags.forEach((tag) => tags.add(tag)));
    return [...tags].sort();
  }, []);

  const allAuthors = useMemo(
    () => [...new Set(data.map((book) => book.author).filter(Boolean))].sort(),
    []
  );

  const allPlatforms = useMemo(
    () => [...new Set(data.map((book) => book.blog_platform).filter(Boolean))].sort(),
    []
  );

  const allLanguages = useMemo(
    () => [...new Set(data.map((book) => book.language).filter(Boolean))].sort(),
    []
  );

  // Filter Logic
  const filteredBooks = data.filter((book) => {
    // Check if ANY of the selected tags are present (OR logic)
    // Previously was 'every' (AND logic)
    const matchesTags = selectedTags.length > 0
      ? selectedTags.some((t) => book.tags && book.tags.includes(t))
      : true;

    const matchesAuthor = selectedAuthor ? book.author === selectedAuthor : true;
    const matchesPlatform = selectedPlatform
      ? book.blog_platform === selectedPlatform
      : true;
    const matchesLanguage = selectedLanguage
      ? book.language === selectedLanguage
      : true;
    const matchesBlog = showOnlyWithBlog ? !!book.blog_link : true;

    return matchesTags && matchesAuthor && matchesPlatform && matchesLanguage && matchesBlog;
  });

  const handleResetFilters = () => {
    setSelectedTags([]);
    setSelectedAuthor('');
    setSelectedPlatform('');
    setSelectedLanguage('');
    setShowOnlyWithBlog(false);
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
  };

  return (
    <Main
      title="Books"
      description="A list of books I've read, with some stats and mostly associated blogs."
    >
      {/* Welcome Popup with Confetti */}
      {showWelcome && <WelcomePopup onClose={handleWelcomeClose} />}

      <article className={`post ${tagRainMode ? 'tag-rain-active' : ''}`} id="books">
        <header>
          <div className="title">
            <div
              onClick={handleTitleTap}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTitleTap();
                }
              }}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-block' }}
              title="Hint: Triple-tap for a surprise! 🎮"
            >
              <h2>
                <Link to="/books">Books</Link>
              </h2>
            </div>
            <p>
              A list of books I&apos;ve read, with some stats and mostly associated blogs.
            </p>
          </div>
        </header>

        <BooksFeaturesBanner />

        <BookStats
          data={data}
          onTagSelect={handleTagToggle}
          selectedTags={selectedTags}
          onClearTags={() => setSelectedTags([])}
        />

        {/* Recommendations Section */}
        <div className="recommendations-section">
          <FeaturedBook
            data={featuredBook}
            label="Featured Read"
            onClick={(b) => setSelectedBook(b)}
            onShuffle={handleShuffleFeatured}
          />
          <FeaturedBook
            data={discoveryBook}
            label="Discover"
            onClick={(b) => setSelectedBook(b)}
            onShuffle={handleShuffleDiscovery}
          />
        </div>

        <BookFilters
          tags={allTags}
          authors={allAuthors}
          platforms={allPlatforms}
          languages={allLanguages}
          selectedTags={selectedTags}
          selectedAuthor={selectedAuthor}
          selectedPlatform={selectedPlatform}
          selectedLanguage={selectedLanguage}
          showOnlyWithBlog={showOnlyWithBlog}
          onTagChange={handleTagToggle}
          onAuthorChange={setSelectedAuthor}
          onPlatformChange={setSelectedPlatform}
          onLanguageChange={setSelectedLanguage}
          onBlogFilterChange={() => setShowOnlyWithBlog(!showOnlyWithBlog)}
          onClearTags={handleResetFilters}
        />

        <div className={`books-list ${speedReaderMode ? 'speed-reader-active' : ''}`} style={{ marginTop: '2em' }}>
          {filteredBooks.length > 0 ? filteredBooks.map((book) => (
            <BookCell
              data={book}
              key={book.id}
              onClick={(b) => setSelectedBook(b)}
            />
          )) : (
            <p>No books found matching criteria.</p>
          )}
        </div>

        {/* 🏆 Achievement Badge */}
        {showAchievement && <AchievementBadge type="speed" />}

        {/* 🏷️ Tag Rain Achievement Badge */}
        {showTagAchievement && <AchievementBadge type="tagRain" />}

        {/* 🫧 Floating Bubbles */}
        <TagBubbles bubbles={bubbles} onBubblePop={handleBubblePop} />

        <BookModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onSelectBook={(b) => setSelectedBook(b)}
          allBooks={data}
        />
      </article>

    </Main>
  );
};

export default Books;
