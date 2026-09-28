import { afterEach, describe, expect, it, vi } from "vitest";
import { skins, getSkin, isUnlocked, nextSkin, unlockedBetween } from "../src/skins";
import { progressPercent } from "../src/core/progress";
import { createChart, type Note } from "../src/core/chart";
import { getLevel, levels } from "../src/core/levels";
import { Run } from "../src/core/rules";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("Orb collection", () => {
  it("has unique ids, a free first orb and strictly rising costs", () => {
    expect(new Set(skins.map(s => s.id)).size).toBe(skins.length);
    expect(skins[0]).toMatchObject({ id: "classic", cost: 0 });
    skins.slice(1).forEach((skin, i) => expect(skin.cost).toBeGreaterThan(skins[i].cost));
    expect(getSkin("nope").id).toBe("classic");
  });
  it("reports the next goal and every orb crossed by one run", () => {
    expect(nextSkin(0)?.id).toBe("ember");
    expect(nextSkin(10)?.id).toBe("frost");
    expect(nextSkin(10_000)).toBeUndefined();
    expect(unlockedBetween(5, 60).map(s => s.id)).toEqual(["ember", "frost", "gold"]);
    expect(unlockedBetween(60, 60)).toEqual([]);
    expect(isUnlocked(getSkin("gold"), 49)).toBe(false);
    expect(isUnlocked(getSkin("gold"), 50)).toBe(true);
  });
  it("lets a first clean Fácil run unlock the first orb", () => {
    const crystals = createChart(getLevel("titi")).filter(n => n.crystal).length;
    expect(crystals).toBeGreaterThanOrEqual(skins[1].cost);
  });
});

describe("Progress through the song", () => {
  it("floors to whole percent and saves 100 only for a finished song", () => {
    expect(progressPercent(0, 80)).toBe(0);
    expect(progressPercent(29.9, 80)).toBe(37);
    expect(progressPercent(80, 80)).toBe(99);
    expect(progressPercent(79, 80, true)).toBe(100);
    expect(progressPercent(NaN, 80)).toBe(0);
    expect(progressPercent(-3, 80)).toBe(0);
    expect(progressPercent(5, 0)).toBe(0);
  });
  it("measures accuracy over the platforms reached, so an early fall is honest", () => {
    const notes: Note[] = Array.from({ length: 40 }, (_, id) => ({ id, time: 1 + id * 0.5, lane: 0, crystal: false, obstacles: [] }));
    const run = new Run(notes, levels[1]);
    run.tap(0, 0.5);
    run.advance(2.1); // three Perfects
    run.tap(2, 2.2);
    run.advance(5.2); // five misses at −20: the run is over
    expect(run.dead).toBe(true);
    expect(run.accuracy).toBe(Math.round((100 * 3) / 8));
  });
});

describe("Saved progression", () => {
  const stubStorage = (data = new Map<string, string>()) => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
    return data;
  };
  it("accumulates crystals and only ever improves bests", async () => {
    const data = stubStorage();
    const first = await import("../src/storage");
    expect(first.addCrystals(7)).toBe(7);
    expect(first.addCrystals(-4)).toBe(7);
    expect(first.addCrystals(NaN)).toBe(7);
    expect(first.saveProgress(42, "medio")).toBe(true);
    expect(first.saveProgress(30, "medio")).toBe(false);
    expect(first.saveStars(2, "medio")).toBe(true);
    expect(first.saveStars(9, "medio")).toBe(true);
    first.settings.skin = "ember"; first.saveSettings();
    vi.resetModules();
    const second = await import("../src/storage");
    expect(second.getCrystals()).toBe(7);
    expect(second.getBestProgress("medio")).toBe(42);
    expect(second.getBestProgress("titi")).toBe(0);
    expect(second.getStars("medio")).toBe(3);
    expect(second.settings.skin).toBe("ember");
    expect(data.get("pulse-crystals-v1")).toBe("7");
  });
  it("never equips an orb the balance has not reached", async () => {
    stubStorage(new Map([["pulse-settings-v1", JSON.stringify({ skin: "prism" })], ["pulse-crystals-v1", "12"]]));
    const storage = await import("../src/storage");
    expect(storage.settings.skin).toBe("prism");
    expect(storage.activeSkin().id).toBe("classic");
    storage.addCrystals(300);
    expect(storage.activeSkin().id).toBe("prism");
  });
  it("ignores corrupt progression values", async () => {
    stubStorage(new Map([["pulse-crystals-v1", "\"lots\""], ["pulse-best-landing-v2-titi", "250"], ["pulse-stars-landing-v2-titi", "-1"]]));
    const storage = await import("../src/storage");
    expect(storage.getCrystals()).toBe(0);
    expect(storage.getBestProgress("titi")).toBe(100);
    expect(storage.getStars("titi")).toBe(0);
  });
});
