import Phaser from "phaser";
import "@fontsource-variable/outfit";
import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { createChart, DURATION, phases, type Lane, type Note } from "./core/chart";
import { getLevel, levels } from "./core/levels";
import { encouragements, lossMessages, nextMessage } from "./core/messages";
import { Run, type Hit } from "./core/rules";
import { progressPercent } from "./core/progress";
import { placeRelics, relics, getRelic, type RelicId } from "./core/relics";
import {
  EndlessChart, EndlessRun, ENDLESS_TRACK, POWER_SECONDS, SLOW_FACTOR,
  STAGE_LENGTH, dayKey, daySeed, musicOffset, stageOf, stageRate, travelAt, type EndlessPerks,
} from "./core/endless";
import { applyRun, levelReward, missionAt, xpForRun, type Mission, type RunStats } from "./core/missions";
import { GhostRecorder, ghostLane, type Ghost } from "./core/ghost";
import { Conductor } from "./audio/conductor";
import { RoadScene } from "./game/RoadScene";
import { themes, getTheme, themeVariables } from "./themes";
import { skins, getSkin, isUnlocked, nextSkin, perksFor, unlockLabel, unlockedBetween, type Skin } from "./skins";
import { assetUrl } from "./paths";
import { controlModes, getControlMode, laneFromX, stepLane, SwipeTracker } from "./input/touch";
import { icon, powerIcon, relicIcon, powerNames, powerHints } from "./ui/icons";
import {
  settings, saveSettings, getRecord, saveRecord, getAttempts, startAttempt, storageAvailable,
  getBestProgress, saveProgress, getStars, saveStars, getCrystals, addCrystals, type HomeTab,
} from "./storage";
import {
  activeSkin, addXp, dailyBest, endlessBest, endlessPlays, foundRelics, getGhost, getMissions, grantFeat,
  hasRelic, playerLevel, progressSnapshot, recordRelic, saveDaily, saveEndless, saveGhost, setMissions, startEndless,
} from "./profile";

const numberFormat = new Intl.NumberFormat("es-SV");
const fmt = (n: number) => numberFormat.format(Math.round(n));
const speedText = (rate: number) => `×${rate.toFixed(2).replace(".", ",")}`;
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <aside class="desktop-note"><img src="${assetUrl("icons/icon.svg")}" width="44" height="44" alt=""/><span>Neo Rush</span><p>Un toque.<br/>Todo el ritmo.</p><div class="keyboard-guide"><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd><small>También puedes usar el teclado. R vuelve a jugar.</small></div></aside>
  <main class="cabinet" aria-label="Neo Rush, juego de ritmo">
    <div id="game" aria-hidden="true"></div>
    <header class="topbar"><a class="wordmark" href="#" aria-label="Neo Rush, inicio">${icon("bolt")}<span>neo<span class="wordmark-light">rush</span></span></a><div class="utilities"><button class="level-chip" id="level-chip"></button><button class="icon-button" id="sound-button" aria-label="Silenciar sonido">${icon("sound")}</button><button class="icon-button" id="settings-button" aria-label="Ajustes">${icon("settings")}</button></div></header>
    <section id="hud" class="hud" hidden><div class="hud-score"><small>PUNTOS <span id="ghost-delta"></span></small><strong id="score">0</strong></div><div class="hud-combo"><strong id="combo">×1</strong><small id="combo-label">MULTIPLICADOR</small></div><button class="icon-button" id="pause-button" aria-label="Pausar partida">${icon("pause")}</button><div class="energy"><span id="energy-fill"></span></div><div id="power-row" class="power-row" aria-live="off"></div><div class="song-progress"><span id="progress-fill"></span><i id="best-marker" title="Tu mejor marca" hidden></i></div></section>
    <div id="phase" class="phase" hidden></div>
    <div id="motivation" class="motivation" role="status"></div>
    <div id="feedback" class="feedback" aria-live="off"></div>
    <div id="touch-layer" class="touch-layer" hidden></div>
    <section id="screen" class="screen"></section>
    <section id="tutorial-guide" class="tutorial-guide" hidden></section>
    <div id="countdown" class="countdown" hidden></div>
    <div id="lane-controls" class="lane-controls" hidden aria-label="Carriles"><button data-lane="0" aria-label="Carril izquierdo">${icon("left")}<span>IZQUIERDA</span></button><button data-lane="1" aria-label="Carril central">${icon("center")}<span>CENTRO</span></button><button data-lane="2" aria-label="Carril derecho">${icon("right")}<span>DERECHA</span></button></div>
    <div id="touch-guide" class="touch-guide" hidden aria-hidden="true"></div>
    <div id="song-label" class="song-label" hidden>${icon("headphones")}<span id="track-name"></span><span id="song-time">0:00 / 1:20</span></div>
    <div id="orientation" class="orientation" hidden><div>${icon("replay")}<h2>Volvamos a vertical</h2><p>Tu partida está en pausa.<br/>Gira el teléfono para seguir.</p></div></div>
  </main>
  <aside class="desktop-record"><span class="vertical-title">FEEL THE RUSH</span><div>${icon("infinity")}<p>Canciones, Infinito<br/>y un reto cada día.</p><small>Hecho para jugar con un dedo.</small></div></aside>
  <dialog id="dialog"></dialog><div id="toast" class="toast" role="status"></div>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const screen = $("#screen"),
  hud = $("#hud"),
  feedback = $("#feedback"),
  laneControls = $("#lane-controls"),
  touchLayer = $("#touch-layer"),
  touchGuide = $("#touch-guide");
const dialog = $<HTMLDialogElement>("#dialog");
const audio = new Conductor();
const scene = new RoadScene();
type Mode = "home" | "loading" | "tutorial" | "countdown" | "playing" | "paused" | "dying" | "results";
type PlayKind = HomeTab;
let mode: Mode = "home";
let kind: PlayKind = settings.homeTab;
let level = getLevel(settings.difficulty);
let chart: Note[] = placeRelics(createChart(level), level.id);
let run: Run = new Run(chart, level);
let road: EndlessChart | null = null;
let perks: EndlessPerks = perksFor(activeSkin());
let today = dayKey();
let lastStage = 0;
let bestStageAtStart = 0;
let slowUntil = -1;
let ghost: Ghost | null = null;
let recorder: GhostRecorder | null = null;
let nextMilestone = 1000;
let motivationUntil = 0;
let lastEncouragement = "";
let lastLoss = "";
let keyboardPlay = false;
// Once-per-run moments, measured against the bests from before this attempt.
let recordAtStart = 0;
let bestAtStart = 0;
let passedRecord = false;
let passedBest = false;
let lastMultiplier = 1;
let wasFever = false;
let fevers = 0;
let newRelics: RelicId[] = [];
let progressAtStart = progressSnapshot();
let deathTime = 0;
let deathAt = 0;
let silentMode = false;
let loadingGeneration = 0;
let pauseMode: "playing" | "tutorial" = "playing";
let pendingKind: PlayKind = "song";
let pausedAt = 0;
let countdownEnd = 0;
let countAction: () => void = () => {};
let lastCount = -1;
let offlineReady = false;
let updateAvailable = false;
let installEvent: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
let feedbackUntil = 0;
let toastTimer = 0;
let tutorialStep = 0;
let tutorialTime = 0;
let tutorialStarted = 0;
let controlLane: Lane = 1;
let tutorialNote: Note = { id: 0, lane: 0, time: 2, crystal: false, obstacles: [] };
let tutorialRun = new Run([tutorialNote], getLevel("titi"));
const tutorialLanes: Lane[] = [0, 2, 1, 0, 1, 2];
const tutorialTitles: Record<string, string[]> = {
  buttons: ["Toca a la izquierda", "Ahora, a la derecha", "También hay un centro"],
  drag: ["Lleva el dedo a la izquierda", "Ahora, a la derecha", "Vuelve al centro"],
  swipe: ["Desliza a la izquierda", "Desliza dos veces a la derecha", "Desliza al centro"],
};
const tutorialCopy: Record<string, string[]> = {
  buttons: ["Adelántate: colócate antes de que llegue.", "La pelota aterriza sola. Quédate en el carril.", "Puedes ir al centro con el botón de abajo."],
  drag: ["La pantalla tiene tres columnas invisibles.", "Puedes arrastrar sin levantar el dedo.", "El tercio central de la pantalla es el centro."],
  swipe: ["Cada deslizamiento mueve un carril.", "Un deslizamiento largo cruza dos carriles.", "Adelántate: colócate antes de que llegue."],
};
const tutorialTail = [["Elige el camino libre", "Los pinchos no son tu camino."], ["Sigue el pulso", "Los aciertos seguidos forman tu combo."], ["Un acierto más", "Ya casi estás listo."]];
const endlessRun = () => (run instanceof EndlessRun ? run : null);
const judgeTime = () => Math.max(0, audio.time - (settings.offset / 1000) * audio.speed);

function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => $("#toast").classList.remove("visible"), 3400);
}
type Announcement = "fever" | "record" | "combo" | "cheer" | "stage" | "relic" | "power";
/** Big center-top message. Later events replace earlier ones. */
function announce(text: string, style: Announcement, ms: number) {
  const node = $("#motivation");
  node.textContent = text;
  node.className = "motivation";
  void node.offsetWidth; // Restart the pop animation for repeated kinds.
  node.className = `motivation visible ${style}`;
  motivationUntil = performance.now() + ms;
}
function bump(node: HTMLElement) {
  node.classList.remove("bump");
  void node.offsetWidth;
  node.classList.add("bump");
}
function vibrate(pattern: number | number[]) {
  if (settings.vibration && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
}
function updateBestMarker() {
  const best = kind === "song" ? getBestProgress(level.id) : 0, marker = $("#best-marker");
  marker.hidden = !(best > 0 && best < 100);
  marker.classList.remove("passed");
  marker.style.left = `${best}%`;
}
const touchControls = () => settings.controls !== "buttons";
function setMode(value: Mode) {
  mode = value;
  $(".cabinet").dataset.mode = value;
  const active = ["playing", "tutorial", "countdown", "paused", "dying"].includes(value);
  const steering = ["playing", "tutorial", "countdown", "dying"].includes(value);
  hud.hidden = !active;
  $(".topbar").hidden = active;
  laneControls.hidden = !steering || touchControls();
  touchLayer.hidden = !steering || !touchControls();
  touchGuide.hidden = !steering || !touchControls();
  $("#song-label").hidden = !active;
  $("#phase").hidden = !["playing", "countdown", "dying"].includes(value);
  $("#tutorial-guide").hidden = value !== "tutorial";
  $("#countdown").hidden = value !== "countdown";
  screen.hidden = steering;
  $("#motivation").hidden = value !== "playing";
}
function syncSound() {
  audio.mute(!settings.sound);
  $("#sound-button").innerHTML = icon(settings.sound ? "sound" : "mute");
  $("#sound-button").setAttribute("aria-label", settings.sound ? "Silenciar sonido" : "Activar sonido");
}
function syncLevelChip() {
  const { level: lvl, into, needed } = playerLevel();
  const chip = $("#level-chip");
  chip.innerHTML = `<span>NV ${lvl}</span><i style="--p:${into / needed}"></i>`;
  chip.setAttribute("aria-label", `Nivel ${lvl}: ${into} de ${needed} de experiencia. Ver misiones`);
}
function syncTouchGuide() {
  touchGuide.className = `touch-guide ${settings.controls}`;
  touchGuide.innerHTML = settings.controls === "drag"
    ? `<span>${icon("left")}</span><span>${icon("center")}</span><span>${icon("right")}</span>`
    : `<span>${icon("swipe")} Desliza</span>`;
}
function cacheLabel() {
  return offlineReady
    ? `${icon("check")} Disponible sin conexión`
    : `${icon("headphones")} Mejor con sonido · También puedes jugar en silencio`;
}
const starRow = (earned: number) =>
  `<span class="level-stars" aria-label="${earned} de 3 estrellas">${[1, 2, 3].map((x) => `<i class="${x <= earned ? "on" : ""}"></i>`).join("")}</span>`;
function levelPicker() {
  return `<fieldset class="level-picker"><legend>Elige tu canción</legend><div class="level-options">${levels.map((item) => {
    const reached = getBestProgress(item.id);
    return `<label class="level-option"><input type="radio" name="difficulty" value="${item.id}" aria-describedby="level-info" ${item.id === level.id ? "checked" : ""}/><span class="level-choice"><strong>${item.name}</strong>${starRow(getStars(item.id))}<small>${reached ? `${reached} %` : `${item.bpm} BPM`}</small></span></label>`;
  }).join("")}</div><p id="level-info">${level.subtitle ? `${level.subtitle} · ` : ""}${level.track} · ${level.bpm} BPM${level.id === "servellon" ? " · 6 saltos/s" : ""}</p></fieldset>`;
}
const perkLine = (skin: Skin) =>
  `<button class="orb-perk" id="perk-button"><span class="perk-orb" style="background:${skin.preview}"></span><span><b>${skin.name}</b> · ${skin.perk}</span>${icon("arrow")}</button>`;
function modePanel() {
  if (kind === "song") return levelPicker();
  const skin = activeSkin();
  if (kind === "endless") {
    const best = endlessBest();
    return `<div class="mode-card"><div class="mode-card-head">${icon("infinity")}<div><strong>Infinito</strong><small>La canción acelera cada 16 s. ¿Hasta qué etapa llegas?</small></div></div><div class="mode-meta"><div class="mode-stats"><span>Mejor etapa <b>${best.stage || "—"}</b></span><span>Récord <b>${fmt(best.score)}</b></span></div><div class="power-legend" aria-label="Potenciadores">${(["shield", "heart", "double", "slow"] as const).map((p) => `<span class="power-dot ${p}" title="${powerNames[p]}: ${powerHints[p]}" role="img" aria-label="${powerNames[p]}: ${powerHints[p]}">${powerIcon(p)}</span>`).join("")}</div></div>${perkLine(skin)}</div>`;
  }
  const best = dailyBest(today);
  const date = new Date().toLocaleDateString("es", { day: "numeric", month: "long" });
  return `<div class="mode-card daily"><div class="mode-card-head">${icon("calendar")}<div><strong>Reto del ${date}</strong><small>El mismo recorrido para todos, solo hoy.</small></div></div><div class="mode-stats">${best.score ? `<span>Hoy: etapa <b>${best.stage}</b></span><span>Récord de hoy <b>${fmt(best.score)}</b></span>` : "<span>Aún no juegas el reto de hoy.</span>"}</div>${perkLine(skin)}</div>`;
}
function recordFor(tab: PlayKind) {
  return tab === "song" ? getRecord(level.id) : tab === "endless" ? endlessBest().score : dailyBest(today).score;
}
function home() {
  loadingGeneration++;
  audio.reset();
  setMode("home");
  scene.reset();
  today = dayKey();
  feedback.textContent = "";
  feedback.className = "feedback";
  const tabs: [PlayKind, string, string][] = [["song", "Canciones", "music"], ["endless", "Infinito", "infinity"], ["daily", "Reto diario", "calendar"]];
  const found = foundRelics().length;
  screen.innerHTML = `<div class="home-heading"><h1>NEO<br/><span>RUSH</span></h1><p>Encuentra tu ritmo.</p></div>
    <div class="home-bottom"><div class="mode-tabs" role="tablist" aria-label="Modo de juego">${tabs.map(([id, name, glyph]) => `<button role="tab" data-kind="${id}" aria-selected="${kind === id}" tabindex="${kind === id ? 0 : -1}">${icon(glyph)}<span>${name}</span></button>`).join("")}</div>
    <div class="mode-panel" role="tabpanel">${modePanel()}</div>
    <div class="home-chips"><div class="record-line">${icon("trophy")}<span>RÉCORD</span><strong>${fmt(recordFor(kind))}</strong></div><button class="crystal-chip" id="collection-button" aria-label="Esferas. Tienes ${getCrystals()} cristales">${icon("diamond")}<strong>${fmt(getCrystals())}</strong><span>Esferas</span></button></div>
    <button class="primary play-button" id="play-button">${icon("play")}<span>Jugar</span><span class="button-detail">${kind === "song" ? "80 s" : kind === "endless" ? "∞" : "HOY"}</span></button>
    <div class="home-quick"><button class="text-button" id="missions-button">${icon("target")}Misiones</button><button class="text-button" id="relics-button">${icon("relic")}Reliquias ${found}/${relics.length}</button><button class="text-button" id="tutorial-button">${icon("touch")}Tutorial</button></div>
    <div class="offline-label" id="offline-label">${cacheLabel()}</div>
    <div class="home-links"><button class="text-button" id="install-button">${icon("install")} Instalar juego</button><a class="text-button" href="${assetUrl("lite.html")}">Ultraligero</a><button class="text-button" id="credits-button">Créditos</button></div>
    ${updateAvailable ? '<button class="update-button" id="update-button">Hay una nueva versión. Actualizar</button>' : ""}</div>`;
  screen.querySelectorAll<HTMLButtonElement>(".mode-tabs button").forEach((tab, i, all) => {
    tab.onclick = () => {
      kind = tab.dataset.kind as PlayKind;
      settings.homeTab = kind;
      saveSettings();
      home();
      screen.querySelector<HTMLButtonElement>(`.mode-tabs [data-kind="${kind}"]`)?.focus({ preventScroll: true });
    };
    tab.onkeydown = (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step) all[(i + step + all.length) % all.length].click();
    };
  });
  screen.querySelectorAll<HTMLInputElement>('input[name="difficulty"]').forEach((input) => {
    input.onchange = () => {
      level = getLevel(input.value);
      chart = placeRelics(createChart(level), level.id);
      settings.difficulty = level.id;
      saveSettings();
      home();
      screen.querySelector<HTMLInputElement>('input[name="difficulty"]:checked')?.focus({ preventScroll: true });
    };
  });
  $("#perk-button")?.addEventListener("click", collection);
  $("#collection-button").onclick = collection;
  $("#missions-button").onclick = missionsDialog;
  $("#relics-button").onclick = relicsDialog;
  $("#play-button").onclick = () => void prepare(kind, !settings.tutorial);
  $("#tutorial-button").onclick = () => void prepare(kind, true);
  $("#install-button").onclick = () => void install();
  $("#credits-button").onclick = credits;
  $("#update-button")?.addEventListener("click", () => void updateSW(true));
  syncSound();
  syncLevelChip();
}
async function prepare(target: PlayKind, withTutorial: boolean) {
  const generation = ++loadingGeneration;
  pendingKind = target;
  setMode("loading");
  screen.innerHTML = `<div class="center-panel"><div class="loading-orb">${icon("bolt")}</div><h2>Preparando el ritmo</h2><p id="load-copy">Cargando la canción…</p><div class="load-track"><span id="load-fill"></span></div><button class="text-button" id="cancel-load">Volver al inicio</button></div>`;
  $("#cancel-load").onclick = home;
  try {
    await audio.unlock();
    await audio.load((progress) => {
      if (generation !== loadingGeneration) return;
      $("#load-fill").style.transform = `scaleX(${progress})`;
      $("#load-copy").textContent = progress < 0.9 ? `Descargando canción · ${Math.round(progress * 100)} %` : "Preparando el sonido…";
    }, target === "song" ? level.audio : ENDLESS_TRACK.audio);
    if (generation !== loadingGeneration) return;
    silentMode = false;
    if (document.hidden || isLandscape()) {
      home();
      toast("Todo listo. Toca Jugar cuando vuelvas.");
      return;
    }
    if (withTutorial) beginTutorial();
    else begin(target);
  } catch {
    if (generation !== loadingGeneration) return;
    screen.innerHTML = `<div class="center-panel"><h2>No llegó la canción</h2><p>Comprueba tu conexión y vuelve a intentarlo. También puedes practicar sin audio.</p><button class="primary" id="retry-load">Reintentar</button><button class="secondary" id="silent-play">Jugar sin audio</button><button class="text-button" id="cancel-load">Volver al inicio</button></div>`;
    $("#retry-load").onclick = () => void prepare(target, withTutorial);
    $("#silent-play").onclick = () => {
      silentMode = true;
      if (withTutorial) beginTutorial();
      else begin(target);
    };
    $("#cancel-load").onclick = home;
  }
}
function begin(target: PlayKind) {
  kind = target;
  if (target === "song") beginSong();
  else beginEndless(target === "daily");
}
/** Shared reset for every attempt. */
function resetRun() {
  lastSongSecond = -1;
  lastPhase = -1;
  audio.reset();
  passedRecord = false;
  passedBest = false;
  lastMultiplier = 1;
  wasFever = false;
  fevers = 0;
  newRelics = [];
  slowUntil = -1;
  lastStage = 0;
  controlLane = 1;
  progressAtStart = progressSnapshot();
  hud.classList.remove("fever");
  nextMilestone = 1000;
  motivationUntil = 0;
  $("#motivation").textContent = "";
  $("#ghost-delta").textContent = "";
  $("#power-row").innerHTML = "";
  scene.reset();
  feedback.textContent = "";
  pauseMode = "playing";
  $("#progress-fill").style.transform = "scaleX(0)";
  $(".song-progress").setAttribute("aria-valuenow", "0");
}
function beginSong() {
  resetRun();
  road = null;
  chart = placeRelics(createChart(level), level.id);
  run = new Run(chart, level);
  startAttempt(level.id);
  recordAtStart = getRecord(level.id);
  bestAtStart = getBestProgress(level.id);
  ghost = settings.ghost ? getGhost(level.id) : null;
  recorder = new GhostRecorder();
  audio.setKey(level.root, level.minor);
  updateBestMarker();
  $("#phase").textContent = `${level.name.toLocaleUpperCase("es")} · ${phases[0]}`;
  $("#track-name").textContent = `${level.name} · ${level.track}`;
  $("#song-time").textContent = "0:00 / 1:20";
  updateHUD();
  countdown(() => {
    audio.play(0, silentMode);
    setMode("playing");
  });
}
function beginEndless(daily: boolean) {
  resetRun();
  perks = perksFor(activeSkin());
  today = dayKey();
  const seed = daily ? daySeed(today) : (Math.random() * 4294967296) >>> 0;
  road = new EndlessChart(seed, perks);
  road.ensure(24);
  chart = road.notes;
  run = new EndlessRun(road, perks);
  ghost = null;
  recorder = null;
  startEndless();
  const best = daily ? dailyBest(today) : endlessBest();
  recordAtStart = best.score;
  bestStageAtStart = best.stage;
  audio.setKey(ENDLESS_TRACK.root, ENDLESS_TRACK.minor);
  updateBestMarker();
  $("#phase").textContent = `${daily ? "RETO DIARIO" : "INFINITO"} · ETAPA 1`;
  $("#track-name").textContent = `${daily ? "Reto diario" : "Infinito"} · ${ENDLESS_TRACK.name}`;
  $("#song-time").textContent = speedText(1);
  updateHUD();
  countdown(() => {
    audio.play(0, silentMode, { loop: { start: ENDLESS_TRACK.loopStart, end: ENDLESS_TRACK.loopEnd }, rate: stageRate(0, perks.rateStep) });
    setMode("playing");
  });
}
const COUNT_STEP = 700;
function countdown(action: () => void) {
  setMode("countdown");
  countAction = action;
  countdownEnd = performance.now() + COUNT_STEP * 3;
  lastCount = -1;
  $("#countdown").innerHTML = "<strong>3</strong><span>Encuentra el pulso</span>";
}
function beginTutorial() {
  audio.reset();
  scene.reset();
  run = new Run(chart, level);
  $("#track-name").textContent = "Tutorial · aterriza con anticipación";
  $("#song-time").textContent = "";
  tutorialStep = 0;
  tutorialTime = 0;
  pauseMode = "tutorial";
  tutorialStarted = performance.now() / 1000;
  tutorialRun = new Run([], getLevel("titi"));
  controlLane = 1;
  makeTutorialNote(2);
  setMode("tutorial");
  renderTutorial();
  updateHUD();
}
function makeTutorialNote(at: number) {
  const lane = tutorialLanes[tutorialStep];
  const previousLane = tutorialRun.lane;
  tutorialNote = { id: tutorialStep, lane, time: at, crystal: tutorialStep === 5, obstacles: tutorialStep === 3 ? ([0, 1, 2] as Lane[]).filter((x) => x !== lane) : [] };
  tutorialRun = new Run([tutorialNote], getLevel("titi"));
  tutorialRun.tap(previousLane, at - 1.5);
}
function renderTutorial() {
  const [title, copy] = tutorialStep < 3
    ? [tutorialTitles[settings.controls][tutorialStep], tutorialCopy[settings.controls][tutorialStep]]
    : tutorialTail[tutorialStep - 3];
  $("#tutorial-guide").innerHTML = `<div class="tutorial-dots">${tutorialLanes.map((_, i) => `<span class="${i <= tutorialStep ? "on" : ""}"></span>`).join("")}</div><h2>${title}</h2><p>${copy}</p><button class="text-button" id="skip-tutorial">Saltar tutorial ${icon("arrow")}</button>`;
  $("#skip-tutorial").onclick = finishTutorial;
  const hint = tutorialLanes[tutorialStep];
  laneControls.querySelectorAll("button").forEach((b, i) => b.classList.toggle("hint", i === hint));
  touchGuide.querySelectorAll("span").forEach((zone, i) => zone.classList.toggle("hint", settings.controls === "drag" && i === hint));
}
function finishTutorial() {
  settings.tutorial = true;
  saveSettings();
  laneControls.querySelectorAll("button").forEach((b) => b.classList.remove("hint"));
  touchGuide.querySelectorAll("span").forEach((zone) => zone.classList.remove("hint"));
  // The tutorial ran on the chosen mode's song: start that mode.
  begin(pendingKind);
}
function relicFound(id: RelicId) {
  const relic = getRelic(id)!;
  if (!recordRelic(id)) return;
  newRelics.push(id);
  addCrystals(10);
  announce(`¡Reliquia! ${relic.name}`, "relic", 2800);
  audio.fanfare();
  vibrate([20, 40, 20, 40, 60]);
}
function onPower(hit: Hit) {
  const power = hit.power!;
  if (power === "slow") slowUntil = Math.max(slowUntil, hit.note.time) + POWER_SECONDS * perks.powerDuration;
  announce(powerNames[power], "power", 1200);
  audio.rise(4);
  vibrate(20);
}
function hitFeedback(hit: Hit) {
  const title = hit.shielded ? "¡Escudo!" : hit.saved ? "¡Salvado!" : hit.judgment === "perfect" ? "Perfecto" : hit.judgment === "good" ? "Bien" : "Fallo";
  const detail = hit.shielded ? "FALLO ABSORBIDO" : hit.saved ? "ÚLTIMA LUZ · SIGUES EN PIE" : hit.crystal ? "+ CRISTAL" : hit.judgment === "miss" ? "VUELVE AL PULSO" : run.combo >= 2 ? `${run.combo} DE COMBO` : "SIGUE ASÍ";
  feedback.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
  feedback.className = `feedback show ${hit.shielded ? "shield" : hit.judgment}`;
  feedbackUntil = performance.now() + 520;
  scene.hit(hit.note.lane, hit.judgment, settings.reduced, hit.crystal, { relic: !!hit.relic, power: hit.power, shielded: hit.shielded, saved: hit.saved });
  if (hit.judgment === "miss") {
    if (hit.shielded) audio.rise(3);
    else audio.tick("miss");
  } else audio.hit(hit.judgment, run.combo);
  if (hit.relic) relicFound(hit.relic as RelicId);
  if (hit.power) onPower(hit);
  const multiplier = run.multiplier;
  const endless = endlessRun();
  const fever = endless ? endless.fever : multiplier === 4;
  if (fever && !wasFever) {
    fevers++;
    hud.classList.add("fever");
    announce(endless ? "¡FIEBRE! PUNTOS ×1,5" : "¡FIEBRE! ×4", "fever", 1900);
    audio.rise(10);
  } else if (!fever && wasFever) hud.classList.remove("fever");
  wasFever = fever;
  if (multiplier > lastMultiplier) {
    bump($("#combo"));
    if (!fever) {
      announce(`COMBO ×${multiplier}`, "combo", 1000);
      audio.rise(multiplier + 2);
    }
  }
  lastMultiplier = multiplier;
  if (recorder) recorder.judged(hit.note.id, run.score);
  if (hit.judgment !== "miss" && recordAtStart > 0 && !passedRecord && run.score > recordAtStart) {
    passedRecord = true;
    announce("¡NUEVO RÉCORD!", "record", 2100);
    audio.fanfare();
  } else if (hit.judgment !== "miss" && !hit.relic && !hit.power && run.score >= nextMilestone && performance.now() > motivationUntil + 4500) {
    lastEncouragement = nextMessage(encouragements, lastEncouragement);
    announce(lastEncouragement, "cheer", 2300);
    nextMilestone = run.score + 2500;
  }
  if (!hit.relic) vibrate(hit.judgment === "miss" && !hit.shielded ? 35 : 10);
}
function tap(lane: Lane) {
  if (!["playing", "tutorial"].includes(mode) || document.hidden || isLandscape()) return;
  controlLane = lane;
  scene.tap(lane);
  if (!touchControls()) {
    const button = laneControls.querySelector(`[data-lane="${lane}"]`)!;
    button.classList.add("pressed");
    window.setTimeout(() => button.classList.remove("pressed"), 100);
  }
  if (mode === "tutorial") {
    const t = performance.now() / 1000 - tutorialStarted;
    tutorialRun.tap(lane, t).forEach(tutorialFeedback);
    return;
  }
  const t = judgeTime();
  recorder?.tap(t, lane);
  run.tap(lane, t).forEach(hitFeedback);
  updateHUD();
  if (run.dead) die();
}
function tutorialFeedback(hit: Hit) {
  if (hit.judgment === "miss") { makeTutorialNote(tutorialTime + 1.5); return; }
  audio.tick("perfect");
  scene.hit(hit.note.lane, "perfect", settings.reduced);
  feedback.innerHTML = `<strong>¡Eso es!</strong><span>${tutorialStep >= 4 ? "VAS EN RACHA" : "BUEN ATERRIZAJE"}</span>`;
  feedback.className = "feedback show perfect";
  feedbackUntil = performance.now() + 450;
  tutorialStep++;
  if (tutorialStep >= tutorialLanes.length) { finishTutorial(); return; }
  makeTutorialNote(tutorialTime + 1.6);
  renderTutorial();
}
let lastPowerRow = "";
function updatePowerRow(time: number) {
  const endless = endlessRun();
  let html = "";
  if (endless) {
    const chip = (power: "shield" | "double" | "slow", text: string) => `<span class="power-chip ${power}">${powerIcon(power)}${text}</span>`;
    if (endless.shields) html += chip("shield", `×${endless.shields}`);
    if (endless.doubleActive(time)) html += chip("double", `${Math.ceil(endless.doubleUntil - time)} s`);
    if (time < slowUntil) html += chip("slow", `${Math.ceil(slowUntil - time)} s`);
    if (endless.lastStand) html += `<span class="power-chip stand" title="Última luz disponible">${icon("star")}</span>`;
  }
  if (html !== lastPowerRow) $("#power-row").innerHTML = lastPowerRow = html;
}
function updateHUD() {
  $("#score").textContent = fmt(run.score);
  $("#combo").textContent = `×${run.multiplier}`;
  const endless = endlessRun();
  const fever = endless ? endless.fever : run.multiplier === 4;
  $("#combo-label").textContent = run.combo ? `${fever ? "FIEBRE · " : ""}${run.combo} DE COMBO` : "MULTIPLICADOR";
  $("#energy-fill").style.transform = `scaleX(${run.energy / 100})`;
  $("#energy-fill").classList.toggle("low", run.energy <= 40);
  $(".energy").setAttribute("aria-label", `Energía: ${Math.round(run.energy)} de 100`);
  $(".energy").setAttribute("role", "progressbar");
  $(".energy").setAttribute("aria-valuemin", "0");
  $(".energy").setAttribute("aria-valuemax", "100");
  $(".energy").setAttribute("aria-valuenow", String(Math.round(run.energy)));
  if (ghost && kind === "song" && run.index > 0) {
    const theirs = ghost.scores[Math.min(ghost.scores.length - 1, run.index - 1)];
    if (theirs !== undefined) {
      const diff = run.score - theirs;
      const delta = $("#ghost-delta");
      delta.textContent = `${diff >= 0 ? "+" : "−"}${fmt(Math.abs(diff))} vs récord`;
      delta.className = diff >= 0 ? "ahead" : "behind";
    }
  }
}
function die() {
  if (mode !== "playing") return;
  deathTime = judgeTime();
  deathAt = performance.now();
  setMode("dying");
  hud.classList.remove("fever");
  audio.tapeStop();
  scene.shatter(settings.reduced);
  vibrate([40, 50, 90]);
  const generation = loadingGeneration;
  window.setTimeout(() => {
    if (mode === "dying" && generation === loadingGeneration) finishRun(false);
  }, settings.reduced ? 450 : 1150);
}
function shareText(completed: boolean, percent: number) {
  if (kind === "endless") return `Llegué a la etapa ${lastStage + 1} del modo Infinito en Neo Rush con ${fmt(run.score)} puntos. ¿Me superas?`;
  if (kind === "daily") return `Reto del ${new Date().toLocaleDateString("es", { day: "numeric", month: "long" })}: etapa ${lastStage + 1} y ${fmt(run.score)} puntos en Neo Rush. Hoy el recorrido es igual para todos. ¿Me superas?`;
  const stars = "★".repeat(run.stars);
  return completed
    ? `Completé ${level.name} en Neo Rush con ${fmt(run.score)} puntos ${stars}. ¿Me superas?`
    : `Llegué al ${percent} % de ${level.name} en Neo Rush con ${fmt(run.score)} puntos. ¿Me superas?`;
}
async function share(text: string) {
  const url = new URL(assetUrl(""), location.href).href;
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "Neo Rush", text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast("Copiado. Pégalo donde quieras.");
  } catch (error) {
    if ((error as DOMException)?.name !== "AbortError") toast("Este navegador no permite compartir desde aquí.");
  }
}
function countUp(node: HTMLElement, value: number) {
  if (settings.reduced || value <= 0) return;
  const start = performance.now(), duration = 850;
  const step = () => {
    if (!node.isConnected) return;
    const k = Math.min(1, (performance.now() - start) / duration);
    node.textContent = fmt(Math.round(value * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  node.textContent = "0";
  requestAnimationFrame(step);
}
function finishRun(completed: boolean) {
  if (mode === "results") return;
  audio.pause();
  run.finished = completed;
  const endless = endlessRun();
  const stage = endless ? stageOf(deathTime) + 1 : 0;
  const stats: RunStats = {
    kind, level: kind === "song" ? level.id : undefined, completed, stars: run.stars, score: run.score,
    perfects: run.perfect, goods: run.good, maxCombo: run.maxCombo, crystals: run.crystals,
    fevers, powers: endless?.powers ?? 0, relics: newRelics.length, stage,
  };
  // Per-mode bests.
  let headline = "", recordText = "", subtitle = "", improvedAny = false, percent = 0;
  if (!endless) {
    percent = progressPercent(completed ? DURATION : deathTime, DURATION, completed);
    const previousBest = getBestProgress(level.id);
    const improved = saveProgress(percent, level.id);
    const record = saveRecord(run.score, level.id);
    saveStars(run.stars, level.id);
    if (record && recorder) saveGhost(level.id, recorder.finish(completed ? DURATION : deathTime));
    if (completed && level.id === "servellon") grantFeat("nightmare");
    improvedAny = improved || record;
    const stars = run.stars;
    headline = completed
      ? `<div class="result-stars" aria-label="${stars} de 3 estrellas">${[1, 2, 3].map((x) => `<span class="${x <= stars ? "earned" : ""}">${icon("star")}</span>`).join("")}</div>`
      : `<div class="run-progress"><div class="run-percent"><strong>${percent}</strong><span>%</span></div><div class="progress-meter" role="progressbar" aria-label="Camino recorrido" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="transform:scaleX(${percent / 100})"></span>${previousBest > 0 && previousBest < 100 ? `<i style="left:${previousBest}%" title="Mejor marca anterior"></i>` : ""}</div><small class="${improved ? "improved" : ""}">${improved && previousBest > 0 ? "¡Nueva mejor marca!" : improved ? "Tu primera marca en este nivel" : `Tu mejor marca: ${previousBest} %`}</small></div>`;
    recordText = record ? `${icon("trophy")} NUEVO RÉCORD` : `RÉCORD PERSONAL · ${fmt(getRecord(level.id))}`;
    subtitle = `${level.name} · Intento ${getAttempts(level.id)}${completed ? "<br/>Ese ritmo ya es tuyo." : ""}`;
  } else {
    const improved = kind === "daily" ? saveDaily(today, run.score, stage) : saveEndless(run.score, stage);
    if (stage >= 10) grantFeat("stage10");
    improvedAny = improved.score || improved.stage;
    const best = kind === "daily" ? dailyBest(today) : endlessBest();
    headline = `<div class="run-progress"><div class="run-percent stage"><span class="unit">ETAPA</span><strong>${stage}</strong></div><small class="${improved.stage ? "improved" : ""}">${improved.stage && bestStageAtStart > 0 ? "¡Nueva mejor etapa!" : improved.stage ? "Tu primera marca" : `Tu mejor etapa: ${best.stage}`} · velocidad ${speedText(stageRate(stage - 1, perks.rateStep))}</small></div>`;
    recordText = improved.score ? `${icon("trophy")} NUEVO RÉCORD` : `RÉCORD ${kind === "daily" ? "DE HOY" : "INFINITO"} · ${fmt(best.score)}`;
    subtitle = kind === "daily" ? `Reto diario · ${new Date().toLocaleDateString("es", { day: "numeric", month: "long" })}` : `Infinito · Partida ${endlessPlays()}`;
  }
  // Meta-progression: missions, experience, unlocks.
  const missions = applyRun(getMissions(), stats);
  setMissions(missions.state);
  const missionCrystals = missions.completed.reduce((sum, m) => sum + m.reward, 0);
  const xp = xpForRun(stats);
  const levelsGained = addXp(xp);
  const levelCrystals = levelsGained.reduce((sum, l) => sum + levelReward(l), 0);
  addCrystals(run.crystals + missionCrystals + levelCrystals);
  const after = progressSnapshot();
  const unlocked = unlockedBetween(progressAtStart, after);
  const gained = after.crystals - progressAtStart.crystals;
  if (!completed) lastLoss = nextMessage(lossMessages, lastLoss);
  setMode("results");
  feedback.textContent = "";
  const { level: lvl, into, needed } = playerLevel();
  const next = nextSkin(after.crystals);
  const rows: string[] = [
    `<div class="reward-row">${icon("diamond")}<span><b>+${gained}</b> cristales · ${fmt(after.crystals)} en total</span></div>`,
    `<div class="reward-row xp">${icon("level")}<span><b>+${xp} XP</b> · Nivel ${lvl}</span><div class="bank-track"><span style="transform:scaleX(${into / needed})"></span></div></div>`,
    ...levelsGained.map((l) => `<div class="reward-row gold">${icon("level")}<span>¡Subiste a nivel ${l}! <b>+${levelReward(l)}</b> ◆</span></div>`),
    ...missions.completed.map((m: Mission) => `<div class="reward-row gold">${icon("check")}<span>Misión: ${m.text} <b>+${m.reward}</b> ◆</span></div>`),
    ...newRelics.map((id) => `<div class="reward-row relic">${relicIcon(id)}<span>Reliquia: ${getRelic(id)!.name} <b>+10</b> ◆</span></div>`),
    ...unlocked.map((skin) => `<div class="unlock"><span class="unlock-orb" style="background:${skin.preview}"></span><div><strong>¡Nueva esfera: ${skin.name}!</strong><small>${skin.perk}</small></div><button class="secondary" data-equip="${skin.id}">Usar</button></div>`),
  ];
  if (!unlocked.length && next) {
    const cost = (next.unlock as { cost: number }).cost;
    rows.push(`<div class="reward-row muted"><span class="mini-orb" style="background:${next.preview}"></span><span>Faltan ${cost - after.crystals} cristales para ${next.name}</span></div>`);
  }
  const canShare = typeof navigator.share === "function" || !!navigator.clipboard?.writeText;
  const statsRow = endless
    ? `<div><strong>${run.accuracy}%</strong><span>Precisión</span></div><div><strong>${run.maxCombo}</strong><span>Combo máx.</span></div><div><strong>${endless.powers}</strong><span>Potenciadores</span></div>`
    : `<div><strong>${run.accuracy}%</strong><span>Precisión</span></div><div><strong>${run.maxCombo}</strong><span>Combo máx.</span></div><div><strong>${run.crystals}</strong><span>Cristales</span></div>`;
  screen.innerHTML = `<div class="results-panel ${completed ? "won" : "lost"}"><div class="result-symbol">${icon(completed ? "trophy" : "replay")}</div><h2>${completed ? "¡Camino completo!" : lastLoss}</h2><p>${subtitle}</p>${headline}<div class="final-score" id="final-score">${fmt(run.score)}</div><div class="record-status">${recordText}</div><div class="result-stats">${statsRow}</div><div class="judgment-summary"><span><i class="perfect-dot"></i>${run.perfect} perfectos</span><span>${run.good} buenos</span><span>${run.misses} fallos</span></div><div class="rewards">${rows.join("")}</div><div class="results-actions"><button class="primary" id="replay-button">${icon("replay")}Volver a jugar</button><div class="result-links"><button class="text-button" id="back-home">${icon("home")}Inicio</button>${canShare ? `<button class="text-button" id="share-button">${icon("share")}Compartir</button>` : ""}</div></div>${!storageAvailable ? '<p class="storage-note">El navegador no permite guardar tu progreso.</p>' : ""}</div>`;
  $("#replay-button").onclick = () => void resumeAudioAnd(() => begin(kind));
  $("#back-home").onclick = home;
  $("#share-button")?.addEventListener("click", () => void share(shareText(completed, percent)));
  screen.querySelectorAll<HTMLButtonElement>("[data-equip]").forEach((button) => {
    button.onclick = () => {
      settings.skin = getSkin(button.dataset.equip).id;
      saveSettings();
      scene.setSkin(settings.skin);
      screen.querySelectorAll<HTMLButtonElement>("[data-equip]").forEach((other) => {
        other.textContent = other === button ? "En uso" : "Usar";
        other.disabled = other === button;
      });
    };
  });
  countUp($("#final-score"), run.score);
  if (completed && !settings.reduced && !endless)
    for (let i = 0; i < run.stars; i++) window.setTimeout(() => audio.star(i), 380 + i * 180);
  else if (improvedAny || levelsGained.length || unlocked.length) audio.fanfare();
  syncLevelChip();
  // Keyboard players can replay with Enter; touch players get no stray focus ring.
  if (keyboardPlay) $("#replay-button").focus({ preventScroll: true });
}
async function resumeAudioAnd(action: () => void) {
  if (!silentMode) {
    try {
      await audio.unlock();
    } catch {
      silentMode = true;
      toast("Seguimos sin audio.");
    }
  }
  if (!document.hidden && !isLandscape()) action();
}
function pause(reason = "Tu ritmo puede esperar") {
  if (!["playing", "tutorial", "countdown"].includes(mode)) return;
  if (mode !== "countdown") pauseMode = mode === "tutorial" ? "tutorial" : "playing";
  if (mode === "tutorial") tutorialTime = performance.now() / 1000 - tutorialStarted;
  pausedAt = audio.pause();
  setMode("paused");
  screen.innerHTML = `<div class="center-panel pause-panel"><div class="pause-symbol">${icon("pause")}</div><h2>En pausa</h2><p>${reason}</p><button class="primary" id="continue-button">${icon("play")}Continuar</button><button class="secondary" id="restart-button">${icon("replay")}Empezar de nuevo</button><button class="text-button" id="pause-settings">Ajustes</button><button class="text-button" id="pause-home">Volver al inicio</button></div>`;
  $("#continue-button").onclick = () =>
    void resumeAudioAnd(() =>
      countdown(() => {
        if (pauseMode === "tutorial") {
          tutorialStarted = performance.now() / 1000 - tutorialTime;
          setMode("tutorial");
          renderTutorial();
        } else {
          audio.play(pausedAt, silentMode);
          setMode("playing");
        }
      }),
    );
  $("#restart-button").onclick = () => void resumeAudioAnd(() => (pauseMode === "tutorial" ? beginTutorial() : begin(kind)));
  $("#pause-settings").onclick = openSettings;
  $("#pause-home").onclick = home;
}
let lastSongSecond = -1;
let lastPhase = -1;
function songFrame(t: number, judged: number) {
  $("#progress-fill").style.transform = `scaleX(${Math.min(1, t / DURATION)})`;
  $(".song-progress").setAttribute("aria-valuenow", Math.min(DURATION, t).toFixed(3));
  const second = Math.floor(t), phase = Math.min(4, Math.floor(t / 16));
  if (second !== lastSongSecond) {
    lastSongSecond = second;
    $("#song-time").textContent = `${Math.floor(t / 60)}:${String(second % 60).padStart(2, "0")} / 1:20`;
  }
  if (phase !== lastPhase) {
    lastPhase = phase;
    $("#phase").textContent = `${level.name.toLocaleUpperCase("es")} · ${phases[phase]}`;
  }
  if (!passedBest && bestAtStart > 0 && bestAtStart < 100 && !run.dead && progressPercent(judged, DURATION) > bestAtStart) {
    passedBest = true;
    $("#best-marker").classList.add("passed");
    if (!passedRecord || performance.now() > motivationUntil) {
      announce("¡Superaste tu mejor marca!", "record", 2100);
      audio.fanfare();
    }
  }
  if (!run.dead && t >= DURATION) finishRun(true);
}
function endlessFrame(t: number) {
  const stage = stageOf(t);
  if (stage > lastStage) {
    lastStage = stage;
    scene.stageUp();
    announce(`ETAPA ${stage + 1}`, "stage", 1500);
    audio.rise(6);
    vibrate(30);
    if (bestStageAtStart > 0 && stage + 1 === bestStageAtStart + 1) {
      window.setTimeout(() => {
        if (mode === "playing") announce("¡Nueva mejor etapa!", "record", 2000);
      }, 1300);
    }
  }
  const rate = stageRate(stage, perks.rateStep) * (t < slowUntil ? SLOW_FACTOR : 1);
  if (Math.abs(audio.speed - rate) > 1e-6) audio.setRate(rate);
  $("#progress-fill").style.transform = `scaleX(${(t % STAGE_LENGTH) / STAGE_LENGTH})`;
  if (stage !== lastPhase) {
    lastPhase = stage;
    $("#phase").textContent = `${kind === "daily" ? "RETO DIARIO" : "INFINITO"} · ETAPA ${stage + 1} · ${speedText(stageRate(stage, perks.rateStep))}`;
  }
  const second = Math.floor(t);
  if (second !== lastSongSecond) {
    lastSongSecond = second;
    $("#song-time").textContent = speedText(audio.speed);
  }
  updatePowerRow(t);
}
function frame() {
  if (mode === "playing") {
    const t = audio.time;
    const judged = judgeTime();
    road?.ensure(t + 8);
    const hits = run.advance(judged);
    hits.forEach(hitFeedback);
    if (hits.length) updateHUD();
    if (road) endlessFrame(t);
    else songFrame(t, judged);
    if (run.dead) die();
  } else if (mode === "countdown") {
    const n = Math.ceil((countdownEnd - performance.now()) / COUNT_STEP);
    if (n <= 0) countAction();
    else if (n !== lastCount) {
      lastCount = n;
      $("#countdown strong").textContent = String(n);
      audio.tick("count");
    }
  } else if (mode === "tutorial") {
    tutorialTime = performance.now() / 1000 - tutorialStarted;
    tutorialRun.advance(tutorialTime).forEach(tutorialFeedback);
  }
  if (performance.now() > motivationUntil) $("#motivation").classList.remove("visible");
  if (performance.now() > feedbackUntil) feedback.classList.remove("show");
}
scene.onFrame = frame;
scene.getView = () => {
  const inTutorial = mode === "tutorial" || (mode === "paused" && pauseMode === "tutorial");
  const endless = inTutorial ? null : endlessRun();
  const time = inTutorial ? tutorialTime : mode === "dying" ? deathTime + ((performance.now() - deathAt) / 1000) * 0.12 : judgeTime();
  return {
    mode,
    time,
    notes: inTutorial ? [tutorialNote] : chart,
    judged: mode === "tutorial" ? undefined : run.judged,
    reduced: settings.reduced,
    combo: inTutorial ? 0 : run.combo,
    active: mode === "playing",
    travel: inTutorial ? 2.4 : endless ? travelAt(time) : level.travel,
    bpm: inTutorial ? undefined : endless ? ENDLESS_TRACK.bpm : level.bpm,
    energy: inTutorial ? undefined : run.energy,
    fever: endless ? endless.fever : undefined,
    section: endless ? Math.floor(musicOffset(time) / 16) : undefined,
    stageHue: endless && lastStage ? (0.45 + lastStage * 0.17) % 1 : undefined,
    ghostLane: !inTutorial && ghost && kind === "song" ? ghostLane(ghost, time) : undefined,
    shields: endless?.shields ?? 0,
    doubleActive: !!endless && endless.doubleActive(time),
    slowActive: !!endless && time < slowUntil,
    relicFound: hasRelic,
  };
};
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  transparent: true,
  width: $(".cabinet").clientWidth,
  height: $(".cabinet").clientHeight,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene],
  audio: { noAudio: true },
  render: { antialias: true, pixelArt: false, roundPixels: false },
  fps: { target: 60 },
  banner: false,
});
const observer = new ResizeObserver(() => game.scale.resize($(".cabinet").clientWidth, $(".cabinet").clientHeight));
observer.observe($(".cabinet"));

function showDialog(title: string, body: string, className = "") {
  dialog.className = className;
  dialog.innerHTML = `<div class="dialog-head"><h2>${title}</h2><button class="icon-button" id="close-dialog" aria-label="Cerrar">${icon("close")}</button></div>${body}`;
  $("#close-dialog").onclick = () => dialog.close();
  dialog.showModal();
}
dialog.addEventListener("close", () => {
  if (mode === "home") home();
});
function applyTheme() {
  const theme = getTheme(settings.theme);
  document.documentElement.dataset.theme = theme.id;
  for (const [key, value] of Object.entries(themeVariables(theme.id))) document.documentElement.style.setProperty(key, value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.background);
  scene.setTheme(theme.id);
}
function themePicker() {
  return `<fieldset class="theme-picker"><legend>Color del juego</legend><div class="theme-options">${themes.map((theme) => `<label class="theme-option"><input type="radio" name="theme" value="${theme.id}" aria-label="${theme.name}" ${settings.theme === theme.id ? "checked" : ""}/><span class="theme-choice"><span class="theme-swatch" style="--swatch:${theme.accent}">${icon("check")}</span><span>${theme.name}</span></span></label>`).join("")}</div></fieldset>`;
}
function controlPicker() {
  return `<fieldset class="control-picker"><legend>Controles</legend>${controlModes.map((m) => `<label class="control-option"><input type="radio" name="controls" value="${m.id}" ${settings.controls === m.id ? "checked" : ""}/><span class="control-choice">${icon(m.id === "buttons" ? "center" : m.id === "drag" ? "touch" : "swipe")}<span><strong>${m.name}</strong><small>${m.hint}</small></span></span></label>`).join("")}</fieldset>`;
}
function openSettings() {
  if (["playing", "tutorial", "countdown"].includes(mode)) pause();
  showDialog(
    "A tu ritmo",
    `<p class="dialog-intro">Los ajustes se guardan en este dispositivo.</p>${controlPicker()}${themePicker()}<label class="setting-row"><span><strong>Fantasma de tu récord</strong><small>Una esfera translúcida repite tu mejor partida de cada canción</small></span><input type="checkbox" id="ghost-setting" ${settings.ghost ? "checked" : ""}/></label><label class="setting-row"><span><strong>Sonido</strong><small>Música y efectos de la partida</small></span><input type="checkbox" id="sound-setting" ${settings.sound ? "checked" : ""}/></label><label class="setting-row"><span><strong>Vibración</strong><small>${typeof navigator.vibrate === "function" ? "Un pequeño pulso al tocar" : "No disponible en este navegador"}</small></span><input type="checkbox" id="vibration-setting" ${settings.vibration ? "checked" : ""} ${typeof navigator.vibrate !== "function" ? "disabled" : ""}/></label><label class="setting-row"><span><strong>Efectos reducidos</strong><small>Sin partículas, pulsos, sacudidas ni destellos</small></span><input type="checkbox" id="reduced-setting" ${settings.reduced ? "checked" : ""}/></label><div class="sync-setting"><label for="offset-setting">Sincronización <output id="offset-value">${settings.offset} ms</output></label><p>Si el sonido llega tarde, mueve el ajuste a la derecha. La pista visual se retrasará junto con los toques.</p><input type="range" min="-200" max="200" step="10" value="${settings.offset}" id="offset-setting"/><div class="range-labels"><span>−200 ms</span><button class="text-button" id="reset-offset">Restablecer</button><span>+200 ms</span></div></div><button class="secondary full" id="practice-button">Repetir tutorial</button><a class="secondary full" href="${assetUrl("lite.html")}">Activar modo ultraligero</a><p class="dialog-note">Ultraligero, para celulares antiguos: dibujo 2D sin efectos. Conserva canciones, récords y cristales; no incluye Infinito ni reto diario.</p>`,
  );
  dialog.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach((input) => {
    input.onchange = () => {
      settings.theme = getTheme(input.value).id;
      saveSettings();
      applyTheme();
    };
  });
  dialog.querySelectorAll<HTMLInputElement>('input[name="controls"]').forEach((input) => {
    input.onchange = () => {
      settings.controls = getControlMode(input.value);
      saveSettings();
      syncTouchGuide();
      setMode(mode);
    };
  });
  for (const [id, key] of [["sound-setting", "sound"], ["vibration-setting", "vibration"], ["reduced-setting", "reduced"], ["ghost-setting", "ghost"]] as const) {
    $<HTMLInputElement>(`#${id}`).onchange = (e) => {
      settings[key] = (e.target as HTMLInputElement).checked;
      saveSettings();
      syncSound();
      document.documentElement.classList.toggle("reduced", settings.reduced);
    };
  }
  $<HTMLInputElement>("#offset-setting").oninput = (e) => {
    settings.offset = Number((e.target as HTMLInputElement).value);
    $("#offset-value").textContent = `${settings.offset} ms`;
    saveSettings();
  };
  $("#reset-offset").onclick = () => {
    settings.offset = 0;
    $<HTMLInputElement>("#offset-setting").value = "0";
    $("#offset-value").textContent = "0 ms";
    saveSettings();
  };
  $("#practice-button").onclick = () => {
    dialog.close();
    void prepare(kind, true);
  };
}
function collection() {
  const progress = progressSnapshot(), current = activeSkin().id;
  const open = skins.filter((skin) => isUnlocked(skin, progress)).length;
  showDialog(
    "Tus esferas",
    `<p class="dialog-intro">Tienes <strong class="crystal-count">${icon("diamond")}${fmt(progress.crystals)}</strong> cristales y ${open} de ${skins.length} esferas. Los cristales nunca se gastan: al llegar a la cifra, la esfera es tuya. Otras se ganan con tu nivel o con hazañas.</p><p class="dialog-intro perk-note">${icon("infinity")} Cada esfera tiene una habilidad que solo actúa en Infinito y en el reto diario. En las canciones todas puntúan igual.</p><fieldset class="skin-picker"><legend>Elige tu esfera</legend><div class="skin-options">${skins
      .map((skin) => {
        const unlocked = isUnlocked(skin, progress);
        return `<label class="skin-option${unlocked ? "" : " locked"}"><input type="radio" name="skin" value="${skin.id}" ${skin.id === current ? "checked" : ""} ${unlocked ? "" : "disabled"} aria-label="${skin.name}${unlocked ? `. ${skin.perk}` : `, se desbloquea: ${unlockLabel(skin)}`}"/><span class="skin-choice"><span class="skin-orb" style="background:${skin.preview}">${unlocked ? "" : icon("lock")}</span><strong>${skin.name}</strong><small class="perk">${skin.perk}</small><small class="unlock-label">${unlocked ? skin.description : `${skin.unlock.kind === "crystals" ? icon("diamond") : skin.unlock.kind === "level" ? icon("level") : icon("star")}${unlockLabel(skin)}`}</small></span></label>`;
      })
      .join("")}</div></fieldset>`,
    "wide",
  );
  dialog.querySelectorAll<HTMLInputElement>('input[name="skin"]').forEach((input) => {
    input.onchange = () => {
      settings.skin = getSkin(input.value).id;
      saveSettings();
      scene.setSkin(settings.skin);
    };
  });
}
function missionsDialog() {
  const { level: lvl, into, needed } = playerLevel();
  const state = getMissions();
  showDialog(
    "Tu progreso",
    `<div class="level-card"><div class="level-badge">${icon("badge")}<strong>${lvl}</strong></div><div><strong>Nivel ${lvl}</strong><div class="bank-track"><span style="transform:scaleX(${into / needed})"></span></div><small>${into} / ${needed} XP · Al subir ganas ${levelReward(lvl + 1)} cristales</small></div></div><p class="dialog-intro">Cada partida suma experiencia, incluso cuando pierdes. Completa misiones para ganar cristales; al terminar una, llega la siguiente.</p><ul class="mission-list">${state.active
      .map((slot) => {
        const mission = missionAt(slot.index);
        const shown = Math.min(mission.target, slot.progress);
        return `<li><div><strong>${mission.text}</strong><small>${mission.mode === "total" ? `${fmt(shown)} / ${fmt(mission.target)}` : "En una sola partida"}</small><div class="bank-track"><span style="transform:scaleX(${shown / mission.target})"></span></div></div><span class="mission-reward">+${mission.reward}${icon("diamond")}</span></li>`;
      })
      .join("")}</ul><p class="dialog-note">Reliquias ${foundRelics().length}/${relics.length} · Esferas ${skins.filter((s) => isUnlocked(s, progressSnapshot())).length}/${skins.length} · La esfera Cromo llega en el nivel 10.</p>`,
  );
}
function relicsDialog() {
  const found = foundRelics();
  showDialog(
    "Reliquias del ritmo",
    `<p class="dialog-intro">Diez objetos musicales escondidos en el camino. Brillan en dorado sobre una plataforma: aterriza con un <strong>Perfecto</strong> para guardarlos. Cada uno da 10 cristales. Encuéntralos todos y desbloquea la esfera <strong>Leyenda</strong>.</p><div class="relic-progress"><div class="bank-track"><span style="transform:scaleX(${found.length / relics.length})"></span></div><small>${found.length} de ${relics.length}</small></div><ul class="relic-grid">${relics
      .map((relic) => {
        const has = found.includes(relic.id);
        return `<li class="${has ? "found" : "missing"}"><span class="relic-icon">${has ? relicIcon(relic.id) : "?"}</span><div><strong>${has ? relic.name : "???"}</strong><small>${has ? relic.lore : `Pista: ${relic.hint}`}</small></div></li>`;
      })
      .join("")}</ul>`,
    "wide",
  );
}
async function install() {
  if (matchMedia("(display-mode: standalone)").matches) {
    toast("Ya estás jugando desde la app.");
    return;
  }
  if (installEvent) {
    const event = installEvent;
    installEvent = null;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") toast("Instalación iniciada.");
    return;
  }
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  showDialog(
    "Lleva el ritmo contigo",
    isIOS
      ? `<p>Abre esta página en Safari y sigue estos pasos:</p><ol class="install-steps"><li>Toca <strong>Compartir</strong> en el menú del navegador.</li><li>Elige <strong>Añadir a pantalla de inicio</strong>.</li><li>Si aparece, activa <strong>Abrir como app web</strong> y toca <strong>Añadir</strong>.</li></ol><p class="dialog-note">Puedes seguir jugando aquí sin instalar nada.</p>`
      : `<p>Abre el menú de tu navegador y busca <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p><p>Si estás dentro de otra app, abre esta página en Chrome o Safari.</p><p class="dialog-note">La instalación depende del navegador. Jugar aquí siempre sigue disponible.</p>`,
  );
}
function credits() {
  showDialog(
    "Detrás del pulso",
    `<p><strong>Neo Rush</strong><br/>Un juego original para este proyecto.</p><p><strong>Cuatro pistas originales</strong><br/>Pequeña Órbita, First Light, Neon Sprint y Umbral Cero. Música y efectos sintetizados para el juego, sin muestras de terceros. Infinito repite First Light y la acelera.</p><p><strong>Reliquias del ritmo</strong><br/>Diez objetos musicales originales, dibujados para el juego: metrónomo, casete, diapasón, vinilo y más.</p><p><strong>Diseño y desarrollo</strong><br/>Proyecto creado con asistencia de Codex y Claude. Motor Phaser, tipografía Outfit y recursos gráficos originales.</p><p class="dialog-note">Inspirado en los juegos de ritmo. Sin recursos de Tiles Hop, Magic Tiles o Dancing Road. Licencias completas incluidas en el proyecto.</p>`,
  );
}
$("#settings-button").onclick = openSettings;
$("#level-chip").onclick = missionsDialog;
$("#sound-button").onclick = () => {
  settings.sound = !settings.sound;
  saveSettings();
  syncSound();
};
$("#pause-button").onclick = () => pause();
$(".wordmark").onclick = (e) => {
  e.preventDefault();
  home();
};
laneControls.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
  button.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    keyboardPlay = false;
    tap(Number(button.dataset.lane) as Lane);
  });
  button.addEventListener("click", (e) => {
    if (e.detail === 0) tap(Number(button.dataset.lane) as Lane);
  });
});
// Touch steering: drag anywhere (three invisible columns) or swipe.
const swipe = new SwipeTracker();
let dragLane: Lane | null = null;
function touchSteer(e: PointerEvent, phase: "down" | "move") {
  if (!e.isPrimary) return;
  e.preventDefault();
  keyboardPlay = false;
  const rect = touchLayer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (settings.controls === "drag") {
    const lane = laneFromX(x, rect.width);
    if (phase === "down" || lane !== dragLane) {
      dragLane = lane;
      tap(lane);
    }
  } else if (phase === "down") swipe.down(x);
  else {
    const step = swipe.move(x);
    if (step) {
      const lane = stepLane(controlLane, step);
      if (lane !== controlLane) tap(lane);
    }
  }
}
touchLayer.addEventListener("pointerdown", (e) => {
  try {
    touchLayer.setPointerCapture(e.pointerId);
  } catch {
    /* Capture is optional: steering still works without it. */
  }
  touchSteer(e, "down");
});
touchLayer.addEventListener("pointermove", (e) => {
  if (e.buttons || e.pointerType === "touch") touchSteer(e, "move");
});
const release = () => {
  swipe.up();
  dragLane = null;
};
touchLayer.addEventListener("pointerup", release);
touchLayer.addEventListener("pointercancel", release);
document.addEventListener("keydown", (e) => {
  if (dialog.open || e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  const keys: Record<string, Lane> = { ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2, a: 0, s: 1, d: 2 };
  if (e.key in keys && ["playing", "tutorial"].includes(mode)) {
    keyboardPlay = true;
    e.preventDefault();
    tap(keys[e.key]);
  }
  if (e.key === "Escape" && ["playing", "tutorial", "countdown"].includes(mode)) pause();
  if ((e.key === "r" || e.key === "R") && mode === "results") {
    e.preventDefault();
    void resumeAudioAnd(() => begin(kind));
  }
});
function isLandscape() {
  return matchMedia("(orientation: landscape) and (max-height: 560px) and (pointer: coarse)").matches;
}
function orientation() {
  const landscape = isLandscape();
  $("#orientation").hidden = !landscape;
  if (landscape) pause("Gira el teléfono para continuar.");
}
window.addEventListener("resize", orientation);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause("La partida se detuvo mientras estabas fuera.");
});
window.addEventListener("pagehide", () => pause());
window.addEventListener("blur", () => {
  if (!dialog.open) pause("Continúa cuando estés listo.");
});
audio.onInterruption = () => pause("El audio se interrumpió. Toca Continuar para retomarlo.");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e as typeof installEvent;
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  toast("Neo Rush ya está en tu pantalla de inicio.");
});
const updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    offlineReady = true;
    if (mode === "home") $("#offline-label").innerHTML = cacheLabel();
  },
  onNeedRefresh() {
    updateAvailable = true;
    if (mode === "home") home();
  },
  onRegisterError() {
    /* Gameplay remains available online. */
  },
});
document.documentElement.classList.toggle("reduced", settings.reduced);
scene.setSkin(activeSkin().id);
applyTheme();
syncTouchGuide();
home();
orientation();
$(".song-progress").setAttribute("role", "progressbar");
$(".song-progress").setAttribute("aria-label", "Progreso de la canción");
$(".song-progress").setAttribute("aria-valuemin", "0");
$(".song-progress").setAttribute("aria-valuemax", "80");
$(".song-progress").setAttribute("aria-valuenow", "0");
if ("serviceWorker" in navigator && "caches" in window) {
  void navigator.serviceWorker.ready
    .then(async () => {
      const cached = await Promise.all([
        caches.match(new URL(assetUrl("index.html"), location.origin).href, { ignoreSearch: true }),
        ...levels.map((item) => caches.match(new URL(assetUrl(`audio/${item.audio}`), location.origin).href, { ignoreSearch: true })),
      ]);
      if (cached.every(Boolean)) {
        offlineReady = true;
        if (mode === "home") $("#offline-label").innerHTML = cacheLabel();
      }
    })
    .catch(() => {});
}
