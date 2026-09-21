import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Main from "../layouts/Main";
import { supabase } from "../lib/supabaseClient";

// Path segments that say nothing about what the visitor wanted.
const NOISE = new Set(["www", "index", "html", "php", "amp", "page", "en"]);

/**
 * The words a wrong URL was actually reaching for.
 *
 * "/treks/raigad-fort-2019" → "treks raigad fort". Numbers go because a stale
 * id or a year matches nothing useful in the index, and one-character
 * fragments go because they match everything.
 */
export function pathToQuery(pathname) {
  // Decoded whole and first: tag paths are URI-encoded rather than slugified
  // (Marathi names), so splitting before decoding shreds every escape.
  let decoded = String(pathname || "");
  try {
    decoded = decodeURIComponent(decoded);
  } catch (_) { /* a malformed escape stays as typed */ }

  return decoded
    .split(/[/\-_.+~]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 1 && !/^\d+$/.test(part) && !NOISE.has(part))
    .filter((part, i, all) => all.indexOf(part) === i)
    .join(" ");
}

/**
 * The three nearest real pages, found with no model call at all.
 *
 * hybrid_search's query_embedding is nullable — the semantic half then matches
 * nothing and it degrades to a pure keyword search (0009, and the relevance
 * floors from 0023). content_chunks is public-read, so this is one anon RPC
 * straight from the browser: no endpoint, no key, no quota, nothing to switch
 * off. A 404 that spends a model call would be the worst possible page to
 * spend one on.
 */
const PageNotFound = () => {
  const { pathname } = useLocation();
  const [hits, setHits] = useState([]);

  useEffect(() => {
    let live = true;
    const query = pathToQuery(pathname);
    if (!query) return undefined;

    supabase
      .rpc("hybrid_search", { query_text: query, query_embedding: null, match_count: 6 })
      .then(({ data }) => {
        if (!live) return;
        const seen = new Set();
        setHits((data || [])
          // Every indexed url is a site path (askConfig's entityUrl); anything
          // else would need an <a>, and there is nothing here worth that.
          .filter((row) => String(row.url || "").startsWith("/"))
          .filter((row) => !seen.has(row.url) && seen.add(row.url))
          .slice(0, 3));
      })
      // Nothing to say if the lookup fails — the page still works as it did.
      .catch(() => {});

    return () => { live = false; };
  }, [pathname]);

  return (
    <Main
      title="404 Not Found"
      description="The page you are looking for cannot be found. Return to the homepage."
    >
      <article className="flex flex-col gap-8 w-full">
        <header>
          <span className="font-label text-xs uppercase tracking-[0.2em] text-secondary font-bold mb-4 block">Error 404</span>
          <h1 className="font-headline text-5xl md:text-7xl font-black text-stone-900 dark:text-stone-100 leading-tight mb-6">
            Page Not Found.
          </h1>
          <p className="font-body text-lg text-stone-500 dark:text-stone-400 max-w-xl leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </header>

        {hits.length > 0 && (
          <section>
            <h2 className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-bold mb-3">
              You might have meant
            </h2>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              {hits.map((hit) => (
                <li key={hit.url} className="m-0">
                  <Link
                    to={hit.url}
                    className="font-body text-base text-stone-800 dark:text-stone-200 hover:text-secondary no-underline"
                  >
                    {hit.title || hit.url}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div>
          <Link
            to="/"
            className="inline-block px-8 py-3 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-stone-900 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-950 transition-all rounded-sm no-underline"
          >
            Return Home
          </Link>
        </div>
      </article>
    </Main>
  );
};

export default PageNotFound;
