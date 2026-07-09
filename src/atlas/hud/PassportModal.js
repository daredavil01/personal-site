// Traveler's Passport (skeleton). Phase 6 turns this into the full quest/
// achievement book; for now it shows migrated/live region stamps and hosts
// the escape hatches: the Classic-view kill switch (§4.4) and preview exit.

import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { DOMAINS } from "../../components/Index/globe/domains";
import { ATLAS_LIVE } from "../../config/featureFlags";
import { useWorld } from "../world/WorldContext";

const fmtDate = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t)
    ? ""
    : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const PassportModal = ({ onClose }) => {
  const { world, preview, setView, disablePreview } = useWorld();
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visitedCount = DOMAINS.filter((d) => world.visitedRegions[d.key]).length;

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
          {visitedCount} of {DOMAINS.length} regions explored
          {world.visitDays.length > 1 ? ` · ${world.visitDays.length} visit days` : ""}
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
                {d.label}
                <span style={{ fontWeight: 400 }}>
                  {visitedAt ? fmtDate(visitedAt) : "Unexplored"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="atlas-modal-row">
          <span>Replay the intro</span>
          <button type="button" disabled title="Arrives with the dive sequence (phase 4)">
            Coming soon
          </button>
        </div>
        <div className="atlas-modal-row">
          <span>Prefer the classic site?</span>
          <button type="button" onClick={() => { setView("classic"); onClose(); }}>
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
