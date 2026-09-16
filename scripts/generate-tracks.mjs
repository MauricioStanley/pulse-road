import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Three additional original compositions. First Light remains the medium track.
// Every note is synthesized here; no melodies, samples or recordings from games.
const tracks = [
  { file: "tiny-orbit", title: "Pequeña Órbita", bpm: 96, root: 60, seed: 731, chords: [[0,4,7],[5,9,12],[9,12,16],[7,11,14]], melody: [12,16,19,16,14,12,9,7,12,14,16,19,21,19,16,12], intensity: 0 },
  { file: "neon-sprint", title: "Neon Sprint", bpm: 150, root: 54, seed: 1229, chords: [[0,3,7],[8,12,15],[5,8,12],[10,14,17]], melody: [12,19,15,22,19,15,12,10,15,19,22,24,22,19,17,15], intensity: 1 },
  { file: "zero-threshold", title: "Umbral Cero", bpm: 180, root: 47, seed: 9311, chords: [[0,3,7],[1,5,8],[8,12,15],[7,10,14]], melody: [24,19,27,22,19,25,22,15,24,27,19,22,25,19,15,22], intensity: 2 },
];
const sr = 44100, seconds = 80, tau = Math.PI * 2;
const hz = note => 440 * 2 ** ((note - 69) / 12);
const scratchDir = path.resolve("../../work/audio");
await fs.mkdir(scratchDir, { recursive: true });
await fs.mkdir("public/audio", { recursive: true });
for (const track of tracks) {
  const samples = new Float32Array(sr * seconds);
  let seed = track.seed;
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
  const add = (start, duration, fn, level) => {
    const first = Math.round(start * sr), length = Math.floor(duration * sr);
    for (let i = 0; i < length && first + i < samples.length; i++)
      if (first + i >= 0) samples[first + i] += fn(i / sr, duration) * level;
  };
  const beat = 60 / track.bpm;
  const pluck = (at, note, gain, metallic = false) => {
    const f = hz(note);
    add(at, Math.min(0.48, beat * 1.3), t => {
      const wave = Math.sin(tau * f * t) + (metallic ? 0.23 : 0.10) * Math.sin(tau * f * 3 * t) + (metallic ? 0.10 : 0) * Math.sin(tau * f * 5 * t);
      return wave * Math.min(1, t / 0.004) * Math.exp(-t * (metallic ? 17 : 7));
    }, gain);
  };
  for (let b = 0; b * beat < seconds; b++) {
    const at = b * beat, bar = Math.floor(b / 4), section = Math.min(4, Math.floor(at / 16));
    const chord = track.chords[Math.floor(bar / 2) % track.chords.length];
    const soft = section === 2 ? 0.65 : 1;
    if (b % 4 === 0) for (const n of chord) {
      const f = hz(track.root + n + 12);
      add(at, beat * 4.3, (t,d) => (Math.sin(tau * f * t) + 0.22 * Math.sin(tau * f * 1.003 * t)) * Math.min(1,t/0.12) * Math.min(1,(d-t)/0.35), 0.019);
    }
    // Kick, snare and closed hats are synthesized noise/oscillator envelopes.
    add(at, 0.27, t => Math.sin(tau * (45*t + 95*0.023*(1-Math.exp(-t/0.023)))) * Math.exp(-t*18), (track.intensity ? 0.35 : 0.23) * soft);
    if (b % 2) add(at, 0.14, t => (noise()*0.72 + Math.sin(tau*176*t)*0.28) * Math.exp(-t*30), (track.intensity ? 0.14 : 0.065) * soft);
    for (let j=0; j< (track.intensity === 2 ? 4 : 2); j++)
      add(at+j*beat/(track.intensity === 2 ? 4 : 2), 0.035, t => noise()*Math.exp(-t*100), (j%2 ? 0.012 : 0.022) * soft);
    const bass = hz(track.root + chord[0] - 12);
    add(at + 0.025, beat*0.8, t => (Math.sin(tau*bass*t)+0.22*Math.sin(tau*bass*2*t))*Math.min(1,t/0.006)*Math.exp(-t*8), 0.18);
    if (track.intensity || b % 2 === 0 || section >= 3)
      pluck(at, track.root + track.melody[b % 16], track.intensity === 2 ? 0.075 : 0.10, track.intensity > 0);
    if (track.intensity && (section !== 0 || b % 4 > 1))
      pluck(at + beat/2, track.root + chord[(b+1)%3]+24, 0.055, true);
    if (!track.intensity && b % 2 === 0)
      pluck(at+beat*0.75, track.root + track.melody[b%16], 0.020);
    if (track.intensity === 2 && b%8 === 7)
      for(let j=1;j<4;j++) add(at+j*beat/4, 0.055, t=>noise()*Math.exp(-t*60), 0.035);
  }
  const wav = Buffer.alloc(44 + samples.length*2);
  wav.write("RIFF"); wav.writeUInt32LE(wav.length-8,4); wav.write("WAVEfmt ",8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(sr,24); wav.writeUInt32LE(sr*2,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34);
  wav.write("data",36); wav.writeUInt32LE(samples.length*2,40);
  let peak=0;
  for (const x of samples) peak=Math.max(peak,Math.abs(x));
  for(let i=0;i<samples.length;i++) {
    const fade=Math.min(1,i/(sr*0.012),(samples.length-i)/(sr*1.8));
    wav.writeInt16LE(Math.round(Math.tanh(samples[i]/peak*1.25)*0.90*32767*fade),44+i*2);
  }
  const scratch=path.join(scratchDir, track.file+".wav");
  await fs.writeFile(scratch,wav);
  const result=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-i",scratch,"-codec:a","libmp3lame","-b:a","112k","-metadata","title="+track.title,"-metadata","artist=Pulse Road","public/audio/"+track.file+".mp3"],{stdio:"inherit"});
  if(result.status!==0) throw new Error("FFmpeg could not encode "+track.title);
  console.log(track.title+" · "+track.bpm+" BPM · "+seconds+" s");
}
