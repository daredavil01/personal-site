import React, {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { SITE_NAME } from "../../data/pageMeta";
import ShareCard, { THEME_GROUPS, themeBase } from "./ShareCard";
import { hasImage, toShareModel } from "./shareCardConfig";
import useImageExport from "./useImageExport";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const ASPECTS = [
  { id: "portrait", label: "Portrait" },
  { id: "square", label: "Square" },
  { id: "story", label: "Story" },
  { id: "auto", label: "Auto" },
];

const TEXT_STYLES = [
  { id: "auto", label: "Auto" },
  { id: "regular", label: "Text" },
  { id: "quote", label: "Quote" },
  { id: "headline", label: "Bold" },
];

const FONTS = [
  { id: "auto", label: "Auto" },
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
];

const TEXT_SIZES = [
  { id: "auto", label: "Auto" },
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
];

const ALIGNMENTS = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
];

const SegButton = ({ active, onClick, children }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={keyActivate(onClick)}
    className={`flex-1 cursor-pointer select-none rounded-lg px-2 py-2 text-center font-label text-xs font-bold uppercase tracking-widest transition-colors ${
      active
        ? "bg-secondary text-white"
        : "bg-stone-100 text-stone-500 hover:text-stone-800 dark:bg-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
    }`}
  >
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-2">
    <span className="font-label text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
      {label}
    </span>
    <div className="flex gap-2">{children}</div>
  </div>
);

const Toggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="font-label text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
      {label}
    </span>
    <div
      role="button"
      tabIndex={0}
      aria-pressed={value}
      onClick={() => onChange(!value)}
      onKeyDown={keyActivate(() => onChange(!value))}
      className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
        value ? "bg-secondary" : "bg-stone-300 dark:bg-stone-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          value ? "left-[22px]" : "left-0.5"
        }`}
      />
    </div>
  </div>
);

// Theme picker: one swatch per theme, grouped by family. Each swatch previews
// the theme's real card background (colour or gradient).
const ThemePicker = ({ theme, onChange }) => (
  <div className="flex w-full flex-col gap-3">
    {THEME_GROUPS.map(({ group, themes }) => (
      <div key={group} className="flex flex-col gap-1.5">
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-stone-300 dark:text-stone-600">
          {group}
        </span>
        <div className="grid grid-cols-4 gap-2">
          {themes.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              aria-pressed={theme === t.id}
              onClick={() => onChange(t.id)}
              onKeyDown={keyActivate(() => onChange(t.id))}
              title={t.label}
              className="flex cursor-pointer flex-col items-center gap-1"
            >
              <span
                className={`h-9 w-full rounded-lg border transition-all ${
                  theme === t.id
                    ? "border-secondary ring-2 ring-secondary"
                    : "border-stone-200 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-500"
                }`}
                style={{ background: t.swatch }}
              />
              <span
                className={`font-label text-[9px] uppercase tracking-wider ${
                  theme === t.id
                    ? "font-bold text-secondary"
                    : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Image editor for "Share as image". Renders the chosen ShareCard both
// off-screen at full 1080px (the html-to-image capture target) and as a CSS-
// scaled live preview — same component, same props, one source of truth.
const ShareImageModal = ({ kind, item, onClose }) => {
  const model = useMemo(() => toShareModel(kind, item), [kind, item]);
  const itemHasImage = useMemo(() => hasImage(kind, item), [kind, item]);

  const [theme, setTheme] = useState("light");
  const [aspect, setAspect] = useState("portrait");
  const [textStyle, setTextStyle] = useState("auto");
  const [font, setFont] = useState("auto");
  const [textSize, setTextSize] = useState("auto");
  const [align, setAlign] = useState("left");
  const [includeImage, setIncludeImage] = useState(itemHasImage);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showTags, setShowTags] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [canShareFiles, setCanShareFiles] = useState(false);

  const { status, exportNode } = useImageExport();
  const cardRef = useRef(null);
  const previewBoxRef = useRef(null);
  const [previewW, setPreviewW] = useState(300);
  const [cardH, setCardH] = useState(1350);

  // Close on Escape without also closing a host content modal underneath: a
  // capture-phase listener runs before the host's window listener and stops it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  useEffect(() => {
    try {
      const probe = new File([""], "probe.png", { type: "image/png" });
      setCanShareFiles(Boolean(navigator.canShare && navigator.canShare({ files: [probe] })));
    } catch (_) {
      setCanShareFiles(false);
    }
  }, []);

  useLayoutEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return undefined;
    const update = () => setPreviewW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cardProps = {
    model,
    theme,
    aspect,
    includeImage,
    textStyle,
    font,
    textSize,
    align,
    showTimestamp,
    showTags,
    showSignature,
  };

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const update = () => setCardH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // Re-measure whenever anything that can change the card's height changes.
  }, [model, theme, aspect, includeImage, textStyle, font, textSize, align,
    showTimestamp, showTags, showSignature]);

  if (!model) return null;

  const scale = previewW / 1080;
  const fileName = `${kind}-${item.id}.png`;
  const hasBody = Boolean(model.body);
  const hasTags = (model.tags || []).length > 0;
  const hasDate = (model.metaRows || []).some((row) => row.isDate);

  const runExport = (mode) => exportNode(cardRef.current, {
    fileName,
    title: model.title || SITE_NAME,
    backgroundColor: themeBase(theme),
    mode,
  });

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-stone-900/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 dark:border-stone-800">
          <h2 className="font-headline text-xl text-stone-900 dark:text-stone-100">Share as image</h2>
          <div
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={keyActivate(onClose)}
            className="cursor-pointer rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-6 sm:flex-row">
          <div className="sm:w-1/2">
            <div className="sm:sticky sm:top-0">
              <div
                ref={previewBoxRef}
                className="w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-950"
                style={{ height: cardH * scale }}
              >
                <div style={{ width: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <ShareCard {...cardProps} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 sm:w-1/2">
            <Field label="Theme">
              <ThemePicker theme={theme} onChange={setTheme} />
            </Field>

            <Field label="Shape">
              {ASPECTS.map((a) => (
                <SegButton key={a.id} active={aspect === a.id} onClick={() => setAspect(a.id)}>
                  {a.label}
                </SegButton>
              ))}
            </Field>

            {hasBody && (
              <>
                <Field label="Text style">
                  {TEXT_STYLES.map((s) => (
                    <SegButton key={s.id} active={textStyle === s.id} onClick={() => setTextStyle(s.id)}>
                      {s.label}
                    </SegButton>
                  ))}
                </Field>

                <Field label="Font">
                  {FONTS.map((f) => (
                    <SegButton key={f.id} active={font === f.id} onClick={() => setFont(f.id)}>
                      {f.label}
                    </SegButton>
                  ))}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Size">
                    {TEXT_SIZES.map((s) => (
                      <SegButton key={s.id} active={textSize === s.id} onClick={() => setTextSize(s.id)}>
                        {s.label}
                      </SegButton>
                    ))}
                  </Field>
                  <Field label="Align">
                    {ALIGNMENTS.map((a) => (
                      <SegButton key={a.id} active={align === a.id} onClick={() => setAlign(a.id)}>
                        {a.label}
                      </SegButton>
                    ))}
                  </Field>
                </div>
              </>
            )}

            <div className="flex flex-col gap-3">
              {itemHasImage && (
                <Toggle label="Include image" value={includeImage} onChange={setIncludeImage} />
              )}
              {hasDate && (
                <Toggle label="Timestamp" value={showTimestamp} onChange={setShowTimestamp} />
              )}
              {hasTags && (
                <Toggle label="Tags" value={showTags} onChange={setShowTags} />
              )}
              <Toggle label="Signature" value={showSignature} onChange={setShowSignature} />
            </div>

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => runExport("download")}
                  onKeyDown={keyActivate(() => runExport("download"))}
                  className="flex-1 cursor-pointer rounded-xl bg-secondary px-5 py-3 text-center font-label text-xs font-bold uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-base">download</span>
                    Download
                  </span>
                </div>
                {canShareFiles && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => runExport("share")}
                    onKeyDown={keyActivate(() => runExport("share"))}
                    className="flex-1 cursor-pointer rounded-xl border border-stone-200 px-5 py-3 text-center font-label text-xs font-bold uppercase tracking-widest text-stone-600 transition-colors hover:border-secondary hover:text-secondary dark:border-stone-700 dark:text-stone-300"
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-base">ios_share</span>
                      Share
                    </span>
                  </div>
                )}
              </div>
              <div className="h-4 font-label text-[11px] uppercase tracking-widest text-stone-400">
                {status === "working" && "Generating image…"}
                {status === "done" && "Done!"}
                {status === "error" && "Couldn't generate image. Try again."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Off-screen full-resolution capture target (never display:none, so fonts
          and images load and html-to-image can measure it). */}
      <div className="pointer-events-none fixed -left-[99999px] top-0" aria-hidden="true">
        <div ref={cardRef}>
          <ShareCard {...cardProps} />
        </div>
      </div>
    </div>
  );
};

export default ShareImageModal;
