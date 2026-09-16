import { afterEach, describe, expect, it, vi } from "vitest";
import { Run } from "../src/core/rules";

// Keep the real RoadScene input/update methods; replace only the renderer.
vi.mock("phaser", () => ({
  default: { Scene: class { scale = { width: 390, height: 844 }; } },
}));
import { RoadScene } from "../src/game/RoadScene";

function harness() {
  const scene = new RoadScene();
  const ball = {
    x: 195, y: 0,
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setDisplaySize() { return this; },
    setAlpha() { return this; },
  };
  const ink = new Proxy({}, { get: () => () => {} });
  Object.assign(scene, { ink, ball, ballX: 195 });
  scene.getView = () => ({
    mode: "playing", time: 0, notes: [], reduced: false, combo: 0, active: true,
  });
  let now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  return { scene, ball, frame(ms = 1000 / 60) { now += ms; scene.update(now, ms); } };
}

afterEach(() => vi.restoreAllMocks());

describe("Immediate lane response, independently of rhythm scoring", () => {
  it("can reset on initial home before Phaser initializes its renderer", () => {
    const scene = new RoadScene();
    Object.assign(scene, { scale: undefined });
    expect(() => scene.reset()).not.toThrow();
  });

  it("moves on the next frame even when an early tap earns no score", () => {
    const { scene, ball, frame } = harness();
    const run = new Run([{ id: 0, time: 2, lane: 0, crystal: false, obstacles: [] }]);
    scene.tap(0);
    expect(run.tap(0, 1)).toBeUndefined();
    frame();
    expect(ball.x).toBeLessThan(195);
    expect(run.score).toBe(0);
  });

  it("never steers toward a missed note without a new input", () => {
    const { scene, ball, frame } = harness();
    scene.tap(0);
    for (let i = 0; i < 12; i++) frame();
    const selectedX = ball.x;
    scene.hit(2, "miss", false);
    frame();
    expect(ball.x).toBeLessThanOrEqual(selectedX + 0.01);
  });

  it("keeps the last of rapid alternating taps, not the last judged note", () => {
    const { scene, ball, frame } = harness();
    scene.tap(0);
    scene.tap(2);
    scene.hit(0, "miss", false);
    frame();
    expect(ball.x).toBeGreaterThan(195);
  });

  it.each([30, 60, 120])("reaches the selected lane within 100 ms at %s FPS", fps => {
    const { scene, ball, frame } = harness();
    scene.tap(2);
    for (let i = 0; i < Math.ceil(fps * 0.1); i++) frame(1000 / fps);
    const targetX = 195 + 390 * 0.48 * 0.66;
    expect(Math.abs(ball.x - targetX)).toBeLessThanOrEqual(0.5);
  });

  it("responds immediately with reduced effects enabled too", () => {
    const { scene, ball, frame } = harness();
    const previousView = scene.getView;
    scene.getView = () => ({ ...previousView(), reduced: true });
    scene.tap(2);
    frame();
    expect(ball.x).toBeGreaterThan(195);
  });

  it("crosses the full track within 100 ms without waiting for a note", () => {
    const { scene, ball, frame } = harness();
    scene.tap(0);
    for (let i = 0; i < 6; i++) frame();
    expect(ball.x).toBeLessThan(72);
    scene.tap(2);
    for (let i = 0; i < 6; i++) frame();
    expect(Math.abs(ball.x - (195 + 390 * 0.48 * 0.66))).toBeLessThanOrEqual(0.5);
  });
});
