import { useEffect, useState } from "react";

// The live Substack feed (served as JSON by functions/rss-feed.js, cached 30
// minutes at the edge). The homepage reads it twice — the Now strip's latest
// essay and the Latest Writing list — so the request is shared: one fetch per
// page load, whoever asks first.
let feed = null;

const loadFeed = () => {
  if (!feed) {
    feed = fetch("/rss-feed")
      .then((res) => {
        if (!res.ok) throw new Error("Feed request failed");
        return res.json();
      })
      .then((data) => (Array.isArray(data?.items) ? data.items : []))
      .catch((err) => {
        feed = null; // let a later mount try again
        throw err;
      });
  }
  return feed;
};

/** `{ items, status }` — status is "loading", "ready" or "error". */
export default function useLatestPosts() {
  const [state, setState] = useState({ items: [], status: "loading" });

  useEffect(() => {
    let active = true;
    loadFeed()
      .then((items) => { if (active) setState({ items, status: "ready" }); })
      .catch(() => { if (active) setState({ items: [], status: "error" }); });
    return () => { active = false; };
  }, []);

  return state;
}
