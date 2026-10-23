import { supabase } from "../supabaseClient";
import createResource from "./_crud";
import { videoIdFromUrl, watchUrl } from "../youtube";

// The YouTube channel's uploads (0035_videos.sql). Rows arrive from the
// owner-only sync (/admin/videos/sync); the /admin form edits the site-owned
// columns and can add one video by hand.
//
// The form round-trips the synced columns it shows (title, description, date,
// duration) and leaves the rest — counts, thumbnail, playlists — untouched, so
// saving a tag change never blanks a view count.
const videos = createResource({
  table: "videos",
  order: [
    { column: "date", ascending: false, nullsFirst: false },
    { column: "id", ascending: false },
  ],
  tagType: "video",
  fromRow: (r) => ({
    id: r.id,
    youtubeId: r.youtube_id,
    url: watchUrl(r),
    title: r.title,
    description: r.description ?? "",
    date: r.date,
    publishedAt: r.published_at,
    durationSeconds: r.duration_seconds,
    kind: r.kind_override || r.kind || "video",
    detectedKind: r.kind,
    kindOverride: r.kind_override || "",
    viewCount: r.view_count,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    thumbnail: r.thumbnail_url,
    playlists: r.playlists ?? [],
    ytTags: r.yt_tags ?? [],
    visible: r.visible !== false,
    source: r.source,
    syncedAt: r.synced_at,
    created_at: r.created_at,
    tags: r.tag_names ?? [],
  }),
  toRow: (v) => {
    const id = videoIdFromUrl(v.url) || v.youtubeId;
    if (!id) throw new Error("That is not a YouTube video link.");
    const seconds = v.durationSeconds === "" || v.durationSeconds == null
      ? null : Number(v.durationSeconds);
    return {
      youtube_id: id,
      title: v.title.trim(),
      description: v.description || null,
      // A real date column rejects "" — the empty form value.
      date: v.date || null,
      duration_seconds: Number.isFinite(seconds) ? seconds : null,
      kind_override: v.kindOverride || null,
      visible: v.visible !== false,
      thumbnail_url: v.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  },
});

export const getVideos = videos.list;
export default videos;

/** Shows or hides one video without touching anything else on the row. */
export async function setVideoVisible(id, visible) {
  const { error } = await supabase.from("videos").update({ visible }).eq("id", id);
  if (error) throw error;
}
