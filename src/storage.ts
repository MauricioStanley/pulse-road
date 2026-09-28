import { CHART_VERSION } from "./core/chart";
import { getLevel, levels, type Difficulty } from "./core/levels";
import { getTheme, type ThemeId } from "./themes";
import { getSkin, isUnlocked, type SkinId } from "./skins";
export interface Settings {
  sound: boolean;
  vibration: boolean;
  reduced: boolean;
  offset: number;
  tutorial: boolean;
  theme: ThemeId;
  difficulty: Difficulty;
  skin: SkinId;
}
const defaultSettings: Settings = {
  sound: true,
  vibration: false,
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  offset: 0,
  tutorial: false,
  theme: "mint",
  difficulty: "titi",
  skin: "classic",
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
  settings.skin = getSkin(saved.skin).id;
  for (const key of ["sound", "vibration", "reduced", "tutorial"] as const)
    if (typeof saved[key] === "boolean") settings[key] = saved[key];
  if (Number.isFinite(saved.offset))
    settings.offset = Math.max(-200, Math.min(200, saved.offset));
}
const finiteScore = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
const bounded = (value: unknown, max: number) => Math.min(max, finiteScore(value));
const perLevel = (prefix: string, max = Infinity) => Object.fromEntries(levels.map(level => [level.id, bounded(read(`${prefix}-${CHART_VERSION}-${level.id}`), max)])) as Record<Difficulty, number>;
const records = perLevel("pulse-record");
const attempts = perLevel("pulse-attempts");
// Added later under their own keys: older records keep their meaning.
const bestProgress = perLevel("pulse-best", 100);
const bestStars = perLevel("pulse-stars", 3);
let crystals = finiteScore(read("pulse-crystals-v1"));
export const getRecord = (id: Difficulty = settings.difficulty) => records[id];
export const getAttempts = (id: Difficulty = settings.difficulty) => attempts[id];
export const getBestProgress = (id: Difficulty = settings.difficulty) => bestProgress[id];
export const getStars = (id: Difficulty = settings.difficulty) => bestStars[id];
export const getCrystals = () => crystals;
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
function saveBest(store: Record<Difficulty, number>, prefix: string, value: number, max: number, id: Difficulty) {
  if (!Number.isFinite(value) || Math.min(max, Math.floor(value)) <= store[id]) return false;
  store[id] = Math.min(max, Math.floor(value));
  write(`${prefix}-${CHART_VERSION}-${id}`, store[id]);
  return true;
}
export const saveProgress = (percent: number, id: Difficulty = settings.difficulty) => saveBest(bestProgress, "pulse-best", percent, 100, id);
export const saveStars = (stars: number, id: Difficulty = settings.difficulty) => saveBest(bestStars, "pulse-stars", stars, 3, id);
/** Adds to the lifetime balance and returns it. Crystals are never spent. */
export function addCrystals(count: number) {
  if (!Number.isFinite(count) || count <= 0) return crystals;
  crystals += Math.floor(count);
  write("pulse-crystals-v1", crystals);
  return crystals;
}
/** A locked choice (for example, after clearing site data) falls back safely. */
export const activeSkin = () => {
  const skin = getSkin(settings.skin);
  return isUnlocked(skin, crystals) ? skin : getSkin("classic");
};
