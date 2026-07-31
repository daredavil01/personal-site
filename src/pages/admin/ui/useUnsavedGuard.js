import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Warns before a dirty form is abandoned.
 *
 * Two exits have to be covered. `beforeunload` handles closing the tab or
 * reloading. In-app navigation is the harder one: this app uses `BrowserRouter`
 * rather than a data router, so `useBlocker` is unavailable — instead a
 * capture-phase click listener catches same-origin anchor clicks (every sidebar
 * link is a NavLink, i.e. an `<a>`), holds the destination, and only navigates
 * once the user confirms.
 *
 * Returns `{ pending, confirm, cancel, guard }` — render a ConfirmDialog on
 * `pending`, and call `guard(fn)` for in-component exits like a Cancel button.
 */
const useUnsavedGuard = (dirty) => {
  const navigate = useNavigate();
  const [pending, setPending] = useState(null); // { href } | { run }

  useEffect(() => {
    if (!dirty) return undefined;

    const onBeforeUnload = (e) => {
      e.preventDefault();
      // Browsers ignore the message these days but still require a return value.
      e.returnValue = "";
      return "";
    };

    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPending({ href: url.pathname + url.search });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const guard = (run) => {
    if (!dirty) {
      run();
      return;
    }
    setPending({ run });
  };

  const confirm = () => {
    const target = pending;
    setPending(null);
    if (!target) return;
    if (target.run) target.run();
    else navigate(target.href);
  };

  return { pending: !!pending, confirm, cancel: () => setPending(null), guard };
};

export default useUnsavedGuard;
