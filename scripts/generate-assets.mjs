import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

await fs.mkdir("public/audio", { recursive: true });
await fs.mkdir("public/icons", { recursive: true });
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#07151e"/><path d="M105 329 231 259 407 329 281 399Z" fill="#70f4cb"/><path d="m105 329 176 70v28l-176-70Z" fill="#32a98a"/><path d="m281 399 126-70v28l-126 70Z" fill="#228069"/><circle cx="256" cy="195" r="82" fill="#eaf6ef"/><circle cx="278" cy="170" r="23" fill="#fff"/><circle cx="243" cy="210" r="48" fill="#70f4cb" opacity=".24"/></svg>`;
await fs.writeFile("public/icons/icon.svg", icon);
for (const size of [192, 512])
  await sharp(Buffer.from(icon))
    .resize(size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
await sharp(Buffer.from(icon))
  .resize(180)
  .png()
  .toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(icon))
  .resize(384)
  .extend({ top: 64, bottom: 64, left: 64, right: 64, background: "#07151e" })
  .png()
  .toFile("public/icons/maskable-512.png");

// Original composition and synthesis. 40 bars, 120 BPM, D minor. No samples.
const sr = 44100,
  seconds = 80,
  samples = new Float32Array(sr * seconds);
let seed = 42981;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
function add(start, duration, fn, level = 1) {
  const begin = Math.round(start * sr),
    count = Math.floor(duration * sr);
  for (let i = 0; i < count && begin + i < samples.length; i++)
    samples[begin + i] += fn(i / sr, duration) * level;
}
const progression = [
  [50, 53, 57],
  [46, 50, 53],
  [53, 57, 60],
  [48, 52, 55],
];
const melody = [74, 77, 81, 77, 72, 74, 69, 72, 74, 77, 79, 81, 77, 74, 72, 69];
for (let bar = 0; bar < 40; bar++) {
  const start = bar * 2,
    chord = progression[Math.floor(bar / 2) % 4];
  const section = Math.floor(bar / 8);
  for (const note of chord)
    add(
      start,
      2.2,
      (t, d) => {
        const env = Math.min(1, t / 0.14) * Math.min(1, (d - t) / 0.5);
        const sidechain = 0.5 + 0.5 * Math.min(1, (t % 0.5) / 0.19);
        return (
          (Math.sin(2 * Math.PI * hz(note + 12) * t) +
            0.3 * Math.sin(2 * Math.PI * hz(note + 12) * 1.004 * t)) *
          env *
          sidechain
        );
      },
      0.027,
    );
  for (let beat = 0; beat < 4; beat++) {
    const at = start + beat * 0.5;
    const kickLevel = section === 2 ? 0.2 : 0.36;
    add(
      at,
      0.34,
      (t) =>
        Math.sin(
          2 * Math.PI * (48 * t + 100 * 0.027 * (1 - Math.exp(-t / 0.027))),
        ) * Math.exp(-t * 15),
      kickLevel,
    );
    if (beat % 2 === 1)
      add(
        at,
        0.17,
        (t) =>
          (noise() * 0.75 + Math.sin(t * 2 * Math.PI * 185) * 0.25) *
          Math.exp(-t * 28),
        0.15,
      );
    const bass = hz(chord[0] - 12);
    add(
      at + 0.04,
      0.36,
      (t) =>
        (Math.sin(2 * Math.PI * bass * t) +
          0.25 * Math.sin(2 * Math.PI * bass * 2 * t)) *
        Math.min(1, t / 0.008) *
        Math.exp(-t * 6),
      0.18,
    );
    for (let half = 0; half < 2; half++)
      add(
        at + half * 0.25,
        0.065,
        (t) => noise() * Math.exp(-t * 65),
        half ? 0.035 : 0.024,
      );
    if (section !== 2 || beat % 2 === 0) {
      const f = hz(melody[(bar * 4 + beat) % melody.length]);
      const noteAt = at + (section === 0 ? 0.0 : 0);
      add(
        noteAt,
        0.43,
        (t) =>
          (Math.sin(2 * Math.PI * f * t) +
            0.18 * Math.sin(2 * Math.PI * f * 2 * t)) *
          Math.min(1, t / 0.008) *
          Math.exp(-t * 8),
        0.095,
      );
      add(
        noteAt + 0.375,
        0.3,
        (t) =>
          Math.sin(2 * Math.PI * f * t) *
          Math.min(1, t / 0.01) *
          Math.exp(-t * 12),
        0.023,
      );
    }
    if (section >= 3) {
      const f = hz(chord[beat % 3] + 24);
      add(
        at + 0.25,
        0.2,
        (t) =>
          Math.sin(2 * Math.PI * f * t) *
          Math.min(1, t / 0.005) *
          Math.exp(-t * 18),
        0.042,
      );
    }
  }
}
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write("RIFF");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sr, 24);
wav.writeUInt32LE(sr * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(samples.length * 2, 40);
let peak = 0;
for (const x of samples) peak = Math.max(peak, Math.abs(x));
for (let i = 0; i < samples.length; i++) {
  const fade = Math.min(1, i / (sr * 0.015), (samples.length - i) / (sr * 1.8));
  wav.writeInt16LE(
    Math.round(Math.tanh((samples[i] / peak) * 1.2) * 0.93 * 32767 * fade),
    44 + i * 2,
  );
}
const scratch = path.resolve("../../work/first-light.wav");
await fs.mkdir(path.dirname(scratch), { recursive: true });
await fs.writeFile(scratch, wav);
const conversion = spawnSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    scratch,
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "128k",
    "-metadata",
    "title=First Light",
    "-metadata",
    "artist=Pulse Road",
    "public/audio/first-light.mp3",
  ],
  { stdio: "inherit" },
);
if (conversion.status !== 0)
  throw new Error("FFmpeg failed. Install FFmpeg, then npm run assets.");
console.log("Original 80-second music and PWA icons generated.");
