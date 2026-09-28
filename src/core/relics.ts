import type { Note } from "./chart";
import type { Difficulty } from "./levels";
// Rhythm relics: original musical artifacts hidden on the road. Each one sits
// on a fixed platform (or Infinito stage) and is collected with a Perfect.
// They never change scoring, so song records stay comparable.
export type RelicId =
  | "metronome" | "cassette" | "tuningfork" | "vinyl" | "headphones"
  | "toypiano" | "goldnote" | "speaker" | "baton" | "quartz";
export interface Relic {
  id: RelicId;
  name: string;
  lore: string;
  hint: string;
  level?: Difficulty;
  /** Note id inside that song's chart. */
  note?: number;
  /** Infinito stage index (0-based) whose first bars carry it. */
  stage?: number;
}
export const relics: readonly Relic[] = [
  { id: "metronome", name: "Metrónomo de latón", lore: "Marcó el primer pulso del camino. Todavía no se detiene.", hint: "Fácil, a mitad de la canción.", level: "titi", note: 38 },
  { id: "cassette", name: "Casete sin etiqueta", lore: "Alguien grabó aquí la primera versión de Pequeña Órbita.", hint: "Fácil, cerca del final.", level: "titi", note: 76 },
  { id: "tuningfork", name: "Diapasón", lore: "Vibra en La. Todo el circuito se afina con él.", hint: "Medio, cuando la canción respira.", level: "medio", note: 54 },
  { id: "vinyl", name: "Vinilo agrietado", lore: "Salta en el mismo compás desde hace años.", hint: "Medio, en el último tramo.", level: "medio", note: 100 },
  { id: "headphones", name: "Audífonos de la primera fiesta", lore: "Sus almohadillas aún guardan el eco de un bajo.", hint: "Difícil, en la mitad exacta.", level: "dificil", note: 150 },
  { id: "toypiano", name: "Piano de juguete", lore: "Tiene una tecla rota. Nadie sabe qué nota era.", hint: "Difícil, justo antes del final.", level: "dificil", note: 270 },
  { id: "goldnote", name: "Corchea dorada", lore: "Solo aparece cuando el ritmo ya no te asusta.", hint: "Pesadilla, a mitad del miedo.", level: "servellon", note: 210 },
  { id: "speaker", name: "Altavoz de la azotea", lore: "Desde aquí sonó Umbral Cero por primera vez.", hint: "Pesadilla, en los últimos segundos.", level: "servellon", note: 390 },
  { id: "baton", name: "Batuta de cristal", lore: "Quien la sostiene marca el tempo del infinito.", hint: "Infinito, al llegar a la etapa 5.", stage: 4 },
  { id: "quartz", name: "Corazón de cuarzo", lore: "Late a 120 pulsos por minuto. Siempre.", hint: "Infinito, al llegar a la etapa 9.", stage: 8 },
];
export const getRelic = (id: unknown) => relics.find((relic) => relic.id === id);
/** Marks this song's relic platforms. Mutates the fresh chart it is given. */
export function placeRelics(notes: Note[], level: Difficulty): Note[] {
  for (const relic of relics)
    if (relic.level === level && relic.note !== undefined && notes[relic.note])
      notes[relic.note].relic = relic.id;
  return notes;
}
/** The relic an Infinito stage carries, if any. */
export const stageRelic = (stage: number) =>
  relics.find((relic) => relic.stage === stage)?.id;
