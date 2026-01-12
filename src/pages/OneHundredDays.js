import React, { useMemo, useState, useEffect } from 'react';
import Main from '../layouts/Main';
import blogsData from '../data/100DaysToOffload';
import styles from './OneHundredDays.module.css';

const OneHundredDays = () => {
  const [titleText, setTitleText] = useState('');
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

  const getDayClass = (day) => {
    if (day.isPadding) return '';
    return day.hasPost ? styles.dayActive : styles.dayEmpty;
  };

  const getCompletionPercentage = () => ((totalPosts / 100) * 100).toFixed(1);

  return (
    <Main
      title="100 Days To Offload"
      description="Challenge: Publish 100 posts in a year"
    >
      <article className="post" id="one-hundred-days">
        <header>
          <div className="title">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* SVG Logo */}
                <svg
                  width="100"
                  height="100"
                  viewBox="0 0 600 600"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
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
                <h2>100 Days To Offload</h2>
              </div>
            </div>
            <p className={styles.subtitle}>
              {titleText}
              <span className={styles.typewriterCursor} />
            </p>
          </div>
        </header>

        <section>
          <h3 className={styles.sectionTitle}>About the Challenge</h3>
          <p className={styles.descriptionText}>
            The <strong>100 Days to Offload</strong> challenge is a commitment to
            publish 100 blog posts in a year. It is an experiment to ramp up
            writing efforts, moving from occasional posts to a consistent flow of
            thoughts on technology, policy, digital well-being, and life. The goal
            is not just quantity, but to create an archive of diverse thoughts and
            to deepen understanding through the consistent act of writing and
            sharing.
          </p>
          <p className={styles.descriptionText}>
            Originally inspired by the{' '}
            <a
              href="https://100daystooffload.com/"
              target="_blank"
              rel="noreferrer"
            >
              100DaysToOffload.com
            </a>{' '}
            movement.
          </p>
        </section>

        <section>
          <h3 className={styles.sectionTitle}>Progress Map ({year})</h3>
          <div className={styles.calendarContainer}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(15px, 1fr))',
                gridAutoFlow: 'column',
                gridTemplateRows: 'repeat(7, 1fr)',
                gap: '3px',
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
                  className={getDayClass(day)}
                />
              ))}
            </div>
          </div>
          <p className={styles.descriptionText} style={{ marginTop: '0.5rem' }}>
            <small>{totalPosts} posts completed out of 100.</small>
          </p>
        </section>

        <section>
          <h3 className={styles.sectionTitle}>Stats</h3>
          <div className={styles.statsFlexContainer}>
            <div className={styles.statsColumn}>
              <h4 className={styles.columnHeader}>Tag Cloud</h4>
              <div className={styles.tagCloud}>
                {sortedTags.map(([tag, count]) => (
                  <span key={tag} className={styles.tagChip}>
                    {tag} ({count})
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.statsColumn}>
              <h4 className={styles.columnHeader}>Summary</h4>
              <ul className={styles.summaryList}>
                <li className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Posts:</span>
                  <span className={styles.summaryValue}>{totalPosts}</span>
                </li>
                <li className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Completion:</span>
                  <span className={styles.summaryValue}>
                    {getCompletionPercentage()}%
                  </span>
                </li>
                <li className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Remaining:</span>
                  <span className={styles.summaryValue}>
                    {100 - totalPosts}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h3 className={styles.sectionTitle}>Recent Posts</h3>
          <ul className={styles.recentPostsList}>
            {blogsData
              .slice()
              .reverse()
              .map((blog) => (
                <li key={blog.id} className={styles.recentPostItem}>
                  <a
                    href={blog.blog_link}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.recentPostLink}
                  >
                    {blog.blog_title}
                  </a>
                  <span className={styles.recentPostDate}>
                    {blog.blog_date}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </article>
    </Main>
  );
};

export default OneHundredDays;
