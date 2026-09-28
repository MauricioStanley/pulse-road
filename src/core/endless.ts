import type { Lane, Note, PowerId } from "./chart";
import { getLevel, type Level } from "./levels";
import { Run, type Hit } from "./rules";
import { stageRelic } from "./relics";

/** Small, fast, seedable PRNG (mulberry32). Same seed, same road. */
export function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Local calendar day, e.g. "2026-09-28". */
export function dayKey(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** Everyone playing the daily challenge on the same day gets the same road. */
export function daySeed(key = dayKey()) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return hash >>> 0;
}

// Infinito loops First Light between its build and its finale: 16 s → 78 s is
// exactly 31 bars, so the beat grid never slips across the loop.
export const ENDLESS_TRACK = {
  name: "First Light",
  audio: "first-light.mp3",
  bpm: 120,
  root: 74,
  minor: true,
  loopStart: 16,
  loopEnd: 78,
};
const HALF_BEAT = 30 / ENDLESS_TRACK.bpm;
/** A stage is 8 bars (16 s of song time). Every stage speeds the song up. */
export const STAGE_LENGTH = 16;
const SLOTS_PER_BAR = 8;
const BARS_PER_STAGE = STAGE_LENGTH / (SLOTS_PER_BAR * HALF_BEAT);
export const stageOf = (time: number) => Math.max(0, Math.floor(time / STAGE_LENGTH));
export const MAX_RATE = 1.6;
export const stageRate = (stage: number, step = 0.05) => Math.min(MAX_RATE, 1 + step * stage);
/** Song-time seconds a platform takes to arrive; shrinks smoothly (and real time shrinks with the rate too). */
export const travelAt = (time: number) => Math.max(1.35, 2 - (0.06 * Math.max(0, time)) / STAGE_LENGTH);
/** Where the loop is inside the audio file: used for song sections. */
export function musicOffset(time: number) {
  const { loopStart, loopEnd } = ENDLESS_TRACK;
  return time < loopEnd ? time : loopStart + ((time - loopStart) % (loopEnd - loopStart));
}

export interface EndlessPerks {
  feverCombo: number;
  startShields: number;
  crystalMultiplier: number;
  powerDuration: number;
  lastStand: boolean;
  powerChance: number;
  recovery: number;
  damage: number;
  rateStep: number;
  crystalOnGood: boolean;
  stageShield: boolean;
  scoreMultiplier: number;
  startDouble: boolean;
}
export const basePerks: EndlessPerks = {
  feverCombo: 30,
  startShields: 0,
  crystalMultiplier: 1,
  powerDuration: 1,
  lastStand: false,
  powerChance: 1,
  recovery: 1,
  damage: 1,
  rateStep: 0.05,
  crystalOnGood: false,
  stageShield: false,
  scoreMultiplier: 1,
  startDouble: false,
};
export const POWER_SECONDS = 8;
export const SLOW_FACTOR = 0.8;

// Rhythms per bar, as eighth-note slots. Later stages unlock busier bars.
const rhythms: number[][][] = [
  [[0, 4], [0, 2, 4, 6]],
  [[0, 2, 4, 6], [0, 2, 4, 6], [0, 2, 3, 4, 6]],
  [[0, 2, 4, 6], [0, 2, 3, 4, 6], [0, 2, 4, 5, 6, 7]],
  [[0, 2, 3, 4, 6], [0, 2, 4, 5, 6, 7], [0, 1, 2, 4, 5, 6]],
  [[0, 2, 4, 5, 6, 7], [0, 1, 2, 4, 5, 6], [0, 1, 2, 3, 4, 5, 6, 7], [0, 2, 3, 4, 6]],
];
const powerKinds: PowerId[] = ["shield", "heart", "double", "slow"];

/** An endless, seeded road generated a few bars ahead of the player. */
export class EndlessChart {
  readonly notes: Note[] = [];
  private rng: () => number;
  private bar = 0;
  private lane: Lane = 1;
  private sincePower = 0;
  /** Absolute eighth-note slot of the last platform, across bar lines. */
  private lastSlot = -Infinity;
  constructor(readonly seed: number, readonly perks: EndlessPerks = basePerks) {
    this.rng = createRng(seed);
  }
  /** Generate whole bars until the road reaches `time` (song seconds). */
  ensure(time: number) {
    while (this.bar * SLOTS_PER_BAR * HALF_BEAT <= time) this.addBar();
    return this.notes;
  }
  private pick<T>(items: readonly T[]) {
    return items[Math.min(items.length - 1, Math.floor(this.rng() * items.length))];
  }
  private nextLane(stage: number, gap: number): Lane {
    const r = this.rng();
    // Holds and neighbour steps early; wide jumps need room until stage 5.
    const hold = stage < 2 ? 0.28 : 0.18;
    if (r < hold) return this.lane;
    const wideAllowed = stage >= 5 || gap >= 2;
    if (wideAllowed && this.lane !== 1 && r > 0.82 - Math.min(0.2, stage * 0.02)) {
      return (2 - this.lane) as Lane;
    }
    if (this.lane === 1) return this.rng() < 0.5 ? 0 : 2;
    return 1;
  }
  private addBar() {
    const bar = this.bar++;
    const start = bar * SLOTS_PER_BAR;
    const stage = Math.floor(bar / BARS_PER_STAGE);
    if (bar < 2) return; // Two bars to settle in, like the songs.
    // Every fourth bar breathes: half the density.
    const pool = rhythms[Math.min(rhythms.length - 1, stage)];
    let slots = this.pick(pool);
    if (bar % 4 === 3) slots = slots.filter((slot) => slot % 2 === 0);
    const relic = bar === stage * BARS_PER_STAGE + 2 ? stageRelic(stage) : undefined;
    slots.forEach((slot, i) => {
      const id = this.notes.length;
      const lane = this.nextLane(stage, start + slot - this.lastSlot);
      this.lastSlot = start + slot;
      this.lane = lane;
      this.sincePower++;
      const note: Note = {
        id,
        time: (start + slot) * HALF_BEAT,
        lane,
        crystal: id > 3 && id % 8 === 5,
        obstacles: stage > 0 && this.rng() < Math.min(0.4, 0.12 + stage * 0.03) ? ([0, 1, 2] as Lane[]).filter((x) => x !== lane) : [],
      };
      if (relic && i === 0) note.relic = relic;
      else if (!note.crystal && stage >= 1 && this.sincePower > 22 && this.rng() < 0.05 * this.perks.powerChance) {
        this.sincePower = 0;
        note.power = this.pick(stage >= 3 ? powerKinds : powerKinds.slice(0, 3));
      }
      this.notes.push(note);
    });
  }
}

/** The Infinito ruleset: stage-scaled damage, powers and the orb's perk. */
export class EndlessRun extends Run {
  shields: number;
  lastStand: boolean;
  doubleUntil = -1;
  powers = 0;
  saves = 0;
  private stageSeen = 0;
  constructor(readonly road: EndlessChart, readonly perks: EndlessPerks = road.perks) {
    super(road.notes, endlessLevel);
    this.shields = perks.startShields;
    this.lastStand = perks.lastStand;
    if (perks.startDouble) this.doubleUntil = POWER_SECONDS * perks.powerDuration;
  }
  get fever() { return this.combo >= this.perks.feverCombo; }
  doubleActive(time: number) { return time < this.doubleUntil; }
  protected bonus(note: Note) {
    return (this.doubleActive(note.time) ? 2 : 1) * (this.fever ? 1.5 : 1) * this.perks.scoreMultiplier;
  }
  private enterStage(note: Note) {
    const stage = stageOf(note.time);
    if (stage > this.stageSeen) {
      this.stageSeen = stage;
      if (this.perks.stageShield) this.shields = Math.max(1, this.shields);
    }
    return stage;
  }
  protected onMiss(hit: Hit) {
    const stage = this.enterStage(hit.note);
    if (this.shields > 0) {
      this.shields--;
      hit.shielded = true;
      return;
    }
    this.combo = 0;
    this.misses++;
    this.energy = Math.max(0, this.energy - Math.min(34, 16 + 2 * stage) * this.perks.damage);
    if (this.energy <= 0 && this.lastStand) {
      this.lastStand = false;
      this.saves++;
      this.energy = 25;
      hit.saved = true;
    }
  }
  protected onLand(hit: Hit) {
    const stage = this.enterStage(hit.note);
    if (this.perks.crystalOnGood && hit.note.crystal) hit.crystal = true;
    const before = this.energy;
    super.onLand(hit);
    // Recovery fades with the stage; perks scale it.
    const recovery = Math.max(0.6, 2.5 - 0.2 * stage) * this.perks.recovery;
    this.energy = Math.min(100, before + recovery);
    if (hit.crystal) this.crystals += this.perks.crystalMultiplier - 1;
    const power = hit.note.power;
    if (power) {
      hit.power = power;
      this.powers++;
      if (power === "shield") this.shields++;
      else if (power === "heart") this.energy = Math.min(100, this.energy + 35);
      else if (power === "double")
        this.doubleUntil = Math.max(this.doubleUntil, hit.note.time) + POWER_SECONDS * this.perks.powerDuration;
    }
  }
}
export const endlessLevel: Level = {
  ...getLevel("medio"),
  name: "Infinito",
  subtitle: "",
  track: ENDLESS_TRACK.name,
  duration: Infinity,
  travel: 2,
  lateWindow: 0.13,
  damage: 18,
  recovery: 2,
  description: "Etapas sin final. Cada 16 segundos la canción acelera.",
};
