import React from "react";
import {
  AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame,
} from "remotion";
import {
  Counter, DEVA, DISPLAY, H, Photo, SANS, SERIF, SlideIn, Typed, W, back, clamp, ease, enterStyle,
  fmt, headStyle, label, lerp, prog, src,
} from "./kit";
import {
  Chat, Chips, ChunkGrid, Envelope, Gather, Goal, Pulse, Shells, Trail,
} from "./scenesMore";

// One component per scene type in ../script.js. Each reads its own timings
// (`s.items[i].at`, the count and sweep windows) from the script, the same
// numbers the sound cues are placed on. Layout keeps 220–1500 px for the
// picture, 1540–1720 for the captions and the bottom for the address.

const abs = (css) => ({ position: "absolute", ...css });
const max = (xs) => Math.max(1, ...xs);
const center = { left: 0, right: 0, textAlign: "center" };
// A headline size that keeps `text` on one line across `width` px.
const fit = (text, base, th, width = 920) => Math.min(base, Math.floor(width / (String(text).length * (th.head === "display" ? 0.64 : 0.56))));
const clampLines = (n) => ({ display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" });

// --- backgrounds ------------------------------------------------------------------------

const Stars = ({ sky, mr, k = 1, dim = 1 }) => {
  const f = useCurrentFrame();
  const n = Math.floor((sky.length / 2) * k);
  const xs = sky.filter((_, i) => i % 2 === 0);
  const ys = sky.filter((_, i) => i % 2 === 1);
  const mx = max(xs);
  const my = max(ys);
  const dots = [];
  for (let i = 0; i < n; i += 1) {
    const x = 40 + (xs[i] / mx) * (W - 80) + (random(`sx${i}`) - 0.5) * 30;
    const y = 220 + (ys[i] / my) * (H - 440) + (random(`sy${i}`) - 0.5) * 30;
    const a = (0.55 + 0.45 * Math.sin(f / 6 + random(`st${i}`) * 6.28)) * dim;
    dots.push(<circle key={i} cx={x} cy={y} r={0.8 + random(`sr${i}`) * 2.6} fill={random(`sm${i}`) < mr ? `rgba(245,165,36,${a})` : `rgba(200,206,255,${a})`} />);
  }
  return <svg width={W} height={H} style={abs({ left: 0, top: 0 })}>{dots}</svg>;
};

const ridgePath = (w, h, seed, amp) => {
  let d = `M0 ${h}`;
  for (let x = 0; x <= w; x += 40) {
    const y = h * (1 - amp) + Math.sin(x / 140 + seed) * h * 0.14 + Math.sin(x / 47) * h * 0.05 + (random(`r${seed}${x}`) - 0.5) * h * 0.08;
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `${d} L${w} ${h} Z`;
};

const Ridges = ({ th, rise = 1, layers = 3 }) => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{ background: `linear-gradient(${th.bg}, #1d3527 60%, #2c4a36)` }} />
      {Array.from({ length: layers }, (_, i) => (
        <svg key={i} width={W} height={900} style={abs({ left: 0, top: 1020 + i * 120, transform: `translateY(${(1 - prog(f, i * 6, 40 + i * 6)) * 400 * rise - f * (0.25 - i * 0.07)}px)` })}>
          <path d={ridgePath(W, 900, 3 + i * 7, 0.55 - i * 0.12)} fill={["#3d5e47", "#2a4433", "#152a1e"][i]} />
        </svg>
      ))}
    </>
  );
};

// --- the scene types ---------------------------------------------------------------------

const Count = ({ s, th }) => {
  const f = useCurrentFrame();
  const big = s.value >= 10000 ? 170 : 280;
  return (
    <AbsoluteFill>
      {s.art === "stars" && <Stars sky={s.sky} mr={s.mr} k={prog(f, 0, s.dur * 0.8, Easing.inOut(Easing.cubic))} />}
      {s.art === "ridge" && <Ridges th={th} />}
      {s.art === "ridge" && (
        <svg width={W} height={700} style={abs({ left: 0, top: 250 })}>
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M-20 ${120 + i * 60} C 260 ${40 + i * 60}, 520 ${200 + i * 60}, 1100 ${90 + i * 60}`} fill="none" stroke="#e3ebe4" strokeOpacity=".14" strokeWidth="2" strokeDasharray="1300" strokeDashoffset={1300 * (1 - prog(f, i * 3, 45 + i * 3))} />
          ))}
        </svg>
      )}
      {s.art === "envelope" && (
        <div style={abs({ left: 0, top: 0, width: W, height: H, transform: `translateY(${(1 - prog(f, 0, 22, back)) * -300}px)` })}>
          <Envelope th={th} left={250} top={330} w={580} flap={prog(f, 4, 26, Easing.inOut(Easing.cubic))} seal={prog(f, 26, 38, back)} />
        </div>
      )}
      {s.art === "chunks" && <ChunkGrid th={th} k={prog(f, 4, s.dur * 0.85, Easing.inOut(Easing.cubic))} />}
      {s.art === "pen" && (
        <svg width={1000} height={260} style={abs({ left: 40, top: 430 })}>
          <path d="M20 180 C 140 60, 220 240, 340 140 S 540 40, 640 150 S 860 230, 980 90" fill="none" stroke={th.fg} strokeWidth="10" strokeLinecap="round" strokeDasharray="1400" strokeDashoffset={1400 * (1 - prog(f, 0, 45, Easing.inOut(Easing.cubic)))} />
        </svg>
      )}
      {s.art === "beam" && (
        <>
          <AbsoluteFill style={{ opacity: f > 12 ? 0.75 + 0.25 * Math.sin(f * 1.3) * (1 - prog(f, 12, 30)) : 0, background: "conic-gradient(from 170deg at 540px 1750px, transparent 0deg, rgba(251,191,36,.16) 10deg, rgba(251,191,36,.16) 20deg, transparent 26deg)" }} />
          <div style={abs({ left: 60, top: 300, width: 960, height: 540, borderRadius: 14, overflow: "hidden", opacity: f > 12 ? lerp(0.2, 1, prog(f, 12, 26)) : 0, filter: `brightness(${f > 12 ? lerp(2.2, 1, prog(f, 12, 34)) : 0})`, boxShadow: "0 0 120px rgba(251,191,36,.25)" })}>
            {s.shot && <Img src={src(s.shot)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
        </>
      )}
      <div style={abs({ ...center, top: s.art === "beam" ? 900 : 780, ...headStyle(th, big, { fontFamily: th.head === "serif" && s.art !== "stars" ? SANS : headStyle(th, 0).fontFamily, letterSpacing: -6 }), transform: `scale(${lerp(0.85, 1, prog(f, 10, 40, back))})`, opacity: prog(f, 8, 18), textShadow: th.dark ? "0 0 60px rgba(139,156,255,.35)" : "none" })}>
        <Counter value={s.value} from={14} to={70} />
      </div>
      <SlideIn at={40} variant="up" style={{ ...center, top: s.art === "beam" ? 1200 : (big > 200 ? 1080 : 1000), fontFamily: SERIF, fontStyle: "italic", fontSize: 84, color: th.accent }}>{s.label}</SlideIn>
      {s.sub && <SlideIn at={56} variant="up" style={{ ...center, top: big > 200 ? 1200 : 1120, ...label(th, { color: th.muted }) }}>{s.sub}</SlideIn>}
    </AbsoluteFill>
  );
};

const Stopwatch = ({ s, th }) => {
  const f = useCurrentFrame();
  const k = prog(f, 4, s.dur, Easing.inOut(Easing.cubic));
  const C = 2073;
  return (
    <AbsoluteFill>
      <svg width={760} height={760} style={abs({ left: 160, top: 420, transform: `scale(${lerp(0.8, 1, prog(f, 0, 24, back))})` })}>
        <circle cx="380" cy="380" r="330" fill="none" stroke={th.fg} strokeOpacity=".12" strokeWidth="28" />
        <circle cx="380" cy="380" r="330" fill="none" stroke={th.accent} strokeWidth="28" strokeLinecap="round" transform="rotate(-90 380 380)" strokeDasharray={C} strokeDashoffset={C * (1 - k * 0.25)} />
        {Array.from({ length: 60 }, (_, i) => <line key={i} x1="380" y1={i % 5 ? 70 : 58} x2="380" y2="92" stroke={th.fg} strokeOpacity={i % 5 ? 0.25 : 0.7} strokeWidth={i % 5 ? 3 : 6} transform={`rotate(${i * 6} 380 380)`} />)}
        <line x1="380" y1="380" x2="380" y2="120" stroke={th.fg} strokeWidth="10" strokeLinecap="round" transform={`rotate(${k * 90} 380 380)`} />
        <circle cx="380" cy="380" r="22" fill={th.fg} />
      </svg>
      <SlideIn at={14} variant="up" style={{ ...center, top: 1250, fontFamily: SERIF, fontStyle: "italic", fontSize: 84, color: th.fg }}>{s.question}</SlideIn>
      {s.options.map((o, i) => (
        <SlideIn key={o} at={30 + i * 14} variant={i % 2 ? "right" : "left"} style={{ top: i < 2 ? 280 : 1380, [i % 2 ? "right" : "left"]: 100, ...label(th, { color: i ? th.muted : th.accent, fontSize: 30 }) }}>{o}</SlideIn>
      ))}
    </AbsoluteFill>
  );
};

const TypedScene = ({ s, th }) => {
  const f = useCurrentFrame();
  const cpf = s.quote ? 1 : 1.6;
  return (
    <AbsoluteFill>
      {s.quote && <div style={abs({ left: 70, top: 320, fontFamily: SERIF, fontSize: 320, color: th.indigo || th.accent, opacity: prog(f, 0, 18) * 0.45, transform: `scale(${lerp(1.4, 1, prog(f, 0, 24))})` })}>“</div>}
      <SlideIn at={2} variant="left" style={{ left: 110, top: 470, ...label(th, { color: th.accent }) }}>{s.kicker}</SlideIn>
      {s.title && <SlideIn at={4} variant="up" style={{ left: 110, right: 110, top: 540, ...headStyle(th, 96, { color: th.accent }) }}>{s.title}</SlideIn>}
      <Typed text={s.text} at={s.title ? 16 : 8} cpf={cpf} caret={th.accent} style={abs({ left: 110, right: 110, top: s.title ? 820 : 560, fontFamily: /[ऀ-ॿ]/.test(s.text) ? DEVA : SERIF, fontSize: s.quote ? 92 : s.title ? 60 : s.text.length > 110 ? 64 : 80, lineHeight: 1.22, color: th.fg })} />
    </AbsoluteFill>
  );
};

const GLYPH = {
  code: (c) => <path d="M70 40 L20 100 L70 160 M190 40 L240 100 L190 160 M150 30 L110 170" fill="none" stroke={c} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />,
  run: (c) => <><path d="M10 150 C 70 150, 70 50, 130 50 S 190 150, 250 150" fill="none" stroke={c} strokeWidth="14" strokeLinecap="round" /><circle cx="130" cy="50" r="18" fill={c} /></>,
  peak: (c) => <><path d="M0 180 L80 70 L120 120 L170 30 L260 180 Z" fill="none" stroke={c} strokeWidth="14" strokeLinejoin="round" /><path d="M170 30 L170 0 L205 12 L170 24" fill={c} /></>,
  book: (c) => <path d="M130 50 C 90 30, 40 30, 10 45 L10 170 C 40 155, 90 155, 130 175 C 170 155, 220 155, 250 170 L250 45 C 220 30, 170 30, 130 50 Z M130 50 L130 175" fill="none" stroke={c} strokeWidth="12" strokeLinejoin="round" />,
  pen: (c) => <><path d="M40 170 L60 110 L190 -10 L230 30 L100 150 Z" fill="none" stroke={c} strokeWidth="12" strokeLinejoin="round" /><path d="M20 190 C 90 170, 160 200, 250 180" fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" /></>,
  gear: (c) => <><circle cx="130" cy="100" r="44" fill="none" stroke={c} strokeWidth="14" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="122" y="10" width="16" height="34" rx="4" fill={c} transform={`rotate(${a} 130 100)`} />)}</>,
  globe: (c) => <><circle cx="130" cy="100" r="80" fill="none" stroke={c} strokeWidth="14" /><path d="M50 100 H210 M130 20 C 90 60, 90 140, 130 180 C 170 140, 170 60, 130 20" fill="none" stroke={c} strokeWidth="10" /></>,
};

const Card = ({
  s, th, it, i, cur,
}) => {
  const f = useCurrentFrame();
  const local = f - it.at;
  const k = prog(local, 0, 12, Easing.bezier(0.22, 1, 0.36, 1));
  const enter = i === 0 ? {} : enterStyle(it.enter, k);
  const drift = prog(local, 0, it.len + 12, Easing.linear);
  if (s.style === "chapter") {
    return (
      <AbsoluteFill style={{ ...enter, background: th.bg }}>
        <SlideIn at={it.at + 2} variant="left" style={{ left: 110, top: 400, ...label(th, { color: th.muted }) }}>{it.kicker}</SlideIn>
        <svg width={260} height={200} style={abs({ left: 110, top: 480, opacity: prog(local, 0, 10), transform: `translateX(${(1 - prog(local, 0, 16)) * -80}px)` })}>{GLYPH[it.glyph]?.(th.accent)}</svg>
        <div style={abs({ left: 100, right: 80, top: 720, ...headStyle(th, 140) })}>
          {it.title.split(" ").map((word, wi, ws) => {
            const off = ws.slice(0, wi).join(" ").length + (wi ? 1 : 0);
            return (
              <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap", marginRight: "0.25em" }}>
                {[...word].map((c, j) => {
                  const q = (off + j) * 0.6;
                  return <span key={j} style={{ display: "inline-block", opacity: prog(local, 2 + q, 10 + q), transform: `translateY(${(1 - prog(local, 2 + q, 14 + q, back)) * 80}px)` }}>{c}</span>;
                })}
              </span>
            );
          })}
        </div>
        <div style={abs({ left: 110, top: 1040, width: 860, height: 4, background: th.fg, transformOrigin: "0 0", transform: `scaleX(${prog(local, 6, 24)})` })} />
        {it.lines.map((l, j) => <SlideIn key={l} at={it.at + 14 + j * 8} variant="right" style={{ left: 110, right: 100, top: 1080 + j * 92, fontFamily: SANS, fontWeight: 700, fontSize: 50, color: j ? th.muted : th.accent }}>{l}</SlideIn>)}
      </AbsoluteFill>
    );
  }
  if (s.style === "screen") {
    return (
      <AbsoluteFill style={{ ...enter, background: th.bg }}>
        <AbsoluteFill style={{ opacity: 0.6, background: "conic-gradient(from 170deg at 540px 1750px, transparent 0deg, rgba(251,191,36,.16) 10deg, rgba(251,191,36,.16) 20deg, transparent 26deg)" }} />
        <div style={abs({ left: 80, top: 330, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: th.muted })}>{it.index}</div>
        <div style={abs({ left: 60, top: 400, width: 960, height: 540, borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.6)", transform: `scale(${lerp(1, 1.04, drift)}) rotate(${(i % 2 ? 1 : -1) * (1 - k) * 4}deg)` })}>
          {it.shot ? <Img src={src(it.shot)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: "#292524" }} />}
        </div>
        <SlideIn at={it.at + 4} variant="up" style={{ left: 80, right: 80, top: 1010 }}>
          <div style={label(th, { fontSize: 24 })}>{it.kicker}</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 66, color: th.fg, marginTop: 14, lineHeight: 1.08, letterSpacing: -1 }}>{it.title}</div>
        </SlideIn>
      </AbsoluteFill>
    );
  }
  if (s.style === "issue") {
    return (
      <AbsoluteFill style={{ ...enter, background: th.bg }}>
        <div style={abs({ left: 80, top: 330, ...label(th) })}>{it.kicker}</div>
        <div style={abs({ right: 80, top: 330, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: th.muted })}>{it.index}</div>
        <div style={abs({ left: 60, top: 400, width: 960, height: 504, borderRadius: 18, overflow: "hidden", background: th.kraft, boxShadow: "0 40px 80px rgba(60,40,10,.3)", transform: `scale(${lerp(1, 1.04, drift)}) rotate(${(i % 2 ? 1 : -1) * lerp(4, 1, k)}deg)` })}>
          {it.photo && <Img src={src(it.photo)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <SlideIn at={it.at + 4} variant="up" style={{ left: 80, right: 80, top: 990 }}>
          <div style={{ ...headStyle(th, 78), ...clampLines(2) }}>{it.title}</div>
          {it.stats && <div style={{ marginTop: 22, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: th.accent }}>{it.stats}</div>}
        </SlideIn>
      </AbsoluteFill>
    );
  }
  if (s.style === "title") {
    return (
      <AbsoluteFill style={{ ...enter, background: th.bg }}>
        <div style={abs({ left: 70, top: 260, fontFamily: SANS, fontWeight: 700, fontSize: 340, letterSpacing: -14, lineHeight: 1, color: th.accent, opacity: 0.16 + 0.1 * prog(local, 0, 10), transform: `translateX(${(1 - k) * -120}px)` })}>{it.index}</div>
        <SlideIn at={it.at + 2} variant="left" style={{ left: 100, top: 720, ...label(th, { color: th.muted }) }}>{it.kicker}</SlideIn>
        <div style={abs({ left: 100, top: 780, width: 120, height: 8, background: th.accent, transformOrigin: "0 0", transform: `scaleX(${prog(local, 4, 14)})` })} />
        <SlideIn at={it.at + 4} variant={i % 2 ? "right" : "up"} style={{ left: 100, right: 90, top: 830, fontFamily: it.mr ? DEVA : SERIF, fontWeight: 700, fontSize: it.title.length > 60 ? 70 : 88, lineHeight: 1.12, color: th.fg, ...clampLines(5) }}>{it.title}</SlideIn>
      </AbsoluteFill>
    );
  }
  if (s.style === "section") {
    const g = GLYPH[it.glyph] ? it.glyph : "globe";
    return (
      <AbsoluteFill style={{ ...enter, background: th.bg }}>
        <SlideIn at={it.at + 2} variant="left" style={{ left: 110, top: 360, ...label(th) }}>{it.kicker}</SlideIn>
        <div style={abs({ right: 110, top: 360, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: th.muted })}>{it.index}</div>
        <svg width={260} height={200} style={abs({ left: 110, top: 440, opacity: prog(local, 0, 10), transform: `translateX(${(1 - prog(local, 0, 16)) * -80}px)` })}>{GLYPH[g](th.accent)}</svg>
        <div style={abs({ left: 110, right: 90, top: 690, fontFamily: /[ऀ-ॿ]/.test(it.title) ? DEVA : DISPLAY, fontWeight: 700, fontSize: it.title.length > 40 ? 72 : 92, lineHeight: 1.12, color: th.fg, ...clampLines(3), opacity: prog(local, 3, 12), transform: `translateY(${(1 - prog(local, 3, 16, back)) * 60}px)` })}>{it.title}</div>
        <div style={abs({ left: 110, top: 1060, width: 860, height: 4, background: th.soft, transformOrigin: "0 0", transform: `scaleX(${prog(local, 6, 24)})` })} />
        {(it.lines || []).map((l, j) => <SlideIn key={`${l}${j}`} at={it.at + 14 + j * 8} variant="right" style={{ left: 110, right: 100, top: 1100 + j * 100, fontFamily: /[ऀ-ॿ]/.test(l) ? DEVA : SANS, fontWeight: 700, fontSize: 42, color: th.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</SlideIn>)}
      </AbsoluteFill>
    );
  }
  if (s.style === "fullbleed") {
    return (
      <AbsoluteFill style={{ ...enter, background: th.bg }}>
        <Photo file={it.photo} k={drift} seed={i + 5} style={{ left: 0, top: 0, width: W, height: H }} filter="grayscale(1) contrast(1.15) brightness(.9)" />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,90,31,.35), rgba(10,10,10,.15) 40%, rgba(10,10,10,.92) 72%)" }} />
        {it.badge && (
          <div style={abs({ left: 90, top: 260, background: "#fff", padding: "22px 40px 18px", borderRadius: 12, boxShadow: "0 30px 60px rgba(0,0,0,.4)", transformOrigin: "0 0", transform: `scale(${lerp(1.5, 1, prog(local, 6, 14, back))}) rotate(-4deg)`, opacity: prog(local, 5, 8) })}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: "0.3em", color: "#555" }}>BIB</div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 140, color: "#0a0a0a", lineHeight: 1 }}>{it.badge}</div>
          </div>
        )}
        <SlideIn at={it.at + 3} variant={i % 2 ? "right" : "left"} len={10} dist={180} style={{ left: 80, right: 80, top: 1100 }}>
          <div style={label(th)}>{it.kicker}</div>
          <div style={{ ...headStyle(th, 96), marginTop: 14 }}>{it.title}</div>
          <div style={{ display: "flex", gap: 30, marginTop: 22, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: "#fff" }}>
            <span style={{ color: th.accent }}>{it.stats[0]}</span>
            <span>{it.stats[1]}</span>
          </div>
        </SlideIn>
      </AbsoluteFill>
    );
  }
  // postcard
  const r0 = (i % 2 ? 1 : -1) * 4;
  return (
    <AbsoluteFill style={{ ...enter }}>
      <div style={abs({ left: 110, top: 240, width: 860, height: 1180, background: "#f4efe3", borderRadius: 10, boxShadow: "0 50px 100px rgba(0,0,0,.55)", transform: `rotate(${lerp(r0 * 3, r0, k)}deg)` })}>
        <Photo file={it.photo} k={drift} seed={i + 9} radius={4} style={{ left: 34, top: 34, width: 792, height: 900 }} filter="saturate(.85) contrast(1.05)" />
        <div style={abs({ right: 60, top: 60, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: "#fff", background: "rgba(15,31,23,.7)", padding: "8px 16px", borderRadius: 8 })}>{it.index}</div>
        <div style={abs({ left: 34, right: 34, top: 960 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={label(th, { color: th.moss, fontSize: 24 })}>{it.kicker}</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fff", background: th.levels?.[it.badge] || th.moss, padding: "8px 16px", borderRadius: 8, transform: `scale(${lerp(1.6, 1, prog(local, 6, 14, back))})` }}>{it.badge}</span>
          </div>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 80, color: "#1f2a22", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
        </div>
      </div>
      <div style={abs({ left: 110, top: 1440, fontFamily: SANS, fontWeight: 700, fontSize: 90, color: th.accent, opacity: cur ? prog(local, 4, 10) : 0 })}>{it.year}</div>
    </AbsoluteFill>
  );
};

const Cards = ({ s, th }) => {
  const f = useCurrentFrame();
  const cur = s.items.reduce((a, it, i) => (f >= it.at ? i : a), 0);
  return (
    <AbsoluteFill style={{ background: s.style === "postcard" ? th.bg : undefined }}>
      {s.style === "postcard" && <Ridges th={th} rise={0} layers={2} />}
      {s.items.map((it, i) => ((i === cur || i === cur - 1) && f < it.at + it.len + 14
        ? <Card key={i} s={s} th={th} it={it} i={i} cur={i === cur} /> : null))}
    </AbsoluteFill>
  );
};

const Head = ({ th, text, at = 0, size = 104, top = 260 }) => (
  <SlideIn at={at} variant="left" style={{ left: 90, right: 90, top, ...headStyle(th, size) }}>{text}</SlideIn>
);

const List = ({ s, th }) => {
  const f = useCurrentFrame();
  const n = s.items.length;
  const gap = Math.min(s.style === "clock" ? 330 : 190, 1100 / n);
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={s.style === "dots" ? 76 : s.style === "rungs" ? 80 : 104} />
      {s.style === "ledger" && <div style={abs({ left: 150, top: 430, width: 3, height: 1080, background: th.accent, opacity: 0.5, transformOrigin: "0 0", transform: `scaleY(${prog(f, 4, 30)})` })} />}
      {s.items.map((it, i) => {
        const top = 440 + i * gap;
        const v = ["right", "left", "up"][i % 3];
        if (s.style === "dots") {
          return (
            <SlideIn key={it.title} at={it.at} variant="right" style={{ left: 90, right: 90, top, height: 60 }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: th.fg, width: 560, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
              <div style={{ position: "absolute", right: 0, top: 6, display: "flex", gap: 16 }}>
                {Array.from({ length: 5 }, (_, d) => {
                  const on = d < it.dots && f >= it.at + 6 + d * 3;
                  return <i key={d} style={{ width: 34, height: 34, borderRadius: "50%", display: "block", background: on ? th.accent : th.soft, transform: `scale(${on ? lerp(1.6, 1, prog(f, it.at + 6 + d * 3, it.at + 12 + d * 3)) : 1})` }} />;
                })}
              </div>
            </SlideIn>
          );
        }
        if (s.style === "clock") {
          const k = prog(f, it.at + 3, it.at + 40, Easing.out(Easing.cubic));
          const t = it.clock * k;
          const txt = `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
          return (
            <SlideIn key={it.label} at={it.at} variant={v} dist={160} style={{ left: 80, right: 80, top, paddingBottom: 26, borderBottom: `4px solid ${th.soft}` }}>
              <div style={label(th)}>{it.label}</div>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 150, color: k >= 1 ? th.accent : th.fg, letterSpacing: -4, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{txt}</div>
              <div style={{ fontFamily: SANS, fontSize: 32, color: th.muted }}>{it.sub}</div>
              {it.stamp && (
                <div style={{ position: "absolute", right: 0, top: 70, fontFamily: DISPLAY, fontWeight: 700, fontSize: 84, color: "#0a0a0a", background: th.accent, padding: "6px 24px", borderRadius: 12, opacity: prog(f, it.at + 46, it.at + 48), transform: `scale(${lerp(2, 1, prog(f, it.at + 46, it.at + 56, back))}) rotate(-6deg)` }}>{it.stamp}</div>
              )}
            </SlideIn>
          );
        }
        if (s.style === "paper") {
          return (
            <SlideIn key={it.title} at={it.at} variant="up" dist={180} style={{ left: 90, right: 90, top: 420 + i * 230, padding: "24px 34px", background: th.paper, borderRadius: 22, boxShadow: "0 24px 48px rgba(0,0,0,.35)", transform: `rotate(${(i % 2 ? 1 : -1) * (1 - prog(f, it.at, it.at + 14)) * 6}deg)` }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, color: th.accent }}>{it.label}</div>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: th.ink, marginTop: 6, lineHeight: 1.12 }}>{it.title}</div>
              <div style={{ fontFamily: SANS, fontSize: 30, color: "#64748b", marginTop: 8 }}>{it.sub}</div>
            </SlideIn>
          );
        }
        if (s.style === "rungs") {
          const last = i === n - 1;
          const y = 430 + i * Math.min(250, 1080 / n);
          return (
            <React.Fragment key={it.title}>
              {i > 0 && <div style={abs({ left: 150, top: y - Math.min(250, 1080 / n) + 140, width: 6, height: Math.min(250, 1080 / n) - 150, background: th.muted, opacity: 0.5 * prog(f, it.at - 4, it.at) })} />}
              <SlideIn at={it.at} variant={i % 2 ? "right" : "left"} style={{ left: 90, right: 90, top: y, padding: "22px 34px", borderRadius: 24, border: `3px solid ${last ? th.soft : th.accent}`, background: last ? "transparent" : "rgba(167,139,250,.08)" }}>
                <div style={label(th, { fontSize: 22, color: last ? th.muted : th.cyan || th.accent })}>{it.label}</div>
                <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: th.fg, marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                {it.sub && <div style={{ fontFamily: SANS, fontSize: 30, color: th.muted, marginTop: 6 }}>{it.sub}</div>}
              </SlideIn>
            </React.Fragment>
          );
        }
        if (s.style === "ledger") {
          return (
            <SlideIn key={it.label} at={it.at} variant="right" style={{ left: 190, right: 80, top: 440 + i * 262, paddingBottom: 26, borderBottom: `3px solid ${th.soft}` }}>
              <div style={label(th, { fontSize: 24 })}>{it.label}</div>
              <div style={{ fontFamily: SERIF, fontSize: 62, color: th.fg, marginTop: 8, lineHeight: 1.08, ...clampLines(2) }}>{it.title}</div>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: th.sepia || th.muted, marginTop: 8 }}>{it.sub}</div>
            </SlideIn>
          );
        }
        // numbered
        return (
          <SlideIn key={it.title} at={it.at} variant={v} style={{ left: 100, right: 90, top: 460 + i * 160, paddingBottom: 24, borderBottom: `3px solid ${th.soft}`, fontFamily: SANS, fontWeight: 700, fontSize: 46, color: th.fg }}>
            <span style={{ display: "inline-block", width: 76, color: th.accent, fontSize: 36 }}>{it.label}</span>
            {it.title}
          </SlideIn>
        );
      })}
    </AbsoluteFill>
  );
};

const Sheet = ({ s, th }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ transform: `scale(${lerp(1, 1.9, prog(f, s.dur - 14, s.dur, Easing.in(Easing.cubic)))})` }}>
      <div style={abs({ left: 140, top: 300, width: 800, height: 1132, background: th.paper, borderRadius: 10, boxShadow: "0 60px 120px rgba(0,0,0,.5)", transform: `translateY(${(1 - prog(f, 0, 24, back)) * 900}px) rotate(${(1 - prog(f, 0, 24)) * -6}deg)` })}>
        <Typed text={s.name} at={18} cpf={0.5} caret={th.accent} style={abs({ left: 70, top: 90, fontFamily: SANS, fontWeight: 700, fontSize: 82, color: th.ink, letterSpacing: -2 })} />
        <Typed text={s.role} at={48} cpf={1.2} caret={th.accent} style={abs({ left: 72, right: 60, top: 200, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: th.accent })} />
        <div style={abs({ left: 70, top: 310, width: 660, height: 4, background: th.ink, transformOrigin: "0 0", transform: `scaleX(${prog(f, 40, 60)})` })} />
        {[600, 520, 640, 380, 600, 560, 300, 620, 500, 640, 420, 580, 520, 360].map((w, i) => (
          <div key={i} style={abs({ left: 70, top: 360 + i * 50, width: w, height: 16, borderRadius: 8, background: i % 5 === 0 ? "#bfdbfe" : "#e2e8f0", transformOrigin: "0 0", transform: `scaleX(${prog(f, 60 + i * 2, 76 + i * 2)})` })} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const GROUP = { work: "#3b82f6", research: "#a78bfa", campus: "#94a3b8", leadership: "#94a3b8" };
const Timeline = ({ s, th }) => {
  const f = useCurrentFrame();
  const first = s.items[0]?.start || 2017;
  const last = Math.max(...s.items.map((r) => r.start)) + 1;
  const yOf = (y) => 330 + ((y - first) / Math.max(1, last - first)) * 1120;
  const used = {};
  const years = [];
  for (let y = first; y <= last; y += 1) years.push(y);
  return (
    <AbsoluteFill>
      <div style={abs({ left: 90, top: 220, ...label(th) })}>{s.head}</div>
      <div style={abs({ left: 200, top: 320, width: 4, height: 1150, background: th.soft, transformOrigin: "0 0", transform: `scaleY(${prog(f, 0, s.dur * 0.7, Easing.inOut(Easing.cubic))})` })} />
      {years.map((y, i) => <div key={y} style={abs({ left: 60, top: yOf(y) - 18, fontFamily: SANS, fontSize: 30, color: th.muted, opacity: prog(f, (i / years.length) * s.dur * 0.7, (i / years.length) * s.dur * 0.7 + 8) })}>{y}</div>)}
      {s.items.map((r, i) => {
        used[r.start] = (used[r.start] || 0) + 1;
        const y = yOf(r.start) + (used[r.start] - 1) * 118 - 36;
        const pulse = r.current ? 10 * (0.5 + 0.5 * Math.sin(f / 4)) : 0;
        return (
          <React.Fragment key={`${r.company}${r.start}${r.position}`}>
            <div style={abs({ left: 186, top: yOf(r.start) - 16, width: 32, height: 32, borderRadius: "50%", background: GROUP[r.group] || th.accent, boxShadow: `0 0 0 8px ${th.bg}, 0 0 0 ${8 + pulse}px rgba(59,130,246,.35)`, transform: `scale(${prog(f, r.at, r.at + 10, back)})` })} />
            <SlideIn at={r.at} variant={i % 2 ? "right" : "left"} style={{ left: 250, right: 60, top: y, padding: "16px 26px", borderLeft: `8px solid ${GROUP[r.group] || th.accent}`, background: "rgba(255,255,255,.06)", borderRadius: "0 18px 18px 0" }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.company}</div>
              <div style={{ fontFamily: SANS, fontSize: 30, color: "#cbd5e1", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{`${r.position}${r.duration ? ` · ${r.duration}` : ""}`}</div>
            </SlideIn>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

const Tiles = ({ s, th }) => (
  <AbsoluteFill>
    <Head th={th} text={s.head} size={92} />
    {s.items.map((it, i) => (
      <SlideIn key={it.label} at={it.at} variant="pop" style={{ left: 90 + (i % 2) * 470, top: 450 + Math.floor(i / 2) * 470, width: 430, height: 420, padding: "56px 44px", borderRadius: 36, background: i === 0 ? th.accent : "rgba(255,255,255,.07)" }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: it.value >= 1000 ? 124 : 180, letterSpacing: -6, lineHeight: 1, color: "#fff" }}><Counter value={it.value} from={it.at} to={it.at + 30} suffix={it.suffix || ""} /></div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: "#bfdbfe", marginTop: 18, textTransform: "uppercase", letterSpacing: "0.12em" }}>{it.label}</div>
      </SlideIn>
    ))}
  </AbsoluteFill>
);

const Bars = ({ s, th }) => {
  const f = useCurrentFrame();
  const m = max(s.items.map((x) => x.value));
  const base = 1430;
  const bw = 900 / s.items.length;
  const hMax = 780;
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={s.head.length > 16 ? 84 : 104} />
      {s.note && <SlideIn at={Math.round(s.dur * 0.72)} variant="left" style={{ left: 90, right: 90, top: 400, fontFamily: SANS, fontWeight: 700, fontSize: 46, color: th.accent }}>{s.note}</SlideIn>}
      {s.items.map((it, i) => {
        const k = prog(f, it.at, it.at + 22, back);
        const hh = Math.max(8, (it.value / m) * hMax * k);
        return (
          <React.Fragment key={it.label}>
            <div style={abs({ left: 90 + i * bw + 12, width: bw - 24, top: base - hh, height: hh, borderRadius: "12px 12px 0 0", background: it.hi ? th.accent : th.dark ? `linear-gradient(${th.indigo || "#e5e5e5"}, rgba(255,255,255,.12))` : th.fg })} />
            <div style={abs({ left: 90 + i * bw, width: bw, top: base + 18, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: s.items.length > 7 ? 28 : 34, color: th.muted, opacity: prog(f, it.at, it.at + 8) })}>{it.label}</div>
            <div style={abs({ left: 90 + i * bw - 20, width: bw + 40, top: base - hh - (it.sub ? 110 : 52), textAlign: "center", opacity: prog(f, it.at + 4, it.at + 12) })}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: s.items.length > 6 ? 28 : 64, color: it.hi ? th.accent : th.fg }}>{fmt(it.value * prog(f, it.at, it.at + 22))}</div>
              {it.sub && <div style={{ fontFamily: SANS, fontSize: 28, color: th.muted }}>{it.sub}</div>}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

const HBars = ({ s, th }) => {
  const f = useCurrentFrame();
  const m = max(s.items.map((x) => x.value));
  const gap = Math.min(200, 1050 / s.items.length);
  const track = s.style === "track";
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={track ? 160 : 110} />
      {s.items.map((it, i) => {
        const k = prog(f, it.at, it.at + 24, Easing.out(Easing.exp));
        const w = 90 + (it.value / m) * 640 * k;
        return (
          <SlideIn key={it.label} at={it.at} variant="left" len={8} style={{ left: 80, width: 920, top: 470 + i * gap, height: 160 }}>
            <div style={{ fontFamily: track ? DISPLAY : SANS, fontWeight: 700, fontSize: track ? 56 : 36, color: th.fg, textTransform: track ? "uppercase" : "none" }}>{it.label}</div>
            <div style={{ position: "absolute", left: 0, top: track ? 78 : 56, width: w, height: track ? 64 : 52, borderRadius: 40, overflow: "hidden", background: it.hi ? th.accent : track ? "#2a2a2a" : th.sepia || th.muted }}>
              {track && <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, transparent 0 46px, rgba(255,255,255,.1) 46px 50px)", transform: `translateX(${-f * 3}px)` }} />}
            </div>
            <div style={{ position: "absolute", left: w + 24, top: track ? 78 : 56, lineHeight: `${track ? 64 : 52}px`, fontFamily: SANS, fontWeight: 700, fontSize: track ? 60 : 40, color: it.hi || track ? th.accent : th.fg }}>{`${it.prefix || ""}${Math.round(it.value * k)}`}</div>
          </SlideIn>
        );
      })}
    </AbsoluteFill>
  );
};

const Calendar = ({ s, th }) => {
  const f = useCurrentFrame();
  const byKey = Object.fromEntries(s.months.map((m) => [m.month, m]));
  const y0 = Number(s.since.slice(0, 4));
  const y1 = Number(s.until.slice(0, 4));
  const mMax = max(s.months.map((m) => m.words));
  const cell = 72;
  const gx = 190;
  const gy = 520;
  const rows = y1 - y0 + 1;
  const totalCells = rows * 12;
  const span = s.dur * 0.6;
  const out = [];
  for (let y = y0; y <= y1; y += 1) {
    for (let m = 0; m < 12; m += 1) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const rec = byKey[key];
      const cx = gx + m * cell + cell / 2;
      const cy = gy + (y - y0) * (cell + 36) + cell / 2;
      const at = 14 + (((y - y0) * 12 + m) / totalCells) * span;
      const size = rec ? (18 + Math.sqrt(rec.words / mMax) * 84) * interpolate(f, [at, at + 6, at + 12, at + 20], [0, 1.25, 0.92, 1], clamp) : 12;
      out.push(<div key={key} style={abs({ left: cx - size / 2, top: cy - size / 2, width: size, height: size, borderRadius: "46% 54% 50% 50%", background: rec ? (key === s.busiest.month ? th.accent : th.fg) : th.soft, opacity: rec ? 0.9 : prog(f, at - 6, at) })} />);
    }
  }
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={fit(s.head, 96, th, 900)} />
      <SlideIn at={8} variant="left" style={{ left: 94, top: 385, fontFamily: SANS, fontSize: 40, color: th.muted }}>{s.sub}</SlideIn>
      {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => <div key={`${m}${i}`} style={abs({ left: gx + i * cell, width: cell, top: gy - 52, textAlign: "center", fontFamily: SANS, fontSize: 26, color: th.muted })}>{m}</div>)}
      {Array.from({ length: rows }, (_, r) => <div key={r} style={abs({ left: 60, top: gy + r * (cell + 36) + 18, fontFamily: SANS, fontSize: 30, color: th.muted })}>{y0 + r}</div>)}
      {out}
      <SlideIn at={Math.round(s.dur * 0.78)} variant="up" style={{ left: 90, right: 90, top: gy + rows * (cell + 36) + 20, fontFamily: SANS, fontWeight: 700, fontSize: 42, color: th.fg }}>
        <span style={{ color: th.accent }}>{s.busiest.label}</span>
        {` · ${s.busiest.posts} posts · ${fmt(s.busiest.words)} words`}
      </SlideIn>
    </AbsoluteFill>
  );
};

const Clock = ({ s, th }) => {
  const f = useCurrentFrame();
  const end = Math.round(s.dur * 0.6);
  if (s.mode === "fill") {
    const k = prog(f, 12, end, Easing.inOut(Easing.cubic));
    const hh = s.hours * k;
    const ang = (Math.min(24, hh) / 24) * 360;
    const rad = ((ang - 90) * Math.PI) / 180;
    return (
      <AbsoluteFill>
        <Photo file={s.photo} k={prog(f, 0, s.dur, Easing.linear)} seed={4} style={{ left: 0, top: 0, width: W, height: H }} filter="saturate(.7) brightness(.42)" />
        <AbsoluteFill style={{ background: `linear-gradient(transparent 40%, ${th.bg}ee 72%)` }} />
        <svg width={300} height={300} style={abs({ left: 80, top: 190 })} viewBox="0 0 560 560">
          <circle cx="280" cy="280" r="250" fill="rgba(15,31,23,.6)" stroke="#e3ebe4" strokeOpacity=".3" strokeWidth="6" />
          {Array.from({ length: 24 }, (_, i) => <line key={i} x1="280" y1="44" x2="280" y2={i % 6 ? 64 : 84} stroke="#e3ebe4" strokeWidth={i % 6 ? 3 : 6} transform={`rotate(${i * 15} 280 280)`} />)}
          {ang > 0 && <path d={`M280 280 L280 30 A250 250 0 ${ang > 180 ? 1 : 0} 1 ${280 + Math.cos(rad) * 250} ${280 + Math.sin(rad) * 250} Z`} fill={th.accent} opacity=".88" />}
          <line x1="280" y1="280" x2="280" y2="70" stroke="#fff" strokeWidth="8" strokeLinecap="round" transform={`rotate(${ang} 280 280)`} />
        </svg>
        <div style={abs({ ...center, top: 760, fontFamily: SANS, fontWeight: 700, fontSize: 220, letterSpacing: -8, color: "#fff" })}>{`${Math.floor(hh)}h`}</div>
        <div style={abs({ ...center, top: 1010, ...label(th) })}>hours on foot</div>
        <SlideIn at={end - 6} variant="up" style={{ ...center, top: 1110, fontFamily: SERIF, fontWeight: 700, fontSize: fit(s.head, 96, th), color: "#fff", whiteSpace: "nowrap" }}>{s.head}</SlideIn>
        <SlideIn at={end + 4} variant="up" style={{ ...center, top: 1250, fontFamily: SANS, fontSize: 36, color: "#e3ebe4" }}>{s.sub}</SlideIn>
      </AbsoluteFill>
    );
  }
  const R0 = 160;
  const R1 = 360;
  const m = max(s.hours);
  const k = prog(f, 4, end);
  const ang = lerp(0, (s.peak + 0.5) * 15, prog(f, 12, end, Easing.inOut(Easing.cubic)));
  const p = (a, r) => `${450 + Math.cos(a) * r},${450 + Math.sin(a) * r}`;
  return (
    <AbsoluteFill>
      <svg width={900} height={900} style={abs({ left: 90, top: 300 })}>
        <circle cx="450" cy="450" r={R0 - 10} fill="none" stroke={th.muted} strokeOpacity=".35" strokeWidth="2" />
        {s.hours.map((v, h) => {
          const a0 = (h / 24) * Math.PI * 2 - Math.PI / 2 + 0.02;
          const a1 = ((h + 1) / 24) * Math.PI * 2 - Math.PI / 2 - 0.02;
          const kk = prog(f, 4 + h, 24 + h, back);
          const r = R0 + (v / m) * (R1 - R0) * kk * k;
          const late = h >= 20 || h <= 3;
          return <path key={h} d={`M${p(a0, R0)} L${p(a0, r)} A ${r} ${r} 0 0 1 ${p(a1, r)} L${p(a1, R0)} A ${R0} ${R0} 0 0 0 ${p(a0, R0)} Z`} fill={late ? th.indigo : "#3a3f73"} />;
        })}
        {[0, 6, 12, 18].map((h) => { const a = (h / 24) * Math.PI * 2 - Math.PI / 2; return <text key={h} x={450 + Math.cos(a) * (R1 + 44)} y={450 + Math.sin(a) * (R1 + 44) + 12} textAnchor="middle" fontFamily="Inter" fontSize="32" fill={th.muted}>{String(h).padStart(2, "0")}</text>; })}
        <line x1="450" y1="450" x2="450" y2={450 - R1 - 6} stroke={th.accent} strokeWidth="6" strokeLinecap="round" transform={`rotate(${ang} 450 450)`} />
        <circle cx="450" cy="450" r="14" fill={th.accent} />
      </svg>
      <svg width={140} height={140} style={abs({ left: 860, top: 200, opacity: prog(f, end - 10, end + 4), transform: `translateY(${(1 - prog(f, end - 10, end + 10)) * 40}px)` })}><path d="M90 10 A 62 62 0 1 0 130 100 A 50 50 0 1 1 90 10 Z" fill={th.accent} /></svg>
      <SlideIn at={end} variant="zoom" style={{ ...center, top: 1230, fontFamily: SANS, fontWeight: 700, fontSize: 104, color: th.fg, letterSpacing: -3 }}>{s.head}</SlideIn>
      <SlideIn at={end + 10} variant="up" style={{ ...center, top: 1370, fontFamily: SANS, fontWeight: 700, fontSize: 46, color: th.indigo }}>{s.sub}</SlideIn>
    </AbsoluteFill>
  );
};

const Split = ({ s, th }) => {
  const f = useCurrentFrame();
  const total = s.a.n + s.b.n;
  const k = prog(f, 12, 40);
  return (
    <AbsoluteFill>
      <SlideIn at={0} variant="left" style={{ left: 100, top: 300 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 150, letterSpacing: -5, color: th.fg }}><Counter value={s.a.n} from={4} to={40} /></div>
        <div style={label(th, { color: th.indigo })}>{s.a.label}</div>
      </SlideIn>
      <SlideIn at={6} variant="right" style={{ right: 100, top: 300, textAlign: "right" }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 150, letterSpacing: -5, color: th.fg }}><Counter value={s.b.n} from={8} to={44} /></div>
        <div style={{ fontFamily: DEVA, fontWeight: 700, fontSize: 48, color: th.accent }}>{s.b.label}</div>
      </SlideIn>
      <div style={abs({ left: 100, top: 590, width: (s.a.n / total) * 874 * k, height: 28, background: th.indigo, borderRadius: "14px 0 0 14px" })} />
      <div style={abs({ right: 100, top: 590, width: (s.b.n / total) * 874 * k, height: 28, background: th.accent, borderRadius: "0 14px 14px 0" })} />
      {s.phrases.map((ph, i) => (
        <SlideIn key={ph.text} at={40 + i * 8} variant={i % 2 ? "right" : "left"} style={{ left: 90 + (i % 2) * 450 + random(`px${i}`) * 50, top: 720 + Math.floor(i / 2) * 175 + random(`py${i}`) * 30, transform: `translateY(${Math.sin(f / 14 + i) * 8}px)`, fontFamily: ph.mr ? DEVA : SERIF, fontStyle: ph.mr ? "normal" : "italic", fontSize: ph.mr ? 62 : 70, color: ph.mr ? th.accent : th.indigo, whiteSpace: "nowrap" }}>{ph.text}</SlideIn>
      ))}
    </AbsoluteFill>
  );
};

const Wall = ({ s, th }) => {
  const f = useCurrentFrame();
  const cols = 3;
  const tw = 300;
  const tht = 169;
  const gap = 20;
  const rows = Math.ceil(s.shots.length / cols);
  const ox = (W - (cols * tw + (cols - 1) * gap)) / 2;
  const scroll = prog(f, 20, s.dur, Easing.inOut(Easing.cubic)) * Math.max(0, rows * (tht + gap) - 760);
  return (
    <AbsoluteFill>
      {s.shots.map((d, i) => {
        const at = Math.round((i / s.shots.length) * 45);
        return (
          <div key={i} style={abs({ left: ox + (i % cols) * (tw + gap), top: 260 + Math.floor(i / cols) * (tht + gap) - scroll, width: tw, height: tht, borderRadius: 10, overflow: "hidden", background: "#292524", opacity: prog(f, at, at + 6), transform: `scale(${lerp(0.6, 1, prog(f, at, at + 14, back))}) rotate(${(1 - prog(f, at, at + 14)) * (i % 2 ? 8 : -8)}deg)` })}>
            {d.shot && <Img src={src(d.shot)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
        );
      })}
      <div style={abs({ left: 0, right: 0, top: 960, height: 960, background: `linear-gradient(transparent, ${th.bg} 40%)` })} />
      <div style={abs({ ...center, top: 1150, fontFamily: SANS, fontWeight: 700, fontSize: 170, letterSpacing: -6, color: th.fg, opacity: prog(f, 46, 54) })}>
        {s.value ? <Counter value={s.value} from={50} to={100} /> : s.shots.length}
      </div>
      <SlideIn at={70} variant="up" style={{ ...center, top: 1360, ...label(th, { fontSize: 24 }) }}>{s.label}</SlideIn>
    </AbsoluteFill>
  );
};

const Dots = ({ s, th }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={110} />
      <div style={abs({ left: 120, top: 820, width: 840, height: 4, background: th.muted, transformOrigin: "0 0", transform: `scaleX(${prog(f, 6, s.dur * 0.62)})` })} />
      {s.items.map((it, i) => (
        <div key={i} style={abs({ left: 120 + it.t * 840 - 16, top: 820 - 16 - (i % 4) * 50, width: 32, height: 32, borderRadius: "50%", background: th.accent, boxShadow: "0 0 30px rgba(251,191,36,.6)", transform: `scale(${prog(f, it.at, it.at + 10, back)})` })} />
      ))}
      <div style={abs({ left: 110, top: 870, fontFamily: SANS, fontSize: 30, color: th.muted })}>{s.fromDate}</div>
      <div style={abs({ right: 110, top: 870, fontFamily: SANS, fontSize: 30, color: th.muted, opacity: prog(f, s.dur * 0.55, s.dur * 0.62) })}>{s.toDate}</div>
      <SlideIn at={Math.round(s.dur * 0.7)} variant="zoom" style={{ ...center, top: 1030, fontFamily: SANS, fontWeight: 700, fontSize: 140, letterSpacing: -4, color: th.accent }}>{s.big}</SlideIn>
      <SlideIn at={Math.round(s.dur * 0.7) + 10} variant="up" style={{ ...center, top: 1210, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: th.fg }}>{s.sub}</SlideIn>
    </AbsoluteFill>
  );
};

const Peaks = ({ s, th }) => {
  const f = useCurrentFrame();
  const m = max(s.items.map((x) => x.value));
  const base = 1300;
  return (
    <AbsoluteFill>
      <Head th={th} text={s.head} size={130} />
      {s.items.map((it, i) => {
        const cx = 210 + i * 330;
        const hgt = 160 + (it.value / m) * 640 * prog(f, it.at, it.at + 30, back);
        const sh = hgt * 0.22;
        const col = th.levels?.[it.label] || th.accent;
        return (
          <React.Fragment key={it.label}>
            <svg width={420} height={900} style={abs({ left: cx - 210, top: base - 900 })}>
              <path d={`M0 900 L210 ${900 - hgt} L420 900 Z`} fill={col} />
              <path d={`M210 ${900 - hgt} L${210 - sh} ${900 - hgt + sh} L210 ${900 - hgt + sh * 0.7} L${210 + sh} ${900 - hgt + sh} Z`} fill="#fff" opacity=".85" />
            </svg>
            <SlideIn at={it.at + 10} variant="up" style={{ left: cx - 160, width: 320, top: base + 24, textAlign: "center" }}>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 100, color: th.fg }}>{it.value}</div>
              <div style={label(th, { color: col })}>{it.label}</div>
            </SlideIn>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

const Countdown = ({ s, th }) => {
  const f = useCurrentFrame();
  const step = s.dur / 4;
  const i = Math.min(3, Math.floor(f / step));
  const local = f - i * step;
  const r = 120 + prog(local, 0, step) * 700;
  return (
    <AbsoluteFill>
      <div style={abs({ ...center, top: 560, fontFamily: DISPLAY, fontWeight: 700, fontSize: i < 3 ? 600 : 420, lineHeight: 1, color: i < 3 ? th.fg : th.accent, transform: `scale(${lerp(1.7, 1, prog(local, 0, 9))})` })}>{i < 3 ? 3 - i : "GO"}</div>
      <div style={abs({ left: 540 - r / 2, top: 900 - r / 2, width: r, height: r, border: `16px solid ${th.accent}`, borderRadius: "50%", opacity: 1 - prog(local, 0, step) })} />
      {i === 3 && <AbsoluteFill style={{ background: th.accent, opacity: 0.6 * (1 - prog(local, 0, 8)) }} />}
    </AbsoluteFill>
  );
};

const End = ({ s, th }) => {
  const f = useCurrentFrame();
  const top = s.photo && s.round ? 1000 : s.shot ? 900 : s.sheet ? 1180 : s.envelope ? 930 : 640;
  return (
    <AbsoluteFill>
      {s.stars && <Stars sky={s.sky} mr={s.mr} dim={0.5} />}
      {s.envelope && (
        <div style={abs({ left: 0, top: 0, width: W, height: H, transform: `translateY(${(1 - prog(f, 0, 20, back)) * 200}px) rotate(${(1 - prog(f, 0, 20)) * -6}deg)` })}>
          <Envelope th={th} left={270} top={360} w={540} flap={1} seal={prog(f, 20, 32, back)} />
        </div>
      )}
      {s.ridge && <Ridges th={th} />}
      {s.photo && !s.round && <Photo file={s.photo} k={prog(f, 0, s.dur, Easing.linear)} seed={2} style={{ left: 0, top: 0, width: W, height: H }} filter="grayscale(1) brightness(.42) contrast(1.2)" />}
      {s.photo && s.round && (
        <>
          <svg width={620} height={620} style={abs({ left: 230, top: 300 })}>
            <circle cx="310" cy="310" r="290" fill="none" stroke={th.fg} strokeOpacity=".12" strokeWidth="16" />
            <circle cx="310" cy="310" r="290" fill="none" stroke={th.accent} strokeWidth="16" strokeLinecap="round" transform="rotate(-90 310 310)" strokeDasharray="1822" strokeDashoffset={1822 * (1 - prog(f, 0, 80, Easing.inOut(Easing.cubic)))} />
          </svg>
          <Photo file={s.photo} k={prog(f, 0, s.dur)} seed={3} radius={270} style={{ left: 270, top: 340, width: 540, height: 540, transform: `scale(${lerp(0.85, 1, prog(f, 0, 24, back))})` }} />
        </>
      )}
      {s.shot && (
        <div style={abs({ left: 220, top: 380, width: 640, height: 360, borderRadius: 12, overflow: "hidden", boxShadow: "0 0 100px rgba(251,191,36,.3)", transform: `scale(${lerp(0.9, 1, prog(f, 0, 24))})` })}>
          <Img src={src(s.shot)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {s.live && <div style={{ position: "absolute", left: 20, top: 20, fontFamily: SANS, fontWeight: 700, fontSize: 26, letterSpacing: "0.2em", color: "#fff", background: "rgba(0,0,0,.6)", padding: "8px 16px", borderRadius: 10, opacity: Math.floor(f / 15) % 2 ? 0.5 : 1 }}>● LIVE</div>}
        </div>
      )}
      {s.sheet && (
        <div style={abs({ left: 290, top: 330, width: 500, height: 707, background: th.paper, borderRadius: 8, boxShadow: "0 40px 90px rgba(0,0,0,.5)", transform: `translateY(${(1 - prog(f, 0, 24)) * -200}px)` })}>
          <div style={{ position: "absolute", left: 44, top: 50, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: th.ink }}>Sanket Tambare</div>
          {[420, 360, 460, 300, 440, 380, 220, 450, 340, 460, 280, 400, 380, 240, 420, 300].map((w, i) => <div key={i} style={{ position: "absolute", left: 44, top: 130 + i * 34, height: 12, borderRadius: 6, width: w, background: i % 5 === 0 ? th.accent : "#e2e8f0" }} />)}
        </div>
      )}
      {s.tape && (
        <>
          <div style={abs({ left: -40, width: 580, top: top + 610, height: 26, background: th.accent, transformOrigin: "0 50%", transform: `rotate(${-2 - prog(f, 40, 56) * 18}deg) translateX(${-prog(f, 40, 56) * 120}px)` })} />
          <div style={abs({ left: 540, width: 580, top: top + 610, height: 26, background: th.accent, transformOrigin: "100% 50%", transform: `rotate(${-2 + prog(f, 40, 56) * 18}deg) translateX(${prog(f, 40, 56) * 120}px)` })} />
        </>
      )}
      {s.kicker && <SlideIn at={2} variant="up" style={{ ...center, top: top - 90, fontFamily: SANS, fontWeight: 700, fontSize: 36, color: th.muted }}>{s.kicker}</SlideIn>}
      {s.lines.filter(Boolean).map((l, i) => (
        <SlideIn key={l} at={6 + i * 12} variant={["up", "zoom", "up"][i]} style={{ ...center, top: top + i * (th.head === "display" ? 200 : 140), whiteSpace: "nowrap", ...headStyle(th, fit(l, th.head === "display" ? (i < 2 ? 160 : 100) : 110, th), { color: i % 2 ? th.accent : th.fg, fontStyle: th.head === "serif" && i % 2 ? "italic" : "normal" }) }}>{l}</SlideIn>
      ))}
      {s.underline && (
        <svg width={700} height={60} style={abs({ left: 190, top: top + 250 })}>
          <path d="M10 40 C 200 10, 500 60, 690 22" fill="none" stroke={th.accent} strokeWidth="9" strokeLinecap="round" strokeDasharray="760" strokeDashoffset={760 * (1 - prog(f, 30, 54))} />
        </svg>
      )}
      {s.chips && (
        <SlideIn at={36} variant="up" style={{ left: 80, right: 80, top: top + 300, textAlign: "center" }}>
          {s.chips.map((c) => <span key={c} style={{ display: "inline-block", margin: "0 10px 16px", padding: "10px 24px", borderRadius: 999, border: "2px solid rgba(139,156,255,.5)", color: th.indigo, fontFamily: SANS, fontWeight: 700, fontSize: 30 }}>{c}</span>)}
        </SlideIn>
      )}
    </AbsoluteFill>
  );
};

export const SCENES = {
  count: Count, stopwatch: Stopwatch, typed: TypedScene, cards: Cards, list: List, sheet: Sheet, timeline: Timeline, tiles: Tiles,
  bars: Bars, hbars: HBars, calendar: Calendar, clock: Clock, split: Split, wall: Wall, dots: Dots, peaks: Peaks, countdown: Countdown, end: End,
  shells: Shells, goal: Goal, trail: Trail, gather: Gather, chips: Chips, chat: Chat, pulse: Pulse,
};

export { ease };
