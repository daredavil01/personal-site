import React from "react";
import { Link } from "react-router-dom";

// One piece of paper on the Scriptorium pinboard. The paper itself carries the
// post type — sticky note for text, a slip with a drop quotation mark for
// quotes, a polaroid for photos — with the chip + date still present, so type
// is never encoded by paper tint alone. Paper stays light in dark mode on
// purpose: it's paper.
const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const DEVANAGARI = /[ऀ-ॿ]/;

const paperFor = (post) => {
  if (post.postType === "quote") return "bg-white border-l-4 border-l-violet-400";
  if (post.postType === "photo") return "bg-white";
  // Marathi notes get the warmer paper from the mock.
  if (DEVANAGARI.test(post.text || post.title || "")) return "bg-[#f6e7d3]";
  return "bg-[#fbf3c2]";
};

const typeChipFor = (postType) => ({
  text: "bg-blue-50 text-blue-700",
  quote: "bg-violet-50 text-violet-700",
  photo: "bg-amber-50 text-amber-700",
}[postType] || "bg-stone-100 text-stone-500");

const PinboardCard = ({ post, onOpen }) => {
  const body = post.text || post.title || "";
  // Deterministic tilt so the wall doesn't reshuffle on every render.
  const rotation = ((post.id % 9) - 4) * 0.7;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={keyActivate(() => onOpen(post))}
      style={{ transform: `rotate(${rotation}deg)` }}
      className={`relative break-inside-avoid mb-5 p-4 pt-5 text-left cursor-pointer shadow-[0_3px_10px_rgba(59,50,40,0.18)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.45)] hover:shadow-[0_6px_18px_rgba(59,50,40,0.28)] hover:z-10 hover:scale-[1.02] transition-all rounded-[3px] ${paperFor(post)}`}
    >
      {/* pushpin */}
      <span
        aria-hidden="true"
        className="absolute -top-1.5 left-1/2 -ml-1.5 w-3 h-3 rounded-full bg-secondary shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
      />

      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] text-stone-500">{post.date}</span>
        <div className="flex items-center gap-1.5">
          <span className={`font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${typeChipFor(post.postType)}`}>
            {post.postType}
          </span>
          <Link
            to={`/micro-blog/${post.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-label text-[10px] text-stone-400 hover:text-secondary transition-colors leading-none"
            title="Permalink"
          >
            ↗
          </Link>
        </div>
      </div>

      {post.postType === "photo" && (
        post.imageUrl ? (
          <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-36 object-cover rounded-[2px] mb-2" />
        ) : (
          <div
            aria-hidden="true"
            className="w-full h-24 rounded-[2px] mb-2 bg-stone-100 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(59,50,40,0.06)_6px,rgba(59,50,40,0.06)_12px)]"
          />
        )
      )}

      {post.postType === "quote" ? (
        <p className="font-headline italic text-sm text-stone-800 leading-relaxed mb-0 whitespace-pre-line line-clamp-6">
          <span aria-hidden="true" className="block text-3xl leading-none text-violet-400 not-italic">&ldquo;</span>
          {body}
        </p>
      ) : (
        body && (
          <p className="font-body text-[13px] text-stone-800 leading-relaxed whitespace-pre-line line-clamp-6 mb-0">
            {body}
          </p>
        )
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {post.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="font-label text-[9px] text-stone-500">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PinboardCard;
