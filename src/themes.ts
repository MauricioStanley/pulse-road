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
    hazard: "#ff897d",
  },
  {
    id: "purple",
    name: "Morado",
    accent: "#c7a0ff",
    hover: "#dfc6ff",
    dark: "#8256c5",
    background: "#171023",
    surface: "#251a35",
    panel: "#352445",
    panelHover: "#4a315f",
    muted: "#c2afcf",
    road: "#30203e",
    hazard: "#ffad7d",
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
    hazard: "#ffab82",
  },
] as const;

export type ThemeId = (typeof themes)[number]["id"];
export function getTheme(value: unknown) {
  return themes.find((theme) => theme.id === value) ?? themes[0];
}
export const colorNumber = (hex: string) => Number.parseInt(hex.slice(1), 16);

export function themeVariables(id: ThemeId) {
  const t = getTheme(id);
  return {
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
