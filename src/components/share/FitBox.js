import React, { useLayoutEffect, useRef } from "react";

// Shrinks its contents until they fit the space the layout gives it.
//
// Everything inside sizes its type as `calc(<px> * var(--k, 1))`. FitBox
// binary-searches k between `minK` and 1 by measuring the real DOM, so no
// estimate has to be right: long Marathi posts, handwriting faces and photos all
// fit by measurement. When even `minK` overflows, the body is line-clamped (the
// `data-clamp` element) so the frame is never broken.
//
// It sets the variable imperatively in a layout effect: the preview and the
// off-screen capture card each measure themselves, and since both are 1080 px
// wide they settle on the same k. A ResizeObserver and the font-loading events
// re-fit once faces and photos arrive.
const STEPS = 8;

const FitBox = ({
  fixed, minK = 0.42, valign = "top", align = "stretch", gap = 0, fitKey, style, children,
}) => {
  const outer = useRef(null);
  const inner = useRef(null);

  useLayoutEffect(() => {
    const box = outer.current;
    const el = inner.current;
    if (!box || !el) return undefined;
    const clampEl = () => el.querySelector("[data-clamp]");

    const fits = () => el.scrollHeight <= box.clientHeight + 1 && el.scrollWidth <= box.clientWidth + 1;

    const fit = () => {
      const c = clampEl();
      if (c) {
        c.style.display = "";
        c.style.webkitLineClamp = "";
        c.style.webkitBoxOrient = "";
        c.style.overflow = "";
      }
      el.style.setProperty("--k", "1");
      if (!fixed || fits()) return;
      let lo = minK;
      let hi = 1;
      for (let i = 0; i < STEPS; i += 1) {
        const mid = (lo + hi) / 2;
        el.style.setProperty("--k", String(mid));
        if (fits()) lo = mid; else hi = mid;
      }
      el.style.setProperty("--k", String(lo));
      if (!fits() && c) {
        // Still too long at the smallest size: clamp the body to what is left.
        const lineH = parseFloat(getComputedStyle(c).lineHeight) || 40;
        const over = el.scrollHeight - box.clientHeight;
        const lines = Math.max(2, Math.floor((c.offsetHeight - over) / lineH));
        c.style.display = "-webkit-box";
        c.style.webkitLineClamp = String(lines);
        c.style.webkitBoxOrient = "vertical";
        c.style.overflow = "hidden";
      }
    };

    fit();
    let alive = true;
    const refit = () => { if (alive) fit(); };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(refit) : null;
    if (ro) ro.observe(box);
    const fonts = typeof document !== "undefined" ? document.fonts : null;
    if (fonts && fonts.ready) fonts.ready.then(refit).catch(() => {});
    if (fonts && fonts.addEventListener) fonts.addEventListener("loadingdone", refit);
    el.querySelectorAll("img").forEach((img) => { if (!img.complete) img.addEventListener("load", refit, { once: true }); });
    return () => {
      alive = false;
      if (ro) ro.disconnect();
      if (fonts && fonts.removeEventListener) fonts.removeEventListener("loadingdone", refit);
    };
  }, [fixed, minK, fitKey]);

  const justify = { top: "flex-start", middle: "center", bottom: "flex-end" }[valign] || "flex-start";
  return (
    <div
      ref={outer}
      style={{
        flex: "1 1 0", minHeight: fixed ? 0 : undefined, display: "flex", flexDirection: "column", justifyContent: justify, overflow: fixed ? "hidden" : "visible", ...style,
      }}
    >
      <div ref={inner} style={{ display: "flex", flexDirection: "column", alignItems: align, gap, flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
};

export default FitBox;
