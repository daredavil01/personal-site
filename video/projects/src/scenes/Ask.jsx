// 51–55.5 s: /ask, typed and answered for real, then the camera settles on
// the answer.
import React from "react";
import { Img } from "remotion";
import { Hud, fonts, LIME, prog, pop, out, useTime, Chip, Glitch, Phone, frameSrc } from "../kit";
import { ASK } from "../data";
import { T } from "../timeline";

const SCALE = 0.56;
const PW = 1080 * SCALE + 28;
const TYPE_END = T.ask + 1.3;
const WAIT_END = T.ask + 1.9;

export const Ask = ({ start }) => {
  const t = useTime(start);
  const enter = pop(t, T.ask, 10, 7);
  const leave = prog(t, T.outro - 0.3, T.outro);
  const head = (k) => prog(t, T.ask + 0.1 + k * 0.15, T.ask + 0.45 + k * 0.15, out);

  // Typing plays at its own pace squeezed into 1.3 s, one beat of
  // "Reading the archive…", then the settled answer.
  const i = t < TYPE_END
    ? Math.floor(ASK.typed * prog(t, T.ask + 0.2, TYPE_END, (x) => x))
    : t < WAIT_END ? ASK.typed + 25 : ASK.settled;
  const zoom = 1 + 0.2 * prog(t, WAIT_END, WAIT_END + 0.8);

  return (
    <Glitch t={t} at={T.ask} len={0.22}>
      <Hud t={t} tint="#5ee7ff">
        <div style={{ position: "absolute", left: 70, right: 70, top: 120, opacity: 1 - leave }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 30, letterSpacing: 5, color: "#5ee7ff", opacity: head(0) }}>// CURIOUS ABOUT ONE?</div>
          <div style={{ fontFamily: fonts.slam, fontSize: 150, color: "#fff", lineHeight: 0.92, marginTop: 18, clipPath: `inset(0 ${100 - head(1) * 100}% 0 0)` }}>
            ASK THE ARCHIVE.
          </div>
          <div style={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 38, lineHeight: 1.28, color: "#dfe6f5", marginTop: 16, opacity: head(2) }}>
            The site answers questions about every project — with links to each one.
          </div>
        </div>
        <Phone scale={SCALE} glow="#5ee7ff" style={{
          left: (1080 - PW) / 2, top: 600, opacity: 1 - leave,
          transform: `translateY(${(1 - enter) * 1200}px)`,
        }}>
          <div style={{ width: 1080, height: 1920, transform: `scale(${zoom})`, transformOrigin: "0% 30%" }}>
            <Img src={frameSrc("ask", i)} style={{ width: 1080, height: 1920, display: "block" }} />
          </div>
        </Phone>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1760, textAlign: "center", opacity: head(3) * (1 - leave) }}>
          <Chip size={40} solid color={LIME}>sankettambare.in/ask</Chip>
        </div>
      </Hud>
    </Glitch>
  );
};
