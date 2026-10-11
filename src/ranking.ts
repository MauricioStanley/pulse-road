import { read, write } from "./storage";
import type { Ranked } from "./core/rivals";

// Infinito ranking on Supabase (schema in supabase/ranking.sql). The key below
// is the project's publishable key, made for browsers: the scores table is
// closed and only the three ranking functions can be called with it.
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

interface Store {
  id: string;
  name?: string;
  pending?: RankedRun;
  board?: Board;
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
export const cachedBoard = () => store().board;
export const hasPending = () => !!store().pending;

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

export async function fetchBoard(limit = 50): Promise<Board> {
  const board = await call<Board>("endless_board", { p_player: store().id, p_limit: limit });
  const clean: Board = {
    total: Number(board?.total) || 0,
    top: Array.isArray(board?.top) ? board.top : [],
    me: board?.me ?? null,
  };
  update({ board: clean });
  return clean;
}

function send(run: RankedRun, name: string) {
  return call<Submitted>("submit_endless", {
    p_player: store().id,
    p_name: name,
    p_score: Math.max(0, Math.floor(run.score)),
    p_stage: Math.max(1, Math.floor(run.stage)),
    p_seconds: Math.max(0, run.seconds),
    p_skin: run.skin,
  });
}

/**
 * Sends a run under the saved name. Without an answer, the run waits on this
 * device (only the best one) and goes out on the next try.
 */
export async function submitRun(run: RankedRun): Promise<Submitted> {
  const name = rankingName();
  if (!name) throw new RankingError("invalid_name");
  try {
    const result = await send(run, name);
    const pending = store().pending;
    if (pending && pending.score <= run.score) update({ pending: undefined });
    return result;
  } catch (error) {
    const problem = error instanceof RankingError ? error.problem : "offline";
    if (problem === "offline" || problem === "too_fast") {
      const pending = store().pending;
      if (!pending || run.score > pending.score) update({ pending: run });
    }
    throw error;
  }
}

/** Retries a run saved while offline. Quietly gives up if it still can't. */
export async function flushPending() {
  const { pending } = store();
  const name = rankingName();
  if (!pending || !name) return;
  try {
    await send(pending, name);
    update({ pending: undefined });
  } catch (error) {
    // A run the server refuses will never pass; anything else waits.
    if (error instanceof RankingError && error.problem === "invalid_run") update({ pending: undefined });
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
