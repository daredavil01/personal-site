import React, { useMemo, useState, useEffect } from 'react';
import Main from '../layouts/Main';
import blogsData from '../data/100DaysToOffload';

const OneHundredDays = () => {
  const [titleText, setTitleText] = useState('');
  const [selectedBlog, setSelectedBlog] = useState(null);
  const fullTitle = 'Can I publish 100 posts on blog in a year?';

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setTitleText(fullTitle.slice(0, index + 1));
      index += 1;
      if (index === fullTitle.length) {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // --- Stats Calculation ---
  const totalPosts = blogsData.length;

  const tagsDistribution = useMemo(() => {
    const dist = {};
    blogsData.forEach((blog) => {
      blog.blog_tags.forEach((tag) => {
        dist[tag] = (dist[tag] || 0) + 1;
      });
    });
    return dist;
  }, []);

  // Sort tags by count
  const sortedTags = Object.entries(tagsDistribution).sort((a, b) => b[1] - a[1]);

  const platformDistribution = useMemo(() => {
    const dist = {};
    blogsData.forEach((blog) => {
      if (blog.blog_platform) {
        dist[blog.blog_platform] = (dist[blog.blog_platform] || 0) + 1;
      }
    });
    return dist;
  }, []);
  const sortedPlatforms = Object.entries(platformDistribution).sort((a, b) => b[1] - a[1]);

  // --- Calendar Generation ---
  const year = 2026;
  const calendarData = useMemo(() => {
    const days = [];
    const startDate = new Date(year, 0, 1);

    // Add padding for start of week (assuming Sunday start)
    const startDayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday...
    for (let i = 0; i < startDayOfWeek; i += 1) {
      days.push({ date: `padding-${i}`, isPadding: true });
    }

    const date = new Date(year, 0, 1);
    while (date.getFullYear() === year) {
      const dateString = date.toISOString().split('T')[0];
      const blog = blogsData.find((b) => b.blog_date === dateString);
      days.push({
        date: dateString,
        hasPost: !!blog,
        blog,
        isPadding: false,
      });
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, []);

  const getCompletionPercentage = () => ((totalPosts / 100) * 100).toFixed(1);

  return (
    <Main
      title="100 Days To Offload"
      description="Following the #100DaysToOffload challenge — publishing 100 blog posts in a year, with progress tracking, tag cloud, platform breakdown, and full post history."
    >
      <article className="max-w-4xl" id="one-hundred-days">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
            <div className="flex-shrink-0">
                {/* SVG Logo */}
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 600 600"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-sm dark:filter dark:invert dark:brightness-200"
                >
                  <defs>
                    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#fff7c0', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#d0f0c0', stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id="paperTexture">
                      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
                      <feDiffuseLighting in="noise" lightingColor="#fff" surfaceScale="2">
                        <feDistantLight azimuth="45" elevation="60" />
                      </feDiffuseLighting>
                    </filter>
                  </defs>

                  <g>
                    <circle cx="300" cy="300" r="280" fill="url(#bgGradient)" filter="url(#paperTexture)" opacity="0.9" />
                    <text x="300" y="300" fontFamily="monospace" fontSize="10" fill="#a0c0a0" opacity="0.2" textAnchor="middle">
                      <tspan x="300" dy="-250">010101010101010101010101</tspan>
                      <tspan x="300" dy="20">101010101010101010101010</tspan>
                      <tspan x="300" dy="20">010101010101010101010101</tspan>
                      <tspan x="300" dy="400">010101010101010101010101</tspan>
                    </text>
                  </g>

                  <g transform="translate(270, 50)">
                    <circle cx="30" cy="20" r="15" fill="none" stroke="#000" strokeWidth="2" />
                    <line x1="30" y1="35" x2="30" y2="70" stroke="#000" strokeWidth="2" />
                    <line x1="30" y1="45" x2="10" y2="30" stroke="#000" strokeWidth="2" />
                    <line x1="30" y1="45" x2="50" y2="30" stroke="#000" strokeWidth="2" />
                    <line x1="30" y1="70" x2="15" y2="90" stroke="#000" strokeWidth="2" />
                    <line x1="30" y1="70" x2="45" y2="90" stroke="#000" strokeWidth="2" />
                    <path d="M10,30 L10,5 L50,5 L50,30" fill="none" stroke="#000" strokeWidth="2" />
                    <text x="30" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="#000" textAnchor="middle">GOAL!</text>
                  </g>

                  <g fontFamily="Arial Black, sans-serif" fontWeight="bold" textAnchor="middle">
                    <text x="300" y="200" fontSize="100">
                      <tspan fill="#FF0000">1</tspan>
                      <tspan fill="#FF7F00">0</tspan>
                      <tspan fill="#FFFF00">0</tspan>
                      <tspan fill="#00FF00"> </tspan>
                      <tspan fill="#00FF00">D</tspan>
                      <tspan fill="#0000FF">A</tspan>
                      <tspan fill="#4B0082">Y</tspan>
                      <tspan fill="#8B00FF">S</tspan>
                    </text>
                    <text x="300" y="290" fontSize="80" fill="#0000FF">TO</text>
                    <text x="300" y="400" fontSize="90" fill="#FF0000">OFFLOAD</text>
                  </g>

                  <text x="300" y="450" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="30" fill="#FF0000" textAnchor="middle">WRITE 100 POSTS IN A YEAR!</text>

                  <g transform="translate(220, 250)">
                    <g transform="rotate(-10)">
                      <rect x="0" y="0" width="80" height="15" fill="#fff" stroke="#000" strokeWidth="1" />
                      <rect x="5" y="-15" width="80" height="15" fill="#fff" stroke="#000" strokeWidth="1" />
                      <rect x="10" y="-30" width="80" height="15" fill="#fff" stroke="#000" strokeWidth="1" />
                      <path d="M15,-30 L55,-30 L55,-60 Q35,-70 15,-60 Z" fill="#fff" stroke="#000" strokeWidth="1" />
                      <path d="M55,-30 L95,-30 L95,-60 Q75,-70 55,-60 Z" fill="#fff" stroke="#000" strokeWidth="1" />
                    </g>
                    <g transform="translate(100, 0)">
                      <path d="M0,0 Q-5,5 0,15 L20,15 Q25,5 20,0 Z" fill="#000" />
                      <path d="M10,0 Q10,-30 30,-50 Q20,-40 10,-20" fill="none" stroke="#000" strokeWidth="2" />
                      <path d="M30,-50 Q35,-60 45,-55 Q40,-45 30,-50" fill="#fff" stroke="#000" strokeWidth="1" />
                    </g>
                    <g transform="translate(20, 40)">
                      <rect x="0" y="0" width="140" height="20" fill="#fff" stroke="#000" strokeWidth="2" rx="5" />
                      <rect x="2" y="2" width="136" height="16" fill="#00FF00" rx="3" />
                      <text x="70" y="15" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="#000" textAnchor="middle">100/100</text>
                    </g>
                  </g>

                  <g transform="translate(450, 280)">
                    <g>
                      <rect x="0" y="0" width="80" height="60" fill="none" stroke="#FF0000" strokeWidth="2" />
                      <text x="10" y="20" fontFamily="Arial, sans-serif" fontSize="14" fill="#FF0000">T</text>
                      <text x="25" y="20" fontFamily="Arial, sans-serif" fontSize="10" fill="#FF0000">for</text>
                      <text x="10" y="45" fontFamily="Arial, sans-serif" fontSize="14" fill="#FF0000">&quot;TRACK&quot;</text>
                    </g>
                    <g transform="translate(0, 70)">
                      <rect x="0" y="0" width="100" height="60" fill="none" stroke="#FF0000" strokeWidth="2" />
                      <text x="10" y="20" fontFamily="Arial, sans-serif" fontSize="14" fill="#FF0000">C</text>
                      <text x="25" y="20" fontFamily="Arial, sans-serif" fontSize="10" fill="#FF0000">for</text>
                      <text x="10" y="45" fontFamily="Arial, sans-serif" fontSize="14" fill="#FF0000">&quot;CHALLENGE&quot;</text>
                    </g>
                    <text x="50" y="-20" fontFamily="Arial, sans-serif" fontSize="12" fill="#FF0000" textAnchor="middle">@nky s Blog</text>
                  </g>
                </svg>
            </div>
            <div>
              <h1 className="font-headline text-3xl font-bold text-stone-900 dark:text-stone-100 uppercase tracking-widest mb-2">100 Days To Offload</h1>
              <p className="font-label text-xs uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500 font-medium italic">
                {titleText}
                <span className="inline-block w-[2px] h-[1em] bg-secondary ml-1 animate-pulse align-text-bottom" />
              </p>
            </div>
          </div>
          <div className="h-px w-full bg-stone-100 dark:bg-stone-800" />
        </header>

        <section className="mb-12">
          <h3 className="text-stone-900 dark:text-stone-100 text-lg font-bold uppercase tracking-widest mb-4 inline-block after:content-[''] after:block after:w-10 after:h-[2px] after:bg-secondary after:mt-1">About the Challenge</h3>
          <p className="text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
            The <strong>100 Days to Offload</strong> challenge is a commitment to
            publish 100 blog posts in a year. It is an experiment to ramp up
            writing efforts, moving from occasional posts to a consistent flow of
            thoughts on technology, policy, digital well-being, and life. The goal
            is not just quantity, but to create an archive of diverse thoughts and
            to deepen understanding through the consistent act of writing and
            sharing.
          </p>
          <p className="text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
            Originally inspired by the{' '}
            <a
              href="https://100daystooffload.com/"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:underline"
            >
              100DaysToOffload.com
            </a>{' '}
            movement.
          </p>
        </section>

        <section className="mb-12">
          <h3 className="text-stone-900 dark:text-stone-100 text-lg font-bold uppercase tracking-widest mb-4 inline-block after:content-[''] after:block after:w-10 after:h-[2px] after:bg-secondary after:mt-1">Progress Map ({year})</h3>
          <div className="p-4 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-lg overflow-x-auto">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(12px, 1fr))',
                gridAutoFlow: 'column',
                gridTemplateRows: 'repeat(7, 1fr)',
              }}
            >
              {calendarData.map((day) => (
                <div
                  key={day.date}
                  title={
                    !day.isPadding
                      ? `${day.date}${
                        day.hasPost ? `: ${day.blog.blog_title}` : ''
                      }`
                      : ''
                  }
                  className={`w-3 h-3 rounded-[2px] transition-colors ${
                    day.isPadding ? 'bg-transparent' : (day.hasPost ? 'bg-secondary border border-secondary shadow-[0_0_8px_rgba(235,108,79,0.2)]' : 'bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700/50')
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-stone-500 dark:text-stone-500 text-sm mt-4 font-body italic">
            {totalPosts} posts completed out of 100.
          </p>
        </section>

        <section className="mb-12">
          <h3 className="text-stone-900 dark:text-stone-100 text-lg font-bold uppercase tracking-widest mb-6 inline-block after:content-[''] after:block after:w-10 after:h-[2px] after:bg-secondary after:mt-1">Stats</h3>
          <div className="flex flex-wrap gap-8">
            <div className="flex-1 min-w-[250px] bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-6 shadow-sm">
              <h4 className="text-stone-900 dark:text-stone-100 text-sm font-bold border-b border-stone-100 dark:border-stone-800 pb-2 mb-4">Tag Cloud</h4>
              <div className="flex flex-wrap gap-2">
                {sortedTags.map(([tag, count]) => (
                  <span key={tag} className="px-3 py-1 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-100 dark:border-stone-800 rounded-full text-xs transition-colors hover:bg-secondary hover:text-white dark:hover:bg-secondary dark:hover:text-white">
                    {tag} ({count})
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[250px] bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-6 shadow-sm">
              <h4 className="text-stone-900 dark:text-stone-100 text-sm font-bold border-b border-stone-100 dark:border-stone-800 pb-2 mb-4">Summary</h4>
              <ul className="space-y-3">
                <li className="flex justify-between text-sm text-stone-600 dark:text-stone-400 border-b border-stone-50 dark:border-stone-800 pb-2 last:border-0">
                  <span className="font-medium">Total Posts:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{totalPosts}</span>
                </li>
                <li className="flex justify-between text-sm text-stone-600 dark:text-stone-400 border-b border-stone-50 dark:border-stone-800 pb-2 last:border-0">
                  <span className="font-medium">Completion:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{getCompletionPercentage()}%</span>
                </li>
                <li className="flex justify-between text-sm text-stone-600 dark:text-stone-400 border-b border-stone-50 dark:border-stone-800 pb-2 last:border-0">
                  <span className="font-medium">Remaining:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{100 - totalPosts}</span>
                </li>
              </ul>
            </div>
            <div className="flex-1 min-w-[250px] bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-6 shadow-sm">
              <h4 className="text-stone-900 dark:text-stone-100 text-sm font-bold border-b border-stone-100 dark:border-stone-800 pb-2 mb-4">Platforms</h4>
              <div className="flex flex-wrap gap-2">
                {sortedPlatforms.map(([platform, count]) => (
                  <span key={platform} className="px-3 py-1 bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-100 dark:border-stone-800 rounded-full text-xs hover:bg-secondary hover:text-white transition-colors">
                    {platform} ({count})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h3 className="text-stone-900 dark:text-stone-100 text-lg font-bold uppercase tracking-widest mb-6 inline-block after:content-[''] after:block after:w-10 after:h-[2px] after:bg-secondary after:mt-1">Recent Posts</h3>
          <ul className="space-y-3">
            {blogsData
              .slice()
              .reverse()
              .map((blog) => (
                <li key={blog.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBlog(blog)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedBlog(blog);
                      }
                    }}
                    className="flex justify-between items-center bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-lg p-4 cursor-pointer hover:border-l-4 hover:border-l-secondary hover:shadow-md transition-all group"
                  >
                    <span className="text-stone-800 dark:text-stone-200 font-medium group-hover:text-secondary transition-colors line-clamp-1 mr-4">
                      {blog.blog_title}
                    </span>
                    <span className="text-stone-400 dark:text-stone-500 text-xs font-mono whitespace-nowrap">
                      {blog.blog_date}
                    </span>
                  </div>
                </li>
              ))}
          </ul>
        </section>

        {selectedBlog && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedBlog(null)}
          >
            <div 
              className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl max-w-2xl w-full p-8 relative shadow-2xl transition-transform"
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
              <a
                href={selectedBlog.blog_link}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-secondary text-white px-8 py-4 rounded-xl font-label font-bold text-sm tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-secondary/20"
              >
                READ FULL POST
              </a>
            </div>
          </div>
        )}
      </article>
    </Main>
  );
};

export default OneHundredDays;
