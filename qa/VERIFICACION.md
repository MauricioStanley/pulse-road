# Verificación de Pulse Road

Fecha: 16 de septiembre de 2026. Pruebas de navegador realizadas en el navegador integrado de Codex, con resoluciones CSS de 390×844, 320×568 y 1280×900. Esas resoluciones no implican pruebas en equipos físicos.

## Actualización: colores y publicación

Hay cuatro paletas seleccionables: Menta, Morado, Rojo y Verde. Once pruebas nuevas cubren contraste de textos/controles/peligros, persistencia de cada preferencia, datos antiguos y rutas raíz/subdirectorio. Total: **35/35 pruebas aprobadas**. Compilaciones de producción correctas tanto en `/` como en `/pulse-road/`.

En navegador se seleccionaron Morado, Rojo y Verde; se verificó la esfera y el circuito y se confirmó que Verde seguía seleccionado al recargar. Los tamaños móviles son emulados. El repositorio público se configura con un workflow que prueba, compila y despliega en GitHub Pages. Las fases siguientes son el historial de verificación previo a esta actualización; los pendientes de Cloudflare corresponden a aquella primera entrega, ahora sustituida por GitHub Pages.

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
