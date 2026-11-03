// Sample activity ids (src/lib/trainingDemo.js) sit above this base, far from
// any real Strava id, which is how /training/:id knows to read a sample row
// without loading the sample set to find out.
export const DEMO_ID_BASE = 990000000000;
export const isDemoId = (id) => Number(id) >= DEMO_ID_BASE && Number(id) < DEMO_ID_BASE + 100000;
