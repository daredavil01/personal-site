// 55.5–60 s: open to collaboration, and where to find the rest.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Hud, fonts, LIME, INK, prog, pop, out, useTime, Glitch } from "../kit";
import { COVERS } from "../data";
import { T } from "../timeline";

const CONTACT = [
  ["↗", "sankettambare.in/projects", "every project"],
  ["@", "sanket.tambare01@gmail.com", "email"],
  ["in", "linkedin.com/in/sankettambare", "linkedin"],
  ["→", "sankettambare.in/contact", "contact"],
];

export const Outro = ({ start }) => {
  const t = useTime(start);
  const at = T.outro;
  const head = (k) => prog(t, at + 0.1 + k * 0.18, at + 0.5 + k * 0.18, out);

  return (
    <Glitch t={t} at={at} len={0.25}>
      <Hud t={t}>
        <AbsoluteFill style={{ opacity: 0.16, transform: `translateY(${-(t - at) * 40}px)` }}>
          {COVERS.map((p, i) => (
            <Img key={p.id} src={staticFile(p.cover)} style={{
              position: "absolute", width: 270, height: 170, objectFit: "cover", left: (i % 4) * 270, top: Math.floor(i / 4) * 170 + 200,
            }} />
          ))}
        </AbsoluteFill>
        <AbsoluteFill style={{ background: `linear-gradient(${INK}cc, ${INK}ee 50%, ${INK})` }} />

        <div style={{ position: "absolute", left: 70, right: 70, top: 300 }}>
          <div style={{ fontFamily: fonts.slam, fontSize: 190, lineHeight: 0.88, color: "#fff" }}>
            <div style={{ opacity: head(0), transform: `translateY(${(1 - head(0)) * 50}px)` }}>OPEN TO</div>
            <div style={{ opacity: head(1), transform: `translateY(${(1 - head(1)) * 50}px)`, color: LIME, textShadow: `0 0 60px ${LIME}66` }}>
              COLLABORATION.
            </div>
          </div>
          <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 48, lineHeight: 1.3, color: "#dfe6f5", marginTop: 34, opacity: head(2) }}>
            Got an idea worth building — for a cause, a question or a community? Let&apos;s talk.
          </div>

          <div style={{ marginTop: 90, display: "flex", flexDirection: "column", gap: 26 }}>
            {CONTACT.map(([icon, text, label], i) => {
              const s = Math.min(1, pop(t, at + 1.0 + i * 0.22, 12, 8));
              const first = i === 0;
              return (
                <div key={text} style={{
                  display: "flex", alignItems: "center", gap: 26, opacity: s, transform: `translateX(${(1 - s) * -80}px)`,
                  padding: first ? "26px 30px" : "6px 30px", borderRadius: 24,
                  background: first ? LIME : "transparent", color: first ? INK : "#fff",
                  boxShadow: first ? `0 0 70px ${LIME}66` : "none",
                }}>
                  <span style={{
                    width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontFamily: fonts.mono, fontWeight: 700, fontSize: 30, background: first ? INK : `${LIME}22`, color: LIME,
                  }}>{icon}</span>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: first ? 42 : 36 }}>{text}</span>
                    <span style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: 4, opacity: 0.6, textTransform: "uppercase" }}>{label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Hud>
    </Glitch>
  );
};
