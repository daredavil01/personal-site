import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  fmt, langColor, placeLabels, scale, yearOf,
} from "./shared";

// The intro: one playable story, four layouts. Every essay is a dot, and as
// the reader plays or scrolls, the dots move — onto a timeline (the 2026
// surge), into two language lanes, onto the meaning map, and finally swell by
// how many exclamation marks each essay holds.

const W = 640;
const H = 400;
const PAD = 36;
const BASE = H - 48;
const CHAPTER_SECONDS = 6;

const formatTime = (seconds) => `0:${String(Math.floor(seconds)).padStart(2, "0")}`;

// Stack the dots of each month into a column, so a busy month stands taller.
function stacks(posts, x, lane = () => 0) {
  const height = new Map();
  return posts.map((p) => {
    const key = `${p.date.slice(0, 7)}|${lane(p)}`;
    const k = height.get(key) || 0;
    height.set(key, k + 1);
    return { x: x(p), k };
  });
}

function layouts(posts) {
  const time = (p) => Date.parse(p.date);
  const x = scale([Math.min(...posts.map(time)), Math.max(...posts.map(time))], [PAD, W - PAD]);
  const atTime = (p) => x(time(p));
  const surge = stacks(posts, atTime).map(({ x: px, k }) => ({ x: px, y: BASE - k * 9, r: 3.6, o: 1 }));
  const mid = H / 2 + 20;
  const streams = stacks(posts, atTime, (p) => p.lang).map(({ x: px, k }, i) => ({
    x: px, y: posts[i].lang === "mr" ? mid + 14 + k * 9 : mid - 14 - k * 9, r: 3.6, o: 1,
  }));
  const ax = scale([0, 1], [PAD + 10, W - PAD - 10]);
  const ay = scale([0, 1], [PAD, H - PAD - 20]);
  const atlas = posts.map((p) => (p.xy
    ? { x: ax(p.xy[0]), y: ay(p.xy[1]), r: 2.4 + Math.sqrt(p.words) / 12, o: 1 }
    : { x: W / 2, y: H / 2, r: 0, o: 0 }));
  const bang = posts.map((p, i) => ({ ...atlas[i], r: p.xy ? 1.5 + Math.sqrt(p.exclaims || 0) * 1.25 : 0 }));
  return [surge, streams, atlas, bang];
}

const Scrolly = ({ data, onExplore }) => {
  const { posts, totals: t, byYear, clusters } = data;
  const [step, setStep] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stepRefs = useRef([]);
  const playingRef = useRef(false);
  const playbackStartRef = useRef(0);
  const lay = useMemo(() => layouts(posts), [posts]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    if (preference.addEventListener) {
      preference.addEventListener("change", update);
      return () => preference.removeEventListener("change", update);
    }
    preference.addListener(update);
    return () => preference.removeListener(update);
  }, []);

  useEffect(() => {
    const els = stepRefs.current.filter(Boolean);
    if (!els.length || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !playingRef.current) {
          const nextStep = Number(e.target.dataset.step);
          setStep(nextStep);
          setCurrentTime(nextStep * CHAPTER_SECONDS);
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const peak = byYear.reduce((a, y) => (y.posts > a.posts ? y : a), byYear[0]);
  const before = byYear.filter((y) => y.year < peak.year).reduce((s, y) => s + y.posts, 0);
  const offload = posts.filter((p) => yearOf(p) === peak.year && p.tags.some((tag) => /100.?days/i.test(tag))).length;
  const per1000 = t.words ? Math.round((t.exclaims / t.words) * 1000) : null;
  const loudest = byYear.reduce((a, y) => (y.words && y.exclaims / y.words > a.exclaims / a.words ? y : a), byYear[0]);
  const ax = scale([0, 1], [PAD + 10, W - PAD - 10]);
  const ay = scale([0, 1], [PAD, H - PAD - 20]);
  const time = (p) => Date.parse(p.date);
  const x = scale([Math.min(...posts.map(time)), Math.max(...posts.map(time))], [PAD, W - PAD]);

  const steps = [
    {
      kicker: `${t.firstYear} → ${t.lastYear}`,
      text: `${fmt(t.posts)} essays. For years they came a few at a time, ${before} before ${peak.year}. Then ${peak.year} happened: ${peak.posts} essays in one year${offload ? `, ${offload} of them for the 100 Days To Offload challenge` : ""}.`,
    },
    {
      kicker: "Two languages",
      text: `${fmt(t.en)} in English, ${fmt(t.mr)} in Marathi. The English essays argue with screens, attention and AI; the Marathi ones climb forts and walk the forests of the Sahyadri and Satpuda.`,
    },
    {
      kicker: "Placed by meaning",
      text: `Now forget the dates. Here every essay sits beside the ones that say similar things, whatever language they say it in. ${clusters.length} regions emerge on their own: the map of what I keep writing about.`,
    },
    {
      kicker: "The exclamation mark",
      text: per1000
        ? `${fmt(t.exclaims)} exclamation marks, about ${per1000} in every thousand words. The bigger the dot, the louder the essay. The loudest year per word was ${loudest.year}!`
        : "Every dot swells by the exclamation marks its essay holds.",
    },
  ];

  const duration = steps.length * CHAPTER_SECONDS;

  useEffect(() => {
    if (!playing) return undefined;
    const tick = () => {
      const elapsed = (performance.now() - playbackStartRef.current) / 1000;
      if (elapsed >= duration) {
        setCurrentTime(duration);
        setStep(steps.length - 1);
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      setCurrentTime(elapsed);
      setStep(Math.floor(elapsed / CHAPTER_SECONDS));
    };
    const timer = window.setInterval(tick, 150);
    return () => window.clearInterval(timer);
  }, [playing, duration, steps.length]);

  const pauseFilm = () => {
    playingRef.current = false;
    setPlaying(false);
  };

  const playFilm = () => {
    if (reducedMotion) return;
    const startAt = currentTime >= duration ? 0 : currentTime;
    if (startAt === 0) {
      setCurrentTime(0);
      setStep(0);
    }
    playbackStartRef.current = performance.now() - startAt * 1000;
    playingRef.current = true;
    setPlaying(true);
  };

  const seek = (seconds) => {
    const nextTime = Math.max(0, Math.min(duration, Number(seconds)));
    pauseFilm();
    setCurrentTime(nextTime);
    setStep(Math.min(steps.length - 1, Math.floor(nextTime / CHAPTER_SECONDS)));
  };

  const seekChapter = (nextStep) => {
    seek(nextStep * CHAPTER_SECONDS);
  };

  const dots = lay[step];
  const layoutLabel = ["timeline", "language lanes", "meaning map", "exclamation map"][step];

  return (
    <section aria-label="The logbook in four steps" className="relative">
      <div className="sticky top-24 z-0">
        <div className="lb-sheet p-3 md:p-5 md:h-[min(72vh,560px)] flex flex-col gap-2">
          <div role="group" aria-labelledby="lb-film-title" className="lb-film-controls">
            <h2 id="lb-film-title" className="sr-only">Interactive logbook film</h2>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5" onClick={() => seekChapter(step - 1)} disabled={step === 0}>
                  Previous chapter
                </button>
                <button type="button" className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5" onClick={playing ? pauseFilm : playFilm} disabled={reducedMotion} aria-pressed={playing}>
                  {playing ? "Pause film" : "Play film"}
                </button>
                <button type="button" className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5" onClick={() => seekChapter(step + 1)} disabled={step === steps.length - 1}>
                  Next chapter
                </button>
              </div>
              <span className="font-label text-[10px] uppercase tracking-wider lb-soft">
                {steps[step].kicker} · {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <p className="lb-film-caption font-body text-xs md:text-sm lb-ink m-0" aria-live="polite">
              {steps[step].text}
            </p>
            <label className="sr-only" htmlFor="lb-film-seek">Seek the logbook film</label>
            <input
              id="lb-film-seek"
              className="lb-film-seek"
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={Math.min(currentTime, duration)}
              onChange={(event) => seek(event.target.value)}
              aria-controls="lb-film-frame"
              aria-valuetext={`${steps[step].kicker}, ${formatTime(currentTime)} of ${formatTime(duration)}`}
            />
            {reducedMotion && <p className="font-body text-xs lb-soft m-0">Reduced motion is on. Choose chapters or scrub through the story.</p>}
          </div>
          <svg id="lb-film-frame" viewBox={`0 0 ${W} ${H}`} className="w-full h-auto md:flex-1 md:min-h-0" role="img" aria-label={`Every essay as a dot: ${layoutLabel}`}>
          {/* timeline axis */}
          <g className="lb-fade" style={{ opacity: step < 2 ? 1 : 0 }}>
            {byYear.map((y) => {
              const yx = Math.max(PAD, x(Date.parse(`${y.year}-01-01`)));
              return (
                <g key={y.year}>
                  <line x1={yx} x2={yx} y1={step === 0 ? BASE + 6 : H / 2 + 20} y2={step === 0 ? BASE + 12 : H / 2 + 26} stroke="var(--lb-soft)" />
                  <text x={yx} y={step === 0 ? BASE + 26 : H - 14} textAnchor="middle" fontSize="11" fill="var(--lb-soft)" fontFamily="Plus Jakarta Sans, sans-serif">{y.year}</text>
                </g>
              );
            })}
            <line x1={PAD} x2={W - PAD} y1={step === 0 ? BASE + 6 : H / 2 + 20} y2={step === 0 ? BASE + 6 : H / 2 + 20} stroke="var(--lb-faint)" />
          </g>
          <g className="lb-fade" style={{ opacity: step === 1 ? 1 : 0 }} fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fontWeight="700" letterSpacing="2">
            <text x={PAD} y={PAD + 4} fill="var(--lb-en)">ENGLISH ↑</text>
            <text x={PAD} y={H - 34} fill="var(--lb-mr)" lang="mr">मराठी ↓</text>
          </g>
          <g className="lb-fade" style={{ opacity: step >= 2 ? 1 : 0 }} fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fontWeight="700" letterSpacing="1.5">
            {placeLabels(clusters, ax, ay, { width: W, charW: 9.6, lift: 26, line: 16 }).map((c) => (
              <text key={c.id} x={c.lx} y={c.ly} textAnchor="middle" fill="var(--lb-soft)">{c.label.toUpperCase()}</text>
            ))}
          </g>
          {posts.map((p, i) => (
            <circle
              key={p.id}
              className="lb-dot"
              cx={0}
              cy={0}
              r={dots[i].r}
              opacity={dots[i].o * (step === 3 ? 0.75 : 0.9)}
              style={{ transform: `translate(${dots[i].x}px, ${dots[i].y}px)` }}
              fill={step === 0 ? "var(--lb-ink)" : langColor(p.lang)}
            />
          ))}
          {step === 3 && per1000 && Array.from({ length: 14 }, (_, i) => (
            <text
              key={i}
              className="lb-rain"
              x={PAD + ((i * 97) % (W - PAD * 2))}
              y={0}
              fontSize="16"
              fill="var(--lb-accent)"
              style={{ animationDelay: `${(i * 0.37) % 2.6}s` }}
              aria-hidden="true"
            >
              !
            </text>
          ))}
        </svg>
        </div>
      </div>

      <div className="relative z-10 flex flex-col pointer-events-none" style={{ marginTop: "-30vh" }}>
        {steps.map((s, i) => (
          <div
            key={s.kicker}
            ref={(el) => { stepRefs.current[i] = el; }}
            data-step={i}
            className="flex items-end md:items-center justify-center md:justify-end px-3 md:px-8 pb-4 md:pb-0"
            style={{ minHeight: "75vh" }}
          >
            <div className="lb-step-card pointer-events-auto max-w-sm p-5 flex flex-col gap-2">
              <p className="font-label text-[10px] uppercase tracking-[0.25em] font-bold lb-accent m-0">{s.kicker}</p>
              <p className="font-body text-base lb-ink m-0 leading-relaxed">{s.text}</p>
            </div>
          </div>
        ))}
        <div className="flex justify-center py-10 pointer-events-auto">
          <button type="button" onClick={onExplore} className="lb-chip font-label text-xs uppercase tracking-wider px-5 py-2.5">
            Explore the logbook ↓
          </button>
        </div>
      </div>
    </section>
  );
};

Scrolly.propTypes = {
  data: PropTypes.shape({
    posts: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    totals: PropTypes.shape({}).isRequired,
    byYear: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    clusters: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  }).isRequired,
  onExplore: PropTypes.func.isRequired,
};

export default Scrolly;
