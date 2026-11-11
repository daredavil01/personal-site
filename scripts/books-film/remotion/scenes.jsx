import React from "react";
import {
  AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig,
} from "remotion";
import {
  Board, Chip, Headline, Kicker, Phone, Spine, Tab, clamp, countTo, fmt, layoutRows, pop, prog,
} from "./kit";
import {
  C, LABEL, MR, SERIF,
} from "./theme";

// The eleven scenes. Each gets the film's data, its own slice of the timeline
// (`scene`, with the voice's word timings) and its length in frames, and
// draws from frame 0 of its own Sequence.

/** The frame (in the scene) at which the narrator says a word matching `re`. */
const wordAt = (scene, re, fallback = 0) => {
  const lead = scene.line.from - scene.from;
  const w = scene.line.words.find((x) => re.test(x.w));
  return w ? lead + w.f : fallback;
};

const Top = ({ children, y = 150 }) => (
  <div style={{
    position: "absolute", left: 60, right: 60, top: y, display: "flex", flexDirection: "column", gap: 22, alignItems: "center",
  }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// 1 · The hook: lamplight, boards, and every book dropping onto the shelf.
// ---------------------------------------------------------------------------

export const Hook = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = 1.42;
  const rows = layoutRows(data.books, k, 960, 3);
  const rowH = 190 * k + 16 * 1.2 + 34;
  const top = 1240 - (rows.length * rowH) / 2 + 120;
  const push = interpolate(frame, [0, 150], [1.06, 1], clamp);
  let i = -1;
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <Top y={210}>
        <Kicker text="A new reading room" at={34} />
        <Headline text="The Reading Room" at={40} size={118} italic={[1]} stagger={4} />
        <div style={{
          fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 52, color: C.soft, opacity: prog(frame, 62, 80), transform: `translateY(${(1 - prog(frame, 62, 80)) * 20}px)`,
        }}
        >
          Every book, spine out.
        </div>
      </Top>
      {rows.map((row, r) => {
        const y = top + r * rowH;
        const left = 540 - row.width / 2;
        const board = pop(frame, fps, 4 + r * 4, 16);
        return (
          // eslint-disable-next-line react/no-array-index-key
          <div key={r}>
            <div style={{ position: "absolute", left: left - 30 + (r % 2 ? 1 : -1) * (1 - board) * 1200, top: y + 190 * k }}>
              <Board width={row.width + 60} k={1.2} />
            </div>
            {row.items.map(({ book, x }) => {
              i += 1;
              const at = 10 + i * 1.25;
              const s = pop(frame, fps, at, 9);
              const tipWave = frame > 96 ? Math.exp(-(((i - (frame - 96) * 0.9) ** 2) / 10)) : 0;
              const tilt = (random(`t${book.id}`) - 0.5) * 30;
              return (
                <div
                  key={book.id}
                  style={{
                    position: "absolute",
                    left: left + x,
                    top: y + 190 * k - book.h * k,
                    transformOrigin: "50% 100%",
                    transform: `translateY(${(1 - s) * -1100 - tipWave * 26}px) rotate(${(1 - s) * tilt - tipWave * 4}deg)`,
                    opacity: frame >= at ? 1 : 0,
                    filter: tipWave > 0.3 ? `brightness(${1 + tipWave * 0.25})` : undefined,
                  }}
                >
                  {book.quoted && <Tab k={k} />}
                  <Spine book={book} k={k} />
                </div>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 2 · The library in numbers: the books pile up, a ruler measures the pile.
// ---------------------------------------------------------------------------

export const Count = ({ data, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = data.facts;
  const pile = [...data.books].reverse(); // oldest at the bottom
  const pagesOf = (b) => b.pages || 240;
  const total = pile.reduce((s, b) => s + pagesOf(b), 0);
  const H = 1080;
  const kp = H / total;
  const base = 1580;
  const per = Math.max(0.6, Math.min(1.4, (scene.dur * 0.55) / pile.length));
  let y = base;
  const slabs = pile.map((b, i) => {
    const h = Math.max(4, pagesOf(b) * kp);
    y -= h;
    return {
      b, y, h, at: 6 + i * per,
    };
  });
  const grown = slabs.filter((s) => frame >= s.at + 6).reduce((acc, s) => acc + s.h, 0);
  const cmNow = f.stackCm ? Math.round((grown / H) * f.stackCm) : null;
  const tBooks = wordAt(scene, /^\d+$/, 10);
  const tPages = wordAt(scene, /pages/i, 40);
  const tCm = wordAt(scene, /centimetres/i, 70);
  const big = (value, label, at, extra = null) => {
    const s = pop(frame, fps, at - 6, 13);
    return (
      <div style={{ opacity: Math.min(1, s * 1.4), transform: `translateX(${(1 - s) * -60}px)` }}>
        <div style={{
          fontFamily: SERIF, fontWeight: 600, fontSize: 132, lineHeight: 0.95, color: C.cream, letterSpacing: "-0.03em",
        }}
        >
          {value}
        </div>
        <div style={{
          fontFamily: LABEL, fontWeight: 700, fontSize: 26, letterSpacing: "0.26em", textTransform: "uppercase", color: C.gold, marginTop: 10,
        }}
        >
          {label}
        </div>
        {extra}
      </div>
    );
  };
  const enPart = f.english && f.total ? f.english / f.total : 0;
  const split = prog(frame, tBooks + 10, tBooks + 34);
  return (
    <AbsoluteFill>
      <Top y={150}>
        <Kicker n="01" text="The library" at={2} />
      </Top>
      <div style={{
        position: "absolute", left: 80, top: 360, width: 520, display: "flex", flexDirection: "column", gap: 70,
      }}
      >
        {f.total && big(countTo(frame, tBooks - 6, tBooks + 18, f.total), "books finished", tBooks, f.english && f.marathi ? (
          <div style={{ marginTop: 26, opacity: split }}>
            <div style={{
              display: "flex", height: 14, borderRadius: 7, overflow: "hidden", width: 440 * split,
            }}
            >
              <div style={{ width: `${enPart * 100}%`, background: C.cream }} />
              <div style={{ flex: 1, background: C.saffron }} />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", width: 440, marginTop: 14, fontFamily: LABEL, fontWeight: 700, fontSize: 25, color: C.soft,
            }}
            >
              <span>{`● ${f.english} English`}</span>
              <span style={{ fontFamily: MR, fontWeight: 400, fontSize: 32, color: C.saffron }}>{`◆ ${f.marathi} मराठी`}</span>
            </div>
          </div>
        ) : null)}
        {f.pages && big(fmt(countTo(frame, tPages - 8, tPages + 24, f.pages)), "pages turned", tPages)}
        {f.stackCm && big(`${countTo(frame, tCm - 8, tCm + 20, f.stackCm)} cm`, "if stacked flat", tCm)}
      </div>
      {slabs.map(({
        b, y: sy, h, at,
      }) => {
        const s = pop(frame, fps, at, 12);
        if (frame < at) return null;
        const w = 250 + ((b.h - 146) / 44) * 70;
        return (
          <div
            key={b.id}
            style={{
              position: "absolute",
              left: 820 - w / 2 + (random(`px${b.id}`) - 0.5) * 26,
              top: sy,
              width: w,
              height: h - 0.6,
              borderRadius: 2,
              background: `linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.25)), ${b.cloth}`,
              boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
              transform: `translateY(${(1 - s) * -700}px) rotate(${(1 - s) * (random(`pr${b.id}`) - 0.5) * 20}deg)`,
            }}
          />
        );
      })}
      {/* The ruler beside the pile. */}
      <div style={{
        position: "absolute", left: 1010, top: base - H, width: 3, height: H, background: "rgba(220,184,102,0.35)",
      }}
      />
      {f.stackCm && Array.from({ length: Math.floor(f.stackCm / 10) + 1 }, (_, t) => {
        const ty = base - (t * 10 * H) / f.stackCm;
        return (
          // eslint-disable-next-line react/no-array-index-key
          <div key={t} style={{ position: "absolute", left: 1000, top: ty, width: t % 5 === 0 ? 24 : 14, height: 2, background: C.gold, opacity: 0.6 }} />
        );
      })}
      {cmNow !== null && grown > 0 && (
        <div style={{
          position: "absolute", left: 650, top: base - grown - 64, width: 340, textAlign: "center", fontFamily: LABEL, fontWeight: 700, fontSize: 30, color: C.gold,
        }}
        >
          {`${cmNow} cm`}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3 · Anatomy: one spine held up to the lamp, its marks named as they are said.
// ---------------------------------------------------------------------------

const Callout = ({
  at, side, y, x0, label, value, color = C.gold, swatch = null,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, at, at + 14);
  const q = prog(frame, at + 6, at + 20);
  const right = side === "right";
  const lineW = 70 * p;
  return (
    <div style={{
      position: "absolute",
      top: y,
      left: right ? x0 : undefined,
      right: right ? undefined : 1080 - x0,
      display: "flex",
      flexDirection: right ? "row" : "row-reverse",
      alignItems: "center",
      gap: 16,
      opacity: p,
    }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: 7, background: color, boxShadow: `0 0 18px ${color}`,
      }}
      />
      <div style={{ width: lineW, height: 2, background: color }} />
      <div style={{
        opacity: q, transform: `translateX(${(1 - q) * (right ? -20 : 20)}px)`, textAlign: right ? "left" : "right", maxWidth: 290, flexShrink: 0,
      }}
      >
        <div style={{
          fontFamily: LABEL, fontWeight: 700, fontSize: 24, letterSpacing: "0.24em", textTransform: "uppercase", color,
        }}
        >
          {label}
        </div>
        <div style={{
          fontFamily: SERIF, fontWeight: 600, fontSize: 40, lineHeight: 1.1, color: C.cream, display: "flex", alignItems: "center", gap: 12, flexDirection: right ? "row" : "row-reverse", justifyContent: right ? "flex-start" : "flex-start",
        }}
        >
          {swatch}
          {value}
        </div>
      </div>
    </div>
  );
};

export const Anatomy = ({ data, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = data.hero;
  const k = 4.6;
  const w = b.w * k;
  const h = b.h * k;
  const left = 540 - w / 2;
  const top = 560;
  const s = pop(frame, fps, 2, 14);
  const ry = interpolate(frame, [0, scene.dur], [-28, -8], clamp) + Math.sin(frame / 30) * 3;
  const tWidth = wordAt(scene, /width/i, 30);
  const tColour = wordAt(scene, /colou?r/i, 60);
  const tRibbon = wordAt(scene, /ribbon/i, 100);
  // The tab and the foot mark are not spoken; they follow the ribbon, inside the scene.
  const tTab = Math.min(tRibbon + 18, scene.dur - 46);
  const tMark = Math.min(tRibbon + 30, scene.dur - 34);
  // The spine breathes wider and narrower while "width" is said: pages.
  const breathe = frame > tWidth && frame < tWidth + 30 ? Math.sin(((frame - tWidth) / 30) * Math.PI) * 0.18 : 0;
  return (
    <AbsoluteFill>
      <Top y={150}>
        <Kicker n="02" text="Anatomy of a spine" at={0} />
        <Headline text="A spine is data." at={4} size={100} italic={[3]} />
      </Top>
      <div style={{
        position: "absolute", left, top, width: w, height: h, perspective: 1800,
        transform: `translateY(${(1 - s) * 900}px)`,
      }}
      >
        <div style={{ transform: `rotateY(${ry}deg) scaleX(${1 + breathe})`, transformStyle: "preserve-3d", position: "relative" }}>
          {frame > tTab && <div style={{ opacity: prog(frame, tTab, tTab + 8) }}><Tab k={k} /></div>}
          <Spine book={{ ...b, reviewed: b.reviewed && frame >= tRibbon }} k={k} />
          <div style={{
            position: "absolute", inset: 0, background: `radial-gradient(60% 40% at 30% 20%, rgba(255,210,150,0.25), transparent 70%)`,
          }}
          />
        </div>
      </div>
      {/* Width: a dimension line over the top. */}
      <div style={{
        position: "absolute", left: left - 10, width: w + 20, top: top - 70, opacity: prog(frame, tWidth, tWidth + 10),
      }}
      >
        <div style={{
          height: 2, background: C.gold, transform: `scaleX(${prog(frame, tWidth, tWidth + 14)})`,
        }}
        />
        <div style={{
          position: "absolute", left: 0, top: -10, width: 2, height: 22, background: C.gold,
        }}
        />
        <div style={{
          position: "absolute", right: 0, top: -10, width: 2, height: 22, background: C.gold,
        }}
        />
      </div>
      <Callout at={tWidth} side="right" x0={left + w + 30} y={top - 112} label="Width" value={b.pages ? `${fmt(b.pages)} pages` : "its pages"} />
      <Callout
        at={tColour}
        side="left"
        x0={left - 30}
        y={top + h * 0.3}
        label="Cloth"
        value={b.category}
        swatch={<span style={{ width: 30, height: 30, borderRadius: 6, background: b.cloth, border: "2px solid rgba(255,255,255,0.4)" }} />}
      />
      <Callout at={tRibbon} side="right" x0={left + w + 30} y={top + 40} label="Ribbon" value="I reviewed it" color={C.redHi} />
      <Callout at={tTab} side="left" x0={left - 30} y={top - 20} label="Tab" value="a line I kept" color={C.paper} />
      <Callout at={tMark} side="right" x0={left + w + 30} y={top + h - 80} label="Foot mark" value={<span><span style={{ whiteSpace: "nowrap" }}>● English</span><br /><span style={{ color: C.saffron, whiteSpace: "nowrap" }}>◆ मराठी</span></span>} />
      <div style={{
        position: "absolute", left: 80, right: 80, top: top + h + 50, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 40, color: C.soft, opacity: prog(frame, 10, 30),
      }}
      >
        {b.title}
        <span style={{ fontStyle: "normal", fontFamily: LABEL, fontWeight: 700, fontSize: 24, letterSpacing: "0.16em", color: C.gold }}>{`  ·  ${b.author.toUpperCase()}`}</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 4–10 · The page itself, recorded on a phone.
// ---------------------------------------------------------------------------

const ENTER = 4;

/** Playback rate so a clip fills its scene: sped up, never past 2.8×. */
const rateFor = (clips, name, dur, fps) => {
  const len = clips[name]?.seconds || 6;
  const avail = (dur - ENTER - 6) / fps;
  return Math.max(0.7, Math.min(2.8, len / avail));
};

/** When the k-th recorded tap shows, in scene frames. */
const tapAt = (clips, name, k, rate, fps) => {
  const t = clips[name]?.taps?.[k];
  return t === undefined ? null : ENTER + (t / rate) * fps;
};

export const PhoneScene = ({
  data, scene, clips, n, kicker, title, italic = [], clip, chips = null, dark = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rate = rateFor(clips, clip, scene.dur, fps);
  const chipList = chips ? chips(data) : null;
  return (
    <AbsoluteFill>
      <Top y={140}>
        <Kicker n={n} text={kicker} at={0} />
        <Headline text={title} at={3} size={92} italic={italic} />
      </Top>
      <Phone clip={clip} rate={rate} enter={ENTER - 4} width={500} y={430} dark={dark} />
      {chipList && (
        <div style={{
          position: "absolute", left: 40, right: 40, top: 1548, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center",
        }}
        >
          {chipList.map((c, k) => {
            const at = c.tap === undefined ? null : tapAt(clips, clip, c.tap, rate, fps);
            const nextAt = c.until === undefined ? null : tapAt(clips, clip, c.until, rate, fps);
            const on = at !== null && frame >= at && (nextAt === null || frame < nextAt);
            const appear = prog(frame, 8 + k * 2, 18 + k * 2);
            return (
              // eslint-disable-next-line react/no-array-index-key
              <span key={k} style={{ opacity: appear, transform: `translateY(${(1 - appear) * 16}px)` }}>
                <Chip text={c.text} on={on} color={c.color} mark={c.mark} />
              </span>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

const swatch = (cloth) => <span style={{ width: 16, height: 16, borderRadius: 4, background: cloth }} />;

export const Reach = (p) => (
  <PhoneScene {...p} n="03" kicker="Take one down" title="Every spine tips out" italic={[3]} clip="reach" />
);

export const Arrange = (p) => (
  <PhoneScene
    {...p}
    n="04"
    kicker="Re-shelve"
    title="Six ways to shelve"
    italic={[3]}
    clip="arrange"
    // The recording taps Subject, Language, Written in, Thickness, A–Z, then
    // back to Year read — the page's own labels, in the page's order.
    chips={(d) => {
      const order = ["Subject", "Language", "Written in", "Thickness", "A–Z", "Year read"];
      return d.arrangements.map((label) => {
        const k = order.indexOf(label);
        return { text: label, tap: k < 0 ? undefined : k, until: k < 0 || k === order.length - 1 ? undefined : k + 1 };
      });
    }}
  />
);

export const Filter = (p) => (
  <PhoneScene
    {...p}
    n="05"
    kicker="Filters dim"
    title="Nothing vanishes"
    italic={[1]}
    clip="filter"
    chips={() => [
      {
        text: "Marathi", tap: 0, until: 1, color: C.saffron, mark: <span style={{ width: 12, height: 12, background: "currentColor", transform: "rotate(45deg)" }} />,
      },
      { text: "History", tap: 1, mark: swatch("#5b4636") },
    ]}
  />
);

export const Covers = (p) => (
  <PhoneScene {...p} n="06" kicker="Face out" title="A wall of covers" italic={[3]} clip="covers" />
);

export const Pull = (p) => (
  <PhoneScene
    {...p}
    n="07"
    kicker="Can't choose?"
    title="Pull one for me"
    italic={[3]}
    clip="pull"
    chips={() => [
      { text: "Pull one for me", tap: 0, until: 1 },
      { text: "→ next on the shelf", tap: 1 },
    ]}
  />
);

export const Lenses = (p) => (
  <PhoneScene
    {...p}
    n="08"
    kicker="Five lenses"
    title="Read it five ways"
    italic={[3]}
    clip="lenses"
    chips={() => [
      { text: "Shelf" },
      { text: "Borrower's slip", tap: 0, until: 1 },
      { text: "Numbers", tap: 1, until: 2 },
      { text: "Marginalia", tap: 2, until: 3 },
      { text: "Catalogue", tap: 3 },
    ]}
  />
);

export const Shells = ({ scene, clips }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ra = rateFor(clips, "atlas", scene.dur, fps);
  const rn = rateFor(clips, "night", scene.dur, fps);
  const label = (text, x, at) => (
    <div style={{
      position: "absolute", left: 540 + x - 200, width: 400, top: 1500, textAlign: "center", fontFamily: LABEL, fontWeight: 700, fontSize: 24, letterSpacing: "0.26em", color: C.gold, opacity: prog(frame, at, at + 12),
    }}
    >
      {text}
    </div>
  );
  return (
    <AbsoluteFill>
      <Top y={140}>
        <Kicker n="09" text="Two shells, two lights" at={0} />
        <Headline text="By day, after dark" at={3} size={92} italic={[2, 3]} />
      </Top>
      <Phone clip="atlas" rate={ra} enter={0} width={420} x={-232} y={480} tilt={9} />
      <Phone clip="night" rate={rn} enter={6} width={420} x={232} y={480} tilt={-9} dark />
      {label("ATLAS · DAY", -232, 10)}
      {label("CLASSIC · NIGHT", 232, 16)}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 11 · The end card: the whole shelf behind a library card, stamped.
// ---------------------------------------------------------------------------

export const Finale = ({ data, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = 1.05;
  const rows = layoutRows(data.books, k, 1240, 2);
  const rowH = 190 * k + 18;
  const drift = frame * 0.6;
  const card = pop(frame, fps, 6, 14);
  const tStamp = wordAt(scene, /sankettambare/i, scene.dur - 70);
  const stamp = pop(frame, fps, tStamp, 9);
  const f = data.facts;
  const line = [
    f.total ? `${f.total} books` : null,
    "English & मराठी",
    data.subjects.length ? `${data.subjects.length} subjects` : null,
  ].filter(Boolean).join("  ·  ");
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 0.32 * prog(frame, 0, 20), filter: "blur(1.5px)" }}>
        {rows.slice(0, 4).map((row, r) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={r} style={{ position: "absolute", top: 230 + r * (rowH + 330), left: -80 - (r % 2 ? drift : 160 - drift) }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
              {row.items.map(({ book }) => <Spine key={book.id} book={book} k={k} showTitle={false} />)}
            </div>
            <Board width={row.width} k={1} />
          </div>
        ))}
      </AbsoluteFill>
      <div style={{
        position: "absolute",
        left: 110,
        right: 110,
        top: 470,
        padding: "70px 60px 80px",
        background: C.paper,
        borderRadius: 10,
        boxShadow: "0 50px 120px rgba(0,0,0,0.6)",
        transform: `translateY(${(1 - card) * 900}px) rotate(${-2.5 + (1 - card) * 10}deg)`,
        color: C.ink,
        backgroundImage: "repeating-linear-gradient(180deg, transparent 0 63px, rgba(178,34,0,0.10) 63px 65px)",
      }}
      >
        <div style={{
          fontFamily: LABEL, fontWeight: 700, fontSize: 26, letterSpacing: "0.32em", color: C.red,
        }}
        >
          READING ROOM
        </div>
        <div style={{
          fontFamily: SERIF, fontWeight: 600, fontSize: 104, lineHeight: 1, marginTop: 26, letterSpacing: "-0.02em",
        }}
        >
          Every book,
          <br />
          <span style={{ fontStyle: "italic", color: C.red }}>spine out.</span>
        </div>
        <div style={{
          fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 40, marginTop: 34, color: "#6e6458",
        }}
        >
          A modern, digital bookshelf.
        </div>
        <div style={{
          fontFamily: LABEL, fontWeight: 700, fontSize: 26, marginTop: 40, color: "#6e6458", letterSpacing: "0.06em",
        }}
        >
          {line}
        </div>
        <div style={{
          position: "absolute",
          right: 40,
          bottom: -70,
          padding: "16px 26px",
          border: `5px solid ${C.red}`,
          borderRadius: 10,
          color: C.red,
          fontFamily: LABEL,
          fontWeight: 700,
          fontSize: 38,
          letterSpacing: "0.04em",
          background: "rgba(246,240,228,0.92)",
          opacity: frame >= tStamp ? 1 : 0,
          transform: `scale(${1 + (1 - stamp) * 0.9}) rotate(-7deg)`,
          boxShadow: stamp > 0.9 ? "0 0 0 transparent" : "0 20px 40px rgba(0,0,0,0.3)",
        }}
        >
          sankettambare.in/books
        </div>
      </div>
    </AbsoluteFill>
  );
};
