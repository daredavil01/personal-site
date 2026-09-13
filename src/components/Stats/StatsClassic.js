import React from "react";
import personalData from "../../data/stats/personal";
import useSiteStats from "./useSiteStats";
import { LoadingBlock, ErrorBlock } from "../common/AsyncStates";
import TagAnalysis from "./TagAnalysis";

// The pre-almanac Stats page, kept verbatim as the ?view=classic alternative.
const StatsClassic = () => {
  // One hourly-cached snapshot (GET /api/stats) instead of seven collection
  // fetches; the numbers come from src/lib/siteStats.js, the same code the
  // /ask chatbot's index is built from.
  const { data, loading, error } = useSiteStats();

  if (loading) return <LoadingBlock label="Loading stats…" />;
  if (error || !data) return <ErrorBlock />;

  const { stats, lists, tags } = data;
  const {
    booksCount,
    pagesTurnedK,
    topGenres,
    booksEnglish,
    booksMarathi,
    booksPerYearSorted,
    maxBooksInYear,
    topBookTags,
    booksWithReviews,
    booksReading,
    readingPace,
    offloadCount,
    offloadPercentage,
    topPlatforms,
    topBlogTags,
    blogEnglish,
    blogMarathi,
    topSkills,
    certCount,
    latestCert,
    orgCount,
    projectCount,
    totalRaces,
    totalKmRun,
    bestMarathonTime,
    bestHmTime,
    bestTenKTime,
    totalTreks,
    hardTreks,
    treksWithBlog,
    trekYearsActive,
    latestTrek,
    instaPostCount,
    totalPhotos,
    topInstaTags,
  } = stats;

  const ageComponent = personalData.find((item) => item.key === 'age')?.value;
  const location = personalData.find((item) => item.key === 'location')?.value || 'Pune, MH';
  const pagesTurned = `${pagesTurnedK.toFixed(1)}k`;

  return (
    <div className="flex flex-col gap-16 w-full">
        {/* Hero Title Section */}
        <section>
          <span className="font-label text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-4 block">Archive {new Date().getFullYear()}</span>
          <h1 className="font-headline text-5xl md:text-7xl text-stone-900 dark:text-stone-100 leading-none mb-6">Metrics of <br /><span className="text-secondary italic">Intent.</span></h1>
          <p className="text-stone-500 dark:text-stone-400 max-w-2xl text-lg font-light leading-relaxed">
            A quantitative deep-dive into a year of technical growth, artistic captures, and consistent physical output. Curated through the lens of performance and habit.
          </p>
        </section>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">

          {/* Quick Profile Card */}
          <div className="col-span-1 md:col-span-4 bg-white dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 flex flex-col justify-between transition-colors shadow-sm">
            <div>
              <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-2 block font-bold">Origin & Persona</span>
              <h3 className="font-headline text-3xl text-stone-800 dark:text-stone-200 mb-6">Digital Archetype</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-stone-50 dark:border-stone-800/50 pb-2">
                  <span className="text-stone-400 font-label text-xs uppercase tracking-widest">Age</span>
                  <span className="text-stone-800 dark:text-stone-200 font-label text-sm text-right overflow-hidden overflow-ellipsis whitespace-nowrap">{ageComponent}</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-stone-50 dark:border-stone-800/50 pb-2">
                  <span className="text-stone-400 font-label text-xs uppercase tracking-widest">Base</span>
                  <span className="text-stone-900 dark:text-stone-100 font-headline text-xl uppercase tracking-tighter">{location}</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-stone-50 dark:border-stone-800/50 pb-2">
                  <span className="text-stone-400 font-label text-xs uppercase tracking-widest">Orgs</span>
                  <span className="text-stone-900 dark:text-stone-100 font-headline text-xl">{String(orgCount).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-lg overflow-hidden border border-stone-100 dark:border-stone-800">
              <img
                className="w-full h-32 object-cover grayscale hover:grayscale-0 transition-all duration-700 opacity-90"
                alt="Pune Architecture"
                loading="lazy"
                decoding="async"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrBXPT3I2M0DNU6wyAE6pn7KCVSB3rqa6TPGidOrb3XKbkbZ4cXwKcDVWbe77kwlxZTK2HYglbsxFteB0UCO5a4CyhsbAmulSJvkm_xd8VyWfzr8MC0ApZlCKxbzk0SkhfFVQxQM5snPYNfbFGHAsfHXgoVM-G52J-JO5NuZhQaA1xbKh9KGDN5fzbmwp7CgHz9Fmno2DWhSZVT5VROsE8ckws47_mPrG69EeOz5SjB_ZBiZFaOn7bfiTQzHgTzEIIuLsWLyXbyhM"
              />
            </div>
          </div>

          {/* Reading Stats - Focus Card */}
          <div className="col-span-1 md:col-span-8 bg-secondary/[0.03] dark:bg-secondary/[0.05] p-8 rounded-xl border border-secondary/10 dark:border-secondary/20 relative overflow-hidden transition-colors shadow-sm">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <span className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-bold">Knowledge Consumption</span>
                <h3 className="font-headline text-4xl text-stone-900 dark:text-stone-100 mb-2">Reading Velocity</h3>
                <p className="text-stone-500/80 dark:text-stone-400/80 max-w-sm mb-6 text-sm">Aggregated metrics from the digital library.</p>
                <div className="flex gap-2 flex-wrap mb-8">
                  {topGenres.map((g) => (
                    <span key={g} className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">{g}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100">{booksCount}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Books Read</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100">{pagesTurned}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Pages Turned</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-secondary">{(readingPace).toFixed(1)}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Avg / Month</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100">{booksReading || "01"}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Active WIP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Skills - Asymmetric Grid Item */}
          <div className="col-span-1 md:col-span-7 bg-secondary/[0.03] dark:bg-stone-900/50 p-8 rounded-xl border border-secondary/10 dark:border-stone-800 transition-colors shadow-sm">
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Technical Arsenal</span>
            <div className="flex flex-wrap gap-3">
              {topSkills.map((skillTitle, i) => (
                <span
                  key={i}
                  className={`px-4 py-2 rounded-full font-label text-xs border transition-all ${
                    i === 2 || i === 5
                      ? 'bg-secondary/10 dark:bg-secondary/20 text-secondary border-secondary/20 dark:border-secondary/40 font-bold scale-110 mx-1'
                      : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-100 dark:border-stone-700 shadow-sm'
                  }`}
                >
                  {skillTitle}
                </span>
              ))}
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 border-t border-stone-100 dark:border-stone-800 pt-8">
              <div>
                <span className="block font-label text-[10px] uppercase text-stone-500 dark:text-stone-600 mb-2 font-bold tracking-widest">Certifications</span>
                <p className="text-stone-900 dark:text-stone-100 font-headline text-lg line-clamp-1">{latestCert}</p>
                <p className="text-stone-600 dark:text-stone-500 text-sm">{certCount} Total Certifications</p>
              </div>
              <div>
                <span className="block font-label text-[10px] uppercase text-stone-500 dark:text-stone-600 mb-2 font-bold tracking-widest">Primary Interest</span>
                <p className="text-stone-900 dark:text-stone-100 font-headline text-lg">Human-AI Interface Design</p>
              </div>
            </div>
          </div>

          {/* 100 Days to Offload - tracker */}
          <div className="col-span-1 md:col-span-5 bg-stone-50 dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 flex flex-col justify-between transition-colors shadow-sm">
            <div className="mb-6">
              <span className="font-label text-stone-500 dark:text-stone-600 font-bold mb-4 block uppercase tracking-[0.2em] text-[9px]">Output Challenge</span>
              <div className="flex flex-col gap-2 relative">
                <span className="font-headline text-8xl text-secondary/10 dark:text-secondary/5 absolute top-20 -left-1 tracking-tighter pointer-events-none leading-none">{offloadPercentage}%</span>
                <h3 className="font-headline text-3xl text-stone-800 dark:text-stone-200 relative z-10 leading-none">100 Days To Offload</h3>
              </div>
            </div>
            <div className="flex gap-2 mb-8 relative z-10">
              {topPlatforms.map(([platform, count]) => (
                <span key={platform} className="font-label text-[10px] bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 px-2 py-1 rounded">
                  {platform} <span className="text-secondary/80 font-bold">({count})</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-10 gap-2 mb-8">
              {/* Progress Grid visualization */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`h-3 rounded-sm transition-all duration-500 ${i < offloadPercentage / 10 ? 'bg-secondary ring-2 ring-secondary/20' : 'bg-secondary/20 dark:bg-secondary/10'}`} />
              ))}
            </div>
            <div className="flex justify-between items-center text-stone-500 dark:text-stone-600 font-label text-[10px] tracking-widest font-bold">
              <span>{offloadCount} POSTS COMPLETED</span>
              <span className="text-stone-400 dark:text-stone-700 font-normal">{100 - offloadCount} TO GO</span>
            </div>
          </div>

          {/* Physical Endurance Card */}
          <div className="col-span-1 md:col-span-7 bg-white dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 transition-colors shadow-sm flex flex-col justify-between">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <span className="font-label text-stone-500 dark:text-stone-600 font-bold mb-2 block uppercase tracking-[0.2em] text-[10px]">Physical Endurance</span>
                <h3 className="font-headline text-3xl text-stone-800 dark:text-stone-200 mb-2">Distance Covered</h3>
                <p className="text-stone-500 text-sm">Consistent logging of pavement strikes and sheer grit.</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-stone-200 dark:text-stone-800">directions_run</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div>
                <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100 mb-1">{totalRaces}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Total Races</span>
              </div>
              <div>
                <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100 mb-1">{Math.round(totalKmRun)}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">KM Logged</span>
              </div>
              <div>
                <span className="block font-headline text-4xl text-secondary mb-2 mt-1">{bestMarathonTime}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Marathon PB (Hrs)</span>
              </div>
              <div>
                <span className="block font-headline text-4xl text-stone-900 dark:text-stone-100 mb-2 mt-1">{bestHmTime}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Half-M PB (Hr)</span>
              </div>
              <div>
                <span className="block font-headline text-4xl text-stone-900 dark:text-stone-100 mb-2 mt-1">{bestTenKTime}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">10K PB (Min)</span>
              </div>
            </div>
          </div>

          {/* Digital Capture (Instagram) */}
          <div className="col-span-1 md:col-span-5 bg-secondary/[0.03] dark:bg-secondary/[0.05] p-8 rounded-xl border border-secondary/10 dark:border-secondary/20 transition-colors shadow-sm flex flex-col justify-between">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <span className="font-label text-stone-500 dark:text-stone-600 font-bold mb-2 block uppercase tracking-[0.2em] text-[10px]">Digital Capture</span>
                <h3 className="font-headline text-3xl text-stone-800 dark:text-stone-200">The Visual Archive</h3>
              </div>
              <span className="material-symbols-outlined text-4xl text-secondary/30 dark:text-secondary/20">photo_camera</span>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline text-6xl tracking-tighter text-stone-900 dark:text-stone-100">{instaPostCount}</span>
                </div>
                <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold mt-1">Collections</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline text-6xl tracking-tighter text-stone-900 dark:text-stone-100">{totalPhotos}</span>
                </div>
                <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold mt-1">Moments Captured</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {topInstaTags.map((tag) => (
                <span key={tag} className="font-label text-[9px] bg-secondary/5 dark:bg-secondary/10 border border-secondary/10 dark:border-secondary/20 text-secondary px-2 py-1 rounded-full uppercase tracking-widest">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Trek Log */}
          <div className="col-span-1 md:col-span-12 bg-white dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="font-label text-stone-500 dark:text-stone-600 font-bold mb-2 block uppercase tracking-[0.2em] text-[10px]">Mountain Adventures</span>
                <h3 className="font-headline text-3xl text-stone-800 dark:text-stone-200 mb-1">Trek Log</h3>
                <p className="text-stone-500 text-sm">Forts, trails, and elevation across Maharashtra.</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-stone-200 dark:text-stone-800">hiking</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div>
                <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100 mb-1">{totalTreks}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Total Treks</span>
              </div>
              <div>
                <span className="block font-headline text-5xl text-red-600 dark:text-red-400 mb-1">{hardTreks}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Hard Treks</span>
              </div>
              <div>
                <span className="block font-headline text-5xl text-indigo-600 dark:text-indigo-400 mb-1">{treksWithBlog}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Blog Posts</span>
              </div>
              <div>
                <span className="block font-headline text-5xl text-teal-600 dark:text-teal-400 mb-1">{trekYearsActive}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Years Active</span>
              </div>
              <div>
                <span className="block font-headline text-xl text-stone-900 dark:text-stone-100 mb-1 leading-tight">{latestTrek}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Latest Trek</span>
              </div>
            </div>
          </div>

          {/* Books Language & Tag Intelligence */}
          <div className="col-span-1 md:col-span-5 bg-white dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm">
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Reading Intelligence</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-6">Language & Interests</h3>
            {/* Language split */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 text-center">
                <div className="font-headline text-4xl text-blue-600 dark:text-blue-400">{booksEnglish}</div>
                <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">English Books</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 text-center">
                <div className="font-headline text-4xl text-amber-600 dark:text-amber-400">{booksMarathi}</div>
                <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">Marathi Books</div>
              </div>
            </div>
            {/* Reviews */}
            <div className="flex items-center justify-between border border-secondary/10 dark:border-secondary/20 rounded-lg px-4 py-3 mb-6">
              <span className="font-label text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">Books Reviewed / Written About</span>
              <span className="font-headline text-xl text-secondary">{booksWithReviews}</span>
            </div>
            {/* Top tags */}
            <div className="flex flex-wrap gap-2">
              {topBookTags.map(([tag, count]) => (
                <span key={tag} className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                  {tag} <span className="text-secondary font-bold">·{count}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Books Per Year */}
          <div className="col-span-1 md:col-span-7 bg-secondary/[0.03] dark:bg-stone-900/50 p-8 rounded-xl border border-secondary/10 dark:border-stone-800 shadow-sm">
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Reading Velocity</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-6">Books Per Year</h3>
            <div className="space-y-3">
              {booksPerYearSorted.map(([year, count]) => (
                <div key={year}>
                  <div className="flex justify-between text-xs font-label mb-1">
                    <span className="text-stone-700 dark:text-stone-300">{year}</span>
                    <span className="text-stone-400 dark:text-stone-500">{count} {count === 1 ? 'book' : 'books'}</span>
                  </div>
                  <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-secondary/70 to-secondary h-2 rounded-full transition-all"
                      style={{ width: `${(count / maxBooksInYear) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blog Intelligence */}
          <div className="col-span-1 md:col-span-6 bg-white dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm">
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Writing Themes</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-4">Blog Intelligence</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 text-center">
                <div className="font-headline text-3xl text-stone-900 dark:text-stone-100">{blogEnglish}</div>
                <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">English Posts</div>
              </div>
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 text-center">
                <div className="font-headline text-3xl text-stone-900 dark:text-stone-100">{blogMarathi}</div>
                <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Marathi Posts</div>
              </div>
            </div>
            <div className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3">Top Topics Written About</div>
            <div className="flex flex-wrap gap-2">
              {topBlogTags.map(([tag, count]) => (
                <span key={tag} className="px-3 py-1.5 bg-secondary/5 dark:bg-secondary/10 border border-secondary/15 dark:border-secondary/25 text-secondary rounded-full font-label text-[10px] uppercase tracking-widest">
                  {tag.replace(/_/g, ' ')} <span className="font-bold">·{count}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Education + Projects */}
          <div className="col-span-1 md:col-span-6 bg-white dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm">
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Background</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-6">Education & Projects</h3>
            <div className="space-y-4 mb-6">
              {lists.degrees.map((d) => (
                <a
                  key={d.school}
                  href={d.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group border border-stone-100 dark:border-stone-800 rounded-xl p-4 hover:border-secondary/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-secondary mt-0.5">school</span>
                  <div>
                    <div className="font-body font-bold text-stone-800 dark:text-stone-200 group-hover:text-secondary transition-colors text-sm">{d.degree}</div>
                    <div className="font-label text-xs text-stone-400 dark:text-stone-500 mt-0.5">{d.school} · {d.year}</div>
                  </div>
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-5">
              <div>
                <div className="font-headline text-4xl text-stone-900 dark:text-stone-100">{projectCount}</div>
                <div className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1">Projects Built</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {lists.topProjects.map((p) => (
                  <a
                    key={p.title}
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-full font-label text-[10px] uppercase tracking-widest hover:border-secondary/40 transition-colors"
                  >
                    {p.title}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Content Tags — full-width */}
          <div className="col-span-1 md:col-span-12 bg-white dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 shadow-sm">
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Themes Across Content</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-8">Content Tags</h3>
            <TagAnalysis tags={tags} />
          </div>

        </div>
    </div>
  );
};

export default StatsClassic;
