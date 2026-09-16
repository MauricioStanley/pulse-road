import type { Lane, Note } from "./chart";
export type Judgment = "perfect" | "good" | "miss";
export interface Hit {
  note: Note;
  judgment: Judgment;
  delta: number;
  crystal: boolean;
}
export const PERFECT_WINDOW = 0.08;
export const GOOD_WINDOW = 0.16;
const EPS = 1e-8;

export class Run {
  score = 0;
  energy = 100;
  combo = 0;
  maxCombo = 0;
  perfect = 0;
  good = 0;
  misses = 0;
  crystals = 0;
  index = 0;
  finished = false;
  readonly judged = new Map<number, Judgment>();
  private lockedUntil = -1;
  constructor(readonly notes: readonly Note[]) {}
  get multiplier() {
    return Math.min(4, 1 + Math.floor(this.combo / 10));
  }
  get accuracy() {
    return this.notes.length
      ? Math.round((100 * (this.perfect + this.good * 0.6)) / this.notes.length)
      : 0;
  }
  get dead() {
    return this.energy <= 0;
  }
  get stars() {
    return !this.finished || this.dead
      ? 0
      : this.accuracy >= 90
        ? 3
        : this.accuracy >= 75
          ? 2
          : 1;
  }

  advance(time: number): Hit[] {
    const hits: Hit[] = [];
    if (this.finished || this.dead) return hits;
    while (
      this.index < this.notes.length &&
      time - this.notes[this.index].time > GOOD_WINDOW + EPS &&
      !this.dead
    ) {
      hits.push(
        this.resolve(
          this.notes[this.index],
          "miss",
          time - this.notes[this.index].time,
        ),
      );
    }
    return hits;
  }

  tap(lane: Lane, time: number): Hit | undefined {
    if (this.finished || this.dead || time <= this.lockedUntil) return;
    const note = this.notes[this.index];
    if (!note) return;
    const delta = time - note.time;
    if (Math.abs(delta) > GOOD_WINDOW + EPS) return;
    const judgment =
      lane !== note.lane
        ? "miss"
        : Math.abs(delta) <= PERFECT_WINDOW + EPS
          ? "perfect"
          : "good";
    this.lockedUntil = note.time + GOOD_WINDOW;
    return this.resolve(note, judgment, delta);
  }

  private resolve(note: Note, judgment: Judgment, delta: number): Hit {
    this.judged.set(note.id, judgment);
    this.index++;
    const crystal = judgment === "perfect" && note.crystal;
    if (judgment === "miss") {
      this.combo = 0;
      this.energy = Math.max(0, this.energy - 20);
      this.misses++;
    } else {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.energy = Math.min(100, this.energy + 2);
      this.score += (judgment === "perfect" ? 100 : 60) * this.multiplier;
      if (judgment === "perfect") this.perfect++;
      else this.good++;
      if (crystal) {
        this.crystals++;
        this.score += 25;
      }
    }
    return { note, judgment, delta, crystal };
  }
}
