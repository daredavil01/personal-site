import React from "react";
import Main from "../layouts/Main";
import positions from "../data/resume/positions";
import personalData from "../data/stats/personal";
import books from "../data/books";
import offloadData from "../data/100DaysToOffload";
import { skills } from "../data/resume/skills";
import sportsData from "../data/sports";
import certifications from "../data/resume/certifications";
import instagramPosts from "../data/instagram";

const Stats = () => {
  const ageComponent = personalData.find((item) => item.key === 'age')?.value;
  const location = personalData.find((item) => item.key === 'location')?.value || 'Pune, MH';
  
  const booksCount = books.length;
  // Approximation of pages based on an average of 330 pages per book
  const pagesTurned = `${((booksCount * 330) / 1000).toFixed(1)}k`;
  
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
  const topSkills = skills.sort((a, b) => b.competency - a.competency).slice(0, 9).map((s) => s.title);

  // Certifications
  const certCount = certifications.length;
  const latestCert = certifications[0]?.name || "AWS Architect Professional";

  // Sports / Endurance
  const totalRaces = sportsData.length;
  const totalKmRun = sportsData.reduce((acc, curr) => acc + (parseFloat(curr.distance.replace(/[^\d.]/g, '')) || 0), 0);
  
  const getPBRaw = (distancePattern) => {
    let best = null;
    let bestSecs = Infinity;
    sportsData.forEach((race) => {
      if (race.distance.toLowerCase().includes(distancePattern)) {
        const parts = race.time.split(':');
        let secs = 0;
        if (parts.length === 2) {
          secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        } else if (parts.length === 3) {
          secs = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
        }
        if (secs < bestSecs && secs > 0) {
          bestSecs = secs;
          best = race;
        }
      }
    });
    return best;
  };
  
  const marathonPBData = getPBRaw('42');
  let bestMarathonTime = "00:00";
  if (marathonPBData) {
    const parts = marathonPBData.time.split(':');
    bestMarathonTime = parts.length === 3 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : marathonPBData.time;
  }

  const hmPBData = getPBRaw('21');
  let bestHmTime = "00:00";
  if (hmPBData) {
    const parts = hmPBData.time.split(':');
    bestHmTime = hmPBData.time;
    if (parts.length === 3) bestHmTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  const tenKPBData = getPBRaw('10');
  let bestTenKTime = "00:00";
  if (tenKPBData) {
    const parts = tenKPBData.time.split(':');
    bestTenKTime = tenKPBData.time;
    if (parts.length === 3 && parts[0] === "0") {
      bestTenKTime = `${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      bestTenKTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
  }

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

  return (
    <Main title="Stats" description="Metrics of Intent: A quantitative deep-dive into a year of technical growth, artistic captures, and consistent physical output.">
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
                  <span className="text-stone-900 dark:text-stone-100 font-headline text-xl">{String(positions.length).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-lg overflow-hidden border border-stone-100 dark:border-stone-800">
              <img 
                className="w-full h-32 object-cover grayscale hover:grayscale-0 transition-all duration-700 opacity-90" 
                alt="Pune Architecture" 
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
                  <span className="block font-headline text-5xl text-secondary">{(booksCount / (new Date().getMonth() + 1 || 1)).toFixed(1)}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-600 font-bold">Avg / Month</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-stone-900 dark:text-stone-100">{books.filter((b) => b.status === "reading").length || "01"}</span>
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
                <div key={i} className={`h-3 rounded-sm transition-all duration-500 ${i < offloadPercentage / 10 ? 'bg-secondary ring-2 ring-secondary/20' : 'bg-secondary/20 dark:bg-secondary/10'}`}></div>
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

        </div>
      </div>
    </Main>
  );
};

export default Stats;
