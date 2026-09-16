import { describe, expect, it } from "vitest";
import { Run } from "../src/core/rules";
import { chart, type Note } from "../src/core/chart";
const notes = (count = 40): Note[] =>
  Array.from({ length: count }, (_, id) => ({
    id,
    time: 1 + id * 0.5,
    lane: 1,
    crystal: false,
    obstacles: [],
  }));
describe("Timing and scoring contract", () => {
  it.each([
    [-0.16, "good"],
    [-0.08, "perfect"],
    [0, "perfect"],
    [0.08, "perfect"],
    [0.16, "good"],
  ] as const)("boundary %s resolves to %s", (offset, judgment) => {
    expect(new Run(notes()).tap(1, 1 + offset)?.judgment).toBe(judgment);
  });
  it("ignores early touches and prevents duplicate credit or damage", () => {
    const run = new Run(notes());
    expect(run.tap(1, 0.7)).toBeUndefined();
    run.tap(0, 0.9);
    run.tap(1, 1);
    run.advance(1.2);
    expect(run.misses).toBe(1);
    expect(run.energy).toBe(80);
    expect(run.score).toBe(0);
  });
  it("applies combo thresholds to the current hit, breaks and recovers", () => {
    const run = new Run(notes());
    for (let i = 0; i < 10; i++) run.tap(1, 1 + i * 0.5);
    expect(run.score).toBe(1100);
    expect(run.multiplier).toBe(2);
    run.tap(0, 6);
    expect(run.multiplier).toBe(1);
    expect(run.energy).toBe(80);
    run.tap(1, 6.5);
    expect(run.energy).toBe(82);
  });
  it("awards crystal only for a perfect hit", () => {
    const n = [{ ...notes(1)[0], crystal: true }];
    const p = new Run(n);
    p.tap(1, 1);
    expect(p.score).toBe(125);
    expect(p.crystals).toBe(1);
    const g = new Run(n);
    g.tap(1, 1.1);
    expect(g.score).toBe(60);
    expect(g.crystals).toBe(0);
  });
  it("stops processing at death and does not award completion stars", () => {
    const run = new Run(notes());
    run.advance(50);
    expect(run.misses).toBe(5);
    expect(run.dead).toBe(true);
    run.finished = true;
    expect(run.stars).toBe(0);
  });
  it("has the same outcome at 30, 60 and 120 FPS", () => {
    const replay = (fps: number) => {
      const run = new Run(chart);
      let cursor = 0;
      for (let frame = 0; frame <= 80 * fps; frame++) {
        const time = frame / fps;
        while (cursor < chart.length && chart[cursor].time <= time) {
          const note = chart[cursor++];
          run.advance(note.time);
          run.tap(note.lane, note.time);
        }
        run.advance(time);
      }
      run.finished = true;
      return [run.score, run.perfect, run.crystals, run.stars];
    };
    expect(replay(30)).toEqual(replay(60));
    expect(replay(60)).toEqual(replay(120));
    expect(replay(60)[1]).toBe(chart.length);
    expect(replay(60)[3]).toBe(3);
  });
  it("chart uses spaced, valid, uniquely identified targets", () => {
    expect(chart.length).toBeGreaterThan(90);
    chart.forEach((n, i) => {
      expect(n.id).toBe(i);
      expect(n.obstacles).not.toContain(n.lane);
      if (i) expect(n.time - chart[i - 1].time).toBeGreaterThanOrEqual(0.5);
    });
  });
});
