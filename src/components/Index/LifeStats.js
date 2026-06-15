import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useBooks, useSports, useTreks, useBlogs, useProjects,
} from "../../context/ContentContext";
import { getMicroblogCount } from "../../lib/api/microblog";

const useCountUp = (target, duration, active) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || target === 0) {
      return undefined;
    }
    let frame = 0;
    const totalFrames = Math.round(duration / 16);
    const timer = setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      setCount(Math.min(Math.round(eased * target), target));
      if (frame >= totalFrames) clearInterval(timer);
    }, 16);
    return () => { clearInterval(timer); };
  }, [active, target, duration]);
  return count;
};

const LifeStats = () => {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  const { data: booksData } = useBooks();
  const { data: sportsData } = useSports();
  const { data: treksData } = useTreks();
  const { data: blogsData } = useBlogs();
  const { data: projectsData } = useProjects();

  // Micro-blog lives in Supabase (1,600+ rows) — fetch just the count, no rows.
  const [microTotal, setMicroTotal] = useState(0);
  useEffect(() => {
    let active = true;
    getMicroblogCount()
      .then((c) => { if (active) setMicroTotal(c); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const totalBooks = booksData.length;
  const totalTreks = treksData.length;
  const totalPosts = blogsData.length;
  const totalProjects = projectsData.length;
  const totalKm = Math.round(
    sportsData.reduce((acc, race) => acc + (parseFloat(race.distance) || 0), 0)
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.25 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const books = useCountUp(totalBooks, 1400, animated);
  const km = useCountUp(totalKm, 1800, animated);
  const treks = useCountUp(totalTreks, 1200, animated);
  const posts = useCountUp(totalPosts, 1000, animated);
  const projects = useCountUp(totalProjects, 900, animated);
  const micro = useCountUp(microTotal, 1600, animated);

  const stats = [
    {
      value: books,
      suffix: "",
      label: "Books Read",
      icon: "auto_stories",
      path: "/books",
      color: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
      border: "border-amber-200/50 dark:border-amber-800/30",
      iconColor: "text-amber-600 dark:text-amber-500",
    },
    {
      value: km,
      suffix: "km",
      label: "On Foot",
      icon: "sprint",
      path: "/sports",
      color: "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20",
      border: "border-red-200/50 dark:border-red-800/30",
      iconColor: "text-secondary",
    },
    {
      value: treks,
      suffix: "",
      label: "Treks Done",
      icon: "landscape",
      path: "/treks",
      color: "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20",
      border: "border-emerald-200/50 dark:border-emerald-800/30",
      iconColor: "text-emerald-600 dark:text-emerald-500",
    },
    {
      value: posts,
      suffix: "",
      label: "Posts Written",
      icon: "edit_note",
      path: "/100-days-to-offload",
      color: "from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
      border: "border-violet-200/50 dark:border-violet-800/30",
      iconColor: "text-violet-600 dark:text-violet-500",
    },
    {
      value: projects,
      suffix: "",
      label: "Projects Built",
      icon: "terminal",
      path: "/projects",
      color: "from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20",
      border: "border-sky-200/50 dark:border-sky-800/30",
      iconColor: "text-sky-600 dark:text-sky-500",
    },
    {
      value: micro,
      suffix: "",
      label: "Micro Posts",
      icon: "forum",
      path: "/micro-blog",
      color: "from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/20 dark:to-pink-950/20",
      border: "border-fuchsia-200/50 dark:border-fuchsia-800/30",
      iconColor: "text-fuchsia-600 dark:text-fuchsia-500",
    },
  ];

  return (
    <section ref={ref} className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold mb-0">
          Life in Numbers
        </p>
        <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.path}
            className={`no-underline group bg-gradient-to-br ${stat.color} border ${stat.border} rounded-xl p-4 flex flex-col gap-2 hover:scale-[1.02] transition-all duration-300`}
          >
            <span className={`material-symbols-outlined text-xl ${stat.iconColor} opacity-70 group-hover:opacity-100 transition-opacity`}>
              {stat.icon}
            </span>
            <div className="font-headline font-black text-2xl text-stone-900 dark:text-stone-100 leading-none tracking-tight">
              {animated ? (
                <>
                  {stat.value.toLocaleString()}
                  {stat.suffix && (
                    <span className="text-sm font-bold text-stone-400 dark:text-stone-500">
                      {stat.suffix}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-stone-300 dark:text-stone-700">—</span>
              )}
            </div>
            <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-bold leading-tight mb-0">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default LifeStats;
