import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSports, useTreks, useBooks, useBlogs, useProjects } from '../../context/ContentContext';
import ContactIcons from '../Contact/ContactIcons';

const useCountUp = (target, duration, active) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || target === 0) return undefined;
    let frame = 0;
    const totalFrames = Math.round(duration / 16);
    const timer = setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.min(Math.round(eased * target), target));
      if (frame >= totalFrames) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
};

const SectionHeader = ({ label }) => (
  <div className="flex items-center gap-4 mb-6">
    <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold whitespace-nowrap mb-0">
      {label}
    </p>
    <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
  </div>
);

const AboutDocument = () => {
  const statsRef = useRef(null);
  const [animated, setAnimated] = useState(false);

  const { data: sportsData } = useSports();
  const { data: treksData } = useTreks();
  const { data: booksData } = useBooks();
  const { data: blogsData } = useBlogs();
  const { data: projectsData } = useProjects();

  const racesCount = sportsData.length;
  const treksCount = treksData.length;
  const booksCount = booksData.length;
  const blogsCount = blogsData.length;
  const projectsCount = projectsData.length;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.2 },
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const races = useCountUp(racesCount, 1000, animated);
  const treks = useCountUp(treksCount, 1000, animated);
  const books = useCountUp(booksCount, 1400, animated);
  const blogs = useCountUp(blogsCount, 1200, animated);
  const projects = useCountUp(projectsCount, 800, animated);

  const statCards = [
    {
      value: races,
      label: 'Races Run',
      icon: 'sprint',
      path: '/sports',
      iconColor: 'text-secondary',
      bg: 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20',
      border: 'border-red-200/50 dark:border-red-800/30',
    },
    {
      value: treks,
      label: 'Forts Trekked',
      icon: 'landscape',
      path: '/treks',
      iconColor: 'text-emerald-600 dark:text-emerald-500',
      bg: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20',
      border: 'border-emerald-200/50 dark:border-emerald-800/30',
    },
    {
      value: books,
      label: 'Books Read',
      icon: 'auto_stories',
      path: '/books',
      iconColor: 'text-amber-600 dark:text-amber-500',
      bg: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
      border: 'border-amber-200/50 dark:border-amber-800/30',
    },
    {
      value: blogs,
      label: 'Posts Written',
      icon: 'edit_note',
      path: '/100-days-to-offload',
      iconColor: 'text-violet-600 dark:text-violet-500',
      bg: 'from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20',
      border: 'border-violet-200/50 dark:border-violet-800/30',
    },
    {
      value: projects,
      label: 'Projects Built',
      icon: 'code',
      path: '/projects',
      iconColor: 'text-sky-600 dark:text-sky-500',
      bg: 'from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20',
      border: 'border-sky-200/50 dark:border-sky-800/30',
    },
  ];

  const pillars = [
    {
      icon: 'sprint',
      iconColor: 'text-secondary',
      title: 'Running',
      chips: [`${racesCount} races`, '10K to 50K ultra', 'Sub-2hr half marathon', '5 days/week training'],
    },
    {
      icon: 'landscape',
      iconColor: 'text-emerald-600 dark:text-emerald-500',
      title: 'Trekking',
      chips: [`${treksCount} forts`, 'Easy to Hard', '22-hr Panhala–Pawankhind', 'Sahyadri range'],
    },
    {
      icon: 'auto_stories',
      iconColor: 'text-amber-600 dark:text-amber-500',
      title: 'Reading',
      chips: [`${booksCount} books`, 'English & Marathi', 'AI, public policy, philosophy, fiction, sports'],
    },
    {
      icon: 'edit_note',
      iconColor: 'text-violet-600 dark:text-violet-500',
      title: 'Writing',
      chips: [`${blogsCount} posts on Substack`, 'The Wanderer\'s Technical Anecdotes', '100 Days to Offload', 'Chronicles of Wandering Mind', 'Dare Write\'s podcast', 'Digital well-being, AI, running, travel'],
    },
    {
      icon: 'work',
      iconColor: 'text-sky-600 dark:text-sky-500',
      title: 'Work & Research',
      chips: ['Software Developer @ Bridgenext', 'DORA metrics & data pipelines', 'Ex-NAST Fellow (AI governance)', 'B.Tech CS, RIT Sangli (2021)', 'Tech & Policy, Takshashila (2024)'],
    },
    {
      icon: 'interests',
      iconColor: 'text-pink-600 dark:text-pink-500',
      title: 'Interests',
      chips: ['Podcasts', 'Graphic design (Photoshop, Illustrator)', 'Video editing', 'Digital well-being', 'Nirman (social org)'],
    },
  ];

  return (
    <div className="flex flex-col gap-12 w-full max-w-3xl mx-auto">
      <header className="mb-4">
        <p className="font-label text-xs uppercase tracking-[0.3em] text-secondary mb-4 font-bold">
          Sanket Tambare
        </p>
        <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-[0.9] tracking-tighter mb-6">
          About Me.
        </h1>
      </header>

      <section>
        <SectionHeader label="In 1 Minute" />
        <p className="font-body text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-8">
          Software developer by day, ultra-marathoner and fort-trekker by adventure. I care deeply about
          the intersection of technology, society, and public policy — and I write about it weekly in
          my Substack newsletter <em>The Wanderer's Technical Anecdotes</em>, as part of the 100 Days
          to Offload challenge. I also host <em>Dare Write's</em>, a podcast on book reviews,
          technology, and travelogues. I read voraciously in both English and Marathi.
        </p>
        <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statCards.map((s) => (
            <Link
              key={s.label}
              to={s.path}
              className={`no-underline group bg-gradient-to-br ${s.bg} border ${s.border} rounded-xl p-4 flex flex-col gap-2 hover:scale-[1.02] transition-all duration-300`}
            >
              <span className={`material-symbols-outlined text-xl ${s.iconColor} opacity-70 group-hover:opacity-100 transition-opacity`}>
                {s.icon}
              </span>
              <div className="font-headline font-black text-3xl text-stone-900 dark:text-stone-100 leading-none tracking-tighter">
                {animated ? s.value : <span className="text-stone-300 dark:text-stone-700">—</span>}
              </div>
              <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-bold leading-tight mb-0">
                {s.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader label="More Details" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="border border-secondary/10 dark:border-secondary/20 bg-secondary/[0.02] dark:bg-secondary/[0.04] rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`material-symbols-outlined text-xl ${p.iconColor}`}>{p.icon}</span>
                <h2 className="font-headline font-bold text-stone-900 dark:text-stone-100 text-lg mb-0">
                  {p.title}
                </h2>
              </div>
              <p className="font-label text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-0">
                {p.chips.join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader label="Connect with me" />
        <ContactIcons />
      </section>
    </div>
  );
};

export default AboutDocument;
