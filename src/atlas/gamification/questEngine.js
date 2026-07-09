// Quest engine (§4.5) — a pure evaluator over declarative quest/achievement
// definitions and the world state. No React, no storage, no defs imported: the
// caller passes the definitions in, so this stays trivially unit-testable and
// the reducer owns the side effects (marking done + queuing rewards).
//
// `now` is injected everywhere it matters (Night Owl, timestamps) so tests are
// deterministic regardless of when they run.

// Max number of distinct calendar days that fall within any `windowDays` span.
export const distinctDaysWithin = (days, windowDays) => {
  const times = (days || [])
    .map((d) => Date.parse(`${d}T00:00:00`))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  const span = (windowDays - 1) * 86400000;
  let best = 0;
  for (let i = 0; i < times.length; i += 1) {
    let count = 0;
    for (let j = i; j < times.length; j += 1) {
      if (times[j] - times[i] <= span) count += 1;
      else break;
    }
    if (count > best) best = count;
  }
  return best;
};

// Display progress { current, target } for a quest (current is capped).
export const progressOf = (quest, world, allQuests = []) => {
  const cap = (n, t) => ({ current: Math.min(n, t), target: t });
  switch (quest.type) {
    case "explorer":
      return cap(Object.keys(world.visitedRegions || {}).length, quest.target);
    case "collector":
      return cap(((world.actions || {})[quest.action] || []).length, quest.target);
    case "eggs":
      return cap(Object.keys(world.eggs || {}).length, quest.target);
    case "regular":
      return cap(distinctDaysWithin(world.visitDays, 7), quest.target || 3);
    case "nightowl":
      return { current: world.quests && world.quests.nightowl && world.quests.nightowl.done ? 1 : 0, target: 1 };
    case "completionist": {
      const others = allQuests.filter((q) => q.type !== "completionist");
      const done = others.filter((q) => world.quests && world.quests[q.id] && world.quests[q.id].done).length;
      return { current: done, target: others.length };
    }
    default:
      return { current: 0, target: quest.target || 1 };
  }
};

// Whether a single quest's completion condition is currently met.
export const isComplete = (quest, world, allQuests = [], now = new Date()) => {
  switch (quest.type) {
    case "explorer":
      return Object.keys(world.visitedRegions || {}).length >= quest.target;
    case "collector":
      return ((world.actions || {})[quest.action] || []).length >= quest.target;
    case "eggs":
      return Object.keys(world.eggs || {}).length >= quest.target;
    case "nightowl": {
      const h = now.getHours();
      return h >= 23 || h < 5;
    }
    case "regular":
      return distinctDaysWithin(world.visitDays, 7) >= (quest.target || 3);
    case "completionist": {
      const others = allQuests.filter((q) => q.type !== "completionist");
      return others.length > 0
        && others.every((q) => world.quests && world.quests[q.id] && world.quests[q.id].done);
    }
    default:
      return false;
  }
};

// Definitions newly satisfied but not yet recorded done in world.quests.
// Completionist is resolved last, treating quests completing in this same pass
// as done, so finishing the final quest also awards Completionist at once.
export const evaluate = (defs, world, now = new Date()) => {
  const recorded = (q) => !!(world.quests && world.quests[q.id] && world.quests[q.id].done);
  const newly = [];

  defs.filter((q) => q.type !== "completionist").forEach((q) => {
    if (!recorded(q) && isComplete(q, world, defs, now)) newly.push(q);
  });

  const completing = new Set(newly.map((q) => q.id));
  const others = defs.filter((q) => q.type !== "completionist");
  const allOthersDone = others.length > 0
    && others.every((q) => recorded(q) || completing.has(q.id));

  defs.filter((q) => q.type === "completionist").forEach((q) => {
    if (!recorded(q) && allOthersDone) newly.push(q);
  });

  return newly;
};
