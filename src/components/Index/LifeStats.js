import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import booksData from "../../data/books";
import sportsData from "../../data/sports";
import treksData from "../../data/treks";
import blogsData from "../../data/100DaysToOffload";

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

  const totalBooks = booksData.length;
  const totalRaces = sportsData.length;
  const totalTreks = treksData.length;
  const totalPosts = blogsData.length;
  const totalKm = Math.round(
    sportsData.reduce((acc, race) => acc + (parseFloat(race.distance) || 0), 0)
  );
  const hardTreks = treksData.filter((t) => t.endurance_level === "Hard").length;

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

  const stats = [
    {
      value: books,
      suffix: "",
      label: "Books Read",
      sub: "across 5+ genres",
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
      sub: `across ${totalRaces} races`,
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
      sub: `${hardTreks} rated hard`,
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
      sub: "#100DaysToOffload",
      icon: "edit_note",
      path: "/100-days-to-offload",
      color: "from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
      border: "border-violet-200/50 dark:border-violet-800/30",
      iconColor: "text-violet-600 dark:text-violet-500",
    },
  ];

  return (
    <section ref={ref} className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold">
          Life in Numbers
        </p>
        <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.path}
            className={`no-underline group relative overflow-hidden bg-gradient-to-br ${stat.color} border ${stat.border} rounded-xl p-6 flex flex-col gap-3 hover:scale-[1.02] transition-all duration-300`}
          >
            <div className="flex items-center justify-between">
              <span className={`material-symbols-outlined text-2xl ${stat.iconColor} opacity-70 group-hover:opacity-100 transition-opacity`}>
                {stat.icon}
              </span>
              <span className="material-symbols-outlined text-[14px] text-stone-300 dark:text-stone-600 group-hover:text-secondary group-hover:translate-x-1 transition-all">
                arrow_forward
              </span>
            </div>

            <div>
              <div
                className="font-headline font-black text-stone-900 dark:text-stone-100 leading-none tracking-tighter"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
              >
                {animated ? (
                  <>
                    {stat.value.toLocaleString()}
                    {stat.suffix && (
                      <span className="text-xl font-bold text-stone-400 dark:text-stone-500 ml-1">
                        {stat.suffix}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-stone-300 dark:text-stone-700">—</span>
                )}
              </div>
              <p className="font-headline font-bold text-stone-700 dark:text-stone-300 text-sm mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>

            <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-bold">
              {stat.sub}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default LifeStats;
