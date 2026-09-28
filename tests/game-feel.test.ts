import { afterEach, describe, expect, it, vi } from "vitest";
import { getLevel } from "../src/core/levels";

// Real RoadScene update logic with a recording stand-in for Phaser drawing.
vi.mock("phaser", () => ({
  default: { Scene: class { scale = { width: 390, height: 844 }; } },
}));
import { RoadScene, FEVER_COMBO, type RoadView } from "../src/game/RoadScene";

function harness(view: Partial<RoadView> = {}) {
  const scene = new RoadScene();
  const ball = {
    x: 195, y: 0, alpha: 1, width: 100, height: 100,
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setDisplaySize(w: number, h: number) { this.width = w; this.height = h; return this; },
    setAlpha(a: number) { this.alpha = a; return this; },
  };
  const calls: Record<string, number> = {};
  const ink = new Proxy({}, { get: (_, key) => () => { calls[String(key)] = (calls[String(key)] ?? 0) + 1; } });
  Object.assign(scene, { ink, ball, ballX: 195 });
  const state = { mode: "playing", time: 10, notes: [], reduced: false, combo: 0, active: true, ...view } as RoadView;
  scene.getView = () => state;
  let now = 5000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const frame = (ms = 1000 / 60) => { now += ms; scene.update(now, ms); };
  return { scene, ball, calls, state, frame, reset: () => { for (const k in calls) delete calls[k]; } };
}
afterEach(() => vi.restoreAllMocks());

describe("Game feel", () => {
  it("squashes the orb on a landing, but never with reduced effects", () => {
    const { scene, ball, frame } = harness();
    frame();
    scene.hit(1, "perfect", false);
    frame();
    expect(ball.width).toBeGreaterThan(100);
    expect(ball.height).toBeLessThan(100);
    for (let i = 0; i < 20; i++) frame();
    expect(ball.width).toBe(100);
    const calm = harness({ reduced: true });
    calm.scene.hit(1, "perfect", true);
    calm.frame();
    expect([calm.ball.width, calm.ball.height]).toEqual([100, 100]);
  });
  it("shatters the orb on a fall and restores it on reset", () => {
    const { scene, ball, frame } = harness({ mode: "dying" });
    scene.shatter(false);
    frame();
    expect(ball.alpha).toBe(0);
    scene.reset();
    frame();
    expect(ball.alpha).toBe(1);
  });
  it("keeps landing effects bounded and lets them expire", () => {
    const { scene, frame } = harness();
    for (let i = 0; i < 30; i++) scene.hit((i % 3) as 0 | 1 | 2, i % 4 ? "perfect" : "miss", false, i % 5 === 0);
    const state = scene as unknown as { landings: unknown[] };
    expect(state.landings.length).toBeLessThanOrEqual(8);
    for (let i = 0; i < 60; i++) frame();
    expect(state.landings).toHaveLength(0);
  });
  it("draws more while in Fever, and adds a screen-edge warning on low energy", () => {
    const base = harness({ combo: FEVER_COMBO - 1, energy: 100 });
    base.frame(); base.reset(); base.frame();
    const normal = base.calls.lineBetween ?? 0;
    base.state.combo = FEVER_COMBO;
    base.frame(); base.frame(); base.reset(); base.frame();
    expect(base.calls.lineBetween ?? 0).toBeGreaterThan(normal);
    base.reset(); base.state.energy = 100; base.frame();
    const healthy = base.calls.fillRect ?? 0;
    base.reset(); base.state.energy = 20; base.frame();
    expect(base.calls.fillRect ?? 0).toBeGreaterThan(healthy);
  });
  it("pulses on the song's beat only while music plays", () => {
    // The kick lands on whole beats: brighter lines right on it than just before the next.
    const level = getLevel("medio");
    const alphaAt = (time: number) => {
      const h = harness({ bpm: level.bpm, time, travel: level.travel });
      const alphas: number[] = [];
      Object.assign(h.scene, { ink: new Proxy({}, { get: (_, key) => key === "lineStyle" ? (_w: number, _c: number, a: number) => alphas.push(a) : () => {} }) });
      h.frame(0);
      return alphas.reduce((sum, a) => sum + a, 0);
    };
    expect(alphaAt(20.0)).toBeGreaterThan(alphaAt(20.45) * 1.2);
  });
  it("draws the record ghost, power-ups, relics and shields only when present", () => {
    const count = (view: Partial<RoadView>) => {
      const h = harness({ time: 1, ...view });
      h.frame(); h.reset(); h.frame();
      return { ...h.calls };
    };
    const notes = [{ id: 0, time: 1.5, lane: 1 as const, crystal: false, obstacles: [] }];
    const plain = count({ notes });
    expect((count({ notes, ghostLane: 0 }).strokeCircle ?? 0)).toBeGreaterThan(plain.strokeCircle ?? 0);
    expect((count({ notes: [{ ...notes[0], power: "shield" as const }] }).fillPath ?? 0)).toBeGreaterThan(plain.fillPath ?? 0);
    expect((count({ notes: [{ ...notes[0], relic: "vinyl" }] }).fillPath ?? 0)).toBeGreaterThan(plain.fillPath ?? 0);
    const found = count({ notes: [{ ...notes[0], relic: "vinyl" }], relicFound: () => true });
    expect(found.fillPath ?? 0).toBe(plain.fillPath ?? 0);
    expect((count({ notes, shields: 2 }).strokeCircle ?? 0)).toBeGreaterThanOrEqual((plain.strokeCircle ?? 0) + 2);
  });
  it("absorbs a shielded miss without the red flash or a ball stumble", () => {
    const { scene, ball, frame } = harness();
    frame();
    const restY = ball.y;
    scene.hit(1, "miss", false, false, { shielded: true });
    for (let i = 0; i < 6; i++) frame();
    expect(ball.y).toBe(restY);
  });
});
