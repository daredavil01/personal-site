import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import { NAV_GROUPS } from "./navigation";
import CommandPalette from "./CommandPalette";
import Button, { IconButton } from "./ui/Button";
import {
  Command, ExternalLink, LogOut, Menu, Moon, Search, Sun, X,
} from "./ui/icons";
import { faintText, hairline, mutedText, surface } from "./ui/tokens";

const navLinkClass = ({ isActive }) => [
  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
  isActive
    ? "bg-admin-50 dark:bg-admin-950/60 text-admin-700 dark:text-admin-300"
    : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100",
].join(" ");

const Sidebar = ({ session, onNavigate, onOpenPalette }) => {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center justify-between gap-2 px-4 h-14 border-b ${hairline} shrink-0`}>
        <span className="font-semibold tracking-tight text-stone-900 dark:text-stone-50">Admin</span>
        <IconButton icon={X} label="Close menu" size="sm" className="md:hidden" onClick={onNavigate} />
      </div>

      <div className={`px-3 py-3 border-b ${hairline}`}>
        <button
          type="button"
          onClick={onOpenPalette}
          className={`w-full flex items-center gap-2 px-2.5 h-9 rounded-md border border-stone-300 dark:border-stone-700 ${surface} text-[13px] ${mutedText} hover:border-admin-400 dark:hover:border-admin-600 transition-colors`}
        >
          <Search size={14} aria-hidden="true" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className={`hidden sm:inline-flex items-center gap-0.5 text-[10px] ${faintText}`}>
            <Command size={10} aria-hidden="true" />K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-0.5">
            {group.label && (
              <p className={`px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide ${faintText} mb-0`}>
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass} onClick={onNavigate}>
                <item.icon size={15} className="shrink-0" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={`px-3 py-3 border-t ${hairline} flex flex-col gap-2 shrink-0`}>
        <p className={`px-1 text-xs ${mutedText} truncate mb-0`} title={session.user?.email}>
          {session.user?.email}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            icon={dark ? Sun : Moon}
            onClick={toggleTheme}
            className="flex-1 justify-start"
          >
            {dark ? "Light" : "Dark"}
          </Button>
          <IconButton
            icon={LogOut}
            label="Sign out"
            size="sm"
            variant="dangerGhost"
            onClick={() => supabase.auth.signOut()}
          />
        </div>
        <a
          href="/"
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] ${mutedText} hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors no-underline`}
        >
          <ExternalLink size={14} aria-hidden="true" />
          View site
        </a>
      </div>
    </div>
  );
};

const AdminLayout = ({ session }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();

  // The drawer is a mobile overlay: never leave it covering the page a
  // navigation just moved to.
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen flex bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-body">
      {/* Desktop rail */}
      <aside className={`hidden md:flex w-60 shrink-0 flex-col border-r ${hairline} ${surface} h-screen sticky top-0`}>
        <Sidebar session={session} onOpenPalette={() => setPaletteOpen(true)} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[150] flex">
          <div
            role="presentation"
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className={`relative w-72 max-w-[85vw] ${surface} border-r ${hairline} shadow-xl`}>
            <Sidebar
              session={session}
              onNavigate={() => setDrawerOpen(false)}
              onOpenPalette={() => { setDrawerOpen(false); setPaletteOpen(true); }}
            />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className={`md:hidden sticky top-0 z-40 flex items-center gap-2 px-3 h-14 border-b ${hairline} ${surface}`}>
          <IconButton icon={Menu} label="Open menu" size="sm" onClick={() => setDrawerOpen(true)} />
          <span className="font-semibold tracking-tight">Admin</span>
          <IconButton
            icon={Search}
            label="Search"
            size="sm"
            className="ml-auto"
            onClick={() => setPaletteOpen(true)}
          />
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};

export default AdminLayout;
