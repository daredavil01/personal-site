// Sheet A-06: the tag loom. Threads weave in from each collection to the
// most-used tags, one thread per pairing, as wide as the rows that share it.
// Then the micro-blog — most of the threads — is lifted off and the loom is
// rewoven, so books, posts and decks can show their own pattern.

import {
  C, drawOn, ease, fade, label, n, prog, text,
} from "../draw.mjs";

const LEFT_X = 330;
const RIGHT_X = 700;
const TOP = 236;
const BOTTOM = 862;
export const ROWS = 12;

const curve = (y1, y2) => {
  const mx = (LEFT_X + RIGHT_X) / 2;
  return { d: `M${LEFT_X},${n(y1)} C${mx},${n(y1)} ${mx},${n(y2)} ${RIGHT_X},${n(y2)}`, mx };
};

// Arc length of the thread's cubic, sampled — resvg needs a real dash length.
const curveLength = (y1, y2) => {
  const mx = (LEFT_X + RIGHT_X) / 2;
  const pt = (s) => {
    const a = (1 - s) ** 3;
    const b = 3 * (1 - s) ** 2 * s;
    const c = 3 * (1 - s) * s ** 2;
    const d = s ** 3;
    return [a * LEFT_X + b * mx + c * mx + d * RIGHT_X, a * y1 + b * y1 + c * y2 + d * y2];
  };
  let len = 0;
  let prev = pt(0);
  for (let i = 1; i <= 24; i += 1) {
    const p = pt(i / 24);
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
};

/**
 * The loom for one setting — the same selection TagLoom.js makes on the page.
 * @param {object[]} tags  the /api/stats `tags` list
 * @param {string[]} types entity types in display order
 * @param {boolean} withMicro
 * @param {(name: string, stored: string|null) => string} colorForTag
 */
export function loomLayout(tags, types, withMicro, colorForTag) {
  const used = types.filter((t) => withMicro || t !== "microblog");
  const count = (tag, type) => Number((tag.counts || {})[type]) || 0;
  const rows = (tags || [])
    .map((tag) => ({ ...tag, weight: used.reduce((s, type) => s + count(tag, type), 0) }))
    .filter((tag) => tag.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, ROWS);
  const usedTypes = used.filter((type) => rows.some((tag) => count(tag, type) > 0));
  const threads = rows.flatMap((tag) => usedTypes
    .map((type) => ({ tag: tag.name, type, n: count(tag, type), color: colorForTag(tag.name, tag.color) }))
    .filter((th) => th.n > 0));
  const max = Math.max(1, ...threads.map((th) => th.n));
  const totals = Object.fromEntries(usedTypes.map((type) => [type, threads.filter((th) => th.type === type).reduce((s, th) => s + th.n, 0)]));
  return { rows, usedTypes, threads, max, totals };
}

/**
 * @param {object} d
 * @param {{ layout: object, at: number, until: number, focus: { at: number, tag: string } }[]} d.passes
 * @param {(type: string) => string} d.plural
 */
export function loom({ passes, plural }) {
  const placed = passes.map((pass) => {
    const { rows, usedTypes, threads } = pass.layout;
    const tagY = Object.fromEntries(rows.map((r, i) => [r.name, TOP + (i + 0.5) * ((BOTTOM - TOP) / rows.length)]));
    const typeY = Object.fromEntries(usedTypes.map((type, i) => [type, TOP + (i + 0.5) * ((BOTTOM - TOP) / usedTypes.length)]));
    const woven = threads
      .slice()
      .sort((a, b) => usedTypes.indexOf(a.type) - usedTypes.indexOf(b.type) || tagY[a.tag] - tagY[b.tag])
      .map((th, i, all) => ({
        ...th,
        y1: typeY[th.type],
        y2: tagY[th.tag],
        len: curveLength(typeY[th.type], tagY[th.tag]),
        start: pass.at + 0.6 + (i / Math.max(1, all.length - 1)) * 2.4,
      }));
    return { ...pass, tagY, typeY, woven };
  });

  return (t) => {
    const parts = [
      `<line x1="${LEFT_X}" y1="${TOP - 14}" x2="${LEFT_X}" y2="${BOTTOM + 14}" stroke="${C.ink}" stroke-width="6"${drawOn(BOTTOM - TOP + 28, prog(t, 0, 0.8))}/>`,
      `<line x1="${RIGHT_X}" y1="${TOP - 14}" x2="${RIGHT_X}" y2="${BOTTOM + 14}" stroke="${C.ink}" stroke-width="6"${drawOn(BOTTOM - TOP + 28, prog(t, 0.1, 0.9))}/>`,
      label(LEFT_X, TOP - 26, "Collections", { size: 14, anchor: "middle", fill: C.soft, opacity: fade(t, 0.4) }),
      label(RIGHT_X, TOP - 26, "Tags", { size: 14, anchor: "middle", fill: C.soft, opacity: fade(t, 0.4) }),
    ];

    placed.forEach((pass) => {
      const o = fade(t, pass.at, 0.5, pass.until);
      if (o <= 0) return;
      const { layout, tagY, typeY, woven } = pass;
      const focusOn = pass.focus ? fade(t, pass.focus.at, 0.4, pass.until) : 0;
      const isFocus = (th) => pass.focus && th.tag === pass.focus.tag;

      // Threads: the focused tag's drawn last, so it sits on top.
      const ordered = woven.slice().sort((a, b) => Number(isFocus(a)) - Number(isFocus(b)));
      ordered.forEach((th) => {
        const k = ease(prog(t, th.start, th.start + 0.7));
        if (k <= 0) return;
        const width = 1.5 + 15 * Math.sqrt(th.n / layout.max);
        let alpha = 0.55;
        if (focusOn > 0) alpha = isFocus(th) ? 0.55 + 0.4 * focusOn : 0.55 - 0.47 * focusOn;
        parts.push(`<path d="${curve(th.y1, th.y2).d}" fill="none" stroke="${th.color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-opacity="${alpha.toFixed(3)}" opacity="${o.toFixed(3)}"${drawOn(th.len, k)}/>`);
      });

      layout.usedTypes.forEach((type, i) => {
        const lo = Math.min(o, fade(t, pass.at + 0.1 + i * 0.06, 0.4));
        const y = typeY[type];
        parts.push(`<circle cx="${LEFT_X}" cy="${n(y)}" r="8" fill="${C.paper}" stroke="${C.ink}" stroke-width="2.4" opacity="${lo.toFixed(3)}"/>`);
        parts.push(label(LEFT_X - 22, y - 2, plural(type), { size: 17, anchor: "end", opacity: lo }));
        parts.push(text(LEFT_X - 22, y + 20, `${layout.totals[type].toLocaleString("en-IN")} links`, { size: 15, anchor: "end", fill: C.soft, opacity: lo }));
      });

      layout.rows.forEach((tag, i) => {
        const lo = Math.min(o, fade(t, pass.at + 0.2 + i * 0.05, 0.4));
        const y = tagY[tag.name];
        const hot = pass.focus && pass.focus.tag === tag.name && focusOn > 0;
        const color = (woven.find((th) => th.tag === tag.name) || {}).color || C.ink;
        parts.push(`<circle cx="${RIGHT_X}" cy="${n(y)}" r="${hot ? 11 : 8}" fill="${color}" stroke="${hot ? C.red : C.ink}" stroke-width="2" opacity="${lo.toFixed(3)}"/>`);
        parts.push(text(RIGHT_X + 22, y + 7, tag.displayName || tag.name, { size: 20, weight: hot ? 700 : 400, fill: hot ? C.red : C.ink, opacity: lo }));
        parts.push(text(1010, y + 7, tag.weight.toLocaleString("en-IN"), { size: 17, anchor: "end", fill: C.soft, opacity: lo }));
      });
    });
    return parts.join("");
  };
}
