// Do not fetch the heavy renderer when this device chose the ultralight player.
let lite = false;
try { lite = localStorage.getItem("pulse-render-mode") === "lite"; } catch {}
if (lite) location.replace(new URL("lite.html", location.href).href);
else void import("./main").catch(() => {
  const message = document.querySelector("#boot-copy");
  if (message) message.textContent = "No se pudo abrir la versión completa. Prueba el modo ultraligero.";
});
