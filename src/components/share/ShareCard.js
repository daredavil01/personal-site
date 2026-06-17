import React from "react";
import { SITE_NAME } from "../../data/pageMeta";
import BrandMark from "./BrandMark";

const BRAND = "/images/brand";

// Faint binary texture echoing the site logo art, used by the abstract theme.
const BINARY_TEXTURE = "01001101 01010011 01010100 00100110 ".repeat(240);

// Each theme is a set of full, literal Tailwind class strings (so the JIT
// compiler picks them up) plus the solid `base` colour passed to html-to-image
// as the canvas background. The card's own background is set inline.
const THEMES = {
  light: {
    base: "#f4f4f3",
    background: "#f4f4f3",
    eyebrow: "text-secondary",
    title: "text-stone-900",
    subtitle: "text-stone-500",
    meta: "text-stone-500",
    metaIcon: "text-secondary",
    body: "text-stone-700",
    tag: "bg-white text-stone-500 border-stone-200",
    divider: "border-stone-200",
    footer: "text-stone-400",
    heroBorder: "border-stone-200",
    logo: `${BRAND}/logo.png`,
    signature: `${BRAND}/black_sign.png`,
    decoration: false,
  },
  dark: {
    base: "#1c1917",
    background: "#1c1917",
    eyebrow: "text-[#ff6b4a]",
    title: "text-stone-50",
    subtitle: "text-stone-400",
    meta: "text-stone-300",
    metaIcon: "text-[#ff6b4a]",
    body: "text-stone-200",
    tag: "bg-white/5 text-stone-300 border-white/10",
    divider: "border-white/10",
    footer: "text-stone-500",
    heroBorder: "border-white/10",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
    decoration: false,
  },
  abstract: {
    base: "#160a08",
    background:
      "radial-gradient(circle at 22% 18%, rgba(178,34,0,0.55), transparent 42%), radial-gradient(circle at 82% 88%, rgba(0,34,43,0.7), transparent 46%), linear-gradient(135deg, #1c0a07 0%, #0b0504 62%, #06100f 100%)",
    eyebrow: "text-[#ff8a6a]",
    title: "text-stone-50",
    subtitle: "text-stone-300",
    meta: "text-stone-200",
    metaIcon: "text-[#ff8a6a]",
    body: "text-stone-100",
    tag: "bg-white/10 text-stone-100 border-white/15",
    divider: "border-white/15",
    footer: "text-stone-300/80",
    heroBorder: "border-white/15",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
    decoration: true,
  },
};

// Number of body lines to clamp to in Portrait. Auto height (0) never clamps.
const clampLines = (portrait, quote, showHero) => {
  if (!portrait) return 0;
  if (quote) return showHero ? 5 : 9;
  return showHero ? 7 : 13;
};

export const themeBase = (background) => (THEMES[background] || THEMES.light).base;

// Presentational, type-agnostic share card. Always 1080px wide; Portrait is a
// fixed 1080x1350, Auto grows to content. Driven entirely by a normalized model.
const ShareCard = ({
  model, background = "light", aspect = "portrait", includeImage = true,
}) => {
  if (!model) return null;
  const theme = THEMES[background] || THEMES.light;
  const portrait = aspect === "portrait";
  const showHero = includeImage && Boolean(model.imageUrl);

  const {
    eyebrow, title, subtitle, metaRows = [], body, quote, tags = [], footerNote, footerUrl,
  } = model;

  const titleClass = title && title.length > 48 ? "text-5xl" : "text-6xl";
  const bodyTextClass = body && body.length > 260 ? "text-3xl" : "text-4xl";
  const lines = clampLines(portrait, quote, showHero);
  const bodyClampStyle = lines
    ? {
      display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden",
    }
    : undefined;

  const visibleTags = tags.slice(0, 10);
  const extraTags = tags.length - visibleTags.length;

  return (
    <div
      style={{ width: 1080, height: portrait ? 1350 : undefined, background: theme.background }}
      className="relative flex flex-col overflow-hidden font-body"
    >
      <div className="h-3 w-full shrink-0 bg-secondary" />

      {theme.decoration && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none break-all p-6 font-mono text-3xl leading-none text-white"
          style={{ opacity: 0.05 }}
        >
          {BINARY_TEXTURE}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col gap-9 px-16 py-14">
        <div className="flex shrink-0 items-center justify-between">
          <BrandMark src={theme.logo} alt={SITE_NAME} className="h-20 w-auto object-contain" />
          <span className={`font-label text-2xl uppercase tracking-[0.3em] ${theme.eyebrow}`}>
            {eyebrow}
          </span>
        </div>

        {showHero && (
          <div
            className={`w-full shrink-0 overflow-hidden rounded-2xl border ${theme.heroBorder}`}
            style={{ height: portrait ? 400 : 460 }}
          >
            <img
              src={model.imageUrl}
              alt=""
              crossOrigin="anonymous"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-6">
          {title ? (
            <h1 className={`font-headline font-black leading-[1.05] ${titleClass} ${theme.title}`}>
              {title}
            </h1>
          ) : null}

          {subtitle ? (
            <p className={`font-headline text-3xl italic ${theme.subtitle}`}>{subtitle}</p>
          ) : null}

          {metaRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {metaRows.map((row) => (
                <span
                  key={row.label}
                  className={`flex items-center gap-2 font-label text-xl uppercase tracking-wider ${theme.meta}`}
                >
                  {row.icon ? (
                    <span className={`material-symbols-outlined text-2xl ${theme.metaIcon}`}>
                      {row.icon}
                    </span>
                  ) : null}
                  {row.label}
                </span>
              ))}
            </div>
          )}

          {body ? (
            <p
              className={`mb-0 whitespace-pre-line ${quote
                ? `font-headline text-5xl italic leading-snug ${theme.title}`
                : `${bodyTextClass} leading-relaxed ${theme.body}`}`}
              style={bodyClampStyle}
            >
              {quote ? `“${body}”` : body}
            </p>
          ) : null}
        </div>

        {visibleTags.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-3">
            {visibleTags.map((tag) => (
              <span key={tag} className={`rounded-md border px-4 py-1.5 text-xl ${theme.tag}`}>
                #
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className={`rounded-md border px-4 py-1.5 text-xl ${theme.tag}`}>
                +
                {extraTags}
              </span>
            )}
          </div>
        )}

        <div className={`flex shrink-0 items-end justify-between border-t pt-7 ${theme.divider}`}>
          <BrandMark
            src={theme.signature}
            alt="Signature"
            className="h-16 w-auto object-contain"
          />
          <div className="text-right">
            {footerNote ? (
              <div className={`font-label text-base uppercase tracking-widest ${theme.footer}`}>
                {footerNote}
              </div>
            ) : null}
            <div className={`font-mono text-base ${theme.footer}`}>{footerUrl}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
