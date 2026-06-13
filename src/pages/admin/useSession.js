import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// undefined = still resolving, null = signed out, object = signed in.
export default function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
