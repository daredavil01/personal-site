import React, { useState } from "react";
import PropTypes from "prop-types";
import { useParams, Link } from "react-router-dom";
import RelatedContent from "../components/Ask/RelatedContent";
import PageShell from "../atlas/PageShell";
import { buildVideoMeta } from "../data/pageMeta";
import { useVideos } from "../context/ContentContext";
import { LoadingBlock } from "../components/common/AsyncStates";
import TagLinks from "../components/common/TagLinks";
import { formatProjectDate } from "../lib/projectDate";
import { embedUrl, formatCount, formatDuration } from "../lib/youtube";

const toolLink = "inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-widest text-stone-400 hover:text-secondary transition-colors cursor-pointer no-underline";

const BackLink = () => (
  <Link to="/videos" className={toolLink}>
    <span className="material-symbols-outlined text-sm">arrow_back</span> All videos
  </Link>
);

// The thumbnail until someone presses play, then the youtube-nocookie player:
// a page that is only read never loads YouTube's ~1 MB of player script, and
// no YouTube cookie is set until a visitor chooses to watch.
const Player = ({ video }) => {
  const [playing, setPlaying] = useState(false);
  const tall = video.kind === "short";
  const frame = `relative w-full bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 ${
    tall ? "aspect-[9/16] max-w-sm mx-auto" : "aspect-video"
  }`;

  if (playing) {
    return (
      <div className={frame}>
        <iframe
          src={`${embedUrl(video.youtubeId)}?autoplay=1&rel=0&modestbranding=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${video.title}`}
      className={`${frame} group block p-0 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary`}
    >
      {video.thumbnail && (
        <img
          src={video.thumbnail}
          alt=""
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black/60 text-white flex items-center justify-center group-hover:bg-secondary transition-colors"
      >
        <span className="material-symbols-outlined text-5xl">play_arrow</span>
      </span>
    </button>
  );
};

Player.propTypes = {
  video: PropTypes.shape({
    youtubeId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    kind: PropTypes.string,
    thumbnail: PropTypes.string,
  }).isRequired,
};

// Descriptions are plain text from YouTube. Links are made clickable, but only
// http(s) ones, and they leave the site with rel=nofollow.
const URL_RE = /(https?:\/\/[^\s<>"]+)/g;
const Description = ({ text }) => (
  <p className="font-body text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line break-words mb-0">
    {text.split(URL_RE).map((part, i) => (i % 2
      ? (
        // eslint-disable-next-line react/no-array-index-key
        <a key={i} href={part} target="_blank" rel="nofollow noopener noreferrer" className="text-secondary underline">
          {part}
        </a>
      )
      : part))}
  </p>
);

Description.propTypes = { text: PropTypes.string.isRequired };

const VideoPost = () => {
  const { id } = useParams();
  const { data: videos, loading } = useVideos();

  if (loading) return <PageShell region="person"><LoadingBlock label="Loading video…" /></PageShell>;

  const video = videos.find((v) => String(v.id) === id);
  if (!video) {
    return (
      <PageShell region="person" title="Video Not Found" noindex>
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <BackLink />
          <p className="font-body text-stone-500 dark:text-stone-400">Video not found.</p>
        </div>
      </PageShell>
    );
  }

  const meta = buildVideoMeta({
    title: video.title,
    description: video.description,
    image: video.thumbnail,
    kind: video.kind,
  });
  const facts = [
    video.date && formatProjectDate(video.date),
    formatDuration(video.durationSeconds),
    video.viewCount != null && `${formatCount(video.viewCount)} views`,
  ].filter(Boolean);

  return (
    <PageShell region="person" title={meta.title} description={meta.description} image={meta.image}>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BackLink />
          <a href={video.url} target="_blank" rel="noopener noreferrer" className={toolLink}>
            <span className="material-symbols-outlined text-sm">open_in_new</span> Watch on YouTube
          </a>
        </div>

        <Player video={video} />

        <article className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-secondary text-white font-label text-[10px] uppercase tracking-widest font-bold">
                {video.kind === "short" ? "Short" : "Video"}
              </span>
              {video.playlists.map((p) => (
                <Link
                  key={p}
                  to={`/videos?playlist=${encodeURIComponent(p)}`}
                  className="px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-label text-[10px] uppercase tracking-widest no-underline hover:text-secondary hover:border-secondary/40"
                >
                  {p}
                </Link>
              ))}
            </div>
            <h1 className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-0 leading-tight">{video.title}</h1>
            {facts.length > 0 && (
              <p className="font-body text-xs text-stone-400 dark:text-stone-500 mb-0">{facts.join(" · ")}</p>
            )}
            {video.description && <Description text={video.description} />}
            <TagLinks tags={video.tags} />
          </div>
          <RelatedContent type="video" id={id} />
        </article>
      </div>
    </PageShell>
  );
};

export default VideoPost;
