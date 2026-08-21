// Browser-side image optimizer for the admin uploader.
//
// The admin used to reject anything over 300 KB and tell the human to go run
// `sharp-cli` or ImageMagick by hand (the recipe in CLAUDE.md). This does that
// work in the tab instead: decode, resize to the page's max edge, then walk a
// quality — and if needed a dimension — ladder until the encoded bytes fit.
//
// No dependency: `createImageBitmap` + `canvas.toBlob` is enough, and the site
// is otherwise dependency-light. The trade-off is that the search loop runs on
// the main thread, which is why the ladders are short and the caller gets an
// `onProgress` callback to keep the UI honest about the pause.
//
// The numbers below are CLAUDE.md's targets. Keep the two in sync.

const TARGET_BYTES = 150 * 1024;
const HARD_CAP_BYTES = 300 * 1024;
const MAX_LANDSCAPE = 1200;
const MAX_PORTRAIT = 900;

// Refuse before decoding: a 100 MP source expands to ~400 MB of RGBA and takes
// the tab down with it. Nothing a phone or camera produces comes near this.
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

const QUALITY_LADDER = [0.85, 0.78, 0.7, 0.62, 0.55, 0.5];
// Applied to the max edge, then rounded to a round number of pixels:
// 1200 → 1000 → 800 → 640 for landscape, 900 → 750 → 600 → 480 for portrait.
const EDGE_LADDER_FACTORS = [1, 0.833, 0.667, 0.533];

// Formats that can carry an alpha channel, and so are worth scanning for one.
const ALPHA_CAPABLE = new Set(["image/png", "image/webp", "image/gif", "image/avif"]);
// Formats we can hand back untouched when they are already small enough.
const ALREADY_OPTIMAL = new Set(["image/jpeg", "image/webp"]);

const HEIC_RE = /\.(heic|heif)$/i;

export class ImageCompressError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ImageCompressError";
    this.code = code;
  }
}

export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

// CLAUDE.md caps portrait tighter than landscape — a tall image at 1200px eats
// far more of a phone screen than a wide one does. Never upscale.
export const maxEdgeFor = (width, height) => {
  const cap = height > width ? MAX_PORTRAIT : MAX_LANDSCAPE;
  return Math.min(cap, Math.max(width, height));
};

// Scale a natural size down so its long edge is exactly `edge`.
export const fitTo = (width, height, edge) => {
  const scale = Math.min(1, edge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/**
 * Searches the quality × dimension space for the smallest acceptable encode.
 *
 * `encode(width, height, quality)` resolves to a Blob — it is injected rather
 * than baked in so this, the part with the actual decision logic, is testable
 * without a canvas (jsdom has no `toBlob`).
 *
 * Returns the first encode at or under TARGET_BYTES. Failing that, the smallest
 * one seen, provided it clears HARD_CAP_BYTES. Failing that, throws.
 */
export const pickEncoding = async ({ width, height, encode, onAttempt }) => {
  const edge = maxEdgeFor(width, height);
  const steps = EDGE_LADDER_FACTORS.map((f) => Math.max(1, Math.round((edge * f) / 10) * 10));
  const total = steps.length * QUALITY_LADDER.length;

  let done = 0;
  let best = null;

  for (let s = 0; s < steps.length; s += 1) {
    const size = fitTo(width, height, steps[s]);

    for (let q = 0; q < QUALITY_LADDER.length; q += 1) {
      // Sequential on purpose: each attempt may end the search, and running the
      // whole grid in parallel would encode two dozen full-size canvases at once.
      // eslint-disable-next-line no-await-in-loop
      const blob = await encode(size.width, size.height, QUALITY_LADDER[q]);
      done += 1;
      if (onAttempt) onAttempt(done, total);

      const candidate = { blob, ...size, quality: QUALITY_LADDER[q] };
      if (!best || blob.size < best.blob.size) best = candidate;
      if (blob.size <= TARGET_BYTES) return candidate;
    }
  }

  if (best && best.blob.size <= HARD_CAP_BYTES) return best;
  throw new ImageCompressError(
    "cannot-fit",
    `Couldn't get this image under ${formatBytes(HARD_CAP_BYTES)} — smallest was ${formatBytes(best ? best.blob.size : 0)}. Try cropping it first.`,
  );
};

// `createImageBitmap` applies EXIF orientation for us, which the <img> fallback
// does not — but the fallback only runs on browsers too old to have the option,
// and those are the same ones that auto-orient in the decoder anyway.
const decode = async (file) => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some builds reject the options bag rather than ignoring it.
      try {
        return await createImageBitmap(file);
      } catch { /* fall through to the <img> path */ }
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new ImageCompressError("decode-failed", "This file isn't a readable image."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

const naturalSize = (source) => ({
  width: source.width || source.naturalWidth,
  height: source.height || source.naturalHeight,
});

// A PNG that declares alpha usually doesn't use it. Scan a thumbnail rather
// than the full bitmap — one transparent pixel anywhere survives the downscale
// as a sub-255 alpha, and this keeps the check to a few hundred KB of pixels.
const hasAlpha = (source, width, height) => {
  const edge = 256;
  const size = fitTo(width, height, edge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(source, 0, 0, size.width, size.height);
  const { data } = ctx.getImageData(0, 0, size.width, size.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
};

const drawTo = (source, width, height, type, quality) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageCompressError("decode-failed", "This browser can't render the image to a canvas.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // JPEG has no alpha; without a matte, transparent pixels encode as black.
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob
        ? resolve(blob)
        : reject(new ImageCompressError("decode-failed", "The browser failed to encode the image."))),
      type,
      quality,
    );
  });
};

const baseName = (name) => name
  .replace(/\.[^.]+$/, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "") || "image";

/**
 * Compresses `file` to the site's targets.
 *
 * Resolves `{ file, original, final, format, skipped }` where `file` is a real
 * File (not a Blob) with a corrected lowercase extension — `src/lib/api/storage.js`
 * derives the stored object's path from `file.name`, so a bare Blob or a stale
 * `.png` name would put the wrong extension in the bucket.
 *
 * `onProgress({ stage, value })` fires with stage `"analyzing" | "encoding"` and
 * a 0..1 value. The upload itself is the caller's business.
 */
export const compressImage = async (file, { onProgress } = {}) => {
  const report = (stage, value) => { if (onProgress) onProgress({ stage, value }); };

  if (HEIC_RE.test(file.name) || /heic|heif/i.test(file.type)) {
    throw new ImageCompressError(
      "heic",
      `${file.name} is HEIC — Chrome and Firefox can't read it. Convert it first: convert ${file.name} -auto-orient -strip -quality 80 -resize "1200x>" out.jpeg`,
    );
  }
  if (!file.type.startsWith("image/")) {
    throw new ImageCompressError("not-an-image", `${file.name} is not an image.`);
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageCompressError(
      "too-large-input",
      `${file.name} is ${formatBytes(file.size)} — too big to process in the browser. Resize it first.`,
    );
  }

  report("analyzing", 0);
  const source = await decode(file);

  try {
    const { width, height } = naturalSize(source);
    if (!width || !height) {
      throw new ImageCompressError("decode-failed", "This file isn't a readable image.");
    }

    // Already small, already within bounds, already a format we'd emit: hand it
    // back untouched. Re-encoding only costs quality.
    const withinBounds = Math.max(width, height) <= (height > width ? MAX_PORTRAIT : MAX_LANDSCAPE);
    if (ALREADY_OPTIMAL.has(file.type) && file.size <= TARGET_BYTES && withinBounds) {
      report("encoding", 1);
      return {
        file,
        original: { bytes: file.size, width, height },
        final: { bytes: file.size, width, height },
        format: file.type === "image/webp" ? "WEBP" : "JPEG",
        skipped: true,
      };
    }

    const alpha = ALPHA_CAPABLE.has(file.type) && hasAlpha(source, width, height);
    // WebP only where transparency is actually in play — the bucket and the
    // rest of the site are .jpeg by convention.
    const type = alpha ? "image/webp" : "image/jpeg";
    const ext = alpha ? "webp" : "jpeg";

    report("analyzing", 1);
    const picked = await pickEncoding({
      width,
      height,
      encode: (w, h, quality) => drawTo(source, w, h, type, quality),
      onAttempt: (done, total) => report("encoding", done / total),
    });

    return {
      file: new File([picked.blob], `${baseName(file.name)}.${ext}`, {
        type,
        lastModified: Date.now(),
      }),
      original: { bytes: file.size, width, height },
      final: { bytes: picked.blob.size, width: picked.width, height: picked.height },
      format: ext.toUpperCase(),
      skipped: false,
    };
  } finally {
    if (typeof source.close === "function") source.close();
  }
};

export const limits = { TARGET_BYTES, HARD_CAP_BYTES, MAX_LANDSCAPE, MAX_PORTRAIT, MAX_INPUT_BYTES };
