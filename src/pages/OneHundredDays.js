import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageShell from '../atlas/PageShell';
import { useBlogs } from '../context/ContentContext';
import ShareImageButton from '../components/share/ShareImageButton';
import ExpeditionTrail from '../components/OneHundredDays/ExpeditionTrail';
import ClassicProgress from '../components/OneHundredDays/ClassicProgress';

const YEAR = 2026;
const GOAL = 100;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Every post carries the challenge tag — filtering by it is a no-op, so hide it
const CHALLENGE_TAG = '100_Days_to_Offload';

// Interactive elements here use div[role="button"] like the rest of the site —
// originally to dodge the legacy HTML5UP button globals, which no longer exist.
const keyActivate = (fn) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

const barColorClass = (isActive, count) => {
  if (isActive) return 'bg-secondary shadow-lg shadow-secondary/30';
  return count > 0
    ? 'bg-secondary/40 group-hover:bg-secondary/70'
    : 'bg-stone-100 dark:bg-stone-800';
};

const platformColors = {
  Substack: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  WordPress: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  Canva: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
};

const OneHundredDays = () => {
  const { data: blogsData } = useBlogs();
  const [searchParams, setSearchParams] = useSearchParams();
  // Dynamic (trail) is the default; ?layout=classic keeps the old progress
  // band. (`view` is off-limits here — useViewMode reserves it for the
  // atlas/classic shell switch.)
  const view = searchParams.get('layout') === 'classic' ? 'classic' : 'trail';
  const setView = (next) => {
    const params = new URLSearchParams(searchParams);
    params.set('layout', next);
    setSearchParams(params, { replace: true });
  };
  const [titleText, setTitleText] = useState('');
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [blogCopyState, setBlogCopyState] = useState('idle');
  const [blogShareState, setBlogShareState] = useState('idle');

  const handleBlogCopy = (blog) => {
    navigator.clipboard.writeText(`${window.location.origin}/100-days-to-offload/${blog.id}`);
    setBlogCopyState('copied');
    setTimeout(() => setBlogCopyState('idle'), 2000);
  };

  const handleBlogShare = async (blog) => {
    const url = `${window.location.origin}/100-days-to-offload/${blog.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: blog.blog_title, url });
        setBlogShareState('shared');
      } else {
        await navigator.clipboard.writeText(url);
        setBlogShareState('copied');
      }
    } catch (_) {
      // Ignored
    }
    setTimeout(() => setBlogShareState('idle'), 2000);
  };
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [activePlatform, setActivePlatform] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
  const fullTitle = 'Can I publish 100 posts on blog in a year?';

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setTitleText(fullTitle.slice(0, index + 1));
      index += 1;
      if (index === fullTitle.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const totalPosts = blogsData.length;

  // Waypoints walk the trail in publish order regardless of row order.
  const trailBlogs = useMemo(
    () => blogsData.slice().sort((a, b) => (a.blog_date < b.blog_date ? -1 : 1)),
    [blogsData],
  );

  // Modal a11y: Esc closes, and the page behind doesn't scroll while open.
  useEffect(() => {
    if (!selectedBlog) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedBlog(null); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedBlog]);

  // Pace: where the post count should be if spread evenly over the year
  const pace = useMemo(() => {
    const now = new Date();
    const start = new Date(YEAR, 0, 1);
    const dayOfYear = Math.min(365, Math.max(1, Math.floor((now - start) / 86400000) + 1));
    const expected = Math.round((dayOfYear / 365) * GOAL);
    return { dayOfYear, expected, delta: totalPosts - expected };
  }, [totalPosts]);

  const tagCounts = useMemo(() => {
    const dist = {};
    blogsData.forEach((blog) => {
      blog.blog_tags.forEach((tag) => {
        if (tag !== CHALLENGE_TAG) dist[tag] = (dist[tag] || 0) + 1;
      });
    });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, [blogsData]);

  const platformCounts = useMemo(() => {
    const dist = {};
    blogsData.forEach((blog) => {
      if (blog.blog_platform) dist[blog.blog_platform] = (dist[blog.blog_platform] || 0) + 1;
    });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, [blogsData]);

  const monthCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    blogsData.forEach((blog) => {
      const d = new Date(blog.blog_date);
      if (d.getFullYear() === YEAR) counts[d.getMonth()] += 1;
    });
    return counts;
  }, [blogsData]);
  const maxMonthCount = Math.max(...monthCounts, 1);

  const calendarData = useMemo(() => {
    const days = [];
    const startDayOfWeek = new Date(YEAR, 0, 1).getDay();
    for (let i = 0; i < startDayOfWeek; i += 1) {
      days.push({ date: `padding-${i}`, isPadding: true });
    }
    const date = new Date(YEAR, 0, 1);
    while (date.getFullYear() === YEAR) {
      const dateString = date.toISOString().split('T')[0];
      const blog = blogsData.find((b) => b.blog_date === dateString);
      days.push({ date: dateString, hasPost: !!blog, blog, isPadding: false });
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [blogsData]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return blogsData
      .slice()
      .reverse()
      .filter((blog) => {
        if (activeTag && !blog.blog_tags.includes(activeTag)) return false;
        if (activePlatform && blog.blog_platform !== activePlatform) return false;
        if (activeMonth !== null && new Date(blog.blog_date).getMonth() !== activeMonth) return false;
        if (q && !`${blog.blog_title} ${blog.blog_description || ''}`.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [blogsData, query, activeTag, activePlatform, activeMonth]);

  const hasFilters = query || activeTag || activePlatform || activeMonth !== null;
  const clearFilters = () => {
    setQuery('');
    setActiveTag(null);
    setActivePlatform(null);
    setActiveMonth(null);
  };

  return (
    <PageShell
      region="writer"
      title="100 Days To Offload"
      description="Following the #100DaysToOffload challenge — publishing 100 blog posts in a year, with progress tracking, pace status, and interactive filtering of every post."
    >
      <div className="flex flex-col gap-10 w-full max-w-4xl" id="one-hundred-days">
        {/* Hero */}
        <header>
          <span className="font-label text-xs uppercase tracking-[0.3em] text-secondary font-bold mb-4 block">
            Challenge
          </span>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-4">
            100 Days To Offload.
          </h1>
          <p className="font-label text-sm uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500 font-medium italic mb-0">
            {titleText}
            <span className="inline-block w-[2px] h-[1em] bg-secondary ml-1 animate-pulse align-text-bottom" />
          </p>
        </header>

        {/* Progress band — the Expedition Trail by default, ?view=classic for the ring */}
        <section className="bg-secondary/[0.03] dark:bg-secondary/[0.05] border border-secondary/10 dark:border-secondary/20 rounded-xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
            <p className="font-body text-stone-600 dark:text-stone-400 leading-relaxed mb-0 max-w-2xl flex-1">
              Publish <strong>100 posts in a year</strong> — an experiment in consistent
              writing on technology, policy, digital well-being, and life. Inspired by{' '}
              <a
                href="https://100daystooffload.com/"
                target="_blank"
                rel="noreferrer"
                className="text-secondary hover:underline"
              >
                100DaysToOffload.com
              </a>.
              {view === 'trail' && ' Every inked waypoint on the trail is a published post — click one to open it.'}
            </p>
            <div className="flex gap-1 shrink-0">
              {[{ value: 'trail', label: 'Trail' }, { value: 'classic', label: 'Classic' }].map(({ value: v, label }) => (
                <div
                  key={v}
                  role="button"
                  tabIndex={0}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  onKeyDown={keyActivate(() => setView(v))}
                  className={`px-2.5 py-1 rounded-lg font-label text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                    view === v
                      ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                      : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-secondary dark:hover:text-secondary border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
          {view === 'trail' ? (
            <ExpeditionTrail blogs={trailBlogs} goal={GOAL} pace={pace} onSelect={setSelectedBlog} />
          ) : (
            <ClassicProgress totalPosts={totalPosts} goal={GOAL} pace={pace} />
          )}
        </section>

        {/* Calendar heatmap — cells with posts are clickable */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">
              Progress Map ({YEAR})
            </p>
            <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
              Click a square to open the post
            </p>
          </div>
          <div className="p-4 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl overflow-x-auto">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(12px, 1fr))',
                gridAutoFlow: 'column',
                gridTemplateRows: 'repeat(7, 1fr)',
              }}
            >
              {calendarData.map((day) => (day.hasPost ? (
                <div
                  key={day.date}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBlog(day.blog)}
                  onKeyDown={keyActivate(() => setSelectedBlog(day.blog))}
                  aria-label={`${day.date}: ${day.blog.blog_title}`}
                  title={`${day.date}: ${day.blog.blog_title}`}
                  className="w-3 h-3 rounded-[2px] bg-secondary border border-secondary shadow-[0_0_8px_rgba(235,108,79,0.2)] cursor-pointer hover:scale-150 transition-transform"
                />
              ) : (
                <div
                  key={day.date}
                  title={day.isPadding ? '' : day.date}
                  className={`w-3 h-3 rounded-[2px] ${
                    day.isPadding
                      ? 'bg-transparent'
                      : 'bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700/50'
                  }`}
                />
              )))}
            </div>
          </div>
        </section>

        {/* Posts per month bar chart — click to filter */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">
              Posts Per Month
            </p>
            <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
              Click a bar to filter
            </p>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-6">
            <div className="flex items-end justify-between gap-2 h-32">
              {monthCounts.map((count, i) => (
                <div
                  key={MONTH_LABELS[i]}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveMonth(activeMonth === i ? null : i)}
                  onKeyDown={keyActivate(() => setActiveMonth(activeMonth === i ? null : i))}
                  aria-label={`${MONTH_LABELS[i]}: ${count} posts`}
                  className="flex-1 flex flex-col items-center justify-end gap-2 h-full cursor-pointer group"
                >
                  <span className={`font-label text-[10px] font-bold transition-colors ${
                    activeMonth === i ? 'text-secondary' : 'text-stone-400 dark:text-stone-500 group-hover:text-secondary'
                  }`}
                  >
                    {count > 0 ? count : ''}
                  </span>
                  <div
                    className={`w-full max-w-[28px] rounded-t-md transition-all ${barColorClass(activeMonth === i, count)}`}
                    style={{ height: count > 0 ? `${Math.max(8, (count / maxMonthCount) * 80)}px` : '4px' }}
                  />
                  <span className={`font-label text-[9px] uppercase tracking-wider transition-colors ${
                    activeMonth === i ? 'text-secondary font-bold' : 'text-stone-400 dark:text-stone-500'
                  }`}
                  >
                    {MONTH_LABELS[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Explorer: search + filters + post cards */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">
              Explore Posts
            </p>
            <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
              {filteredPosts.length} of {totalPosts}
            </p>
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts by title or description…"
            className="w-full mb-4 px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl font-body text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-secondary transition-colors"
          />

          <div className="flex flex-wrap gap-2 mb-3">
            {platformCounts.map(([platform, count]) => (
              <div
                key={platform}
                role="button"
                tabIndex={0}
                onClick={() => setActivePlatform(activePlatform === platform ? null : platform)}
                onKeyDown={keyActivate(() => setActivePlatform(activePlatform === platform ? null : platform))}
                className={`inline-flex px-3 py-1 rounded-full text-xs font-label font-bold border cursor-pointer transition-all ${
                  activePlatform === platform
                    ? 'bg-secondary text-white border-secondary'
                    : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-secondary hover:text-secondary'
                }`}
              >
                {platform} ({count})
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {tagCounts.map(([tag, count]) => (
              <div
                key={tag}
                role="button"
                tabIndex={0}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                onKeyDown={keyActivate(() => setActiveTag(activeTag === tag ? null : tag))}
                className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-label border cursor-pointer transition-all ${
                  activeTag === tag
                    ? 'bg-secondary text-white border-secondary'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-100 dark:border-stone-700 hover:border-secondary hover:text-secondary'
                }`}
              >
                #{tag} {count}
              </div>
            ))}
          </div>

          {hasFilters && (
            <div
              role="button"
              tabIndex={0}
              onClick={clearFilters}
              onKeyDown={keyActivate(clearFilters)}
              className="mb-6 inline-flex items-center gap-1 font-label text-xs font-bold text-secondary cursor-pointer hover:underline"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Clear all filters
            </div>
          )}

          {filteredPosts.length === 0 ? (
            <p className="text-stone-500 dark:text-stone-400 font-body italic text-center py-12">
              No posts match these filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map((blog) => (
                <div
                  key={blog.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBlog(blog)}
                  onKeyDown={keyActivate(() => setSelectedBlog(blog))}
                  className="text-left bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-5 cursor-pointer hover:border-secondary/40 hover:shadow-md transition-all group flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">
                      {blog.blog_date}
                    </span>
                    <div className="flex items-center gap-2">
                      {blog.blog_platform && (
                        <span className={`font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          platformColors[blog.blog_platform] || 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                        }`}
                        >
                          {blog.blog_platform}
                        </span>
                      )}
                      <Link
                        to={`/100-days-to-offload/${blog.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-label text-[10px] text-stone-300 dark:text-stone-600 hover:text-secondary dark:hover:text-secondary transition-colors leading-none"
                        title="Permalink"
                      >
                        ↗
                      </Link>
                    </div>
                  </div>
                  <p className="font-body font-semibold text-sm text-stone-800 dark:text-stone-200 group-hover:text-secondary transition-colors leading-snug mb-0">
                    {blog.blog_title}
                  </p>
                  {blog.blog_description && (
                    <p className="font-body text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2 mb-0">
                      {blog.blog_description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-auto pt-1">
                    {blog.blog_tags.filter((t) => t !== CHALLENGE_TAG).map((tag) => (
                      <span key={tag} className="font-label text-[9px] text-stone-400 dark:text-stone-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Post detail modal */}
        {selectedBlog && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedBlog(null)}
          >
            <div
              className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 relative shadow-2xl transition-transform"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedBlog(null)}
                className="absolute top-4 right-6 text-3xl text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors leading-none p-0 bg-transparent border-0 cursor-pointer"
              >
                &times;
              </button>
              <h3 className="text-2xl font-headline font-bold text-stone-900 dark:text-stone-100 mb-4 pr-8">{selectedBlog.blog_title}</h3>
              {selectedBlog.blog_description && (
                <p className="text-stone-600 dark:text-stone-400 mb-6 leading-relaxed bg-stone-50 dark:bg-stone-800 p-4 rounded-lg border-l-4 border-l-stone-200 dark:border-l-stone-700">
                  {selectedBlog.blog_description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedBlog.blog_tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-md text-xs border border-stone-100 dark:border-stone-800">#{tag}</span>
                ))}
              </div>
              <p className="mb-8 text-sm text-stone-500 dark:text-stone-500 font-label uppercase tracking-widest pb-4 border-b border-stone-100 dark:border-stone-800">
                <span className="font-bold text-stone-400">Platform:</span> {selectedBlog.blog_platform} |{' '}
                <span className="font-bold text-stone-400">Language:</span> {selectedBlog.language} |{' '}
                <span className="font-bold text-stone-400">Date:</span> {selectedBlog.blog_date}
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <a
                  href={selectedBlog.blog_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block whitespace-nowrap bg-secondary text-white px-8 py-4 rounded-xl font-label font-bold text-sm tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-secondary/20"
                >
                  READ FULL POST
                </a>
                <div className="flex items-center gap-3">
                  <ShareImageButton kind="blog" item={selectedBlog} />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleBlogShare(selectedBlog)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBlogShare(selectedBlog); } }}
                    className="flex items-center gap-1 font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors cursor-pointer"
                    title="Share"
                  >
                    <span className="material-symbols-outlined text-sm">{blogShareState === 'idle' ? 'share' : 'check'}</span>
                    { { shared: 'Shared!', copied: 'Copied!' }[blogShareState] || 'Share' }
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleBlogCopy(selectedBlog)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBlogCopy(selectedBlog); } }}
                    className="flex items-center gap-1 font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors cursor-pointer"
                    title="Copy link"
                  >
                    <span className="material-symbols-outlined text-sm">{blogCopyState === 'copied' ? 'check' : 'content_copy'}</span>
                    {blogCopyState === 'copied' ? 'Copied!' : 'Copy'}
                  </div>
                  <Link
                    to={`/100-days-to-offload/${selectedBlog.id}`}
                    className="font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors"
                  >
                    Permalink ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default OneHundredDays;
