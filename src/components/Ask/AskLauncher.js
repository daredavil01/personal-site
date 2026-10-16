import React, { Suspense, lazy, useState } from "react";
import { useLocation } from "react-router-dom";

// AskChat pulls in the tag context and the chat state machine. Lazy so visitors
// who never open the panel never download it — same reasoning as the route-level
// lazy imports in App.js.
const AskChat = lazy(() => import("./AskChat"));

// Site-wide launcher, mounted once in Main. Hidden on /ask itself (the page is
// already the chat) and under /admin.
const AskLauncher = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  if (pathname === "/ask" || pathname.startsWith("/admin")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="ask-panel"
        aria-label={open ? "Close the archive chat" : "Ask the archive"}
        title={open ? "Close" : "Ask the archive"}
        // Same 44px circle as FloatingToggle's buttons, so the corners match.
        className="fixed bottom-6 left-6 z-40 p-[11px] rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 shadow-lg border border-stone-200/10 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-xl leading-none" aria-hidden="true">
          {open ? "close" : "forum"}
        </span>
      </button>

      {open && (
        <div
          id="ask-panel"
          className="fixed bottom-20 left-5 right-5 sm:right-auto sm:w-[420px] z-40 max-h-[70vh] flex flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 shadow-xl p-4"
        >
          <Suspense
            fallback={
              <p className="text-[13px] text-stone-500 dark:text-stone-400 mb-0">
                Waking up…
              </p>
            }
          >
            <AskChat compact />
          </Suspense>
        </div>
      )}
    </>
  );
};

export default AskLauncher;
