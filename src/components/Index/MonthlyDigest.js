import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useBlogs, useTreks, useSports, useBooks,
} from "../../context/ContentContext";
import { getMicroblogMonths, getMicroblogByMonth } from "../../lib/api/microblog";
import { itemMonthKey, monthLabel } from "../../lib/monthDigest";
import NowSectionHeader from "../Now/NowSectionHeader";

const CAP = 6;

const StatTile = ({ value, label, active }) => (
  <div
    className={`text-center p-4 rounded-lg border ${
      active
        ? "bg-secondary/[0.04] border-secondary/20"
        : "bg-stone-50 dark:bg-stone-900 border-stone-100 dark:border-stone-800"
    }`}
  >
    <p
      className={`font-headline text-2xl font-black ${
        active ? "text-secondary" : "text-stone-300 dark:text-stone-700"
      }`}
    >
      {value}
    </p>
    <p className="font-label text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mt-1">
      {label}
    </p>
  </div>
);

const Badge = ({ children }) => (
  <span className="font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded self-center bg-secondary/[0.08] text-secondary shrink-0">
    {children}
  </span>
);

// One content-type section: header + up to CAP linked items + optional "View all".
const DigestSection = ({ icon, label, total, viewAllTo, children }) => (
  <div>
    <NowSectionHeader label={label} icon={icon} />
    <ul className="space-y-3">{children}</ul>
    {total > CAP && (
      <Link
        to={viewAllTo}
        className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-secondary inline-flex items-center gap-2 hover:gap-4 transition-all no-underline mt-3"
      >
        {`View all ${total}`}
        <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
      </Link>
    )}
  </div>
);

const ItemLink = ({ to, title, meta, badges }) => (
  <li className="pl-4 border-l-2 border-secondary/30 hover:border-secondary transition-colors">
    <div className="flex items-start gap-2 flex-wrap">
      <Link
        to={to}
        className="font-body text-sm font-semibold text-stone-800 dark:text-stone-200 hover:text-secondary dark:hover:text-secondary transition-colors no-underline"
      >
        {title}
      </Link>
      {badges}
    </div>
    {meta && (
      <p className="font-body text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed line-clamp-2 mb-0">
        {meta}
      </p>
    )}
  </li>
);

// Auto-aggregated monthly digest: blogs, treks, marathons, and micro-posts for a
// selected month, grouped by each item's content date. See src/lib/monthDigest.js.
const MonthlyDigest = () => {
  const { data: blogsData, loading: blogsLoading } = useBlogs();
  const { data: treksData, loading: treksLoading } = useTreks();
  const { data: sportsData, loading: sportsLoading } = useSports();
  const { data: booksData, loading: booksLoading } = useBooks();

  const [microMonths, setMicroMonths] = useState([]);
  const [micro, setMicro] = useState({ rows: [], count: 0 });
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    let active = true;
    getMicroblogMonths()
      .then((m) => { if (active) setMicroMonths(m); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Union of every month that holds at least one item, newest first.
  const monthKeys = useMemo(() => {
    const set = new Set(microMonths);
    blogsData.forEach((b) => { const k = itemMonthKey(b, "blog"); if (k) set.add(k); });
    treksData.forEach((t) => { const k = itemMonthKey(t, "trek"); if (k) set.add(k); });
    sportsData.forEach((s) => { const k = itemMonthKey(s, "sport"); if (k) set.add(k); });
    // Books have no month-precise date, so they bucket by created_at (fallback).
    booksData.forEach((b) => { const k = itemMonthKey(b, "book"); if (k) set.add(k); });
    return [...set].sort().reverse();
  }, [blogsData, treksData, sportsData, booksData, microMonths]);

  useEffect(() => {
    if (monthKeys.length && !monthKeys.includes(selectedMonth)) {
      setSelectedMonth(monthKeys[0]);
    }
  }, [monthKeys, selectedMonth]);

  useEffect(() => {
    if (!selectedMonth) return undefined;
    let active = true;
    getMicroblogByMonth(selectedMonth, CAP)
      .then((res) => { if (active) setMicro(res); })
      .catch(() => { if (active) setMicro({ rows: [], count: 0 }); });
    return () => { active = false; };
  }, [selectedMonth]);

  const monthBlogs = useMemo(
    () => blogsData.filter((b) => itemMonthKey(b, "blog") === selectedMonth),
    [blogsData, selectedMonth]
  );
  const monthTreks = useMemo(
    () => treksData.filter((t) => itemMonthKey(t, "trek") === selectedMonth),
    [treksData, selectedMonth]
  );
  const monthSports = useMemo(
    () => sportsData.filter((s) => itemMonthKey(s, "sport") === selectedMonth),
    [sportsData, selectedMonth]
  );
  const monthBooks = useMemo(
    () => booksData.filter((b) => itemMonthKey(b, "book") === selectedMonth),
    [booksData, selectedMonth]
  );

  const anyLoading = blogsLoading || treksLoading || sportsLoading || booksLoading;

  if (!monthKeys.length) {
    if (anyLoading) {
      return (
        <div className="h-24 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 animate-pulse" />
      );
    }
    return null;
  }

  const hasBlogs = monthBlogs.length > 0;
  const hasMicro = micro.rows.length > 0;
  const hasTreks = monthTreks.length > 0;
  const hasSports = monthSports.length > 0;
  const hasBooks = monthBooks.length > 0;
  const anySection = hasBlogs || hasMicro || hasTreks || hasSports || hasBooks;

  return (
    <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 flex flex-col gap-6">
      {/* Header: month heading + dropdown picker */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="font-headline text-2xl md:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight mb-0">
          {monthLabel(selectedMonth)}
        </h3>
        <select
          aria-label="Select month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-11 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 font-label text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300 hover:border-secondary focus:border-secondary outline-none cursor-pointer transition-colors"
        >
          {monthKeys.map((key) => (
            <option key={key} value={key}>{monthLabel(key)}</option>
          ))}
        </select>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile value={monthBlogs.length} label="Blogs" active={hasBlogs} />
        <StatTile value={micro.count} label="Micro Posts" active={micro.count > 0} />
        <StatTile value={monthTreks.length} label="Treks" active={hasTreks} />
        <StatTile value={monthSports.length} label="Marathons" active={hasSports} />
        <StatTile value={monthBooks.length} label="Books" active={hasBooks} />
      </div>

      {/* Per-type sections. Row 1: Blogs + Micro Posts. Row 2: Treks + Marathons.
          Row 3: Books. Each row is its own 2-col grid so the pairing holds even
          when one side is empty for the month. */}
      {anySection ? (
        <div className="flex flex-col gap-6">
          {(hasBlogs || hasMicro) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {hasBlogs && (
                <DigestSection
                  icon="article"
                  label="Blogs Published"
                  total={monthBlogs.length}
                  viewAllTo="/100-days-to-offload"
                >
                  {monthBlogs.slice(0, CAP).map((b) => (
                    <ItemLink
                      key={b.id}
                      to={`/100-days-to-offload/${b.id}`}
                      title={b.blog_title}
                      meta={b.blog_description}
                      badges={b.blog_platform && <Badge>{b.blog_platform}</Badge>}
                    />
                  ))}
                </DigestSection>
              )}

              {hasMicro && (
                <DigestSection
                  icon="forum"
                  label="Micro Posts"
                  total={micro.count}
                  viewAllTo="/micro-blog"
                >
                  {micro.rows.map((p) => (
                    <ItemLink
                      key={p.id}
                      to={`/micro-blog/${p.id}`}
                      title={p.title || p.text || "Untitled"}
                      meta={p.title ? p.text : ""}
                      badges={p.postType && <Badge>{p.postType}</Badge>}
                    />
                  ))}
                </DigestSection>
              )}
            </div>
          )}

          {(hasTreks || hasSports) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {hasTreks && (
                <DigestSection
                  icon="landscape"
                  label="Treks"
                  total={monthTreks.length}
                  viewAllTo="/treks"
                >
                  {monthTreks.slice(0, CAP).map((t) => (
                    <ItemLink
                      key={t.id}
                      to={`/treks/${t.id}`}
                      title={t.fort_name}
                      badges={(
                        <>
                          {t.endurance_level && <Badge>{t.endurance_level}</Badge>}
                          {t.trek_time && <Badge>{t.trek_time}</Badge>}
                        </>
                      )}
                    />
                  ))}
                </DigestSection>
              )}

              {hasSports && (
                <DigestSection
                  icon="fitness_center"
                  label="Marathons"
                  total={monthSports.length}
                  viewAllTo="/sports"
                >
                  {monthSports.slice(0, CAP).map((s) => (
                    <ItemLink
                      key={s.id}
                      to={`/sports/${s.id}`}
                      title={s.title}
                      meta={s.place}
                      badges={(
                        <>
                          {s.distance && <Badge>{s.distance}</Badge>}
                          {s.time && <Badge>{s.time}</Badge>}
                        </>
                      )}
                    />
                  ))}
                </DigestSection>
              )}
            </div>
          )}

          {hasBooks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <DigestSection
                icon="auto_stories"
                label="Books Read"
                total={monthBooks.length}
                viewAllTo="/books"
              >
                {monthBooks.slice(0, CAP).map((b) => (
                  <ItemLink
                    key={b.id}
                    to={`/books/${b.id}`}
                    title={b.title}
                    meta={b.author ? `by ${b.author}` : ""}
                    badges={b.language && <Badge>{b.language}</Badge>}
                  />
                ))}
              </DigestSection>
            </div>
          )}
        </div>
      ) : (
        <p className="font-body text-sm text-stone-400 dark:text-stone-500 text-center py-4 mb-0">
          Nothing recorded for this month.
        </p>
      )}
    </div>
  );
};

export default MonthlyDigest;
