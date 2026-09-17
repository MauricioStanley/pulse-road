export type Difficulty = "titi" | "medio" | "dificil" | "servellon";
export interface Level {
  id: Difficulty; name: string; subtitle: string; track: string; audio: string;
  bpm: number; duration: number; travel: number; lateWindow: number;
  damage: number; recovery: number; description: string;
}
export const levels: readonly Level[] = [
  { id: "titi", name: "Fácil", subtitle: "", track: "Pequeña Órbita", audio: "tiny-orbit.mp3", bpm: 96, duration: 80, travel: 2.4, lateWindow: 0.20, damage: 14, recovery: 3, description: "Pasos amplios, melodía tranquila. Tu primer camino." },
  { id: "medio", name: "Medio", subtitle: "Al ritmo", track: "First Light", audio: "first-light.mp3", bpm: 120, duration: 80, travel: 2, lateWindow: 0.14, damage: 20, recovery: 2, description: "Más cambios y pequeños contratiempos. Encuentra tu flow." },
  { id: "dificil", name: "Difícil", subtitle: "Sin frenos", track: "Neon Sprint", audio: "neon-sprint.mp3", bpm: 150, duration: 80, travel: 1.65, lateWindow: 0.10, damage: 28, recovery: 1, description: "Saltos rápidos y ráfagas. Mira una plataforma por delante." },
  { id: "servellon", name: "Pesadilla", subtitle: "", track: "Umbral Cero", audio: "zero-threshold.mp3", bpm: 180, duration: 80, travel: 1.25, lateWindow: 0.065, damage: 40, recovery: 0.5, description: "Hasta 6 plataformas por segundo. Patrones fijos para aprender intento a intento." },
];
// Keep stable IDs so existing records, attempts and settings are preserved.
export function levelLabel(level: Level): string {
  return level.name + (level.subtitle ? " · " + level.subtitle : "");
}
export function getLevel(id: unknown): Level {
  for (const level of levels) if (level.id === id) return level;
  return levels[0];
}
