# Pulse Road

[Jugar ahora](https://mauriciostanley.github.io/pulse-road/) · [Modo ultraligero](https://mauriciostanley.github.io/pulse-road/lite.html) · [QR para compartir](qr/pulse-road.png)

Juego de ritmo móvil de 80 segundos. Escanea una URL publicada, toca uno de tres carriles y supera tu récord. No utiliza cuentas, anuncios ni servicios de pago durante la partida.

## Iniciar en la computadora

Requiere Node.js 22.12 o posterior. En esta carpeta:

```sh
npm ci
npm run dev
```

Abre la dirección que muestra la terminal. Para comprobar la versión instalable y sin conexión:

```sh
npm run build
npm run preview
```

Abre http://localhost:4173. No abras `index.html` con doble clic: los módulos y la PWA requieren un servidor.

## Dificultades y música

Elige la dificultad en la portada. Todas duran 80 segundos y tienen música original.

| Nivel | Canción | Tempo | Daño / recuperación |
| --- | --- | --- | --- |
| Fácil | Pequeña Órbita | 96 BPM | −14 / +3 |
| Medio | First Light | 120 BPM | −20 / +2 |
| Difícil | Neon Sprint | 150 BPM | −28 / +1 |
| Pesadilla | Umbral Cero | 180 BPM | −40 / +0,5 |

Pesadilla tiene 401 plataformas, ráfagas de hasta 6 por segundo y patrones fijos con pequeños descansos. Está pensado para aprender mediante muchos intentos; no existe una cantidad garantizada de intentos para dominarlo. Los récords e intentos se guardan por dificultad. Los récords de la versión anterior se conservan en su antigua clave, pero no se mezclan con estas reglas nuevas.

## Controles y reglas

- Toca izquierda, centro o derecha **antes** de que llegue la plataforma. El movimiento es inmediato y la puntuación llega al aterrizar.
- Puedes permanecer en un carril para varias plataformas seguidas. Salirte antes de aterrizar no cuenta como acierto.
- Perfecto: ya estabas en el carril al aterrizar. Bien: llegaste dentro del pequeño margen tardío. La transición visual tiene 45 ms de asentamiento.
- Margen tardío por nivel: Fácil 200 ms; Medio 140 ms; Difícil 100 ms; Pesadilla 65 ms. No hay penalización por seleccionar anticipadamente el siguiente carril después del aterrizaje anterior.
- En computadora: flechas izquierda, abajo y derecha; A, S y D. Escape pausa.
- Empiezas con 100 de energía. Daño y recuperación dependen del nivel.
- Multiplicador ×2 con 10 aciertos, ×3 con 20 y ×4 con 30. Perfecto: 100 puntos × multiplicador; Bien: 60 × multiplicador.
- Los cristales requieren un Perfecto y añaden 25 puntos.
- Completar da una estrella; 75 % de precisión da dos y 90 % da tres.
- El tutorial enseña el nuevo aterrizaje sin daño; se repite desde Ajustes.

Cada Perfecto emite brillo y partículas; con efectos reducidos queda un anillo sencillo. Cada fallo emite un breve sonido de daño original, salvo al silenciar. Aparecen mensajes de ánimo al alcanzar hitos de puntuación y frases aleatorias al perder, sin repetir consecutivamente.

Todos los recorridos contienen guiños decorativos originales: anillos dorados, cajas de bonus, bloques de césped y portales. Están fuera de los carriles, no son obstáculos ni coleccionables. No utilizan personajes, logotipos ni audio de otros videojuegos.

## Repositorio público y publicación

Código: https://github.com/MauricioStanley/pulse-road

El juego está publicado en https://mauriciostanley.github.io/pulse-road/. El despliegue se configura en GitHub Pages mediante `.github/workflows/deploy.yml`. Las actualizaciones de `main` ejecutan las pruebas, compilan y publican solo si todo termina correctamente, salvo commits documentales marcados para omitir CI. Comprueba que la ejecución de GitHub Actions haya finalizado antes de compartir una nueva versión del juego.

GitHub Pages publica bajo `/pulse-road/`. El workflow define `BASE_PATH=/pulse-road/` y el código adapta los recursos, el manifiesto y el service worker a esa ruta. En desarrollo local el prefijo sigue siendo `/`.

`PulseRoad-publicar.zip`, junto a la carpeta del proyecto, contiene la compilación local para alojamientos en la raíz de un dominio. Para GitHub Pages usa el workflow, no ese ZIP.

Para generar el QR cuando la página pública responda correctamente:

```sh
npm run qr -- https://mauriciostanley.github.io/pulse-road/
```

Genera `qr/pulse-road.png` y `qr/pulse-road.svg`. Conserva la misma URL en futuras versiones para no tener que reimprimirlo.

Referencias oficiales: [Vite en GitHub Pages](https://vite.dev/guide/static-deploy#github-pages) y [publicación con GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Instalar y jugar sin conexión

La primera visita requiere internet. Espera a ver **Disponible sin conexión** antes de desconectarte. Se guardan la interfaz, tipografía, motor, iconos y las cuatro canciones completas. La caché inicial ocupa aproximadamente 5,7 MiB (unos 6 MB); después no se necesita conexión durante las partidas.

En Android, el botón de instalación abre el aviso cuando el navegador lo permite. En iPhone muestra los pasos de Safari: Compartir → Añadir a pantalla de inicio. La disponibilidad de instalación, vibración y bloqueo de orientación depende del navegador.

La aplicación pausa al perder visibilidad, cuando se interrumpe el audio y al girar un teléfono con puntero táctil a horizontal. Continuar requiere un toque y una cuenta atrás.

Un navegador puede eliminar su caché por limpieza o falta de espacio. Los récords pertenecen a ese navegador o instalación; no se sincronizan entre dispositivos. Borrar los datos del sitio borra también el récord.

## Ajustes

En **Ajustes → Color del juego** elige Menta, Morado, Rojo o Verde. Cambian la esfera, pista y controles; la elección se guarda en ese navegador. En rojo, los peligros usan ámbar para distinguirlos del jugador; también conservan sus pinchos y marcas.

Sonido, vibración compatible, efectos reducidos y desfase de −200 a +200 ms. Un desfase positivo retrasa la pista y la evaluación del toque para compensar una salida de audio tardía. Los auriculares Bluetooth pueden necesitar ajuste.

## Celulares lentos: modo ultraligero

Abre **Ultraligero** en la portada o **Ajustes → Activar modo ultraligero**. También puedes compartir directamente https://mauriciostanley.github.io/pulse-road/lite.html. No hace falta cargar el juego completo primero. El navegador recuerda el modo elegido; «Volver al modo completo» restaura el original. Cambiar de modo abandona la partida actual, no el récord.

- Canvas 2D nativo, sin Phaser, WebGL ni tipografías descargadas. JavaScript de unos **20 KB sin comprimir / 8 KB gzip**, frente al motor normal de 1,2 MB sin comprimir (cifra del motor, no de toda la página).
- Dibujo con objetivo **30 FPS**, resolución interna máxima de 240 px de ancho y respuesta de carril dibujada directamente al tocar. El contador inferior mide los fotogramas programados, no incluye los redibujados adicionales de entrada.
- Sin partículas, perspectiva, saltos, estela, decoraciones ni vibración. Conserva un anillo para Perfectos, señales de fallo, plataformas, obstáculos marcados con X y cristales.
- Las mismas cuatro pistas, reglas, colores, intentos y récords. Música mediante el reproductor de audio del navegador; solo se solicita la canción elegida, aproximadamente 1,1–1,3 MB. El sonido de daño es opcional si el navegador dispone de Web Audio.
- Tres pasos de práctica sin daño, controles izquierda/centro/derecha y pausa. Se puede continuar sin música ante problemas de audio; no se exige una cuenta atrás al reanudar en este modo.
- Compilado como script clásico con sintaxis ES5, comprobado automáticamente. La portada normal ofrece un enlace HTML al ligero incluso si ese navegador no ejecuta módulos modernos.

**Conexión:** entrar directamente al ligero no instala el service worker del juego completo ni descarga sus cuatro canciones. Para esta ruta directa cuenta con conexión: la caché HTTP del navegador no garantiza jugar sin internet. Si ya guardaste la PWA completa y viste «Disponible sin conexión», su caché incluye también el modo ligero y las cuatro canciones. En ese caso se comprueban actualizaciones de la instalación existente y se ofrecen en el inicio, sin recargar una partida. En navegadores sin service workers, no hay modo offline garantizado ni instalación PWA.

No se garantiza rendimiento ni compatibilidad en el Samsung S3 Mini físico: un navegador/Android antiguo puede limitar HTTPS, Canvas o audio. No ignores advertencias de seguridad del navegador. Si no abre o sigue lento, informa del navegador, versión de Android y FPS observados. La emulación de pantalla y las pruebas ES5 no sustituyen ese dispositivo.

## Estructura

- `src/core/`: recorrido, puntuación y reglas independientes de gráficos.
- `src/entry.ts`: arranque ligero que recuerda el modo, sin cargar Phaser cuando no hace falta.
- `src/lite/`: reproductor de bajo consumo y renderizador Canvas 2D, con las reglas compartidas.
- `public/lite.html` y `public/lite.css`: interfaz clásica para dispositivos antiguos.
- `scripts/build-lite.mjs`: genera `public/lite.js`, verifica ES5, ausencia de dependencias de ejecución y presupuesto de 50 KB. Se ejecuta al probar, compilar o iniciar desarrollo.
- `src/audio/conductor.ts`: carga, reproducción, reloj, pausa y efectos.
- `src/game/RoadScene.ts`: pista 2D con perspectiva y esfera.
- `src/main.ts`: pantallas, controles y ciclo de vida.
- `src/storage.ts`: ajustes y récord local con recuperación ante errores de almacenamiento.
- `src/style.css`: diseño adaptable y accesibilidad de la interfaz.
- `scripts/generate-assets.mjs`: First Light e iconos originales.
- `scripts/generate-tracks.mjs`: tres composiciones adicionales originales.
- `tests/`: comprobaciones automáticas de reglas y transporte musical.
- `qa/`: capturas y reporte de verificación.

## Pruebas y regeneración

```sh
npm test
npm run build
npm audit
```

La música y los iconos ya están incluidos. Para regenerarlos, instala FFmpeg y ejecuta `npm run assets` y `npm run tracks`. El audio intermedio se escribe en la carpeta de trabajo, no se distribuye con el sitio.

Para volver a preparar los dos ZIP de entrega en Windows, ejecuta `npm run build` y después `npm run package`. Los ZIP se escriben junto a la carpeta del proyecto; el paquete de publicación incluye los archivos de `dist` en su raíz, y el de proyecto incluye código, pruebas, documentación y licencias, sin `node_modules`.

## Alcance pendiente de validación externa

Revisar `qa/VERIFICACION.md`. La emulación de tamaños de pantalla no sustituye probar Safari en un iPhone físico, el diálogo real de instalación, la vibración en Android ni el rendimiento en un teléfono de gama baja. Antes del evento, conviene probar la URL definitiva y el QR impreso en la red del lugar.

## Recursos

Las cuatro canciones, el sonido de daño, los guiños decorativos y la geometría del juego se crearon para este proyecto. Las dependencias conservan sus licencias originales. Consulta `docs/asset-licenses.md` y `licenses/`.
