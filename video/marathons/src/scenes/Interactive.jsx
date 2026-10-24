// 34–44 s, theme "sunrise track": the interactive view scrolls through its
// distance groups, then a race is clicked open and its slider is paged.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { CLICKS, T } from "../timeline";
import { Browser, Cursor, fonts, out, pop, prog, Ring, SceneTitle, Shot, track, UrlChip, useLayout, useTime, Wipe, VW, VH } from "../kit";
import { SHOTS } from "../data";

const SUN = "#ffd23f";
const BRICK = "#c94a32";
const S = SHOTS.interactive;
const CARD = S.cards[0];
const GROUPS = S.groups.map((g) => {
  const m = g.text.match(/(\d+) km Races \((\d+)\)/);
  return { ...g, km: m[1], n: m[2] };
}).filter((g) => g.y < S.height - 300);
const GROUP_AT = [35.3, 35.95, 36.6, 37.2];
// The open race's dialog and its slider, in viewport px (from modal-1.jpg).
const MODAL = { x: 384, y: 41, w: 671, h: 729 };
const SLIDE = { x: 411, y: 323, w: 619, h: 344 };
const NEXT = [SHOTS.modal.next.x + 15, SHOTS.modal.next.y + 15];

const Track = ({ t }) => (
  <svg width="1920" height="420" style={{ position: "absolute", left: 0, bottom: 0 }}>
    <path d="M-100 420 L-100 160 Q960 -40 2020 160 L2020 420 Z" fill={BRICK} />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <path key={i} d={`M-100 ${200 + i * 40} Q960 ${10 + i * 44} 2020 ${200 + i * 40}`} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="5"
        strokeDasharray={i === 0 ? "none" : "60 30"} strokeDashoffset={-t * 600} />
    ))}
  </svg>
);

const Sticker = ({ t, at, until, top, big, small, rot = -4, color = "#111", bg = "#fff" }) => {
  const { v } = useLayout();
  const k = pop(t, at, 11, 7) * (1 - prog(t, until, until + 0.25));
  if (k <= 0) return null;
  return (
    <div style={{
      position: "absolute", left: v ? 140 : 1450, top: v ? top + 930 : top, width: v ? 640 : 420, padding: "16px 24px", background: bg, color, borderRadius: 14,
      transform: `rotate(${rot}deg) scale(${k})`, boxShadow: "0 16px 40px rgba(0,0,0,.3)", border: "4px solid #111",
    }}>
      <div style={{ fontFamily: fonts.slam, fontSize: 96, lineHeight: 0.9 }}>{big}</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 21, fontWeight: 700, letterSpacing: 1 }}>{small}</div>
    </div>
  );
};

const SlideCrop = ({ src, dx }) => (
  <div style={{ position: "absolute", left: SLIDE.x, top: SLIDE.y, width: SLIDE.w, height: SLIDE.h, overflow: "hidden" }}>
    <Img src={staticFile(src)} style={{ position: "absolute", left: -SLIDE.x + dx, top: -SLIDE.y, width: VW, height: VH }} />
  </div>
);

export const Interactive = ({ start }) => {
  const t = useTime(start);
  const { v } = useLayout();
  const wipe = prog(t, 33.6, 34.25);
  const enter = pop(t, 34.8, 7, 5);
  const cardMid = CARD.y + CARD.h / 2;
  const cam = {
    cx: track(t, [[34.3, 720], [37.2, 720]]),
    cy: track(t, [[35.0, 900], ...GROUP_AT.map((at, i) => [at, GROUPS[i].y + 330]), [37.9, SHOTS.modal.scrollY + VH / 2]]),
    z: track(t, [[35.0, 0.9], [37.2, 0.8], [37.9, 1]]),
  };
  const clicked = t >= CLICKS.card + 0.08;
  const open = pop(t, CLICKS.card + 0.08, 10, 7);
  const settled = t > CLICKS.card + 0.75;
  const slide = (at) => prog(t, at + 0.05, at + 0.5, out);
  const s2 = slide(CLICKS.next1);
  const s3 = slide(CLICKS.next2);
  const cur = {
    x: track(t, [[37.8, 1500], [38.45, CARD.x + CARD.w / 2], [39.6, CARD.x + CARD.w / 2], [40.35, NEXT[0]]]),
    y: track(t, [[37.8, 900], [38.45, cardMid - SHOTS.modal.scrollY], [39.6, cardMid - SHOTS.modal.scrollY], [40.35, NEXT[1]]]),
  };
  const zoomOut = prog(t, 43.2, 44.2);

  return (
    <Wipe p={wipe} colors={[SUN, BRICK]}>
      <AbsoluteFill style={{ background: "linear-gradient(170deg, #ffcf5c 0%, #ff7a45 45%, #ff3d6e 100%)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: v ? 640 : 1500, top: 120, width: 360, height: 360, borderRadius: 200, background: "radial-gradient(#fff6c9, #ffd23f 60%, transparent 70%)", opacity: 0.8, transform: `translateY(${-t * 4}px)` }} />
        <Track t={t} />

        <div style={{ position: "absolute", left: v ? 36 : 70, top: v ? 500 : 170, width: VW, perspective: 1800 }}>
          <div style={{ transform: `translateX(${(1 - enter) * 1600}px) rotateY(${(1 - Math.min(1, enter)) * -40}deg) scale(${(v ? 0.7 : 0.92) - zoomOut * 0.03})`, transformOrigin: "0 0" }}>
            <Browser style={{ position: "relative" }}>
              <Shot src="shots/interactive.jpg" pageH={S.height} cam={cam}
                style={{ filter: clicked ? `blur(${6 * Math.min(1, open)}px) brightness(${1 - 0.4 * Math.min(1, open)})` : "none" }}>
                {GROUPS.map((g, i) => <Ring key={g.y} box={{ ...g, x: g.x - 6, w: 420 }} p={prog(t, GROUP_AT[i] - 0.3, GROUP_AT[i], out) * (1 - prog(t, GROUP_AT[i] + 0.6, GROUP_AT[i] + 0.8))} color={BRICK} glow={false} />)}
                <Ring box={CARD} p={prog(t, 38.3, 38.6, out) * (1 - prog(t, 38.7, 38.8))} color={SUN} width={7} />
              </Shot>
              {clicked && !settled && (
                <div style={{
                  position: "absolute", left: MODAL.x, top: MODAL.y, width: MODAL.w, height: MODAL.h, overflow: "hidden", borderRadius: 16,
                  transform: `scale(${Math.max(0.05, open)})`, transformOrigin: `${CARD.x + CARD.w / 2 - MODAL.x}px ${cardMid - SHOTS.modal.scrollY - MODAL.y}px`,
                }}>
                  <Img src={staticFile("shots/modal-1.jpg")} style={{ position: "absolute", left: -MODAL.x, top: -MODAL.y, width: VW, height: VH }} />
                </div>
              )}
              {settled && (
                <>
                  <Img src={staticFile("shots/modal-1.jpg")} style={{ position: "absolute", inset: 0, width: VW, height: VH }} />
                  {s2 > 0 && <SlideCrop src="shots/modal-1.jpg" dx={-s2 * SLIDE.w} />}
                  {s2 > 0 && s3 < 1 && <SlideCrop src="shots/modal-2.jpg" dx={(1 - s2) * SLIDE.w - s3 * SLIDE.w} />}
                  {s3 > 0 && <SlideCrop src="shots/modal-3.jpg" dx={(1 - s3) * SLIDE.w} />}
                </>
              )}
              {t > 37.8 && <Cursor x={cur.x} y={cur.y} t={t} clicks={[CLICKS.card, CLICKS.next1, CLICKS.next2]} color={BRICK} />}
            </Browser>
          </div>
        </div>

        {GROUPS.map((g, i) => (
          <Sticker key={g.km} t={t} at={GROUP_AT[i] - 0.25} until={(GROUP_AT[i + 1] || 37.9) - 0.25} top={330} big={`${g.km}K`} small={`${g.n} ${g.n === "1" ? "RACE" : "RACES"} · FASTEST FIRST`} rot={i % 2 ? 4 : -4} bg={i % 2 ? SUN : "#fff"} />
        ))}
        <Sticker t={t} at={38.7} until={40.4} top={300} big="TAP A RACE" small="PHOTOS · TIME · CERTIFICATE" bg="#fff" />
        <Sticker t={t} at={40.65} until={T.default} top={330} big="RELIVE IT" small="SLIDE THROUGH THE DAY" rot={5} bg={SUN} />

        <SceneTitle t={t} at={34.05} index="02 / RACE BY RACE" title="INTERACTIVE VIEW" color="#fff" accent="#111" />
        <UrlChip p={1} bg="#111" fg={SUN} />
      </AbsoluteFill>
    </Wipe>
  );
};
