export const themes = [
  {
    id: "mint",
    name: "Menta",
    accent: "#70f4cb",
    hover: "#9bffdf",
    dark: "#38aa8f",
    background: "#07151e",
    surface: "#0c222b",
    panel: "#193239",
    panelHover: "#25464b",
    muted: "#a4bebf",
    road: "#143039",
    tile: "#4e897f",
    ring: "#375961",
    hazard: "#ff897d",
  },
  {
    id: "purple",
    name: "Morado",
    accent: "#b48aff",
    hover: "#d2b8ff",
    dark: "#7448c8",
    background: "#130b24",
    surface: "#21153a",
    panel: "#31214f",
    panelHover: "#432e6a",
    muted: "#c1b2dd",
    road: "#2a1b47",
    tile: "#5f4396",
    ring: "#4a3870",
    hazard: "#ffad7d",
  },
  {
    id: "pink",
    name: "Rosa",
    accent: "#ff7ac6",
    hover: "#ffa8da",
    dark: "#c43f8c",
    background: "#1f0a18",
    surface: "#311326",
    panel: "#461c37",
    panelHover: "#5c2749",
    muted: "#e0b3cc",
    road: "#3d1531",
    tile: "#93466f",
    ring: "#6a3456",
    hazard: "#ffd27a",
  },
  {
    id: "red",
    name: "Rojo",
    accent: "#ff8585",
    hover: "#ffb0aa",
    dark: "#bc444f",
    background: "#210f17",
    surface: "#321b25",
    panel: "#452632",
    panelHover: "#5c3340",
    muted: "#d0b0ba",
    road: "#3c222d",
    tile: "#8a4752",
    ring: "#5f3540",
    hazard: "#ffd07b",
  },
  {
    id: "green",
    name: "Verde",
    accent: "#a4f277",
    hover: "#c3ffa1",
    dark: "#65a43e",
    background: "#101c12",
    surface: "#1d2c1c",
    panel: "#2c3e25",
    panelHover: "#3d5433",
    muted: "#b3c8a8",
    road: "#293b23",
    tile: "#55804a",
    ring: "#3e5636",
    hazard: "#ffab82",
  },
] as const;

export type ThemeId = (typeof themes)[number]["id"];
export function getTheme(value: unknown) {
  return themes.find((theme) => theme.id === value) ?? themes[0];
}
export const colorNumber = (hex: string) => Number.parseInt(hex.slice(1), 16);
/** Blends two #rrggbb colors; amount 0 keeps `from`, 1 gives `to`. */
export function mix(from: string, to: string, amount: number) {
  const a = colorNumber(from), b = colorNumber(to);
  let out = "#";
  for (const shift of [16, 8, 0]) {
    const channel = Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
    out += ("0" + channel.toString(16)).slice(-2);
  }
  return out;
}

export function themeVariables(id: ThemeId) {
  const t = getTheme(id);
  return {
    // Borders, tracks and secondary text derive from the palette, so no
    // fixed tint from another color leaks into the selected one.
    "--soft": mix("#eaf6ef", t.muted, 0.5),
    "--dim": mix(t.muted, t.background, 0.45),
    "--edge": mix(t.panelHover, "#ffffff", 0.1),
    "--edge-strong": mix(t.panelHover, "#ffffff", 0.16),
    "--accent-deep": mix(t.surface, t.accent, 0.25),
    "--backdrop": `${t.background}bb`,
    "--surface-glow": `${t.surface}70`,
    "--mint": t.accent,
    "--accent-hover": t.hover,
    "--accent-ink": "#101820",
    "--canvas": t.background,
    "--surface": t.surface,
    "--panel": t.panel,
    "--panel-hover": t.panelHover,
    "--muted": t.muted,
    "--coral": t.hazard,
    "--canvas-fade": `${t.background}40`,
    "--canvas-overlay": `${t.background}eb`,
    "--canvas-soft": `${t.background}60`,
    "--accent-soft": `${t.accent}88`,
    "--road-surface": `${t.road}d9`,
    "--accent-glow": `${t.accent}17`,
  };
}
