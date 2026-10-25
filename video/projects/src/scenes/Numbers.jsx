// 8–17 s: the numbers, then the variety — every tool and every tag in moving
// bands. All counts come from data.js.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Hud, fonts, LIME, INK, prog, pop, out, useTime, Chip, Glitch } from "../kit";
import { STATS, CATEGORIES, TOOLS, TAGS } from "../data";
import { T } from "../timeline";

const Kicker = ({ children, p }) => (
  <div style={{
    fontFamily: fonts.mono, fontSize: 32, letterSpacing: 6, color: LIME, opacity: p,
    clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
  }}>{children}</div>
);

const Big = ({ t, at, value, label, sub }) => {
  const s = pop(t, at, 12, 8);
  const n = Math.round(value * prog(t, at, at + 0.7, out));
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 28, transform: `translateX(${(1 - Math.min(1, s)) * -120}px)`, opacity: Math.min(1, s * 2) }}>
      <div style={{ fontFamily: fonts.slam, fontSize: 260, lineHeight: 0.9, color: "#fff", minWidth: 330, textAlign: "right", textShadow: `0 0 50px ${LIME}55` }}>
        {sub ?? n}
      </div>
      <div style={{ fontFamily: fonts.slam, fontSize: 92, color: LIME, lineHeight: 0.95 }}>{label}</div>
    </div>
  );
};

/** A band of chips sliding sideways forever. */
const Band = ({ t, items, dir, speed, y, render }) => {
  const x = ((t * speed * dir) % 1600) - (dir > 0 ? 1600 : 0);
  const row = [...items, ...items, ...items];
  return (
    <div style={{ position: "absolute", top: y, left: 0, display: "flex", gap: 18, transform: `translateX(${x}px)` }}>
      {row.map((it, i) => <React.Fragment key={i}>{render(it, i)}</React.Fragment>)}
    </div>
  );
};

const TAG_COLORS = ["#c6ff3d", "#5ee7ff", "#ffc857", "#ff7ab6", "#a78bfa", "#7ee081"];

export const Numbers = ({ start }) => {
  const t = useTime(start);
  const statsOut = prog(t, T.variety - 0.3, T.variety);
  const varIn = prog(t, T.variety, T.variety + 0.4, out);

  return (
    <Glitch t={t} at={T.stats} len={0.2}>
      <Hud t={t}>
        {/* Stats */}
        <AbsoluteFill style={{ padding: "260px 70px", opacity: 1 - statsOut, transform: `translateY(${-statsOut * 120}px)` }}>
          <Kicker p={prog(t, T.stats + 0.1, T.stats + 0.5)}>// BY THE NUMBERS</Kicker>
          <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 34 }}>
            <Big t={t} at={T.stats + 0.4} value={STATS.projects} label={<>PROJECTS<br />SHIPPED</>} />
            <Big t={t} at={T.stats + 1.2} value={STATS.tools} label={<>TOOLS &amp;<br />TECHNOLOGIES</>} />
            <Big t={t} at={T.stats + 2.0} value={STATS.orgs} label={<>ORGANISATIONS<br />SERVED</>} />
          </div>
          <div style={{ marginTop: 70, display: "flex", flexWrap: "wrap", gap: 16 }}>
            {CATEGORIES.map((c, i) => (
              <div key={c.name} style={{ transform: `scale(${pop(t, T.stats + 2.8 + i * 0.12)})` }}>
                <Chip size={32}>{c.name} · {c.n}</Chip>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 44, fontFamily: fonts.mono, fontSize: 34, color: "#8b97b5", opacity: prog(t, T.stats + 3.4, T.stats + 3.8) }}>
            {STATS.from} → {STATS.to} · {STATS.live} live today
          </div>
        </AbsoluteFill>

        {/* Variety */}
        {t > T.variety - 0.1 && (
          <AbsoluteFill style={{ opacity: varIn }}>
            <div style={{ position: "absolute", top: 230, left: 70, right: 70 }}>
              <Kicker p={prog(t, T.variety + 0.1, T.variety + 0.5)}>// THE TOOLKIT</Kicker>
              <div style={{ fontFamily: fonts.slam, fontSize: 150, color: "#fff", lineHeight: 0.92, marginTop: 24 }}>
                DIFFERENT PROBLEMS.<br /><span style={{ color: LIME }}>DIFFERENT TOOLS.</span>
              </div>
            </div>
            {[0, 1, 2, 3].map((r) => (
              <Band key={`tool${r}`} t={t} dir={r % 2 ? 1 : -1} speed={160 + r * 40} y={720 + r * 100}
                items={TOOLS.filter((_, i) => i % 4 === r)}
                render={(it) => <Chip size={36} solid={it.n > 2} color={r % 2 ? "#5ee7ff" : LIME}>{it.name}</Chip>} />
            ))}
            <div style={{ position: "absolute", top: 1180, left: 70, fontFamily: fonts.mono, fontSize: 30, letterSpacing: 6, color: "#ffc857" }}>
              // {TAGS.length} TOPICS
            </div>
            {[0, 1, 2].map((r) => (
              <Band key={`tag${r}`} t={t} dir={r % 2 ? -1 : 1} speed={120 + r * 50} y={1250 + r * 92}
                items={TAGS.filter((_, i) => i % 3 === r)}
                render={(it, i) => <Chip size={32} color={TAG_COLORS[(i + r) % TAG_COLORS.length]}>#{it.name.replace(/\s+/g, "")}</Chip>} />
            ))}
            <div style={{
              position: "absolute", bottom: 230, left: 0, right: 0, textAlign: "center", fontFamily: fonts.ui, fontWeight: 800,
              fontSize: 46, color: "#fff", opacity: prog(t, T.variety + 1.6, T.variety + 2.0),
            }}>
              Each one built <span style={{ background: LIME, color: INK, padding: "0 12px" }}>for a reason.</span>
            </div>
          </AbsoluteFill>
        )}
      </Hud>
    </Glitch>
  );
};
