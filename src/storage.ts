import { CHART_VERSION } from "./core/chart";
import { getTheme, type ThemeId } from "./themes";
export interface Settings {
  sound: boolean;
  vibration: boolean;
  reduced: boolean;
  offset: number;
  tutorial: boolean;
  theme: ThemeId;
}
const defaultSettings: Settings = {
  sound: true,
  vibration: false,
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  offset: 0,
  tutorial: false,
  theme: "mint",
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
  settings.theme = getTheme(saved.theme).id;
  for (const key of ["sound", "vibration", "reduced", "tutorial"] as const)
    if (typeof saved[key] === "boolean") settings[key] = saved[key];
  if (Number.isFinite(saved.offset))
    settings.offset = Math.max(-200, Math.min(200, saved.offset));
}
const rawRecord = read(`pulse-record-${CHART_VERSION}`);
let record =
  typeof rawRecord === "number" && Number.isFinite(rawRecord) && rawRecord >= 0
    ? rawRecord
    : 0;
export const getRecord = () => record;
export const saveSettings = () => write("pulse-settings-v1", settings);
export function saveRecord(score: number) {
  if (score <= record) return false;
  record = score;
  write(`pulse-record-${CHART_VERSION}`, score);
  return true;
}
