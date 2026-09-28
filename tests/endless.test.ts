import { describe, expect, it } from "vitest";
import {
  basePerks, createRng, dayKey, daySeed, EndlessChart, EndlessRun, ENDLESS_TRACK, MAX_RATE,
  musicOffset, POWER_SECONDS, stageOf, stageRate, travelAt, type EndlessPerks,
} from "../src/core/endless";
import type { Note } from "../src/core/chart";

const perks = (mods: Partial<EndlessPerks> = {}): EndlessPerks => ({ ...basePerks, ...mods });
/** Plays perfectly: steers 0.09 s before every landing, at 60 FPS. */
function autoplay(run: EndlessRun, road: EndlessChart, until: number) {
  let cursor = 0;
  for (let frame = 0; frame <= until * 60; frame++) {
    const time = frame / 60;
    road.ensure(time + 8);
    while (cursor < road.notes.length && road.notes[cursor].time - 0.09 <= time) {
      const note = road.notes[cursor++];
      run.tap(note.lane, note.time - 0.09);
    }
    run.advance(time);
  }
}
const note = (id: number, time: number, extra: Partial<Note> = {}): Note => ({ id, time, lane: 0, crystal: false, obstacles: [], ...extra });
/** A tiny hand-made road for rule tests. */
function road(notes: Note[], mods: Partial<EndlessPerks> = {}) {
  const chart = new EndlessChart(1, perks(mods));
  chart.notes.push(...notes);
  (chart as unknown as { ensure: () => Note[] }).ensure = () => chart.notes;
  return chart;
}

describe("Seeds", () => {
  it("repeats a road exactly for the same seed and changes it for another", () => {
    const a = createRng(42), b = createRng(42), c = createRng(43);
    const seq = (r: () => number) => Array.from({ length: 5 }, r);
    expect(seq(a)).toEqual(seq(b));
    expect(seq(createRng(42))).not.toEqual(seq(c));
    expect(daySeed("2026-09-28")).toBe(daySeed("2026-09-28"));
    expect(daySeed("2026-09-28")).not.toBe(daySeed("2026-09-29"));
    expect(dayKey(new Date(2026, 8, 5))).toBe("2026-09-05");
  });
});

describe("Endless road", () => {
  const chart = new EndlessChart(20260928).ensure(16 * 12);
  it("is deterministic, sorted, beat-aligned and never simultaneous", () => {
    expect(new EndlessChart(20260928).ensure(16 * 12)).toEqual(chart);
    chart.forEach((n, i) => {
      expect(n.id).toBe(i);
      expect(Math.abs(n.time / 0.25 - Math.round(n.time / 0.25))).toBeLessThan(1e-9);
      if (i) expect(n.time - chart[i - 1].time).toBeGreaterThanOrEqual(0.25 - 1e-9);
      expect(n.obstacles).not.toContain(n.lane);
    });
    expect(chart[0].time).toBeGreaterThanOrEqual(4);
  });
  it("gets denser stage by stage", () => {
    const perStage = (s: number) => chart.filter((n) => stageOf(n.time) === s).length;
    expect(perStage(8)).toBeGreaterThan(perStage(1));
  });
  it("avoids wall-to-wall jumps on eighth notes before stage 5", () => {
    chart.forEach((n, i) => {
      if (!i || stageOf(n.time) >= 5) return;
      if (n.time - chart[i - 1].time < 0.5 - 1e-9) expect(Math.abs(n.lane - chart[i - 1].lane)).toBeLessThan(2);
    });
  });
  it("places the two Infinito relics and spaced power-ups, never on crystals", () => {
    const relicNotes = chart.filter((n) => n.relic);
    expect(relicNotes.map((n) => [n.relic, stageOf(n.time)])).toEqual([["baton", 4], ["quartz", 8]]);
    const powers = chart.filter((n) => n.power);
    expect(powers.length).toBeGreaterThan(2);
    powers.forEach((n) => {
      expect(n.crystal).toBe(false);
      expect(stageOf(n.time)).toBeGreaterThanOrEqual(1);
    });
    const moreOften = new EndlessChart(20260928, perks({ powerChance: 2 })).ensure(16 * 12).filter((n) => n.power).length;
    expect(moreOften).toBeGreaterThanOrEqual(powers.length);
  });
  it("speeds up to a cap and loops the song on whole bars", () => {
    expect(stageRate(0)).toBe(1);
    expect(stageRate(4)).toBeCloseTo(1.2);
    expect(stageRate(100)).toBe(MAX_RATE);
    expect(stageRate(4, 0.035)).toBeCloseTo(1.14);
    expect(musicOffset(10)).toBe(10);
    expect(musicOffset(78)).toBe(16);
    expect(musicOffset(78 + 62 + 3)).toBe(19);
    expect((ENDLESS_TRACK.loopEnd - ENDLESS_TRACK.loopStart) % 2).toBe(0);
    expect(travelAt(0)).toBe(2);
    expect(travelAt(10_000)).toBe(1.35);
  });
  it("can be survived for ten stages with perfect play", () => {
    const chart = new EndlessChart(7);
    const run = new EndlessRun(chart);
    autoplay(run, chart, 16 * 10);
    expect(run.dead).toBe(false);
    expect(run.misses).toBe(0);
    expect(run.perfect).toBe(run.index);
  });
});

describe("Infinito rules and orb perks", () => {
  it("a shield absorbs one miss without damage or combo loss", () => {
    const r = new EndlessRun(road([note(0, 1), note(1, 1.5), note(2, 2)]), perks({ startShields: 1 }));
    r.tap(0, 0.5);
    r.advance(1.6);
    expect(r.combo).toBe(2);
    r.tap(2, 1.7);
    const hits = r.advance(2.5);
    expect(hits[0]).toMatchObject({ judgment: "miss", shielded: true });
    expect([r.energy, r.combo, r.shields, r.misses]).toEqual([100, 2, 0, 0]);
  });
  it("collects power-ups on landing: shield, heart and double points", () => {
    const r = new EndlessRun(road([note(0, 1, { power: "double" }), note(1, 1.5), note(2, 2, { power: "shield" }), note(3, 2.5, { power: "heart" })]));
    r.tap(0, 0.5);
    r.advance(1);
    expect(r.doubleActive(1.5)).toBe(true);
    expect(r.doubleUntil).toBe(1 + POWER_SECONDS);
    const before = r.score;
    r.advance(1.5);
    expect(r.score - before).toBe(200);
    r.advance(2.5);
    expect(r.shields).toBe(1);
    expect(r.powers).toBe(3);
  });
  it("damage grows with the stage and Lava reduces it", () => {
    const late = (mods = {}) => {
      const r = new EndlessRun(road([note(0, 16 * 5)]), perks(mods));
      r.tap(2, 1);
      r.advance(16 * 5 + 1);
      return 100 - r.energy;
    };
    expect(late()).toBe(26);
    expect(late({ damage: 0.75 })).toBeCloseTo(19.5);
  });
  it("Eclipse survives a fatal miss once", () => {
    const notes = Array.from({ length: 12 }, (_, i) => note(i, 1 + i * 0.5));
    const r = new EndlessRun(road(notes), perks({ lastStand: true }));
    r.tap(2, 0.5);
    const hits = r.advance(20);
    expect(hits.some((h) => h.saved)).toBe(true);
    expect(r.saves).toBe(1);
    expect(r.dead).toBe(true);
  });
  it("Brasa reaches Fever sooner and Fever scores ×1,5", () => {
    const notes = Array.from({ length: 25 }, (_, i) => note(i, 1 + i * 0.5));
    const r = new EndlessRun(road(notes), perks({ feverCombo: 20 }));
    r.tap(0, 0.5);
    r.advance(1 + 18 * 0.5);
    expect(r.fever).toBe(false);
    const before = r.score;
    r.advance(1 + 19 * 0.5);
    expect(r.fever).toBe(true);
    expect(r.score - before).toBe(Math.round(100 * 3 * 1.5));
  });
  it("Oro doubles crystals and Cromo counts them on a Good", () => {
    const gold = new EndlessRun(road([note(0, 1, { crystal: true })]), perks({ crystalMultiplier: 2 }));
    gold.tap(0, 0.5);
    gold.advance(1);
    expect(gold.crystals).toBe(2);
    const chrome = new EndlessRun(road([note(0, 1, { crystal: true })]), perks({ crystalOnGood: true }));
    chrome.tap(0, 1.02);
    chrome.advance(1.2);
    expect(chrome.good).toBe(1);
    expect(chrome.crystals).toBe(1);
  });
  it("Leyenda gets a fresh shield when a new stage starts", () => {
    const r = new EndlessRun(road([note(0, 1), note(1, 17)]), perks({ stageShield: true }));
    r.tap(0, 0.5);
    r.advance(18);
    expect(r.shields).toBe(1);
  });
});
