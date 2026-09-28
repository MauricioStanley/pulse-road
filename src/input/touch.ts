import type { Lane } from "../core/chart";
export type ControlMode = "buttons" | "drag" | "swipe";
export const controlModes: readonly { id: ControlMode; name: string; hint: string }[] = [
  { id: "buttons", name: "Botones", hint: "Tres botones abajo: izquierda, centro y derecha." },
  { id: "drag", name: "Arrastrar", hint: "Toca o arrastra el dedo en cualquier parte: la esfera va al tercio de pantalla donde esté." },
  { id: "swipe", name: "Deslizar", hint: "Desliza a la izquierda o a la derecha para cambiar un carril." },
];
export const getControlMode = (value: unknown): ControlMode =>
  controlModes.some((mode) => mode.id === value) ? (value as ControlMode) : "buttons";
/** Drag mode: the screen is split into three equal columns. */
export function laneFromX(x: number, width: number): Lane {
  if (!(width > 0)) return 1;
  const column = Math.floor((3 * x) / width);
  return (column <= 0 ? 0 : column >= 2 ? 2 : 1) as Lane;
}
/**
 * Swipe mode: every `threshold` pixels of horizontal travel is one lane step,
 * measured from where the last step fired, so one long swipe can cross two lanes.
 */
export class SwipeTracker {
  private anchor = 0;
  private active = false;
  constructor(readonly threshold = 24) {}
  down(x: number) {
    this.anchor = x;
    this.active = true;
  }
  move(x: number): -1 | 0 | 1 {
    if (!this.active) return 0;
    const dx = x - this.anchor;
    if (Math.abs(dx) < this.threshold) return 0;
    this.anchor = x;
    return dx < 0 ? -1 : 1;
  }
  up() {
    this.active = false;
  }
}
export const stepLane = (lane: Lane, step: -1 | 0 | 1) =>
  Math.max(0, Math.min(2, lane + step)) as Lane;
