export type Lane = 0 | 1 | 2;
export interface Note {
  id: number;
  time: number;
  lane: Lane;
  crystal: boolean;
  obstacles: Lane[];
}
export const DURATION = 80;
export const CHART_VERSION = "first-light-v1";
export const TRACK_NAME = "First Light";
export const BPM = 120;

// Authored motifs, arranged in five eight-bar phrases at 120 BPM.
const motifs: Lane[][] = [
  [1, 0, 1, 2, 1, 0, 1, 2],
  [0, 1, 2, 1, 1, 0, 1, 2],
  [1, 1, 0, 1, 2, 2, 1, 0],
  [0, 1, 0, 1, 2, 1, 2, 1],
  [1, 0, 1, 2, 1, 2, 1, 0],
];
export const chart: Note[] = [];
for (let beat = 4; beat < 156; beat++) {
  const time = beat / 2;
  const section = Math.min(4, Math.floor(time / 16));
  const localBeat = beat % 32;
  const include =
    section === 0 || section === 2
      ? beat % 2 === 0
      : section === 1
        ? beat % 2 === 0 || localBeat % 8 >= 4
        : section === 3
          ? localBeat % 8 !== 7
          : true;
  if (!include) continue;
  const id = chart.length;
  const lane = motifs[section][id % 8];
  chart.push({
    id,
    time,
    lane,
    crystal: id > 3 && id % 8 === 5,
    obstacles:
      section > 0 && id % 3 === 0
        ? ([0, 1, 2] as Lane[]).filter((x) => x !== lane)
        : [],
  });
}

export const phases = [
  "ENCUENTRA EL PULSO",
  "ENTRA EN EL RITMO",
  "RESPIRA Y SIGUE",
  "DEJA TU ESTELA",
  "HASTA EL FINAL",
];
