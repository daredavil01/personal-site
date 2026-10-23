import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { formatProjectDate } from "../../lib/projectDate";
import { formatCount, formatDuration } from "../../lib/youtube";

// One video in the /videos grid. `tall` draws a Short in its own 9:16 frame
// (the Shorts-only view); otherwise every card is 16:9 so a mixed grid lines up.
const VideoCard = ({ video, tall }) => {
  const duration = formatDuration(video.durationSeconds);
  const views = formatCount(video.viewCount);
  const isShort = video.kind === "short";

  return (
    <article className="group bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:border-secondary rounded-2xl overflow-hidden flex flex-col transition-colors">
      <Link to={`/videos/${video.id}`} className="no-underline block" aria-label={video.title}>
        <div className={`relative overflow-hidden bg-stone-900 ${tall ? "aspect-[9/16]" : "aspect-video"}`}>
          {video.thumbnail && (
            <img
              src={video.thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              // A removed video's thumbnail 404s; the dark frame reads better than a broken image.
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
          )}
          <span
            aria-hidden="true"
            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:bg-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">play_arrow</span>
          </span>
          {isShort && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-secondary text-white font-label text-[10px] uppercase tracking-widest font-bold">
              Short
            </span>
          )}
          {duration && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-white font-body text-xs tabular-nums">
              {duration}
            </span>
          )}
        </div>
      </Link>
      <div className="p-4 flex flex-col gap-2">
        <Link
          to={`/videos/${video.id}`}
          className="font-headline text-lg font-bold leading-snug text-stone-900 dark:text-stone-100 group-hover:text-secondary transition-colors no-underline line-clamp-2"
        >
          {video.title}
        </Link>
        <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-0">
          {[video.date && formatProjectDate(video.date), views && `${views} views`].filter(Boolean).join(" · ")}
        </p>
      </div>
    </article>
  );
};

VideoCard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    kind: PropTypes.string,
    date: PropTypes.string,
    thumbnail: PropTypes.string,
    durationSeconds: PropTypes.number,
    viewCount: PropTypes.number,
  }).isRequired,
  tall: PropTypes.bool,
};

VideoCard.defaultProps = { tall: false };

export default VideoCard;
