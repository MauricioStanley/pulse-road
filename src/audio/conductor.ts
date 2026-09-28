import { assetUrl } from "../paths";

export class Conductor {
  private context?: AudioContext;
  private gain?: GainNode;
  /** Effects bus: stays audible while the music bus fades on a fall. */
  private fx?: GainNode;
  private noise?: AudioBuffer;
  private root = 72;
  private scale = [0, 2, 4, 7, 9];
  private buffer?: AudioBuffer;
  private source?: AudioBufferSourceNode;
  private startAt = 0;
  private position = 0;
  private running = false;
  private silent = false;
  private muted = false;
  private loadPromise?: Promise<void>;
  private loadedFile = "";
  private loadGeneration = 0;
  onInterruption?: () => void;

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.gain = this.context.createGain();
      this.gain.gain.value = this.muted ? 0 : 0.8;
      this.gain.connect(this.context.destination);
      this.fx = this.context.createGain();
      this.fx.gain.value = this.muted ? 0 : 1;
      this.fx.connect(this.context.destination);
      this.context.onstatechange = () => {
        if (this.running && this.context?.state !== "running")
          this.onInterruption?.();
      };
    }
    if (this.context.state !== "running") await this.context.resume();
  }
  async load(onProgress: (progress: number) => void, file = "first-light.mp3"): Promise<void> {
    const request = ++this.loadGeneration;
    if (this.loadPromise) {
      try { await this.loadPromise; } catch { /* A different track may still load. */ }
    }
    // Only the newest waiting selection may start a download. A → B → A
    // must never replace A's playing buffer with a late, cancelled B response.
    if (request !== this.loadGeneration) return;
    if (this.buffer && this.loadedFile === file) { onProgress(1); return; }
    const pending = (async () => {
      const response = await fetch(assetUrl(`audio/${file}`));
      if (!response.ok) throw new Error("No se pudo descargar la canción.");
      const total = Number(response.headers.get("content-length"));
      let bytes: ArrayBuffer;
      if (response.body && total > 0) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          length += value.length;
          onProgress(Math.min(0.9, (length / total) * 0.9));
        }
        const combined = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        bytes = combined.buffer;
      } else {
        bytes = await response.arrayBuffer();
        onProgress(0.9);
      }
      if (!this.context) await this.unlock();
      this.buffer = await this.context!.decodeAudioData(bytes);
      this.loadedFile = file;
      onProgress(1);
    })();
    this.loadPromise = pending;
    try {
      await pending;
    } finally {
      if (this.loadPromise === pending) this.loadPromise = undefined;
    }
  }
  get time() {
    if (!this.running) return this.position;
    const now = this.silent
      ? performance.now() / 1000
      : this.context!.currentTime;
    return this.position + Math.max(0, now - this.startAt);
  }
  play(position = 0, silent = false) {
    this.stopSource();
    this.restoreMusic();
    this.position = position;
    this.silent = silent;
    this.startAt = silent
      ? performance.now() / 1000
      : this.context!.currentTime;
    if (!silent && this.buffer && position < this.buffer.duration) {
      this.source = this.context!.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.connect(this.gain!);
      this.source.start(this.startAt, position);
    }
    this.running = true;
  }
  pause() {
    this.position = this.time;
    this.running = false;
    this.stopSource();
    return this.position;
  }
  reset() {
    this.pause();
    this.position = 0;
  }
  private stopSource() {
    if (this.source) {
      try {
        this.source.stop();
      } catch {}
      this.source.disconnect();
      this.source = undefined;
    }
  }
  mute(value: boolean) {
    this.muted = value;
    if (this.gain)
      this.gain.gain.setTargetAtTime(
        value ? 0 : 0.8,
        this.context!.currentTime,
        0.015,
      );
    if (this.fx)
      this.fx.gain.setTargetAtTime(value ? 0 : 1, this.context!.currentTime, 0.015);
  }
  private restoreMusic() {
    if (!this.gain || !this.context) return;
    const param = this.gain.gain;
    param.cancelScheduledValues?.(this.context.currentTime);
    param.setValueAtTime(this.muted ? 0 : 0.8, this.context.currentTime);
  }
  /** Hit sounds follow the song's key: pentatonic, so any order is consonant. */
  setKey(root: number, minor: boolean) {
    this.root = root;
    this.scale = minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
  }
  private get live() {
    return !!this.context && !this.muted && this.context.state === "running";
  }
  private pluck(midi: number, level: number, at: number, decay = 0.24) {
    const ctx = this.context!;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), at);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(level, at + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(envelope);
    envelope.connect(this.fx!);
    osc.start(at);
    osc.stop(at + decay + 0.02);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
    };
  }
  /** A melodic step per landing: the combo climbs two octaves, then loops. */
  hit(judgment: "perfect" | "good", combo: number) {
    if (!this.live) return;
    const step = Math.max(0, combo - 1) % 10;
    const note = this.root + this.scale[step % 5] + 12 * Math.floor(step / 5);
    this.pluck(judgment === "perfect" ? note : note - 12, judgment === "perfect" ? 0.06 : 0.04, this.context!.currentTime);
  }
  /** Rising run for multipliers; the full run announces Fever. */
  rise(steps = 5) {
    if (!this.live) return;
    const now = this.context!.currentTime;
    for (let i = 0; i < steps; i++)
      this.pluck(this.root + 12 + this.scale[i % 5] + 12 * Math.floor(i / 5), 0.05, now + i * 0.045, 0.3);
  }
  /** Bell chord for a new record or personal best. */
  fanfare() {
    if (!this.live) return;
    const now = this.context!.currentTime;
    [0, this.scale[2], 7, 12].forEach((interval, i) =>
      this.pluck(this.root + 12 + interval, 0.05, now + i * 0.07, 0.7),
    );
  }
  /** One chime per earned star on the results screen. */
  star(index: number) {
    if (!this.live) return;
    this.pluck(this.root + 12 + [0, 7, 12][index % 3], 0.06, this.context!.currentTime, 0.5);
  }
  /** Falling: the record slows like a stopped turntable, then goes quiet. */
  tapeStop(duration = 0.9) {
    if (!this.context || !this.gain) return;
    const now = this.context.currentTime;
    const rate = this.source?.playbackRate;
    if (rate) {
      rate.setValueAtTime(1, now);
      rate.exponentialRampToValueAtTime(0.3, now + duration);
    }
    this.gain.gain.setTargetAtTime(0, now + duration * 0.3, duration * 0.25);
    if (!this.live) return;
    // Short burst of synthesized noise: the orb breaking apart.
    if (!this.noise) {
      this.noise = this.context.createBuffer(1, Math.floor(this.context.sampleRate * 0.4), this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      let seed = 4099;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] = (seed / 2147483648 - 1) * Math.exp(-i / (data.length * 0.18));
      }
    }
    const burst = this.context.createBufferSource();
    const level = this.context.createGain();
    burst.buffer = this.noise;
    level.gain.value = 0.16;
    burst.connect(level);
    level.connect(this.fx!);
    burst.start(now);
    burst.onended = () => {
      burst.disconnect();
      level.disconnect();
    };
  }
  tick(kind: "perfect" | "good" | "miss" | "count") {
    if (!this.context || this.muted || this.context.state !== "running") return;
    const osc = this.context.createOscillator();
    const envelope = this.context.createGain();
    const now = this.context.currentTime;
    osc.type = kind === "miss" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(
      kind === "perfect"
        ? 880
        : kind === "good"
          ? 660
          : kind === "count"
            ? 440
            : 120,
      now,
    );
    if (kind === "miss") {
      // Original two-stage falling chirp: arcade damage, no sampled game audio.
      osc.frequency.setValueAtTime(235, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.055);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.14);
    }
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(
      kind === "miss" ? 0.12 : 0.045,
      now + 0.004,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(envelope);
    envelope.connect(this.fx!);
    osc.start(now);
    osc.stop(now + 0.15);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
    };
  }
}
