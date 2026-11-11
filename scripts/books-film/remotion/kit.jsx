import React from "react";
import {
  AbsoluteFill, Easing, OffthreadVideo, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import {
  C, LABEL, MR, SERIF,
} from "./theme";

// The pieces every scene draws with. Everything moves by frame number:
// Remotion renders frames out of order, so nothing may keep its own clock.

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
export const prog = (frame, a, b, easing = ease) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing });
export const countTo = (frame, a, b, to) => Math.round(to * prog(frame, a, b, Easing.out(Easing.cubic)));
export const fmt = (n) => Math.round(n).toLocaleString("en-IN");
const DEVANAGARI = /[ऀ-ॿ]/;

/** A pop: 0→1 with a little overshoot, from `at`. */
export const pop = (frame, fps, at, damping = 11) => spring({
  frame: frame - at, fps, config: { damping, stiffness: 150, mass: 0.8 },
});

// ---------------------------------------------------------------------------
// The room: lamplight, a drifting haze of dust, and a light that breathes
// with the beat once the beat has started.
// ---------------------------------------------------------------------------

export const Room = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motes = React.useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    x: random(`mx${i}`) * 1080,
    y: random(`my${i}`) * 1920,
    r: 1 + random(`mr${i}`) * 3.2,
    s: 0.2 + random(`ms${i}`) * 0.6,
    p: random(`mp${i}`) * Math.PI * 2,
  })), []);
  const t = frame / fps;
  // A kick on every bar's one and three: the lamp swells a touch and settles.
  let pulse = 0;
  if (beat && t >= beat.from && t < beat.to) {
    const since = (t - beat.from) % (beat.period * 2);
    pulse = Math.exp(-since * 7);
  }
  const on = prog(frame, 0, 18);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{
        opacity: on,
        background: `radial-gradient(85% 55% at 50% 8%, rgba(255,190,110,${0.26 + 0.1 * pulse}) 0%, rgba(120,70,30,0.12) 45%, transparent 75%),
          radial-gradient(70% 40% at 50% 100%, rgba(90,50,25,0.45) 0%, transparent 70%),
          linear-gradient(180deg, ${C.bg2} 0%, ${C.bg} 70%)`,
      }}
      />
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: on }}>
        {motes.map((m, i) => {
          const y = (m.y - frame * m.s * 1.4 + 1920 * 4) % 1920;
          const x = m.x + 18 * Math.sin(frame / 50 + m.p);
          const lit = Math.max(0, 1 - Math.hypot(x - 540, y - 300) / 1100);
          // eslint-disable-next-line react/no-array-index-key
          return <circle key={i} cx={x} cy={y} r={m.r} fill={C.lamp} opacity={(0.08 + 0.4 * lit) * (0.6 + 0.4 * Math.sin(frame / 20 + m.p)) * (1 + pulse * 0.6)} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// A spine, drawn the way src/components/Books/Spine.js draws it: width is the
// page count, cloth the subject, the foot mark the language (circle English,
// diamond Marathi), a red ribbon for a review, a paper tab for a kept line.
// ---------------------------------------------------------------------------

const shadeOf = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};

export const Spine = ({
  book, k = 1, showTitle = true, style = {},
}) => {
  const w = book.w * k;
  const h = book.h * k;
  const cloth = shadeOf(book.cloth, book.shade * 0.08);
  const mr = book.marathi || DEVANAGARI.test(book.title);
  // Set the title to fit the spine's length, the way a binder would.
  const title = book.title.length > 30 ? `${book.title.slice(0, 28)}…` : book.title;
  const fs = Math.min(w * 0.42, 15 * k, (h * 0.66) / Math.max(4, title.length * 0.5));
  return (
    <div style={{
      position: "relative",
      width: w,
      height: h,
      borderRadius: `${2 * k}px ${2 * k}px ${1 * k}px ${1 * k}px`,
      background: `linear-gradient(90deg, rgba(0,0,0,0.38) 0%, rgba(255,255,255,0.10) 18%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.12) 80%, rgba(0,0,0,0.42) 100%), ${cloth}`,
      boxShadow: `inset 0 ${2 * k}px 0 rgba(255,255,255,0.08), 0 ${2 * k}px ${4 * k}px rgba(0,0,0,0.35)`,
      overflow: "hidden",
      flexShrink: 0,
      ...style,
    }}
    >
      {book.style === "bands" && [0.08, 0.86].map((y) => (
        <div key={y} style={{
          position: "absolute", left: 0, right: 0, top: h * y, height: 3 * k, background: C.gold, opacity: 0.75,
        }}
        />
      ))}
      {book.style === "half" && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0, height: h * 0.16, background: "rgba(0,0,0,0.28)",
        }}
        />
      )}
      {book.style === "label" && (
        <div style={{
          position: "absolute", left: w * 0.12, right: w * 0.12, top: h * 0.2, height: h * 0.5, background: C.cream, opacity: 0.92, borderRadius: 2 * k,
        }}
        />
      )}
      {showTitle && w >= 16 && (
        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: h * 0.14,
          bottom: h * 0.16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          writingMode: "vertical-rl",
          fontFamily: mr ? MR : SERIF,
          fontWeight: mr ? 400 : 600,
          fontSize: fs,
          lineHeight: 1,
          color: book.style === "label" ? C.ink : C.cream,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "clip",
        }}
        >
          {title}
        </div>
      )}
      <div style={{
        position: "absolute",
        left: "50%",
        bottom: h * 0.05,
        width: 6 * k,
        height: 6 * k,
        marginLeft: -3 * k,
        background: mr ? C.saffron : C.cream,
        borderRadius: mr ? 0 : "50%",
        transform: mr ? "rotate(45deg)" : "none",
        opacity: 0.9,
      }}
      />
      {book.reviewed && (
        <div style={{
          position: "absolute", right: w * 0.18, top: -2, width: 4 * k, height: h * 0.2, background: C.red,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%)",
        }}
        />
      )}
    </div>
  );
};

/** A paper tab peeking out above a spine: a line was kept. */
export const Tab = ({ k }) => (
  <div style={{
    position: "absolute", left: "22%", top: -9 * k, width: 9 * k, height: 12 * k, background: C.paper, borderRadius: `${1.5 * k}px ${1.5 * k}px 0 0`, boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
  }}
  />
);

/** Books into rows no wider than `maxW` at scale `k`: [{ items: [{book, x}], width }]. */
export function layoutRows(books, k, maxW, gap = 2) {
  const rows = [];
  let row = { items: [], width: 0 };
  books.forEach((b) => {
    const w = b.w * k;
    if (row.items.length && row.width + gap + w > maxW) { rows.push(row); row = { items: [], width: 0 }; }
    row.items.push({ book: b, x: row.width + (row.items.length ? gap : 0) });
    row.width += (row.items.length > 1 ? gap : 0) + w;
  });
  if (row.items.length) rows.push(row);
  return rows;
}

/** A shelf board, as the page draws it: walnut with a lit front edge. */
export const Board = ({ width, k = 1, style = {} }) => (
  <div style={{
    width,
    height: 16 * k,
    background: `linear-gradient(180deg, ${C.woodHi} 0%, ${C.wood} 30%, ${C.woodLo} 100%)`,
    borderRadius: 3 * k,
    boxShadow: `0 ${10 * k}px ${18 * k}px rgba(0,0,0,0.5)`,
    ...style,
  }}
  />
);

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

/** A small label above a headline, with its scene number. */
export const Kicker = ({ n, text, at = 0 }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, at + 14);
  return (
    <div style={{
      fontFamily: LABEL, fontWeight: 700, fontSize: 26, letterSpacing: "0.32em", textTransform: "uppercase", color: C.gold,
      opacity: p, transform: `translateY(${(1 - p) * 16}px)`, display: "flex", alignItems: "center", gap: 18, justifyContent: "center",
    }}
    >
      {n && <span style={{ color: C.redHi }}>{n}</span>}
      <span style={{ width: 46 * p, height: 2, background: C.gold, opacity: 0.6 }} />
      <span>{text}</span>
    </div>
  );
};

/** A headline whose words rise into place one after another. */
export const Headline = ({
  text, at = 4, size = 96, italic = [], color = C.cream, stagger = 3, align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div style={{
      fontFamily: SERIF, fontWeight: 600, fontSize: size, lineHeight: 1.04, color, textAlign: align, letterSpacing: "-0.02em",
    }}
    >
      {words.map((w, i) => {
        const s = pop(frame, fps, at + i * stagger, 14);
        const it = italic.includes(i);
        return (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0 0.06em 0.12em" }}>
            <span style={{
              display: "inline-block",
              transform: `translateY(${(1 - s) * 110}%) rotate(${(1 - s) * 6}deg)`,
              fontStyle: it ? "italic" : "normal",
              color: it ? C.gold : color,
            }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * Captions: the narration, a few words at a time, each word lit the moment
 * the voice says it (render.mjs passes the voice's own word timings).
 */
export const Caption = ({ words, dur }) => {
  const frame = useCurrentFrame();
  if (!words?.length) return null;
  const pages = [];
  let cur = [];
  words.forEach((w, k) => {
    cur.push(k);
    if (cur.length >= 5 || /[.;:!?]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || w.w.length > 16) { pages.push(cur); cur = []; }
  });
  if (cur.length) pages.push(cur);
  const pi = pages.reduce((acc, p, k) => (frame >= words[p[0]].f - 2 ? k : acc), 0);
  const page = pages[pi];
  const start = words[page[0]].f - 2;
  const pin = prog(frame, start, start + 7);
  const fadeIn = prog(frame, -3, 4);
  const fadeOut = 1 - prog(frame, dur + 4, dur + 12);
  return (
    <div style={{
      position: "absolute", left: 60, right: 60, bottom: 104, textAlign: "center", opacity: Math.min(fadeIn, fadeOut),
    }}
    >
      <span style={{
        display: "inline-block",
        padding: "16px 30px 18px",
        borderRadius: 20,
        background: "rgba(14,9,6,0.78)",
        border: "1px solid rgba(220,184,102,0.25)",
        fontFamily: LABEL,
        fontWeight: 700,
        fontSize: 44,
        lineHeight: 1.25,
        transform: `translateY(${(1 - pin) * 14}px) scale(${0.97 + 0.03 * pin})`,
      }}
      >
        {page.map((k) => {
          const w = words[k];
          const said = frame >= w.f;
          const now = said && frame < w.f + w.d + 2;
          return (
            <span key={k} style={{ color: now ? C.gold : said ? C.cream : "rgba(248,239,220,0.38)" }}>
              {`${w.w} `}
            </span>
          );
        })}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The phone: a recording of the live page, floating in the lamplight.
// ---------------------------------------------------------------------------

export const Phone = ({
  clip, width = 560, rate = 1, startFrom = 0, enter = 0, tilt = 0, x = 0, y = 0, dark = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, enter, 15);
  const h = width * (1792 / 828);
  const float = Math.sin(frame / 28) * 8;
  const ry = tilt + Math.sin(frame / 45) * 2.5;
  return (
    <div style={{
      position: "absolute",
      left: 540 - width / 2 + x,
      top: y,
      width,
      height: h,
      perspective: 2400,
      transform: `translateY(${(1 - s) * 520 + float}px)`,
      opacity: Math.min(1, s * 2),
    }}
    >
      <div style={{
        width: "100%",
        height: "100%",
        borderRadius: width * 0.105,
        padding: width * 0.026,
        background: "linear-gradient(145deg, #3a3029 0%, #0d0907 40%, #1d1712 100%)",
        boxShadow: `0 60px 120px rgba(0,0,0,0.65), 0 0 0 2px rgba(220,184,102,0.18), 0 0 120px rgba(255,190,110,${dark ? 0.06 : 0.12})`,
        transform: `rotateY(${ry}deg) rotateX(${(1 - s) * 18}deg) rotateZ(${(1 - s) * -4}deg)`,
        transformStyle: "preserve-3d",
      }}
      >
        <div style={{
          position: "relative", width: "100%", height: "100%", borderRadius: width * 0.08, overflow: "hidden", background: dark ? "#100d0b" : C.paper,
        }}
        >
          <OffthreadVideo
            src={staticFile(`clip-${clip}.mp4`)}
            playbackRate={rate}
            startFrom={Math.round(startFrom * fps)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 32%)", pointerEvents: "none",
          }}
          />
        </div>
      </div>
    </div>
  );
};

/** A chip that lights when its moment comes. */
export const Chip = ({
  text, on, color = C.gold, mark = null,
}) => (
  <span style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 20px",
    borderRadius: 999,
    fontFamily: LABEL,
    fontWeight: 700,
    fontSize: 24,
    letterSpacing: "0.04em",
    color: on ? C.bg : "rgba(248,239,220,0.55)",
    background: on ? color : "rgba(248,239,220,0.06)",
    border: `1.5px solid ${on ? color : "rgba(248,239,220,0.18)"}`,
    transform: `scale(${on ? 1.06 : 1})`,
    whiteSpace: "nowrap",
  }}
  >
    {mark}
    {text}
  </span>
);
