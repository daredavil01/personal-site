import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { colorForTag, postArt } from "../../lib/generativeArt";

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

// The card's generative background: seeded by post id, colored by its tags
// (or a seeded palette when it has none). Kept faint so the text stays the
// point; the paper is always light, so one opacity suits both themes.
const PostArt = ({ art }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid slice"
    // -z-10 is safe: the card's rotate() transform makes it a stacking
    // context, so this lands above the paper but under the text.
    className="absolute inset-0 -z-10 w-full h-full pointer-events-none rounded-[3px] opacity-[0.16]"
  >
    {art.shapes.map((s, i) => (s.kind === "circle"
      // eslint-disable-next-line react/no-array-index-key
      ? <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} fillOpacity={s.opacity} />
      : (
        <rect
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          rx={2}
          fill={s.fill}
          fillOpacity={s.opacity}
          transform={`rotate(${s.rotate} ${s.x + s.w / 2} ${s.y + s.h / 2})`}
        />
      )))}
  </svg>
);

const NO_COLORS = new Map();

const PinboardCard = ({ post, onOpen, tagColors = NO_COLORS }) => {
  const body = post.text || post.title || "";
  // Deterministic tilt so the wall doesn't reshuffle on every render.
  const rotation = ((post.id % 9) - 4) * 0.7;
  const art = useMemo(() => postArt(post, tagColors), [post, tagColors]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={keyActivate(() => onOpen(post))}
      style={{ transform: `rotate(${rotation}deg)` }}
      className={`relative break-inside-avoid mb-5 p-4 pt-5 text-left cursor-pointer shadow-[0_3px_10px_rgba(59,50,40,0.18)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.45)] hover:shadow-[0_6px_18px_rgba(59,50,40,0.28)] hover:z-10 hover:scale-[1.02] transition-all rounded-[3px] ${paperFor(post)}`}
    >
      {/* Photo posts already carry a picture (or its placeholder). */}
      {post.postType !== "photo" && <PostArt art={art} />}

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
            <span key={tag} className="inline-flex items-center gap-1 font-label text-[9px] text-stone-500">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: colorForTag(tag, tagColors.get(tag)) }}
              />
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PinboardCard;
