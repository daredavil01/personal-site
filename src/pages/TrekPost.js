import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Main from "../layouts/Main";
import { buildTrekMeta } from "../data/pageMeta";
import { useTreks } from "../context/ContentContext";
import { LoadingBlock } from "../components/common/AsyncStates";
import ImageSlider from "../components/Instagram/ImageSlider";

const difficultyClass = (level) => {
  switch (level?.toLowerCase()) {
    case "easy": return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
    case "medium": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "hard": return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
    default: return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400";
  }
};

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const TrekPost = () => {
  const { id } = useParams();
  const { data: treksData, loading } = useTreks();
  const [shareState, setShareState] = useState("idle");

  const trek = treksData.find((t) => String(t.id) === id);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: trek?.fort_name || "Trek", url });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      }
    } catch (_) {
      // Ignored
    }
    setTimeout(() => setShareState("idle"), 2000);
  };

  if (loading) return <Main><LoadingBlock label="Loading trek…" /></Main>;

  if (!trek) {
    return (
      <Main title="Trek Not Found">
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/treks" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Treks
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Trek not found.</p>
        </div>
      </Main>
    );
  }

  // Shared with the Cloudflare middleware so crawler + client OG tags match.
  const meta = buildTrekMeta({
    fortName: trek.fort_name,
    enduranceLevel: trek.endurance_level,
    trekTime: trek.trek_time,
    date: trek.date,
    image: trek.slideImages?.[0]?.url,
  });

  return (
    <Main title={meta.title} description={meta.description} image={meta.image}>
      <div className="flex flex-col gap-8 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link to="/treks" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Treks
          </Link>
          <div
            role="button"
            tabIndex={0}
            onClick={handleShare}
            onKeyDown={keyActivate(handleShare)}
            className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">{shareState === "idle" ? "share" : "check"}</span>
            { { shared: "Shared!", copied: "Copied!" }[shareState] || "Share" }
          </div>
        </div>

        <article className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-start gap-3 mb-6">
              <h1 className="font-headline text-3xl text-stone-900 dark:text-stone-100 flex-1">{trek.fort_name}</h1>
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${difficultyClass(trek.endurance_level)}`}>
                {trek.endurance_level}
              </span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              {[
                { icon: "calendar_today", value: trek.date },
                { icon: "schedule", value: trek.trek_time },
                { icon: "terrain", value: trek.endurance_level },
              ].map(({ icon, value }) => (
                <div key={icon} className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                  <span className="material-symbols-outlined text-lg text-secondary">{icon}</span>
                  <span className="font-label font-bold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {trek.slideImages?.length > 0 && (
            <div className="p-8">
              <span className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 block">
                Trek Photos ({trek.slideImages.length})
              </span>
              <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 aspect-square md:aspect-[4/3]">
                <ImageSlider data={trek.slideImages} />
              </div>
            </div>
          )}

          {trek.blog_link && (
            <div className="px-8 pb-8">
              <a
                href={trek.blog_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-label font-bold text-sm uppercase tracking-widest transition-all"
              >
                Read Blog Post
              </a>
            </div>
          )}
        </article>
      </div>
    </Main>
  );
};

export default TrekPost;
