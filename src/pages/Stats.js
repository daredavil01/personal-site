import React from "react";
import Main from "../layouts/Main";
import positions from "../data/resume/positions";
import personalData from "../data/stats/personal";
import books from "../data/books";
import offloadData from "../data/100DaysToOffload";
import { skills } from "../data/resume/skills";

const Stats = () => {
  const ageComponent = personalData.find((item) => item.key === 'age')?.value;
  const location = personalData.find((item) => item.key === 'location')?.value || 'Pune, MH';
  
  const booksCount = books.length;
  // Approximation of pages based on an average of 330 pages per book
  const pagesTurned = `${((booksCount * 330) / 1000).toFixed(1)}k`;
  
  const offloadCount = offloadData.length;
  const offloadPercentage = Math.round((offloadCount / 100) * 100);

  // Take top 9 skills for the arsenal tags
  const topSkills = skills.sort((a, b) => b.competency - a.competency).slice(0, 9).map((s) => s.title);

  return (
    <Main title="Stats" description="Metrics of Intent: A quantitative deep-dive into a year of technical growth, artistic captures, and consistent physical output.">
      <div className="flex flex-col gap-16 w-full">
        {/* Hero Title Section */}
        <section>
          <span className="font-label text-secondary uppercase tracking-[0.3em] text-xs font-bold mb-4 block">Archive {new Date().getFullYear()}</span>
          <h1 className="font-headline text-5xl md:text-7xl text-stone-900 leading-none mb-6">Metrics of <br /><span className="text-secondary italic">Intent.</span></h1>
          <p className="text-stone-500 max-w-2xl text-lg font-light leading-relaxed">
            A quantitative deep-dive into a year of technical growth, artistic captures, and consistent physical output. Curated through the lens of performance and habit.
          </p>
        </section>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
          
          {/* Quick Profile Card */}
          <div className="col-span-1 md:col-span-4 bg-white p-8 rounded-xl border border-stone-100 flex flex-col justify-between">
            <div>
              <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 mb-2 block font-bold">Origin & Persona</span>
              <h3 className="font-headline text-3xl text-stone-800 mb-6">Digital Archetype</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-stone-50 pb-2">
                  <span className="text-stone-400 font-label text-xs uppercase tracking-widest">Age</span>
                  <span className="text-stone-800 font-label text-sm text-right overflow-hidden overflow-ellipsis whitespace-nowrap">{ageComponent}</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-stone-50 pb-2">
                  <span className="text-stone-400 font-label text-xs uppercase tracking-widest">Base</span>
                  <span className="text-stone-900 font-headline text-xl uppercase tracking-tighter">{location}</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-stone-50 pb-2">
                  <span className="text-stone-400 font-label text-xs uppercase tracking-widest">Orgs</span>
                  <span className="text-stone-900 font-headline text-xl">{String(positions.length).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <img 
                className="w-full h-32 object-cover rounded-lg grayscale hover:grayscale-0 transition-all duration-500 opacity-90" 
                alt="Pune Architecture" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrBXPT3I2M0DNU6wyAE6pn7KCVSB3rqa6TPGidOrb3XKbkbZ4cXwKcDVWbe77kwlxZTK2HYglbsxFteB0UCO5a4CyhsbAmulSJvkm_xd8VyWfzr8MC0ApZlCKxbzk0SkhfFVQxQM5snPYNfbFGHAsfHXgoVM-G52J-JO5NuZhQaA1xbKh9KGDN5fzbmwp7CgHz9Fmno2DWhSZVT5VROsE8ckws47_mPrG69EeOz5SjB_ZBiZFaOn7bfiTQzHgTzEIIuLsWLyXbyhM"
              />
            </div>
          </div>

          {/* Reading Stats - Focus Card */}
          <div className="col-span-1 md:col-span-8 bg-secondary/[0.03] p-8 rounded-xl border border-secondary/10 relative overflow-hidden">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <span className="font-label text-[10px] uppercase tracking-widest text-secondary mb-2 block font-bold">Knowledge Consumption</span>
                <h3 className="font-headline text-4xl text-stone-900 mb-2">Reading Velocity</h3>
                <p className="text-stone-500/80 max-w-sm mb-8 text-sm">Aggregated metrics from the digital library.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <span className="block font-headline text-5xl text-stone-900">{booksCount}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 font-bold">Books Read</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-stone-900">{pagesTurned}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 font-bold">Pages Turned</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-secondary">{(booksCount / (new Date().getMonth() + 1 || 1)).toFixed(1)}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 font-bold">Avg / Month</span>
                </div>
                <div>
                  <span className="block font-headline text-5xl text-stone-900">{books.filter((b) => b.status === "reading").length || "01"}</span>
                  <span className="block font-label text-[10px] uppercase tracking-widest text-stone-500 font-bold">Active WIP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Skills - Asymmetric Grid Item */}
          <div className="col-span-1 md:col-span-7 bg-secondary/[0.03] p-8 rounded-xl border border-secondary/10">
            <span className="font-label text-[10px] uppercase tracking-widest text-stone-500 mb-6 block font-bold">Technical Arsenal</span>
            <div className="flex flex-wrap gap-3">
              {topSkills.map((skillTitle, i) => (
                <span key={i} className={`px-4 py-2 rounded-full font-label text-xs border ${i === 2 || i === 5 ? 'bg-secondary/10 text-secondary border-secondary/20 font-bold' : 'bg-white text-stone-800 border-stone-100 shadow-sm'}`}>
                  {skillTitle}
                </span>
              ))}
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 border-t border-stone-100 pt-8">
              <div>
                <span className="block font-label text-[10px] uppercase text-stone-500 mb-2 font-bold tracking-widest">Certifications</span>
                <p className="text-stone-900 font-headline text-lg">AWS Architect Professional</p>
                <p className="text-stone-600 text-sm">Google Cloud Expert</p>
              </div>
              <div>
                <span className="block font-label text-[10px] uppercase text-stone-500 mb-2 font-bold tracking-widest">Primary Interest</span>
                <p className="text-stone-900 font-headline text-lg">Human-AI Interface Design</p>
              </div>
            </div>
          </div>

          {/* 100 Days to Offload - tracker */}
          <div className="col-span-1 md:col-span-5 bg-stone-50 p-8 rounded-xl border border-stone-100 flex flex-col justify-between">
            <div className="mb-8">
              <span className="font-label text-stone-500 font-bold mb-4 block uppercase tracking-[0.2em] text-[9px]">Output Challenge</span>
              <div className="flex flex-col gap-2 relative">
                <span className="font-headline text-8xl text-secondary/10 absolute top-20 -left-1 tracking-tighter pointer-events-none leading-none">{offloadPercentage}%</span>
                <h3 className="font-headline text-3xl text-stone-800 relative z-10 leading-none">100 Days To Offload</h3>
              </div>
            </div>
            <div className="grid grid-cols-10 gap-2 mb-8">
              {/* Progress Grid visualization */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`h-3 rounded-sm ${i < offloadPercentage / 10 ? 'bg-secondary' : 'bg-secondary/20'}`}></div>
              ))}
            </div>
            <div className="flex justify-between items-center text-stone-500 font-label text-[10px] tracking-widest font-bold">
              <span>{offloadCount} POSTS COMPLETED</span>
              <span className="text-stone-400 font-normal">{100 - offloadCount} TO GO</span>
            </div>
          </div>
        </div>
      </div>
    </Main>
  );
};

export default Stats;
