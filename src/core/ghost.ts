import type { Lane } from "./chart";
// Your record run, replayed as a translucent orb. Inputs are stored as
// [time in ms, lane] pairs; scores[i] is the total after platform i.
export interface Ghost {
  inputs: number[];
  scores: number[];
  end: number;
}
export class GhostRecorder {
  private inputs: number[] = [];
  private scores: number[] = [];
  private lane: Lane = 1;
  tap(time: number, lane: Lane) {
    if (lane === this.lane || !isFinite(time)) return;
    this.lane = lane;
    this.inputs.push(Math.round(time * 1000), lane);
  }
  judged(index: number, score: number) {
    this.scores[index] = score;
  }
  finish(end: number): Ghost {
    // Fill gaps so every judged index has a number.
    for (let i = 0; i < this.scores.length; i++) if (this.scores[i] === undefined) this.scores[i] = i ? this.scores[i - 1] : 0;
    return { inputs: this.inputs.slice(), scores: this.scores.slice(), end: Math.round(end * 1000) };
  }
}
/** Lane the ghost holds at a song time; undefined once its run has ended. */
export function ghostLane(ghost: Ghost, time: number): Lane | undefined {
  const ms = time * 1000;
  if (ms > ghost.end) return undefined;
  let low = 0, high = ghost.inputs.length / 2;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (ghost.inputs[mid * 2] <= ms) low = mid + 1;
    else high = mid;
  }
  return low ? (ghost.inputs[(low - 1) * 2 + 1] as Lane) : 1;
}
/** Rejects anything that is not a well-formed ghost. */
export function readGhost(value: unknown): Ghost | null {
  const g = value as Ghost;
  if (!g || typeof g !== "object" || !Array.isArray(g.inputs) || !Array.isArray(g.scores) || !Number.isFinite(g.end)) return null;
  if (g.inputs.length % 2 || g.inputs.length > 4000 || g.scores.length > 2000) return null;
  for (let i = 0; i < g.inputs.length; i++) {
    const v = g.inputs[i];
    if (!Number.isFinite(v) || (i % 2 === 1 && v !== 0 && v !== 1 && v !== 2)) return null;
  }
  if (!g.scores.every((s) => Number.isFinite(s))) return null;
  return { inputs: g.inputs, scores: g.scores, end: g.end };
}
