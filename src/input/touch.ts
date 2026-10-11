import type { Lane } from "../core/chart";
export type ControlMode = "buttons" | "drag" | "swipe";
export const controlModes: readonly { id: ControlMode; name: string; hint: string }[] = [
  { id: "buttons", name: "Botones", hint: "Tres botones abajo: izquierda, centro y derecha." },
  { id: "drag", name: "Arrastrar", hint: "Toca o arrastra el dedo en cualquier parte: la esfera va al tercio de pantalla donde esté." },
  { id: "swipe", name: "Deslizar", hint: "Cada deslizamiento a la izquierda o a la derecha mueve un solo carril. Para cruzar dos, desliza dos veces." },
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
 * Swipe mode: one swipe moves exactly one lane, however long it is, and fires
 * as soon as the finger has clearly moved sideways. A clear turn back within
 * the same touch counts as a new swipe the other way, so zigzags need no lift.
 */
export class SwipeTracker {
  private startX = 0;
  private startY = 0;
  private farthest = 0;
  private fired: -1 | 0 | 1 = 0;
  private active = false;
  constructor(readonly threshold = 24, readonly turnBack = 40) {}
  down(x: number, y = 0) {
    this.startX = this.farthest = x;
    this.startY = y;
    this.fired = 0;
    this.active = true;
  }
  /** First sideways move past the threshold, unless the gesture is mostly vertical. */
  private first(x: number, y: number): -1 | 0 | 1 {
    const dx = x - this.startX;
    if (Math.abs(dx) < this.threshold || Math.abs(dx) < Math.abs(y - this.startY)) return 0;
    this.fired = dx < 0 ? -1 : 1;
    this.farthest = x;
    return this.fired;
  }
  move(x: number, y = this.startY): -1 | 0 | 1 {
    if (!this.active) return 0;
    if (!this.fired) return this.first(x, y);
    // Same direction: remember how far it went, but never take a second lane.
    if ((x - this.farthest) * this.fired > 0) {
      this.farthest = x;
      return 0;
    }
    // The small hook of a lifting finger is ignored; a real turn back is not.
    if (Math.abs(x - this.farthest) < this.turnBack) return 0;
    this.fired = this.fired === 1 ? -1 : 1;
    this.farthest = x;
    return this.fired;
  }
  /** A quick flick may end before any move event: judge it where it lifted. */
  up(x?: number, y = this.startY): -1 | 0 | 1 {
    const step = this.active && !this.fired && x !== undefined ? this.first(x, y) : 0;
    this.active = false;
    return step;
  }
}
export const stepLane = (lane: Lane, step: -1 | 0 | 1) =>
  Math.max(0, Math.min(2, lane + step)) as Lane;
