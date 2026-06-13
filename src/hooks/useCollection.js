import { useState, useEffect } from "react";

// Generic loader for a Supabase-backed collection. Mirrors the runtime-fetch
// pattern previously used only by the Now page. `fetcher` must be a stable
// reference (e.g. a module-level api function) to avoid re-fetch loops.
export default function useCollection(fetcher) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((err) => {
        if (alive) setError(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fetcher]);

  return { data, error, loading };
}
