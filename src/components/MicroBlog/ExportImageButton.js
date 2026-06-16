import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { SITE_NAME, BASE_URL } from "../../data/pageMeta";
import { typeColors, sourceLabels } from "./constants";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

// Domain shown on the exported card's footer (without protocol).
const SITE_DOMAIN = BASE_URL.replace(/^https?:\/\//, "");

/**
 * Renders an "Export image" action (styled like the sibling Share/Copy
 * controls) plus an off-screen, fixed light-theme template card. Clicking
 * snapshots the card to a PNG and downloads it. The card is kept in the DOM
 * (positioned off-screen, not display:none) so html-to-image can measure it.
 */
const ExportImageButton = ({ post }) => {
  const cardRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | working | done | error

  const body = post.text || post.title || "";
  const isQuote = post.postType === "quote";

  const handleExport = async () => {
    if (!cardRef.current || state === "working") return;
    setState("working");
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `microblog-${post.id}.png`;
      link.href = dataUrl;
      link.click();
      setState("done");
    } catch (_) {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  const label = { working: "Saving…", done: "Saved!", error: "Failed" }[state] || "Image";
  const icon = { working: "hourglass_empty", done: "check", error: "error" }[state] || "image";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleExport}
        onKeyDown={keyActivate(handleExport)}
        className="flex items-center gap-1 font-label text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500 hover:text-secondary transition-colors cursor-pointer"
        title="Export as image"
      >
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {label}
      </div>

      {/* Off-screen template card. No `dark:` classes — the exported image is
          always light-themed for consistency regardless of site theme. */}
      <div className="fixed -left-[99999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          ref={cardRef}
          style={{ width: "1080px" }}
          className="bg-white text-stone-900 font-body flex flex-col"
        >
          <div className="h-3 w-full bg-secondary" />
          <div className="flex flex-col gap-10 px-20 py-16">
            {/* Branding header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-8">
              <span className="font-headline text-3xl font-bold text-stone-900">{SITE_NAME}</span>
              <span className="font-label text-base uppercase tracking-[0.3em] text-secondary">
                Micro Blog
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4">
              <span className="font-mono text-xl text-stone-400">{post.date}</span>
              <span
                className={`font-label text-sm uppercase tracking-widest px-3 py-1 rounded ${
                  typeColors[post.postType]
                    ? typeColors[post.postType].split(" ").filter((c) => !c.startsWith("dark:")).join(" ")
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {post.postType}
              </span>
            </div>

            {/* Body */}
            {body ? (
              <p
                className={`whitespace-pre-line leading-relaxed mb-0 ${
                  isQuote
                    ? "font-headline italic text-stone-800 text-5xl leading-snug"
                    : "font-body text-stone-800 text-4xl"
                }`}
              >
                {isQuote ? `“${body}”` : body}
              </p>
            ) : (
              <p className="font-body italic text-stone-400 text-4xl mb-0">Photo post</p>
            )}

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {post.tags.slice(0, 12).map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-1.5 bg-stone-50 text-stone-500 rounded-md text-xl border border-stone-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer / watermark */}
            <div className="flex items-center justify-between border-t border-stone-200 pt-8 mt-2">
              <span className="font-label text-base uppercase tracking-widest text-stone-400">
                Source: {sourceLabels[post.source] || post.source}
              </span>
              <span className="font-mono text-base text-stone-400">
                {SITE_DOMAIN}/micro-blog/{post.id}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExportImageButton;
