import Phaser from "phaser";
import "@fontsource-variable/outfit";
import "./style.css";
import { registerSW } from "virtual:pwa-register";
import {
  chart,
  DURATION,
  phases,
  TRACK_NAME,
  type Lane,
  type Note,
} from "./core/chart";
import { Run, type Hit } from "./core/rules";
import { Conductor } from "./audio/conductor";
import { RoadScene } from "./game/RoadScene";
import { themes, getTheme, themeVariables } from "./themes";
import { assetUrl } from "./paths";
import {
  settings,
  saveSettings,
  getRecord,
  saveRecord,
  storageAvailable,
} from "./storage";

const paths: Record<string, string> = {
  play: '<path d="m9 5 11 7-11 7Z"/>',
  sound:
    '<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  replay: '<path d="M4 9a8 8 0 1 1 0 6m0-11v5h5"/>',
  trophy:
    '<path d="M8 3h8v7a4 4 0 0 1-8 0Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v7m-4 0h8"/>',
  install: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  diamond: '<path d="m12 3 8 9-8 9-8-9Z"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  center: '<circle cx="12" cy="12" r="4"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
  star: '<path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.3-.9Z"/>',
  headphones:
    '<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H2v7h5v-7Zm16 0h2v7h-5v-7Z"/>',
  home: '<path d="m3 11 9-8 9 8v10h-6v-7H9v7H3Z"/>',
};
const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.play}</svg>`;
const fmt = (n: number) => new Intl.NumberFormat("es-SV").format(n);
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <aside class="desktop-note"><img src="${assetUrl("icons/icon.svg")}" width="44" height="44" alt=""/><span>Pulse Road</span><p>Un toque.<br/>Todo el ritmo.</p><div class="keyboard-guide"><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd><small>También puedes usar el teclado.</small></div></aside>
  <main class="cabinet" aria-label="Pulse Road, juego de ritmo">
    <div id="game" aria-hidden="true"></div>
    <header class="topbar"><a class="wordmark" href="#" aria-label="Pulse Road, inicio">${icon("bolt")}<span>pulse<span class="wordmark-light">road</span></span></a><div class="utilities"><button class="icon-button" id="sound-button" aria-label="Silenciar sonido">${icon("sound")}</button><button class="icon-button" id="settings-button" aria-label="Ajustes">${icon("settings")}</button></div></header>
    <section id="hud" class="hud" hidden><div class="hud-score"><small>PUNTOS</small><strong id="score">0</strong></div><div class="hud-combo"><strong id="combo">×1</strong><small id="combo-label">MULTIPLICADOR</small></div><button class="icon-button" id="pause-button" aria-label="Pausar partida">${icon("pause")}</button><div class="energy"><span id="energy-fill"></span></div><div class="song-progress"><span id="progress-fill"></span></div></section>
    <div id="phase" class="phase" hidden></div>
    <div id="feedback" class="feedback" aria-live="off"></div>
    <section id="screen" class="screen"></section>
    <section id="tutorial-guide" class="tutorial-guide" hidden></section>
    <div id="countdown" class="countdown" hidden></div>
    <div id="lane-controls" class="lane-controls" hidden aria-label="Carriles"><button data-lane="0" aria-label="Carril izquierdo">${icon("left")}<span>IZQUIERDA</span></button><button data-lane="1" aria-label="Carril central">${icon("center")}<span>CENTRO</span></button><button data-lane="2" aria-label="Carril derecho">${icon("right")}<span>DERECHA</span></button></div>
    <div id="song-label" class="song-label" hidden>${icon("headphones")}<span>${TRACK_NAME}</span><span id="song-time">0:00 / 1:20</span></div>
    <div id="orientation" class="orientation" hidden><div>${icon("replay")}<h2>Volvamos a vertical</h2><p>Tu partida está en pausa.<br/>Gira el teléfono para seguir.</p></div></div>
  </main>
  <aside class="desktop-record"><span class="vertical-title">FOLLOW THE PULSE</span><div>${icon("diamond")}<p>80 segundos.<br/>Tu próximo récord.</p><small>Hecho para jugar con un dedo.</small></div></aside>
  <dialog id="dialog"></dialog><div id="toast" class="toast" role="status"></div>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const screen = $("#screen"),
  hud = $("#hud"),
  feedback = $("#feedback"),
  laneControls = $("#lane-controls");
const dialog = $<HTMLDialogElement>("#dialog");
const audio = new Conductor();
const scene = new RoadScene();
type Mode =
  | "home"
  | "loading"
  | "tutorial"
  | "countdown"
  | "playing"
  | "paused"
  | "results";
let mode: Mode = "home";
let run = new Run(chart);
let silentMode = false;
let loadingGeneration = 0;
let pauseMode: "playing" | "tutorial" = "playing";
let pausedAt = 0;
let countdownEnd = 0;
let countAction: () => void = () => {};
let lastCount = -1;
let offlineReady = false;
let updateAvailable = false;
let installEvent:
  | (Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    })
  | null = null;
let feedbackUntil = 0;
let toastTimer = 0;
let tutorialStep = 0;
let tutorialTime = 0;
let tutorialStarted = 0;
let tutorialNote: Note = {
  id: 0,
  lane: 0,
  time: 2,
  crystal: false,
  obstacles: [],
};
const tutorialLanes: Lane[] = [0, 2, 1, 0, 1, 2];
const tutorialTitles = [
  "Toca a la izquierda",
  "Ahora, a la derecha",
  "También hay un centro",
  "Elige el camino libre",
  "Sigue el pulso",
  "Un acierto más",
];
const tutorialCopy = [
  "Cuando la plataforma llegue a la línea.",
  "Un toque por plataforma.",
  "Toca la zona de abajo, bajo el carril.",
  "Los pinchos no son tu camino.",
  "Los aciertos seguidos forman tu combo.",
  "Ya casi estás listo para la canción.",
];

function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => $("#toast").classList.remove("visible"),
    3400,
  );
}
function setMode(value: Mode) {
  mode = value;
  $(".cabinet").dataset.mode = value;
  const active = ["playing", "tutorial", "countdown", "paused"].includes(value);
  hud.hidden = !active;
  $(".topbar").hidden = active;
  laneControls.hidden = !["playing", "tutorial", "countdown"].includes(value);
  $("#song-label").hidden = !active;
  $("#phase").hidden = !["playing", "countdown"].includes(value);
  $("#tutorial-guide").hidden = value !== "tutorial";
  $("#countdown").hidden = value !== "countdown";
  screen.hidden = ["playing", "tutorial", "countdown"].includes(value);
}
function syncSound() {
  audio.mute(!settings.sound);
  $("#sound-button").innerHTML = icon(settings.sound ? "sound" : "mute");
  $("#sound-button").setAttribute(
    "aria-label",
    settings.sound ? "Silenciar sonido" : "Activar sonido",
  );
}
function cacheLabel() {
  return offlineReady
    ? `${icon("check")} Disponible sin conexión`
    : `${icon("headphones")} Mejor con sonido · También puedes jugar en silencio`;
}
function home() {
  loadingGeneration++;
  audio.reset();
  setMode("home");
  scene.reset();
  feedback.textContent = "";
  feedback.className = "feedback";
  screen.innerHTML = `<div class="home-heading"><h1>PULSE<br/><span>ROAD</span></h1><p>Encuentra tu ritmo.</p></div>
    <div class="home-bottom"><div class="record-line">${icon("trophy")}<span>TU RÉCORD</span><strong>${fmt(getRecord())}</strong></div>
    <button class="primary play-button" id="play-button">${icon("play")}<span>Jugar</span><span class="button-detail">80 s</span></button>
    <button class="text-button" id="tutorial-button">Primera vez aquí${icon("arrow")}</button>
    <div class="offline-label" id="offline-label">${cacheLabel()}</div>
    <div class="home-links"><button class="text-button" id="install-button">${icon("install")} Instalar juego</button><button class="text-button" id="credits-button">Créditos</button></div>
    ${updateAvailable ? '<button class="update-button" id="update-button">Hay una nueva versión. Actualizar</button>' : ""}</div>`;
  $("#play-button").onclick = () => void prepare(!settings.tutorial);
  $("#tutorial-button").onclick = () => void prepare(true);
  $("#install-button").onclick = () => void install();
  $("#credits-button").onclick = credits;
  $("#update-button")?.addEventListener("click", () => void updateSW(true));
  syncSound();
}
async function prepare(withTutorial: boolean) {
  const generation = ++loadingGeneration;
  setMode("loading");
  screen.innerHTML = `<div class="center-panel"><div class="loading-orb">${icon("bolt")}</div><h2>Preparando el ritmo</h2><p id="load-copy">Cargando la canción…</p><div class="load-track"><span id="load-fill"></span></div><button class="text-button" id="cancel-load">Volver al inicio</button></div>`;
  $("#cancel-load").onclick = home;
  try {
    await audio.unlock();
    await audio.load((progress) => {
      if (generation !== loadingGeneration) return;
      $("#load-fill").style.transform = `scaleX(${progress})`;
      $("#load-copy").textContent =
        progress < 0.9
          ? `Descargando canción · ${Math.round(progress * 100)} %`
          : "Preparando el sonido…";
    });
    if (generation !== loadingGeneration) return;
    silentMode = false;
    if (document.hidden || isLandscape()) {
      home();
      toast("Todo listo. Toca Jugar cuando vuelvas.");
      return;
    }
    if (withTutorial) beginTutorial();
    else beginRun();
  } catch {
    if (generation !== loadingGeneration) return;
    screen.innerHTML = `<div class="center-panel"><h2>No llegó la canción</h2><p>Comprueba tu conexión y vuelve a intentarlo. También puedes practicar sin audio.</p><button class="primary" id="retry-load">Reintentar</button><button class="secondary" id="silent-play">Jugar sin audio</button><button class="text-button" id="cancel-load">Volver al inicio</button></div>`;
    $("#retry-load").onclick = () => void prepare(withTutorial);
    $("#silent-play").onclick = () => {
      silentMode = true;
      if (withTutorial) beginTutorial();
      else beginRun();
    };
    $("#cancel-load").onclick = home;
  }
}
function beginRun() {
  audio.reset();
  run = new Run(chart);
  scene.reset();
  feedback.textContent = "";
  pauseMode = "playing";
  $("#progress-fill").style.transform = "scaleX(0)";
  $("#song-time").textContent = "0:00 / 1:20";
  $(".song-progress").setAttribute("aria-valuenow", "0");
  updateHUD();
  countdown(() => {
    audio.play(0, silentMode);
    setMode("playing");
  });
}
function countdown(action: () => void) {
  setMode("countdown");
  countAction = action;
  countdownEnd = performance.now() + 3000;
  lastCount = -1;
  $("#countdown").innerHTML =
    "<strong>3</strong><span>Encuentra el pulso</span>";
}
function beginTutorial() {
  audio.reset();
  scene.reset();
  run = new Run(chart);
  tutorialStep = 0;
  tutorialTime = 0;
  pauseMode = "tutorial";
  tutorialStarted = performance.now() / 1000;
  makeTutorialNote(2);
  setMode("tutorial");
  renderTutorial();
  updateHUD();
}
function makeTutorialNote(at: number) {
  const lane = tutorialLanes[tutorialStep];
  tutorialNote = {
    id: tutorialStep,
    lane,
    time: at,
    crystal: tutorialStep === 5,
    obstacles:
      tutorialStep === 3 ? ([0, 1, 2] as Lane[]).filter((x) => x !== lane) : [],
  };
}
function renderTutorial() {
  $("#tutorial-guide").innerHTML =
    `<div class="tutorial-dots">${tutorialLanes.map((_, i) => `<span class="${i <= tutorialStep ? "on" : ""}"></span>`).join("")}</div><h2>${tutorialTitles[tutorialStep]}</h2><p>${tutorialCopy[tutorialStep]}</p><button class="text-button" id="skip-tutorial">Saltar tutorial ${icon("arrow")}</button>`;
  $("#skip-tutorial").onclick = finishTutorial;
  laneControls
    .querySelectorAll("button")
    .forEach((b, i) =>
      b.classList.toggle("hint", i === tutorialLanes[tutorialStep]),
    );
}
function finishTutorial() {
  settings.tutorial = true;
  saveSettings();
  laneControls
    .querySelectorAll("button")
    .forEach((b) => b.classList.remove("hint"));
  beginRun();
}
function hitFeedback(hit: Hit) {
  const text =
    hit.judgment === "perfect"
      ? "Perfecto"
      : hit.judgment === "good"
        ? "Bien"
        : "Fallo";
  feedback.innerHTML = `<strong>${text}</strong><span>${hit.crystal ? "+25 · CRISTAL" : hit.judgment === "miss" ? "VUELVE AL PULSO" : run.combo >= 2 ? `${run.combo} DE COMBO` : "SIGUE ASÍ"}</span>`;
  feedback.className = `feedback show ${hit.judgment}`;
  feedbackUntil = performance.now() + 520;
  scene.hit(hit.note.lane, hit.judgment, settings.reduced);
  audio.tick(hit.judgment);
  if (settings.vibration && typeof navigator.vibrate === "function")
    navigator.vibrate(hit.judgment === "miss" ? 35 : 10);
}
function tap(lane: Lane) {
  if (
    !["playing", "tutorial"].includes(mode) ||
    document.hidden ||
    isLandscape()
  )
    return;
  scene.tap(lane);
  const button = laneControls.querySelector(`[data-lane="${lane}"]`)!;
  button.classList.add("pressed");
  window.setTimeout(() => button.classList.remove("pressed"), 100);
  if (mode === "tutorial") {
    const t = performance.now() / 1000 - tutorialStarted;
    if (lane !== tutorialNote.lane || Math.abs(t - tutorialNote.time) > 0.24)
      return;
    audio.tick("perfect");
    scene.hit(lane, "perfect", settings.reduced);
    feedback.innerHTML = `<strong>¡Eso es!</strong><span>${tutorialStep >= 4 ? "VAS EN RACHA" : "AL RITMO"}</span>`;
    feedback.className = "feedback show perfect";
    feedbackUntil = performance.now() + 450;
    tutorialStep++;
    if (tutorialStep >= tutorialLanes.length) {
      finishTutorial();
      return;
    }
    makeTutorialNote(t + 1.6);
    renderTutorial();
    return;
  }
  const t = Math.max(0, audio.time - settings.offset / 1000);
  for (const missed of run.advance(t)) hitFeedback(missed);
  const hit = run.tap(lane, t);
  if (hit) hitFeedback(hit);
  updateHUD();
  if (run.dead) finishRun(false);
}
function updateHUD() {
  $("#score").textContent = fmt(run.score);
  $("#combo").textContent = `×${run.multiplier}`;
  $("#combo-label").textContent = run.combo
    ? `${run.combo} DE COMBO`
    : "MULTIPLICADOR";
  $("#energy-fill").style.transform = `scaleX(${run.energy / 100})`;
  $("#energy-fill").classList.toggle("low", run.energy <= 40);
  $(".energy").setAttribute("aria-label", `Energía: ${run.energy} de 100`);
  $(".energy").setAttribute("role", "progressbar");
  $(".energy").setAttribute("aria-valuemin", "0");
  $(".energy").setAttribute("aria-valuemax", "100");
  $(".energy").setAttribute("aria-valuenow", String(run.energy));
}
function finishRun(completed: boolean) {
  if (mode === "results") return;
  audio.pause();
  run.finished = completed;
  const record = saveRecord(run.score);
  setMode("results");
  feedback.textContent = "";
  const stars = run.stars;
  screen.innerHTML = `<div class="results-panel"><div class="result-symbol">${icon(completed ? "trophy" : "replay")}</div><h2>${completed ? "¡Camino completo!" : "Una más y lo logras"}</h2><p>${completed ? "Ese ritmo ya es tuyo." : "Cada intento te lleva más lejos."}</p><div class="result-stars" aria-label="${stars} de 3 estrellas">${[1, 2, 3].map((x) => `<span class="${x <= stars ? "earned" : ""}">${icon("star")}</span>`).join("")}</div><div class="final-score">${fmt(run.score)}</div><div class="record-status">${record ? `${icon("trophy")} NUEVO RÉCORD` : `RÉCORD PERSONAL · ${fmt(getRecord())}`}</div><div class="result-stats"><div><strong>${run.accuracy}%</strong><span>Precisión</span></div><div><strong>${run.maxCombo}</strong><span>Combo máx.</span></div><div><strong>${run.crystals}</strong><span>Cristales</span></div></div><div class="judgment-summary"><span><i class="perfect-dot"></i>${run.perfect} perfectos</span><span>${run.good} buenos</span><span>${run.misses} fallos</span></div><button class="primary" id="replay-button">${icon("replay")}Volver a jugar</button><button class="text-button" id="back-home">Volver al inicio</button>${!storageAvailable ? '<p class="storage-note">El navegador no permite guardar tu récord.</p>' : ""}</div>`;
  $("#replay-button").onclick = () => void resumeAudioAnd(beginRun);
  $("#back-home").onclick = home;
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
  if (mode !== "countdown")
    pauseMode = mode === "tutorial" ? "tutorial" : "playing";
  if (mode === "tutorial")
    tutorialTime = performance.now() / 1000 - tutorialStarted;
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
  $("#restart-button").onclick = () => void resumeAudioAnd(beginRun);
  $("#pause-settings").onclick = openSettings;
  $("#pause-home").onclick = home;
}
function frame() {
  if (mode === "playing") {
    const t = audio.time;
    const judgedTime = Math.max(0, t - settings.offset / 1000);
    const missed = run.advance(judgedTime);
    missed.forEach(hitFeedback);
    if (missed.length) updateHUD();
    $("#progress-fill").style.transform =
      `scaleX(${Math.min(1, t / DURATION)})`;
    $(".song-progress").setAttribute(
      "aria-valuenow",
      Math.min(DURATION, t).toFixed(3),
    );
    $("#song-time").textContent =
      `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")} / 1:20`;
    $("#phase").textContent = phases[Math.min(4, Math.floor(t / 16))];
    if (run.dead) finishRun(false);
    else if (t >= DURATION) finishRun(true);
  } else if (mode === "countdown") {
    const n = Math.ceil((countdownEnd - performance.now()) / 1000);
    if (n <= 0) countAction();
    else if (n !== lastCount) {
      lastCount = n;
      $("#countdown strong").textContent = String(n);
      audio.tick("count");
    }
  } else if (mode === "tutorial") {
    tutorialTime = performance.now() / 1000 - tutorialStarted;
    if (tutorialTime > tutorialNote.time + 0.24)
      makeTutorialNote(tutorialTime + 1.5);
  }
  if (performance.now() > feedbackUntil) feedback.classList.remove("show");
}
scene.onFrame = frame;
scene.getView = () => ({
  mode,
  time:
    mode === "tutorial" || (mode === "paused" && pauseMode === "tutorial")
      ? tutorialTime
      : Math.max(0, audio.time - settings.offset / 1000),
  notes:
    mode === "tutorial" || (mode === "paused" && pauseMode === "tutorial")
      ? [tutorialNote]
      : chart,
  judged: mode === "tutorial" ? undefined : run.judged,
  reduced: settings.reduced,
  combo: run.combo,
  active: mode === "playing",
});
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
const observer = new ResizeObserver(() =>
  game.scale.resize($(".cabinet").clientWidth, $(".cabinet").clientHeight),
);
observer.observe($(".cabinet"));

function showDialog(title: string, body: string) {
  dialog.innerHTML = `<div class="dialog-head"><h2>${title}</h2><button class="icon-button" id="close-dialog" aria-label="Cerrar">${icon("close")}</button></div>${body}`;
  $("#close-dialog").onclick = () => dialog.close();
  dialog.showModal();
}
function applyTheme() {
  const theme = getTheme(settings.theme);
  document.documentElement.dataset.theme = theme.id;
  for (const [key, value] of Object.entries(themeVariables(theme.id)))
    document.documentElement.style.setProperty(key, value);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.background);
  scene.setTheme(theme.id);
}
function themePicker() {
  return `<fieldset class="theme-picker"><legend>Color del juego</legend><div class="theme-options">${themes.map((theme) => `<label class="theme-option"><input type="radio" name="theme" value="${theme.id}" aria-label="${theme.name}" ${settings.theme === theme.id ? "checked" : ""}/><span class="theme-choice"><span class="theme-swatch" style="--swatch:${theme.accent}">${icon("check")}</span><span>${theme.name}</span></span></label>`).join("")}</div></fieldset>`;
}
function openSettings() {
  if (["playing", "tutorial", "countdown"].includes(mode)) pause();
  showDialog(
    "A tu ritmo",
    `<p class="dialog-intro">Los ajustes se guardan en este dispositivo.</p>${themePicker()}<label class="setting-row"><span><strong>Sonido</strong><small>Música y efectos de la partida</small></span><input type="checkbox" id="sound-setting" ${settings.sound ? "checked" : ""}/></label><label class="setting-row"><span><strong>Vibración</strong><small>${typeof navigator.vibrate === "function" ? "Un pequeño pulso al tocar" : "No disponible en este navegador"}</small></span><input type="checkbox" id="vibration-setting" ${settings.vibration ? "checked" : ""} ${typeof navigator.vibrate !== "function" ? "disabled" : ""}/></label><label class="setting-row"><span><strong>Efectos reducidos</strong><small>Menos partículas y movimiento</small></span><input type="checkbox" id="reduced-setting" ${settings.reduced ? "checked" : ""}/></label><div class="sync-setting"><label for="offset-setting">Sincronización <output id="offset-value">${settings.offset} ms</output></label><p>Si el sonido llega tarde, mueve el ajuste a la derecha. La pista visual se retrasará junto con los toques.</p><input type="range" min="-200" max="200" step="10" value="${settings.offset}" id="offset-setting"/><div class="range-labels"><span>−200 ms</span><button class="text-button" id="reset-offset">Restablecer</button><span>+200 ms</span></div></div><button class="secondary full" id="practice-button">Repetir tutorial</button>`,
  );
  dialog
    .querySelectorAll<HTMLInputElement>('input[name="theme"]')
    .forEach((input) => {
      input.onchange = () => {
        settings.theme = getTheme(input.value).id;
        saveSettings();
        applyTheme();
      };
    });
  for (const [id, key] of [
    ["sound-setting", "sound"],
    ["vibration-setting", "vibration"],
    ["reduced-setting", "reduced"],
  ] as const) {
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
    void prepare(true);
  };
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
  const isIOS =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
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
    `<p><strong>Pulse Road</strong><br/>Un juego original para este proyecto.</p><p><strong>First Light</strong><br/>Composición electrónica original de 80 segundos, sintetizada para el juego sin muestras de terceros.</p><p><strong>Diseño y desarrollo</strong><br/>Proyecto creado con asistencia de Codex. Motor Phaser, tipografía Outfit y recursos gráficos originales.</p><p class="dialog-note">Inspirado en los juegos de ritmo. Sin recursos de Tiles Hop, Magic Tiles o Dancing Road. Licencias completas incluidas en el proyecto.</p>`,
  );
}
$("#settings-button").onclick = openSettings;
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
    tap(Number(button.dataset.lane) as Lane);
  });
  button.addEventListener("click", (e) => {
    if (e.detail === 0) tap(Number(button.dataset.lane) as Lane);
  });
});
document.addEventListener("keydown", (e) => {
  if (dialog.open || e.repeat || e.target instanceof HTMLInputElement) return;
  const keys: Record<string, Lane> = {
    ArrowLeft: 0,
    ArrowDown: 1,
    ArrowRight: 2,
    a: 0,
    s: 1,
    d: 2,
  };
  if (e.key in keys && ["playing", "tutorial"].includes(mode)) {
    e.preventDefault();
    tap(keys[e.key]);
  }
  if (e.key === "Escape" && ["playing", "tutorial", "countdown"].includes(mode))
    pause();
});
function isLandscape() {
  return matchMedia(
    "(orientation: landscape) and (max-height: 560px) and (pointer: coarse)",
  ).matches;
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
audio.onInterruption = () =>
  pause("El audio se interrumpió. Toca Continuar para retomarlo.");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e as typeof installEvent;
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  toast("Pulse Road ya está en tu pantalla de inicio.");
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
applyTheme();
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
      const [shell, song] = await Promise.all([
        caches.match(new URL(assetUrl("index.html"), location.origin).href, {
          ignoreSearch: true,
        }),
        caches.match(
          new URL(assetUrl("audio/first-light.mp3"), location.origin).href,
          {
            ignoreSearch: true,
          },
        ),
      ]);
      if (shell && song) {
        offlineReady = true;
        if (mode === "home") $("#offline-label").innerHTML = cacheLabel();
      }
    })
    .catch(() => {});
}
