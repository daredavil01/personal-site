import React from "react";
import useSession from "./useSession";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

const Centered = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center p-6 text-center text-stone-500 dark:text-stone-400">
    {children}
  </div>
);

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
  if (session === undefined) return <Centered>Loading…</Centered>;
  if (!session) return <Login />;
  return <Dashboard session={session} />;
};

export default AdminApp;
