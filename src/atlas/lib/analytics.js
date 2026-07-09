// Anonymous analytics for atlas interactions (§11.4). Event names + a small
// set of non-PII params only (region key, quest id, view mode). Reuses the
// site's existing gtag (index.html); a no-op when gtag isn't present, so it is
// safe in tests and privacy-respecting by default.

const atlasEvent = (name, params) => {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params || {});
    }
  } catch (e) {
    /* analytics is best-effort — never throw into the UI */
  }
};

export default atlasEvent;
