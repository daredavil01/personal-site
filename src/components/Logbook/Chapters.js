import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { constellationOf } from "../../lib/logbook";
import { regionFill } from "./ChartBase";
import { arcPath, spiralPaths } from "./model";
import { textLang } from "./shared";

// The book's apparatus: the chapter list (one entry per experience, plus the
// index), the chapter frame, the contents page whose thumbnails are drawn
// from the real data, and the dock that follows the reader down the page.
// `id` is also the legacy ?lens= value, so old links still land.

export const CHAPTERS = [
  { id: "atlas", numeral: "I", title: "Atlas", dek: "the chart of what I write about", what: "Essays placed by meaning, in both languages" },
  { id: "sky", numeral: "II", title: "Sky", dek: "opening lines as constellations", what: "A star for every word of every first sentence" },
  { id: "fingerprint", numeral: "III", title: "Fingerprint", dek: "punctuation and rhythm, words removed", what: "Each essay as a spiral of its marks" },
  { id: "phrases", numeral: "IV", title: "Phrases", dek: "habits of the hand", what: "The words I keep reaching for, and a game" },
  { id: "letters", numeral: "V", title: "Letters", dek: "my past self, answered", what: "Old sentences beside their closest new ones" },
  { id: "poem", numeral: "VI", title: "Found poems", dek: "lines cut from the archive", what: "Five essays, one poem, yours to keep" },
  { id: "index", numeral: "§", title: "Index", dek: "every entry, in order", what: "The whole logbook as a list" },
];

export const chapterById = (id) => CHAPTERS.find((c) => c.id === id) || null;
export const sectionId = (id) => `lb-${id}`;

export const Chapter = ({ id, intro, children }) => {
  const c = chapterById(id);
  return (
    <section id={sectionId(id)} className="lb-chapter flex flex-col gap-6" aria-labelledby={`${sectionId(id)}-title`}>
      <header className="lb-chapter-head">
        <span className="lb-numeral" aria-hidden="true">{c.numeral}</span>
        <div className="flex flex-col gap-2 min-w-0 pb-1">
          <p className="lb-kicker lb-soft m-0">{c.id === "index" ? "Back matter" : `Chapter ${c.numeral}`}</p>
          <h2 id={`${sectionId(id)}-title`} className="lb-display lb-chapter-title m-0">{c.title}</h2>
          <p className="lb-italic text-[22px] md:text-[26px] leading-tight lb-ink-2 m-0">{c.dek}</p>
        </div>
      </header>
      {intro && <p className="font-body text-base md:text-[17px] leading-relaxed lb-ink-2 m-0 max-w-3xl">{intro}</p>}
      {children}
    </section>
  );
};

// ---- Thumbnails: each chapter's own figure, small -----------------------

const S = 84;

const Thumb = ({ id, data }) => {
  const { posts } = data;
  if (id === "atlas") {
    return (
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
        {posts.filter((p) => p.xy).map((p) => (
          <circle key={p.id} cx={8 + p.xy[0] * (S - 16)} cy={8 + p.xy[1] * (S - 16)} r="2.1" fill={regionFill(p.cluster)} />
        ))}
      </svg>
    );
  }
  if (id === "sky") {
    const p = posts[posts.length - 1];
    const stars = constellationOf(p.opening || p.title);
    const pts = stars.map((s) => [10 + s.x * (S - 20), 10 + s.y * (S - 20)]);
    return (
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
        <path d={pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join("")} fill="none" stroke="var(--lb-mr-night)" strokeWidth="0.8" opacity="0.7" />
        {pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={1 + stars[i].r * 2} fill="var(--lb-star)" />)}
      </svg>
    );
  }
  if (id === "fingerprint") {
    const p = posts.reduce((a, q) => ((q.exclaims || 0) > (a.exclaims || 0) ? q : a), posts[0]);
    const paths = spiralPaths(p.punct || "");
    return (
      <svg viewBox="0 0 120 120" width={S} height={S}>
        <path d={paths.stop} stroke="var(--lb-ink)" strokeWidth="2.4" strokeLinecap="round" />
        <path d={paths.comma} stroke="var(--lb-soft)" strokeWidth="1.8" strokeLinecap="round" />
        <path d={paths.bang} stroke="var(--lb-accent)" strokeWidth="2.2" strokeLinecap="round" />
        <path d={paths.ask} stroke="var(--lb-ask)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "phrases") {
    const top = (data.phrases.en || []).slice(0, 5);
    const max = Math.max(1, ...top.map((p) => p.posts));
    return (
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
        {top.map((p, i) => (
          <g key={p.p}>
            <rect x="10" y={14 + i * 12} width={(p.posts / max) * (S - 20)} height="6" rx="3" fill="var(--lb-accent)" opacity={1 - i * 0.14} />
          </g>
        ))}
      </svg>
    );
  }
  if (id === "letters") {
    const at = (d) => {
      const t0 = Date.parse(posts[0].date);
      const t1 = Date.parse(posts[posts.length - 1].date);
      return 8 + ((Date.parse(d) - t0) / (t1 - t0 || 1)) * (S - 16);
    };
    const byId = new Map(posts.map((p) => [p.id, p]));
    return (
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
        <line x1="6" x2={S - 6} y1={S - 16} y2={S - 16} stroke="var(--lb-faint)" />
        {data.letters.filter((l) => byId.has(l.then.post) && byId.has(l.now.post)).map((l) => {
          const x0 = at(byId.get(l.then.post).date);
          const x1 = at(byId.get(l.now.post).date);
          return <path key={`${l.then.post}-${l.now.post}`} d={arcPath(x0, x1, S - 16, Math.min(S - 30, (x1 - x0) * 0.6))} fill="none" stroke="var(--lb-accent)" strokeWidth="0.9" opacity="0.6" />;
        })}
      </svg>
    );
  }
  if (id === "poem") {
    return (
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
        {[0.82, 0.6, 0.74, 0.5, 0.66].map((w, i) => (
          <rect key={i} x="12" y={16 + i * 11} width={w * (S - 24)} height="4" rx="2" fill="var(--lb-ink)" opacity={i === 2 ? 0.9 : 0.35} />
        ))}
        <rect x="8" y="36" width="2" height="12" rx="1" fill="var(--lb-accent)" />
      </svg>
    );
  }
  const max = Math.max(...posts.map((p) => p.words));
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S}>
      {posts.map((p, i) => (
        <rect key={p.id} x={6 + (i / posts.length) * (S - 12)} y={S - 12 - (p.words / max) * (S - 28)} width={Math.max(0.6, (S - 12) / posts.length - 0.2)} height={(p.words / max) * (S - 28)} fill={p.lang === "mr" ? "var(--lb-mr)" : "var(--lb-en)"} />
      ))}
    </svg>
  );
};

export const Contents = ({ data, onJump }) => (
  <section id="lb-contents" className="lb-chapter flex flex-col gap-5" aria-labelledby="lb-contents-title">
    <div className="lb-orn"><span className="lb-italic text-xl">Contents</span></div>
    <h2 id="lb-contents-title" className="sr-only">Contents</h2>
    <ol className="lb-toc list-none p-0 m-0">
      {CHAPTERS.map((c) => (
        <li key={c.id}>
          <button type="button" className="lb-card lb-toc-card w-full" onClick={() => onJump(c.id)}>
            <span className={`lb-toc-art grid place-items-center ${c.id === "sky" ? "lb-toc-art--night" : ""}`} aria-hidden="true">
              <Thumb id={c.id} data={data} />
            </span>
            <span className="flex flex-col gap-1 min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="lb-italic lb-accent text-[22px] leading-none">{c.numeral}</span>
                <span className="lb-display text-[26px] leading-none">{c.title}</span>
              </span>
              <span className="font-body text-[13px] lb-soft leading-snug">{c.what}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  </section>
);

/** Which chapter the reader is in: the one crossing the upper middle of the viewport. */
export function useCurrentChapter(ready) {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === "undefined") return undefined;
    const els = CHAPTERS.map((c) => document.getElementById(sectionId(c.id))).filter(Boolean);
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const id = e.target.id.replace(/^lb-/, "");
        if (e.isIntersecting) visible.add(id);
        else visible.delete(id);
      });
      const first = CHAPTERS.find((c) => visible.has(c.id));
      setCurrent(first ? first.id : null);
    }, { rootMargin: "-35% 0px -60% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready]);
  return current;
}

export const ChapterDock = ({ current, hidden, onJump }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const i = CHAPTERS.findIndex((c) => c.id === current);
  const c = CHAPTERS[i];
  const shown = !!c && !hidden;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (e.type === "pointerdown" && menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  useEffect(() => { if (!shown) setOpen(false); }, [shown]);

  if (typeof document === "undefined") return null;
  const go = (id) => {
    setOpen(false);
    onJump(id);
  };

  return createPortal(
    <div className="lb-root">
      <nav ref={menuRef} className="lb-dock" data-shown={shown} aria-label="Logbook chapters" aria-hidden={!shown}>
        <button type="button" aria-label="Previous chapter" disabled={i <= 0} onClick={() => go(CHAPTERS[i - 1].id)} tabIndex={shown ? 0 : -1}>
          <span aria-hidden="true">‹</span>
        </button>
        <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)} tabIndex={shown ? 0 : -1}>
          <span className="lb-italic lb-accent text-[18px] leading-none">{c ? c.numeral : ""}</span>
          <span className="lb-display text-[18px] leading-none hidden sm:inline">{c ? c.title : ""}</span>
        </button>
        <button type="button" aria-label="Next chapter" disabled={i < 0 || i >= CHAPTERS.length - 1} onClick={() => go(CHAPTERS[i + 1].id)} tabIndex={shown ? 0 : -1}>
          <span aria-hidden="true">›</span>
        </button>
        {open && (
          <div className="lb-dock-menu">
            <ol className="list-none p-0 m-0 flex flex-col gap-0.5">
              {CHAPTERS.map((ch) => (
                <li key={ch.id}>
                  <button type="button" aria-current={ch.id === current} onClick={() => go(ch.id)}>
                    <span className="lb-italic lb-accent w-7 text-[17px]">{ch.numeral}</span>
                    <span className="flex flex-col items-start">
                      <span className="lb-display text-[19px] leading-tight">{ch.title}</span>
                      <span className="font-body text-[11.5px] lb-soft" {...(textLang(ch.dek) === "mr" ? { lang: "mr" } : {})}>{ch.dek}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </nav>
    </div>,
    document.body,
  );
};
