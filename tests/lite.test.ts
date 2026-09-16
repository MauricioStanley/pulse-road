import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createContext, runInContext } from "node:vm";
import { parse } from "acorn";
import { drawLite, liteSize } from "../src/lite/renderer";
import { firstNoteAt } from "../src/core/visible";
import { createChart } from "../src/core/chart";
import { levels } from "../src/core/levels";
import { Run } from "../src/core/rules";

describe("Ultralight budgets and compatibility",()=>{
  let bundle:string;
  beforeAll(()=>{
    execFileSync(process.execPath,["scripts/build-lite.mjs"]);
    bundle=readFileSync("public/lite.js","utf8");
  });
  it("ships under 50 KB and parses as ES5",()=>{
    expect(Buffer.byteLength(bundle)).toBeLessThan(50_000);
    expect(()=>parse(bundle,{ecmaVersion:5})).not.toThrow();
  });
  it("boots, starts and pauses without modern collections, promises or audio APIs",()=>{
    const nodes:Record<string,any>={}, storage:Record<string,string>={};
    const drawing=new Proxy({}, {get:()=>()=>{},set:()=>true});
    function node(id:string):any {
      if(nodes[id])return nodes[id];
      const attributes:Record<string,string>={};
      return nodes[id]={id,style:{},textContent:"",innerHTML:"",clientWidth:320,clientHeight:533,
        firstElementChild:{style:{}},setAttribute:(k:string,v:string)=>{attributes[k]=v;},
        removeAttribute:(k:string)=>{delete attributes[k];},getAttribute:(k:string)=>attributes[k],
        addEventListener:()=>{},appendChild:()=>{},getContext:()=>drawing,
        getElementsByTagName:()=>[node("left"),node("center"),node("right")],
      };
    }
    const audio:any={currentTime:0,pause:()=>{},play:()=>undefined};
    const window:any={setTimeout:()=>0,addEventListener:()=>{}};
    const scope=createContext({window,navigator:{},document:{body:{},getElementById:node,
      addEventListener:()=>{},createElement:(tag:string)=>tag==="audio"?audio:node(tag)},
      localStorage:{getItem:(key:string)=>storage[key]||null,setItem:(key:string,value:string)=>{storage[key]=value;}},
      location:{href:"http://example.test/lite.html"},
    });
    runInContext('Map=undefined;Set=undefined;Promise=undefined;Array.prototype.find=undefined;Array.prototype.includes=undefined;Number.isFinite=undefined;Object.assign=undefined;',scope);
    expect(()=>runInContext(bundle,scope)).not.toThrow();
    expect(nodes.panel.innerHTML).toContain("Menos efectos. El mismo ritmo.");
    expect(storage["pulse-render-mode"]).toBe("lite");
    expect(nodes.road.width).toBe(240);
    expect(()=>nodes.play.onclick()).not.toThrow();
    expect(nodes["lite-game"].getAttribute("data-mode")).toBe("loading");
    audio.onplaying();
    expect(nodes["lite-game"].getAttribute("data-mode")).toBe("playing");
    nodes.pause.onclick();
    expect(nodes.panel.innerHTML).toContain("En pausa");
    expect(nodes["lite-game"].getAttribute("data-mode")).toBe("paused");
  });
  it("bounds pixel work regardless of phone pixel density",()=>{
    expect(liteSize(480,800)).toEqual({width:240,height:400});
    expect(liteSize(320,568)).toEqual({width:240,height:426});
    expect(liteSize(240,400)).toEqual({width:240,height:400});
  });
  it("draws only visible notes and preserves the ball, targets and hazard marks",()=>{
    const calls: Record<string, number>={};
    const ctx=new Proxy({}, {get:(_,key)=>()=>{calls[String(key)]=(calls[String(key)]||0)+1;},set:()=>true}) as CanvasRenderingContext2D;
    const notes=createChart(levels[3]);
    drawLite(ctx,{width:320,height:568,time:65,travel:1.25,lane:1,notes,accent:"#70f4cb",hazard:"#ff897d",background:"#07151e",flash:true});
    expect(calls.fillRect).toBeGreaterThan(2);
    expect(calls.fillRect).toBeLessThan(25);
    expect(calls.arc).toBe(3);
    expect(calls.lineTo).toBeGreaterThan(3);
  });
  it("binary search handles empty charts, exact notes and rewinds",()=>{
    const notes=createChart(levels[3]);
    expect(firstNoteAt([],5)).toBe(0);
    expect(firstNoteAt(notes,notes[20].time)).toBe(20);
    expect(firstNoteAt(notes,0)).toBe(0);
    expect(firstNoteAt(notes,90)).toBe(notes.length);
  });
  it.each(levels)("$name keeps identical scoring at 15 and 30 FPS",level=>{
    const notes=createChart(level);
    const replay=(fps:number)=>{
      const run=new Run(notes,level);let cursor=0;
      for(let frame=0;frame<=level.duration*fps;frame++){
        const time=frame/fps;
        while(cursor<notes.length && notes[cursor].time-0.10<=time){
          const note=notes[cursor++];run.tap(note.lane,note.time-0.10);
        }
        run.advance(time);
      }
      return [run.score,run.perfect,run.misses];
    };
    expect(replay(15)).toEqual(replay(30));
    expect(replay(15).slice(1)).toEqual([notes.length,0]);
  });
  it("uses a classic script, not a module or Phaser",()=>{
    const html=readFileSync("public/lite.html","utf8");
    expect(html).toContain('src="lite.js"');
    expect(html).not.toContain('type="module"');
    expect(html).not.toContain("phaser");
  });
});
