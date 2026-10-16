import React, { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import useImageExport from "../share/useImageExport";
import { langProps } from "./shared";

// A cut-up machine: five lines lifted from five essays, shuffled until they
// read as one poem. Lock a line to keep it; shuffle the rest. The poem lives in
// ?poem= (line ids, stable across rebuilds while the sentence stands), merged
// into the existing params, so the address bar is always a link to it. "Save
// as image" snapshots the card with the hook the share cards use; the lock
// buttons step out of the picture while it is taken.

const LINES = 5;

const PoemMachine = ({ data, byId, onSelect }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cardRef = useRef(null);
  const { status, exportNode } = useImageExport();
  const lineById = useMemo(() => new Map(data.lines.map((l) => [l.id, l])), [data.lines]);

  const fromUrl = (searchParams.get("poem") || "").split(/[-,]/).map((id) => lineById.get(id)).filter(Boolean);
  const locked = new Set((searchParams.get("lock") || "").split(/[-,]/).filter(Boolean));

  const draw = (keep) => {
    const usedPosts = new Set(keep.filter(Boolean).map((l) => l.post));
    const pool = data.lines.filter((l) => !usedPosts.has(l.post));
    return keep.map((l) => {
      if (l) return l;
      const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      if (pick) pool.splice(0, pool.length, ...pool.filter((x) => x.post !== pick.post));
      return pick;
    }).filter(Boolean);
  };

  const write = (lines, lock = locked) => {
    const params = new URLSearchParams(searchParams);
    params.set("poem", lines.map((l) => l.id).join("-"));
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

  const shuffle = () => write(draw(shown.map((l) => (locked.has(l.id) ? l : null))));
  const toggleLock = (id) => {
    const next = new Set(locked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    write(shown, next);
  };
  const copyLink = () => {
    write(shown);
    const url = new URL(window.location.href);
    url.searchParams.set("poem", shown.map((l) => l.id).join("-"));
    url.searchParams.delete("lock");
    if (navigator.clipboard) navigator.clipboard.writeText(url.toString()).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={cardRef} className="lb-sheet px-8 py-8 md:px-14 md:py-10 flex flex-col gap-3" style={{ background: "var(--lb-paper)" }}>
        <p className="font-label text-[10px] uppercase tracking-[0.3em] font-bold lb-accent m-0">A found poem · Wanderer&apos;s Logbook</p>
        <ol className="list-none p-0 m-0 flex flex-col gap-2.5">
          {shown.map((l) => {
            const post = byId.get(l.post);
            const lang = langProps(post.lang);
            return (
              <li key={l.id} className="flex items-start gap-3 group">
                {status !== "working" && (
                <button
                  type="button"
                  aria-pressed={locked.has(l.id)}
                  aria-label={locked.has(l.id) ? "Unlock this line" : "Lock this line"}
                  onClick={() => toggleLock(l.id)}
                  className="lb-chip text-[11px] leading-none px-1.5 py-1 mt-1.5 shrink-0"
                >
                  {locked.has(l.id) ? "🔒" : "🔓"}
                </button>
                )}
                <p className={`font-headline text-lg md:text-2xl lb-ink m-0 leading-snug ${lang.className || ""}`} lang={lang.lang}>
                  {l.s}
                  <button type="button" onClick={() => onSelect(post.id)} className="ml-2 align-super font-label text-[9px] uppercase tracking-wider lb-soft bg-transparent border-0 p-0 cursor-pointer hover:underline" title={post.title}>
                    {post.date.slice(0, 4)}
                  </button>
                </p>
              </li>
            );
          })}
        </ol>
        <p className="font-body text-xs lb-soft m-0 mt-2">sankettambare.in/logbook</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={shuffle} className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5">↻ Shuffle unlocked lines</button>
        <button type="button" onClick={copyLink} className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5">Copy link</button>
        <button
          type="button"
          disabled={status === "working"}
          onClick={() => exportNode(cardRef.current, {
            fileName: "found-poem-wanderers-logbook.png",
            title: "A found poem from the Wanderer's Logbook",
            backgroundColor: getComputedStyle(cardRef.current).backgroundColor,
          })}
          className="lb-chip font-label text-[11px] uppercase tracking-wider px-3 py-1.5"
        >
          {{ working: "Saving…", done: "Saved ✓", error: "Could not save" }[status] || "Save as image"}
        </button>
      </div>
      <p className="font-body text-xs lb-soft m-0">Every line is a real sentence from a different essay; the small year opens it.</p>
    </div>
  );
};

PoemMachine.propTypes = {
  data: PropTypes.shape({ lines: PropTypes.arrayOf(PropTypes.shape({})).isRequired }).isRequired,
  byId: PropTypes.instanceOf(Map).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default PoemMachine;
