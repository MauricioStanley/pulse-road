import { getLevel, type Level } from "./levels";
export type Lane = 0 | 1 | 2;
export interface Note { id: number; time: number; lane: Lane; crystal: boolean; obstacles: Lane[] }
export const DURATION = 80;
export const CHART_VERSION = "landing-v2";
export const TRACK_NAME = "First Light";
export const BPM = 120;
const gentle: Lane[][] = [[1, 0, 1, 2, 1, 0, 1, 2], [0, 1, 2, 1, 1, 0, 1, 2], [1, 1, 0, 1, 2, 2, 1, 0], [0, 1, 0, 1, 2, 1, 2, 1], [1, 0, 1, 2, 1, 2, 1, 0]];
const nightmare: Lane[][] = [[1, 0, 2, 1, 2, 0, 1, 2], [2, 0, 1, 0, 2, 1, 2, 0], [0, 2, 0, 1, 2, 1, 0, 2], [1, 2, 0, 2, 1, 0, 2, 0], [2, 1, 0, 2, 0, 1, 2, 1]];
// Beat-aligned and deterministic: no simultaneous targets or random traps.
export function createChart(level: Level): Note[] {
  const result: Note[] = [];
  const halfBeat = 30 / level.bpm;
  for (let step = 8; step * halfBeat < level.duration - 2; step++) {
    const time = step * halfBeat;
    const section = Math.min(4, Math.floor(time / 16));
    const local = step % 16;
    let include: boolean;
    if (level.id === "titi") include = step % (section < 3 ? 4 : 2) === 0;
    else if (level.id === "medio") include = section === 0 || section === 2 ? step % 4 === 0 : section === 1 ? step % 4 === 0 || local >= 8 && step % 2 === 0 : section === 3 ? step % 2 === 0 && local !== 14 : step % 2 === 0;
    else if (level.id === "dificil") include = section === 0 ? step % 2 === 0 : section === 2 ? step % 2 === 0 || local === 5 : local < 12 || step % 2 === 0;
    else include = section === 0 ? local < 10 || step % 2 === 0 : section === 2 ? local < 8 || step % 2 === 0 : local !== 15;
    if (!include) continue;
    const id = result.length;
    const motifs = level.id === "servellon" || level.id === "dificil" ? nightmare : gentle;
    const raw = motifs[section][id % 8];
    // Mirror alternating four-bar phrases in nightmare; learnable, never random.
    const lane = (level.id === "servellon" && Math.floor(step / 32) % 2 ? 2 - raw : raw) as Lane;
    result.push({ id, time, lane, crystal: id > 3 && id % 8 === 5, obstacles: section > 0 && id % (level.id === "titi" ? 7 : 3) === 0 ? ([0, 1, 2] as Lane[]).filter(x => x !== lane) : [] });
  }
  return result;
}
export const chart = createChart(getLevel("medio"));
export const phases = ["ENCUENTRA EL PULSO", "ENTRA EN EL RITMO", "RESPIRA Y SIGUE", "DEJA TU ESTELA", "HASTA EL FINAL"];
