// Live ranking during an Infinito run: who is the next player to pass, and
// which place the current score would take. Pure, so it is tested offline.
export interface Ranked {
  rank: number;
  name: string;
  score: number;
  me: boolean;
}

/**
 * The closest player at or above this score, ignoring your own saved best.
 * A tie still counts as ahead: the earlier run keeps the place.
 */
export function nextRival<T extends Ranked>(top: readonly T[], score: number): T | undefined {
  let rival: T | undefined;
  for (const row of top)
    if (!row.me && row.score >= score && (!rival || row.score < rival.score)) rival = row;
  return rival;
}

/**
 * The place this score would take among other players. Undefined when it
 * falls below a list that only holds the top of a longer ranking.
 */
export function placeFor(top: readonly Ranked[], score: number, total: number): number | undefined {
  const others = top.filter((row) => !row.me);
  const above = others.filter((row) => row.score >= score).length;
  const listed = others.length;
  const unlisted = Math.max(0, total - top.length);
  if (above === listed && unlisted > 0) return undefined;
  return above + 1;
}
