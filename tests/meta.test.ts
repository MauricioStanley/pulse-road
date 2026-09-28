import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyRun, freshMissions, levelFromXp, levelReward, missionAt, missionLadder, readMissions, xpForRun, type RunStats,
} from "../src/core/missions";
import { GhostRecorder, ghostLane, readGhost } from "../src/core/ghost";
import { laneFromX, SwipeTracker, stepLane, getControlMode } from "../src/input/touch";
import { placeRelics, relics, stageRelic } from "../src/core/relics";
import { createChart } from "../src/core/chart";
import { getLevel, levels } from "../src/core/levels";
import { Run } from "../src/core/rules";

const stats = (s: Partial<RunStats> = {}): RunStats => ({
  kind: "song", level: "titi", completed: false, stars: 0, score: 0, perfects: 0, goods: 0,
  maxCombo: 0, crystals: 0, fevers: 0, powers: 0, relics: 0, stage: 0, ...s,
});
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("Missions", () => {
  it("starts with the first three rungs of the ladder", () => {
    expect(freshMissions().active.map((m) => missionAt(m.index).id)).toEqual(["play-2", "perfect-30", "combo-20"]);
    expect(new Set(missionLadder.map((m) => m.id)).size).toBe(missionLadder.length);
  });
  it("adds totals across runs, keeps single-run bests and deals the next mission", () => {
    let state = freshMissions();
    let result = applyRun(state, stats({ perfects: 20, maxCombo: 12 }));
    expect(result.completed).toEqual([]);
    state = result.state;
    expect(state.active.map((m) => m.progress)).toEqual([1, 20, 12]);
    result = applyRun(state, stats({ perfects: 15, maxCombo: 8 }));
    expect(result.completed.map((m) => m.id)).toEqual(["play-2", "perfect-30"]);
    expect(result.state.active.map((m) => [m.index, m.progress])).toEqual([[3, 0], [4, 0], [2, 12]]);
    expect(result.state.next).toBe(5);
  });
  it("counts mode-specific goals only in their mode", () => {
    const stage = missionLadder.find((m) => m.id === "stage-3")!;
    expect(stage.stat(stats({ kind: "song", stage: 9 }))).toBe(0);
    expect(stage.stat(stats({ kind: "daily", stage: 4 }))).toBe(4);
    const clear = missionLadder.find((m) => m.id === "clear-medio")!;
    expect(clear.stat(stats({ level: "medio", completed: true }))).toBe(1);
    expect(clear.stat(stats({ level: "titi", completed: true }))).toBe(0);
  });
  it("never runs out and recovers from corrupt saves", () => {
    const later = missionAt(missionLadder.length + 7);
    expect(later.target).toBeGreaterThan(0);
    expect(readMissions(null)).toEqual(freshMissions());
    expect(readMissions({ next: 1, active: [] })).toEqual(freshMissions());
    expect(readMissions({ next: 9, active: [{ index: 4, progress: 3 }, { index: -1, progress: NaN }, { index: 7, progress: 1 }] }).active[1]).toEqual({ index: 0, progress: 0 });
  });
});

describe("Player level", () => {
  it("always gives experience, more for better runs, without letting huge scores skip levels", () => {
    expect(xpForRun(stats({ score: 1_000_000 }))).toBe(10 + 500);
    expect(xpForRun(stats())).toBe(10);
    expect(xpForRun(stats({ perfects: 50, completed: true }))).toBeGreaterThan(xpForRun(stats({ perfects: 50 })));
    expect(xpForRun(stats({ kind: "endless", stage: 6 }))).toBe(10 + 90);
  });
  it("converts experience to levels with rising steps and rewards", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, needed: 150 });
    expect(levelFromXp(150)).toEqual({ level: 2, into: 0, needed: 250 });
    expect(levelFromXp(410)).toEqual({ level: 3, into: 10, needed: 350 });
    expect(levelFromXp(NaN).level).toBe(1);
    expect(levelReward(10)).toBe(25);
  });
});

describe("Ghost of the record run", () => {
  it("replays lane changes and knows when the record run ended", () => {
    const rec = new GhostRecorder();
    rec.tap(0.5, 0);
    rec.tap(0.9, 0);
    rec.tap(2.25, 2);
    rec.judged(0, 100);
    rec.judged(2, 300);
    const ghost = rec.finish(5);
    expect(ghost.inputs).toEqual([500, 0, 2250, 2]);
    expect(ghost.scores).toEqual([100, 100, 300]);
    expect(ghostLane(ghost, 0.2)).toBe(1);
    expect(ghostLane(ghost, 1)).toBe(0);
    expect(ghostLane(ghost, 2.25)).toBe(2);
    expect(ghostLane(ghost, 6)).toBeUndefined();
    expect(readGhost(JSON.parse(JSON.stringify(ghost)))).toEqual(ghost);
  });
  it("rejects malformed stored ghosts", () => {
    expect(readGhost(null)).toBeNull();
    expect(readGhost({ inputs: [1, 2, 3], scores: [], end: 1 })).toBeNull();
    expect(readGhost({ inputs: [100, 7], scores: [], end: 1 })).toBeNull();
    expect(readGhost({ inputs: [], scores: ["x"], end: 1 })).toBeNull();
  });
});

describe("Touch steering", () => {
  it("maps the screen to three columns", () => {
    expect([0, 129, 130, 259, 260, 389].map((x) => laneFromX(x, 390))).toEqual([0, 0, 1, 1, 2, 2]);
    expect(laneFromX(-40, 390)).toBe(0);
    expect(laneFromX(999, 390)).toBe(2);
    expect(laneFromX(10, 0)).toBe(1);
  });
  it("turns one long swipe into several lane steps", () => {
    const swipe = new SwipeTracker(24);
    expect(swipe.move(100)).toBe(0);
    swipe.down(200);
    expect(swipe.move(210)).toBe(0);
    expect(swipe.move(226)).toBe(1);
    expect(swipe.move(251)).toBe(1);
    expect(swipe.move(240)).toBe(0);
    expect(swipe.move(226)).toBe(-1);
    swipe.up();
    expect(swipe.move(0)).toBe(0);
    expect(stepLane(2, 1)).toBe(2);
    expect(stepLane(0, -1)).toBe(0);
    expect(getControlMode("swipe")).toBe("swipe");
    expect(getControlMode("hack")).toBe("buttons");
  });
});

describe("Relics", () => {
  it("sit on real, non-crystal platforms: two per song and two in Infinito", () => {
    expect(new Set(relics.map((r) => r.id)).size).toBe(10);
    for (const level of levels) {
      const chart = placeRelics(createChart(level), level.id);
      const marked = chart.filter((n) => n.relic);
      expect(marked).toHaveLength(2);
      marked.forEach((n) => expect(n.crystal).toBe(false));
    }
    expect([stageRelic(4), stageRelic(8), stageRelic(0)]).toEqual(["baton", "quartz", undefined]);
  });
  it("are collected only with a Perfect and never change the score", () => {
    const level = getLevel("titi");
    const plain = createChart(level), marked = placeRelics(createChart(level), level.id);
    const play = (notes: typeof plain, early: number) => {
      const run = new Run(notes, level);
      const found: string[] = [];
      for (const n of notes) {
        run.tap(n.lane, n.time - early).forEach((h) => h.relic && found.push(h.relic));
        run.advance(n.time + 0.3).forEach((h) => h.relic && found.push(h.relic));
      }
      return { score: run.score, found };
    };
    const perfect = play(marked, 0.09);
    expect(perfect.found).toEqual(["metronome", "cassette"]);
    expect(perfect.score).toBe(play(plain, 0.09).score);
    expect(play(marked, -0.1).found).toEqual([]);
  });
});

describe("Profile", () => {
  const stub = () => {
    const data = new Map<string, string>();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
    return data;
  };
  it("keeps relics, feats, levels, missions and Infinito bests across reloads", async () => {
    stub();
    const first = await import("../src/profile");
    expect(first.recordRelic("vinyl")).toBe(true);
    expect(first.recordRelic("vinyl")).toBe(false);
    expect(first.addXp(420)).toEqual([2, 3]);
    expect(first.saveEndless(5000, 4)).toEqual({ score: true, stage: true });
    expect(first.saveEndless(4000, 6)).toEqual({ score: false, stage: true });
    expect(first.saveDaily("2026-09-28", 900, 2).score).toBe(true);
    first.setMissions(applyRun(first.getMissions(), stats({ perfects: 40 })).state);
    vi.resetModules();
    const second = await import("../src/profile");
    expect(second.foundRelics()).toEqual(["vinyl"]);
    expect(second.playerLevel().level).toBe(3);
    expect(second.endlessBest()).toEqual({ score: 5000, stage: 6 });
    expect(second.dailyBest("2026-09-28").score).toBe(900);
    expect(second.dailyBest("2026-09-29").score).toBe(0);
    expect(second.getMissions().next).toBe(4);
  });
  it("grants the Leyenda feat when the last relic is found", async () => {
    stub();
    const profile = await import("../src/profile");
    for (const relic of relics) profile.recordRelic(relic.id);
    expect(profile.hasFeat("relics")).toBe(true);
    expect(profile.progressSnapshot().feats.relics).toBe(true);
  });
  it("saves and validates ghosts per song", async () => {
    const data = stub();
    const profile = await import("../src/profile");
    profile.saveGhost("medio", { inputs: [100, 2], scores: [100], end: 5000 });
    expect(profile.getGhost("medio")?.inputs).toEqual([100, 2]);
    data.set("pulse-ghost-landing-v2-titi", "{\"inputs\":\"bad\"}");
    expect(profile.getGhost("titi")).toBeNull();
  });
});
