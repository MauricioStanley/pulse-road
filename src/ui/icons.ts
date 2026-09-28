import type { PowerId } from "../core/chart";
import type { RelicId } from "../core/relics";
const paths: Record<string, string> = {
  play: '<path d="m9 5 11 7-11 7Z"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  replay: '<path d="M4 9a8 8 0 1 1 0 6m0-11v5h5"/>',
  trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v7m-4 0h8"/>',
  install: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  diamond: '<path d="m12 3 8 9-8 9-8-9Z"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  center: '<circle cx="12" cy="12" r="4"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
  star: '<path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.3-.9Z"/>',
  headphones: '<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H2v7h5v-7Zm16 0h2v7h-5v-7Z"/>',
  home: '<path d="m3 11 9-8 9 8v10h-6v-7H9v7H3Z"/>',
  share: '<path d="M12 15V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  infinity: '<path d="M7.5 15.5C5 15.5 3 13.9 3 12s2-3.5 4.5-3.5C11 8.5 13 15.5 16.5 15.5 19 15.5 21 13.9 21 12s-2-3.5-4.5-3.5C13 8.5 11 15.5 7.5 15.5Z"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4m6-4v4"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/>',
  relic: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="M11 15.5V8.5c1.5.5 3 1.5 3 3"/><circle cx="9.6" cy="15.4" r="1.4"/>',
  ghost: '<path d="M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5Z"/><circle cx="10" cy="11" r=".8"/><circle cx="14" cy="11" r=".8"/>',
  touch: '<path d="M9 11V5a1.5 1.5 0 0 1 3 0v6m0-1a1.5 1.5 0 0 1 3 0v1m0 0a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 15a1.5 1.5 0 0 1 2.4-1.8L9 16"/>',
  swipe: '<path d="M4 12h16m-12-4-4 4 4 4m8-8 4 4-4 4"/>',
  level: '<path d="M12 3 4 7v6c0 4 3.5 7 8 8 4.5-1 8-4 8-8V7Z"/><path d="m9 12 2 2 4-4"/>',
  badge: '<path d="M12 3 4 7v6c0 4 3.5 7 8 8 4.5-1 8-4 8-8V7Z"/>',
};
// Power-ups share their silhouettes with the shapes drawn on the road.
const powerPaths: Record<PowerId, string> = {
  shield: '<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/>',
  double: '<path d="m5 11 7-6 7 6M5 18l7-6 7 6"/>',
  slow: '<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>',
};
// Original line drawings for the ten rhythm relics.
const relicPaths: Record<RelicId, string> = {
  metronome: '<path d="M8 21h8L13.5 4h-3Z"/><path d="m12 15 4.5-7"/><circle cx="16.5" cy="8" r="1"/>',
  cassette: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8.5" cy="11" r="1.6"/><circle cx="15.5" cy="11" r="1.6"/><path d="m7 18 1.5-3h7l1.5 3"/>',
  tuningfork: '<path d="M9 3v8a3 3 0 0 0 6 0V3M12 14v7"/><path d="M4 6c-1 1.2-1 2.8 0 4M20 6c1 1.2 1 2.8 0 4"/>',
  vinyl: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5"/><path d="m16 3.8-2.5 4 2 1.5-1.5 2.5"/>',
  headphones: paths.headphones,
  toypiano: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M7.5 6v12M12 6v12M16.5 6v12"/><path d="M6 6v6h3V6M15 6v6h3V6" fill="currentColor"/>',
  goldnote: '<path d="M10 17V4c3 .8 6 2.8 6 6"/><circle cx="7.5" cy="17" r="2.5"/><path d="m18 16 1.5 1.5L21 16l-1.5-1.5Z"/>',
  speaker: '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="14" r="3.2"/><circle cx="12" cy="7.5" r="1.2"/>',
  baton: '<path d="M5.5 18.5 19 5"/><circle cx="5" cy="19" r="1.8"/><path d="M15 3.5 17 2M21 7l1.5-2"/>',
  quartz: '<path d="M12 21 4 11l3-6h10l3 6Z"/><path d="M4 11h16M9.5 5 12 21l2.5-16"/>',
};
const svg = (content: string, stroke = 1.7) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
export const icon = (name: string) => svg(paths[name] || paths.play);
export const powerIcon = (power: PowerId) => svg(powerPaths[power], 1.9);
export const relicIcon = (relic: RelicId) => svg(relicPaths[relic], 1.5);
export const powerNames: Record<PowerId, string> = {
  shield: "Escudo",
  heart: "Corazón",
  double: "Puntos dobles",
  slow: "Cámara lenta",
};
export const powerHints: Record<PowerId, string> = {
  shield: "Absorbe un fallo sin daño y sin romper el combo.",
  heart: "Recupera 35 de energía al instante.",
  double: "Duplica tus puntos durante 8 segundos.",
  slow: "Frena la canción un 20 % durante 8 segundos.",
};
