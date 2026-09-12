import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, rendered explicitly so the widget only loads when
// /admin actually has verification switched on.
//
// A token is single-use and expires after ~5 minutes, so the widget is reset
// after every question rather than solved once per session.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

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
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (!required || !siteKey || !containerRef.current) return undefined;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: setToken,
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
          appearance: "interaction-only",
        });
      })
      .catch(() => setToken(null));

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, required]);

  // Tokens are single-use: burn this one and ask the widget for the next.
  const consume = useCallback(() => {
    const used = token;
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setToken(null);
    }
    return used;
  }, [token]);

  return { containerRef, token, consume, ready: !required || !!token };
}
