import { useCallback, useState } from "react";
import { toPng } from "html-to-image";

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

// Resolve once an <img> has decoded — but never block the export indefinitely.
const imageReady = (img) => {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  const decoded = typeof img.decode === "function"
    ? img.decode().catch(() => {})
    : new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  return Promise.race([decoded, wait(3000)]);
};

// Fonts (Noto Serif / Inter / Plus Jakarta / Material Symbols) and every image
// must be ready before snapshotting, or the PNG falls back to system fonts /
// blank images.
const waitForAssets = async (node) => {
  if (document.fonts && document.fonts.ready) {
    await Promise.race([document.fonts.ready, wait(3000)]);
  }
  await Promise.all(Array.from(node.querySelectorAll("img")).map(imageReady));
};

const triggerDownload = (dataUrl, fileName) => {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
};

// Hook wrapping html-to-image plus the Web Share API. `exportNode` snapshots a
// DOM node to a 2x PNG and either downloads it or hands it to the native share
// sheet (falling back to a download where file sharing is unsupported).
const useImageExport = () => {
  const [status, setStatus] = useState("idle"); // idle | working | done | error

  const render = useCallback(async (node, backgroundColor) => {
    await waitForAssets(node);
    const options = { pixelRatio: 2, cacheBust: true, backgroundColor };
    // iOS Safari often drops the first foreignObject paint; a warm-up pass
    // makes the real capture reliable across browsers.
    await toPng(node, options);
    return toPng(node, options);
  }, []);

  const exportNode = useCallback(async (node, {
    fileName, title, backgroundColor, mode = "download",
  }) => {
    if (!node || status === "working") return;
    setStatus("working");
    try {
      const dataUrl = await render(node, backgroundColor);
      if (mode === "share") {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title });
        } else {
          triggerDownload(dataUrl, fileName);
        }
      } else {
        triggerDownload(dataUrl, fileName);
      }
      setStatus("done");
    } catch (err) {
      // The user dismissing the share sheet rejects with AbortError — not a real
      // failure, so reset quietly instead of flashing an error state.
      setStatus(err && err.name === "AbortError" ? "idle" : "error");
    }
    setTimeout(() => setStatus("idle"), 2500);
  }, [render, status]);

  return { status, exportNode };
};

export default useImageExport;
