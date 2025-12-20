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

  return (
    <Main
      title="Books"
      description="A list of books I've read, with some stats and mostly associated blogs."
    >
      <article className="post" id="books">
        <header>
          <div className="title">
            <h2><Link to="/books">Books</Link></h2>
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

        <div className="books-list" style={{ marginTop: '2em' }}>
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
