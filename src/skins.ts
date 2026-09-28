// Collectible orbs. Crystals earned in every run are a lifetime balance that is
// never spent: reaching a cost unlocks that orb for good.
export type SkinId =
  | "classic"
  | "ember"
  | "frost"
  | "gold"
  | "galaxy"
  | "eclipse"
  | "prism";
export interface OrbPaint {
  light: string;
  mid: string;
  edge: string;
  halo: string;
}
export interface Skin {
  id: SkinId;
  name: string;
  cost: number;
  description: string;
  /** Omitted for the classic orb, which follows the selected game color. */
  orb?: OrbPaint;
  pattern?: "flame" | "facets" | "sparkle" | "stars" | "rim" | "prism";
  /** Trail and particle color. Omitted: game color, or rainbow for Prisma. */
  trail?: string;
  /** CSS background used by menus. */
  preview: string;
}
export const skins: readonly Skin[] = [
  {
    id: "classic",
    name: "Pulso",
    cost: 0,
    description: "Toma el color del juego que elijas.",
    preview:
      "radial-gradient(circle at 36% 32%, #fff 0 9%, var(--mint) 58%, #0b2a2a 100%)",
  },
  {
    id: "ember",
    name: "Brasa",
    cost: 8,
    description: "Una chispa que no se apaga.",
    orb: { light: "#fff6c8", mid: "#ffab40", edge: "#c2361b", halo: "#ff7b2e" },
    pattern: "flame",
    trail: "#ff8f3a",
    preview:
      "radial-gradient(circle at 36% 32%, #fff6c8 0 10%, #ffab40 48%, #c2361b 100%)",
  },
  {
    id: "frost",
    name: "Escarcha",
    cost: 25,
    description: "Cristal tallado, frío y preciso.",
    orb: { light: "#ffffff", mid: "#b8efff", edge: "#3478c9", halo: "#86d9ff" },
    pattern: "facets",
    trail: "#9fe6ff",
    preview:
      "linear-gradient(135deg, #ffffff66 0 30%, transparent 30% 55%, #ffffff44 55% 62%, transparent 62%), radial-gradient(circle at 36% 32%, #fff 0 10%, #b8efff 50%, #3478c9 100%)",
  },
  {
    id: "gold",
    name: "Oro",
    cost: 50,
    description: "Para quien ya no falla.",
    orb: { light: "#fffbe6", mid: "#ffd35c", edge: "#a86b00", halo: "#ffd35c" },
    pattern: "sparkle",
    trail: "#ffe08a",
    preview:
      "radial-gradient(circle at 36% 32%, #fffbe6 0 10%, #ffd35c 50%, #a86b00 100%)",
  },
  {
    id: "galaxy",
    name: "Galaxia",
    cost: 90,
    description: "Lleva un universo en cada salto.",
    orb: { light: "#f1dcff", mid: "#8e5cff", edge: "#1f0c55", halo: "#b690ff" },
    pattern: "stars",
    trail: "#b995ff",
    preview:
      "radial-gradient(circle at 70% 60%, #fff 0 2%, transparent 3%), radial-gradient(circle at 30% 70%, #fff 0 2%, transparent 3%), radial-gradient(circle at 36% 32%, #f1dcff 0 8%, #8e5cff 50%, #1f0c55 100%)",
  },
  {
    id: "eclipse",
    name: "Eclipse",
    cost: 150,
    description: "Oscuridad total con un borde de fuego.",
    orb: { light: "#454b66", mid: "#141829", edge: "#040509", halo: "#ffe3a3" },
    pattern: "rim",
    trail: "#ffe3a3",
    preview:
      "radial-gradient(circle at 50% 50%, #141829 0 62%, #ffe3a3 66%, #ffe3a300 76%)",
  },
  {
    id: "prism",
    name: "Prisma",
    cost: 240,
    description: "Todos los colores a la vez.",
    orb: { light: "#ffffff", mid: "#ffffff", edge: "#9aa4ff", halo: "#ffffff" },
    pattern: "prism",
    preview:
      "radial-gradient(circle at 36% 32%, #fff 0 12%, transparent 40%), conic-gradient(#ff8fa3, #ffd37a, #9dff9a, #7ae6ff, #b69cff, #ff8fa3)",
  },
];
export function getSkin(value: unknown): Skin {
  return skins.find((skin) => skin.id === value) ?? skins[0];
}
export const isUnlocked = (skin: Skin, crystals: number) =>
  crystals >= skin.cost;
/** The next orb still locked at this balance, if any. */
export const nextSkin = (crystals: number) =>
  skins.find((skin) => skin.cost > crystals);
/** Orbs crossed by a balance change, cheapest first. */
export const unlockedBetween = (before: number, after: number) =>
  skins.filter((skin) => skin.cost > before && skin.cost <= after);
