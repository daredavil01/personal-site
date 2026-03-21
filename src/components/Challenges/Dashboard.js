import React from 'react';

const Dashboard = ({ challengeData }) => {
  const totalDays = 100;
  const currentDays = challengeData.length;
  // Display all entries, newest first
  const allEntries = [...challengeData].reverse();

  return (
    <div className="flex flex-col gap-12 w-full">
      {/* Hero Header */}
      <header className="mb-8">
        <span className="font-label text-xs uppercase tracking-[0.3em] text-secondary font-bold mb-4 block">Personal Growth Protocol</span>
        <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 tracking-tighter leading-none mb-8">
          The 100-Day <br />Challenges
        </h1>
        <p className="max-w-2xl text-stone-500 text-lg md:text-xl font-light leading-relaxed">
          A public commitment to iterative improvement. This dashboard tracks the momentum of creative production and technical mastery through disciplined daily practice.
        </p>
      </header>

      {/* Bento Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start w-full">
        {/* Primary Challenge: 100DaysToOffload */}
        <section className="md:col-span-8 bg-white p-8 md:p-12 rounded-xl shadow-sm border border-stone-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h2 className="font-headline text-3xl font-bold text-stone-800 mb-2">#100DaysToOffload</h2>
              <p className="font-label text-xs uppercase tracking-widest text-stone-400">Writing Challenge & Journaling</p>
            </div>
            <div className="text-right">
              <span className="font-headline text-6xl font-black text-secondary">{currentDays}</span>
              <span className="font-headline text-2xl text-stone-300">/100</span>
              <div className="font-label text-[10px] uppercase tracking-tighter mt-1 text-stone-400">Days Completed</div>
            </div>
          </div>

          {/* Progress Heatmap Visualizer */}
          <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 gap-2 mb-12">
            {[...Array(totalDays)].map((_, i) => {
              const item = challengeData[i];
              let bgClass = "bg-stone-100"; // default empty
              if (item) {
                bgClass = i % 5 === 0 ? "bg-secondary" : "bg-orange-200";
              }
              return (
                <div key={i} className={`aspect-square ${bgClass} rounded-sm`} title={item ? `Day ${item.id}: ${item.blog_title}` : `Day ${i + 1}`}></div>
              );
            })}
            
            <div className="col-span-full h-px bg-stone-100 my-4"></div>
            <div className="col-span-full flex justify-between font-label text-[10px] uppercase text-stone-400">
              <span>Day 01</span>
              <span>Current: Day {currentDays}</span>
              <span>Target: Day {totalDays}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              <h3 className="font-label text-sm font-bold uppercase tracking-wider text-stone-800 sticky top-0 bg-white py-2">All Entries</h3>
              <ul className="space-y-4 pb-4">
                {allEntries.map((entry, idx) => (
                  <li key={entry.id} className="group cursor-pointer">
                    <a href={entry.blog_link} target="_blank" rel="noopener noreferrer">
                      <span className={`font-label text-[10px] font-bold block ${idx === 0 ? 'text-secondary' : 'text-stone-400'}`}>
                        DAY {entry.id} - {entry.blog_date}
                      </span>
                      <span className="font-body text-base group-hover:text-secondary transition-colors text-stone-700 line-clamp-2">
                        {entry.blog_title}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-stone-50 border border-stone-100 p-6 rounded-lg">
              <span className="material-symbols-outlined text-secondary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <h4 className="font-headline text-lg font-bold mb-2 text-stone-800">The Goal</h4>
              <p className="font-body text-sm text-stone-500 leading-relaxed">
                To publish 100 articles in a year. No niche, no SEO pressure, just raw thought-dumping to find my creative voice again.
              </p>
            </div>
          </div>
        </section>

        {/* Sidebar Challenges */}
        <div className="md:col-span-4 flex flex-col gap-6">

          {/* Quote/Motivation */}
          <div className="p-8 border-l-2 border-secondary italic font-headline text-xl text-stone-500 leading-relaxed bg-stone-50 rounded-r-xl border-y border-r border-stone-100">
            &quot;We are what we repeatedly do. Excellence, then, is not an act, but a habit.&quot;
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
