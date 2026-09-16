import { afterEach, describe, expect, it, vi } from "vitest";
import { getTheme, themes, themeVariables } from "../src/themes";
import { assetUrl } from "../src/paths";

function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Selectable palettes", () => {
  it.each(themes)(
    "$name preserves readable text, controls and danger signals",
    (t) => {
      expect(contrast(t.accent, "#101820")).toBeGreaterThanOrEqual(4.5);
      expect(contrast("#eaf6ef", t.panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accent, t.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(t.hazard, t.background)).toBeGreaterThanOrEqual(3);
      expect(t.accent).not.toBe(t.hazard);
      expect(themeVariables(t.id)["--mint"]).toBe(t.accent);
    },
  );
  it.each(themes)("remembers $name after reloading storage", async (t) => {
    const data = new Map<string, string>();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    const first = await import("../src/storage");
    first.settings.theme = t.id;
    first.saveSettings();
    vi.resetModules();
    expect((await import("../src/storage")).settings.theme).toBe(t.id);
  });
  it("falls back safely for old or invalid preferences", () => {
    for (const value of [undefined, null, "unknown", 42, {}])
      expect(getTheme(value).id).toBe("mint");
  });
});

describe("Static hosting paths", () => {
  it.each(["/", "/pulse-road/"])("keeps assets within %s", (base) => {
    vi.stubEnv("BASE_URL", base);
    expect(assetUrl("audio/first-light.mp3")).toBe(
      `${base}audio/first-light.mp3`,
    );
    expect(assetUrl("/icons/icon.svg")).toBe(`${base}icons/icon.svg`);
  });
});
