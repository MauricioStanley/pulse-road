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
  oscillators: { frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }; disconnect: ReturnType<typeof vi.fn>; onended?: () => void }[] = [];
  constructor() {
    FakeAudioContext.instance = this;
  }
  async resume() {
    this.state = "running";
    this.onstatechange?.();
  }
  sampleRate = 44100;
  gains: { gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn>; setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> } }[] = [];
  createGain() {
    const node = { gain: { value: 1, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
    this.gains.push(node);
    return node;
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createOscillator() {
    const oscillator = { type: "sine", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: undefined as undefined | (() => void) };
    this.oscillators.push(oscillator);
    return oscillator;
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
      playbackRate: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
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
  it("keeps the newest selection when a cancelled A → B → A load overlaps", async () => {
    const c = new Conductor(); await c.unlock();
    await Promise.all([
      c.load(() => {}, "tiny-orbit.mp3"),
      c.load(() => {}, "zero-threshold.mp3"),
      c.load(() => {}, "tiny-orbit.mp3"),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await c.load(() => {}, "tiny-orbit.mp3");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("makes one original damage chirp per miss, disconnects it and obeys mute", async () => {
    const c = new Conductor(); await c.unlock();
    c.tick("miss"); c.tick("miss");
    const ctx=FakeAudioContext.instance;
    expect(ctx.oscillators).toHaveLength(2);
    expect(ctx.oscillators[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(52,0.14);
    ctx.oscillators[0].onended?.();
    expect(ctx.oscillators[0].disconnect).toHaveBeenCalled();
    c.mute(true); c.tick("miss");
    expect(ctx.oscillators).toHaveLength(2);
  });
  it("loads different tracks in order without playing the stale buffer", async () => {
    const c = new Conductor();
    await c.unlock();
    await Promise.all([c.load(() => {}, "tiny-orbit.mp3"), c.load(() => {}, "zero-threshold.mp3")]);
    expect(vi.mocked(fetch).mock.calls.map(args => args[0])).toEqual(["/audio/tiny-orbit.mp3", "/audio/zero-threshold.mp3"]);
    await c.load(() => {}, "zero-threshold.mp3");
    expect(fetch).toHaveBeenCalledTimes(2);
    await c.load(() => {}, "tiny-orbit.mp3");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
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
  it("plays landings as a climbing pentatonic run in the song's key", async () => {
    const c = new Conductor(); await c.unlock();
    c.setKey(74, true); // D minor, like First Light
    const ctx = FakeAudioContext.instance;
    const pitch = (combo: number) => {
      c.hit("perfect", combo);
      return ctx.oscillators[ctx.oscillators.length - 1].frequency.setValueAtTime.mock.calls[0][0] as number;
    };
    const semitones = (hz: number) => Math.round(12 * Math.log2(hz / 440) + 69);
    expect([1, 2, 3, 4, 5, 6, 11].map(combo => semitones(pitch(combo)))).toEqual([74, 77, 79, 81, 84, 86, 74]);
    c.hit("good", 1);
    expect(semitones(ctx.oscillators[ctx.oscillators.length - 1].frequency.setValueAtTime.mock.calls[0][0])).toBe(62);
    const before = ctx.oscillators.length;
    c.mute(true); c.hit("perfect", 3); c.rise(); c.fanfare(); c.star(0);
    expect(ctx.oscillators).toHaveLength(before);
  });
  it("slows and fades only the music on a fall, and restores it on the next play", async () => {
    const c = new Conductor(); await c.unlock(); await c.load(() => {});
    const ctx = FakeAudioContext.instance;
    const [music] = ctx.gains;
    c.play();
    c.tapeStop(0.9);
    expect(music.gain.setTargetAtTime).toHaveBeenCalledWith(0, expect.any(Number), expect.any(Number));
    c.pause();
    c.play();
    expect(music.gain.setValueAtTime).toHaveBeenLastCalledWith(0.8, expect.any(Number));
  });
});
