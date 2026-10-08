// Sheet A-04: what a shared link turns into. Each beat pastes one route: the
// request runs down the edge, a preview bot fetches the committed card and
// shows it — the real public/og PNG — or, last, a reader's browser runs the
// app and Helmet writes the same tags.

import {
  C, box, easeOut, fade, label, n, prog, text, wrap,
} from "../draw.mjs";

export const CYCLE = 4.3;
export const START = 0.4;

const wire = (pts, lit, t) => {
  const d = `M${pts.map(([x, y]) => `${x},${y}`).join(" L")}`;
  return lit
    ? `<path d="${d}" fill="none" stroke="${C.red}" stroke-width="3" stroke-dasharray="10 6" stroke-dashoffset="${n(-t * 40)}"/>`
    : `<path d="${d}" fill="none" stroke="${C.ink}" stroke-opacity="0.45" stroke-width="2"/>`;
};

/**
 * @param {object} d
 * @param {{ path, title, description, slug, card, mode, tags }[]} d.shares
 *   `card` is the committed PNG as a data URI; `mode` is "bot" or "reader";
 *   `tags` the head tags the edge writes, as strings.
 * @param {string} d.domain
 */
export function unfurl({ shares, domain }) {
  return (t) => {
    const ci = Math.max(0, Math.min(shares.length - 1, Math.floor((t - START) / CYCLE)));
    const share = shares[ci];
    const u = t - START - ci * CYCLE;
    const bot = share.mode === "bot";
    const outro = ci === shares.length - 1 ? 1 : 1 - prog(u, CYCLE - 0.35, CYCLE);
    const at = (k) => u >= k && outro > 0.5;
    const base = fade(t, 0, 0.6);
    const parts = [];

    // The flow, on the left.
    parts.push(`<g opacity="${base.toFixed(3)}">`);
    parts.push(wire([[244, 266], [244, 296]], at(0.45), t));
    parts.push(wire([[244, 352], [244, 382]], at(0.7), t));
    parts.push(wire([[244, 438], [244, 470], [151, 470], [151, 500]], bot && at(0.95), t));
    parts.push(wire([[244, 470], [337, 470], [337, 500]], !bot && at(0.95), t));
    parts.push(wire([[151, 556], [151, 586]], bot && at(1.2), t));
    parts.push(wire([[151, 642], [151, 672]], bot && at(1.45), t));
    parts.push(wire([[337, 556], [337, 586]], !bot && at(1.2), t));
    parts.push(wire([[337, 642], [337, 672]], !bot && at(1.45), t));
    parts.push(`<circle cx="244" cy="470" r="5" fill="${C.ink}"/>`);
    const shown = share.path.length > 20 ? `${share.path.slice(0, 19)}…` : share.path;
    parts.push(box(64, 210, 360, 56, `GET ${shown}`, "any client, the same response", { state: at(0.2) ? "lit" : "idle", titleSize: 15, subSize: 13 }));
    parts.push(box(64, 296, 360, 56, "Cloudflare Pages", "serves the app's index.html", { state: at(0.45) ? "lit" : "idle", titleSize: 15, subSize: 13 }));
    parts.push(box(64, 382, 360, 56, "_middleware.js", "HTMLRewriter writes the og: tags", { state: at(0.7) ? "lit" : "idle", titleSize: 15, subSize: 13 }));
    parts.push(box(64, 500, 175, 56, "Preview bot", "reads tags, runs no JS", { state: bot && at(0.95) ? "lit" : "idle", titleSize: 13, subSize: 11 }));
    parts.push(box(64, 586, 175, 56, `/og/${share.slug}.png`, "1200 × 630, committed", { state: bot && at(1.2) ? "lit" : "idle", titleSize: 11, subSize: 11 }));
    parts.push(box(64, 672, 175, 56, "Link preview", "card, title, text", { state: bot && at(1.45) ? "lit" : "idle", titleSize: 13, subSize: 11 }));
    parts.push(box(249, 500, 175, 56, "Browser", "loads the bundle", { state: !bot && at(0.95) ? "lit" : "idle", titleSize: 13, subSize: 11 }));
    parts.push(box(249, 586, 175, 56, "PageMeta", "Helmet: the same tags", { state: !bot && at(1.2) ? "lit" : "idle", titleSize: 13, subSize: 11 }));
    parts.push(box(249, 672, 175, 56, "The page", "either shell", { state: !bot && at(1.45) ? "lit" : "idle", titleSize: 13, subSize: 11 }));
    parts.push("</g>");

    // The right-hand panel: the message, then what it unfurls into.
    const po = Math.min(fade(t, START + ci * CYCLE, 0.3), outro);
    const url = `https://${domain}${share.path === "/" ? "" : share.path}`;
    const typed = url.slice(0, Math.round(url.length * prog(u, 0, 0.5)));
    const rise = (1 - easeOut(prog(u, 1.45, 1.9))) * 24;
    const cardIn = prog(u, 1.45, 1.9);
    const textIn = prog(u, 1.8, 2.2);
    parts.push(`<g opacity="${po.toFixed(3)}">`);
    parts.push(`<rect x="464" y="210" width="552" height="470" rx="14" fill="${C.panel}" stroke="${C.ink}" stroke-opacity="0.25"/>`);
    if (bot) {
      parts.push(text(484, 246, typed, { size: 19, fill: C.red }));
      if (cardIn > 0) {
        parts.push(`<g opacity="${cardIn.toFixed(3)}" transform="translate(0,${n(rise)})">
          <rect x="482" y="262" width="516" height="400" rx="10" fill="${C.paper}" stroke="${C.ink}" stroke-opacity="0.2"/>
          <image href="${share.card}" x="483" y="263" width="514" height="270"/>
          ${label(500, 562, domain, { size: 13, fill: C.soft, opacity: textIn })}
          ${text(500, 594, share.title, { size: 23, weight: 700, opacity: textIn })}
          ${wrap(share.description, 50, 2).map((l, i) => text(500, 624 + i * 24, l, { size: 17, fill: C.soft, opacity: textIn })).join("")}
        </g>`);
      }
    } else {
      // A browser window: the tab carries the title the app writes.
      parts.push(`<rect x="482" y="228" width="516" height="434" rx="10" fill="${C.paper}" stroke="${C.ink}" stroke-opacity="0.3"/>`);
      parts.push([0, 1, 2].map((i) => `<circle cx="${504 + i * 18}" cy="252" r="5" fill="none" stroke="${C.ink}" stroke-opacity="0.5"/>`).join(""));
      parts.push(`<rect x="566" y="238" width="300" height="28" rx="6" fill="${C.panel}" stroke="${C.ink}" stroke-opacity="0.3"/>`);
      parts.push(text(580, 258, share.title, { size: 15 }));
      parts.push(`<line x1="482" y1="276" x2="998" y2="276" stroke="${C.ink}" stroke-opacity="0.25"/>`);
      parts.push(text(500, 304, typed, { size: 17, fill: C.soft }));
      parts.push(`<line x1="482" y1="318" x2="998" y2="318" stroke="${C.ink}" stroke-opacity="0.25"/>`);
      const sk = prog(u, 1.45, 2.2);
      [[500, 352, 300, 14], [500, 380, 470, 8], [500, 398, 420, 8], [500, 416, 450, 8]].forEach(([x, y, w, h], i) => {
        parts.push(`<rect x="${x}" y="${y}" width="${n(w * easeOut(prog(sk, i * 0.15, 0.6 + i * 0.15)))}" height="${h}" fill="${C.ink}" fill-opacity="${i ? 0.25 : 0.6}"/>`);
      });
      parts.push(`<rect x="500" y="442" width="480" height="120" fill="none" stroke="${C.ink}" stroke-opacity="0.35" stroke-dasharray="5 5" opacity="${sk.toFixed(3)}"/>`);
      parts.push(wrap("The app boots and PageMeta writes the very same tags, tag for tag.", 46, 2)
        .map((l, i) => text(500, 600 + i * 26, l, { size: 19, opacity: textIn })).join(""));
    }

    // What both of them receive in <head>.
    const ho = prog(u, 2.0, 2.4);
    parts.push(label(470, 716, "What both receive in <head>", { size: 13, fill: C.red, opacity: ho }));
    share.tags.slice(0, 4).forEach((tag, i) => {
      const s = tag.length > 64 ? `${tag.slice(0, 63)}…` : tag;
      parts.push(text(470, 746 + i * 26, s, { size: 15, fill: i === 1 ? C.red : C.ink, opacity: prog(u, 2.0 + i * 0.12, 2.4 + i * 0.12) }));
    });
    parts.push("</g>");
    return parts.join("");
  };
}
