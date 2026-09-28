import { afterEach, describe, expect, it, vi } from "vitest";
import { skins, getSkin, isUnlocked, nextSkin, unlockedBetween, perksFor } from "../src/skins";
import { basePerks } from "../src/core/endless";
import { progressPercent } from "../src/core/progress";
import { createChart, type Note } from "../src/core/chart";
import { getLevel, levels } from "../src/core/levels";
import { Run } from "../src/core/rules";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("Orb collection", () => {
  const progress = (crystals: number, level = 1, feats = {}) => ({ crystals, level, feats });
  it("has unique ids, a free first orb and rising crystal costs", () => {
    expect(new Set(skins.map(s => s.id)).size).toBe(skins.length);
    expect(skins[0]).toMatchObject({ id: "classic", unlock: { kind: "crystals", cost: 0 } });
    const costs = skins.filter(s => s.unlock.kind === "crystals").map(s => (s.unlock as { cost: number }).cost);
    costs.slice(1).forEach((cost, i) => expect(cost).toBeGreaterThan(costs[i]));
    expect(getSkin("nope").id).toBe("classic");
  });
  it("keeps the costs players already reached before new orbs were added", () => {
    const cost = (id: string) => (getSkin(id).unlock as { cost: number }).cost;
    expect([cost("ember"), cost("frost"), cost("gold"), cost("galaxy"), cost("eclipse"), cost("prism")]).toEqual([8, 25, 50, 90, 150, 240]);
  });
  it("unlocks by crystals, player level or feat, and reports what one run crossed", () => {
    expect(nextSkin(0)?.id).toBe("ember");
    expect(nextSkin(10)?.id).toBe("neon");
    expect(nextSkin(10_000)).toBeUndefined();
    expect(unlockedBetween(progress(5), progress(60)).map(s => s.id)).toEqual(["ember", "neon", "frost", "gold"]);
    expect(isUnlocked(getSkin("chrome"), progress(0, 9))).toBe(false);
    expect(isUnlocked(getSkin("chrome"), progress(0, 10))).toBe(true);
    expect(isUnlocked(getSkin("legend"), progress(9999, 99))).toBe(false);
    expect(isUnlocked(getSkin("legend"), progress(0, 1, { relics: true }))).toBe(true);
    expect(unlockedBetween(progress(0), progress(0, 1, { nightmare: true })).map(s => s.id)).toEqual(["nightmare"]);
  });
  it("gives every orb a perk that only changes Infinito rules", () => {
    for (const skin of skins) {
      expect(skin.perk.length).toBeGreaterThan(10);
      const perks = perksFor(skin);
      expect(Object.keys(perks).sort()).toEqual(Object.keys(basePerks).sort());
    }
    expect(perksFor(getSkin("ember")).feverCombo).toBe(20);
    expect(perksFor(getSkin("classic"))).toEqual(basePerks);
  });
  it("lets a first clean Fácil run unlock the first orb", () => {
    const crystals = createChart(getLevel("titi")).filter(n => n.crystal).length;
    expect(crystals).toBeGreaterThanOrEqual((skins[1].unlock as { cost: number }).cost);
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
  it("never equips an orb the player has not unlocked", async () => {
    stubStorage(new Map([["pulse-settings-v1", JSON.stringify({ skin: "prism" })], ["pulse-crystals-v1", "12"]]));
    const storage = await import("../src/storage");
    const profile = await import("../src/profile");
    expect(storage.settings.skin).toBe("prism");
    expect(profile.activeSkin().id).toBe("classic");
    storage.addCrystals(300);
    expect(profile.activeSkin().id).toBe("prism");
  });
  it("ignores corrupt progression values", async () => {
    stubStorage(new Map([["pulse-crystals-v1", "\"lots\""], ["pulse-best-landing-v2-titi", "250"], ["pulse-stars-landing-v2-titi", "-1"]]));
    const storage = await import("../src/storage");
    expect(storage.getCrystals()).toBe(0);
    expect(storage.getBestProgress("titi")).toBe(100);
    expect(storage.getStars("titi")).toBe(0);
  });
});
