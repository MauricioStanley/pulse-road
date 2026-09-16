import type { Lane, Note } from "../core/chart";
import type { Run } from "../core/rules";
import { firstNoteAt } from "../core/visible";
export interface LiteView {
  width: number; height: number; time: number; travel: number;
  lane: Lane; notes: readonly Note[]; judged?: Run["judged"];
  accent: string; hazard: string; background: string; flash: boolean;
}
export function liteSize(width: number, height: number) {
  const scale = Math.min(1, 240 / Math.max(1, width));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
/** Native Canvas only: bounded visible notes, no sprites, blur, gradients or particles. */
export function drawLite(ctx: CanvasRenderingContext2D, view: LiteView) {
  const w=view.width, h=view.height, start=h*0.25, end=h*0.70, laneWidth=w/3;
  ctx.fillStyle=view.background; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#34505a"; ctx.lineWidth=1;
  ctx.beginPath();
  for(let i=1;i<3;i++){ctx.moveTo(i*laneWidth,start);ctx.lineTo(i*laneWidth,end+18);}
  ctx.stroke();
  const first=firstNoteAt(view.notes,view.time-0.22);
  for(let i=first;i<view.notes.length;i++){
    const note=view.notes[i], until=note.time-view.time;
    if(until>view.travel)break;
    if(view.judged && view.judged.has(note.id))continue;
    const y=end-(until/view.travel)*(end-start), half=laneWidth*0.32;
    for(let j=0;j<note.obstacles.length;j++){
      const x=(note.obstacles[j]+0.5)*laneWidth;
      ctx.fillStyle=view.hazard;ctx.fillRect(x-half,y-10,half*2,10);
      ctx.strokeStyle="#241a23";ctx.lineWidth=2;ctx.beginPath();
      ctx.moveTo(x-5,y-8);ctx.lineTo(x+5,y-2);ctx.moveTo(x+5,y-8);ctx.lineTo(x-5,y-2);ctx.stroke();
    }
    const x=(note.lane+0.5)*laneWidth;
    ctx.fillStyle="#eaf6ef";ctx.fillRect(x-half,y-10,half*2,10);
    if(note.crystal){
      ctx.fillStyle=view.accent;ctx.beginPath();ctx.moveTo(x,y-28);ctx.lineTo(x+6,y-21);
      ctx.lineTo(x,y-14);ctx.lineTo(x-6,y-21);ctx.closePath();ctx.fill();
    }
  }
  ctx.strokeStyle=view.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(8,end);ctx.lineTo(w-8,end);ctx.stroke();
  const x=(view.lane+0.5)*laneWidth;
  ctx.fillStyle=view.accent;ctx.beginPath();ctx.arc(x,end-15,14,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(x-4,end-20,4,0,Math.PI*2);ctx.fill();
  if(view.flash){ctx.strokeStyle="#ffffff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,end-15,19,0,Math.PI*2);ctx.stroke();}
}
