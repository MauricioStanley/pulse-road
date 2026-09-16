# Recursos y licencias

## Originales del proyecto

First Light: composición electrónica de 80 segundos a 120 BPM, sintetizada mediante el código reproducible de `scripts/generate-assets.mjs`. No incorpora muestras ni grabaciones de terceros. La síntesis usa osciladores y ruido generado con semilla fija.

Pequeña Órbita (96 BPM), Neon Sprint (150 BPM) y Umbral Cero (180 BPM): composiciones adicionales de 80 segundos, con melodías, armonías y arreglos originales reproducibles mediante `scripts/generate-tracks.mjs`. Las cuatro pistas usan osciladores y ruido sintetizado, sin samples externos.

El sonido de daño es un chirrido de dos caídas de frecuencia sintetizado por Web Audio en `src/audio/conductor.ts`. No es la grabación de Roblox ni una muestra de ningún videojuego.

Los anillos dorados, la caja con emblema de pulso, el bloque de césped y los portales son geometrías originales. Son guiños de género a videojuegos clásicos, no recursos oficiales, personajes ni marcas de Mario, Sonic, Minecraft o Portal. No hay afiliación con esos juegos.

La pista, plataformas, esfera, partículas e iconos de la aplicación son geometría original dibujada en Phaser/Canvas y SVG. Los iconos PNG se generan a partir del SVG original incluido; no son fotografías ni resultados de búsqueda. El archivo `public/icons/provenance.txt` conserva su origen.

Ningún recurso procede de Tiles Hop, Magic Tiles ni Dancing Road. Esos títulos son referencias de género, no afiliaciones.

## Dependencias distribuidas

- Phaser 3.90.0: MIT. https://github.com/phaserjs/phaser
- Outfit: SIL Open Font License 1.1, distribuida mediante Fontsource. https://github.com/Outfitio/Outfit-Fonts
- Workbox / workbox-window: MIT. https://github.com/GoogleChrome/workbox

Las copias de las licencias están en `licenses/`. Las herramientas de construcción conservan sus licencias dentro de sus paquetes de npm. La interfaz de créditos reconoce los recursos del producto.
