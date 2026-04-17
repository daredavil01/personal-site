import React, { useState } from 'react';

// SHA-256 hash of the admin password. Change the hash to set a new password.
// To generate: open browser console → crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpassword'))
//              → Array.from(new Uint8Array(result)).map(b=>b.toString(16).padStart(2,'0')).join('')
// Default password: admin123
const ADMIN_HASH = 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae';

const hashPassword = async (password) => {
  const encoded = new TextEncoder().encode(password);
  const buffer = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const AuthGate = ({ onAuth }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const hash = await hashPassword(password);
      if (hash === ADMIN_HASH) {
        localStorage.setItem('admin_authenticated', 'true');
        onAuth();
      } else {
        setError('Incorrect password.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm p-8">
        <h1 className="font-headline text-2xl text-stone-900 dark:text-stone-100 mb-1">Admin</h1>
        <p className="font-body text-sm text-stone-500 dark:text-stone-400 mb-6">
          Enter your password to continue.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded px-3 py-2 font-body text-sm text-stone-900 dark:text-stone-100 focus:border-secondary focus:outline-none transition-colors"
          />
          {error && (
            <p className="text-sm text-red-400 font-body">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="bg-secondary text-white font-label text-sm px-4 py-2 rounded-lg hover:bg-secondary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Checking…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthGate;
