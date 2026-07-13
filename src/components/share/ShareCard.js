import React from "react";
import { SITE_NAME } from "../../data/pageMeta";
import BrandMark from "./BrandMark";
import { displayFont } from "./shareFonts";

const BRAND = "/images/brand";

// Faint binary texture echoing the site logo art, used by the abstract theme.
const BINARY_TEXTURE = "01001101 01010011 01010100 00100110 ".repeat(240);

// ---------------------------------------------------------------------------
// Theme registry. Each theme is a set of full, literal Tailwind class strings
// (so the JIT compiler picks them up) plus:
//   base       — solid colour handed to html-to-image as the canvas background
//   background — the card's own background (colour or gradient), set inline
//   bar        — colour of the top accent strip
//   overlay    — optional inline-style object for an absolute texture layer
//                (grids, ruled lines, halftone dots, scanlines)
//   binary     — the abstract theme's binary-text decoration
//   bodyFontDefault — font the body falls back to when the user picks "Auto"
//   titleGlow  — optional text-shadow applied to the title (neon)
// `group`/`label` drive the picker UI in ShareImageModal.
// ---------------------------------------------------------------------------
const THEMES = {
  // ---- Core (the original three) ----
  light: {
    label: "Light",
    group: "Core",
    base: "#f4f4f3",
    background: "#f4f4f3",
    bar: "#b22200",
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
  },
  dark: {
    label: "Dark",
    group: "Core",
    base: "#1c1917",
    background: "#1c1917",
    bar: "#ff6b4a",
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
  },
  abstract: {
    label: "Abstract",
    group: "Core",
    base: "#160a08",
    background:
      "radial-gradient(circle at 22% 18%, rgba(178,34,0,0.55), transparent 42%), radial-gradient(circle at 82% 88%, rgba(0,34,43,0.7), transparent 46%), linear-gradient(135deg, #1c0a07 0%, #0b0504 62%, #06100f 100%)",
    bar: "#ff8a6a",
    binary: true,
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
  },

  // ---- Editorial ----
  sepia: {
    label: "Sepia",
    group: "Editorial",
    base: "#f3ead9",
    background: "#f3ead9",
    bar: "#9a5b2c",
    eyebrow: "text-[#9a5b2c]",
    title: "text-[#3b2a18]",
    subtitle: "text-[#7a6248]",
    meta: "text-[#7a6248]",
    metaIcon: "text-[#9a5b2c]",
    body: "text-[#4b3826]",
    tag: "bg-white/60 text-[#7a6248] border-[#d8c9a8]",
    divider: "border-[#d8c9a8]",
    footer: "text-[#a08a68]",
    heroBorder: "border-[#d8c9a8]",
    logo: `${BRAND}/logo.png`,
    signature: `${BRAND}/black_sign.png`,
  },
  ivory: {
    label: "Ivory",
    group: "Editorial",
    base: "#fffdf4",
    background: "#fffdf4",
    bar: "#b08d2f",
    eyebrow: "text-[#a5842c]",
    title: "text-stone-800",
    subtitle: "text-stone-500",
    meta: "text-stone-500",
    metaIcon: "text-[#a5842c]",
    body: "text-stone-700",
    tag: "bg-[#f7f2df] text-stone-500 border-[#e5dbb8]",
    divider: "border-[#e5dbb8]",
    footer: "text-stone-400",
    heroBorder: "border-[#e5dbb8]",
    logo: `${BRAND}/logo.png`,
    signature: `${BRAND}/black_sign.png`,
  },
  charcoal: {
    label: "Charcoal",
    group: "Editorial",
    base: "#2a2724",
    background: "#2a2724",
    bar: "#f59e0b",
    eyebrow: "text-amber-500",
    title: "text-stone-50",
    subtitle: "text-stone-400",
    meta: "text-stone-300",
    metaIcon: "text-amber-500",
    body: "text-stone-200",
    tag: "bg-white/5 text-stone-300 border-white/10",
    divider: "border-white/10",
    footer: "text-stone-500",
    heroBorder: "border-white/10",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },
  midnight: {
    label: "Midnight",
    group: "Editorial",
    base: "#0f1a2e",
    background: "linear-gradient(165deg, #101d33 0%, #0c1526 100%)",
    bar: "#38bdf8",
    eyebrow: "text-sky-400",
    title: "text-slate-50",
    subtitle: "text-slate-400",
    meta: "text-slate-300",
    metaIcon: "text-sky-400",
    body: "text-slate-200",
    tag: "bg-white/5 text-slate-300 border-white/10",
    divider: "border-white/10",
    footer: "text-slate-500",
    heroBorder: "border-white/10",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },

  // ---- Gradient ----
  sunset: {
    label: "Sunset",
    group: "Gradient",
    base: "#2b1240",
    background:
      "linear-gradient(140deg, #2b1240 0%, #8f2d56 45%, #e96443 82%, #f8b195 100%)",
    bar: "#f8b195",
    eyebrow: "text-amber-200",
    title: "text-white",
    subtitle: "text-rose-100",
    meta: "text-rose-100",
    metaIcon: "text-amber-200",
    body: "text-rose-50",
    tag: "bg-white/15 text-white border-white/20",
    divider: "border-white/25",
    footer: "text-white/70",
    heroBorder: "border-white/25",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },
  ocean: {
    label: "Ocean",
    group: "Gradient",
    base: "#03203c",
    background: "linear-gradient(150deg, #03203c 0%, #0a5f7a 55%, #2ec4b6 100%)",
    bar: "#7ff0e3",
    eyebrow: "text-cyan-200",
    title: "text-white",
    subtitle: "text-cyan-100",
    meta: "text-cyan-100",
    metaIcon: "text-cyan-200",
    body: "text-cyan-50",
    tag: "bg-white/15 text-white border-white/20",
    divider: "border-white/25",
    footer: "text-white/70",
    heroBorder: "border-white/25",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },
  forest: {
    label: "Forest",
    group: "Gradient",
    base: "#0b2818",
    background: "linear-gradient(150deg, #0b2818 0%, #1e5631 60%, #4e8c4a 100%)",
    bar: "#bef264",
    eyebrow: "text-lime-200",
    title: "text-white",
    subtitle: "text-lime-100",
    meta: "text-lime-100",
    metaIcon: "text-lime-200",
    body: "text-lime-50",
    tag: "bg-white/15 text-white border-white/20",
    divider: "border-white/25",
    footer: "text-white/70",
    heroBorder: "border-white/25",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },
  aurora: {
    label: "Aurora",
    group: "Gradient",
    base: "#0c1023",
    background:
      "radial-gradient(circle at 20% 15%, rgba(64,224,160,0.35), transparent 45%), radial-gradient(circle at 85% 30%, rgba(140,90,255,0.4), transparent 50%), radial-gradient(circle at 60% 90%, rgba(0,180,255,0.25), transparent 50%), linear-gradient(160deg, #0c1023 0%, #141b3c 100%)",
    bar: "#6ee7b7",
    eyebrow: "text-emerald-300",
    title: "text-white",
    subtitle: "text-indigo-200",
    meta: "text-indigo-200",
    metaIcon: "text-emerald-300",
    body: "text-slate-100",
    tag: "bg-white/10 text-slate-100 border-white/15",
    divider: "border-white/15",
    footer: "text-slate-400",
    heroBorder: "border-white/15",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },

  // ---- Texture ----
  notebook: {
    label: "Notebook",
    group: "Texture",
    base: "#fbf8ef",
    background:
      "linear-gradient(90deg, transparent 0, transparent 108px, rgba(217,72,72,0.3) 108px, rgba(217,72,72,0.3) 111px, transparent 111px), repeating-linear-gradient(to bottom, transparent, transparent 62px, rgba(59,86,168,0.16) 62px, rgba(59,86,168,0.16) 64px), #fbf8ef",
    bar: "#d94848",
    eyebrow: "text-[#d94848]",
    title: "text-[#1e3a5f]",
    subtitle: "text-[#4a648c]",
    meta: "text-[#4a648c]",
    metaIcon: "text-[#d94848]",
    body: "text-[#27415f]",
    tag: "bg-white/70 text-[#4a648c] border-[#c9d4e8]",
    divider: "border-[#c9d4e8]",
    footer: "text-[#8095b5]",
    heroBorder: "border-[#c9d4e8]",
    logo: `${BRAND}/logo.png`,
    signature: `${BRAND}/black_sign.png`,
  },
  terminal: {
    label: "Terminal",
    group: "Texture",
    base: "#071007",
    background: "#071007",
    bar: "#22c55e",
    overlay: {
      background:
        "repeating-linear-gradient(to bottom, rgba(34,197,94,0.05) 0px, rgba(34,197,94,0.05) 3px, transparent 3px, transparent 6px)",
    },
    bodyFontDefault: "mono",
    eyebrow: "text-[#4ade80]",
    title: "text-[#4ade80]",
    subtitle: "text-[#3fa168]",
    meta: "text-[#3fa168]",
    metaIcon: "text-[#4ade80]",
    body: "text-[#86efac]",
    tag: "bg-white/5 text-[#86efac] border-[#1f4d1f]",
    divider: "border-[#1f4d1f]",
    footer: "text-[#3fa168]",
    heroBorder: "border-[#1f4d1f]",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },
  blueprint: {
    label: "Blueprint",
    group: "Texture",
    base: "#123a6b",
    background:
      "repeating-linear-gradient(0deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1.5px, transparent 1.5px, transparent 54px), repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1.5px, transparent 1.5px, transparent 54px), #123a6b",
    bar: "#bae6fd",
    eyebrow: "text-sky-200",
    title: "text-white",
    subtitle: "text-sky-200",
    meta: "text-sky-100",
    metaIcon: "text-sky-200",
    body: "text-sky-50",
    tag: "bg-white/10 text-sky-100 border-white/20",
    divider: "border-white/25",
    footer: "text-sky-200/70",
    heroBorder: "border-white/25",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },
  newsprint: {
    label: "Newsprint",
    group: "Texture",
    base: "#f4f1e9",
    background: "#f4f1e9",
    bar: "#1c1917",
    overlay: {
      backgroundImage: "radial-gradient(rgba(28,25,23,0.1) 1.2px, transparent 1.3px)",
      backgroundSize: "18px 18px",
    },
    eyebrow: "text-stone-900",
    title: "text-stone-900",
    subtitle: "text-stone-600",
    meta: "text-stone-600",
    metaIcon: "text-stone-900",
    body: "text-stone-800",
    tag: "bg-white text-stone-600 border-stone-300",
    divider: "border-stone-400",
    footer: "text-stone-500",
    heroBorder: "border-stone-300",
    logo: `${BRAND}/logo.png`,
    signature: `${BRAND}/black_sign.png`,
  },

  // ---- Signature (accents & scripts) ----
  letterpress: {
    label: "Letterpress",
    group: "Signature",
    base: "#f5efe2",
    background: "#f5efe2",
    bar: "#b3402a",
    bodyFontDefault: "serif",
    eyebrow: "text-[#b3402a]",
    title: "text-[#2a211a]",
    subtitle: "text-[#6b5c49]",
    meta: "text-[#6b5c49]",
    metaIcon: "text-[#b3402a]",
    body: "text-[#2a211a]",
    tag: "bg-white/60 text-[#6b5c49] border-[#d9cdb4]",
    divider: "border-[#d9cdb4]",
    footer: "text-[#9a8a70]",
    heroBorder: "border-[#d9cdb4]",
    logo: `${BRAND}/logo.png`,
    signature: `${BRAND}/black_sign.png`,
  },
  neon: {
    label: "Neon",
    group: "Signature",
    base: "#0b0b12",
    background:
      "radial-gradient(circle at 15% 20%, rgba(255,45,149,0.18), transparent 45%), radial-gradient(circle at 85% 80%, rgba(0,229,255,0.15), transparent 45%), #0b0b12",
    bar: "#ff2d95",
    titleGlow: "0 0 24px rgba(255,45,149,0.55)",
    eyebrow: "text-[#00e5ff]",
    title: "text-[#ff2d95]",
    subtitle: "text-slate-300",
    meta: "text-slate-300",
    metaIcon: "text-[#00e5ff]",
    body: "text-slate-100",
    tag: "bg-white/5 text-[#7df3ff] border-[#00e5ff33]",
    divider: "border-white/10",
    footer: "text-slate-500",
    heroBorder: "border-white/10",
    logo: `${BRAND}/logo_circle.png`,
    signature: `${BRAND}/white_sign.png`,
  },
};

// Picker metadata for ShareImageModal: [{ group, themes: [{ id, label, swatch }] }]
export const THEME_GROUPS = Object.entries(THEMES).reduce((groups, [id, def]) => {
  let entry = groups.find((g) => g.group === def.group);
  if (!entry) {
    entry = { group: def.group, themes: [] };
    groups.push(entry);
  }
  entry.themes.push({ id, label: def.label, swatch: def.background });
  return groups;
}, []);

export const themeBase = (themeId) => (THEMES[themeId] || THEMES.light).base;

// Card pixel heights per aspect; `auto` grows with content.
const HEIGHTS = { portrait: 1350, square: 1080, story: 1920 };

// Hero (photo) height ladder per aspect: Small / Medium / Large. Medium is the
// pre-editor default.
const HERO_HEIGHTS = {
  portrait: { s: 280, m: 400, l: 540 },
  square: { s: 210, m: 300, l: 400 },
  story: { s: 330, m: 460, l: 640 },
  auto: { s: 330, m: 460, l: 620 },
};

const heroHeight = (aspect, imageSize) => {
  const ladder = HERO_HEIGHTS[aspect] || HERO_HEIGHTS.auto;
  return ladder[imageSize] || ladder.m;
};

// Body-line budget per aspect: [withHero, withoutHero]. "big" covers the quote
// and headline styles (larger glyphs, fewer lines fit). Auto height never
// clamps; Small/Large text shifts the budget by ±2 lines, and a Small/Large
// hero hands lines back / takes lines away in step with its height.
const CLAMP = {
  portrait: { big: [5, 9], regular: [7, 13] },
  square: { big: [3, 6], regular: [4, 8] },
  story: { big: [8, 14], regular: [12, 20] },
};

const clampLines = (aspect, big, showHero, textSize, imageSize) => {
  if (!CLAMP[aspect]) return 0;
  const base = CLAMP[aspect][big ? "big" : "regular"][showHero ? 0 : 1];
  const textAdjust = { s: 2, l: -2 }[textSize] || 0;
  const heroAdjust = showHero ? { s: 2, l: -2 }[imageSize] || 0 : 0;
  return Math.max(2, base + textAdjust + heroAdjust);
};

const FONT_CLASS = { sans: "font-body", serif: "font-headline", mono: "font-mono" };

// A base font resolves to a Tailwind class; a Marathi/display face resolves to
// an inline font-family (they aren't part of the Tailwind theme).
const resolveBodyFont = (font, style, theme) => {
  const display = displayFont(font);
  if (display) return { className: "", style: { fontFamily: display.family }, isDisplay: true };
  let className = FONT_CLASS[font];
  if (!className) className = FONT_CLASS[theme.bodyFontDefault];
  if (!className) className = style === "regular" ? "font-body" : "font-headline";
  return { className, style: null, isDisplay: false };
};

// text-size ladders; "auto" keeps the original shrink-long-text behaviour.
const SIZE_LADDERS = {
  big: {
    s: "text-4xl", m: "text-5xl", l: "text-6xl", short: "text-5xl", long: "text-4xl",
  },
  regular: {
    s: "text-3xl", m: "text-4xl", l: "text-5xl", short: "text-4xl", long: "text-3xl",
  },
};

const bodySizeClass = (style, textSize, body) => {
  const ladder = SIZE_LADDERS[style === "regular" ? "regular" : "big"];
  return ladder[textSize] || ladder[body.length > 260 ? "long" : "short"];
};

// Devanagari has no italics and the display faces ship one weight, so synthetic
// italic/black styling is skipped when a display face is active.
const styleClass = (style, isDisplay) => {
  if (style === "quote") return isDisplay ? "leading-snug" : "italic leading-snug";
  if (style === "headline") return isDisplay ? "leading-tight" : "font-black leading-tight";
  return "leading-relaxed";
};

// Presentational, type-agnostic share card. Always 1080px wide; Portrait /
// Square / Story are fixed frames, Auto grows to content. Driven entirely by a
// normalized model plus display options — no type-aware logic lives here.
const ShareCard = ({
  model,
  theme: themeId = "light",
  aspect = "portrait",
  includeImage = true,
  imageSize = "m",
  textStyle = "auto",
  font = "auto",
  textSize = "auto",
  align = "left",
  showTimestamp = true,
  showTags = true,
  showSignature = true,
}) => {
  if (!model) return null;
  const theme = THEMES[themeId] || THEMES.light;
  const fixedHeight = HEIGHTS[aspect];
  const showHero = includeImage && Boolean(model.imageUrl);
  const autoStyle = model.quote ? "quote" : "regular";
  const style = textStyle === "auto" ? autoStyle : textStyle;
  const big = style !== "regular";
  const centered = align === "center";

  const {
    eyebrow, title, subtitle, metaRows = [], body, tags = [], footerNote, footerUrl,
  } = model;

  const visibleMeta = metaRows.filter((row) => showTimestamp || !row.isDate);

  const titleClass = title && title.length > 48 ? "text-5xl" : "text-6xl";
  const lines = clampLines(aspect, big, showHero, textSize, imageSize);
  const bodyClampStyle = lines
    ? {
      display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden",
    }
    : undefined;

  const bodyFont = resolveBodyFont(font, style, theme);
  const bodyClass = [
    bodyFont.className,
    bodySizeClass(style, textSize, body || ""),
    styleClass(style, bodyFont.isDisplay),
    big ? theme.title : theme.body,
    centered ? "text-center" : "",
  ].join(" ");

  const visibleTags = tags.slice(0, 10);
  const extraTags = tags.length - visibleTags.length;

  return (
    <div
      style={{ width: 1080, height: fixedHeight, background: theme.background }}
      className="relative flex flex-col overflow-hidden font-body"
    >
      <div className="h-3 w-full shrink-0" style={{ background: theme.bar }} />

      {theme.overlay && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={theme.overlay} />
      )}

      {theme.binary && (
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
            className="flex w-full shrink-0 justify-center"
            style={{ height: heroHeight(aspect, imageSize) }}
          >
            <img
              src={model.imageUrl}
              alt=""
              crossOrigin="anonymous"
              className={`h-full w-auto rounded-2xl border object-contain ${theme.heroBorder}`}
            />
          </div>
        )}

        <div className={`flex min-h-0 flex-1 flex-col gap-6 ${centered ? "items-center" : ""}`}>
          {title ? (
            <h1
              className={`font-headline font-black leading-[1.05] ${titleClass} ${theme.title} ${centered ? "text-center" : ""}`}
              style={theme.titleGlow ? { textShadow: theme.titleGlow } : undefined}
            >
              {title}
            </h1>
          ) : null}

          {subtitle ? (
            <p className={`font-headline text-3xl italic ${theme.subtitle} ${centered ? "text-center" : ""}`}>{subtitle}</p>
          ) : null}

          {visibleMeta.length > 0 && (
            <div className={`flex flex-wrap items-center gap-x-8 gap-y-3 ${centered ? "justify-center" : ""}`}>
              {visibleMeta.map((row) => (
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
              className={`mb-0 whitespace-pre-line ${bodyClass}`}
              style={{ ...bodyClampStyle, ...bodyFont.style }}
            >
              {style === "quote" ? `“${body}”` : body}
            </p>
          ) : null}
        </div>

        {showTags && visibleTags.length > 0 && (
          <div className={`flex shrink-0 flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>
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
          {showSignature && (
            <BrandMark
              src={theme.signature}
              alt="Signature"
              className="h-16 w-auto object-contain"
            />
          )}
          <div className="ml-auto text-right">
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
