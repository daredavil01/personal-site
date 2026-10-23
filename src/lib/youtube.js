// YouTube helpers shared by the sync endpoint (functions/api/youtube-sync.js),
// the admin pages and the public /videos pages.
//
// Lives in src/ rather than functions/ because Pages turns every file under
// functions/ into a route. Dependency-free by contract: esbuild bundles it into
// the Worker, and the Worker has 10 ms of CPU per request.

export const YOUTUBE_CHANNEL = {
  handle: "@sankettambare7474",
  url: "https://www.youtube.com/@sankettambare7474",
};

// YouTube raised the Shorts cap from 60 s to 3 minutes in October 2024. The
// Data API has no "is a Short" field, so duration only nominates a candidate;
// the sync confirms it against /shorts/<id> (see shortsProbe).
export const SHORT_MAX_SECONDS = 180;

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** True for an 11-character YouTube video id. */
export const isVideoId = (value) => ID_PATTERN.test(String(value || ""));

/**
 * The video id in anything a person might paste: a bare id, a watch, youtu.be,
 * shorts, embed or live link, with or without www./m./music. and query strings.
 * Returns null when there is none.
 */
export function videoIdFromUrl(input) {
  const raw = String(input || "").trim();
  if (isVideoId(raw)) return raw;
  let url;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch (_) {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1];
    return isVideoId(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  const v = url.searchParams.get("v");
  if (isVideoId(v)) return v;
  const [, first, second] = url.pathname.split("/");
  if (["shorts", "embed", "live", "v"].includes(first) && isVideoId(second)) return second;
  return null;
}

/** ISO 8601 duration ("PT1H2M3S", "P1DT2H") → seconds, or null when unparseable. */
export function parseIsoDuration(value) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(String(value || ""));
  if (!m || value === "P" || value === "PT") return null;
  const [, d = 0, h = 0, min = 0, s = 0] = m;
  return Math.round(Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(s));
}

/** Seconds → ISO 8601 duration for JSON-LD ("PT4M5S"). Null for a missing value. */
export function isoDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s || (!h && !m) ? `${s}S` : ""}`;
}

/** Seconds → the clock label on a thumbnail ("4:05", "1:02:03"). Empty when unknown. */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 1234567 → "1.2M", 15300 → "15.3K", 999 → "999". Empty when unknown. */
export function formatCount(n) {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** A publish instant → its calendar day in IST ("YYYY-MM-DD"), the site's dating rule. */
export function istDate(iso) {
  const t = Date.parse(iso || "");
  if (Number.isNaN(t)) return null;
  return new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whether a duration makes a video a Shorts candidate. */
export const isShortCandidate = (seconds) => Number.isFinite(seconds) && seconds > 0 && seconds <= SHORT_MAX_SECONDS;

/**
 * The verdict of a `HEAD https://www.youtube.com/shorts/<id>` sent with
 * redirect: "manual": a Short answers 200, any other video redirects to its
 * /watch page. A redirect anywhere else (a consent page) or an error is no
 * verdict — null — and the caller falls back to the duration.
 */
export function shortsProbe(status, location = "") {
  if (status === 200) return "short";
  if (status >= 300 && status < 400 && /\/watch\b/.test(location || "")) return "video";
  return null;
}

/** The best JPEG thumbnail the API lists. Never the WebP variants: resvg cannot draw them. */
export function bestThumbnail(thumbnails, id) {
  const t = thumbnails || {};
  const pick = t.maxres || t.standard || t.high || t.medium || t.default;
  if (pick?.url) return pick.url;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** Whether an API item is a finished, public upload (not private, unlisted, live or upcoming). */
export function isPublishedVideo(item) {
  return item?.status?.privacyStatus === "public"
    && (item?.snippet?.liveBroadcastContent || "none") === "none";
}

const count = (v) => {
  const n = Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? null : n;
};

/**
 * One videos.list item → the sync-owned columns of a `videos` row. The
 * site-owned columns (kind_override, visible, tags) are never in here, so an
 * upsert of this row cannot undo an /admin edit.
 */
export function toVideoRow(item, { kind = "video", source = "sync", now = new Date().toISOString() } = {}) {
  const snippet = item?.snippet || {};
  const id = item?.id;
  return {
    youtube_id: id,
    title: (snippet.title || "").trim() || id,
    description: (snippet.description || "").trim() || null,
    date: istDate(snippet.publishedAt),
    published_at: snippet.publishedAt || null,
    duration_seconds: parseIsoDuration(item?.contentDetails?.duration),
    kind,
    view_count: count(item?.statistics?.viewCount),
    like_count: count(item?.statistics?.likeCount),
    comment_count: count(item?.statistics?.commentCount),
    thumbnail_url: bestThumbnail(snippet.thumbnails, id),
    yt_tags: Array.isArray(snippet.tags) ? snippet.tags.slice(0, 30) : [],
    source,
    synced_at: now,
  };
}

/** The kind a row is shown as: the /admin override, else the detected one. */
export const effectiveKind = (row) => row?.kind_override || row?.kind || "video";

/** The public YouTube URL for a row: /shorts/ for a Short, /watch otherwise. */
export function watchUrl(row) {
  const id = row?.youtube_id || row?.youtubeId;
  if (!id) return null;
  return effectiveKind(row) === "short"
    ? `https://www.youtube.com/shorts/${id}`
    : `https://www.youtube.com/watch?v=${id}`;
}

/** The privacy-enhanced embed URL (no cookies until the visitor presses play). */
export const embedUrl = (id) => (id ? `https://www.youtube-nocookie.com/embed/${id}` : null);
