import { CHART_VERSION } from "./core/chart";
import { getLevel, levels, type Difficulty } from "./core/levels";
import { getTheme, type ThemeId } from "./themes";
export interface Settings {
  sound: boolean;
  vibration: boolean;
  reduced: boolean;
  offset: number;
  tutorial: boolean;
  theme: ThemeId;
  difficulty: Difficulty;
}
const defaultSettings: Settings = {
  sound: true,
  vibration: false,
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  offset: 0,
  tutorial: false,
  theme: "mint",
  difficulty: "titi",
};
export let storageAvailable = true;
function read(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    storageAvailable = false;
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    storageAvailable = false;
  }
}
const saved = read("pulse-settings-v1");
export const settings: Settings = { ...defaultSettings };
if (saved && typeof saved === "object") {
  settings.difficulty = getLevel(saved.difficulty).id;
  settings.theme = getTheme(saved.theme).id;
  for (const key of ["sound", "vibration", "reduced", "tutorial"] as const)
    if (typeof saved[key] === "boolean") settings[key] = saved[key];
  if (Number.isFinite(saved.offset))
    settings.offset = Math.max(-200, Math.min(200, saved.offset));
}
const finiteScore = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
const records = Object.fromEntries(levels.map(level => [level.id, finiteScore(read(`pulse-record-${CHART_VERSION}-${level.id}`))])) as Record<Difficulty, number>;
const attempts = Object.fromEntries(levels.map(level => [level.id, finiteScore(read(`pulse-attempts-${CHART_VERSION}-${level.id}`))])) as Record<Difficulty, number>;
export const getRecord = (id: Difficulty = settings.difficulty) => records[id];
export const getAttempts = (id: Difficulty = settings.difficulty) => attempts[id];
export function startAttempt(id: Difficulty) {
  attempts[id]++;
  write(`pulse-attempts-${CHART_VERSION}-${id}`, attempts[id]);
}
export const saveSettings = () => write("pulse-settings-v1", settings);
export function saveRecord(score: number, id: Difficulty = settings.difficulty) {
  if (!Number.isFinite(score) || score <= records[id]) return false;
  records[id] = Math.floor(score);
  write(`pulse-record-${CHART_VERSION}-${id}`, records[id]);
  return true;
}
