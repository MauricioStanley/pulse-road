import { expect, it, vi } from "vitest";
import { createChart } from "../src/core/chart";
import { getLevel } from "../src/core/levels";
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
  scene.getView=()=>({mode:"playing",time,notes,reduced:false,combo:40,active:true,travel:1.25,easterEggs:true});
  for(let i=0;i<320;i++){time=i/4;scene.update(time*1000,16.667);}
  const metrics={frames:320,graphicsCalls:commands,chartReads:reads,meanGraphicsCalls:Math.round(commands/320),meanChartReads:Math.round(reads/320)};
  console.log("RENDER_BUDGET",JSON.stringify(metrics));
  expect(commands).toBeGreaterThan(0);
  // Before optimization: 192,110 reads. Preserve visible output with bounded work.
  expect(reads).toBeLessThan(12000);
});
