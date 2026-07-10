// Traveler's Passport (skeleton). Phase 6 turns this into the full quest/
// achievement book; for now it shows migrated/live region stamps and hosts
// the escape hatches: the Classic-view kill switch (§4.4) and preview exit.

import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { DOMAINS } from "../../components/Index/globe/domains";
import { ATLAS_LIVE } from "../../config/featureFlags";
import { getRegion } from "../regions/registry";
import { useWorld } from "../world/WorldContext";
import { ALL_QUESTS } from "../gamification/quests";
import { progressOf } from "../gamification/questEngine";
import atlasEvent from "../lib/analytics";

const MAP_PATH = ATLAS_LIVE ? "/" : "/world";

const fmtDate = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t)
    ? ""
    : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const PassportModal = ({ onClose }) => {
  const { world, preview, setView, disablePreview } = useWorld();
  const navigate = useNavigate();
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visitedCount = DOMAINS.filter((d) => world.visitedRegions[d.key]).length;
  const questsDone = ALL_QUESTS.filter((q) => world.quests[q.id] && world.quests[q.id].done).length;
  const eggsFound = Object.keys(world.eggs || {}).length;

  const switchToClassic = () => {
    atlasEvent("atlas_view_switch", { to: "classic" });
    setView("classic");
    onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- backdrop click-to-close convenience; Escape + the close button are the accessible paths
    <div className="atlas-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="atlas-passport-title" className="atlas-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2 id="atlas-passport-title">Traveler&apos;s Passport</h2>
          <button ref={closeRef} type="button" aria-label="Close passport" onClick={onClose}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <p className="atlas-modal-sub">
          {visitedCount} of {DOMAINS.length} regions
          {" · "}
          {questsDone} of {ALL_QUESTS.length} quests
          {eggsFound > 0 ? ` · ${eggsFound} secret${eggsFound > 1 ? "s" : ""}` : ""}
        </p>

        <div className="atlas-stamp-grid">
          {DOMAINS.map((d) => {
            const visitedAt = world.visitedRegions[d.key];
            return (
              <div
                key={d.key}
                className={`atlas-stamp${visitedAt ? " is-stamped" : ""}`}
                style={{ "--stamp-color": d.color }}
              >
                <span className="atlas-stamp-seal" aria-hidden="true">{visitedAt ? "✦" : "·"}</span>
                {getRegion(d.key).label}
                <span style={{ fontWeight: 400 }}>
                  {visitedAt ? fmtDate(visitedAt) : "Unexplored"}
                </span>
              </div>
            );
          })}
        </div>

        <h3 className="atlas-passport-h3">Quests &amp; Achievements</h3>
        <ul className="atlas-quest-list">
          {ALL_QUESTS.map((q) => {
            const done = !!(world.quests[q.id] && world.quests[q.id].done);
            const { current, target } = progressOf(q, world, ALL_QUESTS);
            const pct = target ? Math.round((current / target) * 100) : 0;
            return (
              <li key={q.id} className={`atlas-quest${done ? " is-done" : ""}`}>
                <span className="atlas-quest-seal" style={{ "--reward-color": q.color }} aria-hidden="true">
                  {done ? "★" : "☆"}
                </span>
                <div className="atlas-quest-body">
                  <div className="atlas-quest-top">
                    <strong>{q.title}</strong>
                    <span className="atlas-quest-count">{done ? "Done" : `${current}/${target}`}</span>
                  </div>
                  <p className="atlas-quest-desc">{q.desc}</p>
                  {!done && (
                    <div className="atlas-quest-bar">
                      <span style={{ width: `${pct}%`, background: q.color }} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="atlas-modal-row">
          <span>Replay the intro</span>
          <button
            type="button"
            onClick={() => { onClose(); navigate(MAP_PATH, { state: { replayIntro: Date.now() } }); }}
          >
            Replay
          </button>
        </div>
        <div className="atlas-modal-row">
          <span>Prefer the classic site?</span>
          <button type="button" onClick={switchToClassic}>
            Switch to Classic
          </button>
        </div>
        {preview && !ATLAS_LIVE && (
          <div className="atlas-modal-row">
            <span>Atlas preview build</span>
            <button type="button" onClick={() => { disablePreview(); onClose(); }}>
              Exit preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

PassportModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default PassportModal;
