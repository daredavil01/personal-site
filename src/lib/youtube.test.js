import {
  bestThumbnail, effectiveKind, formatCount, formatDuration, isoDuration, isPublishedVideo,
  isShortCandidate, istDate, parseIsoDuration, shortsProbe, toVideoRow, videoIdFromUrl, watchUrl,
} from "./youtube";

// A trimmed videos.list item, as the Data API returns it.
const ITEM = {
  id: "dQw4w9WgXcQ",
  snippet: {
    publishedAt: "2026-10-20T19:45:00Z",
    title: "  Sinhagad at dawn  ",
    description: "A morning climb.\n\n#treks",
    thumbnails: {
      default: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg" },
      high: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" },
      maxres: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    },
    tags: ["sinhagad", "trek"],
    liveBroadcastContent: "none",
  },
  contentDetails: { duration: "PT4M5S" },
  statistics: { viewCount: "1520", likeCount: "88", commentCount: "4" },
  status: { privacyStatus: "public" },
};

describe("youtube", () => {
  it("finds the id in every link shape a person pastes", () => {
    const id = "dQw4w9WgXcQ";
    [
      id,
      `https://www.youtube.com/watch?v=${id}&t=42s`,
      `youtube.com/watch?v=${id}`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}?si=abc`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube-nocookie.com/embed/${id}`,
      `https://www.youtube.com/live/${id}`,
      `https://music.youtube.com/watch?v=${id}`,
    ].forEach((link) => expect(videoIdFromUrl(link)).toBe(id));
  });

  it("refuses links that are not a YouTube video", () => {
    ["", "hello", "https://vimeo.com/123", "https://www.youtube.com/@sankettambare7474",
      "https://www.youtube.com/watch?v=short", "https://evil.com/watch?v=dQw4w9WgXcQ"]
      .forEach((link) => expect(videoIdFromUrl(link)).toBeNull());
  });

  it("parses ISO 8601 durations", () => {
    expect(parseIsoDuration("PT4M5S")).toBe(245);
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT59S")).toBe(59);
    expect(parseIsoDuration("P1DT1S")).toBe(86401);
    expect(parseIsoDuration("P0D")).toBe(0);
    expect(parseIsoDuration("PT")).toBeNull();
    expect(parseIsoDuration("4:05")).toBeNull();
    expect(parseIsoDuration(undefined)).toBeNull();
  });

  it("writes durations back for JSON-LD and the thumbnail clock", () => {
    expect(isoDuration(245)).toBe("PT4M5S");
    expect(isoDuration(3600)).toBe("PT1H");
    expect(isoDuration(0)).toBe("PT0S");
    expect(isoDuration(null)).toBeNull();
    expect(formatDuration(245)).toBe("4:05");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(0)).toBe("");
  });

  it("formats counts compactly", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1520)).toBe("1.5K");
    expect(formatCount(15300)).toBe("15K");
    expect(formatCount(1200000)).toBe("1.2M");
    expect(formatCount(null)).toBe("");
  });

  it("dates a publish instant in IST", () => {
    // 19:45 UTC is 01:15 the next morning in India.
    expect(istDate("2026-10-20T19:45:00Z")).toBe("2026-10-21");
    expect(istDate("2026-10-20T10:00:00Z")).toBe("2026-10-20");
    expect(istDate("not a date")).toBeNull();
  });

  it("nominates Shorts by duration and reads the /shorts probe", () => {
    expect(isShortCandidate(59)).toBe(true);
    expect(isShortCandidate(180)).toBe(true);
    expect(isShortCandidate(181)).toBe(false);
    expect(isShortCandidate(0)).toBe(false);
    expect(isShortCandidate(null)).toBe(false);
    expect(shortsProbe(200)).toBe("short");
    expect(shortsProbe(303, "https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("video");
    // A consent page or an error is no verdict.
    expect(shortsProbe(302, "https://consent.youtube.com/m?continue=…")).toBeNull();
    expect(shortsProbe(429)).toBeNull();
  });

  it("picks the largest JPEG thumbnail, falling back to hqdefault", () => {
    expect(bestThumbnail(ITEM.snippet.thumbnails, ITEM.id)).toMatch(/maxresdefault\.jpg$/);
    expect(bestThumbnail({}, "abcdefghijk")).toBe("https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg");
  });

  it("keeps only finished public uploads", () => {
    expect(isPublishedVideo(ITEM)).toBe(true);
    expect(isPublishedVideo({ ...ITEM, status: { privacyStatus: "unlisted" } })).toBe(false);
    expect(isPublishedVideo({ ...ITEM, snippet: { ...ITEM.snippet, liveBroadcastContent: "upcoming" } })).toBe(false);
  });

  it("maps an API item to the sync-owned columns only", () => {
    const row = toVideoRow(ITEM, { kind: "video", now: "2026-10-23T00:00:00Z" });
    expect(row).toEqual({
      youtube_id: "dQw4w9WgXcQ",
      title: "Sinhagad at dawn",
      description: "A morning climb.\n\n#treks",
      date: "2026-10-21",
      published_at: "2026-10-20T19:45:00Z",
      duration_seconds: 245,
      kind: "video",
      view_count: 1520,
      like_count: 88,
      comment_count: 4,
      thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      yt_tags: ["sinhagad", "trek"],
      source: "sync",
      synced_at: "2026-10-23T00:00:00Z",
    });
    // The site's own columns are never in a synced row, so an upsert cannot undo them.
    ["kind_override", "visible", "tags", "playlists"].forEach((k) => expect(row).not.toHaveProperty(k));
  });

  it("treats a hidden like count as unknown, not zero", () => {
    const row = toVideoRow({ ...ITEM, statistics: { viewCount: "10" } });
    expect(row.like_count).toBeNull();
    expect(row.view_count).toBe(10);
  });

  it("links a Short to /shorts and lets the override win", () => {
    expect(effectiveKind({ kind: "video", kind_override: "short" })).toBe("short");
    expect(watchUrl({ youtube_id: "dQw4w9WgXcQ", kind: "short" })).toBe("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(watchUrl({ youtubeId: "dQw4w9WgXcQ", kind: "video" })).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(watchUrl({})).toBeNull();
  });
});
