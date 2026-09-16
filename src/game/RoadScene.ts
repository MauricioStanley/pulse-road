import Phaser from "phaser";
import type { Lane, Note } from "../core/chart";
import type { Judgment } from "../core/rules";
import { firstNoteAt } from "../core/visible";
import { themes, getTheme, colorNumber, type ThemeId } from "../themes";

export interface RoadView {
  mode: string;
  time: number;
  notes: readonly Note[];
  judged?: { has(id: number): boolean };
  reduced: boolean;
  combo: number;
  active: boolean;
  travel?: number;
  easterEggs?: boolean;
}
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  color: number;
};
const IVORY = 0xeaf6ef;
export class RoadScene extends Phaser.Scene {
  private palette = getTheme("mint");
  private ink!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Image;
  private sparks: Spark[] = [];
  private lane: Lane = 1;
  private ballX = 0;
  private impact = -10;
  private laneFlash = [0, 0, 0];
  private badFlash = -10;
  private perfectFlash = -10;
  getView!: () => RoadView;
  onFrame!: () => void;

  constructor() {
    super("Road");
  }
  setTheme(id: ThemeId) {
    this.palette = getTheme(id);
    if (this.ball) this.ball.setTexture(`orb-${this.palette.id}`);
  }
  create() {
    this.ink = this.add.graphics();
    for (const theme of themes) {
      const texture = this.textures.createCanvas(`orb-${theme.id}`, 128, 128)!;
      const ctx = texture.getContext();
      const halo = ctx.createRadialGradient(64, 64, 18, 64, 64, 64);
      halo.addColorStop(0, `${theme.accent}80`);
      halo.addColorStop(1, `${theme.accent}00`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, 128, 128);
      const sphere = ctx.createRadialGradient(50, 43, 2, 64, 64, 31);
      sphere.addColorStop(0, "#ffffff");
      sphere.addColorStop(0.45, "#eafcf0");
      sphere.addColorStop(0.8, theme.accent);
      sphere.addColorStop(1, theme.dark);
      ctx.fillStyle = sphere;
      ctx.beginPath();
      ctx.arc(64, 64, 31, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffffcc";
      ctx.beginPath();
      ctx.ellipse(53, 49, 9, 5, -0.6, 0, Math.PI * 2);
      ctx.fill();
      texture.refresh();
    }
    this.ball = this.add.image(
      this.scale.width / 2,
      this.scale.height * 0.7,
      `orb-${this.palette.id}`,
    );
    this.ballX = this.scale.width / 2;
  }
  reset() {
    this.lane = 1;
    this.sparks = [];
    this.laneFlash = [0, 0, 0];
    this.impact = -10;
    this.badFlash = -10;
    this.perfectFlash = -10;
  }
  tap(lane: Lane) {
    // Immediate steering; the landing clock owns the jump and the score.
    const now = performance.now() / 1000;
    this.lane = lane;
    this.impact = now;
    this.laneFlash[lane] = now;
  }
  hit(lane: Lane, judgment: Judgment, reduced: boolean) {
    // An expired/wrong note must not steer the ball or trigger a delayed jump.
    const now = performance.now() / 1000;
    if (judgment === "miss") this.badFlash = now;
    if (judgment === "perfect") this.perfectFlash = now;
    if (!reduced) {
      const p = this.project(lane, 1);
      for (let i = 0; i < (judgment === "perfect" ? 16 : 6); i++) {
        const angle = i * 2.4;
        this.sparks.push({
          x: p.x,
          y: p.y - 20,
          vx: Math.cos(angle) * (35 + i * 6),
          vy: -35 - Math.abs(Math.sin(angle)) * 100,
          born: now,
          color: judgment === "perfect" && i % 3 === 0 ? 0xffffff : colorNumber(judgment === "miss" ? this.palette.hazard : this.palette.accent),
        });
      }
      if (this.sparks.length > 65)
        this.sparks.splice(0, this.sparks.length - 65);
    }
  }
  private project(lane: number, depth: number) {
    const w = this.scale.width,
      h = this.scale.height;
    const q = Math.sign(depth) * Math.pow(Math.abs(depth), 1.65);
    const half = w * (0.055 + 0.425 * q);
    return {
      x: w / 2 + (lane - 1) * half * 0.66,
      y: h * (0.25 + 0.47 * q),
      half,
    };
  }
  private quad(points: number[], color: number, alpha = 1) {
    this.ink.fillStyle(color, alpha);
    this.ink.beginPath();
    this.ink.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2)
      this.ink.lineTo(points[i], points[i + 1]);
    this.ink.closePath();
    this.ink.fillPath();
  }
  private tile(
    lane: number,
    depth: number,
    obstacle: boolean,
    crystal: boolean,
    now: number,
  ) {
    const MINT = colorNumber(this.palette.accent),
      CORAL = colorNumber(this.palette.hazard);
    const p = this.project(lane, depth),
      back = this.project(lane, depth - 0.065);
    const width = p.half * 0.56,
      bw = back.half * 0.56,
      extrusion = Math.max(2, depth * 9);
    const color = obstacle ? CORAL : IVORY;
    const alpha = Math.min(1, Math.max(0.12, depth * 1.8));
    this.quad(
      [
        p.x - width / 2,
        p.y,
        p.x + width / 2,
        p.y,
        p.x + width / 2,
        p.y + extrusion,
        p.x - width / 2,
        p.y + extrusion,
      ],
      obstacle ? 0x843f42 : 0x4e897f,
      alpha,
    );
    this.quad(
      [
        back.x - bw / 2,
        back.y,
        back.x + bw / 2,
        back.y,
        p.x + width / 2,
        p.y,
        p.x - width / 2,
        p.y,
      ],
      color,
      alpha,
    );
    if (obstacle) {
      this.ink.lineStyle(Math.max(1, depth * 2), 0x512c37, alpha);
      this.ink.lineBetween(
        p.x - width * 0.18,
        p.y - extrusion * 0.5,
        p.x + width * 0.18,
        back.y + extrusion * 0.4,
      );
      this.ink.lineBetween(
        p.x + width * 0.18,
        p.y - extrusion * 0.5,
        p.x - width * 0.18,
        back.y + extrusion * 0.4,
      );
      this.ink.fillStyle(CORAL, alpha);
      for (let i = -1; i <= 1; i++)
        this.ink.fillTriangle(
          p.x + i * width * 0.24 - 5 * depth,
          back.y + 4,
          p.x + i * width * 0.24 + 5 * depth,
          back.y + 4,
          p.x + i * width * 0.24,
          back.y - 10 * depth,
        );
    } else {
      this.ink.lineStyle(1, 0xffffff, alpha * 0.85);
      this.ink.lineBetween(back.x - bw / 2, back.y, back.x + bw / 2, back.y);
      if (crystal) {
        const cy = back.y - 10 * depth + Math.sin(now * 3) * 2;
        const s = 10 * Math.max(0.3, depth);
        this.quad(
          [p.x, cy - s, p.x + s * 0.65, cy, p.x, cy + s, p.x - s * 0.65, cy],
          MINT,
          alpha,
        );
        this.ink.lineStyle(1, 0xeafff5, alpha);
        this.ink.lineBetween(p.x, cy - s, p.x, cy + s);
      }
    }
  }
  private drawEasterEgg(time: number, reduced: boolean) {
    // Original roadside geometry, not collectible hazards or borrowed sprites.
    const event = Math.floor((time - 6) / 12);
    const age = time - (6 + event * 12);
    if (event < 0 || event > 5 || age > 7) return;
    const g = this.ink, w = this.scale.width, h = this.scale.height;
    const x = event % 2 ? w - 34 : 34;
    const y = h * 0.40 + (reduced ? 0 : Math.sin(age * 1.8) * 3);
    const alpha = reduced ? 0.8 : Math.min(0.85, age * 2, (7 - age) * 2);
    const kind = event % 4;
    if (kind === 0) {
      // A speedy pair of gold rings.
      g.lineStyle(4, 0xffdc80, alpha);
      g.strokeEllipse(x - 8, y, 17, 25);
      g.strokeEllipse(x + 9, y - 9, 17, 25);
      g.lineStyle(1, 0xfff6d8, alpha);
      g.lineBetween(x - 13, y - 7, x - 9, y - 10);
    } else if (kind === 1) {
      // A bonus box with our four-point pulse emblem.
      g.fillStyle(0xd99a49, alpha); g.fillRoundedRect(x - 18, y - 17, 36, 34, 4);
      g.lineStyle(2, 0xffe1a3, alpha); g.strokeRoundedRect(x - 18, y - 17, 36, 34, 4);
      this.quad([x,y-10,x+4,y-3,x+10,y,x+4,y+3,x,y+10,x-4,y+3,x-10,y,x-4,y-3],0xfff6d8,alpha);
    } else if (kind === 2) {
      // A miniature voxel garden.
      g.fillStyle(0x846148, alpha); g.fillRect(x-18,y-4,36,28);
      g.fillStyle(0xa4d88b, alpha); g.fillRect(x-18,y-12,36,12);
      g.fillStyle(0x658f53, alpha); g.fillRect(x-10,y,8,6); g.fillRect(x+7,y,7,9);
      g.fillStyle(0xb88c61,alpha); g.fillRect(x-13,y+11,6,6); g.fillRect(x+8,y+16,5,5);
    } else {
      // Two linked arcade portals, drawn with the game's own visual language.
      g.lineStyle(3,0x85dfff,alpha); g.strokeEllipse(x-8,y-4,17,38);
      g.lineStyle(3,0xffc795,alpha); g.strokeEllipse(x+9,y+7,17,38);
    }
  }
  update(_time: number, delta: number) {
    if (!this.ink || !this.getView) return;
    this.onFrame?.();
    const MINT = colorNumber(this.palette.accent),
      CORAL = colorNumber(this.palette.hazard);
    const view = this.getView(),
      g = this.ink,
      w = this.scale.width,
      h = this.scale.height;
    const now = performance.now() / 1000;
    const idle = !["playing", "countdown", "paused", "tutorial"].includes(
      view.mode,
    );
    const travel = idle ? (view.reduced ? 0 : now * 0.55) : view.time;
    g.clear();
    // Fixed perspective geometry keeps travel independent from display frame rate.
    const horizon = h * 0.25;
    for (let i = 0; i < 35; i++) {
      const x = (((i * 137.3 + 29) % 479) / 479) * w;
      const y = (((i * 83.7 + 71) % 503) / 503) * h * 0.79;
      g.fillStyle(0xa4bec5, 0.12 + (i % 3) * 0.07);
      g.fillCircle(x, y, i % 5 === 0 ? 1.3 : 0.7);
    }
    g.lineStyle(1, 0x375961, 0.35);
    g.strokeEllipse(w / 2, horizon + 5, w * 0.72, h * 0.08);
    g.strokeEllipse(w / 2, horizon + 5, w * 0.45, h * 0.05);
    this.quad(
      [
        w * 0.455,
        horizon,
        w * 0.545,
        horizon,
        w * 1.03,
        h * 0.91,
        -w * 0.03,
        h * 0.91,
      ],
      colorNumber(this.palette.road),
      0.52,
    );
    for (let lane = -0.5; lane <= 2.5; lane++) {
      const a = this.project(lane, 0),
        b = this.project(lane, 1.14);
      g.lineStyle(
        lane === -0.5 || lane === 2.5 ? 1.4 : 1,
        MINT,
        lane === -0.5 || lane === 2.5 ? 0.27 : 0.12,
      );
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let i = 0; i < 14; i++) {
      const depth = ((i / 14 + (travel % 1) / 14) % 1) * 1.15;
      const a = this.project(-0.5, depth),
        b = this.project(2.5, depth);
      g.lineStyle(1, MINT, 0.1 * depth);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let lane = 0; lane < 3; lane++) {
      const age = now - this.laneFlash[lane];
      if (age < 0.3) {
        const a = this.project(lane - 0.45, 0.25),
          b = this.project(lane + 0.45, 0.25);
        const c = this.project(lane + 0.45, 1.12),
          d = this.project(lane - 0.45, 1.12);
        this.quad(
          [a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y],
          MINT,
          (0.3 - age) * 0.7,
        );
      }
    }
    if (!idle && view.easterEggs) this.drawEasterEgg(view.time, view.reduced);
    if (idle) {
      const demo = [1, 0, 1, 2, 1, 2, 0, 1];
      for (let i = 7; i >= 0; i--) {
        const depth = ((i / 8 + travel * 0.18) % 1) * 1.1;
        this.tile(demo[i], depth, false, i % 3 === 0, now);
      }
    } else {
      const first = firstNoteAt(view.notes, view.time - 0.25);
      for (let index = first; index < view.notes.length; index++) {
        const note = view.notes[index];
        const until = note.time - view.time;
        const approach = view.travel ?? 2;
        if (until > approach + 0.1) break;
        if (view.judged?.has(note.id)) continue;
        const depth = 1 - until / approach;
        for (const lane of note.obstacles)
          this.tile(lane, depth, true, false, now);
        this.tile(note.lane, depth, false, note.crystal, now);
      }
    }
    const left = this.project(-0.48, 1),
      right = this.project(2.48, 1);
    g.lineStyle(8, MINT, 0.035);
    g.lineBetween(left.x, left.y, right.x, right.y);
    g.lineStyle(2, MINT, idle ? 0.22 : 0.65);
    g.lineBetween(left.x, left.y, right.x, right.y);
    for (let lane = 0; lane < 3; lane++) {
      const p = this.project(lane, 1);
      g.lineStyle(1.5, MINT, 0.45);
      g.strokeEllipse(p.x, p.y + 1, p.half * 0.37, 14);
    }
    const target = this.project(idle ? 1 : this.lane, 1);
    // Fast, frame-rate-independent response: starts on the next frame and
    // settles within 100 ms at 30/60/120 FPS, even across the full track.
    this.ballX += (target.x - this.ballX) * (1 - Math.exp(-delta / 14));
    if (Math.abs(target.x - this.ballX) < 0.5) this.ballX = target.x;
    let upcoming: Note | undefined;
    for (let index = firstNoteAt(view.notes, view.time); index < view.notes.length; index++) {
      if (!view.judged?.has(view.notes[index].id)) { upcoming = view.notes[index]; break; }
    }
    const flight = upcoming ? Math.min(0.26, (upcoming.time - (view.notes[upcoming.id - 1]?.time ?? upcoming.time - 1)) * 0.82) : 0.26;
    const untilLanding = upcoming ? upcoming.time - view.time : Infinity;
    // The hop meets the platform at its musical landing, even if steering early.
    const jump = view.reduced ? 0 : idle ? Math.sin(now * 2) * 6 :
      untilLanding <= flight ? Math.sin((1 - untilLanding / flight) * Math.PI) * 17 : 0;
    const restingY = idle ? Math.min(target.y, h - (h <= 720 ? 326 : 365)) : target.y;
    g.fillStyle(0x030d16, 0.5);
    g.fillEllipse(this.ballX, restingY + 2, 48 - jump * 0.4, 10);
    if (!view.reduced && view.combo >= 10) {
      for (let i = 5; i >= 1; i--) {
        g.fillStyle(MINT, 0.12 - i * 0.016);
        g.fillCircle(this.ballX, target.y - 20 - i * 11, 11 - i);
      }
    }
    const glowAge = now - this.perfectFlash;
    if (glowAge < 0.22) {
      g.lineStyle(2, IVORY, view.reduced ? 0.65 : (1 - glowAge / 0.22) * 0.85);
      g.strokeCircle(this.ballX, restingY - 24 - jump, view.reduced ? 29 : 27 + glowAge * 46);
    }
    this.ball
      .setPosition(this.ballX, restingY - 24 - jump)
      .setDisplaySize(100, 100)
      .setAlpha(view.mode === "results" ? 0.3 : 1);
    if (!view.reduced)
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i],
          t = now - s.born;
        if (t > 0.6) {
          this.sparks.splice(i, 1);
          continue;
        }
        g.fillStyle(s.color, 1 - t / 0.6);
        const sx = s.x + s.vx * t, sy = s.y + s.vy * t + 120 * t * t;
        const size = Math.max(1, 4 - t * 5);
        if (i % 3 === 0) {
          g.fillRect(sx - size, sy - 0.7, size * 2, 1.4);
          g.fillRect(sx - 0.7, sy - size, 1.4, size * 2);
        } else g.fillCircle(sx, sy, size * 0.6);
      }
    if (now - this.badFlash < 0.18 && !view.reduced) {
      g.fillStyle(CORAL, (0.18 - (now - this.badFlash)) * 0.18);
      g.fillRect(0, 0, w, h);
    }
  }
}
