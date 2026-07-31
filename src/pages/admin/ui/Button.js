import React from "react";
import { Loader2 } from "./icons";
import { RADIUS } from "./tokens";

const VARIANTS = {
  primary: "bg-admin-600 text-white border border-admin-600 hover:bg-admin-700 hover:border-admin-700 focus:ring-admin-500/40",
  secondary: "bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 focus:ring-admin-500/40",
  ghost: "bg-transparent text-stone-600 dark:text-stone-300 border border-transparent hover:bg-stone-100 dark:hover:bg-stone-800 focus:ring-admin-500/40",
  danger: "bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700 focus:ring-red-500/40",
  dangerGhost: "bg-transparent text-red-600 dark:text-red-400 border border-transparent hover:bg-red-50 dark:hover:bg-red-950/40 focus:ring-red-500/40",
};

const SIZES = {
  xs: "h-7 px-2 text-xs gap-1",
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
};

const ICON_SIZES = { xs: 13, sm: 14, md: 16 };

/**
 * The admin's only button. `icon` takes a lucide component (not an element) so
 * the size stays in step with the button size.
 */
const Button = ({
  variant = "secondary",
  size = "md",
  icon: Icon,
  iconRight = false,
  loading = false,
  disabled = false,
  className = "",
  children,
  type = "button",
  ...rest
}) => {
  const iconSize = ICON_SIZES[size] ?? ICON_SIZES.md;
  const glyph = loading
    ? <Loader2 size={iconSize} className="animate-spin shrink-0" aria-hidden="true" />
    : Icon && <Icon size={iconSize} className="shrink-0" aria-hidden="true" />;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium ${RADIUS} transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant] ?? VARIANTS.secondary} ${SIZES[size] ?? SIZES.md} ${className}`}
      {...rest}
    >
      {!iconRight && glyph}
      {children}
      {iconRight && glyph}
    </button>
  );
};

/** Square icon-only button. `label` is required — it becomes the accessible name. */
export const IconButton = ({
  icon: Icon, label, size = "md", variant = "ghost", className = "", ...rest
}) => (
  <Button
    variant={variant}
    size={size}
    aria-label={label}
    title={label}
    className={`!px-0 ${size === "sm" ? "w-8" : "w-9"} ${className}`}
    icon={Icon}
    {...rest}
  />
);

export default Button;
