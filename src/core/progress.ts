/** Whole percent of the song reached. Only a completed song reads 100. */
export function progressPercent(time: number, duration: number, completed = false): number {
  if (completed) return 100;
  if (typeof time !== "number" || !isFinite(time) || !(duration > 0)) return 0;
  return Math.max(0, Math.min(99, Math.floor((100 * time) / duration)));
}
