import {
  UNDATED, filterVideos, videoFacets,
} from "./videoFilters";

const videos = [
  {
    id: 1,
    title: "Sinhagad at dawn",
    date: "2026-10-21",
    kind: "video",
    durationSeconds: 245,
    viewCount: 1520,
    tags: ["treks"],
    playlists: ["Forts"],
    ytTags: ["sahyadri"],
    description: "",
  },
  {
    id: 2,
    title: "Ten km in the rain",
    date: "2026-08-02",
    kind: "short",
    durationSeconds: 42,
    viewCount: 9000,
    tags: ["Running"],
    playlists: [],
    ytTags: [],
    description: "Monsoon run",
  },
  {
    id: 3,
    title: "Rajgad traverse",
    date: "2025-01-15",
    kind: "video",
    durationSeconds: 1210,
    viewCount: null,
    tags: ["treks", "running"],
    playlists: ["Forts"],
    ytTags: [],
    description: "",
  },
  {
    id: 4,
    title: "Untitled clip",
    date: null,
    kind: "short",
    durationSeconds: null,
    viewCount: 12,
    tags: [],
    playlists: [],
    ytTags: [],
    description: "",
  },
];
const ids = (rows) => rows.map((v) => v.id);

describe("videoFilters", () => {
  it("sorts newest first by default and sinks undated videos", () => {
    expect(ids(filterVideos(videos))).toEqual([1, 2, 3, 4]);
    expect(ids(filterVideos(videos, { sort: "oldest" }))).toEqual([3, 2, 1, 4]);
  });

  it("sorts by views and duration with unknown numbers last", () => {
    expect(ids(filterVideos(videos, { sort: "views" }))).toEqual([2, 1, 4, 3]);
    expect(ids(filterVideos(videos, { sort: "longest" }))).toEqual([3, 1, 2, 4]);
    expect(ids(filterVideos(videos, { sort: "shortest" }))).toEqual([2, 1, 3, 4]);
  });

  it("splits Shorts from videos", () => {
    expect(ids(filterVideos(videos, { type: "short" }))).toEqual([2, 4]);
    expect(ids(filterVideos(videos, { type: "video" }))).toEqual([1, 3]);
  });

  it("combines tags with OR, case-insensitively, and narrows by year and playlist", () => {
    expect(ids(filterVideos(videos, { tags: ["running"] }))).toEqual([2, 3]);
    expect(ids(filterVideos(videos, { tags: ["TREKS", "running"] }))).toEqual([1, 2, 3]);
    expect(ids(filterVideos(videos, { year: "2026" }))).toEqual([1, 2]);
    expect(ids(filterVideos(videos, { year: UNDATED }))).toEqual([4]);
    expect(ids(filterVideos(videos, { playlist: "Forts", year: "2025" }))).toEqual([3]);
  });

  it("searches titles, descriptions, tags, YouTube keywords and playlists", () => {
    expect(ids(filterVideos(videos, { q: "monsoon" }))).toEqual([2]);
    expect(ids(filterVideos(videos, { q: "sahyadri" }))).toEqual([1]);
    expect(ids(filterVideos(videos, { q: "forts" }))).toEqual([1, 3]);
    expect(ids(filterVideos(videos, { q: "rain", type: "video" }))).toEqual([]);
  });

  it("builds facets with counts per type, undated last and tags merged by case", () => {
    const f = videoFacets(videos);
    expect(f.types).toEqual({ "": 4, video: 2, short: 2 });
    expect(f.years.map((y) => y.name)).toEqual(["2026", "2025", UNDATED]);
    expect(f.tags).toEqual([{ name: "running", count: 2 }, { name: "treks", count: 2 }]);
    expect(f.playlists).toEqual([{ name: "Forts", count: 2 }]);
  });
});
