import { createChart, CHART_VERSION, type Lane } from "../core/chart";
import { levels, getLevel, levelLabel } from "../core/levels";
import { Run, type Hit } from "../core/rules";
import { encouragements, lossMessages, nextMessage } from "../core/messages";
import { themes } from "../themes";
import { drawLite, liteSize } from "./renderer";

const el = (id: string) => document.getElementById(id)!;
const panel=el("panel"), shell=el("lite-game"), hud=el("hud"), controls=el("controls");
const feedback=el("feedback"), encouragement=el("encouragement"), progress=el("progress"), progressFill=progress.firstElementChild as HTMLElement;
const energy=el("energy"), energyFill=energy.firstElementChild as HTMLElement, score=el("score"), combo=el("combo"), song=el("song"), fps=el("fps");
const canvas=el("road") as HTMLCanvasElement, ctx=canvas.getContext("2d");
const now=()=>window.performance && typeof window.performance.now==="function" ? window.performance.now() : Date.now();
function hide(node:HTMLElement,value:boolean){if(value)node.setAttribute("hidden","");else node.removeAttribute("hidden");}
function read(key:string) {try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}}
function save(key:string,value:unknown) {try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private/old browsers still play. */}}
function finite(value:unknown):number {return typeof value==="number" && isFinite(value) && value>=0 ? Math.floor(value) : 0;}
let prefs=read("pulse-settings-v1");
if(!prefs || typeof prefs!=="object" || Array.isArray(prefs))prefs={};
let level=getLevel(prefs.difficulty), notes=createChart(level), run=new Run(notes,level);
let palette: (typeof themes)[number]=themes[0];
for(let i=0;i<themes.length;i++)if(themes[i].id===prefs.theme)palette=themes[i];
let sound=prefs.sound!==false;
let mode="home", lane:Lane=1, width=320, height=568, clockStart=0, silentPosition=0, silent=false;
let flashUntil=0, feedbackUntil=0, encouragementUntil=0, nextMilestone=1000, previousMessage="", previousLoss="";
let lastDraw=0, lastHUD=0, fpsStart=0, drawCount=0, playGeneration=0, wantsPlay=false;
let practiceStep=0, practiceStart=0;
let waitingUpdate:ServiceWorker|undefined, reloadForUpdate=false;
const practiceLanes:Lane[]=[0,2,1];
let practice=new Run([],getLevel("titi"));
const music=document.createElement("audio");
music.preload="auto";music.volume=0.75;music.muted=!sound;
let effectContext:AudioContext|undefined;
const laneButtons=controls.getElementsByTagName("button");
const requestFrame=window.requestAnimationFrame || (window as unknown as {webkitRequestAnimationFrame?:typeof requestAnimationFrame}).webkitRequestAnimationFrame;
const recordKey=()=> "pulse-record-"+CHART_VERSION+"-"+level.id;
const attemptKey=()=> "pulse-attempts-"+CHART_VERSION+"-"+level.id;
const setText=(node:HTMLElement,text:string)=>{if(node.textContent!==text)node.textContent=text;};
function preference() {prefs.difficulty=level.id;prefs.theme=palette.id;prefs.sound=sound;save("pulse-settings-v1",prefs);}
function clock() {return silent ? silentPosition+(mode==="playing" ? (now()-clockStart)/1000 : 0) : music.currentTime || 0;}
function paint() {
  if(!ctx)return;
  const tutorial=mode==="tutorial";
  const n=tutorial?practice.notes:mode==="home"||mode==="results"?[]:notes;
  ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
  drawLite(ctx,{width,height,time:tutorial?(now()-practiceStart)/1000:Math.max(0,clock()-finiteOffset()),travel:tutorial?2.4:level.travel,lane,notes:n,judged:tutorial?practice.judged:run.judged,accent:palette.accent,hazard:palette.hazard,background:palette.background,flash:now()<flashUntil});
}
function resize() {
  width=shell.clientWidth;height=shell.clientHeight;
  const size=liteSize(width,height);canvas.width=size.width;canvas.height=size.height;
  paint();
}
function state(value:string) {
  mode=value;shell.setAttribute("data-mode",value);
  document.body.className=value==="playing"||value==="tutorial"||value==="paused"?"playing":"";
  hide(panel,value==="playing"||value==="tutorial");
  hide(hud,value!=="playing"&&value!=="tutorial"&&value!=="paused");
  hide(controls,value!=="playing"&&value!=="tutorial");
  lastDraw=0;lastHUD=0;fpsStart=now();drawCount=0;
  setText(fps,"");
  paint();
}
function selectLane(value:Lane) {
  lane=value;
  for(let i=0;i<laneButtons.length;i++){
    laneButtons[i].className=i===lane?"selected":"";
    laneButtons[i].style.backgroundColor=i===lane?palette.accent:"#17333a";
    laneButtons[i].style.color=i===lane?"#102820":"#eaf6ef";
  }
}
function stopMusic() {wantsPlay=false;playGeneration++;music.pause();}
function home() {
  stopMusic();silent=false;selectLane(1);setText(feedback,"");setText(encouragement,"");
  state("home");setText(song,"Sin Phaser · dibujo 2D · objetivo 30 FPS");
  let options="",colors="";
  for(let i=0;i<levels.length;i++){const l=levels[i];options+='<option value="'+l.id+'"'+(l.id===level.id?' selected':'')+'>'+levelLabel(l)+'</option>';}
  for(let i=0;i<themes.length;i++)colors+='<option value="'+themes[i].id+'"'+(themes[i].id===palette.id?' selected':'')+'>'+themes[i].name+'</option>';
  panel.innerHTML='<h1>Pulse Road</h1><p>Menos efectos. El mismo ritmo.<br>Colócate antes de que llegue la plataforma.</p><label for="level">Dificultad</label><select id="level">'+options+'</select><p id="track-info">'+level.track+' · '+level.bpm+' BPM · 80 s</p><div class="record">Récord: '+finite(read(recordKey()))+' · Intentos: '+finite(read(attemptKey()))+'</div><button id="play">Jugar</button><div class="switches"><button id="sound" class="secondary" aria-pressed="'+sound+'">Sonido: '+(sound?'sí':'no')+'</button><button id="practice" class="secondary">Cómo jugar</button></div><label for="color">Color de la esfera</label><select id="color">'+colors+'</select><p class="notice">Sin partículas, saltos decorativos ni vibración. Conserva plataformas, peligros, cristales y puntuación.</p><div class="links"><a id="full-mode" href="./">Volver al modo completo</a></div><p class="notice">En navegadores antiguos, la instalación y el modo sin conexión pueden no estar disponibles.</p>';
  el("play").style.backgroundColor=palette.accent;
  el("play").onclick=start;
  (el("level") as HTMLSelectElement).onchange=function(){level=getLevel((this as HTMLSelectElement).value);notes=createChart(level);preference();home();};
  (el("color") as HTMLSelectElement).onchange=function(){const value=(this as HTMLSelectElement).value;for(let i=0;i<themes.length;i++)if(themes[i].id===value)palette=themes[i];preference();home();};
  el("sound").onclick=()=>{sound=!sound;music.muted=!sound;preference();setText(el("sound"),"Sonido: "+(sound?"sí":"no"));el("sound").setAttribute("aria-pressed",String(sound));};
  el("practice").onclick=beginPractice;
  el("full-mode").onclick=(event)=>{event.preventDefault();try{localStorage.setItem("pulse-render-mode","normal");}catch{}location.href="./";};
  showUpdate();
  panel.style.backgroundColor=palette.background;
  paint();
}
function unlockEffects() {
  try {
    const Constructor=window.AudioContext || (window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(Constructor && !effectContext)effectContext=new Constructor();
    if(effectContext && effectContext.state==="suspended") {const result=effectContext.resume();if(result && result.catch)void result.catch(()=>{});}
  } catch {/* Effects are optional on legacy browsers. */}
}
function damageSound() {
  if(!sound || !effectContext)return;
  try {
    const c=effectContext, osc=c.createOscillator(), gain=c.createGain(), t=c.currentTime;
    osc.type="triangle";osc.frequency.setValueAtTime(235,t);osc.frequency.exponentialRampToValueAtTime(52,t+0.13);
    gain.gain.setValueAtTime(0.001,t);gain.gain.exponentialRampToValueAtTime(0.12,t+0.005);gain.gain.exponentialRampToValueAtTime(0.001,t+0.14);
    osc.connect(gain);gain.connect(c.destination);osc.start(t);osc.stop(t+0.15);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  } catch {/* Visual miss feedback always remains available. */}
}
function start() {
  stopMusic();unlockEffects();
  run=new Run(notes,level);selectLane(1);silent=false;silentPosition=0;nextMilestone=1000;encouragementUntil=0;
  setText(feedback,"");setText(encouragement,"");
  save(attemptKey(),finite(read(attemptKey()))+1);
  music.src="audio/"+level.audio;music.muted=!sound;
  requestPlayback();
}
function requestPlayback() {
  unlockEffects();
  state("loading");
  panel.innerHTML='<h2>Preparando '+level.name+'</h2><p>'+level.track+'</p><p>La canción puede tardar con una conexión lenta.</p><button id="without" class="secondary">Jugar sin música</button><button id="cancel" class="secondary">Volver</button>';
  el("without").onclick=startSilent;el("cancel").onclick=home;
  wantsPlay=true;const generation=++playGeneration;
  try {const result=music.play();if(result && typeof result.catch==="function")void result.catch(()=>{if(generation===playGeneration)loadError();});}
  catch {loadError();}
}
function loadError() {
  if(!wantsPlay)return;
  wantsPlay=false;music.pause();
  panel.innerHTML='<h2>No comenzó la canción</h2><p>Puede ser la conexión o una limitación del navegador. Puedes reintentar o jugar sin música.</p><button id="retry">Reintentar</button><button id="without" class="secondary">Jugar sin música</button><button id="cancel" class="secondary">Volver</button>';
  el("retry").onclick=requestPlayback;el("without").onclick=startSilent;el("cancel").onclick=home;
}
function startSilent() {
  const position=music.currentTime||0;stopMusic();silent=true;silentPosition=position;clockStart=now();
  state("playing");updateHUD(true);
}
music.onplaying=()=>{
  if(!wantsPlay){music.pause();return;}
  silent=false;state("playing");updateHUD(true);
};
music.onerror=()=>{if(mode==="loading")loadError();else if(mode==="playing")pause("La canción se interrumpió. Puedes continuar sin música.");};
music.onwaiting=()=>{if(mode==="playing")pause("La música necesita cargar. Toca Continuar cuando estés listo.");};
music.onended=()=>{if(mode==="playing")finish(true);};
function hit(hit:Hit) {
  feedback.style.color=hit.judgment==="miss"?palette.hazard:hit.judgment==="perfect"?palette.accent:"#eaf6ef";
  setText(feedback,hit.judgment==="miss"?"Fallo":hit.judgment==="perfect"?"Perfecto":"Bien");
  feedbackUntil=now()+450;if(hit.judgment==="perfect")flashUntil=now()+180;
  if(hit.judgment==="miss")damageSound();
  if(hit.judgment!=="miss" && run.score>=nextMilestone && now()>encouragementUntil+4500){
    previousMessage=nextMessage(encouragements,previousMessage);setText(encouragement,previousMessage);
    encouragementUntil=now()+2300;nextMilestone=run.score+2500;
  }
}
function updateHUD(force=false) {
  const t=clock(), ms=now();
  setText(score,String(run.score));setText(combo,"×"+run.multiplier+" · "+run.combo);
  const value=String(Math.round(run.energy));
  if(energy.getAttribute("aria-valuenow")!==value){
    energy.setAttribute("aria-valuenow",value);energyFill.style.transform="scaleX("+(run.energy/100)+")";
    (energyFill.style as unknown as {webkitTransform:string}).webkitTransform=energyFill.style.transform;
    energyFill.style.backgroundColor=run.energy<=40?palette.hazard:palette.accent;
  }
  if(force || ms-lastHUD>=50){
    lastHUD=ms;progress.setAttribute("aria-valuenow",t.toFixed(3));
    progressFill.style.transform="scaleX("+Math.min(1,t/level.duration)+")";
    (progressFill.style as unknown as {webkitTransform:string}).webkitTransform=progressFill.style.transform;
    setText(song,level.name+" · "+level.track+" · "+Math.floor(t)+" / 80 s");
  }
}
function input(value:Lane) {
  if(mode!=="playing" && mode!=="tutorial")return;
  selectLane(value);
  if(mode==="tutorial")practice.tap(value,(now()-practiceStart)/1000).forEach(practiceHit);
  else {run.tap(value,Math.max(0,clock()-finiteOffset())).forEach(hit);updateHUD();if(run.dead)finish(false);}
  // Paint on the input event, not at the next 30 FPS drawing slot.
  paint();
}
function finiteOffset() {return typeof prefs.offset==="number" && isFinite(prefs.offset)?Math.max(-200,Math.min(200,prefs.offset))/1000:0;}
function pause(reason="Tu ritmo puede esperar.") {
  if(mode!=="playing" && mode!=="tutorial")return;
  if(mode==="tutorial"){home();return;}
  if(silent){silentPosition=clock();clockStart=now();}
  stopMusic();state("paused");
  panel.innerHTML='<h2>En pausa</h2><p>'+reason+'</p><button id="continue">Continuar</button><button id="quiet" class="secondary">Continuar sin música</button><button id="restart" class="secondary">Empezar de nuevo</button><button id="back" class="secondary">Volver al inicio</button>';
  el("continue").onclick=()=>{if(silent){clockStart=now();state("playing");}else requestPlayback();};
  el("quiet").onclick=()=>{if(silent){clockStart=now();state("playing");}else startSilent();};
  el("restart").onclick=start;el("back").onclick=home;
}
function finish(completed:boolean) {
  if(mode==="results")return;
  stopMusic();run.finished=completed;
  const old=finite(read(recordKey()));if(run.score>old)save(recordKey(),run.score);
  if(!completed)previousLoss=nextMessage(lossMessages,previousLoss);
  state("results");setText(feedback,"");setText(encouragement,"");
  panel.innerHTML='<h2>'+(completed?'¡Camino completo!':previousLoss)+'</h2><p>'+level.name+' · Intento '+finite(read(attemptKey()))+'</p><div class="final-score">'+run.score+'</div><p>Récord: '+Math.max(old,run.score)+' · '+run.stars+' de 3 estrellas</p><div class="stats">'+run.perfect+' perfectos · '+run.good+' buenos<br>'+run.misses+' fallos · '+run.crystals+' cristales<br>Combo máximo: '+run.maxCombo+'</div><button id="again">Volver a jugar</button><button id="back" class="secondary">Cambiar dificultad</button>';
  el("again").onclick=start;el("back").onclick=home;
}
function beginPractice() {
  stopMusic();selectLane(1);practiceStep=0;practiceStart=now();practiceNote(2);state("tutorial");
  setText(score,"0");setText(combo,"×1 · 0");setText(feedback,"");
  energy.setAttribute("aria-valuenow","100");progress.setAttribute("aria-valuenow","0");
  energyFill.style.transform="scaleX(1)";progressFill.style.transform="scaleX(0)";
  (energyFill.style as unknown as {webkitTransform:string}).webkitTransform="scaleX(1)";
  (progressFill.style as unknown as {webkitTransform:string}).webkitTransform="scaleX(0)";
  energyFill.style.backgroundColor=palette.accent;
  setText(song,"Práctica sin daño · izquierda, derecha y centro");
}
function practiceNote(at:number) {
  practice=new Run([{id:0,lane:practiceLanes[practiceStep],time:at,crystal:false,obstacles:[]}],getLevel("titi"));
  practice.tap(lane,at-1.5);
  setText(encouragement,["Ve a la izquierda antes de que llegue.","Ahora ve a la derecha.","Ahora al centro. La pelota aterriza sola."][practiceStep]);
  encouragementUntil=Infinity;
}
function practiceHit(result:Hit) {
  if(result.judgment==="miss"){practiceNote((now()-practiceStart)/1000+1.5);return;}
  flashUntil=now()+180;practiceStep++;
  if(practiceStep===3){home();return;}
  practiceNote((now()-practiceStart)/1000+1.5);
}
for(let i=0;i<laneButtons.length;i++){
  const button=laneButtons[i], value=i as Lane;let touched=-Infinity;
  button.addEventListener("touchstart",event=>{event.preventDefault();touched=now();input(value);},false);
  button.addEventListener("mousedown",event=>{if(now()-touched<600)return;event.preventDefault();input(value);},false);
  button.addEventListener("click",event=>{if(event.detail===0)input(value);},false);
}
controls.addEventListener("touchmove",event=>event.preventDefault(),false);
document.addEventListener("keydown",event=>{
  const target=event.target as HTMLElement;
  if(target && (target.tagName==="SELECT" || target.tagName==="INPUT"))return;
  if(event.repeat)return;
  const code=event.keyCode;
  if(code===37||code===65){event.preventDefault();input(0);}
  if(code===40||code===83){event.preventDefault();input(1);}
  if(code===39||code===68){event.preventDefault();input(2);}
  if(code===27)pause();
},false);
el("pause").onclick=()=>pause();
document.addEventListener("visibilitychange",()=>{if(document.hidden)pause("La partida se pausó al salir.");},false);
window.addEventListener("blur",()=>pause(),false);
window.addEventListener("pagehide",()=>pause(),false);
window.addEventListener("resize",()=>{resize();if("ontouchstart" in window && innerWidth>innerHeight && Math.min(screen.width,screen.height)<=600)pause("Vuelve a vertical para seguir.");},false);
function loop() {
  const ms=now();
  if(mode==="playing"){
    run.advance(Math.max(0,clock()-finiteOffset())).forEach(hit);
    updateHUD();
    if(run.dead)finish(false);else if(clock()>=level.duration)finish(true);
  } else if(mode==="tutorial")practice.advance((ms-practiceStart)/1000).forEach(practiceHit);
  if(mode==="playing"||mode==="tutorial"){
    if(ms-lastDraw>=1000/30-0.5){lastDraw=ms;paint();drawCount++;}
    if(ms-fpsStart>=1000){setText(fps,Math.round(drawCount*1000/(ms-fpsStart))+" FPS");fpsStart=ms;drawCount=0;}
    if(ms>feedbackUntil && feedback.textContent)setText(feedback,"");
    if(ms>encouragementUntil && encouragement.textContent)setText(encouragement,"");
    if(requestFrame)requestFrame.call(window,loop);else window.setTimeout(loop,16);
  } else window.setTimeout(loop,150);
}
try{localStorage.setItem("pulse-render-mode","lite");}catch{}
if(ctx){home();resize();loop();}
else panel.innerHTML='<h1>Tu navegador no tiene Canvas 2D</h1><p>Necesitas un navegador compatible para jugar.</p><a href="./">Volver</a>';
// Do not initiate the full game's multi-megabyte precache on a legacy device.
// If the full PWA is already installed, its cache also serves this player.
// Only refresh an EXISTING registration, and never reload during a song.
function showUpdate() {
  if(mode!=="home" || !waitingUpdate || document.getElementById("lite-update"))return;
  const button=document.createElement("button");button.id="lite-update";button.className="secondary";
  button.textContent="Nueva versión: actualizar";
  button.onclick=()=>{reloadForUpdate=true;waitingUpdate!.postMessage({type:"SKIP_WAITING"});};
  panel.appendChild(button);
}
if(navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration==="function"){
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(reloadForUpdate)location.reload();});
  void navigator.serviceWorker.getRegistration().then(registration=>{
    if(!registration)return;
    const offer=()=>{if(registration.waiting){waitingUpdate=registration.waiting;showUpdate();}};
    offer();
    registration.addEventListener("updatefound",()=>{
      const installing=registration.installing;
      if(installing)installing.addEventListener("statechange",()=>{if(installing.state==="installed")offer();});
    });
    void registration.update().catch(()=>{});
  }).catch(()=>{});
}
