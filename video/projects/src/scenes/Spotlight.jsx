// 17–51 s: one spotlight per project (or group): chapter, name, why it
// exists, the live site recorded on a phone, and what it is built with.
import React from "react";
import { Hud, fonts, prog, pop, out, useTime, Chip, Glitch, Phone, Rec } from "../kit";
import { SPOTS } from "../data";

const SCALE = 0.56;
const PW = 1080 * SCALE + 28;

export const Spotlight = ({ start, index }) => {
  const t = useTime(start);
  const s = SPOTS[index];
  const { accent } = s;
  const local = t - s.at;
  const dur = s.until - s.at;
  const enter = pop(t, s.at, 10, 7);
  const leave = prog(t, s.until - 0.3, s.until);
  const head = (k) => prog(t, s.at + 0.1 + k * 0.15, s.at + 0.45 + k * 0.15, out);

  // Clips share the time after the entrance; each slides in from the right.
  const per = (dur - 0.2) / s.clips.length;
  const ci = Math.min(s.clips.length - 1, Math.floor(Math.max(0, local - 0.2) / per));
  const clipT = Math.max(0, local - 0.2 - ci * per);
  const slide = ci > 0 ? 1 - prog(clipT, 0, 0.3, out) : 0;
  const org = s.rows[ci]?.org;

  return (
    <Glitch t={t} at={s.at} len={0.22}>
      <Hud t={t} tint={accent}>
        <div style={{ position: "absolute", left: 70, right: 70, top: 120, opacity: 1 - leave }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.mono, fontSize: 30, letterSpacing: 5, opacity: head(0) }}>
            <span style={{ color: accent }}>// {s.chapter.toUpperCase()}</span>
            <span style={{ color: "#8b97b5" }}>{String(index + 1).padStart(2, "0")} / {String(SPOTS.length).padStart(2, "0")}</span>
          </div>
          <div style={{
            fontFamily: fonts.slam, fontSize: s.title.length > 22 ? 104 : 128, color: "#fff", lineHeight: 0.92, marginTop: 18,
            clipPath: `inset(0 ${100 - head(1) * 100}% 0 0)`,
          }}>{s.title}</div>
          <div style={{
            fontFamily: fonts.ui, fontWeight: 600, fontSize: 38, lineHeight: 1.28, color: "#dfe6f5", marginTop: 16,
            opacity: head(2), transform: `translateY(${(1 - head(2)) * 30}px)`,
          }}>{s.line}</div>
        </div>

        <Phone scale={SCALE} glow={accent} style={{
          left: (1080 - PW) / 2, top: 600,
          transform: `translateY(${(1 - enter) * 1200 + leave * -80}px) perspective(2400px) rotateY(${(1 - prog(t, s.at, s.at + 1.2, out)) * -14}deg)`,
          opacity: 1 - leave,
        }}>
          {s.clips.map((c, k) => (k === ci || (k === ci - 1 && slide > 0)) && (
            <div key={c} style={{
              position: "absolute", inset: 0,
              transform: k === ci ? `translateX(${slide * 1080}px)` : `translateX(${(slide - 1) * 400}px)`,
            }}>
              <div style={{ width: 1080, height: 1920, transform: `scale(${1 + 0.04 * (k === ci ? clipT / per : 1)})`, transformOrigin: "50% 0" }}>
                <Rec clip={c} t={k === ci ? clipT : per} speed={1} />
              </div>
            </div>
          ))}
        </Phone>

        {org && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1735, textAlign: "center", opacity: head(3) * (1 - leave) }}>
            <Chip key={org} size={28} color={accent} solid>for {org}</Chip>
          </div>
        )}
        <div style={{
          position: "absolute", left: 50, right: 50, top: org ? 1805 : 1745, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12,
          opacity: 1 - leave,
        }}>
          {s.tech.slice(0, 4).map((x, i) => (
            <div key={x} style={{ transform: `scale(${pop(t, s.at + 0.6 + i * 0.1)})` }}>
              <Chip size={24} color="#e8f0ff">{x}</Chip>
            </div>
          ))}
        </div>
        {!org && (
          <div style={{
            position: "absolute", left: 0, right: 0, top: 1830, textAlign: "center", fontFamily: fonts.mono, fontSize: 28,
            color: accent, opacity: head(4) * (1 - leave),
          }}>↗ {s.url}</div>
        )}
      </Hud>
    </Glitch>
  );
};
