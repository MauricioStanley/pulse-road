import { expect, it, vi } from "vitest";
import { createChart } from "../src/core/chart";
import { getLevel } from "../src/core/levels";
import { JudgmentLog } from "../src/core/rules";
vi.mock("phaser",()=>({default:{Scene:class{scale={width:390,height:844};}}}));
import { RoadScene } from "../src/game/RoadScene";
it("measures draw commands and chart reads over a complete nightmare",()=>{
  let commands=0, reads=0;
  const scene=new RoadScene();
  const ink=new Proxy({}, {get:()=>()=>{commands++;}});
  const ball={setPosition(){return this;},setDisplaySize(){return this;},setAlpha(){return this;}};
  const notes=new Proxy(createChart(getLevel("servellon")),{get(target,key,receiver){if(typeof key==="string" && /^\d+$/.test(key))reads++;return Reflect.get(target,key,receiver);}});
  Object.assign(scene,{ink,ball,ballX:195});
  let time=0;
  scene.getView=()=>({mode:"playing",time,notes,reduced:false,combo:40,active:true,travel:1.25,bpm:180,energy:30,shields:1});
  for(let i=0;i<320;i++){time=i/4;scene.update(time*1000,16.667);}
  const metrics={frames:320,graphicsCalls:commands,chartReads:reads,meanGraphicsCalls:Math.round(commands/320),meanChartReads:Math.round(reads/320)};
  console.log("RENDER_BUDGET",JSON.stringify(metrics));
  expect(commands).toBeGreaterThan(0);
  // Before optimization: 192,110 reads. Preserve visible output with bounded work.
  expect(reads).toBeLessThan(12000);
  // Worst case (Fever, low energy, shield, particles): keep near the pre-Infinito cost.
  expect(commands/320).toBeLessThan(800);
});
function landedRun(flowing: boolean) {
  let commands=0;
  const scene=new RoadScene();
  const ink=new Proxy({}, {get:()=>()=>{commands++;}});
  const ball={setPosition(){return this;},setDisplaySize(){return this;},setAlpha(){return this;}};
  const notes=createChart(getLevel("servellon"));
  Object.assign(scene,{ink,ball,ballX:195});
  let time=0, now=1000;
  const spy=vi.spyOn(performance,"now").mockImplementation(()=>now);
  // Every platform reached counts as a landing, as in a clean run at 60 FPS.
  const log=new JudgmentLog();
  const judged=flowing ? log : { has: (id: number) => log.has(id) };
  scene.getView=()=>({mode:"playing",time,notes,judged,reduced:false,combo:40,active:true,travel:1.25,bpm:180,energy:30,shields:1});
  const frames=1200;
  for(let i=0;i<frames;i++){
    time=10+i/60;
    now+=1000/60;
    for(const note of notes) if(note.time<=time && !log.has(note.id)){log.set(note.id,"perfect");scene.hit(note.lane,"perfect",false);}
    scene.update(now,1000/60);
  }
  spy.mockRestore();
  return commands/frames;
}
it("keeps landed platforms flowing behind the orb within budget",()=>{
  const before=landedRun(false), after=landedRun(true);
  console.log("RENDER_BUDGET_LANDED",JSON.stringify({before:Math.round(before),after:Math.round(after)}));
  // Leaving each platform behind costs a few tiles, not a new frame budget.
  expect(after-before).toBeLessThan(120);
  expect(after).toBeLessThan(900);
});
