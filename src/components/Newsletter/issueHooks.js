import { useMemo } from "react";
import {
  useBlogs, useBooks, useNowMonths, useSports, useTreks,
} from "../../context/ContentContext";
import { firstSlideImage } from "../../lib/og/paths";

// Where the newsletter sends readers who want the emails. Same address
// LatestPosts reads its feed from.
export const SUBSTACK_URL = "https://sankettambare.substack.com";

const DETAIL_PATHS = {
  sport: (id) => `/sports/${id}`,
  trek: (id) => `/treks/${id}`,
  book: (id) => `/books/${id}`,
  blog: (id) => `/100-days-to-offload/${id}`,
  microblog: (id) => `/micro-blog/${id}`,
};

/** The on-site page for an archive ref, or null. */
export const detailPath = (ref) => (ref && DETAIL_PATHS[ref.type] ? DETAIL_PATHS[ref.type](ref.id) : null);

/**
 * Every issue the viewer can read, newest first. RLS decides what that is: the
 * public gets published months plus the current one, the owner gets drafts too.
 */
export function useIssues() {
  const { data, loading, error } = useNowMonths();
  return useMemo(() => {
    const issues = [...(data || [])].filter((m) => m.slug).sort((a, b) => b.slug.localeCompare(a.slug));
    return {
      issues, published: issues.filter((i) => i.publishedAt), loading, error,
    };
  }, [data, loading, error]);
}

/**
 * Looks refs up in the cached content lists, so an issue can share an item as
 * an image and find a cover photo without fetching anything new. Micro-posts
 * are not cached (1,600+ rows); callers fetch those by id.
 */
export function useArchiveLookup() {
  const { data: sports } = useSports();
  const { data: treks } = useTreks();
  const { data: books } = useBooks();
  const { data: blogs } = useBlogs();
  return useMemo(() => {
    const lists = {
      sport: sports, trek: treks, book: books, blog: blogs,
    };
    return (ref) => (ref && lists[ref.type]
      ? lists[ref.type].find((r) => String(r.id) === String(ref.id)) || null
      : null);
  }, [sports, treks, books, blogs]);
}

/** The issue's cover: a race photo, else a trek photo, else a photo post. */
export function heroPhoto(model, find) {
  if (!model) return null;
  const of = (key) => model.sections.find((s) => s.key === key)?.items || [];
  const fromRefs = [...of("running"), ...of("events")]
    .map((item) => find(item.ref))
    .map((row) => row && firstSlideImage(row.slideImages))
    .find(Boolean);
  return fromRefs || of("micro").map((p) => p.imageUrl).find(Boolean) || null;
}
