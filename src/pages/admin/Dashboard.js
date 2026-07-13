import React from "react";
import { useSearchParams } from "react-router-dom";
import resources from "./resources";
import ResourceManager from "./ResourceManager";
import NowMetaEditor from "./NowMetaEditor";
import MicroblogManager from "./MicroblogManager";
import FloatingToggle from "../../components/Template/FloatingToggle";
import { supabase } from "../../lib/supabaseClient";

const NOW_META_KEY = "__nowmeta";
const MICROBLOG_KEY = "__microblog";

const ALL_KEYS = new Set([...resources.map((r) => r.key), MICROBLOG_KEY, NOW_META_KEY]);

const Dashboard = ({ session }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get("tab");
  const activeKey = ALL_KEYS.has(paramTab) ? paramTab : resources[0].key;
  const active = resources.find((r) => r.key === activeKey);

  const renderPanel = () => {
    if (activeKey === NOW_META_KEY) return <NowMetaEditor />;
    if (activeKey === MICROBLOG_KEY) return <MicroblogManager />;
    return <ResourceManager key={active.key} resource={active} />;
  };

  const navBtn = (key, label) => (
    <button
      key={key}
      type="button"
      onClick={() => setSearchParams({ tab: key })}
      className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeKey === key
          ? "bg-secondary text-white"
          : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-stone-50 dark:bg-stone-950">
      <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-headline text-xl text-stone-900 dark:text-stone-100">Admin</span>
          <a href="/" className="text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-secondary">Site →</a>
        </div>
        <nav className="flex flex-col gap-1">
          {resources.map((r) => navBtn(r.key, r.label))}
          {navBtn(MICROBLOG_KEY, "Micro Blog")}
          {navBtn(NOW_META_KEY, "Now · Meta")}
        </nav>
        <div className="mt-auto pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2">
          <span className="text-xs text-stone-400 truncate">{session.user?.email}</span>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-left text-xs font-bold uppercase tracking-wider text-red-600"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        {renderPanel()}
      </main>
      {/* Theme toggle only — no map/atlas buttons inside the admin. */}
      <FloatingToggle showAtlasSwitch={false} />
    </div>
  );
};

export default Dashboard;
