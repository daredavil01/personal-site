import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Main from "../layouts/Main";
import { useSports } from "../context/ContentContext";
import { LoadingBlock } from "../components/common/AsyncStates";
import ImageSlider from "../components/Instagram/ImageSlider";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const SportPost = () => {
  const { id } = useParams();
  const { data: sportsData, loading } = useSports();
  const [shareState, setShareState] = useState("idle");

  const race = sportsData.find((r) => String(r.id) === id);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: race?.title || "Race", url });
        setShareState("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
      }
    } catch (_) {}
    setTimeout(() => setShareState("idle"), 2000);
  };

  if (loading) return <Main><LoadingBlock label="Loading race…" /></Main>;

  if (!race) {
    return (
      <Main title="Race Not Found">
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <Link to="/sports" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors self-start">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Sports
          </Link>
          <p className="font-body text-stone-500 dark:text-stone-400">Race not found.</p>
        </div>
      </Main>
    );
  }

  return (
    <Main
      title={race.title}
      description={`${race.distance} race at ${race.place} on ${race.date}. Finishing time: ${race.time}.`}
    >
      <div className="flex flex-col gap-8 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link to="/sports" className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Sports
          </Link>
          <div
            role="button"
            tabIndex={0}
            onClick={handleShare}
            onKeyDown={keyActivate(handleShare)}
            className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">{shareState === "idle" ? "share" : "check"}</span>
            {shareState === "copied" ? "Copied!" : shareState === "shared" ? "Shared!" : "Share"}
          </div>
        </div>

        <article className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-stone-100 dark:border-stone-800">
            <h1 className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-6">{race.title}</h1>
            <div className="flex flex-wrap gap-6 text-sm">
              {[
                { icon: "calendar_today", value: race.date },
                { icon: "location_on", value: race.place },
                { icon: "timer", value: race.time },
                { icon: "social_leaderboard", value: race.distance },
              ].map(({ icon, value }) => (
                <div key={icon} className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                  <span className="material-symbols-outlined text-lg text-secondary">{icon}</span>
                  <span className="font-label font-bold uppercase">{value}</span>
                </div>
              ))}
              {race.bibNumber && (
                <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                  <span className="material-symbols-outlined text-lg text-secondary">confirmation_number</span>
                  <span className="font-label font-bold">BIB {race.bibNumber}</span>
                </div>
              )}
            </div>
          </div>

          {race.description && (
            <div className="px-8 pt-8">
              <p className="font-body text-stone-600 dark:text-stone-300 text-lg leading-relaxed italic border-l-4 border-secondary/30 pl-4 py-1 mb-0">
                "{race.description}"
              </p>
            </div>
          )}

          {race.slideImages?.length > 0 && (
            <div className="p-8">
              <span className="font-label text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 block">
                Event Documentation
              </span>
              <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 aspect-square md:aspect-[4/3]">
                <ImageSlider data={race.slideImages} />
              </div>
            </div>
          )}

          {race.timeCertificateLink && (
            <div className="px-8 pb-8">
              <a
                href={race.timeCertificateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-label font-bold text-sm uppercase tracking-widest transition-all"
              >
                View Official Certificate
              </a>
            </div>
          )}
        </article>
      </div>
    </Main>
  );
};

export default SportPost;
