import { beforeEach, describe, expect, it, vi } from "vitest";
import { Conductor } from "../src/audio/conductor";

class FakeAudioContext {
  static instance: FakeAudioContext;
  currentTime = 0;
  state = "suspended";
  destination = {};
  onstatechange?: () => void;
  sources: { started: number[]; stopped: boolean; disconnected: boolean }[] =
    [];
  constructor() {
    FakeAudioContext.instance = this;
  }
  async resume() {
    this.state = "running";
    this.onstatechange?.();
  }
  createGain() {
    return { gain: { value: 1, setTargetAtTime: vi.fn() }, connect: vi.fn() };
  }
  async decodeAudioData() {
    return { duration: 80 };
  }
  createBufferSource() {
    const entry = {
      started: [] as number[],
      stopped: false,
      disconnected: false,
    };
    this.sources.push(entry);
    return {
      buffer: null,
      connect: vi.fn(),
      start: (...args: number[]) => {
        entry.started = args;
      },
      stop: () => {
        entry.stopped = true;
      },
      disconnect: () => {
        entry.disconnected = true;
      },
    };
  }
}
beforeEach(() => {
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Uint8Array([0, 1, 2]))),
  );
});
describe("Audio transport", () => {
  it("loads once, follows the audio clock and resumes at the exact offset", async () => {
    const c = new Conductor();
    await c.unlock();
    await c.load(() => {});
    await c.load(() => {});
    expect(fetch).toHaveBeenCalledTimes(1);
    const ctx = FakeAudioContext.instance;
    ctx.currentTime = 5;
    c.play();
    ctx.currentTime = 17.125;
    expect(c.time).toBe(12.125);
    expect(c.pause()).toBe(12.125);
    ctx.currentTime = 99;
    expect(c.time).toBe(12.125);
    c.play(12.125);
    expect(ctx.sources[1].started).toEqual([99, 12.125]);
    ctx.currentTime = 100;
    expect(c.time).toBe(13.125);
  });
  it("does not accumulate audio sources across ten restarts", async () => {
    const c = new Conductor();
    await c.unlock();
    await c.load(() => {});
    for (let i = 0; i < 10; i++) {
      c.play();
      c.reset();
    }
    expect(FakeAudioContext.instance.sources).toHaveLength(10);
    expect(
      FakeAudioContext.instance.sources.every(
        (s) => s.stopped && s.disconnected,
      ),
    ).toBe(true);
    expect(c.time).toBe(0);
  });
  it("reports interruptions only while running", async () => {
    const c = new Conductor();
    await c.unlock();
    await c.load(() => {});
    c.onInterruption = vi.fn();
    const ctx = FakeAudioContext.instance;
    ctx.state = "suspended";
    ctx.onstatechange?.();
    expect(c.onInterruption).not.toHaveBeenCalled();
    ctx.state = "running";
    c.play();
    ctx.state = "suspended";
    ctx.onstatechange?.();
    expect(c.onInterruption).toHaveBeenCalledTimes(1);
  });
  it("can retry a failed download", async () => {
    const c = new Conductor();
    await c.unlock();
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 503 }));
    await expect(c.load(() => {})).rejects.toThrow();
    await c.load(() => {});
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
