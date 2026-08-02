import React, { useEffect } from "react";
import {
  Navigate, Route, Routes, useLocation, useNavigate,
} from "react-router-dom";
import useSession from "./useSession";
import Login from "./Login";
import AdminLayout from "./AdminLayout";
import Overview from "./Overview";
import ResourceRoute from "./ResourceRoute";
import ResumePage from "./ResumePage";
import MicroblogManager from "./MicroblogManager";
import NowMetaEditor from "./NowMetaEditor";
import NowMonthEditor from "./now/NowMonthEditor";
import { ToastProvider } from "./ui/ToastContext";
import { Spinner } from "./ui/Feedback";
import { LEGACY_TAB_PATHS } from "./navigation";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

const Centered = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center p-6 text-center text-sm text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-950 font-body">
    {children}
  </div>
);

// The dashboard navigated by `?tab=<key>` before it had real routes. Old
// bookmarks still carry that param, so translate it once and replace the entry
// rather than 404-ing on the overview.
const useLegacyTabRedirect = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (pathname !== "/admin" && pathname !== "/admin/") return;
    const tab = new URLSearchParams(search).get("tab");
    const target = tab && LEGACY_TAB_PATHS[tab];
    if (target) navigate(target, { replace: true });
  }, [pathname, search, navigate]);
};

const AdminRoutes = ({ session }) => {
  useLegacyTabRedirect();
  return (
    <Routes>
      <Route element={<AdminLayout session={session} />}>
        <Route index element={<Overview />} />
        <Route path="microblog" element={<MicroblogManager />} />
        <Route path="now/months" element={<NowMonthEditor />} />
        <Route path="now/meta" element={<NowMetaEditor />} />
        <Route path="resume" element={<Navigate to="/admin/resume/experience" replace />} />
        <Route path="resume/:section" element={<ResumePage />} />
        {/* Static segments outrank this, so it only catches the schema-driven
            content resources declared in resources.js. */}
        <Route path=":resourceKey" element={<ResourceRoute />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
};

const AdminApp = () => {
  const session = useSession();

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY,
        then reload.
      </Centered>
    );
  }
  if (session === undefined) return <Centered><Spinner label="Checking your session…" /></Centered>;

  return (
    <ToastProvider>
      {session ? <AdminRoutes session={session} /> : <Login />}
    </ToastProvider>
  );
};

export default AdminApp;
