import { assetUrl } from "../paths";

export class Conductor {
  private context?: AudioContext;
  private gain?: GainNode;
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
    envelope.connect(this.gain!);
    osc.start(now);
    osc.stop(now + 0.15);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
    };
  }
}
