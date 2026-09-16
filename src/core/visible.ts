import type { Note } from "./chart";
/** First note at or after a time. Charts are sorted and immutable. */
export function firstNoteAt(notes: readonly Note[], time: number): number {
  let low = 0, high = notes.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (notes[mid].time < time) low = mid + 1;
    else high = mid;
  }
  return low;
}
