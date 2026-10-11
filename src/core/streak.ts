// Daily streak: consecutive local days with at least one finished run. The
// first run of each day pays a reward that grows with the streak.
export interface Streak {
  /** Last day played, as dayKey() writes it: YYYY-MM-DD. */
  day: string;
  count: number;
  best: number;
}
export const STREAK_REWARD_CAP = 10;
export const streakReward = (count: number) => Math.min(STREAK_REWARD_CAP, 2 * Math.max(1, count));

/** The calendar day before a YYYY-MM-DD key, across months and years. */
export function previousDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Counts a finished run today. The reward is 0 after the day's first run. */
export function advanceStreak(streak: Streak | undefined, today: string) {
  if (streak && streak.day === today) return { streak, reward: 0, extended: false };
  const count = streak && streak.day === previousDay(today) ? streak.count + 1 : 1;
  const next: Streak = { day: today, count, best: Math.max(count, streak?.best ?? 0) };
  return { streak: next, reward: streakReward(count), extended: count > 1 };
}

/** The streak as it stands today: still alive if the last run was today or yesterday. */
export function liveStreak(streak: Streak | undefined, today: string) {
  if (!streak) return { count: 0, playedToday: false };
  if (streak.day === today) return { count: streak.count, playedToday: true };
  if (streak.day === previousDay(today)) return { count: streak.count, playedToday: false };
  return { count: 0, playedToday: false };
}
