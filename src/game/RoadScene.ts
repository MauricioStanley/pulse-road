import Phaser from "phaser";
import type { Lane, Note, PowerId } from "../core/chart";
import type { Judgment } from "../core/rules";
import { firstNoteAt } from "../core/visible";
import { themes, getTheme, colorNumber, type ThemeId } from "../themes";
import { skins, getSkin, type Motes, type OrbPaint, type Skin, type SkinId } from "../skins";

export interface RoadView {
  mode: string;
  time: number;
  notes: readonly Note[];
  judged?: { has(id: number): boolean };
  reduced: boolean;
  combo: number;
  active: boolean;
  travel?: number;
  /** Song tempo. While music plays, the whole world pulses on its kick. */
  bpm?: number;
  /** 0–100. Low energy adds a heartbeat warning at the screen edges. */
  energy?: number;
  /** Overrides the combo-30 Fever (Infinito perks change the threshold). */
  fever?: boolean;
  /** Song section index, when the music loops (Infinito). */
  section?: number;
  /** 0–1 hue for Infinito stages: towers and waves change color per stage. */
  stageHue?: number;
  /** Lane of your record run at this moment; undefined hides the ghost. */
  ghostLane?: Lane;
  shields?: number;
  doubleActive?: boolean;
  slowActive?: boolean;
  /** Relics already in the collection are drawn as faint outlines. */
  relicFound?: (id: string) => boolean;
}
type Spark = { x: number; y: number; vx: number; vy: number; born: number; color: number };
type Mote = Spark & { kind: Motes; size: number; life: number };
interface Landing {
  lane: Lane;
  judgment: Judgment;
  born: number;
  crystal: boolean;
  relic?: boolean;
  power?: PowerId;
  shielded?: boolean;
}
type Shard = { vx: number; vy: number; spin: number; size: number; color: number };
export interface HitExtras {
  relic?: boolean;
  power?: PowerId;
  shielded?: boolean;
  saved?: boolean;
}
const IVORY = 0xeaf6ef;
const GOLD = 0xffd35c;
const TAU = Math.PI * 2;
export const POWER_COLORS: Record<PowerId, number> = {
  shield: 0x7fe3ff,
  heart: 0xff7fb0,
  double: GOLD,
  slow: 0xb69cff,
};
/** Same threshold as the ×4 multiplier: Fever is its visible reward. */
export const FEVER_COMBO = 30;
// Songs and charts share 16-second sections: intro, build, breath, drive, finale.
const SECTION_ENERGY = [0.7, 0.9, 0.45, 1, 1.15];
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** Pastel rainbow as a 0xRRGGBB number. */
export const hue = (h: number, saturation = 0.55) => {
  const channel = (n: number) => {
    const k = (n + (((h % 1) + 1) % 1) * 6) % 6;
    return Math.round(255 * (1 - saturation * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return (channel(5) << 16) | (channel(3) << 8) | channel(1);
};
export class RoadScene extends Phaser.Scene {
  private palette = getTheme("mint");
  private skin: Skin = getSkin("classic");
  private ink!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Image;
  private sparks: Spark[] = [];
  private motes: Mote[] = [];
  private landings: Landing[] = [];
  private shards: Shard[] = [];
  private trail: number[] = [];
  private trailClock = 0;
  private moteClock = 0;
  private lane: Lane = 1;
  private ballX = 0;
  private ghostX = -1;
  private roll = 0;
  private impact = -10;
  private laneFlash = [0, 0, 0];
  private badFlash = -10;
  private perfectFlash = -10;
  private landAt = -10;
  private feverAt = -10;
  private savedAt = -10;
  private wasFever = false;
  private sectionAt = -10;
  private stageAt = -10;
  private lastSection = -1;
  private shattered = false;
  private shatterAt = -10;
  private shatterX = 0;
  private shatterY = 0;
  getView!: () => RoadView;
  onFrame!: () => void;

  constructor() {
    super("Road");
  }
  private orbKey() {
    return this.skin.orb ? `orb-${this.skin.id}` : `orb-${this.palette.id}`;
  }
  setTheme(id: ThemeId) {
    this.palette = getTheme(id);
    if (this.ball) this.ball.setTexture(this.orbKey());
  }
  setSkin(id: SkinId) {
    this.skin = getSkin(id);
    if (this.ball) this.ball.setTexture(this.orbKey());
  }
  private paintOrb(key: string, paint: OrbPaint, pattern?: Skin["pattern"]) {
    const texture = this.textures.createCanvas(key, 128, 128)!;
    const ctx = texture.getContext();
    const halo = ctx.createRadialGradient(64, 64, 18, 64, 64, 64);
    halo.addColorStop(0, `${paint.halo}80`);
    halo.addColorStop(1, `${paint.halo}00`);
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 128, 128);
    const sphere = ctx.createRadialGradient(50, 43, 2, 64, 64, 31);
    sphere.addColorStop(0, "#ffffff");
    sphere.addColorStop(0.45, paint.light);
    sphere.addColorStop(0.8, paint.mid);
    sphere.addColorStop(1, paint.edge);
    ctx.fillStyle = sphere;
    if (pattern === "prism" && typeof ctx.createConicGradient === "function") {
      const rainbow = ctx.createConicGradient(0.6, 64, 64);
      ["#ff8fa3", "#ffd37a", "#9dff9a", "#7ae6ff", "#b69cff", "#ff8fa3"].forEach((color, i) =>
        rainbow.addColorStop(i / 5, color),
      );
      ctx.fillStyle = rainbow;
    } else if (pattern === "chrome") {
      const bands = ctx.createLinearGradient(0, 33, 0, 95);
      ([["#ffffff", 0], ["#dfe6ec", 0.3], ["#6f7a86", 0.42], ["#f2f6f9", 0.55], ["#8a95a1", 0.75], ["#39424c", 1]] as const).forEach(([color, stop]) =>
        bands.addColorStop(stop, color),
      );
      ctx.fillStyle = bands;
    }
    ctx.beginPath();
    ctx.arc(64, 64, 31, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.clip();
    const stroke = (color: string, width: number, draw: () => void) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      draw();
      ctx.stroke();
    };
    if (pattern === "prism") {
      const shade = ctx.createRadialGradient(52, 46, 3, 64, 64, 32);
      shade.addColorStop(0, "#ffffffcc");
      shade.addColorStop(0.55, "#ffffff00");
      shade.addColorStop(1, "#1b1f4a66");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 128, 128);
    } else if (pattern === "flame") {
      for (let i = 0; i < 4; i++) {
        const flame = ctx.createRadialGradient(56 + i * 6, 84 - i * 4, 1, 60 + i * 4, 80, 18 - i * 2);
        flame.addColorStop(0, "#fff6c8cc");
        flame.addColorStop(1, "#ff7b2e00");
        ctx.fillStyle = flame;
        ctx.fillRect(0, 0, 128, 128);
      }
    } else if (pattern === "facets") {
      for (const [a, b, c, d] of [[34, 58, 94, 46], [44, 90, 80, 34], [50, 36, 88, 86], [36, 76, 92, 70]])
        stroke("#ffffff99", 1.4, () => { ctx.moveTo(a, b); ctx.lineTo(c, d); });
    } else if (pattern === "stars") {
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 14; i++) {
        ctx.globalAlpha = 0.4 + hash(i) * 0.6;
        ctx.beginPath();
        ctx.arc(36 + hash(i + 20) * 56, 36 + hash(i + 40) * 56, 0.6 + hash(i + 60) * 1.3, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (pattern === "rim") {
      stroke("#fff3cf", 3, () => ctx.arc(64, 64, 30, 0, TAU));
    } else if (pattern === "neon") {
      stroke("#ff4fd8", 3, () => ctx.arc(64, 64, 29, 0, TAU));
      stroke("#7ef6ff", 2, () => ctx.arc(64, 64, 20, 0, TAU));
      stroke("#ffd6fb", 1.2, () => ctx.arc(64, 64, 11, 0, TAU));
    } else if (pattern === "waves") {
      for (let row = 0; row < 4; row++)
        stroke("#ffffff55", 1.5, () => {
          for (let x = 30; x <= 98; x += 2) {
            const y = 58 + row * 9 + Math.sin(x / 5 + row) * 2.5;
            if (x === 30) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
    } else if (pattern === "cracks") {
      ctx.shadowColor = "#ff6a1f";
      ctx.shadowBlur = 6;
      for (const path of [[[40, 50], [52, 58], [50, 70], [62, 80]], [[70, 36], [66, 50], [78, 60], [90, 58]], [[58, 92], [66, 82], [80, 84]]])
        stroke("#ffb347", 2.2, () => path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))));
      ctx.shadowBlur = 0;
    } else if (pattern === "eye") {
      const iris = ctx.createRadialGradient(64, 64, 2, 64, 64, 16);
      iris.addColorStop(0, "#ffd0d0");
      iris.addColorStop(0.4, "#ff2e4d");
      iris.addColorStop(1, "#ff2e4d00");
      ctx.fillStyle = iris;
      ctx.fillRect(40, 40, 48, 48);
      ctx.fillStyle = "#0a0103";
      ctx.beginPath();
      ctx.ellipse(64, 64, 3.5, 12, 0, 0, TAU);
      ctx.fill();
    } else if (pattern === "infinity") {
      stroke("#2e6fa8", 3.5, () => {
        for (let i = 0; i <= 64; i++) {
          const t = (i / 64) * TAU;
          const d = 1 + Math.sin(t) ** 2;
          const x = 64 + (20 * Math.cos(t)) / d;
          const y = 64 + (20 * Math.sin(t) * Math.cos(t)) / d;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
      });
    } else if (pattern === "runes") {
      stroke("#7a5314aa", 1.4, () => ctx.arc(64, 64, 24, 0, TAU));
      stroke("#7a5314aa", 1.2, () => ctx.arc(64, 64, 15, 0, TAU));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU, r = i % 3 ? 20 : 23;
        stroke("#7a5314cc", 1.6, () => {
          ctx.moveTo(64 + Math.cos(a) * 16, 64 + Math.sin(a) * 16);
          ctx.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
        });
      }
    }
    ctx.restore();
    ctx.fillStyle = pattern === "rim" || pattern === "cracks" ? "#ffffff55" : "#ffffffcc";
    ctx.beginPath();
    ctx.ellipse(53, 49, 9, 5, -0.6, 0, TAU);
    ctx.fill();
    if (pattern === "sparkle") {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(78, 40);
      for (const [x, y] of [[80, 46], [86, 48], [80, 50], [78, 56], [76, 50], [70, 48], [76, 46]]) ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    }
    texture.refresh();
  }
  create() {
    this.ink = this.add.graphics();
    for (const theme of themes)
      this.paintOrb(`orb-${theme.id}`, { light: "#eafcf0", mid: theme.accent, edge: theme.dark, halo: theme.accent });
    for (const skin of skins) if (skin.orb) this.paintOrb(`orb-${skin.id}`, skin.orb, skin.pattern);
    this.ball = this.add.image(
      this.scale.width / 2,
      this.scale.height * 0.7,
      this.orbKey(),
    );
    this.ballX = this.scale.width / 2;
  }
  reset() {
    this.lane = 1;
    this.sparks = [];
    this.motes = [];
    this.landings = [];
    this.shards = [];
    this.trail = [];
    this.laneFlash = [0, 0, 0];
    this.impact = -10;
    this.badFlash = -10;
    this.perfectFlash = -10;
    this.landAt = -10;
    this.feverAt = -10;
    this.savedAt = -10;
    this.wasFever = false;
    this.sectionAt = -10;
    this.stageAt = -10;
    this.lastSection = -1;
    this.shattered = false;
    this.shatterAt = -10;
    this.ghostX = -1;
    this.roll = 0;
  }
  tap(lane: Lane) {
    // Immediate steering; the landing clock owns the jump and the score.
    const now = performance.now() / 1000;
    this.lane = lane;
    this.impact = now;
    this.laneFlash[lane] = now;
  }
  private trailColor(index: number, now: number) {
    if (this.skin.pattern === "prism") return hue((now * 0.35 + index * 0.07) % 1);
    return colorNumber(this.skin.trail ?? this.palette.accent);
  }
  hit(lane: Lane, judgment: Judgment, reduced: boolean, crystal = false, extras: HitExtras = {}) {
    // An expired/wrong note must not steer the ball or trigger a delayed jump.
    const now = performance.now() / 1000;
    if (judgment === "miss" && !extras.shielded) {
      this.badFlash = now;
      if (!reduced) this.cameras?.main?.shake(180, 0.007);
    } else if (judgment !== "miss") this.landAt = now;
    if (judgment === "perfect") this.perfectFlash = now;
    if (extras.saved) this.savedAt = now;
    this.landings.push({ lane, judgment, born: now, crystal, relic: extras.relic, power: extras.power, shielded: extras.shielded });
    if (this.landings.length > 8) this.landings.shift();
    if (!reduced) {
      const p = this.project(lane, 1);
      const count = extras.relic ? 28 : judgment === "perfect" ? 16 : 6;
      const speed = extras.relic ? 1.8 : 1;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.4;
        this.sparks.push({
          x: p.x,
          y: p.y - 20,
          vx: Math.cos(angle) * (35 + i * 6) * speed,
          vy: (-35 - Math.abs(Math.sin(angle)) * 100) * speed,
          born: now,
          color: extras.relic ? (i % 2 ? GOLD : 0xffffff)
            : extras.shielded ? POWER_COLORS.shield
            : judgment === "miss" ? colorNumber(this.palette.hazard)
            : judgment === "perfect" && i % 3 === 0 ? 0xffffff : this.trailColor(i, now),
        });
      }
      if (this.sparks.length > 70)
        this.sparks.splice(0, this.sparks.length - 70);
    }
  }
  /** Infinito: a new stage. A wide flash and a wave sweep the road. */
  stageUp() {
    const now = performance.now() / 1000;
    this.stageAt = now;
    this.sectionAt = now;
  }
  /** The run is lost: the orb breaks apart where it stood. */
  shatter(reduced: boolean) {
    const now = performance.now() / 1000;
    this.shattered = true;
    this.shatterAt = now;
    this.shatterX = this.ballX;
    this.shatterY = this.project(this.lane, 1).y - 24;
    this.shards = [];
    if (reduced) return;
    const edge = colorNumber(this.skin.orb?.edge ?? this.palette.dark);
    for (let i = 0; i < 26; i++) {
      const angle = i * 2.39996, speed = 90 + hash(i) * 230;
      this.shards.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150,
        spin: (hash(i + 3) - 0.5) * 16,
        size: 3 + hash(i + 7) * 6,
        color: i % 4 === 0 ? 0xffffff : i % 4 === 1 ? edge : this.trailColor(i, now),
      });
    }
    this.cameras?.main?.shake(320, 0.012);
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
  private outline(points: number[], width: number, color: number, alpha: number) {
    const g = this.ink;
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
    g.closePath();
    g.strokePath();
  }
  private tile(
    lane: number,
    depth: number,
    obstacle: boolean,
    crystal: boolean,
    now: number,
    lift = 0,
    fade = 1,
    tint?: number,
    highlight = 0,
  ) {
    const MINT = colorNumber(this.palette.accent),
      CORAL = colorNumber(this.palette.hazard);
    const g = this.ink;
    const p = this.project(lane, depth),
      back = this.project(lane, depth - 0.065);
    const width = p.half * 0.56,
      bw = back.half * 0.56,
      extrusion = Math.max(2, depth * 9);
    const y = p.y + lift, by = back.y + lift;
    const color = tint ?? (obstacle ? CORAL : IVORY);
    const alpha = Math.min(1, Math.max(0.12, depth * 1.8)) * fade;
    this.quad(
      [p.x - width / 2, y, p.x + width / 2, y, p.x + width / 2, y + extrusion, p.x - width / 2, y + extrusion],
      obstacle ? 0x843f42 : 0x4e897f,
      alpha,
    );
    const top = [back.x - bw / 2, by, back.x + bw / 2, by, p.x + width / 2, y, p.x - width / 2, y];
    this.quad(top, color, alpha);
    // Bevel: a lighter lip along the front edge gives the slab some volume.
    const lip = Math.max(1, depth * 3.2);
    this.quad([p.x - width / 2, y - lip, p.x + width / 2, y - lip, p.x + width / 2, y, p.x - width / 2, y], 0xffffff, alpha * (obstacle ? 0.12 : 0.4));
    // The next platform to land on: a soft accent outline that breathes.
    if (highlight > 0) this.outline(top, Math.max(1.5, depth * 3), MINT, alpha * highlight);
    if (obstacle) {
      g.lineStyle(Math.max(1, depth * 2), 0x512c37, alpha);
      g.lineBetween(p.x - width * 0.18, y - extrusion * 0.5, p.x + width * 0.18, by + extrusion * 0.4);
      g.lineBetween(p.x + width * 0.18, y - extrusion * 0.5, p.x - width * 0.18, by + extrusion * 0.4);
      g.fillStyle(CORAL, alpha);
      for (let i = -1; i <= 1; i++)
        g.fillTriangle(
          p.x + i * width * 0.24 - 5 * depth, by + 4,
          p.x + i * width * 0.24 + 5 * depth, by + 4,
          p.x + i * width * 0.24, by - 10 * depth,
        );
    } else {
      g.lineStyle(1, 0xffffff, alpha * 0.85);
      g.lineBetween(back.x - bw / 2, by, back.x + bw / 2, by);
      if (crystal) {
        const cy = by - 10 * depth + Math.sin(now * 3) * 2;
        const s = 10 * Math.max(0.3, depth);
        this.quad([p.x, cy - s, p.x + s * 0.65, cy, p.x, cy + s, p.x - s * 0.65, cy], MINT, alpha);
        g.lineStyle(1, 0xeafff5, alpha);
        g.lineBetween(p.x, cy - s, p.x, cy + s);
      }
    }
  }
  /** A power-up floating over its platform, inside a colored bubble. */
  private drawPower(kind: PowerId, x: number, y: number, s: number, alpha: number) {
    const g = this.ink, color = POWER_COLORS[kind];
    g.fillStyle(color, 0.18 * alpha);
    g.fillCircle(x, y, s * 1.35);
    g.lineStyle(Math.max(1, s * 0.12), color, 0.9 * alpha);
    g.strokeCircle(x, y, s * 1.35);
    g.fillStyle(color, alpha);
    if (kind === "shield") {
      this.quad([x - s * 0.7, y - s * 0.6, x, y - s * 0.9, x + s * 0.7, y - s * 0.6, x + s * 0.55, y + s * 0.25, x, y + s * 0.9, x - s * 0.55, y + s * 0.25], color, alpha);
    } else if (kind === "heart") {
      g.fillCircle(x - s * 0.33, y - s * 0.2, s * 0.4);
      g.fillCircle(x + s * 0.33, y - s * 0.2, s * 0.4);
      g.fillTriangle(x - s * 0.72, y - s * 0.05, x + s * 0.72, y - s * 0.05, x, y + s * 0.8);
    } else if (kind === "double") {
      // Two stacked chevrons: "more, faster".
      for (const dy of [-0.35, 0.2])
        g.fillTriangle(x - s * 0.7, y + s * (dy + 0.35), x + s * 0.7, y + s * (dy + 0.35), x, y + s * (dy - 0.3));
    } else {
      g.fillTriangle(x - s * 0.6, y - s * 0.75, x + s * 0.6, y - s * 0.75, x, y);
      g.fillTriangle(x - s * 0.6, y + s * 0.75, x + s * 0.6, y + s * 0.75, x, y);
    }
  }
  /** A golden relic token: spins, glows and calls from a column of light. */
  private drawRelic(x: number, y: number, s: number, alpha: number, now: number, found: boolean, beacon = true) {
    const g = this.ink;
    const spin = Math.cos(now * 2.4);
    const hex: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      hex.push(x + Math.cos(a) * s * Math.max(0.15, Math.abs(spin)), y + Math.sin(a) * s);
    }
    if (found) {
      this.outline(hex, 1.2, GOLD, 0.45 * alpha);
      return;
    }
    // A column of light calls from far away; the halo breathes.
    if (beacon) for (const [width, glow] of [[2.2, 0.05], [1.2, 0.08], [0.45, 0.16]]) {
      g.fillStyle(GOLD, glow * alpha);
      g.fillRect(x - s * width * 0.5, 0, s * width, y);
    }
    const breathe = 1 + Math.sin(now * 4) * 0.12;
    g.fillStyle(GOLD, 0.1 * alpha);
    g.fillCircle(x, y, s * 2.6 * breathe);
    g.fillStyle(0xfff3cf, 0.14 * alpha);
    g.fillCircle(x, y, s * 1.6 * breathe);
    this.quad(hex, spin > 0 ? GOLD : 0xe0a93a, alpha);
    this.outline(hex, Math.max(1, s * 0.12), 0xfff3cf, alpha);
    // An eighth-note glyph, readable at any size.
    g.fillStyle(0x7a5314, alpha);
    g.fillCircle(x - s * 0.18 * Math.abs(spin), y + s * 0.35, s * 0.22);
    g.fillRect(x - s * 0.02, y - s * 0.5, Math.max(1, s * 0.1), s * 0.85);
    for (let i = 0; i < 3; i++) {
      const a = now * 2 + (i * TAU) / 3;
      g.fillStyle(0xffffff, 0.9 * alpha);
      g.fillCircle(x + Math.cos(a) * s * 1.6, y + Math.sin(a) * s * 0.6, Math.max(1, s * 0.12));
    }
  }
  private emitMote(x: number, y: number, now: number, fever: boolean) {
    const kind = this.skin.motes;
    const r = hash(now * 97.3), r2 = hash(now * 51.7 + 3);
    const color = kind === "snow" ? 0xffffff : kind === "star" && this.skin.id === "gold" ? GOLD : this.trailColor(Math.floor(r * 10), now);
    const base = { x: x + (r - 0.5) * 22, y: y + (r2 - 0.5) * 14, born: now, kind, color };
    const m: Mote =
      kind === "ember" ? { ...base, vx: (r - 0.5) * 30, vy: -60 - r2 * 50, size: 1.6 + r2 * 1.6, life: 0.7 }
      : kind === "snow" ? { ...base, vx: (r - 0.5) * 40, vy: 20 + r2 * 25, size: 1.2 + r2, life: 0.9 }
      : kind === "star" ? { ...base, vx: 0, vy: 30, size: 2 + r2 * 2.5, life: 0.6 }
      : kind === "bubble" ? { ...base, vx: (r - 0.5) * 20, vy: -40 - r2 * 20, size: 2 + r2 * 3, life: 0.9 }
      : { ...base, vx: (r - 0.5) * 50, vy: 40 + r2 * 40, size: 1.2 + r2 * 1.4, life: 0.5 };
    if (fever) m.size *= 1.3;
    this.motes.push(m);
    if (this.motes.length > 44) this.motes.shift();
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
    const dying = view.mode === "dying";
    const idle = !["playing", "countdown", "paused", "tutorial", "dying"].includes(view.mode);
    const reduced = view.reduced;
    const travel = idle ? (reduced ? 0 : now * 0.55) : view.time;
    // Beat clock: the song while it plays, a slow ambient heartbeat elsewhere.
    const musical = !!view.bpm && (view.mode === "playing" || dying);
    const beatPos = musical ? (view.time * view.bpm!) / 60 : (now * 76) / 60;
    const beatIndex = Math.floor(beatPos),
      phase = beatPos - beatIndex;
    const section = musical ? Math.min(4, view.section ?? Math.floor(view.time / 16)) : -1;
    const intensity = view.mode === "paused" ? 0 : musical ? SECTION_ENERGY[section] : 0.3;
    const beat = reduced ? 0 : Math.exp(-phase * 5.5) * intensity * (beatIndex % 4 === 0 ? 1 : 0.7);
    const fever = !idle && !dying && (view.fever ?? view.combo >= FEVER_COMBO);
    if (fever && !this.wasFever) this.feverAt = now;
    this.wasFever = fever;
    if (musical && section !== this.lastSection) {
      if (this.lastSection >= 0 && section > this.lastSection) this.sectionAt = now;
      this.lastSection = section;
    }
    // Infinito stages recolor the scenery; songs keep the game color.
    const WAVE = view.stageHue === undefined ? MINT : hue(view.stageHue, 0.6);
    // Scenery flows at the same pace as the platforms of this difficulty.
    const flow = idle ? (reduced ? 0 : now * 0.2) : view.time / (view.travel ?? 2);
    g.clear();
    const horizon = h * 0.25;
    // Stars, drawn in six brightness groups: one style change per group.
    for (let group = 0; group < 6; group++) {
      const tier = group % 3, accent = group >= 3;
      g.fillStyle(0xa4bec5, 0.12 + tier * 0.07 + beat * (accent ? 0.35 : 0.08));
      for (let i = tier; i < 35; i += 3) {
        if ((i % 4 === 0) !== accent) continue;
        g.fillCircle((((i * 137.3 + 29) % 479) / 479) * w, (((i * 83.7 + 71) % 503) / 503) * h * 0.79, i % 5 === 0 ? 1.3 : 0.7);
      }
    }
    // Stacked translucent discs read as a soft radial glow.
    const core = w * (0.1 + beat * 0.025);
    for (let k = 4; k >= 1; k--) {
      g.fillStyle(WAVE, (0.012 + beat * 0.016 + (fever ? 0.01 : 0)) * (5 - k));
      g.fillCircle(w / 2, horizon, core * (0.55 + k * 0.38));
    }
    g.lineStyle(1, 0x375961, 0.35);
    g.strokeEllipse(w / 2, horizon + 5, w * 0.72, h * 0.08);
    g.strokeEllipse(w / 2, horizon + 5, w * 0.45, h * 0.05);
    if (!reduced && intensity > 0)
      for (let k = 0; k < 2; k++) {
        // Sonar rings: each lives two beats, so one is always expanding.
        const t = (phase + k) / 2;
        g.lineStyle(1.5, WAVE, (1 - t) * 0.3 * intensity);
        g.strokeEllipse(w / 2, horizon + 5, w * (0.3 + t * 0.8), h * (0.035 + t * 0.085));
      }
    // Equalizer towers beside the road jump on every beat as they pass.
    for (let i = 0; i < 10; i++) {
      const depth = ((((i / 10 + flow / 1.2) % 1) + 1) % 1) * 1.2;
      if (depth < 0.08) continue;
      const fade = Math.min(1, (depth - 0.08) * 4);
      const level = reduced ? 0.25 : beat * (0.35 + 0.65 * hash(i * 7 + beatIndex));
      for (const side of [-1.3, 3.3]) {
        const p = this.project(side, depth);
        const tw = p.half * 0.11, th = p.half * (0.2 + 1.25 * level);
        g.fillStyle(WAVE, (0.05 + 0.14 * level) * fade);
        g.fillRect(p.x - tw, p.y - th, tw * 2, th);
        g.lineStyle(Math.max(1, depth * 2), fever && i % 2 ? IVORY : WAVE, (0.2 + 0.5 * level) * fade);
        g.lineBetween(p.x - tw, p.y - th, p.x + tw, p.y - th);
      }
    }
    const road = [w * 0.455, horizon, w * 0.545, horizon, w * 1.03, h * 0.91, -w * 0.03, h * 0.91];
    this.quad(road, colorNumber(this.palette.road), 0.52);
    if (fever) this.quad(road, WAVE, 0.05 + beat * 0.07);
    if (view.slowActive) this.quad(road, POWER_COLORS.slow, 0.07);
    for (let lane = -0.5; lane <= 2.5; lane++) {
      const a = this.project(lane, 0),
        b = this.project(lane, 1.14);
      const edge = lane === -0.5 || lane === 2.5;
      g.lineStyle(edge ? 1.4 + beat * 1.8 : 1, MINT, edge ? 0.27 + beat * 0.45 + (fever ? 0.2 : 0) : 0.12 + beat * 0.08);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let i = 0; i < 14; i++) {
      const depth = ((i / 14 + (travel % 1) / 14) % 1) * 1.15;
      const a = this.project(-0.5, depth),
        b = this.project(2.5, depth);
      g.lineStyle(1, MINT, (0.1 + beat * 0.14) * depth);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // A bright wave rolls down the road on a new section or Infinito stage.
    const sweep = (now - this.sectionAt) / 0.7;
    if (!reduced && sweep < 1) {
      const depth = sweep * 1.15,
        a = this.project(-0.5, depth),
        b = this.project(2.5, depth);
      g.lineStyle(2 + 12 * depth, WAVE, 0.14 * (1 - sweep));
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(2, IVORY, 0.7 * (1 - sweep));
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    const stageAge = now - this.stageAt;
    if (stageAge < 0.9 && !reduced) {
      g.fillStyle(WAVE, (0.9 - stageAge) * 0.22);
      g.fillRect(0, 0, w, h);
    }
    if (fever && !reduced) {
      // Warp lines from the vanishing point: Fever feels faster.
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * TAU + 0.2;
        const k = (now * 1.3 + hash(i + 9)) % 1;
        const r = w * (0.14 + k * k * 0.95), len = w * (0.03 + k * 0.1);
        const cx = Math.cos(angle), cy = Math.sin(angle);
        g.lineStyle(1 + k * 1.5, i % 3 ? WAVE : IVORY, 0.22 * k);
        g.lineBetween(w / 2 + cx * r, horizon + cy * r, w / 2 + cx * (r + len), horizon + cy * (r + len));
      }
    }
    for (let lane = 0; lane < 3; lane++) {
      const age = now - this.laneFlash[lane];
      if (age < 0.3) {
        const a = this.project(lane - 0.45, 0.25),
          b = this.project(lane + 0.45, 0.25);
        const c = this.project(lane + 0.45, 1.12),
          d = this.project(lane - 0.45, 1.12);
        this.quad([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y], MINT, (0.3 - age) * 0.7);
      }
    }
    let upcoming: Note | undefined;
    if (idle) {
      const demo = [1, 0, 1, 2, 1, 2, 0, 1];
      for (let i = 7; i >= 0; i--) {
        const depth = ((i / 8 + travel * 0.18) % 1) * 1.1;
        this.tile(demo[i], depth, false, i % 3 === 0, now);
      }
    } else {
      const approach = view.travel ?? 2;
      const first = firstNoteAt(view.notes, view.time - 0.25);
      for (let index = first; index < view.notes.length; index++) {
        const note = view.notes[index];
        const until = note.time - view.time;
        if (until > approach + 0.1) break;
        const depth = 1 - until / approach;
        if (view.judged?.has(note.id)) {
          // Hazards keep flowing past; the landed tile lives on as an effect.
          for (const lane of note.obstacles)
            this.tile(lane, depth, true, false, now, 0, Math.min(1, Math.max(0, (1.25 - depth) * 4)));
          continue;
        }
        const next = !upcoming;
        if (next) upcoming = note;
        for (const lane of note.obstacles) this.tile(lane, depth, true, false, now);
        this.tile(note.lane, depth, false, note.crystal, now, 0, 1, undefined, next ? 0.35 + beat * 0.6 : 0);
        if (note.power || note.relic) {
          const p = this.project(note.lane, depth);
          const s = 17 * Math.max(0.35, depth);
          const floatY = p.y - 36 * depth - (reduced ? 0 : Math.sin(now * 3 + note.id) * 3 * depth);
          const alpha = Math.min(1, Math.max(0.15, depth * 1.8));
          if (note.power) this.drawPower(note.power, p.x, floatY, s, alpha);
          if (note.relic) this.drawRelic(p.x, floatY - 8 * depth, s * 1.15, alpha, reduced ? 0 : now, !!view.relicFound?.(note.relic));
        }
      }
    }
    for (let i = this.landings.length - 1; i >= 0; i--) {
      const l = this.landings[i], age = now - l.born;
      const life = l.judgment === "miss" ? 0.5 : l.crystal || l.relic || l.power ? 0.6 : 0.32;
      if (age > life) {
        this.landings.splice(i, 1);
        continue;
      }
      const p = this.project(l.lane, 1);
      if (l.judgment === "miss") {
        // The missed platform cracks and drops out of the road.
        const k = age / life, drop = reduced ? 0 : 20 * age + 420 * age * age;
        this.tile(l.lane, 1, false, false, now, drop, 1 - k, l.shielded ? POWER_COLORS.shield : CORAL);
        g.lineStyle(1.5, 0x512c37, 1 - k);
        g.lineBetween(p.x - p.half * 0.12, p.y - 10 + drop, p.x + p.half * 0.04, p.y - 3 + drop);
        g.lineBetween(p.x + p.half * 0.04, p.y - 3 + drop, p.x - p.half * 0.02, p.y + 4 + drop);
      } else if (age < 0.32) {
        // Landed: the tile lights up, sinks under the weight and sends a ring out.
        const k = age / 0.32, perfect = l.judgment === "perfect";
        this.tile(l.lane, 1, false, false, now, reduced ? 0 : 7 * Math.sqrt(k), 1 - k, perfect ? 0xffffff : MINT);
        const grow = 1 + k * (reduced ? 0.5 : 2.4);
        g.lineStyle(perfect ? 3 : 1.5, l.relic ? GOLD : perfect ? IVORY : MINT, (1 - k) * 0.85);
        g.strokeEllipse(p.x, p.y + 2, p.half * 0.37 * grow, 14 * grow);
      }
      if (l.judgment !== "miss" && (l.crystal || l.power || l.relic)) {
        // Collected items fly up into the HUD.
        const k = Math.min(1, age / life), e = k * k;
        const x = p.x + (w * (l.power ? 0.5 : 0.14) - p.x) * e, y = p.y - 30 + (h * 0.07 - p.y + 30) * e;
        const s = 11 * (1 - k * 0.5);
        if (l.relic) this.drawRelic(x, y, s * 1.3, 1 - k * 0.5, now * 3, false, false);
        else if (l.power) this.drawPower(l.power, x, y, s, 1 - k * 0.5);
        else {
          this.quad([x, y - s, x + s * 0.65, y, x, y + s, x - s * 0.65, y], MINT, 1 - k * 0.6);
          g.lineStyle(1, 0xffffff, 1 - k);
          g.lineBetween(x, y - s, x, y + s);
        }
      }
    }
    const left = this.project(-0.48, 1),
      right = this.project(2.48, 1);
    g.lineStyle(8 + beat * 6, MINT, 0.035 + beat * 0.05);
    g.lineBetween(left.x, left.y, right.x, right.y);
    g.lineStyle(2, MINT, idle ? 0.22 : 0.65);
    g.lineBetween(left.x, left.y, right.x, right.y);
    for (let lane = 0; lane < 3; lane++) {
      const p = this.project(lane, 1), mine = !idle && lane === this.lane;
      g.lineStyle(mine ? 2.2 : 1.5, MINT, mine ? 0.8 : 0.45 + beat * 0.2);
      g.strokeEllipse(p.x, p.y + 1, p.half * 0.37 * (1 + beat * 0.06), 14 * (1 + beat * 0.12));
    }
    const target = this.project(idle ? 1 : this.lane, 1);
    // Fast, frame-rate-independent response: starts on the next frame and
    // settles within 100 ms at 30/60/120 FPS, even across the full track.
    const previousX = this.ballX;
    this.ballX += (target.x - this.ballX) * (1 - Math.exp(-delta / 14));
    if (Math.abs(target.x - this.ballX) < 0.5) this.ballX = target.x;
    const vx = delta > 0 ? (this.ballX - previousX) / delta : 0;
    // Trail history is sampled at a fixed 60 Hz so its length ignores frame rate.
    this.trailClock = Math.min(this.trailClock + delta, 100);
    while (this.trailClock >= 1000 / 60) {
      this.trailClock -= 1000 / 60;
      this.trail.unshift(this.ballX);
      if (this.trail.length > 16) this.trail.pop();
    }
    if (!upcoming)
      for (let index = firstNoteAt(view.notes, view.time); index < view.notes.length; index++) {
        if (!view.judged?.has(view.notes[index].id)) { upcoming = view.notes[index]; break; }
      }
    const gap = upcoming ? upcoming.time - (view.notes[upcoming.id - 1]?.time ?? upcoming.time - 1) : 1;
    const flight = Math.min(0.5, gap * 0.85);
    const untilLanding = upcoming ? upcoming.time - view.time : Infinity;
    // The hop meets the platform at its musical landing, even if steering early.
    // Wider gaps get taller arcs, so slow songs float and fast songs skip.
    const jump = reduced || dying ? 0 : idle ? Math.sin(now * 2) * 6 :
      untilLanding >= 0 && untilLanding <= flight ? Math.sin((1 - untilLanding / flight) * Math.PI) * (10 + flight * 62) : 0;
    const restingY = idle ? Math.min(target.y, h - (h <= 720 ? 326 : 365)) : target.y;
    let sx = 1, sy = 1;
    const landAge = now - this.landAt, missAge = now - this.badFlash;
    if (!reduced) {
      if (landAge < 0.16) {
        const k = 1 - landAge / 0.16;
        sx = 1 + 0.2 * k;
        sy = 1 - 0.17 * k;
      } else if (jump > 4) {
        sx = 0.95;
        sy = 1.06;
      }
      // A fast lane change stretches the orb along its motion.
      const dash = Math.min(0.22, Math.abs(vx) * 0.12);
      sx += dash;
      sy -= dash * 0.5;
    }
    const stumble = !reduced && missAge < 0.3 ? Math.sin((missAge / 0.3) * Math.PI) * 9 : 0;
    const ballY = restingY - 24 - jump + stumble + (1 - sy) * 24;
    if (view.ghostLane !== undefined && !idle) {
      // Your record run, as a translucent orb racing beside you.
      const ghostTarget = this.project(view.ghostLane, 1).x;
      this.ghostX = this.ghostX < 0 ? ghostTarget : this.ghostX + (ghostTarget - this.ghostX) * (1 - Math.exp(-delta / 30));
      const gy = restingY - 24 - jump;
      g.fillStyle(0xffffff, 0.1);
      g.fillCircle(this.ghostX, gy, 22);
      g.lineStyle(1.5, 0xffffff, 0.45);
      g.strokeCircle(this.ghostX, gy, 22);
    } else this.ghostX = -1;
    if (!reduced && !idle && !dying && view.combo >= 10) {
      // A ribbon left on the road behind the orb; it bends with lane changes.
      const count = fever ? 16 : 9;
      for (let i = count; i >= 1; i--) {
        const x = this.trail[Math.min(this.trail.length - 1, i)] ?? this.ballX;
        const k = i / (count + 1);
        g.fillStyle(this.trailColor(i, now), (fever ? 0.3 : 0.18) * (1 - k));
        g.fillCircle(x, restingY - 20 + i * 4.5, (fever ? 15 : 12) * (1 - k * 0.55));
      }
    }
    if (!reduced && Math.abs(vx) > 0.25 && !this.shattered) {
      // Motion smear: two fading copies behind a fast lane change.
      for (let i = 1; i <= 2; i++) {
        g.fillStyle(this.trailColor(i, now), 0.16 / i);
        g.fillCircle(this.ballX - vx * 16 * i, ballY, 22);
      }
    }
    if (!this.shattered) {
      g.fillStyle(0x030d16, 0.5);
      g.fillEllipse(this.ballX, restingY + 2, 48 - jump * 0.4, 10);
    }
    const glowAge = now - this.perfectFlash;
    if (glowAge < 0.22 && !this.shattered) {
      g.lineStyle(2, IVORY, reduced ? 0.65 : (1 - glowAge / 0.22) * 0.85);
      g.strokeCircle(this.ballX, ballY, reduced ? 29 : 27 + glowAge * 46);
    }
    this.ball
      .setPosition(this.ballX, ballY)
      .setDisplaySize(100 * sx, 100 * sy)
      .setAlpha(this.shattered ? 0 : view.mode === "results" ? 0.3 : 1);
    if (!this.shattered && !idle) {
      if (view.shields) {
        // Shield bubble: one ring per charge.
        for (let i = 0; i < Math.min(3, view.shields); i++) {
          g.lineStyle(2, POWER_COLORS.shield, 0.7 - i * 0.2);
          g.strokeCircle(this.ballX, ballY, 33 + i * 5 + (reduced ? 0 : Math.sin(now * 5 + i) * 1.5));
        }
        g.fillStyle(POWER_COLORS.shield, 0.08);
        g.fillCircle(this.ballX, ballY, 33);
      }
      if (view.doubleActive) {
        g.lineStyle(2, GOLD, 0.5 + beat * 0.4);
        g.strokeCircle(this.ballX, ballY, 28 + beat * 6);
      }
    }
    if (!reduced && !idle && !dying && !this.shattered) {
      // Each orb sheds its own particles: embers, snow, stars, bubbles…
      this.moteClock += delta;
      const every = fever ? 40 : 90;
      while (this.moteClock >= every) {
        this.moteClock -= every;
        this.emitMote(this.ballX, ballY, now - this.moteClock / 1000, fever);
      }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i], t = now - m.born;
      if (t > m.life || reduced) {
        this.motes.splice(i, 1);
        continue;
      }
      const k = 1 - t / m.life;
      const x = m.x + m.vx * t + (m.kind === "bubble" || m.kind === "snow" ? Math.sin(t * 9 + m.size) * 4 : 0);
      const y = m.y + m.vy * t;
      if (m.kind === "bubble") {
        g.lineStyle(1, m.color, 0.7 * k);
        g.strokeCircle(x, y, m.size);
      } else if (m.kind === "star") {
        const s = m.size * Math.sin(k * Math.PI);
        g.fillStyle(m.color, 0.9 * k);
        g.fillRect(x - s, y - 0.6, s * 2, 1.2);
        g.fillRect(x - 0.6, y - s, 1.2, s * 2);
      } else {
        g.fillStyle(m.color, 0.85 * k);
        g.fillCircle(x, y, m.size * (m.kind === "ember" ? k : 1));
      }
    }
    if (!reduced)
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i],
          t = now - s.born;
        if (t > 0.6) {
          this.sparks.splice(i, 1);
          continue;
        }
        g.fillStyle(s.color, 1 - t / 0.6);
        const px = s.x + s.vx * t, py = s.y + s.vy * t + 120 * t * t;
        const size = Math.max(1, 4 - t * 5);
        if (i % 3 === 0) {
          g.fillRect(px - size, py - 0.7, size * 2, 1.4);
          g.fillRect(px - 0.7, py - size, 1.4, size * 2);
        } else g.fillCircle(px, py, size * 0.6);
      }
    const shatterAge = now - this.shatterAt;
    if (this.shattered && shatterAge < 1.3) {
      for (const s of this.shards) {
        const x = this.shatterX + s.vx * shatterAge,
          y = this.shatterY + s.vy * shatterAge + 380 * shatterAge * shatterAge;
        const r = s.size * (1 - shatterAge / 2.6), a = s.spin * shatterAge;
        g.fillStyle(s.color, 1 - shatterAge / 1.3);
        g.fillTriangle(
          x + Math.cos(a) * r, y + Math.sin(a) * r,
          x + Math.cos(a + 2.1) * r, y + Math.sin(a + 2.1) * r,
          x + Math.cos(a + 4.2) * r * 0.6, y + Math.sin(a + 4.2) * r * 0.6,
        );
      }
      if (shatterAge < 0.35) {
        g.lineStyle(3, IVORY, reduced ? 0.6 : 1 - shatterAge / 0.35);
        g.strokeCircle(this.shatterX, this.shatterY, reduced ? 28 : 20 + shatterAge * 260);
      }
    }
    const feverAge = now - this.feverAt;
    if (feverAge < 0.6 && !reduced) {
      g.lineStyle(4, WAVE, 1 - feverAge / 0.6);
      g.strokeCircle(this.ballX, ballY, 30 + feverAge * 420);
      g.fillStyle(WAVE, (0.6 - feverAge) * 0.2);
      g.fillRect(0, 0, w, h);
    }
    const savedAge = now - this.savedAt;
    if (savedAge < 0.7) {
      g.fillStyle(0xffffff, (0.7 - savedAge) * (reduced ? 0.1 : 0.4));
      g.fillRect(0, 0, w, h);
      if (!reduced) {
        g.lineStyle(5, 0xffe3a3, 1 - savedAge / 0.7);
        g.strokeCircle(this.ballX, ballY, 30 + savedAge * 300);
      }
    }
    if (!idle && view.energy !== undefined && view.energy <= 40) {
      // Low energy: the screen edges throb in time, like a heartbeat.
      const danger = (40 - view.energy) / 40;
      const throb = reduced ? 0.6 : 0.35 + 0.65 * Math.exp(-phase * 4);
      for (let k = 0; k < 3; k++) {
        const s = 8 + k * 11;
        g.fillStyle(CORAL, (0.05 + 0.11 * danger) * throb * (1 - k * 0.3));
        g.fillRect(0, 0, s, h);
        g.fillRect(w - s, 0, s, h);
      }
    }
    if (now - this.badFlash < 0.18 && !reduced) {
      g.fillStyle(CORAL, (0.18 - (now - this.badFlash)) * 0.18);
      g.fillRect(0, 0, w, h);
    }
    // The camera leans into lane changes and breathes with the kick.
    const camera = this.cameras?.main;
    if (camera) {
      const lean = reduced || idle ? 0 : Math.max(-0.02, Math.min(0.02, vx * 0.018));
      this.roll += (lean - this.roll) * Math.min(1, delta / 60);
      camera.setRotation(this.roll);
      camera.setZoom(reduced ? 1 : 1 + beat * 0.012 + (fever ? 0.01 : 0));
    }
  }
}
