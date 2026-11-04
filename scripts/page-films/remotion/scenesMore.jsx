import React from "react";
import {
  AbsoluteFill, Easing, Img, random, useCurrentFrame,
} from "remotion";
import {
  Counter, DEVA, DISPLAY, H, SANS, SERIF, SlideIn, Typed, W, back, fmt, headStyle, label, lerp, prog, src,
} from "./kit";

// The scene types of the four 45-second films (/newsletter,
// /100-days-to-offload, /now, /ask). Same rules as scenes.jsx: every timing
// is read from the script (s.items[i].at, s.timing), the frames the sound
// cues sit on; the picture stays in 220–1500 px, captions own 1540–1720.

const abs = (css) => ({ position: "absolute", ...css });
const center = { left: 0, right: 0, textAlign: "center" };
const isDeva = (t) => /[ऀ-ॿ]/.test(String(t || ""));
const clampLines = (n) => ({ display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" });

const Head = ({ th, text, at = 0, size = 96, top = 250 }) => (
  <SlideIn at={at} variant="left" style={{ left: 90, right: 90, top, ...headStyle(th, size) }}>{text}</SlideIn>
);

// --- an envelope, open (flap 0) to sealed (flap 1, then the wax seal) ---------

export const Envelope = ({
  th, left, top, w = 640, flap = 1, seal = 1, children,
}) => {
  const h = w * 0.62;
  const kraft = th.kraft || "#e8d5ad";
  const dark = th.kraftDark || "#c9ae7c";
  const apex = lerp(-h * 0.5, h * 0.58, flap);
  return (
    <div style={abs({ left, top, width: w, height: h })}>
      {/* the flap: its point swings from above the envelope (open) down over the front (closed) */}
      <div style={abs({ left: 0, top: 0, width: w, height: h, background: dark, borderRadius: 14 })} />
      {apex < 0 && <svg width={w} height={h * 2} style={abs({ left: 0, top: -h, overflow: "visible" })}><path d={`M0 ${h} L${w / 2} ${h + apex} L${w} ${h} Z`} fill={dark} /></svg>}
      {children}
      <svg width={w} height={h} style={abs({ left: 0, top: 0 })}>
        <path d={`M0 ${h * 0.28} L${w / 2} ${h * 0.66} L${w} ${h * 0.28} L${w} ${h} L0 ${h} Z`} fill={kraft} />
        <path d={`M0 ${h} L${w / 2} ${h * 0.56} L${w} ${h}`} fill="none" stroke={dark} strokeWidth="3" />
        {apex >= 0 && <path d={`M0 0 L${w / 2} ${apex} L${w} 0 Z`} fill={kraft} stroke={dark} strokeWidth="3" />}
      </svg>
      {seal > 0 && (
        <div style={abs({
          left: w / 2 - 54, top: h * 0.58 - 54, width: 108, height: 108, borderRadius: "50%", background: th.accent,
          boxShadow: "0 6px 14px rgba(0,0,0,.3), inset 0 0 0 8px rgba(0,0,0,.12)", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: SERIF, fontWeight: 700, fontSize: 56, color: "#fff", transform: `scale(${lerp(2.2, 1, seal)})`, opacity: Math.min(1, seal * 3),
        })}
        >
          S
        </div>
      )}
    </div>
  );
};

// --- the page in both shells: a phone for classic, a phone for the atlas ------

const Phone = ({
  shot, left, top, w, scroll, title, th, glow,
}) => {
  const hh = Math.round(w * (844 / 390));
  const img = shot ? w * (shot.ratio || 6) : hh;
  const dy = Math.max(0, img - hh) * scroll;
  return (
    <div style={abs({ left, top })}>
      <div style={{
        position: "relative", width: w + 28, height: hh + 28, borderRadius: 64, background: "#0b0b0f",
        boxShadow: `0 40px 90px rgba(0,0,0,.45)${glow ? `, 0 0 0 6px ${th.accent}` : ""}`,
      }}
      >
        <div style={abs({ left: 14, top: 14, width: w, height: hh, borderRadius: 52, overflow: "hidden", background: "#fff" })}>
          {shot?.file && <Img src={src(shot.file)} style={{ position: "absolute", left: 0, top: -dy, width: w, height: img }} />}
        </div>
        <div style={abs({ left: (w + 28) / 2 - 60, top: 26, width: 120, height: 30, borderRadius: 16, background: "#0b0b0f" })} />
      </div>
      <div style={{
        marginTop: 26, textAlign: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, letterSpacing: "0.24em", textTransform: "uppercase",
        color: glow ? th.accent : th.muted,
      }}
      >
        {title}
      </div>
    </div>
  );
};

export const Shells = ({ s, th }) => {
  const f = useCurrentFrame();
  const p1 = Math.round(s.dur * 0.32); // the atlas arrives
  const sw = Math.round(s.dur * 0.62); // the switch flips
  const k = prog(f, p1, p1 + 18, Easing.bezier(0.22, 1, 0.36, 1));
  const w = Math.round(lerp(470, 400, k));
  const scroll = prog(f, 10, s.dur, Easing.inOut(Easing.sin)) * 0.55;
  const on = f >= sw;
  const knob = prog(f, sw, sw + 8, back);
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={92} top={230} />
      <Phone th={th} shot={s.shots.classic} title="Classic" w={w} top={380} left={lerp(540 - (w + 28) / 2, 70, k)} scroll={scroll} glow={!on && k < 1} />
      {f >= p1 - 2 && (
        <Phone th={th} shot={s.shots.atlas} title="Atlas" w={w} top={380} left={lerp(1100, 584, k)} scroll={scroll * 0.96} glow={on} />
      )}
      <div style={abs({ left: 540 - 150, top: 1400, width: 300, height: 76, borderRadius: 40, background: th.soft, opacity: prog(f, p1 + 10, p1 + 20) })}>
        <div style={abs({ left: lerp(8, 152, knob), top: 8, width: 140, height: 60, borderRadius: 32, background: th.accent })} />
        <div style={abs({ left: 0, width: 150, top: 0, lineHeight: "76px", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 26, color: on ? th.muted : "#fff" })}>classic</div>
        <div style={abs({ left: 150, width: 150, top: 0, lineHeight: "76px", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 26, color: on ? "#fff" : th.muted })}>atlas</div>
      </div>
    </AbsoluteFill>
  );
};

// --- /100-days-to-offload: a ring of a hundred marks ----------------------------

export const Goal = ({ s, th }) => {
  const f = useCurrentFrame();
  const end = Math.round(s.dur * 0.6);
  const k = prog(f, 14, end, Easing.inOut(Easing.cubic));
  const lit = s.value * k;
  const R = 360;
  const cx = 540;
  const cy = 820;
  return (
    <AbsoluteFill>
      <Typed text={s.kicker} at={2} cpf={1.4} caret={th.accent} style={abs({ ...center, top: 250, fontFamily: SERIF, fontStyle: "italic", fontSize: 50, color: th.fg })} />
      <svg width={W} height={1000} style={abs({ left: 0, top: 320 })}>
        {Array.from({ length: s.goal }, (_, i) => {
          const a = (i / s.goal) * Math.PI * 2 - Math.PI / 2;
          const on = i < lit;
          const pop = on ? lerp(1.8, 1, prog(lit - i, 0, 3)) : 1;
          return (
            <circle key={i} cx={cx + Math.cos(a) * R} cy={cy - 320 + Math.sin(a) * R} r={(on ? 13 : 7) * pop} fill={on ? (i === s.value - 1 ? th.accent : th.fg) : th.soft} />
          );
        })}
      </svg>
      <div style={abs({ ...center, top: 660, fontFamily: SANS, fontWeight: 700, fontSize: 260, letterSpacing: -10, lineHeight: 1, color: th.fg })}>
        <Counter value={s.value} from={14} to={end} />
      </div>
      <div style={abs({ ...center, top: 930, ...label(th, { color: th.muted, fontSize: 30 }) })}>{s.label}</div>
      <SlideIn at={end + 6} variant="up" style={{ ...center, top: 1270, fontFamily: SANS, fontWeight: 700, fontSize: 46, color: th.accent }}>{s.sub}</SlideIn>
    </AbsoluteFill>
  );
};

// --- the trail: every post a waypoint on a winding path --------------------------

const trailAt = (t) => ({ x: 540 + 330 * Math.sin(t * Math.PI * 3.2), y: 440 + t * 1000 });

export const Trail = ({ s, th }) => {
  const f = useCurrentFrame();
  const k = prog(f, 10, 10 + s.dur * 0.7, Easing.inOut(Easing.sin));
  const pts = [];
  for (let i = 0; i <= 160; i += 1) {
    const t = (i / 160) * k;
    const p = trailAt(t);
    pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  const tip = trailAt(k);
  const done = s.posts.filter((p) => p.t <= k).length;
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={104} top={230} />
      <div style={abs({ right: 90, top: 250, textAlign: "right", fontFamily: SANS, fontWeight: 700, fontSize: 80, color: th.accent })}>{done}</div>
      <div style={abs({ right: 90, top: 345, ...label(th, { color: th.muted, fontSize: 22 }) })}>waypoints</div>
      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
        <div key={m} style={abs({ left: 40, top: trailAt(i / 12).y - 14, fontFamily: SANS, fontSize: 24, color: th.muted, opacity: prog(k, i / 12 - 0.02, i / 12 + 0.02) })}>{m}</div>
      ))}
      <svg width={W} height={H} style={abs({ left: 0, top: 0 })}>
        <polyline points={pts.join(" ")} fill="none" stroke={th.fg} strokeOpacity=".22" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pts.join(" ")} fill="none" stroke={th.fg} strokeWidth="5" strokeDasharray="2 16" strokeLinecap="round" />
        {s.posts.map((p, i) => {
          if (p.t > k) return null;
          const q = trailAt(p.t);
          const age = (k - p.t) * 60;
          return <circle key={i} cx={q.x} cy={q.y} r={11 * lerp(1.8, 1, Math.min(1, age))} fill={th.accent} stroke={th.bg} strokeWidth="4" />;
        })}
        <path d={`M${tip.x} ${tip.y} l0 -70 l46 14 l-46 14`} fill={th.accent} stroke={th.fg} strokeWidth="5" strokeLinejoin="round" />
      </svg>
      {s.latest && (
        <SlideIn at={Math.round(s.dur * 0.78)} variant="up" style={{ left: 90, right: 90, top: 1460 - 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 40, color: th.fg, ...clampLines(1) }}>
          {`Latest: ${s.latest}`}
        </SlideIn>
      )}
    </AbsoluteFill>
  );
};

// --- /newsletter: the month's rows fly in as slips and drop into the envelope ----

export const Gather = ({ s, th }) => {
  const f = useCurrentFrame();
  const drop = Math.round(s.dur * 0.55);
  const seal = prog(f, Math.round(s.dur * 0.75), Math.round(s.dur * 0.75) + 10, back);
  const flap = prog(f, Math.round(s.dur * 0.62), Math.round(s.dur * 0.72), Easing.inOut(Easing.cubic));
  const statsAt = Math.round(s.dur * 0.78);
  return (
    <AbsoluteFill>
      <SlideIn at={0} variant="left" style={{ left: 90, top: 225, ...label(th) }}>{s.kicker}</SlideIn>
      <Head th={th} text={s.head} size={72} top={270} />
      <Envelope th={th} left={220} top={1030} flap={flap} seal={seal}>
        {null}
      </Envelope>
      {s.items.map((it, i) => {
        const fall = prog(f, drop + i * 2, drop + i * 2 + 14, Easing.in(Easing.cubic));
        if (fall >= 1) return null;
        const top = 400 + i * 74 + 30;
        return (
          <SlideIn key={`${it.title}${i}`} at={it.at} variant={i % 2 ? "right" : "left"} len={12} style={{ left: 120, right: 120, top, transform: `translateY(${fall * (1180 - top)}px) scale(${lerp(1, 0.6, fall)}) rotate(${(i % 2 ? 1 : -1) * 2}deg)` }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 18, padding: "12px 22px", background: "#fffdf8", borderRadius: 12,
              boxShadow: "0 8px 20px rgba(60,40,10,.18)", fontFamily: SANS, fontSize: 30, color: th.fg, whiteSpace: "nowrap", overflow: "hidden",
            }}
            >
              <span style={{ ...label(th, { fontSize: 18, letterSpacing: "0.18em" }), flexShrink: 0 }}>{it.section}</span>
              <span style={{ fontFamily: isDeva(it.title) ? DEVA : SANS, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</span>
            </div>
          </SlideIn>
        );
      })}
      <div style={abs({ left: 90, right: 90, top: 520, display: "flex", justifyContent: "center", gap: 60 })}>
        {(s.stats || []).map((x, i) => (
          <div key={x.label} style={{ textAlign: "center", opacity: prog(f, statsAt + i * 8, statsAt + i * 8 + 6), transform: `scale(${lerp(0.5, 1, prog(f, statsAt + i * 8, statsAt + i * 8 + 12, back))})` }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 150, color: i ? th.fg : th.accent, lineHeight: 1 }}>{x.value}</div>
            <div style={label(th, { color: th.muted, fontSize: 22, marginTop: 10 })}>{x.label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// --- /ask: the starter questions, one of them picked ------------------------------

export const Chips = ({ s, th }) => {
  const f = useCurrentFrame();
  const pickAt = Math.round(s.dur * 0.62);
  const picked = f >= pickAt;
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={110} top={240} />
      <div style={abs({ left: 70, right: 70, top: 440, display: "flex", flexWrap: "wrap", gap: 22, justifyContent: "center" })}>
        {s.items.map((it, i) => {
          const k = prog(f, it.at, it.at + 12, back);
          const me = i === s.pick;
          const glow = picked && me ? prog(f, pickAt, pickAt + 8) : 0;
          return (
            <div
              key={it.q}
              style={{
                padding: "20px 32px", borderRadius: 999, border: `3px solid ${me && picked ? th.accent : "rgba(167,139,250,.35)"}`,
                background: me && picked ? th.accent : "rgba(255,255,255,.04)", color: me && picked ? "#0d0b1a" : th.fg,
                fontFamily: it.mr ? DEVA : SANS, fontWeight: 700, fontSize: 36, opacity: k * (picked && !me ? 0.3 : 1),
                transform: `translateY(${(1 - k) * 60 + Math.sin(f / 16 + i) * 5}px) scale(${lerp(0.7, 1, k) * lerp(1, 1.08, glow)})`,
                boxShadow: glow ? `0 0 60px rgba(167,139,250,${0.6 * glow})` : "none",
              }}
            >
              {it.q}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- /ask: one real exchange, sources first, then the answer streaming -----------

const KIND = {
  sport: "race", trek: "trek", blog: "essay", writing: "essay", book: "book", microblog: "short post", project: "project", presentation: "deck", stats: "stats", tag: "tag", video: "video", page: "page", now: "letter",
};

export const Chat = ({ s, th }) => {
  const f = useCurrentFrame();
  const T = s.timing;
  const up = prog(f, T.send, T.send + 14, Easing.bezier(0.22, 1, 0.36, 1));
  const n = Math.max(0, Math.floor((f - T.a0) * T.acpf));
  const typing = f < T.send;
  return (
    <AbsoluteFill>
      {/* the question: typed into the box, then sent up as a bubble */}
      <div style={abs({
        left: lerp(70, 250, up), right: 70, top: lerp(700, 230, up), padding: typing ? "34px 38px" : "24px 32px",
        borderRadius: typing ? 30 : "30px 30px 6px 30px", background: typing ? "rgba(255,255,255,.06)" : th.accent,
        border: typing ? "3px solid rgba(167,139,250,.5)" : "none", fontFamily: isDeva(s.question) ? DEVA : SANS, fontWeight: 700,
        fontSize: lerp(50, 40, up), color: typing ? th.fg : "#0d0b1a",
      })}
      >
        <Typed text={s.question} at={T.q0} cpf={T.qcpf} caret={th.accent} />
      </div>
      {typing && (
        <div style={abs({ right: 70, top: 880, padding: "18px 40px", borderRadius: 999, background: th.accent, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: "#0d0b1a", transform: `scale(${f > T.send - 4 ? 0.9 : 1})` })}>Ask</div>
      )}
      {/* sources first */}
      {f >= T.src0 - 2 && <div style={abs({ left: 70, top: 360, ...label(th, { color: th.cyan, fontSize: 22, opacity: prog(f, T.src0 - 2, T.src0 + 6) }) })}>Sources</div>}
      {s.sources.map((x, i) => {
        const at = T.src0 + i * T.srcGap;
        return (
          <SlideIn key={`${x.title}${i}`} at={at} variant="right" len={10} style={{ left: 70, right: 70, top: 410 + i * 84 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 22px", borderRadius: 16, background: "rgba(255,255,255,.06)", border: "2px solid rgba(255,255,255,.08)" }}>
              <span style={{ flexShrink: 0, padding: "4px 14px", borderRadius: 8, background: "rgba(34,211,238,.15)", color: th.cyan, fontFamily: SANS, fontWeight: 700, fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase" }}>{KIND[x.type] || x.type}</span>
              <span style={{ fontFamily: isDeva(x.title) ? DEVA : SANS, fontWeight: 700, fontSize: 30, color: th.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.title}</span>
            </div>
          </SlideIn>
        );
      })}
      {/* the answer, streaming */}
      {f >= T.a0 - 4 && (
        <div style={abs({ left: 70, right: 70, top: 440 + s.sources.length * 84, opacity: prog(f, T.a0 - 4, T.a0 + 4) })}>
          <div style={label(th, { fontSize: 22, marginBottom: 14 })}>Answer</div>
          <div style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1.36, color: th.fg }}>
            {s.answer.slice(0, n)}
            {n < s.answer.length && <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 9, marginLeft: 8, background: th.accent, opacity: Math.floor(f / 6) % 2 ? 0.3 : 1 }} />}
          </div>
          {s.tier && <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 24, color: th.muted, opacity: prog(f, T.a1 - 4, T.a1 + 6) }}>{`answered by ${s.tier} · ${s.sources.length} sources shown`}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};

// --- /now: last month's page tears off the calendar --------------------------------

export const Pulse = ({ s, th }) => {
  const f = useCurrentFrame();
  const tear = Math.round(s.dur * 0.3);
  const k = prog(f, tear, tear + 16, Easing.in(Easing.cubic));
  const page = (name, style) => (
    <div style={abs({ left: 0, top: 0, width: 600, height: 560, borderRadius: 26, background: "#fff", overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,.45)", ...style })}>
      <div style={{ height: 120, background: th.accent, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: "#0b1220", lineHeight: "120px", textAlign: "center", letterSpacing: "0.2em" }}>{s.year}</div>
      <div style={{ textAlign: "center", fontFamily: SERIF, fontWeight: 700, fontSize: name.length > 7 ? 104 : 130, color: "#0b1220", marginTop: 110 }}>{name}</div>
    </div>
  );
  const beat = (Math.max(0, f - 30) % 18) / 18;
  return (
    <AbsoluteFill>
      <div style={abs({ left: 240, top: 290, width: 600, height: 560, transform: `scale(${lerp(0.7, 1, prog(f, 0, 20, back))})` })}>
        {[0, 1, 2].map((r) => <div key={r} style={abs({ left: 120 + r * 150, top: -22, width: 54, height: 54, borderRadius: 27, background: "#334155", zIndex: 3 })} />)}
        {page(s.month, {})}
        {s.prev && k < 1 && page(s.prev, { transformOrigin: "0% 0%", transform: `rotate(${k * 34}deg) translateY(${k * 700}px)`, opacity: 1 - k * 0.6 })}
      </div>
      <div style={abs({ ...center, top: 960, ...headStyle(th, 260, { letterSpacing: -10 }), opacity: prog(f, tear + 10, tear + 20), transform: `scale(${lerp(1.3, 1, prog(f, tear + 10, tear + 26, back))})` })}>Now.</div>
      <div style={abs({ left: 0, right: 0, top: 1300, display: "flex", justifyContent: "center", alignItems: "center", gap: 22, opacity: prog(f, tear + 22, tear + 32) })}>
        <div style={{ position: "relative", width: 30, height: 30 }}>
          <div style={abs({ left: 0, top: 0, width: 30, height: 30, borderRadius: 15, background: th.accent })} />
          <div style={abs({ left: 15 - 15 * (1 + beat * 2), top: 15 - 15 * (1 + beat * 2), width: 30 * (1 + beat * 2), height: 30 * (1 + beat * 2), borderRadius: "50%", border: `4px solid ${th.accent}`, opacity: 1 - beat })} />
        </div>
        <div style={label(th, { color: th.fg, fontSize: 30 })}>{`Last updated · ${s.month} ${s.year}`}</div>
      </div>
    </AbsoluteFill>
  );
};

// --- background art for Count and End -------------------------------------------

/** A grid of small squares filling in: the archive read into passages. */
export const ChunkGrid = ({ th, k }) => {
  const cols = 30;
  const rows = 14;
  const cell = 30;
  const ox = (W - cols * cell) / 2;
  const cells = [];
  for (let i = 0; i < cols * rows; i += 1) {
    const r = random(`c${i}`);
    const on = r < k;
    cells.push(<rect key={i} x={ox + (i % cols) * cell} y={Math.floor(i / cols) * cell} width={cell - 8} height={cell - 8} rx="4" fill={on ? (random(`h${i}`) < 0.18 ? th.cyan : th.accent) : "rgba(255,255,255,.05)"} opacity={on ? 0.35 + 0.65 * Math.min(1, (k - r) * 6) : 1} />);
  }
  return <svg width={W} height={rows * cell} style={abs({ left: 0, top: 280 })}>{cells}</svg>;
};

export { fmt };
