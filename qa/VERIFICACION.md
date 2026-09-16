# Verificación de Pulse Road

Fecha: 16 de septiembre de 2026. Pruebas de navegador realizadas en el navegador integrado de Codex, con resoluciones CSS de 390×844, 320×568 y 1280×900. Esas resoluciones no implican pruebas en equipos físicos.

## Actualización vigente: cuatro dificultades y aterrizajes

Esta sección sustituye las reglas y cifras de las versiones históricas que siguen debajo.

- **52/52 pruebas automáticas aprobadas**: selección anticipada, salir del carril antes de aterrizar, corrección de entrada, permanencia entre notas, asentamiento visual, margen tardío, muerte, puntos, cristales y combos. Reproducción determinista perfecta de las cuatro pistas a 30/60/120 FPS, densidad creciente, separación mínima de 1/6 s, objetivos únicos y ningún obstáculo en el carril válido. También se comprueban el límite de partículas y la supresión de partículas con efectos reducidos.
- Audio: cambio secuencial de pistas sin reutilizar buffers incorrectos, cancelaciones rápidas A → B → A, reintento, reloj/pausa, diez reinicios con fuentes desconectadas, un sonido original por fallo, limpieza y silencio. Persistencia de récords, intentos y dificultad, y funcionamiento cuando localStorage está bloqueado.
- Las cuatro pistas MP3 duran **80,000 s**, verificado con ffprobe. First Light: 1.281.132 bytes; pistas adicionales: aproximadamente 1.121.000 bytes cada una.
- Navegador: tutorial completo de seis pasos usando entradas anticipadas. Titi completo: **85 Perfectos, 0 fallos, combo 85, 10 cristales, 28.550 puntos, tres estrellas**, con pausas y reanudaciones.
- Servellon completo en navegador con entradas de teclado controladas: **396 Perfectos, 5 Buenos, 0 fallos, combo 401, 49 cristales, 155.125 puntos, tres estrellas**, con pausas. Esto prueba viabilidad técnica, no facilidad humana ni una curva garantizada de 50 intentos.
- Se observaron mensajes de ánimo, destello alrededor de la esfera, decoración fuera de los carriles y dos frases distintas en derrotas consecutivas. No se encontraron errores de consola durante las partidas completas.
- Se inspeccionaron portada y controles a 390×844, 320×568 y 1280×900. Selector accesible también cuando su etiqueta visual se oculta; sin scroll horizontal en 320px. Resultados de derrota con título largo siguen dentro de la pantalla pequeña.
- **Offline verificado de nuevo**: se apagó el proceso del servidor local; una solicitud HTTP confirmó que no respondía. Se recargó desde el service worker y se iniciaron las cuatro dificultades con sus respectivas canciones desde caché. Se verificó pausa y derrota con el servidor todavía apagado. No se afirma una segunda partida completa offline por cada canción.
- Capturas: `titi-results.png`, `servellon-results.png`, `levels-gameplay.png`, `levels-small.png`. La captura de portada grande inicial `levels-home.png` precede al pequeño ajuste de posición de la esfera.
- Precaché: aproximadamente **5,9 MiB** para juego y cuatro canciones. La primera visita requiere internet. Sin muestras de otros juegos ni nuevos servicios externos.

Continúan pendientes las pruebas en Android/iPhone físicos, instalación real, vibración y rendimiento de teléfonos de gama baja. Las resoluciones emuladas y los relojes controlados no reemplazan esas pruebas.

## Historial: colores y publicación

Hay cuatro paletas seleccionables: Menta, Morado, Rojo y Verde. Once pruebas nuevas cubren contraste de textos/controles/peligros, persistencia de cada preferencia, datos antiguos y rutas raíz/subdirectorio. Total: **35/35 pruebas aprobadas**. Compilaciones de producción correctas tanto en `/` como en `/pulse-road/`.

En navegador se seleccionaron Morado, Rojo y Verde; se verificó la esfera y el circuito y se confirmó que Verde seguía seleccionado al recargar. Los tamaños móviles son emulados. El repositorio público se configura con un workflow que prueba, compila y despliega en GitHub Pages. Las fases siguientes son el historial de verificación previo a esta actualización; los pendientes de Cloudflare corresponden a aquella primera entrega, ahora sustituida por GitHub Pages.

Publicación confirmada: https://mauriciostanley.github.io/pulse-road/ y repositorio público https://github.com/MauricioStanley/pulse-road. GitHub Actions completó instalación limpia, 35 pruebas, compilación y despliegue. La página y el MP3 responden HTTP 200 y HTTPS está activado.

Prueba real en esa URL: se cargó el tutorial, se omitió para probar la canción completa y se completaron los 80 segundos con pausas/reanudaciones, 110 Perfectos, cero fallos, 14 cristales, tres estrellas y 38.650 puntos. No hubo errores en la consola. Al recargar se conservaron el tema Morado, el récord y la indicación «Disponible sin conexión». Captura: `public-results.png`. El QR se generó para esa URL; todavía no se ha ensayado impreso con teléfonos físicos.

## Fase 1 — Controles y ritmo

APROBADA en el entorno disponible. Tutorial completado mediante los seis pasos y botones reales. Teclado izquierda/abajo/derecha comprobado durante una partida de 80 segundos. Ventanas ±80/±160 ms y sus bordes comprobados automáticamente.

## Fase 2 — Reglas de partida

APROBADA. Once casos automáticos verificaron límite temporal, daño único por plataforma, combos, multiplicadores, recuperación, cristales, derrota y determinismo a 30/60/120 FPS. Se observó la pantalla de derrota tras cinco fallos. La puntuación máxima del recorrido actual es 38.650.

## Fase 3 — Música y recorrido

APROBADA. First Light dura 80 segundos a 120 BPM y contiene 110 plataformas y 14 cristales. Partida completa en navegador: 110 Perfectos, cero Buenos, cero Fallos, 14 cristales, combo máximo 110, 100 % de precisión, tres estrellas, 38.650 puntos. La prueba incluyó pausas y reanudaciones.

Cuatro pruebas adicionales del transporte musical verifican reloj/posición, reanudación exacta, liberación de fuentes tras diez reinicios, interrupción y reintento de descarga. Total: 15 casos automáticos aprobados.

## Fase 4 — Pantallas y persistencia

APROBADA en navegador. Inicio, carga, tutorial completo, cuenta atrás, partida, pausa, reinicio, ajustes, resultados y vuelta al inicio. El récord 38.650 permaneció después de recargar. Efectos reducidos permaneció seleccionado después de recargar. Se comprobó el diálogo de ajustes y sus controles.

## Fase 5 — Presentación adaptable

Capturas en 390×844, 320×568 y 1280×900. En 320×568, ancho de contenido 320, alto de contenido 568, todos los botones de inicio dentro del viewport y sin desbordamiento horizontal. Revisión independiente de inicio, escritorio, ajustes y pausa; una observación sobre progreso móvil motivó una corrección localizada.

Cierre de revisión: **ship**, con el único hallazgo material marcado **resolved**. La barra comparte el desplazamiento superior del HUD y permanece visible en móvil. `pause.png` muestra unos 49 píxeles de avance a los 10 segundos. Este veredicto se limita a la corrección visual, no acredita equipos físicos ni publicación.

## Fase 6 — PWA y modo sin conexión

APROBADO el modo offline en este navegador. Primero se instaló la caché completa y se observó «Disponible sin conexión». Después se apagó el servidor local; curl confirmó rechazo de conexión a localhost:4173. Con el servidor aún apagado se recargó la aplicación, se cargó el audio desde caché y se completó una partida de 80 segundos: 109 Perfectos, un Fallo, 14 cristales, 99 % de precisión, tres estrellas y 33.450 puntos. Incluyó pausa y reanudación. Captura: offline-results.png.

La actualización de la PWA se ofreció en portada y se aplicó correctamente mediante «Hay una nueva versión. Actualizar».

El manifiesto y los iconos están generados. La instalación real en Android y los pasos de Safari en iPhone requieren dispositivos físicos. La publicación pública y el QR dependen de autenticar una cuenta de alojamiento; no se han simulado ni declarado completados.

## Fase 7 — Entrega

Compilación TypeScript/Vite aprobada. Auditoría npm sin vulnerabilidades después de actualizar dependencias de herramientas. Sitio compilado alrededor de 2,7 MB sin comprimir; la transferencia desde un servidor con compresión será menor. Se entregan código, recursos originales, instrucciones, pruebas, capturas y paquete publicable.

Última pasada: 15/15 pruebas aprobadas, compilación de producción correcta y `npm audit` con cero vulnerabilidades. `npm ci --dry-run --ignore-scripts` resolvió el archivo de bloqueo sin errores; es una comprobación de resolución, no una reinstalación física completa.

## Límites explícitos

### Corrección posterior: respuesta de los clics

El usuario reportó retraso durante la partida en el navegador integrado de escritorio. Se identificó que `RoadScene.tap` solo iluminaba el carril; la esfera cambiaba de carril desde `hit`, incluso al expirar una nota. Eso hacía que un toque temprano no moviera la esfera y que un fallo posterior pareciera una respuesta tardía.

Antes del arreglo, las siete primeras pruebas de respuesta fallaron usando los métodos reales de la escena con un renderizador simulado. Después del arreglo: movimiento en el siguiente fotograma, estado pulsado sin transición de entrada, puntuación independiente y ningún cambio de carril automático por fallos. Se añadieron también cruces completos de pista y arranque previo al renderizador. Total actualizado: **24/24 pruebas aprobadas**.

La simulación verifica llegada al carril a menos de 0,5px en 100ms a 30/60/120 FPS. Esto mide la lógica y animación con un reloj controlado, no la latencia física del ratón ni el tiempo hasta mostrar píxeles en el equipo del usuario. No se cambian las ventanas de puntuación.

Comprobación en el mismo navegador integrado de escritorio: clic derecho antes de la primera nota, seguido de clics izquierda/centro/derecha tras reanudar. A 1,208s la captura mostró la esfera en el carril derecho, puntuación 0 y energía 100: el movimiento ya no esperaba al juicio de una nota. Se comprobó también pausa y reanudación de esta versión. Compilación TypeScript/Vite aprobada.

### Validaciones externas pendientes

- No se ha probado Safari/iPhone físico, vibración Android real ni instalación nativa del acceso PWA.
- No se ha medido rendimiento en un teléfono físico de gama baja ni hecho un perfil de memoria de diez partidas completas. Sí se verificó liberación de las fuentes de audio tras diez reinicios.
- No se ha ensayado el QR impreso ni concurrencia en la red del evento porque falta la URL pública.
- La prueba de sincronización usa eventos de teclado controlados. Los botones táctiles se verificaron con el tutorial; hace falta probar la comodidad con el pulgar en el dispositivo real.
- La primera visita sigue necesitando conexión; borrar caché o almacenamiento puede eliminar recursos y récords.
