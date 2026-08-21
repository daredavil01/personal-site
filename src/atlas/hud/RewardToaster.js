// RewardToaster — pops queued rewards one at a time with a confetti burst
// (§4.5). Lives in AtlasFrame so it bridges routes; reads WorldContext's
// transient pendingRewards queue and clears each after it shows. Phase 5
// celebrates region stamps; phase 6 adds quest + easter-egg rewards (already
// handled by kind here).

import React, { useEffect, useRef } from "react";
import launchConfetti from "../lib/confetti";
import atlasEvent from "../lib/atlasEvent";
import { playSfx } from "../audio/sfxBus";
import { useWorld } from "../world/WorldContext";
import { getRegion } from "../regions/registry";
import { getEgg } from "../gamification/easterEggs";

// reward kind -> sprite name (no-op until sound is enabled, §4.9).
const SFX_FOR_KIND = { region: "stamp", quest: "chime", egg: "egg" };

const prefersReducedMotion = () => (
  typeof window !== "undefined"
  && !!window.matchMedia
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

// reward -> { seal, title, subtitle, color } for display.
const describeReward = (reward) => {
  if (reward.kind === "region") {
    const r = getRegion(reward.region);
    return {
      seal: "✦",
      title: `${r.label} stamped!`,
      subtitle: "Added to your traveler's passport",
      color: r.color,
    };
  }
  if (reward.kind === "quest") {
    return {
      seal: "★",
      title: reward.title || "Quest complete!",
      subtitle: reward.subtitle || "A new stamp for your passport",
      color: reward.color || "var(--atlas-glow)",
    };
  }
  if (reward.kind === "egg") {
    const egg = getEgg(reward.eggId);
    return {
      seal: "🔎",
      title: egg ? egg.title : "You found a hidden spot!",
      subtitle: egg ? egg.found : "An easter egg on the map",
      color: "var(--atlas-glow)",
    };
  }
  return {
    seal: "✦", title: "Reward!", subtitle: "", color: "var(--atlas-glow)",
  };
};

const RewardToaster = () => {
  const { world, dismissReward } = useWorld();
  const current = (world.pendingRewards && world.pendingRewards[0]) || null;
  const fxRef = useRef(null);
  const shownRef = useRef(null);

  useEffect(() => {
    if (!current) return undefined;
    // Guard against re-firing the celebration for the same reward on re-render.
    if (shownRef.current === current.id) return undefined;
    shownRef.current = current.id;

    const { color } = describeReward(current);
    if (!prefersReducedMotion() && fxRef.current) {
      const swatch = typeof color === "string" && color.startsWith("#") ? color : "#f2a949";
      launchConfetti(fxRef.current, [swatch, "#f2a949", "#ffffff"]);
    }
    atlasEvent("atlas_reward", { kind: current.kind, id: current.id });
    playSfx(SFX_FOR_KIND[current.kind] || "chime");
    const timer = setTimeout(() => dismissReward(current.id), 4200);
    return () => clearTimeout(timer);
  }, [current, dismissReward]);

  if (!current) return null;
  const info = describeReward(current);

  return (
    <>
      <div className="atlas-reward-fx" ref={fxRef} aria-hidden="true" />
      <div className="atlas-reward" role="status" aria-live="polite">
        <span
          className="atlas-reward-seal"
          style={{ "--reward-color": info.color }}
          aria-hidden="true"
        >
          {info.seal}
        </span>
        <div className="atlas-reward-text">
          <strong>{info.title}</strong>
          <span>{info.subtitle}</span>
        </div>
        <button
          type="button"
          className="atlas-reward-close"
          aria-label="Dismiss"
          onClick={() => dismissReward(current.id)}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </>
  );
};

export default RewardToaster;
