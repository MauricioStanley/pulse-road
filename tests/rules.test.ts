import { describe, expect, it } from "vitest";
import { Run, SETTLE_TIME } from "../src/core/rules";
import { createChart, type Note, type Lane } from "../src/core/chart";
import { levels, getLevel, levelLabel } from "../src/core/levels";
import { encouragements, lossMessages, nextMessage } from "../src/core/messages";
const notes = (count = 40, lane: Lane = 0): Note[] => Array.from({length:count},(_,id)=>({id,time:1+id*0.5,lane,crystal:false,obstacles:[]}));
describe("Visual landing contract", () => {
  it("uses the requested names without duplicate subtitles and preserves saved IDs", () => {
    expect(levelLabel(getLevel("titi"))).toBe("Fácil");
    expect(levelLabel(getLevel("servellon"))).toBe("Pesadilla");
    expect(levels.map(level => level.id)).toEqual(["titi", "medio", "dificil", "servellon"]);
    expect(levels.map(level => level.name)).toEqual(["Fácil", "Medio", "Difícil", "Pesadilla"]);
  });
  it.each([0.05,0.12,0.3,0.7])("accepts a lane selected %s seconds early, but scores only on landing", early => {
    const run = new Run(notes(1));
    expect(run.tap(0,1-early)).toEqual([]);
    expect(run.score).toBe(0);
    expect(run.advance(1)[0].judgment).toBe("perfect");
    expect(run.score).toBe(100);
    expect(run.advance(2)).toEqual([]);
  });
  it("allows holding a lane over consecutive platforms without extra clicks", () => {
    const run=new Run(notes(3)); run.tap(0,0.5); run.advance(3);
    expect(run.perfect).toBe(3);
  });
  it("does not award an early lane selection that was abandoned before landing", () => {
    const run=new Run(notes(1)); run.tap(0,0.7); run.tap(2,0.9);
    expect(run.advance(1.2)[0].judgment).toBe("miss");
  });
  it("lets you correct a premature wrong move instead of failing instantly", () => {
    const run=new Run(notes(1)); run.tap(2,0.7); run.tap(0,0.9);
    expect(run.advance(1)[0].judgment).toBe("perfect");
  });
  it("scores a slightly late arrival as Good after its visual transition", () => {
    const run=new Run(notes(1)); run.tap(0,1.05);
    expect(run.score).toBe(0);
    expect(run.advance(1.05+SETTLE_TIME)[0].judgment).toBe("good");
  });
  it("rejects an arrival beyond the grace period", () => {
    const run=new Run(notes(1)); run.tap(0,1.13);
    expect(run.advance(1.2)[0].judgment).toBe("miss");
  });
  it("judges a landing before the next input even when a render frame was skipped", () => {
    const run=new Run([{...notes(1)[0],lane:1},{...notes(1)[0],id:1,lane:2,time:1.2}]);
    const hits=run.tap(2,1.05);
    expect(hits[0].judgment).toBe("perfect");
    run.advance(1.2); expect(run.perfect).toBe(2);
  });
  it("does not reset the arrival timer when tapping the same lane again", () => {
    const run=new Run(notes(1)); run.tap(0,0.8); run.tap(0,0.99);
    expect(run.advance(1)[0].judgment).toBe("perfect");
  });
  it("scores combo, crystal, break and energy recovery once per note", () => {
    const n=notes();n[0].crystal=true;
    const run=new Run(n);run.tap(0,0.5);run.advance(5.5);
    expect(run.score).toBe(1125);expect(run.multiplier).toBe(2);expect(run.crystals).toBe(1);
    run.tap(2,5.8);run.advance(6.2);expect(run.energy).toBe(80);expect(run.multiplier).toBe(1);
    run.tap(0,6.3);run.advance(6.5);expect(run.energy).toBe(82);
  });
  it("stops at death, rejects further inputs and awards no stars", () => {
    const run=new Run(notes());run.advance(50);
    expect(run.misses).toBe(5);expect(run.dead).toBe(true);
    expect(run.tap(0,51)).toEqual([]);run.finished=true;expect(run.stars).toBe(0);
  });
  it.each(levels.map(level=>[level.id,level] as const))("%s is fully achievable at 30, 60 and 120 FPS", (_,level) => {
    const chart=createChart(level);
    const replay=(fps:number)=>{
      const run=new Run(chart,level);let cursor=0;
      for(let frame=0;frame<=level.duration*fps;frame++){
        const time=frame/fps;
        while(cursor<chart.length && chart[cursor].time-0.09<=time) {
          const note=chart[cursor++];run.tap(note.lane,note.time-0.09);
        }
        run.advance(time);
      }
      run.finished=true;
      return [run.score,run.perfect,run.misses,run.stars];
    };
    expect(replay(30)).toEqual(replay(60));expect(replay(60)).toEqual(replay(120));
    expect(replay(60).slice(1)).toEqual([chart.length,0,3]);
  });
  it("has increasing density and unambiguous, beat-aligned targets", () => {
    let previous=0;
    for(const level of levels) {
      const chart=createChart(level);
      expect(chart.length).toBeGreaterThan(previous);previous=chart.length;
      expect(createChart(level)).toEqual(chart);
      chart.forEach((note,i)=>{
        expect(note.id).toBe(i);expect(note.obstacles).not.toContain(note.lane);
        expect(Math.abs(note.time/(30/level.bpm)-Math.round(note.time/(30/level.bpm)))).toBeLessThan(1e-8);
        if(i)expect(note.time-chart[i-1].time).toBeGreaterThanOrEqual(1/6-1e-8);
      });
    }
  });
  it("Pesadilla punishes unattended play and is denser than 300 platforms", () => {
    const level=getLevel("servellon"),chart=createChart(level),run=new Run(chart,level);
    expect(chart.length).toBeGreaterThan(300);
    for(let t=0;t<10;t+=1/60)run.advance(t);
    expect(run.dead).toBe(true);
  });
  it("rejects invalid times and unknown difficulty falls back safely", () => {
    const run=new Run(notes());expect(run.tap(0,NaN)).toEqual([]);expect(run.advance(Infinity)).toEqual([]);
    expect(getLevel("unknown").id).toBe("titi");
  });
});
describe("Motivation",()=>{
  it.each([[encouragements],[lossMessages]])("chooses only authored phrases and never repeats immediately",messages=>{
    let previous="";
    for(let i=0;i<100;i++){const next=nextMessage(messages,previous);expect(messages).toContain(next);expect(next).not.toBe(previous);previous=next;}
  });
});
