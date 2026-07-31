import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Button from "./ui/Button";
import Field from "./ui/Field";
import { Input } from "./ui/Input";
import { AlertTriangle } from "./ui/icons";
import { hairline, mutedText, surface } from "./ui/tokens";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-body bg-stone-50 dark:bg-stone-950">
      <div className={`w-full max-w-sm ${surface} border ${hairline} rounded-xl shadow-sm p-6 flex flex-col gap-5`}>
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-admin-600 text-white font-semibold text-sm mb-2">
            ST
          </span>
          <h1 className="font-semibold tracking-tight text-lg text-stone-900 dark:text-stone-50 mb-0">
            Sign in
          </h1>
          <p className={`text-sm ${mutedText} mb-0`}>Content dashboard</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Email" required>
            <Input
              type="email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field label="Password" required>
            <Input
              type="password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </Field>

          {error && (
            <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 mb-0" role="alert">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" loading={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <a href="/" className={`text-xs text-center ${mutedText} hover:text-admin-600 dark:hover:text-admin-400 transition-colors no-underline`}>
          ← Back to the site
        </a>
      </div>
    </div>
  );
};

export default Login;
