// WorldContext — the single owner of the atlas.v1 gamification state (§4.5).
// Pipeline: read -> migrate -> useReducer -> debounced persist. Nothing else
// in the app reads or writes atlas localStorage directly.
//
// Tracking (visitRegion/track/foundEgg) runs in BOTH view modes; only the
// game UI (HUD, toasts) is atlas-mode-gated, in AtlasFrame.

import React, {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from "react";
import PropTypes from "prop-types";
import migrate from "./migrate";
import {
  readRaw, readLegacyGlobeKeys, createDebouncedPersist, VISIT_DAYS_CAP,
  readPreviewFlag, writePreviewFlag,
} from "./storage";
import { evaluate } from "../gamification/questEngine";
import { ALL_QUESTS } from "../gamification/quests";

const WorldContext = createContext(null);

const todayKey = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

// After any state change that could satisfy a quest/achievement (§4.5), mark
// the newly-completed ones done and queue a reward for each. Pure over the
// quest engine; the reducer is the only caller so side effects stay contained.
const applyQuests = (state, now = new Date()) => {
  const newly = evaluate(ALL_QUESTS, state, now);
  if (!newly.length) return state;
  const iso = now.toISOString();
  const quests = { ...state.quests };
  const rewards = [...(state.pendingRewards || [])];
  newly.forEach((q) => {
    quests[q.id] = { done: iso };
    rewards.push({
      id: `quest:${q.id}`,
      kind: "quest",
      questId: q.id,
      title: `${q.title} — complete!`,
      subtitle: (q.reward && q.reward.label) || "A new passport stamp",
      color: q.color,
    });
  });
  return { ...state, quests, pendingRewards: rewards };
};

function reducer(state, action) {
  switch (action.type) {
    case "visitRegion": {
      const { region } = action;
      if (!region || state.visitedRegions[region]) return state;
      const ts = nowIso();
      // A genuine first visit queues a reward so RewardToaster can celebrate
      // the region stamp (§4.5). pendingRewards is transient (not persisted).
      const reward = { id: `region:${region}`, kind: "region", region, ts };
      const visited = {
        ...state,
        visitedRegions: { ...state.visitedRegions, [region]: ts },
        stamps: { ...state.stamps, [region]: { ...(state.stamps[region] || {}), first: ts } },
        pendingRewards: [...(state.pendingRewards || []), reward],
      };
      return applyQuests(visited);
    }
    case "track": {
      const { action: name, id } = action;
      if (!name || id == null) return state;
      const ids = state.actions[name] || [];
      if (ids.includes(id)) return state;
      return applyQuests({ ...state, actions: { ...state.actions, [name]: [...ids, id] } });
    }
    case "foundEgg": {
      const { egg } = action;
      if (!egg || state.eggs[egg]) return state;
      // RewardToaster resolves the egg's title/blurb from the egg table.
      const reward = { id: `egg:${egg}`, kind: "egg", eggId: egg, ts: nowIso() };
      const found = {
        ...state,
        eggs: { ...state.eggs, [egg]: nowIso() },
        pendingRewards: [...(state.pendingRewards || []), reward],
      };
      return applyQuests(found);
    }
    case "setView": {
      const view = action.view === "atlas" || action.view === "classic" ? action.view : null;
      if (view === state.view) return state;
      return { ...state, view };
    }
    case "toggleSound":
      return { ...state, sound: !state.sound };
    case "setTime": {
      const time = action.time === "day" || action.time === "night" ? action.time : "auto";
      if (time === state.time) return state;
      return { ...state, time };
    }
    case "introSeen":
      return state.introSeen ? state : { ...state, introSeen: true };
    case "recordVisitDay": {
      // Fires once per session on mount — also the reliable re-check point for
      // the time/return achievements (Night Owl, Regular, Completionist), so
      // evaluate quests even when today is already logged.
      const { day } = action;
      const next = state.visitDays.includes(day)
        ? state
        : { ...state, visitDays: [...state.visitDays, day].slice(-VISIT_DAYS_CAP) };
      return applyQuests(next);
    }
    case "dismissReward": {
      const { id } = action;
      const rewards = state.pendingRewards || [];
      if (!rewards.some((r) => r.id === id)) return state;
      return { ...state, pendingRewards: rewards.filter((r) => r.id !== id) };
    }
    default:
      return state;
  }
}

export const WorldProvider = ({ children }) => {
  const [world, dispatch] = useReducer(
    reducer,
    undefined,
    // pendingRewards is transient reward-toast state, seeded empty and never
    // read back from storage (stripped before persist below).
    () => ({ ...migrate(readRaw(), readLegacyGlobeKeys()), pendingRewards: [] }),
  );
  const [preview, setPreview] = useState(() => readPreviewFlag());

  // Whether a theme was already stored BEFORE this session touched anything.
  // ThemeProvider persists `theme` in its own mount effect, so this must be
  // captured during initial render (render phase runs before all effects) —
  // AtlasFrame uses it for the day/night auto rule (§4.10).
  const hadStoredThemeRef = useRef(null);
  if (hadStoredThemeRef.current === null) {
    let stored = null;
    try {
      stored = window.localStorage.getItem("theme");
    } catch (e) { /* non-fatal */ }
    hadStoredThemeRef.current = stored != null;
  }

  // Debounced persist of every world change (including the initial migrated
  // state, which materializes atlas.v1 on first load).
  const persistRef = useRef(null);
  if (!persistRef.current) persistRef.current = createDebouncedPersist();
  useEffect(() => {
    // Strip the transient reward queue — only durable game state is persisted.
    const { pendingRewards, ...persistable } = world;
    persistRef.current(persistable);
  }, [world]);
  useEffect(() => () => persistRef.current.cancel(), []);

  // Distinct-day visit log (feeds the "Regular" achievement in phase 6).
  useEffect(() => {
    dispatch({ type: "recordVisitDay", day: todayKey() });
  }, []);

  const api = useMemo(
    () => ({
      visitRegion: (region) => dispatch({ type: "visitRegion", region }),
      track: (name, id) => dispatch({ type: "track", action: name, id }),
      foundEgg: (egg) => dispatch({ type: "foundEgg", egg }),
      dismissReward: (id) => dispatch({ type: "dismissReward", id }),
      setView: (view) => dispatch({ type: "setView", view }),
      toggleSound: () => dispatch({ type: "toggleSound" }),
      setTime: (time) => dispatch({ type: "setTime", time }),
      markIntroSeen: () => dispatch({ type: "introSeen" }),
      enablePreview: () => { writePreviewFlag(true); setPreview(true); },
      disablePreview: () => { writePreviewFlag(false); setPreview(false); },
    }),
    [],
  );

  const value = useMemo(
    () => ({ world, preview, hadStoredTheme: hadStoredThemeRef.current, ...api }),
    [world, preview, api],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
};

WorldProvider.propTypes = {
  children: PropTypes.node,
};

WorldProvider.defaultProps = {
  children: null,
};

export const useWorld = () => {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used inside <WorldProvider>");
  return ctx;
};

// Exported for unit tests only.
export { reducer as worldReducer };
