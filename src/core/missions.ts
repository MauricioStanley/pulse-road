import type { Difficulty } from "./levels";

/** Everything one finished attempt contributes to missions and experience. */
export interface RunStats {
  kind: "song" | "endless" | "daily";
  level?: Difficulty;
  completed: boolean;
  stars: number;
  score: number;
  perfects: number;
  goods: number;
  maxCombo: number;
  crystals: number;
  fevers: number;
  powers: number;
  /** Relics found for the first time in this attempt. */
  relics: number;
  /** Infinito stage reached, 1-based. 0 for songs. */
  stage: number;
}
type Stat = (s: RunStats) => number;
export interface Mission {
  id: string;
  text: string;
  target: number;
  reward: number;
  /** total: adds up across attempts. best: must happen in one attempt. */
  mode: "total" | "best";
  stat: Stat;
}
const plays: Stat = () => 1;
const perfects: Stat = (s) => s.perfects;
const combo: Stat = (s) => s.maxCombo;
const crystals: Stat = (s) => s.crystals;
const fevers: Stat = (s) => s.fevers;
const powers: Stat = (s) => s.powers;
const relicsFound: Stat = (s) => s.relics;
const score: Stat = (s) => s.score;
const stage: Stat = (s) => (s.kind === "song" ? 0 : s.stage);
const daily: Stat = (s) => (s.kind === "daily" ? 1 : 0);
const cleared = (level: Difficulty): Stat => (s) => (s.kind === "song" && s.level === level && s.completed ? 1 : 0);
const threeStars = (level: Difficulty): Stat => (s) => (s.kind === "song" && s.level === level && s.stars === 3 ? 1 : 0);
const m = (id: string, text: string, target: number, reward: number, mode: Mission["mode"], stat: Stat): Mission => ({ id, text, target, reward, mode, stat });
// A fixed ladder: easy wins first, then goals that pull toward every mode.
export const missionLadder: readonly Mission[] = [
  m("play-2", "Juega 2 partidas", 2, 10, "total", plays),
  m("perfect-30", "Consigue 30 Perfectos", 30, 10, "total", perfects),
  m("combo-20", "Llega a un combo de 20", 20, 12, "best", combo),
  m("crystal-8", "Recoge 8 cristales", 8, 10, "total", crystals),
  m("fever-1", "Entra en Fiebre", 1, 15, "total", fevers),
  m("clear-titi", "Completa Fácil", 1, 15, "best", cleared("titi")),
  m("stage-3", "Llega a la etapa 3 en Infinito", 3, 15, "best", stage),
  m("power-3", "Recoge 3 potenciadores", 3, 15, "total", powers),
  m("score-15k", "Haz 15.000 puntos en una partida", 15000, 15, "best", score),
  m("daily-1", "Juega el reto del día", 1, 15, "total", daily),
  m("clear-medio", "Completa Medio", 1, 20, "best", cleared("medio")),
  m("perfect-120", "Consigue 120 Perfectos", 120, 20, "total", perfects),
  m("relic-1", "Encuentra una reliquia", 1, 20, "total", relicsFound),
  m("combo-50", "Llega a un combo de 50", 50, 25, "best", combo),
  m("stars-titi", "Consigue 3 estrellas en Fácil", 1, 20, "best", threeStars("titi")),
  m("stage-6", "Llega a la etapa 6 en Infinito", 6, 25, "best", stage),
  m("fever-5", "Entra en Fiebre 5 veces", 5, 20, "total", fevers),
  m("clear-dificil", "Completa Difícil", 1, 30, "best", cleared("dificil")),
  m("crystal-60", "Recoge 60 cristales", 60, 25, "total", crystals),
  m("score-40k", "Haz 40.000 puntos en una partida", 40000, 30, "best", score),
  m("power-12", "Recoge 12 potenciadores", 12, 25, "total", powers),
  m("relic-4", "Encuentra 4 reliquias", 4, 30, "total", relicsFound),
  m("stars-medio", "Consigue 3 estrellas en Medio", 1, 30, "best", threeStars("medio")),
  m("combo-100", "Llega a un combo de 100", 100, 35, "best", combo),
  m("stage-10", "Llega a la etapa 10 en Infinito", 10, 40, "best", stage),
  m("clear-servellon", "Completa Pesadilla", 1, 50, "best", cleared("servellon")),
  m("perfect-500", "Consigue 500 Perfectos", 500, 40, "total", perfects),
  m("stars-dificil", "Consigue 3 estrellas en Difícil", 1, 45, "best", threeStars("dificil")),
];
/** After the ladder, missions keep coming with growing targets. */
export function missionAt(index: number): Mission {
  if (index < missionLadder.length) return missionLadder[index];
  const round = index - missionLadder.length;
  const tier = Math.floor(round / 3) + 1;
  const kind = round % 3;
  if (kind === 0) return m(`endless-perfect-${round}`, `Consigue ${300 * tier} Perfectos`, 300 * tier, 30 + 5 * tier, "total", perfects);
  if (kind === 1) return m(`endless-stage-${round}`, `Llega a la etapa ${8 + 2 * tier} en Infinito`, 8 + 2 * tier, 35 + 5 * tier, "best", stage);
  return m(`endless-crystal-${round}`, `Recoge ${80 * tier} cristales`, 80 * tier, 30 + 5 * tier, "total", crystals);
}
export const ACTIVE_MISSIONS = 3;
export interface MissionState {
  /** Index of the next mission to deal. */
  next: number;
  active: { index: number; progress: number }[];
}
export function freshMissions(): MissionState {
  return { next: ACTIVE_MISSIONS, active: [0, 1, 2].map((index) => ({ index, progress: 0 })) };
}
/** Validates stored state; anything odd restarts the ladder safely. */
export function readMissions(value: unknown): MissionState {
  const state = value as MissionState;
  if (!state || typeof state !== "object" || !Array.isArray(state.active) || !(state.next >= ACTIVE_MISSIONS) || state.active.length !== ACTIVE_MISSIONS)
    return freshMissions();
  const active = state.active.map((slot) => ({
    index: Number.isInteger(slot?.index) && slot.index >= 0 ? slot.index : 0,
    progress: Number.isFinite(slot?.progress) && slot.progress >= 0 ? slot.progress : 0,
  }));
  return { next: Math.floor(state.next), active };
}
/** Applies one attempt. Completed missions are replaced by the next ones. */
export function applyRun(state: MissionState, stats: RunStats) {
  const completed: Mission[] = [];
  const active = state.active.map((slot) => {
    const mission = missionAt(slot.index);
    const value = mission.stat(stats);
    const progress = mission.mode === "total" ? slot.progress + value : Math.max(slot.progress, value);
    return { index: slot.index, progress };
  });
  let next = state.next;
  for (let i = 0; i < active.length; i++) {
    const mission = missionAt(active[i].index);
    if (active[i].progress >= mission.target) {
      completed.push(mission);
      active[i] = { index: next++, progress: 0 };
    }
  }
  return { state: { next, active }, completed };
}

/** Experience from one attempt: every run moves the bar, even a fall. */
export function xpForRun(s: RunStats) {
  // Square root: inflated Infinito scores cannot skip whole levels.
  return 10 + s.perfects + Math.floor(s.goods / 2) + Math.floor(Math.sqrt(Math.max(0, s.score)) / 2) + (s.completed ? 40 : 0) + s.stage * 15 + s.relics * 30;
}
export const xpToNext = (level: number) => 150 + 100 * (level - 1);
export function levelFromXp(xp: number) {
  let level = 1, rest = Math.max(0, Math.floor(xp) || 0);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level) };
}
export const levelReward = (level: number) => 5 + 2 * level;
