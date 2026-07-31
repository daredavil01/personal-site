import React, { useCallback, useEffect, useRef } from "react";
import { IconButton } from "./Button";
import { X } from "./icons";
import { hairline, heading, mutedText, surface } from "./tokens";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/**
 * Accessible dialog: Escape closes, focus moves in on open and returns to the
 * trigger on close, Tab is trapped inside, and the page behind is scroll-locked.
 */
const Modal = ({
  open, onClose, title, description, footer, size = "md", children,
}) => {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll(FOCUSABLE))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    // Focus the first control in the panel, falling back to the panel itself.
    const target = panelRef.current?.querySelector(FOCUSABLE) ?? panelRef.current;
    target?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (returnFocusRef.current instanceof HTMLElement) returnFocusRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    // Backdrop dismissal: `presentation` because the backdrop carries no
    // semantics of its own, and Escape (handled on the panel) is the keyboard
    // equivalent of clicking it.
    <div
      role="presentation"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/50 dark:bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* The Escape / Tab-trap handler belongs on the dialog itself — the a11y
          rule can't tell a focus trap from a click-target masquerading as one. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`w-full ${SIZES[size] ?? SIZES.md} ${surface} border ${hairline} rounded-xl shadow-2xl flex flex-col max-h-[85vh] focus:outline-none`}
      >
        {title && (
          <header className={`flex items-start justify-between gap-3 px-5 py-4 border-b ${hairline}`}>
            <div className="min-w-0">
              <h2 className={`${heading} text-base mb-0`}>{title}</h2>
              {description && <p className={`text-sm ${mutedText} mt-1 mb-0`}>{description}</p>}
            </div>
            <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
          </header>
        )}
        {children && <div className="px-5 py-4 overflow-y-auto min-h-0">{children}</div>}
        {footer && (
          <footer className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${hairline}`}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default Modal;
