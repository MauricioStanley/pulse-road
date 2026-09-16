import { afterEach, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it("keeps independent records and attempts per level across reloads", async () => {
  const data = new Map<string, string>();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
  const first = await import("../src/storage");
  first.saveRecord(4000,"titi"); first.saveRecord(25000,"servellon");
  first.startAttempt("servellon"); first.startAttempt("servellon");
  first.settings.difficulty="dificil"; first.saveSettings();
  expect(first.saveRecord(NaN,"titi")).toBe(false);
  vi.resetModules(); const second=await import("../src/storage");
  expect(second.getRecord("titi")).toBe(4000);
  expect(second.getRecord("medio")).toBe(0);
  expect(second.getRecord("servellon")).toBe(25000);
  expect(second.getAttempts("servellon")).toBe(2);
  expect(second.getAttempts("titi")).toBe(0);
  expect(second.settings.difficulty).toBe("dificil");
});
it("remains playable when persistence is denied or data is malformed", async () => {
  vi.stubGlobal("matchMedia", () => ({matches:false}));
  vi.stubGlobal("localStorage", {getItem:()=>{throw new Error("denied")},setItem:()=>{throw new Error("quota")}});
  const storage=await import("../src/storage");
  expect(storage.settings.difficulty).toBe("titi");
  expect(()=>storage.startAttempt("servellon")).not.toThrow();
  expect(()=>storage.saveRecord(900,"servellon")).not.toThrow();
  expect(storage.storageAvailable).toBe(false);
});
