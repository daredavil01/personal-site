import React, {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from "react";
import { AlertTriangle, Check, Info, X } from "./icons";
import { hairline, surface } from "./tokens";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: Check, className: "text-emerald-600 dark:text-emerald-400" },
  error: { icon: AlertTriangle, className: "text-red-600 dark:text-red-400" },
  info: { icon: Info, className: "text-admin-600 dark:text-admin-400" },
};

const DEFAULT_MS = 4000;

/**
 * Replaces window.alert across the admin. Errors stay until dismissed — a
 * failed save is not something to blink past — everything else auto-dismisses.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((tone, message, options = {}) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((prev) => [...prev, { id, tone, message }]);
    const duration = options.duration ?? (tone === "error" ? 0 : DEFAULT_MS);
    if (duration > 0) {
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    }
    return id;
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (message, options) => push("success", message, options),
    error: (message, options) => push("error", message, options),
    info: (message, options) => push("info", message, options),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]" aria-live="polite">
        {toasts.map(({ id, tone, message }) => {
          const { icon: Icon, className } = TONES[tone] ?? TONES.info;
          return (
            <div
              key={id}
              className={`flex items-start gap-2.5 px-3.5 py-3 ${surface} border ${hairline} rounded-xl shadow-lg text-sm text-stone-800 dark:text-stone-100`}
            >
              <Icon size={16} className={`shrink-0 mt-0.5 ${className}`} aria-hidden="true" />
              <span className="flex-1 min-w-0 break-words">{message}</span>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Dismiss"
                className="shrink-0 -mr-1 -mt-0.5 p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Returns { success, error, info, dismiss }. Safe outside a provider (the calls
 * become no-ops) so panels can be unit-tested in isolation.
 */
const NOOP_TOAST = {
  success: () => {}, error: () => {}, info: () => {}, dismiss: () => {},
};

export const useToast = () => useContext(ToastContext) ?? NOOP_TOAST;

export default ToastContext;
