import React, { useState } from "react";
import { card, hairline, heading, mutedText } from "./tokens";

// Remembered per card title, because the settings page is long and the section
// someone is working in should still be open after a save reloads the page.
// Per-browser convenience, not state — a failed read just means "open".
const storeKey = (title) => `admin:card:${title}`;

const readOpen = (title, fallback) => {
  if (!title) return true;
  try {
    const stored = window.localStorage.getItem(storeKey(title));
    return stored === null ? fallback : stored === "1";
  } catch (_) {
    return fallback;
  }
};

const Card = ({
  title, description, actions, footer, className = "", bodyClassName = "p-4",
  collapsible = false, defaultOpen = true, children,
}) => {
  const [open, setOpen] = useState(() => (collapsible ? readOpen(title, defaultOpen) : true));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(storeKey(title), next ? "1" : "0");
    } catch (_) { /* private window — the card still opens and closes */ }
  };

  // Only the title area toggles. `actions` often holds a real control (Save,
  // Add row), and a header-wide click target would swallow it.
  const titleBlock = (
    <div className="min-w-0">
      {title && (
        <h2 className={`${heading} text-sm mb-0 flex items-center gap-1.5`}>
          {collapsible && (
            <span aria-hidden="true" className={`text-[10px] transition-transform ${open ? "" : "-rotate-90"}`}>
              ▾
            </span>
          )}
          {title}
        </h2>
      )}
      {description && <p className={`text-xs ${mutedText} mt-0.5 mb-0`}>{description}</p>}
    </div>
  );

  return (
    <section className={`${card} ${className}`}>
      {(title || actions) && (
        <header className={`flex items-start justify-between gap-3 px-4 py-3 ${open ? `border-b ${hairline}` : ""}`}>
          {collapsible && title ? (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className="min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
            >
              {titleBlock}
            </button>
          ) : titleBlock}
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {open && <div className={bodyClassName}>{children}</div>}
      {open && footer && <footer className={`px-4 py-3 border-t ${hairline}`}>{footer}</footer>}
    </section>
  );
};

export default Card;
