import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMicroblogOnThisDay } from "../../lib/api/microblog";

// A near-identical repost says nothing interesting — the point is a different
// thought about the same subject, years apart.
const MAX_SIMILARITY = 0.97;

// ~59% of the Tumblr import is photo posts whose images never made it into the
// repo. Their chunks carry no words, so they sit near-identically close to
// everything and crowd out the real echoes. An echo with nothing to read is
// not an echo.
const isReadable = (echo) => {
  const title = String(echo.title || "").trim();
  return !!title && !/^photo post$/i.test(title);
};

const snippet = (post) => String(post.text || post.title || "")
  .replace(/\s+/g, " ")
  .trim();

/**
 * Today's date in an earlier year, and what it rhymes with.
 *
 * Both halves read vectors and rows that already exist — no model call, no
 * endpoint, no key. Renders nothing at all on a date the archive is silent on:
 * a strip saying "nothing on this day" is worse than no strip.
 */
const OnThisDay = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    getMicroblogOnThisDay()
      .then((d) => { if (live) setData(d); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  if (!data?.seed) return null;

  const { seed } = data;
  const echoes = (data.echoes || [])
    .filter((e) => e.similarity < MAX_SIMILARITY && isReadable(e))
    .slice(0, 3);
  const text = snippet(seed);

  return (
    <section className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-bold mb-0">
          On this day
        </h2>
        <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">{seed.date}</span>
      </div>

      <Link
        to={`/micro-blog/${seed.id}`}
        className="font-body text-sm text-stone-800 dark:text-stone-200 hover:text-secondary no-underline"
      >
        {text || "Photo post"}
      </Link>

      {echoes.length > 0 && (
        <div className="border-t border-stone-100 dark:border-stone-800 pt-3">
          <p className="font-label text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2">
            The last times you wrote about this
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-1">
            {echoes.map((echo) => (
              <li key={echo.id} className="m-0 flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500 shrink-0">{echo.date}</span>
                <Link
                  to={`/micro-blog/${echo.id}`}
                  className="font-body text-sm text-stone-600 dark:text-stone-300 hover:text-secondary no-underline truncate"
                >
                  {echo.title || `Post ${echo.id}`}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default OnThisDay;
