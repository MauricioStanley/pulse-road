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
      expect(contrast(themeVariables(t.id)["--soft"], t.surface)).toBeGreaterThanOrEqual(4.5);
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
  it("keeps Morado and Rosa as separate colors", () => {
    const hueOf = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const purple = getTheme("purple"), pink = getTheme("pink");
    expect(purple.name).toBe("Morado");
    expect(pink.name).toBe("Rosa");
    expect(hueOf(purple.accent)).toBeGreaterThan(250);
    expect(hueOf(purple.accent)).toBeLessThan(285);
    expect(hueOf(pink.accent)).toBeGreaterThan(310);
    expect(hueOf(pink.accent)).toBeLessThan(340);
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
