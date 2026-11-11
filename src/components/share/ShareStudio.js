import React, {
  memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { SITE_NAME } from "../../data/pageMeta";
import { useOptionalTags } from "../../context/ContentContext";
import { colorForTag, hashString } from "../../lib/generativeArt";
import { suggestShareDesigns } from "../../lib/api/assist";
import useSession from "../../pages/admin/useSession";
import ShareCard from "./ShareCard";
import { toShareModel } from "./shareCardConfig";
import {
  ASPECTS, ASPECT_BY_ID, LAYOUTS, OPTIONS, REMEMBERED, defaultDesign, highlightSegments, sanitizeDesign, sentencesOf,
} from "./shareDesign";
import { localSuggestions, pairingForLang } from "./presets";
import { FAMILIES, THEMES, themeFor } from "./themes";
import { PAIRINGS, loadShareFonts, pairingFor, pairingSupports } from "./typography";
import useImageExport from "./useImageExport";

// The share studio: one live preview and six tabs of choices for turning any
// entry — micro-post, book, blog, race, trek, Instagram post, /ask answer or
// newsletter — into a 1080 px image. Opened through ShareImageModal (lazy), so
// none of this ships until someone presses "Share as image".
//
// What it draws is ShareCard(model, design, edits): `model` from the per-kind
// adapters, `design` every option here, `edits` the text as changed in the Text
// tab (never written back). The preview and the full-size capture node are the
// same component with the same props.

const STORE_KEY = (kind) => `share-studio:v2:${kind}`;

const readStored = (kind) => {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY(kind)) || "null");
  } catch (_) {
    return null;
  }
};

const writeStored = (kind, design) => {
  try {
    const keep = Object.fromEntries(REMEMBERED.map((k) => [k, design[k]]));
    window.localStorage.setItem(STORE_KEY(kind), JSON.stringify(keep));
  } catch (_) { /* private mode: remembering is a convenience */ }
};

const keyActivate = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

const TABS = [
  { id: "suggested", label: "Ideas", icon: "auto_awesome" },
  { id: "text", label: "Text", icon: "edit_note" },
  { id: "theme", label: "Theme", icon: "palette" },
  { id: "type", label: "Type", icon: "text_fields" },
  { id: "layout", label: "Layout", icon: "dashboard" },
  { id: "details", label: "Details", icon: "tune" },
];

const ACCENT_SWATCHES = ["#b22200", "#e11d48", "#f59e0b", "#a5842c", "#16a34a", "#0d9488", "#2563eb", "#7c3aed", "#db2777", "#111111"];

// ---- Small controls --------------------------------------------------------

const Label = ({ children, hint }) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="font-label text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">{children}</span>
    {hint ? <span className="text-[11px] text-stone-400 dark:text-stone-500">{hint}</span> : null}
  </div>
);

const Segmented = ({
  options, value, onChange, label, hint,
}) => (
  <div className="flex flex-col gap-2">
    {label ? <Label hint={hint}>{label}</Label> : null}
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <div
            key={o.id}
            role="radio"
            aria-checked={active}
            tabIndex={0}
            title={o.note || o.label}
            onClick={() => onChange(o.id)}
            onKeyDown={keyActivate(() => onChange(o.id))}
            className={`flex min-w-[2.5rem] flex-1 cursor-pointer select-none items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-center font-label text-[11px] font-bold uppercase tracking-wider transition-all ${
              active
                ? "bg-white text-secondary shadow-sm dark:bg-stone-950"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
            }`}
          >
            {o.icon ? <span className="material-symbols-outlined text-base leading-none">{o.icon}</span> : null}
            {o.icon && o.iconOnly ? null : <span>{o.label}</span>}
          </div>
        );
      })}
    </div>
  </div>
);

const Toggle = ({ label, value, onChange, hint }) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <div className="flex flex-col">
      <span className="text-sm text-stone-700 dark:text-stone-200">{label}</span>
      {hint ? <span className="text-[11px] text-stone-400">{hint}</span> : null}
    </div>
    <div
      role="switch"
      tabIndex={0}
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      onKeyDown={keyActivate(() => onChange(!value))}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${value ? "bg-secondary" : "bg-stone-300 dark:bg-stone-700"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
    </div>
  </div>
);

const Section = ({ children }) => <div className="flex flex-col gap-4 border-b border-stone-100 pb-5 last:border-0 dark:border-stone-800">{children}</div>;

// A whole card shrunk to a thumbnail. Memoised: the tabs render dozens.
const MiniCard = memo(({
  model, design, edits, colors, width,
}) => {
  const h = ASPECT_BY_ID[design.aspect]?.h || 1350;
  const scale = width / 1080;
  return (
    <div className="overflow-hidden rounded-md" style={{ width, height: h * scale }} aria-hidden="true">
      <div style={{ width: 1080, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
        <ShareCard model={model} design={design} edits={edits} colors={colors} />
      </div>
    </div>
  );
});

const Pick = ({
  active, onClick, title, children, className = "",
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-pressed={active}
    title={title}
    onClick={onClick}
    onKeyDown={keyActivate(onClick)}
    className={`group flex cursor-pointer flex-col gap-1.5 rounded-xl p-1.5 transition-all ${
      active ? "bg-secondary/10 ring-2 ring-secondary" : "hover:bg-stone-100 dark:hover:bg-stone-800"
    } ${className}`}
  >
    {children}
  </div>
);

// One of Download / Share / Copy.
const ActionButton = ({
  onClick, icon, children, primary,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={keyActivate(onClick)}
    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-3 font-label text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${
      primary
        ? "bg-secondary text-white hover:opacity-90"
        : "border border-stone-200 text-stone-600 hover:border-secondary hover:text-secondary dark:border-stone-700 dark:text-stone-300"
    }`}
  >
    <span className="material-symbols-outlined text-base">{icon}</span>
    {children}
  </div>
);

// ---- The studio ------------------------------------------------------------

const ShareStudio = ({ kind, item, onClose }) => {
  const model = useMemo(() => toShareModel(kind, item), [kind, item]);
  const lang = model?.lang || "en";
  const hasStats = (model?.stats || []).length > 0;

  const initial = useMemo(() => {
    if (!model) return null;
    const base = defaultDesign(kind, model);
    const stored = typeof window !== "undefined" ? readStored(kind) : null;
    const merged = sanitizeDesign(stored || {}, base, lang);
    if (merged.layout === "polaroid" && !model.imageUrl) merged.layout = base.layout;
    if (merged.layout === "ticket" && !hasStats) merged.layout = base.layout;
    merged.includeImage = base.includeImage;
    return merged;
  }, [kind, model, lang, hasStats]);

  const [design, setDesign] = useState(initial);
  const [edits, setEdits] = useState({ title: null, body: null, highlight: "" });
  const [picked, setPicked] = useState([]);
  const [tab, setTab] = useState("suggested");
  const [photoColor, setPhotoColor] = useState(null);
  const [ai, setAi] = useState({ status: "idle", designs: [], tier: null, error: "" });
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [canCopy, setCanCopy] = useState(false);

  const session = useSession();
  const isOwner = Boolean(session);
  // Works outside <ContentProvider> too (tests, a future embed): no tags, no
  // stored colours, and the hue hashed from the name stands in.
  const allTags = useOptionalTags();
  const tagColor = useMemo(() => {
    const first = (model?.tags || [])[0];
    if (!first) return null;
    const row = allTags.find((t) => String(t.name).toLowerCase() === String(first).toLowerCase());
    return colorForTag(String(first).toLowerCase(), row?.color);
  }, [model, allTags]);
  const colors = useMemo(() => ({ photoColor, tagColor }), [photoColor, tagColor]);

  const { status, exportNode } = useImageExport();
  const dialogRef = useRef(null);
  const cardRef = useRef(null);
  const previewBoxRef = useRef(null);
  const [box, setBox] = useState({ w: 320, h: 420 });
  const [cardH, setCardH] = useState(1350);

  const update = useCallback((patch) => setDesign((d) => ({ ...d, ...patch })), []);

  useEffect(() => { if (design) writeStored(kind, design); }, [kind, design]);
  useEffect(() => { loadShareFonts(); }, []);

  useEffect(() => {
    try {
      const probe = new File([""], "probe.png", { type: "image/png" });
      setCanShareFiles(Boolean(navigator.canShare && navigator.canShare({ files: [probe] })));
    } catch (_) {
      setCanShareFiles(false);
    }
    setCanCopy(typeof window !== "undefined" && "ClipboardItem" in window && Boolean(navigator.clipboard?.write));
  }, []);

  // The photo's own colour for the "From photo" theme: averaged on a tiny
  // canvas, weighted toward saturated pixels so a grey sky does not win.
  useEffect(() => {
    if (!model?.imageUrl || typeof Image === "undefined") return undefined;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 24, 24);
        const { data } = ctx.getImageData(0, 0, 24, 24);
        let r = 0; let g = 0; let b = 0; let w = 0;
        for (let i = 0; i < data.length; i += 4) {
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          const weight = 0.15 + (max - min) / 255;
          r += data[i] * weight; g += data[i + 1] * weight; b += data[i + 2] * weight; w += weight;
        }
        const hex = `#${[r, g, b].map((v) => Math.round(v / w).toString(16).padStart(2, "0")).join("")}`;
        if (alive) setPhotoColor(hex);
      } catch (_) { /* a tainted canvas: the photo theme just stays hidden */ }
    };
    img.src = model.imageUrl;
    return () => { alive = false; };
  }, [model]);

  // Escape closes the studio without closing a host modal underneath (capture
  // phase runs first and stops it); Tab stays inside the dialog.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const nodes = Array.from(dialogRef.current.querySelectorAll('[tabindex="0"], input, textarea, button, select'))
          .filter((n) => !n.disabled && n.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  useEffect(() => {
    if (dialogRef.current) dialogRef.current.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useLayoutEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const measure = () => setCardH(el.offsetHeight || 1350);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const themeList = useMemo(() => {
    const ids = THEMES.map((t) => t.id);
    if (photoColor) ids.push("photo");
    if (tagColor) ids.push("tags");
    return ids;
  }, [photoColor, tagColor]);

  const cycleTheme = useCallback((step) => {
    setDesign((d) => {
      const i = themeList.indexOf(d.theme);
      return { ...d, theme: themeList[(i + step + themeList.length) % themeList.length] };
    });
  }, [themeList]);

  // ←/→ cycle themes unless a text field has focus.
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowRight") cycleTheme(1);
      if (e.key === "ArrowLeft") cycleTheme(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cycleTheme]);

  const usableLayouts = useMemo(() => LAYOUTS.filter((l) => (l.id !== "polaroid" || model?.imageUrl) && (l.id !== "ticket" || hasStats)), [model, hasStats]);

  const shuffle = () => {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const theme = pick(THEMES);
    const suited = usableLayouts.filter((l) => l.suits.includes(kind));
    const layout = pick(suited.length ? suited : usableLayouts).id;
    const compatible = PAIRINGS.filter((p) => pairingSupports(p, lang));
    const pairing = theme.fontHint && Math.random() < 0.6 ? pairingForLang(theme.fontHint, lang) : pick(compatible).id;
    update({
      theme: theme.id, layout, pairing, align: pick(["left", "left", "center"]), valign: pick(["top", "middle", "bottom"]), accent: null,
    });
  };

  const suggestions = useMemo(() => (model ? localSuggestions(kind, model, { lang }) : []), [kind, model, lang]);
  const sentences = useMemo(() => sentencesOf(model?.body || ""), [model]);

  const applySuggestion = (s) => {
    setDesign((d) => sanitizeDesign(s.design, d, lang));
    if (s.excerpt) {
      setEdits((e) => ({ ...e, body: s.excerpt }));
      setPicked([]);
    }
  };

  const askAi = async () => {
    setAi({ status: "working", designs: [], tier: null, error: "" });
    try {
      const { designs, tier } = await suggestShareDesigns({
        kind,
        title: model.title,
        text: model.body,
        lang,
        hasImage: Boolean(model.imageUrl),
        tags: model.tags || [],
        stats: model.stats || [],
      });
      setAi({
        status: "done", designs, tier, error: designs.length ? "" : "No usable designs came back.",
      });
    } catch (err) {
      setAi({
        status: "error", designs: [], tier: null, error: err.message || "Could not reach the model.",
      });
    }
  };

  const togglePicked = (i) => {
    setPicked((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b);
      setEdits((e) => ({ ...e, body: next.length ? next.map((n) => sentences[n]).join(" ") : null }));
      return next;
    });
  };

  if (!model || !design) return null;

  const scale = Math.min(box.w / 1080, (box.h || 9999) / cardH);
  const resolvedTheme = themeFor(design.theme, colors);
  const fileName = `${kind}-${item?.id || hashString(model.footerUrl || "card")}-${design.theme}.png`;
  const runExport = (mode) => exportNode(cardRef.current, {
    fileName,
    title: model.title || SITE_NAME,
    backgroundColor: resolvedTheme.base,
    mode,
  });
  const highlightMissing = edits.highlight
    && highlightSegments(edits.body ?? model.body ?? "", edits.highlight).every((s) => !s.mark)
    && highlightSegments(edits.title ?? model.title ?? "", edits.highlight).every((s) => !s.mark);
  const sample = (model.title || model.body || "Aa").replace(/\s+/g, " ").slice(0, 18);
  const thumbW = 132;

  let aiLabel = "Ask AI for four looks";
  if (ai.status === "working") aiLabel = "Reading the post…";
  else if (ai.designs.length) aiLabel = "Ask again";

  const panels = {
    suggested: (
      <div className="flex flex-col gap-5">
        <Section>
          <Label hint="tap to apply">Made for this post</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {suggestions.map((s) => (
              <Pick key={s.id} title={s.why} onClick={() => applySuggestion(s)}>
                <MiniCard model={model} design={{ ...design, ...s.design }} edits={edits} colors={colors} width={thumbW} />
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-100">{s.label}</span>
                <span className="text-[11px] leading-snug text-stone-500 dark:text-stone-400">{s.why}</span>
              </Pick>
            ))}
          </div>
        </Section>
        {isOwner ? (
          <Section>
            <Label hint={ai.tier ? `answered by ${ai.tier}` : "owner only"}>AI picks</Label>
            <div
              role="button"
              tabIndex={0}
              onClick={ai.status === "working" ? undefined : askAi}
              onKeyDown={keyActivate(askAi)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-secondary/60 px-4 py-3 font-label text-xs font-bold uppercase tracking-widest text-secondary transition-colors hover:bg-secondary/5"
            >
              <span className={`material-symbols-outlined text-base ${ai.status === "working" ? "animate-spin" : ""}`}>{ai.status === "working" ? "progress_activity" : "auto_awesome"}</span>
              {aiLabel}
            </div>
            {ai.error ? <p className="text-xs text-red-600 dark:text-red-400">{ai.error}</p> : null}
            {ai.designs.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ai.designs.map((s) => (
                  <Pick key={s.id} title={s.why} onClick={() => applySuggestion(s)}>
                    <MiniCard model={model} design={{ ...design, ...s.design }} edits={s.excerpt ? { ...edits, body: s.excerpt } : edits} colors={colors} width={thumbW} />
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-100">{s.label}</span>
                    <span className="text-[11px] leading-snug text-stone-500 dark:text-stone-400">{s.why}</span>
                  </Pick>
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}
        <p className="text-[11px] leading-relaxed text-stone-400">
          Ideas are picked on your device from the post&apos;s language, length, photo, tags and — for micro-posts — the hour it was written. Swipe the preview or press ← → to try every theme.
        </p>
      </div>
    ),

    text: (
      <div className="flex flex-col gap-5">
        <Section>
          {model.title ? (
            <label htmlFor="ss-title" className="flex flex-col gap-2">
              <Label>Title</Label>
              <input
                id="ss-title"
                value={edits.title ?? model.title}
                onChange={(e) => setEdits((x) => ({ ...x, title: e.target.value }))}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-secondary dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </label>
          ) : null}
          <label htmlFor="ss-body" className="flex flex-col gap-2">
            <Label hint="only on the image — the post is not changed">Text</Label>
            <textarea
              id="ss-body"
              rows={6}
              value={edits.body ?? model.body ?? ""}
              onChange={(e) => { setPicked([]); setEdits((x) => ({ ...x, body: e.target.value })); }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-stone-800 outline-none focus:border-secondary dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              lang={lang === "mr" ? "mr" : "en"}
            />
          </label>
          {sentences.length > 1 ? (
            <div className="flex flex-col gap-2">
              <Label hint="tap one or more lines to quote just those">Pick the line</Label>
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto pr-1">
                {sentences.map((s, i) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    role="checkbox"
                    aria-checked={picked.includes(i)}
                    tabIndex={0}
                    onClick={() => togglePicked(i)}
                    onKeyDown={keyActivate(() => togglePicked(i))}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-left text-[13px] leading-snug transition-colors ${
                      picked.includes(i)
                        ? "border-secondary bg-secondary/10 text-stone-900 dark:text-stone-50"
                        : "border-stone-200 text-stone-600 hover:border-stone-400 dark:border-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div
            role="button"
            tabIndex={0}
            onClick={() => { setPicked([]); setEdits({ title: null, body: null, highlight: "" }); }}
            onKeyDown={keyActivate(() => { setPicked([]); setEdits({ title: null, body: null, highlight: "" }); })}
            className="self-start cursor-pointer font-label text-[11px] font-bold uppercase tracking-widest text-stone-400 hover:text-secondary"
          >
            Reset text
          </div>
        </Section>
        <Section>
          <label htmlFor="ss-highlight" className="flex flex-col gap-2">
            <Label hint={highlightMissing ? "not found in the text" : "a few words from the text"}>Highlight a phrase</Label>
            <input
              id="ss-highlight"
              value={edits.highlight}
              placeholder={sentences[0] ? sentences[0].split(/\s+/).slice(0, 3).join(" ") : ""}
              onChange={(e) => setEdits((x) => ({ ...x, highlight: e.target.value }))}
              className={`rounded-lg border bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-secondary dark:bg-stone-950 dark:text-stone-100 ${highlightMissing ? "border-amber-400" : "border-stone-200 dark:border-stone-700"}`}
            />
          </label>
          <Segmented label="Highlight style" options={OPTIONS.highlightStyle} value={design.highlightStyle} onChange={(v) => update({ highlightStyle: v })} />
          <Segmented label="Quote marks" options={OPTIONS.quoteMarks} value={design.quoteMarks} onChange={(v) => update({ quoteMarks: v })} />
        </Section>
      </div>
    ),

    theme: (
      <div className="flex flex-col gap-5">
        {FAMILIES.map((fam) => {
          const list = fam.id === "adaptive"
            ? [photoColor ? themeFor("photo", colors) : null, tagColor ? themeFor("tags", colors) : null].filter(Boolean)
            : THEMES.filter((t) => t.family === fam.id);
          if (!list.length) return null;
          return (
            <div key={fam.id} className="flex flex-col gap-2">
              <Label>{fam.label}</Label>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {list.map((t) => (
                  <Pick key={t.id} active={design.theme === t.id} onClick={() => update({ theme: t.id })} title={`${t.label} — ${t.note}`}>
                    <div
                      className="relative flex h-14 items-end overflow-hidden rounded-lg border border-black/10 p-1.5"
                      style={{ background: t.background }}
                    >
                      {t.overlay ? <span className="absolute inset-0" style={t.overlay} /> : null}
                      <span className="absolute left-0 right-0 top-0 h-1" style={{ background: t.accent }} />
                      <span className="relative text-lg font-bold leading-none" style={{ color: t.titleInk || t.ink, fontFamily: pairingFor(t.fontHint || design.pairing).display }}>Aa</span>
                      <span className="relative ml-auto h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} />
                    </div>
                    <span className={`truncate text-center text-[10px] uppercase tracking-wider ${design.theme === t.id ? "font-bold text-secondary" : "text-stone-500 dark:text-stone-400"}`}>{t.label}</span>
                  </Pick>
                ))}
              </div>
            </div>
          );
        })}
        <Section>
          <Label hint={design.accent ? design.accent : "theme default"}>Accent colour</Label>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_SWATCHES.map((hex) => (
              <span
                key={hex}
                role="button"
                tabIndex={0}
                aria-label={`Accent ${hex}`}
                aria-pressed={design.accent === hex}
                onClick={() => update({ accent: hex })}
                onKeyDown={keyActivate(() => update({ accent: hex }))}
                className={`h-7 w-7 cursor-pointer rounded-full border border-black/10 ${design.accent === hex ? "ring-2 ring-secondary ring-offset-2 dark:ring-offset-stone-900" : ""}`}
                style={{ background: hex }}
              />
            ))}
            <label htmlFor="ss-accent" className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-stone-400" title="Any colour">
              <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-sm text-stone-500">colorize</span>
              <input
                id="ss-accent"
                type="color"
                value={design.accent || resolvedTheme.accent}
                onChange={(e) => update({ accent: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Custom accent colour"
              />
            </label>
            {design.accent ? (
              <span
                role="button"
                tabIndex={0}
                onClick={() => update({ accent: null })}
                onKeyDown={keyActivate(() => update({ accent: null }))}
                className="cursor-pointer font-label text-[11px] font-bold uppercase tracking-widest text-stone-400 hover:text-secondary"
              >
                Reset
              </span>
            ) : null}
          </div>
        </Section>
      </div>
    ),

    type: (
      <div className="flex flex-col gap-5">
        {[["Latin", PAIRINGS.filter((p) => !p.scripts.includes("devanagari"))], ["Marathi + English", PAIRINGS.filter((p) => p.scripts.includes("devanagari"))]].map(([group, list]) => (
          <div key={group} className="flex flex-col gap-2">
            <Label hint={group === "Latin" && lang === "mr" ? "cannot set this Marathi post" : null}>{group}</Label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {list.map((p) => {
                const ok = pairingSupports(p, lang);
                return (
                  <Pick
                    key={p.id}
                    active={design.pairing === p.id}
                    onClick={ok ? () => update({ pairing: p.id }) : () => {}}
                    title={`${p.label} — ${p.note}`}
                    className={ok ? "" : "pointer-events-none opacity-35"}
                  >
                    <span className="truncate text-xl leading-tight text-stone-900 dark:text-stone-50" style={{ fontFamily: p.display, fontWeight: p.displayWeight }}>{sample}</span>
                    <span className="truncate text-[11px] text-stone-500 dark:text-stone-400" style={{ fontFamily: p.body }}>{`${p.label} · ${p.note}`}</span>
                  </Pick>
                );
              })}
            </div>
          </div>
        ))}
        <Section>
          <Segmented label="Size" options={OPTIONS.size} value={design.size} onChange={(v) => update({ size: v })} hint="Fit sizes the text to the frame" />
          <Segmented label="Line height" options={OPTIONS.leading} value={design.leading} onChange={(v) => update({ leading: v })} />
          <Segmented label="Letter spacing" options={OPTIONS.tracking} value={design.tracking} onChange={(v) => update({ tracking: v })} />
          <Segmented label="Case" options={OPTIONS.textCase} value={design.textCase} onChange={(v) => update({ textCase: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Segmented label="Weight" options={OPTIONS.weight} value={design.weight} onChange={(v) => update({ weight: v })} />
            <Segmented label="Body in" options={OPTIONS.bodyFace} value={design.bodyFace} onChange={(v) => update({ bodyFace: v })} />
          </div>
        </Section>
      </div>
    ),

    layout: (
      <div className="flex flex-col gap-5">
        <Section>
          <Label hint={`${usableLayouts.length} compositions`}>Layout</Label>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {[...usableLayouts].sort((a, b) => Number(b.suits.includes(kind)) - Number(a.suits.includes(kind))).map((l) => (
              <Pick key={l.id} active={design.layout === l.id} onClick={() => update({ layout: l.id })} title={`${l.label} — ${l.note}`}>
                <MiniCard model={model} design={{ ...design, layout: l.id }} edits={edits} colors={colors} width={96} />
                <span className={`truncate text-center text-[10px] uppercase tracking-wider ${design.layout === l.id ? "font-bold text-secondary" : "text-stone-500 dark:text-stone-400"}`}>{l.label}</span>
              </Pick>
            ))}
          </div>
        </Section>
        <Section>
          <div className="flex flex-col gap-2">
            <Label hint={ASPECT_BY_ID[design.aspect]?.note}>Shape</Label>
            <div className="flex flex-wrap gap-1.5">
              {ASPECTS.map((a) => {
                const active = design.aspect === a.id;
                const ratio = a.h ? a.h / 1080 : 1.5;
                return (
                  <div
                    key={a.id}
                    role="radio"
                    aria-checked={active}
                    tabIndex={0}
                    title={a.note}
                    onClick={() => update({ aspect: a.id })}
                    onKeyDown={keyActivate(() => update({ aspect: a.id }))}
                    className={`flex w-14 cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 ${active ? "bg-secondary/10 text-secondary" : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
                  >
                    <span className="flex h-9 items-end justify-center">
                      <span className={`block rounded-sm border-2 ${active ? "border-secondary" : "border-stone-400"} ${a.h ? "" : "border-dashed"}`} style={{ width: ratio > 1 ? 36 / ratio : 28, height: ratio > 1 ? 36 : 28 * ratio }} />
                    </span>
                    <span className="text-[10px] font-bold">{a.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <Segmented label="Align" options={OPTIONS.align.map((o) => ({ ...o, iconOnly: true }))} value={design.align} onChange={(v) => update({ align: v })} />
          <Segmented label="Vertical" options={OPTIONS.valign.map((o) => ({ ...o, iconOnly: true }))} value={design.valign} onChange={(v) => update({ valign: v })} />
          <Segmented label="Frame" options={OPTIONS.frame} value={design.frame} onChange={(v) => update({ frame: v })} />
          <Segmented label="Margins" options={OPTIONS.padding} value={design.padding} onChange={(v) => update({ padding: v })} />
        </Section>
      </div>
    ),

    details: (
      <div className="flex flex-col gap-2">
        {model.imageUrl ? (
          <Section>
            <Toggle label="Photo" value={design.includeImage} onChange={(v) => update({ includeImage: v })} />
            {design.includeImage ? (
              <div className="grid grid-cols-2 gap-3">
                <Segmented label="Photo size" hint="Full: whole photo, full width" options={OPTIONS.imageSize} value={design.imageSize} onChange={(v) => update({ imageSize: v })} />
                <Segmented label="Photo fit" options={OPTIONS.imageFit} value={design.imageFit} onChange={(v) => update({ imageFit: v })} />
              </div>
            ) : null}
          </Section>
        ) : null}
        <Section>
          <Toggle label="Section label" hint={model.eyebrow} value={design.showEyebrow} onChange={(v) => update({ showEyebrow: v })} />
          {(model.metaRows || []).length ? <Toggle label="Details row" hint="place, distance, language…" value={design.showMeta} onChange={(v) => update({ showMeta: v })} /> : null}
          {model.date ? <Toggle label="Date" value={design.showDate} onChange={(v) => update({ showDate: v })} /> : null}
          {(model.tags || []).length ? <Toggle label="Tags" value={design.showTags} onChange={(v) => update({ showTags: v })} /> : null}
          <Toggle label="Signature" value={design.showSignature} onChange={(v) => update({ showSignature: v })} />
          <Toggle label="Link" hint={model.footerUrl} value={design.showUrl} onChange={(v) => update({ showUrl: v })} />
        </Section>
      </div>
    ),
  };

  const themeName = THEMES.find((t) => t.id === design.theme)?.label || resolvedTheme.label;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Escape is handled on document
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-stone-950/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- only stops the backdrop click */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Share as image"
        tabIndex={-1}
        className="flex h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-stone-800 dark:bg-stone-900 sm:h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-stone-800 sm:px-6">
          <div className="flex min-w-0 flex-col">
            <h2 className="font-headline text-lg text-stone-900 dark:text-stone-100 sm:text-xl">Share as image</h2>
            <span className="truncate text-[11px] text-stone-400">{`${themeName} · ${LAYOUTS.find((l) => l.id === design.layout)?.label} · ${pairingFor(design.pairing).label} · ${ASPECT_BY_ID[design.aspect]?.label}`}</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              role="button"
              tabIndex={0}
              onClick={shuffle}
              onKeyDown={keyActivate(shuffle)}
              title="Surprise me"
              className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-2 font-label text-[11px] font-bold uppercase tracking-widest text-stone-500 transition-colors hover:bg-stone-100 hover:text-secondary dark:hover:bg-stone-800"
            >
              <span className="material-symbols-outlined text-base">shuffle</span>
              <span className="hidden sm:inline">Shuffle</span>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={onClose}
              onKeyDown={keyActivate(onClose)}
              className="cursor-pointer rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
              title="Close"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Preview */}
          <div className="flex shrink-0 flex-col items-center gap-2 bg-stone-100 px-4 py-3 dark:bg-stone-950 sm:w-[46%] sm:justify-center sm:py-6">
            <div ref={previewBoxRef} className="relative flex h-[34dvh] w-full items-start justify-center sm:h-[64vh]">
              <div
                className="relative overflow-hidden rounded-md shadow-xl"
                style={{ width: 1080 * scale, height: cardH * scale }}
                onTouchStart={(e) => { previewBoxRef.current.dataset.x = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                  const dx = e.changedTouches[0].clientX - Number(previewBoxRef.current.dataset.x || 0);
                  if (Math.abs(dx) > 50) cycleTheme(dx < 0 ? 1 : -1);
                }}
              >
                <div style={{ width: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <ShareCard model={model} design={design} edits={edits} colors={colors} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span role="button" tabIndex={0} aria-label="Previous theme" onClick={() => cycleTheme(-1)} onKeyDown={keyActivate(() => cycleTheme(-1))} className="material-symbols-outlined cursor-pointer rounded-full bg-white p-1 text-base text-stone-600 shadow hover:text-secondary dark:bg-stone-800 dark:text-stone-300">chevron_left</span>
              <span className="min-w-[6rem] text-center font-label text-[11px] font-bold uppercase tracking-widest text-stone-500">{themeName}</span>
              <span role="button" tabIndex={0} aria-label="Next theme" onClick={() => cycleTheme(1)} onKeyDown={keyActivate(() => cycleTheme(1))} className="material-symbols-outlined cursor-pointer rounded-full bg-white p-1 text-base text-stone-600 shadow hover:text-secondary dark:bg-stone-800 dark:text-stone-300">chevron_right</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div role="tablist" aria-label="Design" className="flex shrink-0 gap-1 overflow-x-auto border-b border-stone-100 px-2 dark:border-stone-800 sm:px-4">
              {TABS.map((t) => (
                <div
                  key={t.id}
                  role="tab"
                  tabIndex={0}
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  onKeyDown={keyActivate(() => setTab(t.id))}
                  className={`flex shrink-0 cursor-pointer items-center gap-1 border-b-2 px-3 py-3 font-label text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    tab === t.id ? "border-secondary text-secondary" : "border-transparent text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{t.icon}</span>
                  {t.label}
                </div>
              ))}
            </div>
            <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {panels[tab]}
            </div>
            <div className="flex shrink-0 flex-col gap-1 border-t border-stone-100 px-4 py-3 dark:border-stone-800 sm:px-6">
              <div className="flex items-center gap-2">
                <ActionButton primary icon="download" onClick={() => runExport("download")}>Download</ActionButton>
                {canShareFiles ? <ActionButton icon="ios_share" onClick={() => runExport("share")}>Share</ActionButton> : null}
                {canCopy ? <ActionButton icon="content_copy" onClick={() => runExport("copy")}>Copy</ActionButton> : null}
              </div>
              <div className="h-4 text-center font-label text-[11px] uppercase tracking-widest text-stone-400" aria-live="polite">
                {status === "working" && "Drawing the image…"}
                {status === "done" && "Done!"}
                {status === "error" && "Couldn't make the image. Try again."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-resolution capture target, off-screen (never display:none, so
          fonts and images load and html-to-image can measure it). */}
      <div className="pointer-events-none fixed -left-[99999px] top-0" aria-hidden="true">
        <div ref={cardRef}>
          <ShareCard model={model} design={design} edits={edits} colors={colors} />
        </div>
      </div>
    </div>
  );
};

export default ShareStudio;
