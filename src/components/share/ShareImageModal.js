import React, {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { SITE_NAME } from "../../data/pageMeta";
import ShareCard, { themeBase } from "./ShareCard";
import { hasImage, toShareModel } from "./shareCardConfig";
import useImageExport from "./useImageExport";

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const BACKGROUNDS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "abstract", label: "Abstract" },
];

const ASPECTS = [
  { id: "portrait", label: "Portrait" },
  { id: "auto", label: "Auto height" },
];

const SegButton = ({ active, onClick, children }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={keyActivate(onClick)}
    className={`flex-1 cursor-pointer select-none rounded-lg px-3 py-2 text-center font-label text-xs font-bold uppercase tracking-widest transition-colors ${
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

// Customization popup for "Share as image". Renders the chosen ShareCard both
// off-screen at full 1080px (the html-to-image capture target) and as a CSS-
// scaled live preview — same component, same props, one source of truth.
const ShareImageModal = ({ kind, item, onClose }) => {
  const model = useMemo(() => toShareModel(kind, item), [kind, item]);
  const itemHasImage = useMemo(() => hasImage(kind, item), [kind, item]);

  const [background, setBackground] = useState("light");
  const [aspect, setAspect] = useState("portrait");
  const [includeImage, setIncludeImage] = useState(itemHasImage);
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

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const update = () => setCardH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [model, background, aspect, includeImage]);

  if (!model) return null;

  const scale = previewW / 1080;
  const fileName = `${kind}-${item.id}.png`;
  const cardProps = {
    model, background, aspect, includeImage,
  };

  const runExport = (mode) => exportNode(cardRef.current, {
    fileName,
    title: model.title || SITE_NAME,
    backgroundColor: themeBase(background),
    mode,
  });

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-stone-900/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900"
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

          <div className="flex flex-col gap-5 sm:w-1/2">
            <Field label="Background">
              {BACKGROUNDS.map((bg) => (
                <SegButton
                  key={bg.id}
                  active={background === bg.id}
                  onClick={() => setBackground(bg.id)}
                >
                  {bg.label}
                </SegButton>
              ))}
            </Field>

            <Field label="Shape">
              {ASPECTS.map((a) => (
                <SegButton key={a.id} active={aspect === a.id} onClick={() => setAspect(a.id)}>
                  {a.label}
                </SegButton>
              ))}
            </Field>

            {itemHasImage && (
              <div className="flex items-center justify-between">
                <span className="font-label text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  Include image
                </span>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIncludeImage((v) => !v)}
                  onKeyDown={keyActivate(() => setIncludeImage((v) => !v))}
                  className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                    includeImage ? "bg-secondary" : "bg-stone-300 dark:bg-stone-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      includeImage ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </div>
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2">
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
