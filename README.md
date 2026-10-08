# Neo Rush

[Jugar ahora](https://mauriciostanley.github.io/pulse-road/) · [Modo ultraligero](https://mauriciostanley.github.io/pulse-road/lite.html) · [QR para compartir](qr/pulse-road.png)

Antes se llamaba Pulse Road. La dirección sigue siendo `/pulse-road/` para que el QR impreso siga funcionando y cada jugador conserve sus récords.

Juego de ritmo móvil: cuatro canciones de 80 segundos, un modo Infinito que acelera sin final y un reto diario igual para todos. Escanea una URL publicada, elige uno de tres carriles y supera tu récord. No utiliza cuentas, anuncios ni servicios de pago durante la partida.

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

## Modos

- **Canciones.** Las cuatro dificultades de 80 segundos, con estrellas, mejor marca y récord por nivel.
- **Infinito.** First Light en bucle, con etapas de 16 segundos. Cada etapa la canción acelera un 5 % (hasta ×1,6), las plataformas llegan antes, el daño sube y la recuperación baja. El recorrido se genera al azar con una semilla, siempre alineado con el pulso, sin plataformas simultáneas y sin saltos de un extremo al otro en corcheas antes de la etapa 5. En Infinito la Fiebre multiplica los puntos ×1,5.
- **Reto diario.** Un Infinito cuyo recorrido depende de la fecha: todos los que juegan el mismo día reciben la misma pista. Guarda el mejor resultado del día.

### Potenciadores (Infinito y reto diario)

Flotan sobre algunas plataformas; se recogen al aterrizar (Perfecto o Bien).

- **Escudo:** absorbe un fallo sin daño y sin romper el combo. La esfera muestra un anillo por carga.
- **Corazón:** +35 de energía.
- **Puntos dobles:** ×2 durante 8 segundos de canción.
- **Cámara lenta:** la canción baja al 80 % de velocidad durante 8 segundos.

## Controles y reglas

- Toca izquierda, centro o derecha **antes** de que llegue la plataforma. El movimiento es inmediato y la puntuación llega al aterrizar.
- Puedes permanecer en un carril para varias plataformas seguidas. Salirte antes de aterrizar no cuenta como acierto.
- Perfecto: ya estabas en el carril al aterrizar. Bien: llegaste dentro del pequeño margen tardío. La transición visual tiene 45 ms de asentamiento.
- Margen tardío por nivel: Fácil 200 ms; Medio 140 ms; Difícil 100 ms; Pesadilla 65 ms. No hay penalización por seleccionar anticipadamente el siguiente carril después del aterrizaje anterior.
- En **Ajustes → Controles** eliges cómo mover la esfera:
  - **Botones:** tres botones abajo (predeterminado).
  - **Arrastrar:** la pantalla se divide en tres columnas invisibles; tocar o arrastrar el dedo lleva la esfera a esa columna.
  - **Deslizar:** cada 24 px de deslizamiento horizontal cambia un carril; un deslizamiento largo cruza dos. Tocar sin deslizar no mueve la esfera.
- En computadora: flechas izquierda, abajo y derecha; A, S y D. Escape pausa. En resultados, R vuelve a jugar.
- Empiezas con 100 de energía. Daño y recuperación dependen del nivel.
- Multiplicador ×2 con 10 aciertos, ×3 con 20 y ×4 con 30. Perfecto: 100 puntos × multiplicador; Bien: 60 × multiplicador.
- Los cristales requieren un Perfecto y añaden 25 puntos. También se suman a tu colección (ver abajo).
- Completar da una estrella; 75 % de precisión da dos y 90 % da tres. La precisión se mide sobre las plataformas alcanzadas: al completar la canción equivale a todas.
- El tutorial enseña el aterrizaje sin daño y adapta sus textos al control elegido; se repite desde la portada o Ajustes.

Cada Perfecto emite brillo y partículas; con efectos reducidos queda un anillo sencillo. Cada fallo emite un breve sonido de daño original, salvo al silenciar. Aparecen mensajes de ánimo al alcanzar hitos de puntuación y frases aleatorias al perder, sin repetir consecutivamente.

## Sensación de juego

- **El mundo late con la canción.** Bordes de la pista, cuadrícula, anillos del horizonte, estrellas y torres ecualizadoras a los lados reaccionan a cada golpe de bombo, con la intensidad de cada sección. Al empezar una sección nueva, una onda recorre la pista.
- **Aterrizajes con peso.** La esfera se aplasta al caer, la plataforma se ilumina y se hunde, y un anillo se expande. Los saltos son más altos cuanto más separadas están las plataformas. La plataforma fallada se agrieta y cae.
- **Aciertos musicales.** Cada aterrizaje toca una nota de la escala pentatónica de la canción; el combo sube dos octavas y vuelve a empezar. Todo el sonido sigue siendo sintetizado.
- **Fiebre.** Con 30 de combo (el multiplicador ×4) la pista se tiñe, aparecen líneas de velocidad y la estela se alarga. Los saltos a ×2 y ×3 también se anuncian. No cambia la puntuación: es la recompensa visible del ×4.
- **Tensión.** Con 40 de energía o menos, los bordes de la pantalla laten en rojo al ritmo.
- **Caída.** Al perder, la música frena como un disco, el mundo sigue a cámara lenta y la esfera se rompe en pedazos antes de mostrar los resultados.
- **Récord en vivo.** Durante la partida se anuncia el momento en que superas tu récord de puntos o tu mejor marca de recorrido. La barra superior muestra tu mejor marca.
- **Lectura.** La siguiente plataforma en la que aterrizarás lleva un contorno que late con el ritmo.
- **Cámara y esfera.** La cámara se inclina al cambiar de carril y respira con el bombo; la esfera se estira en los cambios rápidos y deja una estela. Cada esfera suelta sus propias partículas (brasas, nieve, estrellas, burbujas o chispas).
- **Infinito.** Cada etapa nueva cambia el color del escenario, con un destello y la etapa anunciada en grande.

Con efectos reducidos no hay pulso, torres animadas, sacudidas, inclinación de cámara, aplastamiento, partículas, fragmentos, destellos ni animaciones de resultados.

## Progreso y colección

- **Mejor marca.** Al perder ves qué porcentaje de la canción recorriste y tu mejor marca anterior. Solo una canción completa cuenta como 100 %.
- **Tarjetas de dificultad.** La portada muestra las estrellas y la mejor marca de cada nivel.
- **Esferas (14).** Los cristales se acumulan para siempre y nunca se gastan: al alcanzar la cifra, la esfera es tuya. Por cristales: Brasa (8), Neón (15), Escarcha (25), Oro (50), Océano (70), Galaxia (90), Lava (120), Eclipse (150) y Prisma (240). Cromo llega en el nivel 10; Pesadilla al completar Pesadilla; Infinito al llegar a la etapa 10; Leyenda al encontrar todas las reliquias. Pulso sigue el color del juego. Una partida perfecta de Fácil da 10 cristales.
- **Habilidades.** Cada esfera tiene una habilidad que solo actúa en Infinito y en el reto diario; en las canciones todas puntúan igual, así los récords son comparables:

  | Esfera | Habilidad |
  | --- | --- |
  | Pulso | Ninguna |
  | Brasa | La Fiebre llega con 20 de combo |
  | Neón | +50 % de recuperación de energía |
  | Escarcha | Empieza con un escudo |
  | Oro | Cristales ×2 |
  | Océano | La velocidad sube más despacio (+3,5 % por etapa) |
  | Galaxia | Potenciadores +50 % de duración |
  | Lava | −25 % de daño |
  | Eclipse | Sobrevive una vez a la caída, con 25 de energía |
  | Prisma | El doble de potenciadores |
  | Cromo | Los cristales también cuentan con un Bien |
  | Pesadilla | Puntos ×1,25 y daño +25 % |
  | Infinito | Empieza con puntos dobles |
  | Leyenda | Un escudo nuevo en cada etapa |

- **Reliquias del ritmo (10).** Objetos musicales originales —metrónomo, casete, diapasón, vinilo, audífonos, piano de juguete, corchea dorada, altavoz, batuta y corazón de cuarzo— escondidos en plataformas fijas: dos en cada canción y dos en Infinito (etapas 5 y 9). Brillan en dorado, con una columna de luz; se guardan con un Perfecto y dan 10 cristales. El botón **Reliquias** muestra las encontradas, su historia y pistas de las que faltan. No cambian la puntuación.
- **Nivel y misiones.** Cada partida da experiencia, incluso al perder; subir de nivel da cristales. Siempre hay tres misiones activas (por ejemplo, «Llega a la etapa 6 en Infinito» o «Completa Medio»); al cumplir una se cobran sus cristales y llega la siguiente. Se ven en el botón **Misiones** o tocando el nivel de la barra superior.
- **Fantasma.** Al batir el récord de una canción se guarda esa partida. En la siguiente, una esfera translúcida repite tus movimientos y junto a los puntos ves si vas por delante o por detrás del récord. Se desactiva en Ajustes.
- **Compartir.** Los resultados ofrecen compartir la puntuación, la etapa o el reto del día con el menú del teléfono o, si no existe, copiarla con el enlace del juego.

La mejor marca, las estrellas, los cristales, el perfil (nivel, misiones, reliquias, hazañas y mejores de Infinito) y los fantasmas se guardan en claves propias del navegador; los récords e intentos existentes no cambian. El modo ultraligero también suma cristales, mejor marca y estrellas, pero no incluye Infinito, reto diario, reliquias ni fantasma.

Los antiguos guiños decorativos de la pista se retiraron: las reliquias los sustituyen con objetos propios del juego que además sirven para algo.

## Repositorio público y publicación

Código: https://github.com/MauricioStanley/pulse-road

El juego está publicado en https://mauriciostanley.github.io/pulse-road/. El despliegue se configura en GitHub Pages mediante `.github/workflows/deploy.yml`. Las actualizaciones de `main` ejecutan las pruebas, compilan y publican solo si todo termina correctamente, salvo commits documentales marcados para omitir CI. Comprueba que la ejecución de GitHub Actions haya finalizado antes de compartir una nueva versión del juego.

GitHub Pages publica bajo `/pulse-road/`. El workflow define `BASE_PATH=/pulse-road/` y el código adapta los recursos, el manifiesto y el service worker a esa ruta. En desarrollo local el prefijo sigue siendo `/`.

`NeoRush-publicar.zip`, junto a la carpeta del proyecto, contiene la compilación local para alojamientos en la raíz de un dominio. Para GitHub Pages usa el workflow, no ese ZIP.

Para generar el QR cuando la página pública responda correctamente:

```sh
npm run qr -- https://mauriciostanley.github.io/pulse-road/
```

Genera `qr/pulse-road.png` y `qr/pulse-road.svg`. Conserva la misma URL en futuras versiones para no tener que reimprimirlo.

Referencias oficiales: [Vite en GitHub Pages](https://vite.dev/guide/static-deploy#github-pages) y [publicación con GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Instalar y jugar sin conexión

La primera visita requiere internet. Espera a ver **Disponible sin conexión** antes de desconectarte. Se guardan la interfaz, tipografía, motor, iconos y las cuatro canciones completas; Infinito y el reto diario usan First Light, que ya está incluida. La caché inicial ocupa aproximadamente 5,7 MiB (unos 6 MB); después no se necesita conexión durante las partidas.

En Android, el botón de instalación abre el aviso cuando el navegador lo permite. En iPhone muestra los pasos de Safari: Compartir → Añadir a pantalla de inicio. La disponibilidad de instalación, vibración y bloqueo de orientación depende del navegador.

La aplicación pausa al perder visibilidad, cuando se interrumpe el audio y al girar un teléfono con puntero táctil a horizontal. Continuar requiere un toque y una cuenta atrás.

Un navegador puede eliminar su caché por limpieza o falta de espacio. Los récords pertenecen a ese navegador o instalación; no se sincronizan entre dispositivos. Borrar los datos del sitio borra también el récord.

## Ajustes

En **Ajustes → Color del juego** elige Menta, Morado, Rosa, Rojo o Verde. Morado y Rosa son paletas separadas, sin mezclarse. Cambian la esfera, las plataformas, la pista y los controles; la elección se guarda en ese navegador. En Rosa y Rojo, los peligros usan ámbar para distinguirlos del jugador; también conservan sus pinchos y marcas.

Controles (botones, arrastrar o deslizar), fantasma del récord, sonido, vibración compatible, efectos reducidos y desfase de −200 a +200 ms. Un desfase positivo retrasa la pista y la evaluación del toque para compensar una salida de audio tardía. Los auriculares Bluetooth pueden necesitar ajuste.

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

- `src/core/`: recorrido, puntuación y reglas independientes de gráficos: canciones (`chart.ts`, `rules.ts`), Infinito y reto diario (`endless.ts`), reliquias (`relics.ts`), misiones y nivel (`missions.ts`) y fantasma (`ghost.ts`).
- `src/entry.ts`: arranque ligero que recuerda el modo, sin cargar Phaser cuando no hace falta.
- `src/lite/`: reproductor de bajo consumo y renderizador Canvas 2D, con las reglas compartidas.
- `public/lite.html` y `public/lite.css`: interfaz clásica para dispositivos antiguos.
- `scripts/build-lite.mjs`: genera `public/lite.js`, verifica ES5, ausencia de dependencias de ejecución y presupuesto de 50 KB. Se ejecuta al probar, compilar o iniciar desarrollo.
- `src/audio/conductor.ts`: carga, reproducción, reloj, pausa y efectos.
- `src/game/RoadScene.ts`: pista 2D con perspectiva y esfera.
- `src/main.ts`: pantallas, modos, controles y ciclo de vida.
- `src/input/touch.ts`: controles táctiles de arrastre y deslizamiento.
- `src/ui/icons.ts`: iconos SVG, incluidos potenciadores y reliquias.
- `src/skins.ts`: las 14 esferas, cómo se desbloquean y sus habilidades.
- `src/storage.ts`: ajustes, récords, cristales y mejores marcas con recuperación ante errores de almacenamiento.
- `src/profile.ts`: nivel, misiones, reliquias, hazañas, mejores de Infinito y fantasmas.
- `src/style.css`: diseño adaptable y accesibilidad de la interfaz.
- `scripts/generate-assets.mjs`: First Light; llama a `scripts/generate-icons.mjs`.
- `scripts/generate-icons.mjs`: ícono con el nombre Neo Rush en Outfit, convertido a trazos.
- `scripts/generate-tracks.mjs`: tres composiciones adicionales originales.
- `tests/`: comprobaciones automáticas de reglas y transporte musical.
- `qa/`: capturas y reporte de verificación.

## Pruebas y regeneración

```sh
npm test
npm run build
npm audit
```

La música y los iconos ya están incluidos. Para regenerarlos, instala FFmpeg y ejecuta `npm run assets` y `npm run tracks`. Solo los iconos: `npm run icons`, sin FFmpeg. El audio intermedio se escribe en la carpeta de trabajo, no se distribuye con el sitio.

Para volver a preparar los dos ZIP de entrega en Windows, ejecuta `npm run build` y después `npm run package`. Los ZIP se escriben junto a la carpeta del proyecto; el paquete de publicación incluye los archivos de `dist` en su raíz, y el de proyecto incluye código, pruebas, documentación y licencias, sin `node_modules`.

## Alcance pendiente de validación externa

Revisar `qa/VERIFICACION.md`. La emulación de tamaños de pantalla no sustituye probar Safari en un iPhone físico, el diálogo real de instalación, la vibración en Android ni el rendimiento en un teléfono de gama baja. Antes del evento, conviene probar la URL definitiva y el QR impreso en la red del lugar.

## Recursos

Las cuatro canciones, los efectos de sonido, las reliquias, las esferas y la geometría del juego se crearon para este proyecto. Las dependencias conservan sus licencias originales. Consulta `docs/asset-licenses.md` y `licenses/`.
