// Jest stand-in for parseNowCms.js, whose import.meta.glob is a Vite
// compile-time macro that the CommonJS test runtime cannot evaluate.
// Wired up via moduleNameMapper in jest.config.js.
export async function loadNowMeta() {
  return {};
}

export async function loadNowMonths() {
  return [];
}
