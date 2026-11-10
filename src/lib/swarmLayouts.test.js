import {
  LENSES, baseRadius, formationOf, padOf, swarmOrder,
} from "./swarmLayouts";
import { demoActivities } from "./trainingDemo";

const rows = demoActivities();
const order = swarmOrder(rows);

describe("swarm formations", () => {
  it("orders oldest first and drops undated rows", () => {
    const o = swarmOrder([...rows.slice(0, 5), { id: "x", date: null }]);
    expect(o).toHaveLength(5);
    for (let i = 1; i < o.length; i += 1) expect(o[i].startDate >= o[i - 1].startDate).toBe(true);
  });

  it.each(LENSES.flatMap((l) => [[l, 1040, 440], [l, 340, 360]]))("%s keeps every dot inside a %i × %i box", (lens, w, h) => {
    const f = formationOf(lens, order, w, h);
    expect(f.x).toHaveLength(order.length);
    for (let i = 0; i < order.length; i += 1) {
      expect(Number.isFinite(f.x[i]) && Number.isFinite(f.y[i]) && f.r[i] > 0).toBe(true);
      expect(f.x[i]).toBeGreaterThanOrEqual(0);
      expect(f.x[i]).toBeLessThanOrEqual(w);
      expect(f.y[i]).toBeGreaterThanOrEqual(0);
      expect(f.y[i]).toBeLessThanOrEqual(h);
    }
    expect(f.marks.length).toBeGreaterThan(0);
  });

  it("stacks a week's sessions in one column, and the ledger puts the newest first", () => {
    const weeks = formationOf("overview", order, 1000, 440);
    const a = order.findIndex((r, i) => i > 0 && r.date === order[i - 1].date);
    if (a > 0) expect(weeks.x[a]).toBeCloseTo(weeks.x[a - 1], 3);
    const ledger = formationOf("log", order, 1000, 440);
    const last = order.length - 1;
    expect(ledger.y[last]).toBeLessThanOrEqual(ledger.y[0]);
  });

  it("survives an empty log and an unknown lens", () => {
    expect(formationOf("overview", [], 800, 400).x).toHaveLength(0);
    expect(formationOf("nope", order, 800, 400).x).toHaveLength(order.length);
    expect(padOf(300).l).toBeLessThan(padOf(900).l);
    expect(baseRadius({ distance: 42195 }, 1000)).toBeGreaterThan(baseRadius({ distance: 0 }, 1000));
  });
});
