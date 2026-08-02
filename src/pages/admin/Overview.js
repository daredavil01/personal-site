import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ADMIN_TABLES, getRecentActivity, getTableCounts } from "../../lib/api/adminStats";
import { nowMonths, MONTH_ORDER } from "../../lib/api/now";
import PageHeader from "./ui/PageHeader";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { Spinner, EmptyState, ErrorState } from "./ui/Feedback";
import {
  Calendar, Footprints, BookOpen, Plus, Rss,
} from "./ui/icons";
import { card, faintText, mutedText } from "./ui/tokens";

const QUICK_CREATE = [
  { to: "/admin/microblog?new=1", label: "Micro-post", icon: Rss },
  { to: "/admin/sports?new=1", label: "Race", icon: Footprints },
  { to: "/admin/books?new=1", label: "Book", icon: BookOpen },
];

const relative = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// How far behind "now" the flagged month is, in whole months.
const monthsBehind = (month, year) => {
  const index = MONTH_ORDER.indexOf(month);
  if (index < 0 || !year) return null;
  const today = new Date();
  return (today.getFullYear() - Number(year)) * 12 + (today.getMonth() - index);
};

const NowStatus = ({ months }) => {
  if (months === null) return <Spinner label="Checking the Now page…" />;
  const current = months.find((m) => m.isCurrent);

  if (!current) {
    return (
      <EmptyState
        icon={Calendar}
        title="No month is flagged as current"
        description="The Now page shows whichever month carries the isCurrent flag."
        action={(
          <Link to="/admin/now/months" className="no-underline">
            <Button size="sm" variant="primary" icon={Plus}>Open Now · Months</Button>
          </Link>
        )}
      />
    );
  }

  const behind = monthsBehind(current.month, current.year);
  const stale = behind !== null && behind >= 1;
  const nextIndex = (MONTH_ORDER.indexOf(current.month) + 1) % 12;
  const nextMonth = MONTH_ORDER[nextIndex];
  const nextYear = nextIndex === 0 ? Number(current.year) + 1 : Number(current.year);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[12rem]">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-1">
          {`${current.month} ${current.year}`}
          {" "}
          <Badge tone={stale ? "warning" : "success"}>
            {stale ? `${behind} month${behind === 1 ? "" : "s"} behind` : "up to date"}
          </Badge>
        </p>
        <p className={`text-xs ${mutedText} mb-0`}>
          {`${Object.keys(current.sections || {}).length} sections filled in`}
        </p>
      </div>
      <Link
        to={`/admin/now/months?start=${encodeURIComponent(`${nextMonth} ${nextYear}`)}`}
        className="no-underline"
      >
        <Button size="sm" variant={stale ? "primary" : "secondary"} icon={Plus}>
          {`Start ${nextMonth}`}
        </Button>
      </Link>
    </div>
  );
};

const Overview = () => {
  const [counts, setCounts] = useState(null);
  const [activity, setActivity] = useState(null);
  const [months, setMonths] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([getTableCounts(), getRecentActivity(8), nowMonths.list()])
      .then(([c, a, m]) => {
        if (!live) return;
        setCounts(c);
        setActivity(a);
        setMonths(m);
      })
      .catch((err) => { if (live) setError(err); });
    return () => { live = false; };
  }, []);

  if (error) return <ErrorState error={error} title="Couldn't load the dashboard" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Everything the site reads from Supabase, at a glance."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_CREATE.map((item) => (
              <Link key={item.to} to={item.to} className="no-underline">
                <Button size="sm" icon={item.icon}>{item.label}</Button>
              </Link>
            ))}
          </div>
        )}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ADMIN_TABLES.map((spec) => (
          <Link
            key={spec.table}
            to={spec.path}
            className={`${card} px-3 py-3 no-underline hover:border-admin-400 dark:hover:border-admin-600 transition-colors`}
          >
            <p className={`text-xs ${mutedText} mb-1`}>{spec.label}</p>
            <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 mb-0 tabular-nums">
              {counts === null ? "—" : (counts[spec.table] ?? "—")}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Now page" description="What /now is currently showing">
          <NowStatus months={months} />
        </Card>

        <Card title="Recently updated" description="Across every table" bodyClassName="p-0">
          {activity === null && <Spinner />}
          {activity && activity.length === 0 && <EmptyState title="No activity yet" />}
          {activity && activity.length > 0 && (
            <ul className="list-none pl-0 mb-0 divide-y divide-stone-100 dark:divide-stone-800">
              {activity.map((entry) => (
                <li key={`${entry.table}-${entry.id}`}>
                  <Link
                    to={entry.path}
                    className="flex items-center gap-3 px-4 py-2.5 no-underline hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-stone-800 dark:text-stone-200 truncate">{entry.title}</span>
                      <span className={`block text-xs ${faintText}`}>{entry.label}</span>
                    </span>
                    <span className={`text-xs ${mutedText} shrink-0 tabular-nums`}>{relative(entry.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Overview;
