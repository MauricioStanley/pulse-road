import type { EndlessPerks } from "./core/endless";
import { basePerks } from "./core/endless";
// Collectible orbs. Crystals earned in every run are a lifetime balance that is
// never spent: reaching a cost unlocks that orb for good. Some orbs are earned
// by player level or by a feat instead. Perks only apply in Infinito, so song
// records stay comparable whatever orb you use.
export type SkinId =
  | "classic" | "ember" | "neon" | "frost" | "gold" | "ocean" | "galaxy"
  | "lava" | "eclipse" | "prism" | "chrome" | "nightmare" | "infinity" | "legend";
export type FeatId = "nightmare" | "stage10" | "relics";
export type Unlock =
  | { kind: "crystals"; cost: number }
  | { kind: "level"; level: number }
  | { kind: "feat"; feat: FeatId; text: string };
export interface OrbPaint {
  light: string;
  mid: string;
  edge: string;
  halo: string;
}
export type Pattern =
  | "flame" | "facets" | "sparkle" | "stars" | "rim" | "prism"
  | "neon" | "waves" | "cracks" | "chrome" | "eye" | "infinity" | "runes";
export type Motes = "spark" | "ember" | "snow" | "star" | "bubble";
export interface Skin {
  id: SkinId;
  name: string;
  unlock: Unlock;
  description: string;
  /** Infinito only. */
  perk: string;
  mods: Partial<EndlessPerks>;
  /** Omitted for the classic orb, which follows the selected game color. */
  orb?: OrbPaint;
  pattern?: Pattern;
  /** Trail and particle color. Omitted: game color, or rainbow for Prisma. */
  trail?: string;
  motes: Motes;
  /** CSS background used by menus. */
  preview: string;
}
const crystals = (cost: number): Unlock => ({ kind: "crystals", cost });
export const skins: readonly Skin[] = [
  {
    id: "classic", name: "Pulso", unlock: crystals(0), motes: "spark",
    description: "Toma el color del juego que elijas.",
    perk: "Equilibrada: sin ventajas ni desventajas.", mods: {},
    preview: "radial-gradient(circle at 36% 32%, #fff 0 9%, var(--mint) 58%, #0b2a2a 100%)",
  },
  {
    id: "ember", name: "Brasa", unlock: crystals(8), motes: "ember",
    description: "Una chispa que no se apaga.",
    perk: "La Fiebre llega con 20 de combo.", mods: { feverCombo: 20 },
    orb: { light: "#fff6c8", mid: "#ffab40", edge: "#c2361b", halo: "#ff7b2e" }, pattern: "flame", trail: "#ff8f3a",
    preview: "radial-gradient(circle at 36% 32%, #fff6c8 0 10%, #ffab40 48%, #c2361b 100%)",
  },
  {
    id: "neon", name: "Neón", unlock: crystals(15), motes: "spark",
    description: "Brilla como un letrero a medianoche.",
    perk: "Recuperas un 50 % más de energía.", mods: { recovery: 1.5 },
    orb: { light: "#ffd6fb", mid: "#b43dff", edge: "#2a0b3d", halo: "#ff4fd8" }, pattern: "neon", trail: "#ff6be3",
    preview: "radial-gradient(circle at 50% 50%, #2a0b3d 0 40%, #7ef6ff 44%, #2a0b3d 50%, #ff4fd8 64%, #ff4fd800 76%)",
  },
  {
    id: "frost", name: "Escarcha", unlock: crystals(25), motes: "snow",
    description: "Cristal tallado, frío y preciso.",
    perk: "Empiezas con un escudo.", mods: { startShields: 1 },
    orb: { light: "#ffffff", mid: "#b8efff", edge: "#3478c9", halo: "#86d9ff" }, pattern: "facets", trail: "#9fe6ff",
    preview: "linear-gradient(135deg, #ffffff66 0 30%, transparent 30% 55%, #ffffff44 55% 62%, transparent 62%), radial-gradient(circle at 36% 32%, #fff 0 10%, #b8efff 50%, #3478c9 100%)",
  },
  {
    id: "gold", name: "Oro", unlock: crystals(50), motes: "star",
    description: "Para quien ya no falla.",
    perk: "Cada cristal vale doble.", mods: { crystalMultiplier: 2 },
    orb: { light: "#fffbe6", mid: "#ffd35c", edge: "#a86b00", halo: "#ffd35c" }, pattern: "sparkle", trail: "#ffe08a",
    preview: "radial-gradient(circle at 36% 32%, #fffbe6 0 10%, #ffd35c 50%, #a86b00 100%)",
  },
  {
    id: "ocean", name: "Océano", unlock: crystals(70), motes: "bubble",
    description: "Profunda y tranquila, como una marea.",
    perk: "La velocidad sube más despacio.", mods: { rateStep: 0.035 },
    orb: { light: "#d9fbff", mid: "#2fa8d8", edge: "#0b3a6b", halo: "#4fd0ff" }, pattern: "waves", trail: "#6fdcff",
    preview: "repeating-radial-gradient(circle at 50% 120%, #ffffff22 0 3px, transparent 3px 9px), radial-gradient(circle at 36% 32%, #d9fbff 0 10%, #2fa8d8 52%, #0b3a6b 100%)",
  },
  {
    id: "galaxy", name: "Galaxia", unlock: crystals(90), motes: "star",
    description: "Lleva un universo en cada salto.",
    perk: "Los potenciadores duran un 50 % más.", mods: { powerDuration: 1.5 },
    orb: { light: "#f1dcff", mid: "#8e5cff", edge: "#1f0c55", halo: "#b690ff" }, pattern: "stars", trail: "#b995ff",
    preview: "radial-gradient(circle at 70% 60%, #fff 0 2%, transparent 3%), radial-gradient(circle at 30% 70%, #fff 0 2%, transparent 3%), radial-gradient(circle at 36% 32%, #f1dcff 0 8%, #8e5cff 50%, #1f0c55 100%)",
  },
  {
    id: "lava", name: "Lava", unlock: crystals(120), motes: "ember",
    description: "Roca por fuera, fuego por dentro.",
    perk: "Recibes un 25 % menos de daño.", mods: { damage: 0.75 },
    orb: { light: "#6b5550", mid: "#2b1d1b", edge: "#120b0a", halo: "#ff6a1f" }, pattern: "cracks", trail: "#ff7a2a",
    preview: "linear-gradient(120deg, transparent 44%, #ff8a2a 46% 49%, transparent 51%), linear-gradient(40deg, transparent 58%, #ffb347 60% 62%, transparent 64%), radial-gradient(circle at 36% 32%, #6b5550 0 10%, #2b1d1b 55%, #120b0a 100%)",
  },
  {
    id: "eclipse", name: "Eclipse", unlock: crystals(150), motes: "ember",
    description: "Oscuridad total con un borde de fuego.",
    perk: "Sobrevives una vez a la caída.", mods: { lastStand: true },
    orb: { light: "#454b66", mid: "#141829", edge: "#040509", halo: "#ffe3a3" }, pattern: "rim", trail: "#ffe3a3",
    preview: "radial-gradient(circle at 50% 50%, #141829 0 62%, #ffe3a3 66%, #ffe3a300 76%)",
  },
  {
    id: "prism", name: "Prisma", unlock: crystals(240), motes: "spark",
    description: "Todos los colores a la vez.",
    perk: "Aparecen el doble de potenciadores.", mods: { powerChance: 2 },
    orb: { light: "#ffffff", mid: "#ffffff", edge: "#9aa4ff", halo: "#ffffff" }, pattern: "prism",
    preview: "radial-gradient(circle at 36% 32%, #fff 0 12%, transparent 40%), conic-gradient(#ff8fa3, #ffd37a, #9dff9a, #7ae6ff, #b69cff, #ff8fa3)",
  },
  {
    id: "chrome", name: "Cromo", unlock: { kind: "level", level: 10 }, motes: "spark",
    description: "Pulida hasta reflejar el camino.",
    perk: "Los cristales también cuentan con un Bien.", mods: { crystalOnGood: true },
    orb: { light: "#ffffff", mid: "#a9b4bf", edge: "#39424c", halo: "#dfe8f0" }, pattern: "chrome", trail: "#dfe8f0",
    preview: "linear-gradient(180deg, #fff 0 30%, #7d8894 38%, #e8eef3 52%, #39424c 100%)",
  },
  {
    id: "nightmare", name: "Pesadilla", unlock: { kind: "feat", feat: "nightmare", text: "Completa Pesadilla" }, motes: "ember",
    description: "Te mira desde el fondo del umbral.",
    perk: "Puntos ×1,25, pero el daño sube un 25 %.", mods: { scoreMultiplier: 1.25, damage: 1.25 },
    orb: { light: "#ff6b6b", mid: "#7a0d1c", edge: "#1a0306", halo: "#ff2e4d" }, pattern: "eye", trail: "#ff4d62",
    preview: "radial-gradient(ellipse 12% 34% at 50% 50%, #0a0103 0 90%, transparent 100%), radial-gradient(circle at 36% 32%, #ff6b6b 0 8%, #7a0d1c 55%, #1a0306 100%)",
  },
  {
    id: "infinity", name: "Infinito", unlock: { kind: "feat", feat: "stage10", text: "Llega a la etapa 10 en Infinito" }, motes: "star",
    description: "No tiene principio ni final.",
    perk: "Empiezas con puntos dobles activos.", mods: { startDouble: true },
    orb: { light: "#ffffff", mid: "#bff8ff", edge: "#2e6fa8", halo: "#9ff0ff" }, pattern: "infinity", trail: "#bff8ff",
    preview: "radial-gradient(circle at 36% 32%, #fff 0 12%, #bff8ff 55%, #2e6fa8 100%)",
  },
  {
    id: "legend", name: "Leyenda", unlock: { kind: "feat", feat: "relics", text: "Encuentra todas las reliquias" }, motes: "star",
    description: "Hecha con el eco de todas las reliquias.",
    perk: "Un escudo nuevo en cada etapa.", mods: { stageShield: true },
    orb: { light: "#fffdf0", mid: "#f3d27a", edge: "#7a5314", halo: "#ffe9a8" }, pattern: "runes", trail: "#ffe9a8",
    preview: "repeating-conic-gradient(from 0deg, #7a531455 0 6deg, transparent 6deg 30deg), radial-gradient(circle at 36% 32%, #fffdf0 0 10%, #f3d27a 55%, #7a5314 100%)",
  },
];
export function getSkin(value: unknown): Skin {
  return skins.find((skin) => skin.id === value) ?? skins[0];
}
export interface Progress {
  crystals: number;
  level: number;
  feats: Partial<Record<FeatId, boolean>>;
}
export function isUnlocked(skin: Skin, progress: Progress) {
  const u = skin.unlock;
  if (u.kind === "crystals") return progress.crystals >= u.cost;
  if (u.kind === "level") return progress.level >= u.level;
  return !!progress.feats[u.feat];
}
/** Short Spanish label for how a locked orb is earned. */
export function unlockLabel(skin: Skin) {
  const u = skin.unlock;
  return u.kind === "crystals" ? `${u.cost} cristales` : u.kind === "level" ? `Nivel ${u.level}` : u.text;
}
export const crystalSkins = () => skins.filter((skin) => skin.unlock.kind === "crystals");
/** The next crystal orb still locked at this balance, if any. */
export const nextSkin = (balance: number) =>
  crystalSkins().find((skin) => (skin.unlock as { cost: number }).cost > balance);
/** Orbs that a progress change unlocked, in catalogue order. */
export const unlockedBetween = (before: Progress, after: Progress) =>
  skins.filter((skin) => !isUnlocked(skin, before) && isUnlocked(skin, after));
export const perksFor = (skin: Skin): EndlessPerks => ({ ...basePerks, ...skin.mods });
