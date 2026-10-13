import { afterEach, describe, expect, it, vi } from "vitest";
import { checkName } from "../src/core/names";
import { nextRival, placeFor } from "../src/core/rivals";

describe("Ranking names", () => {
  it("tidies spaces and keeps accents", () => {
    expect(checkName("  Ana   Lucía ")).toEqual({ name: "Ana Lucía" });
    expect(checkName("Peñita_07")).toEqual({ name: "Peñita_07" });
    expect(checkName("Conor")).toEqual({ name: "Conor" });
  });
  it("explains why a name can't be used", () => {
    expect(checkName("ab")).toEqual({ problem: "short" });
    expect(checkName("abcdefghijklmnopq")).toEqual({ problem: "long" });
    expect(checkName("hola<script>")).toEqual({ problem: "chars" });
    expect(checkName("P3nd3jo")).toEqual({ problem: "word" });
    expect(checkName("M1ERDA")).toEqual({ problem: "word" });
  });
});

const row = (rank: number, name: string, score: number, me = false) => ({ rank, name, score, me, stage: 1, skin: "classic" });

describe("Live rival", () => {
  const top = [row(1, "Ana", 900), row(2, "Yo", 700, true), row(3, "Beto", 500), row(4, "Caro", 300)];
  it("targets the closest player above, never your own best", () => {
    expect(nextRival(top, 0)?.name).toBe("Caro");
    expect(nextRival(top, 301)?.name).toBe("Beto");
    expect(nextRival(top, 600)?.name).toBe("Ana");
    expect(nextRival(top, 901)).toBeUndefined();
  });
  it("keeps a tie behind the earlier run", () => {
    expect(nextRival(top, 300)?.name).toBe("Caro");
    expect(placeFor(top, 300, 4)).toBe(4);
  });
  it("projects the place among other players", () => {
    expect(placeFor(top, 950, 4)).toBe(1);
    expect(placeFor(top, 600, 4)).toBe(2);
    expect(placeFor(top, 100, 4)).toBe(4);
    // Below a list that is only the top of a longer ranking: unknown.
    expect(placeFor(top, 100, 40)).toBeUndefined();
  });
});

describe("Ranking client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  function setup(respond: (fn: string, body: Record<string, unknown>) => Response | Promise<Response>) {
    const data = new Map<string, string>();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    const calls: { fn: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const fn = url.split("/rpc/")[1];
      const body = JSON.parse(String(init.body));
      calls.push({ fn, body });
      return respond(fn, body);
    });
    return { data, calls };
  }
  const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
  const run = { score: 1200, stage: 2, seconds: 20, skin: "classic" };

  it("plays under one stable id and sends the chosen name", async () => {
    const { calls } = setup((fn) =>
      fn === "rename_endless" ? json({ name: "Ana", listed: false }) : json({ name: "Ana", best: 1200, stage: 2, improved: true, rank: 1, total: 1 }));
    const ranking = await import("../src/ranking");
    expect(await ranking.setRankingName("Ana")).toBe("saved");
    const result = await ranking.submitRun(run);
    expect(result.rank).toBe(1);
    expect(calls[0].body.p_player).toBe(calls[1].body.p_player);
    expect(calls[1].body).toMatchObject({ p_name: "Ana", p_score: 1200, p_stage: 2 });
  });
  it("keeps the best run while offline and sends it later", async () => {
    let online = false;
    const { calls } = setup(() => {
      if (!online) throw new TypeError("Failed to fetch");
      return json({ name: "Ana", best: 1500, stage: 3, improved: true, rank: 1, total: 1 });
    });
    const ranking = await import("../src/ranking");
    expect(await ranking.setRankingName("Ana")).toBe("offline");
    await expect(ranking.submitRun(run)).rejects.toMatchObject({ problem: "offline" });
    await expect(ranking.submitRun({ ...run, score: 1500, stage: 3, seconds: 40 })).rejects.toMatchObject({ problem: "offline" });
    await expect(ranking.submitRun({ ...run, score: 900 })).rejects.toMatchObject({ problem: "offline" });
    expect(ranking.hasPending()).toBe(true);
    online = true;
    await ranking.flushPending();
    expect(ranking.hasPending()).toBe(false);
    expect(calls.at(-1)?.body).toMatchObject({ p_score: 1500, p_name: "Ana" });
  });
  it("keeps a separate daily list per day, with its own pending run", async () => {
    let online = true;
    const { calls } = setup((fn) => {
      if (!online) throw new TypeError("Failed to fetch");
      if (fn === "rename_endless") return json({ name: "Ana", listed: false });
      if (fn === "daily_board") return json({ total: 1, top: [{ rank: 1, name: "Ana", score: 800, stage: 2, skin: "classic", me: true }], me: { rank: 1, name: "Ana", score: 800, stage: 2 } });
      return json({ name: "Ana", best: 800, stage: 2, improved: true, rank: 1, total: 1 });
    });
    const ranking = await import("../src/ranking");
    await ranking.setRankingName("Ana");
    await ranking.fetchBoard("daily", 50, "2026-10-13");
    expect(calls.at(-1)).toMatchObject({ fn: "daily_board", body: { p_day: "2026-10-13" } });
    expect(ranking.cachedBoard("daily", "2026-10-13")?.me?.rank).toBe(1);
    expect(ranking.cachedBoard("daily", "2026-10-14")).toBeUndefined();
    expect(ranking.cachedBoard("endless")).toBeUndefined();
    await ranking.submitRun(run, "daily", "2026-10-13");
    expect(calls.at(-1)).toMatchObject({ fn: "submit_daily", body: { p_day: "2026-10-13", p_name: "Ana" } });
    online = false;
    await expect(ranking.submitRun(run, "daily", "2026-10-13")).rejects.toMatchObject({ problem: "offline" });
    expect(ranking.hasPending("daily")).toBe(true);
    expect(ranking.hasPending("endless")).toBe(false);
    online = true;
    await ranking.flushPending();
    expect(ranking.hasPending("daily")).toBe(false);
    expect(calls.at(-1)).toMatchObject({ fn: "submit_daily", body: { p_day: "2026-10-13" } });
  });
  it("reports server refusals and never retries an impossible run", async () => {
    setup((fn, body) =>
      fn === "rename_endless" ? json({ name: String(body.p_name), listed: false }) : json({ code: "22023", message: "invalid_run" }, 400));
    const ranking = await import("../src/ranking");
    await ranking.setRankingName("Ana");
    await expect(ranking.submitRun({ ...run, score: 99_999_999 })).rejects.toMatchObject({ problem: "invalid_run" });
    expect(ranking.hasPending()).toBe(false);
  });
});
