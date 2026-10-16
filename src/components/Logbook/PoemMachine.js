import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useImageExport from "../share/useImageExport";
import { SITE_URL } from "../../data/pageMeta";
import { langProps, yearOf } from "./shared";

// VI · Found poems. A cut-up machine: five lines lifted from five essays,
// shuffled until they read as one poem. Lock a line to keep it; shuffle the
// rest, and the new lines ink in one after another. The poem lives in ?poem=
// (line ids, stable across rebuilds while the sentence stands), merged into
// the existing params, so the address bar is always a link to it. "Save as
// image" snapshots the card with the hook the share cards use; the locks
// step out of the picture while it is taken.

const LINES = 5;
const HOST = SITE_URL.replace(/^https?:\/\//, "");

const Padlock = ({ locked }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" fill="currentColor" />
    <path d={locked ? "M4.5 6V4.2a2.5 2.5 0 0 1 5 0V6" : "M4.5 6V4.2a2.5 2.5 0 0 1 4.9-.7"} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const PoemMachine = ({ data, byId, onSelect }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const { status, exportNode } = useImageExport();
  const lines = useMemo(() => data.lines.filter((l) => byId.has(l.post)), [data.lines, byId]);
  const lineById = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);

  const fromUrl = (searchParams.get("poem") || "").split(/[-,]/).map((id) => lineById.get(id)).filter(Boolean);
  const locked = new Set((searchParams.get("lock") || "").split(/[-,]/).filter(Boolean));

  const draw = (keep) => {
    const usedPosts = new Set(keep.filter(Boolean).map((l) => l.post));
    const pool = lines.filter((l) => !usedPosts.has(l.post));
    return keep.map((l) => {
      if (l) return l;
      const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      if (pick) pool.splice(0, pool.length, ...pool.filter((x) => x.post !== pick.post));
      return pick;
    }).filter(Boolean);
  };

  const write = (next, lock = locked) => {
    const params = new URLSearchParams(searchParams);
    params.set("poem", next.map((l) => l.id).join("-"));
    if (lock.size) params.set("lock", [...lock].join("-"));
    else params.delete("lock");
    setSearchParams(params, { replace: true });
  };

  const poem = fromUrl.length === LINES ? fromUrl : null;
  const shown = poem || draw(Array.from({ length: LINES }, (_, i) => fromUrl[i] || null));

  // A fresh visit draws a poem once and writes it to the address bar, so a
  // re-render never reshuffles it.
  useEffect(() => {
    if (!poem && shown.length) write(shown);
  });

  const shuffle = () => {
    write(draw(shown.map((l) => (locked.has(l.id) ? l : null))));
  };
  const toggleLock = (id) => {
    const next = new Set(locked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    write(shown, next);
  };
  const copyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("poem", shown.map((l) => l.id).join("-"));
    url.searchParams.delete("lock");
    url.searchParams.delete("post");
    url.searchParams.set("lens", "poem");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url.toString()).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }).catch(() => {});
    }
  };

  const years = shown.map((l) => yearOf(byId.get(l.post)));
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";
  const exporting = status === "working";
  let fresh = 0;

  return (
    <div className="flex flex-col gap-4 items-stretch">
      {/* The margin lives on a wrapper: html-to-image draws the captured
          node's own margins into the picture. While it is taken the paper
          drops its grain, which the capture renders as solid black. */}
      <div className="max-w-3xl w-full mx-auto">
      <div ref={cardRef} className={`lb-poem px-6 py-9 sm:px-12 sm:py-12 md:px-16 md:py-14 ${exporting ? "lb-poem--flat" : ""}`}>
        <div className="flex flex-col gap-1 items-center text-center mb-8">
          <p className="lb-kicker lb-accent m-0">A found poem</p>
          <p className="lb-italic text-[17px] lb-soft m-0">{`five lines, five essays, ${span}`}</p>
        </div>
        <ol className="list-none p-0 m-0 flex flex-col gap-4">
          {shown.map((l) => {
            const post = byId.get(l.post);
            const lp = langProps(post.lang);
            const isLocked = locked.has(l.id);
            const delay = isLocked ? 0 : fresh * 0.12;
            if (!isLocked) fresh += 1;
            return (
              // Keyed by line: a shuffle mounts only the new lines, so only
              // they ink in; a kept line never replays.
              <li key={l.id} className="lb-poem-line">
                {exporting ? <span aria-hidden="true" /> : (
                  <button
                    type="button"
                    className="lb-lock"
                    aria-pressed={isLocked}
                    aria-label={isLocked ? "Unlock this line" : "Keep this line when shuffling"}
                    onClick={() => toggleLock(l.id)}
                  >
                    <Padlock locked={isLocked} />
                  </button>
                )}
                <p className={`lb-display lb-line-in text-[23px] sm:text-[28px] md:text-[31px] leading-[1.22] m-0 ${lp.className || ""}`} lang={lp.lang} style={{ animationDelay: `${delay}s` }}>
                  {l.s.slice(0, l.s.lastIndexOf(" ") + 1)}
                  <span className="whitespace-nowrap">
                    {l.s.slice(l.s.lastIndexOf(" ") + 1)}
                    <button
                      type="button"
                      onClick={() => onSelect(post.id)}
                      className="ml-2 align-super lb-kicker text-[9px] lb-soft bg-transparent border-0 p-0 cursor-pointer hover:underline"
                      title={post.title}
                      aria-label={`From ${post.title}, ${yearOf(post)}`}
                    >
                      {yearOf(post)}
                    </button>
                  </span>
                </p>
              </li>
            );
          })}
        </ol>
        <div className="lb-orn mt-10"><span className="lb-meta">{`${HOST}/logbook`}</span></div>
      </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={shuffle} className="lb-btn lb-btn--ink">
          <span aria-hidden="true">↻</span>
          {locked.size ? `Shuffle the other ${LINES - [...locked].filter((id) => shown.some((l) => l.id === id)).length}` : "Shuffle"}
        </button>
        <button type="button" onClick={copyLink} className="lb-btn">{copied ? "Link copied ✓" : "Copy link"}</button>
        <button
          type="button"
          disabled={exporting}
          onClick={() => exportNode(cardRef.current, {
            fileName: "found-poem-wanderers-logbook.png",
            title: "A found poem from the Wanderer's Logbook",
            backgroundColor: getComputedStyle(cardRef.current).backgroundColor,
          })}
          className="lb-btn"
        >
          {{ working: "Saving…", done: "Saved ✓", error: "Could not save" }[status] || "Save as image"}
        </button>
      </div>
      <p className="font-body text-[13px] lb-soft m-0 text-center">
        Every line is a real sentence from a different essay; the small year opens it.
      </p>
    </div>
  );
};

export default PoemMachine;
