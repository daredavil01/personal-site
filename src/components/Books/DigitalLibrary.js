import React, { useState, useMemo } from 'react';

const BookCard = ({ book, onClick }) => (
  <div className="group cursor-pointer border border-transparent flex flex-col h-full" onClick={onClick}>
    <div className="relative mb-6 overflow-hidden rounded-lg editorial-shadow aspect-[2/3] bg-stone-100 flex flex-col justify-end p-6 border border-stone-200 hover:border-secondary transition-colors">
      <div className="absolute inset-0 bg-stone-200/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
        <span className="material-symbols-outlined text-stone-800 text-4xl">menu_book</span>
      </div>
      {/* Abstract Cover for Books without Static Images */}
      <div className="relative z-10 transition-transform duration-500 group-hover:scale-105">
        <h4 className="font-headline text-3xl font-black text-stone-400 opacity-20 mb-2 leading-none">{book.year}</h4>
        <h3 className="font-headline text-xl font-bold text-stone-800 leading-tight line-clamp-4">{book.title}</h3>
      </div>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <span className="material-symbols-outlined text-6xl">menu_book</span>
      </div>
      {book.blog_link && (
        <a href={book.blog_link} target="_blank" rel="noopener noreferrer" className="absolute top-4 left-4 z-30">
          <span className="font-label text-[10px] uppercase tracking-widest bg-secondary text-white px-2 py-1 rounded">Review</span>
        </a>
      )}
    </div>
    <div className="flex justify-between items-start mb-1 flex-grow">
      <h3 className="font-headline text-lg font-bold leading-tight group-hover:text-secondary transition-colors text-stone-800 line-clamp-2" title={book.title}>
        {book.title}
      </h3>
    </div>
    <p className="font-label text-xs text-stone-500 uppercase tracking-widest mt-auto truncate" title={book.author}>{book.author}</p>
  </div>
);

const DigitalLibrary = ({ books }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [filterLanguage, setFilterLanguage] = useState('All');
  const [filterReview, setFilterReview] = useState('All');
  const [selectedBook, setSelectedBook] = useState(null);

  // Get unique tags and languages
  const allTags = useMemo(() => {
    const tags = new Set(books.flatMap((b) => b.tags || []));
    return [...tags].sort();
  }, [books]);

  const allLanguages = useMemo(() => {
    const langs = new Set(books.map((b) => b.language).filter(Boolean));
    return [...langs].sort();
  }, [books]);

  const booksWithReviews = books.filter((b) => b.blog_link);
  const [featuredBook, setFeaturedBook] = useState(() => {
    return booksWithReviews.length > 0
      ? booksWithReviews[Math.floor(Math.random() * booksWithReviews.length)]
      : books[0];
  });

  const shuffleFeatured = () => {
    if (booksWithReviews.length > 0) {
      setFeaturedBook(booksWithReviews[Math.floor(Math.random() * booksWithReviews.length)]);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase())
                         || book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = filter === 'All' || (book.tags && book.tags.includes(filter));
    const matchesLanguage = filterLanguage === 'All' || book.language === filterLanguage;
    const matchesReview = filterReview === 'All'
                         || (filterReview === 'Reviewed' && book.blog_link)
                         || (filterReview === 'No Review' && !book.blog_link);
    
    return matchesSearch && matchesTag && matchesLanguage && matchesReview;
  });

  return (
    <div className="flex flex-col gap-12 w-full">
      {/* Hero Section: Featured Review */}
      <section className="mb-12">
        <div className="w-full bg-secondary/[0.03] border border-secondary/10 p-8 lg:p-12 rounded-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 p-12 opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-[15rem] leading-none transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          </div>
          <div className="relative z-10 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
              <span className="font-label text-xs uppercase tracking-widest text-secondary font-bold block">Featured Review</span>
              <button 
                onClick={shuffleFeatured} 
                className="text-stone-400 hover:text-stone-700 transition-colors flex items-center justify-center p-2 rounded-lg hover:bg-stone-200 active:scale-95 group border border-transparent hover:border-stone-300" 
                title="Shuffle Book"
              >
                <span className="material-symbols-outlined transition-transform duration-300 group-active:rotate-180">shuffle</span>
              </button>
            </div>
            
            <h1 className="font-headline text-5xl md:text-7xl font-black mb-6 tracking-tight text-stone-900">{featuredBook?.title || "Book Title"}</h1>
            <p className="font-headline text-xl text-stone-500 italic mb-8">{featuredBook?.author || "Author"}</p>

            <div className="space-y-6 mb-12">
              <div className="flex flex-wrap gap-2">
                {featuredBook?.tags?.map((tag) => (
                  <span key={tag} className="px-4 py-2 bg-stone-100 border border-stone-200 rounded-full font-label text-[10px] uppercase tracking-widest text-stone-500">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="p-6 bg-white border border-stone-100 rounded-xl border-l-4 border-l-secondary">
                <p className="text-stone-500 font-body leading-relaxed text-sm">
                  {featuredBook?.language === "Marathi" 
                    ? "A highly recommended piece of regional literature exploring deep cultural, social, or philosophical themes translated for global reflection." 
                    : "An exploration into the depths of literature that fundamentally shifted my perspective on design, history, or philosophy."}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              {featuredBook?.blog_link && (
                <a href={featuredBook.blog_link} target="_blank" rel="noopener noreferrer">
                  <button className="bg-stone-900 text-white px-8 py-4 rounded-xl font-label font-bold text-sm tracking-wide active:scale-95 hover:bg-black duration-200 shadow-md">
                    Read Full Review
                  </button>
                </a>
              )}
              {featuredBook?.link && (
                <a href={featuredBook.link} target="_blank" rel="noopener noreferrer">
                  <button className="text-stone-500 hover:text-stone-300 font-label font-bold text-sm tracking-wide px-8 py-4 transition-colors">
                    View on Goodreads
                  </button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="p-8 bg-stone-50 border border-stone-100 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="font-headline text-5xl font-black text-stone-900 mb-2">{books.length}</span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold">Total Books</span>
        </div>
        <div className="p-8 bg-stone-50 border border-stone-100 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="font-headline text-5xl font-black text-stone-900 mb-2">{books.filter((b) => b.language === 'Marathi').length}</span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold">Marathi Books</span>
        </div>
        <div className="p-8 bg-stone-50 border border-stone-100 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="font-headline text-5xl font-black text-stone-900 mb-2">{books.filter((b) => b.blog_link).length}</span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold">Reviews Written</span>
        </div>
      </section>

      {/* Library Filter & Search */}
      <section className="mb-12">
        <div className="flex flex-col gap-6 mb-8">
          <div>
            <h2 className="font-headline text-4xl font-black mb-2 tracking-tight text-stone-900">Personal Library</h2>
            <p className="font-body text-stone-500 max-w-md">A curated selection of literature that shaped my perspective on design, philosophy, and technology.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full bg-secondary/[0.03] p-4 rounded-xl border border-secondary/10 items-center">
            {/* Search Box */}
            <div className="relative col-span-1 md:col-span-5">
              <input 
                type="text" 
                placeholder="Search titles or authors..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 bg-white border border-stone-100 rounded-lg px-10 font-body text-sm text-stone-950 placeholder:text-stone-400 outline-none focus:border-secondary transition-colors"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none text-[18px]">search</span>
            </div>
            
            {/* Tag Filter */}
            <div className="col-span-1 md:col-span-3">
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full h-12 bg-white border border-stone-200 rounded-lg px-4 font-label text-xs uppercase tracking-wider text-stone-800 outline-none cursor-pointer hover:border-secondary transition-colors"
              >
                <option value="All">All Categories</option>
                {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
            
            {/* Language Filter */}
            <div className="col-span-1 md:col-span-2">
              <select 
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="w-full h-12 bg-white border border-stone-200 rounded-lg px-4 font-label text-xs uppercase tracking-wider text-stone-800 outline-none cursor-pointer hover:border-secondary transition-colors"
              >
                <option value="All">All Languages</option>
                {allLanguages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>

            {/* Review Status Filter */}
            <div className="col-span-1 md:col-span-2">
              <select 
                value={filterReview}
                onChange={(e) => setFilterReview(e.target.value)}
                className="w-full h-12 bg-white border border-stone-200 rounded-lg px-4 font-label text-xs uppercase tracking-wider text-stone-800 outline-none cursor-pointer hover:border-secondary transition-colors"
              >
                <option value="All">All Books</option>
                <option value="Reviewed">With Reviews</option>
                <option value="No Review">No Review Yet</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="flex justify-end mb-8 -mt-4 h-8 px-2">
            {(searchTerm !== "" || filter !== "All" || filterLanguage !== "All" || filterReview !== "All") && (
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setFilter("All");
                  setFilterLanguage("All");
                  setFilterReview("All");
                }}
                className="flex items-center gap-2 text-secondary font-label text-[10px] uppercase tracking-widest font-bold hover:text-stone-900 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Library Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-16 gap-x-8 w-full relative z-0">
        {filteredBooks.length > 0 ? filteredBooks.map((book) => (
          <BookCard 
            key={book.id} 
            book={book} 
            onClick={() => setSelectedBook(book)}
          />
        )) : (
          <div className="col-span-full py-12 text-center text-stone-500 font-body">No books found matching your criteria.</div>
        )}
      </section>

      {/* Book details Modal */}
      {selectedBook && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" 
          onClick={() => setSelectedBook(null)}
        >
          <div 
            className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedBook(null)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 transition-colors z-20"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8 mb-4">
                <div className="hidden md:flex w-1/3 aspect-[2/3] bg-stone-50 rounded-lg border border-stone-100 relative overflow-hidden flex-shrink-0 flex-col justify-end p-6">
                  <div className="absolute inset-0 bg-stone-200/20 mix-blend-multiply pointer-events-none"></div>
                  <span className="material-symbols-outlined text-stone-200 text-[10rem] absolute -top-8 -right-8 rotate-12 pointer-events-none" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                  {selectedBook?.year && (
                    <span className="relative z-10 font-headline text-2xl font-black text-stone-300 tracking-widest leading-none">{selectedBook.year}</span>
                  )}
                  {selectedBook?.language && (
                    <span className="relative z-10 font-label text-[10px] mt-2 bg-stone-200 px-2 py-1 rounded text-stone-600 uppercase tracking-widest w-fit">
                      {selectedBook.language}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col">
                  <span className="font-label text-[10px] bg-stone-50 border border-stone-100 px-3 py-1 rounded uppercase tracking-widest text-secondary w-fit mb-4">
                    Documented Archive
                  </span>
                  <h2 className="font-headline text-3xl md:text-4xl font-black text-stone-900 mb-2 leading-none">{selectedBook?.title}</h2>
                  <p className="font-headline text-xl italic text-stone-500 mb-6">{selectedBook?.author}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-8">
                    {selectedBook?.tags?.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-stone-50 border border-stone-100 rounded-full font-label text-[10px] uppercase tracking-widest text-stone-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <p className="font-body text-stone-600 leading-relaxed mb-auto bg-stone-50 border-l-2 border-l-stone-200 p-4 text-sm rounded-r-lg">
                    {selectedBook?.description || "A curated piece of literature from my personal library that shaped my perspectives on interaction design, architectural philosophy, and digital intent."}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 border-t border-stone-100 pt-8 mt-6">
                {selectedBook?.blog_link && (
                  <a href={selectedBook.blog_link} target="_blank" rel="noopener noreferrer">
                    <button className="bg-stone-900 text-white px-6 py-3 rounded-xl font-label font-bold text-xs uppercase tracking-widest active:scale-95 duration-200">
                      Read Full Review
                    </button>
                  </a>
                )}
                {selectedBook?.link && (
                  <a href={selectedBook.link} target="_blank" rel="noopener noreferrer">
                    <button className="bg-white border border-stone-200 text-stone-500 hover:text-stone-900 px-6 py-3 rounded-xl font-label font-bold text-xs uppercase tracking-widest transition-colors">
                      View on Goodreads
                    </button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalLibrary;
