// Jest stand-in for supabaseClient.js, which reads import.meta.env — a Vite
// macro the CommonJS test runtime cannot evaluate. Wired via moduleNameMapper.
// Every query resolves to empty data so components render their empty state.
const makeQuery = () => new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "then") return (resolve) => resolve({ data: [], error: null });
      return () => makeQuery();
    },
  },
);

export const isSupabaseConfigured = false;

export const supabase = {
  from: () => makeQuery(),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  },
};
