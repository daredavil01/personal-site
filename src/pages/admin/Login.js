import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const inputClass = "w-full px-3 py-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:border-secondary";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50 dark:bg-stone-950">
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl p-8 shadow-sm">
        <h1 className="font-headline text-3xl text-stone-900 dark:text-stone-100 mb-2">Admin</h1>
        <input
          type="email"
          aria-label="Email"
          placeholder="Email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          aria-label="Password"
          placeholder="Password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600 mb-0">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 bg-secondary text-white rounded-lg font-label text-xs uppercase tracking-widest font-bold disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
};

export default Login;
