import {
  ImageCompressError, compressImage, fitTo, formatBytes, limits, maxEdgeFor, pickEncoding,
} from "../../lib/imageCompress";

// jsdom implements neither `createImageBitmap` nor `canvas.toBlob`, which is why
// `pickEncoding` takes an injected `encode` — the ladder logic, the part that
// decides what actually lands in the bucket, is testable without a canvas.
const fakeEncode = (bytesFor) => jest.fn(
  async (width, height, quality) => ({ size: bytesFor(width, height, quality) }),
);

const KB = 1024;

describe("formatBytes", () => {
  it("scales through B, KB and MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(150 * KB)).toBe("150 KB");
    expect(formatBytes(4.2 * KB * KB)).toBe("4.2 MB");
  });

  it("returns a dash rather than NaN for a missing size", () => {
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });
});

describe("maxEdgeFor", () => {
  it("caps landscape and square at 1200, portrait at 900", () => {
    expect(maxEdgeFor(4000, 3000)).toBe(1200);
    expect(maxEdgeFor(3000, 3000)).toBe(1200);
    expect(maxEdgeFor(3000, 4000)).toBe(900);
  });

  it("never upscales an image that is already small", () => {
    expect(maxEdgeFor(640, 480)).toBe(640);
    expect(maxEdgeFor(480, 640)).toBe(640);
  });
});

describe("fitTo", () => {
  it("scales the long edge to the target and keeps the aspect ratio", () => {
    expect(fitTo(4000, 3000, 1200)).toEqual({ width: 1200, height: 900 });
    expect(fitTo(3000, 4000, 900)).toEqual({ width: 675, height: 900 });
  });

  it("leaves an already-smaller image alone", () => {
    expect(fitTo(800, 600, 1200)).toEqual({ width: 800, height: 600 });
  });
});

describe("pickEncoding", () => {
  it("returns the first encode at or under the 150 KB target", async () => {
    // 0.85 lands over target, 0.78 lands under.
    const encode = fakeEncode((w, h, q) => (q >= 0.85 ? 200 * KB : 120 * KB));
    const picked = await pickEncoding({ width: 4000, height: 3000, encode });

    expect(picked.blob.size).toBe(120 * KB);
    expect(picked.quality).toBe(0.78);
    expect(picked.width).toBe(1200);
    expect(encode).toHaveBeenCalledTimes(2);
  });

  it("steps the dimensions down when quality alone can't reach the target", async () => {
    // Size depends only on width, so the whole quality ladder at 1200 fails.
    const encode = fakeEncode((w) => (w > 1000 ? 400 * KB : 100 * KB));
    const picked = await pickEncoding({ width: 4000, height: 3000, encode });

    expect(picked.width).toBe(1000);
    expect(picked.blob.size).toBe(100 * KB);
  });

  it("reports progress across the full quality × dimension grid", async () => {
    const onAttempt = jest.fn();
    const encode = fakeEncode(() => 100 * KB);
    await pickEncoding({ width: 4000, height: 3000, encode, onAttempt });

    // 4 dimension steps × 6 quality steps, even though we stop on the first hit.
    expect(onAttempt).toHaveBeenCalledWith(1, 24);
  });

  it("falls back to the smallest encode when nothing reaches the target but one clears the cap", async () => {
    // Bottoms out at 200 KB — never under the 150 KB target, always under the cap.
    const encode = fakeEncode((w, h, q) => Math.round(400 * KB * q));
    const picked = await pickEncoding({ width: 4000, height: 3000, encode });

    expect(picked.blob.size).toBe(Math.round(400 * KB * 0.5));
    expect(picked.blob.size).toBeLessThanOrEqual(limits.HARD_CAP_BYTES);
    expect(encode).toHaveBeenCalledTimes(24);
  });

  it("throws cannot-fit when even the bottom of both ladders is over the hard cap", async () => {
    const encode = fakeEncode(() => 900 * KB);
    await expect(pickEncoding({ width: 4000, height: 3000, encode }))
      .rejects.toMatchObject({ name: "ImageCompressError", code: "cannot-fit" });
  });
});

describe("compressImage guards", () => {
  const file = (name, type, size = 1024) => {
    const f = new File(["x"], name, { type });
    Object.defineProperty(f, "size", { value: size });
    return f;
  };

  it("rejects HEIC before attempting a decode, with the conversion command", async () => {
    const decoder = jest.fn();
    global.createImageBitmap = decoder;

    await expect(compressImage(file("IMG_0042.HEIC", "")))
      .rejects.toMatchObject({ code: "heic" });
    await expect(compressImage(file("photo.jpg", "image/heic")))
      .rejects.toMatchObject({ code: "heic" });

    const err = await compressImage(file("IMG_0042.heic", "image/heic")).catch((e) => e);
    expect(err).toBeInstanceOf(ImageCompressError);
    expect(err.message).toContain("convert IMG_0042.heic");
    expect(decoder).not.toHaveBeenCalled();
  });

  it("rejects non-images", async () => {
    await expect(compressImage(file("notes.pdf", "application/pdf")))
      .rejects.toMatchObject({ code: "not-an-image" });
  });

  it("refuses an input too large to decode in the tab", async () => {
    await expect(compressImage(file("huge.jpg", "image/jpeg", limits.MAX_INPUT_BYTES + 1)))
      .rejects.toMatchObject({ code: "too-large-input" });
  });
});
