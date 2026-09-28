import type { Lane, Note, PowerId } from "./chart";
import { getLevel, type Level } from "./levels";
export type Judgment = "perfect" | "good" | "miss";
export interface Hit {
  note: Note; judgment: Judgment; delta: number; crystal: boolean;
  /** A relic collected with a Perfect on its platform. */
  relic?: string;
  /** Infinito: a power-up collected on landing. */
  power?: PowerId;
  /** Infinito: a shield absorbed this miss (no damage, combo kept). */
  shielded?: boolean;
  /** Infinito: a one-time rescue kept the run alive. */
  saved?: boolean;
}
// Matches the visible lane transition, not a hidden tap window.
export const SETTLE_TIME = 0.045;
const EPS = 1e-8;
// IDs are consecutive small integers. An indexed log avoids a Map dependency
// in the ES5 ultralight build and is also cheaper to query during rendering.
export class JudgmentLog {
  private values: Judgment[] = [];
  has(id: number) { return this.values[id] !== undefined; }
  get(id: number) { return this.values[id]; }
  set(id: number, judgment: Judgment) { this.values[id] = judgment; return this; }
}
export class Run {
  score = 0; energy = 100; combo = 0; maxCombo = 0;
  perfect = 0; good = 0; misses = 0; crystals = 0; index = 0;
  finished = false;
  lane: Lane = 1;
  private enteredAt = -Infinity;
  readonly judged = new JudgmentLog();
  constructor(readonly notes: readonly Note[], readonly level: Level = getLevel("medio")) {}
  get multiplier() { return Math.min(4, 1 + Math.floor(this.combo / 10)); }
  // Over the platforms actually reached. A finished song has judged every note,
  // so stars are unchanged; an early fall no longer reads as "1 %".
  get accuracy() { return this.index ? Math.round(100 * (this.perfect + this.good * 0.6) / this.index) : 0; }
  get dead() { return this.energy <= 0; }
  get stars() { return !this.finished || this.dead ? 0 : this.accuracy >= 90 ? 3 : this.accuracy >= 75 ? 2 : 1; }
  advance(time: number): Hit[] {
    const hits: Hit[] = [];
    if (typeof time !== "number" || !isFinite(time) || this.finished || this.dead) return hits;
    while (this.index < this.notes.length && !this.dead) {
      const note = this.notes[this.index];
      if (time + EPS < note.time) break;
      const arrival = Math.max(note.time, this.enteredAt + SETTLE_TIME);
      if (this.lane === note.lane && arrival <= note.time + this.level.lateWindow + EPS) {
        if (time + EPS < arrival) break;
        const delta = arrival - note.time;
        hits.push(this.resolve(note, delta <= EPS ? "perfect" : "good", delta));
      } else if (time > note.time + this.level.lateWindow + EPS) {
        hits.push(this.resolve(note, "miss", time - note.time));
      } else break;
    }
    return hits;
  }
  tap(lane: Lane, time: number): Hit[] {
    if ((lane !== 0 && lane !== 1 && lane !== 2) || typeof time !== "number" || !isFinite(time) || this.finished || this.dead) return [];
    // Resolve elapsed landings BEFORE changing lanes, including between frames.
    const hits = this.advance(time);
    if (this.dead) return hits;
    if (this.lane !== lane) { this.lane = lane; this.enteredAt = time; }
    return hits.concat(this.advance(time));
  }
  private resolve(note: Note, judgment: Judgment, delta: number): Hit {
    this.judged.set(note.id, judgment);
    this.index++;
    const hit: Hit = { note, judgment, delta, crystal: judgment === "perfect" && note.crystal };
    if (judgment === "miss") this.onMiss(hit);
    else this.onLand(hit);
    return hit;
  }
  /** Extra score factor for special modes. Songs always score ×1. */
  protected bonus(_note: Note) { return 1; }
  protected onMiss(_hit: Hit) {
    this.combo = 0; this.energy = Math.max(0, this.energy - this.level.damage); this.misses++;
  }
  protected onLand(hit: Hit) {
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.energy = Math.min(100, this.energy + this.level.recovery);
    const bonus = this.bonus(hit.note);
    this.score += Math.round((hit.judgment === "perfect" ? 100 : 60) * this.multiplier * bonus);
    if (hit.judgment === "perfect") this.perfect++; else this.good++;
    if (hit.crystal) { this.crystals++; this.score += Math.round(25 * bonus); }
    if (hit.judgment === "perfect" && hit.note.relic) hit.relic = hit.note.relic;
  }
}
