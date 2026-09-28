import { CHART_VERSION } from "./core/chart";
import type { Difficulty } from "./core/levels";
import { relics, type RelicId } from "./core/relics";
import { levelFromXp, readMissions, type MissionState } from "./core/missions";
import { readGhost, type Ghost } from "./core/ghost";
import { getSkin, isUnlocked, type FeatId, type Progress } from "./skins";
import { read, write, finiteScore, settings, getCrystals } from "./storage";

// Meta-progression that is not tied to one song: level, missions, relics,
// feats and Infinito bests. One JSON document, validated on every load.
interface Best { score: number; stage: number }
interface Profile {
  xp: number;
  relics: RelicId[];
  feats: Partial<Record<FeatId, boolean>>;
  endless: Best;
  daily: Best & { day: string };
  endlessPlays: number;
  missions: MissionState;
}
const KEY = "pulse-profile-v1";
const best = (value: unknown): Best => {
  const b = value as Best;
  return { score: finiteScore(b?.score), stage: finiteScore(b?.stage) };
};
function load(): Profile {
  const raw = read(KEY) as Partial<Profile> | null;
  const known = new Set(relics.map((r) => r.id));
  return {
    xp: finiteScore(raw?.xp),
    relics: Array.isArray(raw?.relics) ? [...new Set(raw!.relics.filter((id) => known.has(id)))] : [],
    feats: {
      nightmare: raw?.feats?.nightmare === true,
      stage10: raw?.feats?.stage10 === true,
      relics: raw?.feats?.relics === true,
    },
    endless: best(raw?.endless),
    daily: { ...best(raw?.daily), day: typeof raw?.daily?.day === "string" ? raw.daily.day : "" },
    endlessPlays: finiteScore(raw?.endlessPlays),
    missions: readMissions(raw?.missions),
  };
}
const profile = load();
const save = () => write(KEY, profile);

export const getXp = () => profile.xp;
export const playerLevel = () => levelFromXp(profile.xp);
/** Adds experience; returns the levels crossed (for rewards). */
export function addXp(amount: number) {
  const before = playerLevel().level;
  if (Number.isFinite(amount) && amount > 0) profile.xp += Math.floor(amount);
  save();
  const after = playerLevel().level;
  return Array.from({ length: after - before }, (_, i) => before + 1 + i);
}
export const foundRelics = () => profile.relics as readonly RelicId[];
export const hasRelic = (id: string) => profile.relics.includes(id as RelicId);
/** Saves immediately so a relic is kept even if the run is abandoned. */
export function recordRelic(id: RelicId) {
  if (hasRelic(id)) return false;
  profile.relics.push(id);
  if (profile.relics.length === relics.length) profile.feats.relics = true;
  save();
  return true;
}
export const hasFeat = (feat: FeatId) => !!profile.feats[feat];
export function grantFeat(feat: FeatId) {
  if (profile.feats[feat]) return false;
  profile.feats[feat] = true;
  save();
  return true;
}
export const getMissions = () => profile.missions;
export function setMissions(state: MissionState) {
  profile.missions = state;
  save();
}
export const endlessBest = () => profile.endless;
export const endlessPlays = () => profile.endlessPlays;
export function startEndless() {
  profile.endlessPlays++;
  save();
}
/** Returns which parts improved. */
export function saveEndless(score: number, stage: number) {
  const improved = { score: score > profile.endless.score, stage: stage > profile.endless.stage };
  profile.endless = { score: Math.max(score, profile.endless.score), stage: Math.max(stage, profile.endless.stage) };
  save();
  return improved;
}
export const dailyBest = (day: string): Best => (profile.daily.day === day ? profile.daily : { score: 0, stage: 0 });
export function saveDaily(day: string, score: number, stage: number) {
  const current = dailyBest(day);
  const improved = { score: score > current.score, stage: stage > current.stage };
  profile.daily = { day, score: Math.max(score, current.score), stage: Math.max(stage, current.stage) };
  save();
  return improved;
}
const ghostKey = (id: Difficulty) => `pulse-ghost-${CHART_VERSION}-${id}`;
export const getGhost = (id: Difficulty): Ghost | null => readGhost(read(ghostKey(id)));
export const saveGhost = (id: Difficulty, ghost: Ghost) => write(ghostKey(id), ghost);

export const progressSnapshot = (): Progress => ({
  crystals: getCrystals(),
  level: playerLevel().level,
  feats: { ...profile.feats },
});
/** The equipped orb, or Pulso if it is not (or no longer) unlocked. */
export function activeSkin() {
  const skin = getSkin(settings.skin);
  return isUnlocked(skin, progressSnapshot()) ? skin : getSkin("classic");
}
