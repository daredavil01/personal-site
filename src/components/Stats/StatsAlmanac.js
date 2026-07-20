import React, { useEffect, useState } from "react";
import personalData from "../../data/stats/personal";
import { getPBRaw, formatHoursMinutes, formatMinutesSeconds } from "../../utils/raceStats";
import {
  useBooks, useBlogs, useSports, useInstagram, useTreks, useProjects, useResume,
} from "../../context/ContentContext";
import { LoadingBlock, ErrorBlock } from "../common/AsyncStates";
import { getMicroblogTagFacets, getMicroblogActivity } from "../../lib/api/microblog";
import CountUp from "./CountUp";
import ChapterRibbon from "./ChapterRibbon";
import PuneSkyline from "./PuneSkyline";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// The almanac — the dynamic default view of the Stats page.
const StatsAlmanac = () => {
  const { data: books, loading: booksLoading, error: booksError } = useBooks();
  const { data: offloadData, loading: blogsLoading, error: blogsError } = useBlogs();
  const { data: sportsData, loading: sportsLoading, error: sportsError } = useSports();
  const { data: instagramPosts, loading: instaLoading, error: instaError } = useInstagram();
  const { data: treksData, loading: treksLoading, error: treksError } = useTreks();
  const { data: projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { data: resume, loading: resumeLoading, error: resumeError } = useResume();
  const { positions, degrees, certifications, skills } = resume;

  const isLoading = booksLoading || blogsLoading || sportsLoading || instaLoading
    || treksLoading || projectsLoading || resumeLoading;
  const hasError = booksError || blogsError || sportsError || instaError
    || treksError || projectsError || resumeError;

  const [microblogTags, setMicroblogTags] = useState([]);
  const [microActivity, setMicroActivity] = useState(null);
  useEffect(() => {
    getMicroblogTagFacets().then(setMicroblogTags).catch(() => {});
    getMicroblogActivity().then(setMicroActivity).catch(() => {});
  }, []);

  const ageComponent = personalData.find((item) => item.key === 'age')?.value;
  const location = personalData.find((item) => item.key === 'location')?.value || 'Pune, MH';

  const booksCount = books.length;
  // Approximation of pages based on an average of 330 pages per book
  const pagesTurnedK = (booksCount * 330) / 1000;

  const genreCounts = {};
  books.forEach((b) => {
    if (b.category) {
      b.category.split(',').forEach((c) => {
        const cat = c.trim();
        genreCounts[cat] = (genreCounts[cat] || 0) + 1;
      });
    }
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);

  const offloadCount = offloadData.length;
  const offloadPercentage = Math.round((offloadCount / 100) * 100);

  const platformCounts = {};
  offloadData.forEach((post) => {
    if (post.blog_platform) {
      platformCounts[post.blog_platform] = (platformCounts[post.blog_platform] || 0) + 1;
    }
  });
  const topPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Take top 9 skills for the arsenal tags
  const topSkills = [...skills].sort((a, b) => b.competency - a.competency).slice(0, 9).map((s) => s.title);

  // Certifications
  const certCount = certifications.length;
  const latestCert = certifications[0]?.name || "AWS Architect Professional";

  // Sports / Endurance
  const totalRaces = sportsData.length;
  const totalKmRun = sportsData.reduce((acc, curr) => acc + (parseFloat(curr.distance.replace(/[^\d.]/g, '')) || 0), 0);

  const bestMarathonTime = formatHoursMinutes(getPBRaw(sportsData, '42')?.time);
  const bestHmTime = formatHoursMinutes(getPBRaw(sportsData, '21')?.time);
  const bestTenKTime = formatMinutesSeconds(getPBRaw(sportsData, '10')?.time);

  // Races per year, for the endurance chart
  const racesPerYear = {};
  sportsData.forEach((race) => {
    const year = new Date(race.date).getFullYear();
    if (Number.isFinite(year)) racesPerYear[year] = (racesPerYear[year] || 0) + 1;
  });
  const racesPerYearSorted = Object.entries(racesPerYear).sort((a, b) => a[0] - b[0]);
  const maxRacesInYear = Math.max(...Object.values(racesPerYear), 1);

  // Treks
  const parseTrekDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const totalTreks = treksData.length;
  const hardTreks = treksData.filter((t) => t.endurance_level === 'Hard').length;
  const treksWithBlog = treksData.filter((t) => !!t.blog_link).length;
  const trekYearsActive = new Set(treksData.map((t) => parseTrekDate(t.date).getFullYear())).size;
  const latestTrek = [...treksData].sort((a, b) => parseTrekDate(b.date) - parseTrekDate(a.date))[0]?.fort_name || '-';

  // Instagram / Digital Capture
  const instaPostCount = instagramPosts.length;
  const totalPhotos = instagramPosts.reduce((acc, post) => acc + (post.slideImages?.length || 0), 0);

  const tagCounts = {};
  instagramPosts.forEach((post) => {
    if (post.tags) {
      post.tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    }
  });
  const topInstaTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);

  // Books: language split
  const booksEnglish = books.filter((b) => b.language === 'English').length;
  const booksMarathi = books.filter((b) => b.language === 'Marathi').length;

  // Books: per year
  const booksPerYear = {};
  books.forEach((b) => {
    if (b.year) booksPerYear[b.year] = (booksPerYear[b.year] || 0) + 1;
  });
  const booksPerYearSorted = Object.entries(booksPerYear).sort((a, b) => b[0] - a[0]);
  const maxBooksInYear = Math.max(...Object.values(booksPerYear), 1);

  // Books: top tags
  const bookTagCounts = {};
  books.forEach((b) => {
    (b.tags || []).forEach((t) => { bookTagCounts[t] = (bookTagCounts[t] || 0) + 1; });
  });
  const topBookTags = Object.entries(bookTagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const allBookTags = Object.entries(bookTagCounts).sort((a, b) => b[1] - a[1]);

  // Books: with reviews
  const booksWithReviews = books.filter((b) => b.blog_link).length;

  // Blog: top tags
  const blogTagCounts = {};
  offloadData.forEach((post) => {
    (post.blog_tags || []).forEach((t) => {
      if (t !== '100_Days_to_Offload' && t !== '100_Days_To_Offload') {
        blogTagCounts[t] = (blogTagCounts[t] || 0) + 1;
      }
    });
  });
  const topBlogTags = Object.entries(blogTagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const allBlogTags = Object.entries(blogTagCounts).sort((a, b) => b[1] - a[1]);

  // Blog: language split
  const blogEnglish = offloadData.filter((p) => p.language === 'English').length;
  const blogMarathi = offloadData.filter((p) => p.language === 'Marathi').length;

  // Blog: posts per month of the current year (the challenge's pulse)
  const currentYear = new Date().getFullYear();
  const blogMonthCounts = Array(12).fill(0);
  offloadData.forEach((post) => {
    const d = new Date(post.blog_date);
    if (d.getFullYear() === currentYear) blogMonthCounts[d.getMonth()] += 1;
  });
  const maxBlogMonth = Math.max(...blogMonthCounts, 1);
  const busiestMonthIndex = blogMonthCounts.indexOf(Math.max(...blogMonthCounts));

  // Micro blog: posts per year for the pulse card
  const microYears = (microActivity?.monthCounts ?? []).reduce((acc, { key, count }) => {
    const year = key.slice(0, 4);
    acc.set(year, (acc.get(year) || 0) + count);
    return acc;
  }, new Map());
  const microYearsSorted = [...microYears.entries()];
  const maxMicroYear = Math.max(...microYearsSorted.map(([, c]) => c), 1);
  const microTotal = microYearsSorted.reduce((acc, [, c]) => acc + c, 0);

  // Projects
  const projectCount = projects.length;

  if (isLoading) return <LoadingBlock label="Loading stats…" />;
  if (hasError) return <ErrorBlock />;

  const cellBase = "bg-white dark:bg-stone-900 p-8 rounded-xl border border-stone-100 dark:border-stone-800 transition-colors shadow-sm";
  const cellTinted = "bg-secondary/[0.03] dark:bg-secondary/[0.05] p-8 rounded-xl border border-secondary/10 dark:border-secondary/20 transition-colors shadow-sm";

  return (
    <div className="flex flex-col gap-16 w-full">
        {/* Hero Title Section */}
        <section>
          <span className="font-label text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-4 block">Almanac {currentYear}</span>
          <h1 className="font-headline text-5xl md:text-7xl text-stone-900 dark:text-stone-100 leading-none mb-6">Metrics of <br /><span className="text-secondary italic">Intent.</span></h1>
          <p className="text-stone-500 dark:text-stone-400 max-w-2xl text-lg font-light leading-relaxed">
            A quantitative deep-dive into a year of technical growth, artistic captures, and consistent physical output — kept like an almanac, in chapters.
          </p>
        </section>

        {/* Highlights ribbon — the shareable facts, surfaced first */}
        <section aria-label="Highlights">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary text-white p-6 rounded-xl shadow-sm flex flex-col justify-between gap-4">
              <span className="font-label text-[10px] uppercase tracking-widest font-bold text-white/70">Busiest writing month</span>
              <div>
                <p className="font-headline text-4xl m-0">{blogMonthCounts[busiestMonthIndex] > 0 ? MONTH_NAMES[busiestMonthIndex] : "—"}</p>
                <p className="font-label text-[10px] uppercase tracking-widest text-white/70 mt-1 mb-0">
                  {blogMonthCounts[busiestMonthIndex]} posts in 100 Days
                </p>
              </div>
            </div>
            <div className={`${cellBase} !p-6 flex flex-col justify-between gap-4`}>
              <span className="font-label text-[10px] uppercase tracking-widest font-bold text-stone-500 dark:text-stone-600">Longest micro streak</span>
              <div>
                <p className="font-headline text-4xl text-stone-900 dark:text-stone-100 m-0">
                  {microActivity ? <><CountUp value={microActivity.longestStreak} /> <span className="text-lg text-stone-400">days</span></> : "—"}
                </p>
                <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1 mb-0">consecutive days posting</p>
              </div>
            </div>
            <div className={`${cellBase} !p-6 flex flex-col justify-between gap-4`}>
              <span className="font-label text-[10px] uppercase tracking-widest font-bold text-stone-500 dark:text-stone-600">Top topic</span>
              <div>
                <p className="font-headline text-3xl text-stone-900 dark:text-stone-100 m-0 leading-tight">
                  {topBlogTags[0] ? topBlogTags[0][0].replace(/_/g, ' ') : "—"}
                </p>
                <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1 mb-0">
                  {topBlogTags[0] ? `across ${topBlogTags[0][1]} posts` : "no posts yet"}
                </p>
              </div>
            </div>
            <div className={`${cellBase} !p-6 flex flex-col justify-between gap-4`}>
              <span className="font-label text-[10px] uppercase tracking-widest font-bold text-stone-500 dark:text-stone-600">Kilometres raced</span>
              <div>
                <p className="font-headline text-4xl text-stone-900 dark:text-stone-100 m-0"><CountUp value={Math.round(totalKmRun)} /></p>
                <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1 mb-0">across {totalRaces} races</p>
              </div>
            </div>
          </div>
        </section>

        {/* The almanac grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">

          <ChapterRibbon numeral="I" title="Persona" subtitle="Origin & background" />

          {/* Quick Profile Card */}
          <div className={`col-span-1 md:col-span-5 ${cellBase} flex flex-col justify-between`}>
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
                  <span className="text-stone-900 dark:text-stone-100 font-headline text-xl">{String(positions.length).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
            <PuneSkyline />
          </div>

          {/* Education + Projects */}
          <div className={`col-span-1 md:col-span-7 ${cellBase}`}>
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Background</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-6">Education & Projects</h3>
            <div className="space-y-4 mb-6">
              {degrees.map((d) => (
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
                <div className="font-headline text-4xl text-stone-900 dark:text-stone-100"><CountUp value={projectCount} /></div>
                <div className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mt-1">Projects Built</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {projects.slice(0, 3).map((p) => (
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

          <ChapterRibbon numeral="II" title="Mind" subtitle="Reading & writing" />

          {/* Reading Stats - Focus Card */}
          <div className={`col-span-1 md:col-span-7 ${cellTinted} relative overflow-hidden`}>
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
                  <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100"><CountUp value={booksCount} /></span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Books Read</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100"><CountUp value={pagesTurnedK} decimals={1} />k</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Pages Turned</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-secondary"><CountUp value={booksCount / (new Date().getMonth() + 1 || 1)} decimals={1} /></span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Avg / Month</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100">{books.filter((b) => b.status === "reading").length || "01"}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Active WIP</span>
                </div>
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
            <div className="flex gap-2 mb-6 relative z-10">
              {topPlatforms.map(([platform, count]) => (
                <span key={platform} className="font-label text-[10px] bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 px-2 py-1 rounded">
                  {platform} <span className="text-secondary/80 font-bold">({count})</span>
                </span>
              ))}
            </div>
            {/* Posts per month — the challenge's pulse */}
            <div className="flex items-end gap-1.5 h-16 mb-6" role="img" aria-label={`Posts per month in ${currentYear}`}>
              {blogMonthCounts.map((count, i) => {
                let barColor = 'bg-secondary/15 dark:bg-secondary/10';
                if (count > 0) barColor = i === busiestMonthIndex ? 'bg-secondary' : 'bg-secondary/45';
                return (
                  <div key={MONTH_NAMES[i]} className="flex-1 flex flex-col items-center gap-1 justify-end h-full" title={`${MONTH_NAMES[i]}: ${count} posts`}>
                    <div
                      className={`w-full rounded-t-[3px] ${barColor}`}
                      style={{ height: count > 0 ? `${Math.max(6, (count / maxBlogMonth) * 44)}px` : '3px' }}
                    />
                    <span className="font-mono text-[8px] text-stone-400 dark:text-stone-600 leading-none">{MONTH_SHORT[i]}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-stone-500 dark:text-stone-600 font-label text-[10px] tracking-widest font-bold">
              <span><CountUp value={offloadCount} /> POSTS COMPLETED</span>
              <span className="text-stone-400 dark:text-stone-700 font-normal">{100 - offloadCount} TO GO</span>
            </div>
          </div>

          {/* Books Language & Tag Intelligence */}
          <div className={`col-span-1 md:col-span-5 ${cellBase}`}>
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Reading Intelligence</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-6">Language & Interests</h3>
            {/* Language split */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 text-center">
                <div className="font-headline text-4xl text-blue-600 dark:text-blue-400"><CountUp value={booksEnglish} /></div>
                <div className="font-label text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-1">English Books</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 text-center">
                <div className="font-headline text-4xl text-amber-600 dark:text-amber-400"><CountUp value={booksMarathi} /></div>
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
                  <div className="flex justify-between text-xs font-label mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
          <div className={`col-span-1 md:col-span-6 ${cellBase}`}>
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Writing Themes</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-4">Blog Intelligence</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 text-center">
                <div className="font-headline text-3xl text-stone-900 dark:text-stone-100"><CountUp value={blogEnglish} /></div>
                <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">English Posts</div>
              </div>
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 text-center">
                <div className="font-headline text-3xl text-stone-900 dark:text-stone-100"><CountUp value={blogMarathi} /></div>
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

          {/* Micro Blog pulse */}
          <div className={`col-span-1 md:col-span-6 ${cellTinted}`}>
            <span className="font-label text-[10px] uppercase tracking-widest text-secondary mb-6 block font-bold">Short-form Archive</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-4">Micro Blog Pulse</h3>
            {microActivity && microYearsSorted.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-white dark:bg-stone-800 text-center">
                    <div className="font-headline text-3xl text-stone-900 dark:text-stone-100"><CountUp value={microTotal} /></div>
                    <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Micro Posts</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-stone-800 text-center">
                    <div className="font-headline text-3xl text-stone-900 dark:text-stone-100"><CountUp value={microActivity.longestStreak} /></div>
                    <div className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Day Streak Record</div>
                  </div>
                </div>
                <div className="flex items-end gap-1.5 h-20 overflow-x-auto pb-1" role="img" aria-label="Micro posts per year">
                  {microYearsSorted.map(([year, count]) => (
                    <div key={year} className="flex-1 min-w-[26px] flex flex-col items-center gap-1 justify-end h-full" title={`${year}: ${count} posts`}>
                      <div
                        className="w-full max-w-[26px] rounded-t-[3px] bg-secondary/60"
                        style={{ height: `${Math.max(4, (count / maxMicroYear) * 52)}px` }}
                      />
                      <span className="font-mono text-[8px] text-stone-400 dark:text-stone-600 leading-none">{String(year).slice(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-600 mb-0">Loading archive pulse…</p>
            )}
          </div>

          <ChapterRibbon numeral="III" title="Body" subtitle="Roads & ridgelines" />

          {/* Physical Endurance Card */}
          <div className={`col-span-1 md:col-span-7 ${cellBase} flex flex-col justify-between`}>
            <div className="mb-8 flex justify-between items-start">
              <div>
                <span className="font-label text-stone-500 dark:text-stone-600 font-bold mb-2 block uppercase tracking-[0.2em] text-[10px]">Physical Endurance</span>
                <h3 className="font-headline text-3xl text-stone-800 dark:text-stone-200 mb-2">Distance Covered</h3>
                <p className="text-stone-500 text-sm">Consistent logging of pavement strikes and sheer grit.</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-stone-200 dark:text-stone-800">directions_run</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
              <div>
                <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100 mb-1"><CountUp value={totalRaces} /></span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Total Races</span>
              </div>
              <div>
                <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100 mb-1"><CountUp value={Math.round(totalKmRun)} /></span>
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
            {racesPerYearSorted.length > 1 && (
              <div>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-bold block mb-2">Races per year</span>
                <div className="flex items-end gap-1.5 h-14 overflow-x-auto pb-1">
                  {racesPerYearSorted.map(([year, count]) => (
                    <div key={year} className="flex-1 min-w-[26px] flex flex-col items-center gap-1 justify-end h-full" title={`${year}: ${count} races`}>
                      <div
                        className="w-full max-w-[26px] rounded-t-[3px] bg-secondary/60"
                        style={{ height: `${Math.max(4, (count / maxRacesInYear) * 34)}px` }}
                      />
                      <span className="font-mono text-[8px] text-stone-400 dark:text-stone-600 leading-none">{String(year).slice(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trek Log */}
          <div className={`col-span-1 md:col-span-5 ${cellBase}`}>
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="font-label text-stone-500 dark:text-stone-600 font-bold mb-2 block uppercase tracking-[0.2em] text-[10px]">Mountain Adventures</span>
                <h3 className="font-headline text-3xl text-stone-800 dark:text-stone-200 mb-1">Trek Log</h3>
                <p className="text-stone-500 text-sm">Forts, trails, and elevation across Maharashtra.</p>
              </div>
              <span className="material-symbols-outlined text-4xl text-stone-200 dark:text-stone-800">hiking</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100 mb-1"><CountUp value={totalTreks} /></span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Total Treks</span>
              </div>
              <div>
                <span className="block font-headline text-5xl text-red-600 dark:text-red-400 mb-1"><CountUp value={hardTreks} /></span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Hard Treks</span>
              </div>
              <div>
                <span className="block font-headline text-5xl text-indigo-600 dark:text-indigo-400 mb-1"><CountUp value={treksWithBlog} /></span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Blog Posts</span>
              </div>
              <div>
                <span className="block font-headline text-5xl text-teal-600 dark:text-teal-400 mb-1"><CountUp value={trekYearsActive} /></span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Years Active</span>
              </div>
              <div className="col-span-2 border-t border-stone-100 dark:border-stone-800 pt-4">
                <span className="block font-headline text-xl text-stone-900 dark:text-stone-100 mb-1 leading-tight">{latestTrek}</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Latest Trek</span>
              </div>
            </div>
          </div>

          <ChapterRibbon numeral="IV" title="Lens" subtitle="The visual archive" />

          {/* Digital Capture (Instagram) */}
          <div className={`col-span-1 md:col-span-12 ${cellTinted}`}>
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="md:w-1/3">
                <span className="font-label text-stone-500 dark:text-stone-600 font-bold mb-2 block uppercase tracking-[0.2em] text-[10px]">Digital Capture</span>
                <h3 className="font-headline text-3xl text-stone-800 dark:text-stone-200 mb-3">The Visual Archive</h3>
                <div className="flex gap-2 flex-wrap">
                  {topInstaTags.map((tag) => (
                    <span key={tag} className="font-label text-[9px] bg-secondary/5 dark:bg-secondary/10 border border-secondary/10 dark:border-secondary/20 text-secondary px-2 py-1 rounded-full uppercase tracking-widest">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-6">
                <div>
                  <span className="font-headline text-6xl tracking-tighter text-stone-900 dark:text-stone-100"><CountUp value={instaPostCount} /></span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold mt-1">Collections</span>
                </div>
                <div>
                  <span className="font-headline text-6xl tracking-tighter text-stone-900 dark:text-stone-100"><CountUp value={totalPhotos} /></span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold mt-1">Moments Captured</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-5xl text-secondary/30 dark:text-secondary/20 hidden md:block">photo_camera</span>
            </div>
          </div>

          <ChapterRibbon numeral="V" title="Craft" subtitle="Tools of the trade" />

          {/* Skills */}
          <div className="col-span-1 md:col-span-12 bg-secondary/[0.03] dark:bg-stone-900/50 p-8 rounded-xl border border-secondary/10 dark:border-stone-800 transition-colors shadow-sm">
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
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-stone-100 dark:border-stone-800 pt-8">
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

          {/* Content Tags — full-width appendix */}
          <div className={`col-span-1 md:col-span-12 ${cellBase}`}>
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 mb-6 block font-bold">Appendix · All Tags Across Content</span>
            <h3 className="font-headline text-2xl text-stone-800 dark:text-stone-200 mb-8">Content Tags</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">Books · {allBookTags.length} tags</p>
                <div className="flex flex-wrap gap-2">
                  {allBookTags.map(([tag, count]) => (
                    <span key={tag} className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                      {tag} <span className="text-secondary font-bold">·{count}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">100 Days to Offload · {allBlogTags.length} tags</p>
                <div className="flex flex-wrap gap-2">
                  {allBlogTags.map(([tag, count]) => (
                    <span key={tag} className="px-2.5 py-1 bg-secondary/5 dark:bg-secondary/10 text-secondary rounded-full font-label text-[10px] uppercase tracking-widest border border-secondary/15 dark:border-secondary/25">
                      {tag.replace(/_/g, ' ')} <span className="font-bold">·{count}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">Micro Blog · {microblogTags.length} tags</p>
                <div className="flex flex-wrap gap-2">
                  {microblogTags.length > 0 ? microblogTags.slice(0, 40).map(({ tag, count }) => (
                    <span key={tag} className="px-2.5 py-1 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-full font-label text-[10px] uppercase tracking-widest border border-stone-200 dark:border-stone-700">
                      #{tag} <span className="text-secondary/70 font-bold">·{count}</span>
                    </span>
                  )) : (
                    <span className="font-label text-[10px] text-stone-400 dark:text-stone-600 uppercase tracking-widest">Loading…</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
    </div>
  );
};

export default StatsAlmanac;
