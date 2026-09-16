---
name: Pulse Road
description: Un circuito electrónico que responde a cada toque.
colors:
  background: "#07151e"
  surface: "#0c222b"
  primary: "#70f4cb"
  text: "#eaf6ef"
  muted: "#a4bebf"
  hazard: "#ff897d"
typography:
  display:
    fontFamily: "Outfit Variable, sans-serif"
    fontSize: "clamp(56px, 10vh, 88px)"
    fontWeight: 850
    lineHeight: 0.88
    letterSpacing: "-0.035em"
  action:
    fontFamily: "Outfit Variable, sans-serif"
    fontSize: "18px"
    fontWeight: 650
rounded:
  action: "16px"
  dialog: "25px"
  cabinet: "30px"
  pill: "999px"
spacing:
  small: "10px"
  panel: "26px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#082920"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "14px 20px"
    width: "100%"
  button-secondary:
    backgroundColor: "#193239"
    textColor: "{colors.text}"
    rounded: "{rounded.action}"
    padding: "14px 20px"
    width: "100%"
---

# Design System: Pulse Road

## Overview

**Creative North Star: "Un circuito que se toca"**

Se conserva la dirección acordada: juguete electrónico luminoso, pista azul noche, plataformas marfil y luz menta. La experiencia es el juego, no una página promocional. La escena persiste detrás del inicio, pausa y resultados.

**Key Characteristics:**

- Geometría en perspectiva generada por Phaser.
- Esfera luminosa, plataformas, obstáculos y cristales con siluetas distintas.
- Jerarquía clara entre acción principal, partida y utilidades.
- Respuesta inmediata al toque y movimiento decorativo reducible.

## Colors

Menta comunica acciones y aciertos; coral señala peligros y fallos. Marfil mantiene legible la información sobre azul noche. El texto secundario es gris verdoso. Los valores normativos están en el frontmatter.

La paleta anterior es la opción predeterminada Menta. Desde Ajustes hay variantes Morado, Rojo y Verde: `src/themes.ts` es la fuente normativa de sus colores. Cada variante coordina acento, fondos, superficies, esfera y circuito sin cambiar composición ni reglas. En Rojo los peligros son ámbar, además de conservar su silueta marcada. El selector usa radios con nombre y marca de selección; no depende solo del color. La selección persiste localmente.

**The Shape and Color Rule.** Las señales jugables combinan forma, posición y color: plataforma plana, obstáculo marcado y cristal romboidal.

## Typography

Outfit Variable se sirve desde el mismo origen. El título principal es compacto y pesado; los controles tienen peso medio; las cifras usan números tabulares. El título reduce tamaño en pantallas bajas. Los diálogos usan títulos de 27px y texto de 15px; los detalles auxiliares son más pequeños. No imponer la escala de portada a los diálogos.

## Layout

En escritorio, un gabinete de 430px de ancho y hasta 880px de alto centra la partida. Hasta 740px se ocultan los laterales y el gabinete ocupa el viewport, con máximo de 520px. Usa altura dinámica y ajustes para pantallas bajas y de 360px o menos de ancho.

El HUD comparte su desplazamiento superior con la barra de progreso para mantenerla visible. Las áreas seguras se aplican al HUD y los controles inferiores. En horizontal con puntero táctil se solicita volver a vertical y se pausa la partida.

Tres controles fijos representan izquierda, centro y derecha. Son botones reales: el toque directo selecciona el carril correspondiente. El teclado usa izquierda/abajo/derecha o A/S/D.

## Elevation & Depth

La perspectiva y el tamaño de las plataformas producen profundidad. La esfera tiene iluminación suave generada localmente. El gabinete usa sombra ambiental; el diálogo combina fondo opaco, borde fino y fondo exterior atenuado con desenfoque. No añadir paneles transparentes sobre información jugable.

## Shapes

Botones redondeados amplios, cápsula de récord y diálogos suaves contrastan con las plataformas trapezoidales. Los iconos SVG tienen nombres accesibles en controles sin texto. La esfera es la figura circular protagonista.

## Components

### Acciones

Primaria menta y secundaria azul verdoso. Altura mínima general de 56px; Jugar usa 62px. Hover aclara el fondo y eleva 2px; pulsación desplaza 1px. Foco visible: contorno menta de 2px separado 5px. Estas alturas no describen todas las utilidades pequeñas.

### Partida

Puntuación, multiplicador y energía arriba; tres controles abajo. En pantallas bajas los controles conservan 78px de altura. Energía, progreso y carga usan transformaciones scaleX, sin animar anchura. El juicio textual refuerza las señales del toque.

### Ajustes y resultados

El diálogo agrupa sonido, vibración, efectos reducidos y sincronización. El rango de sincronización sigue siendo nativo; cada checkbox tiene etiqueta completa. Los resultados destacan puntos, precisión, combo y cristales, con Volver a jugar como acción principal.

### Movimiento

El toque produce pulso de carril, desplazamiento de esfera y, con efectos activos, salto y partículas acotadas. La opción reducida elimina partículas, salto/flotación, estela, destello coral y viaje decorativo del inicio. Conserva notas esenciales, cambio horizontal, pulso y pequeña oscilación del cristal. Desactiva transiciones CSS; no es un modo totalmente estático.

La selección de carril pertenece al toque, no al resultado de puntuación. El movimiento comienza en el siguiente fotograma incluso fuera de la ventana de acierto; una nota expirada no cambia de carril ni genera un salto tardío. El estado pulsado del control se aplica sin transición de entrada.

## Do's and Don'ts

### Variante ultraligera

`lite.html` conserva las señales esenciales con una pista recta de tres carriles, plataformas marfil, peligros con X, cristales romboidales y un anillo breve en los Perfectos. No replica la perspectiva ni los guiños decorativos: prioriza legibilidad y coste mínimo. Usa Arial del sistema, fondos opacos y controles de al menos 44px; el lienzo interno se limita a 240px de ancho y el dibujo a 30 FPS objetivo. Sin partículas, desenfoque, sombras animadas, saltos o vibración. La entrada pinta el carril inmediatamente, sin esperar el siguiente turno de dibujo. Esta excepción es deliberada y distinta de «Efectos reducidos» del modo completo.

El selector de modo está en portada y ajustes. Se guarda localmente y ofrece vuelta al completo. Los menús cortos pueden desplazarse en pantallas pequeñas; el HUD se conserva separado del diálogo de pausa. La puntuación, dificultad y récord son compartidos entre ambos renderizadores.

### Do:

- **Do** conservar una acción principal clara en cada pantalla.
- **Do** mantener las señales temporales visibles con sonido apagado.
- **Do** conservar posiciones de control entre estados.
- **Do** limitar partículas y ofrecer efectos reducidos.

### Don't:

- **Don't** depender solamente del color.
- **Don't** añadir recursos remotos necesarios durante la partida.
- **Don't** presentar capturas móviles como pruebas en teléfonos físicos.
- **Don't** afirmar que el modo reducido elimina todo movimiento.
