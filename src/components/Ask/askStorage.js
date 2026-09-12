// Conversation persistence: the thread survives a reload, not a day.
//
// Per-browser and never sent anywhere — the server keeps its own log, which is
// a separate thing. A day-old thread is expired on read rather than restored,
// because someone returning tomorrow should not land in the middle of
// yesterday's conversation.

const KEY = "ask.thread";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_TURNS = 40;

export function loadThread() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return [];
    }
    return Array.isArray(parsed.turns) ? parsed.turns : [];
  } catch (_) {
    // Private mode, blocked storage, or a shape from an older version.
    return [];
  }
}

export function saveThread(turns) {
  try {
    const trimmed = turns
      .slice(-MAX_TURNS)
      // `streaming` is UI state for the turn in flight; restoring it would
      // resurrect a cursor that will never finish.
      .map(({ streaming, ...rest }) => rest);
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ savedAt: Date.now(), turns: trimmed }),
    );
  } catch (_) {
    // Storage full or unavailable — persistence is a convenience, not a feature
    // worth breaking the chat over.
  }
}

export function clearThread() {
  try {
    window.localStorage.removeItem(KEY);
  } catch (_) {
    // nothing to do
  }
}
