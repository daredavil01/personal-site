import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, rendered explicitly so the widget only loads when
// /admin actually has verification switched on.
//
// A token is single-use and expires after ~5 minutes, so the widget is reset
// after every question rather than solved once per session.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TOKEN_WAIT_MS = 10000;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function useTurnstile(siteKey, required) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  // The ref is the source of truth for take(); state only drives re-renders.
  const tokenRef = useRef(null);
  const waitersRef = useRef([]);
  const [token, setToken] = useState(null);

  const deliver = useCallback((next) => {
    tokenRef.current = next;
    setToken(next);
    if (next) waitersRef.current.splice(0).forEach((wake) => wake());
  }, []);

  useEffect(() => {
    if (!required || !siteKey || !containerRef.current) return undefined;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: deliver,
          "expired-callback": () => deliver(null),
          "error-callback": () => deliver(null),
          appearance: "interaction-only",
        });
      })
      .catch(() => deliver(null));

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, required, deliver]);

  // Throws away the current token and asks the widget to solve again.
  const refresh = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  // Resolves with a fresh single-use token, waiting for the widget if it has
  // not produced one yet (a suggestion chip tapped the moment the panel opens).
  // Resolves null on timeout — script blocked, or a challenge left unsolved.
  const take = useCallback(() => {
    const burn = () => {
      const used = tokenRef.current;
      refresh();
      return used;
    };
    if (tokenRef.current) return Promise.resolve(burn());
    return new Promise((resolve) => {
      let timer;
      const wake = () => {
        clearTimeout(timer);
        resolve(burn());
      };
      timer = setTimeout(() => {
        waitersRef.current = waitersRef.current.filter((w) => w !== wake);
        resolve(null);
      }, TOKEN_WAIT_MS);
      waitersRef.current.push(wake);
    });
  }, [refresh]);

  return { containerRef, token, take, refresh };
}
