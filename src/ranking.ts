import { read, write } from "./storage";
import type { Ranked } from "./core/rivals";

// Online rankings on Supabase (schema in supabase/ranking.sql): Infinito, and
// one list per day for the daily challenge. The key below is the project's
// publishable key, made for browsers: the score tables are closed and only the
// ranking functions can be called with it.
const API = "https://qfxkrlodsvttmekniadi.supabase.co/rest/v1/rpc/";
const KEY = "sb_publishable_7gn6QjREC7PQFDnRebhiLg_2kLV5qwd";
const STORE = "pulse-ranking-v1";
const TIMEOUT = 7000;

export interface RankRow extends Ranked {
  stage: number;
  skin: string;
}
export interface Board {
  total: number;
  top: RankRow[];
  me: { rank: number; name: string; score: number; stage: number } | null;
}
export interface Submitted {
  name: string;
  best: number;
  stage: number;
  improved: boolean;
  rank: number;
  total: number;
}
export interface RankedRun {
  score: number;
  stage: number;
  seconds: number;
  skin: string;
}
/** Server refusals, plus "offline" for anything that never got an answer. */
export type RankingProblem = "invalid_name" | "invalid_run" | "too_fast" | "offline";
export class RankingError extends Error {
  constructor(readonly problem: RankingProblem) {
    super(problem);
  }
}

export type BoardKind = "endless" | "daily";
interface Store {
  id: string;
  name?: string;
  // Infinito keeps the top-level fields it had before the daily list existed.
  pending?: RankedRun;
  board?: Board;
  daily?: { day: string; board?: Board; pending?: RankedRun & { day: string } };
}
function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function store(): Store {
  const saved = read(STORE);
  const valid = saved && typeof saved === "object" && typeof saved.id === "string" && uuid.test(saved.id);
  if (valid) return saved as Store;
  const fresh: Store = { id: newId() };
  write(STORE, fresh);
  return fresh;
}
function update(change: Partial<Store>) {
  write(STORE, { ...store(), ...change });
}

/** The name this device plays under, once chosen. */
export const rankingName = () => {
  const name = store().name;
  return typeof name === "string" && name ? name : undefined;
};
/** The last list fetched, if it is for that day (daily) or for Infinito. */
export function cachedBoard(kind: BoardKind = "endless", day = ""): Board | undefined {
  if (kind === "endless") return store().board;
  const daily = store().daily;
  return daily && daily.day === day ? daily.board : undefined;
}
export const hasPending = (kind: BoardKind = "endless") =>
  kind === "endless" ? !!store().pending : !!store().daily?.pending;

async function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  let response: Response;
  try {
    response = await fetch(API + fn, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new RankingError("offline");
  } finally {
    clearTimeout(timer);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data.message === "string" ? data.message : "";
    throw new RankingError(["invalid_name", "invalid_run", "too_fast"].includes(message) ? (message as RankingProblem) : "offline");
  }
  return data as T;
}

export async function fetchBoard(kind: BoardKind = "endless", limit = 50, day = ""): Promise<Board> {
  const board = kind === "endless"
    ? await call<Board>("endless_board", { p_player: store().id, p_limit: limit })
    : await call<Board>("daily_board", { p_player: store().id, p_day: day, p_limit: limit });
  const clean: Board = {
    total: Number(board?.total) || 0,
    top: Array.isArray(board?.top) ? board.top : [],
    me: board?.me ?? null,
  };
  if (kind === "endless") update({ board: clean });
  else update({ daily: { ...store().daily, day, board: clean } });
  return clean;
}

function send(run: RankedRun, name: string, kind: BoardKind, day: string) {
  const body = {
    p_player: store().id,
    p_name: name,
    p_score: Math.max(0, Math.floor(run.score)),
    p_stage: Math.max(1, Math.floor(run.stage)),
    p_seconds: Math.max(0, run.seconds),
    p_skin: run.skin,
  };
  return kind === "endless" ? call<Submitted>("submit_endless", body) : call<Submitted>("submit_daily", { ...body, p_day: day });
}
function pendingOf(kind: BoardKind) {
  return kind === "endless" ? store().pending : store().daily?.pending;
}
function setPending(kind: BoardKind, run: RankedRun | undefined, day: string) {
  if (kind === "endless") update({ pending: run });
  else update({ daily: { day: store().daily?.day ?? day, ...store().daily, pending: run && { ...run, day } } });
}

/**
 * Sends a run under the saved name. Without an answer, the run waits on this
 * device (only the best one per list) and goes out on the next try.
 */
export async function submitRun(run: RankedRun, kind: BoardKind = "endless", day = ""): Promise<Submitted> {
  const name = rankingName();
  if (!name) throw new RankingError("invalid_name");
  try {
    const result = await send(run, name, kind, day);
    const pending = pendingOf(kind);
    if (pending && pending.score <= run.score && (kind === "endless" || store().daily?.pending?.day === day)) setPending(kind, undefined, day);
    return result;
  } catch (error) {
    const problem = error instanceof RankingError ? error.problem : "offline";
    if (problem === "offline" || problem === "too_fast") {
      const pending = pendingOf(kind);
      const sameDay = kind === "endless" || store().daily?.pending?.day === day;
      if (!pending || !sameDay || run.score > pending.score) setPending(kind, run, day);
    }
    throw error;
  }
}

/** Retries runs saved while offline. Quietly gives up on those that still can't go. */
export async function flushPending() {
  const name = rankingName();
  if (!name) return;
  for (const kind of ["endless", "daily"] as const) {
    const pending = pendingOf(kind);
    if (!pending) continue;
    const day = kind === "daily" ? store().daily?.pending?.day ?? "" : "";
    try {
      await send(pending, name, kind, day);
      setPending(kind, undefined, day);
    } catch (error) {
      // A run the server refuses (or a day already closed) will never pass.
      if (error instanceof RankingError && error.problem === "invalid_run") setPending(kind, undefined, day);
    }
  }
}

/**
 * Saves the name (already checked with checkName) and renames this player
 * online if listed. Offline, it is kept locally and sent with the next run.
 */
export async function setRankingName(name: string): Promise<"saved" | "offline"> {
  try {
    const result = await call<{ name: string; listed: boolean }>("rename_endless", { p_player: store().id, p_name: name });
    update({ name: result.name });
    return "saved";
  } catch (error) {
    if (!(error instanceof RankingError) || error.problem !== "offline") throw error;
    update({ name });
    return "offline";
  }
}
