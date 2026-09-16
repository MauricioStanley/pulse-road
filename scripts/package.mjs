import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

await fs.mkdir('licenses', { recursive: true });
await fs.copyFile('node_modules/phaser/LICENSE.md','licenses/Phaser-MIT.txt');
await fs.copyFile('node_modules/@fontsource-variable/outfit/LICENSE','licenses/Outfit-OFL.txt');
await fs.copyFile('node_modules/workbox-window/LICENSE','licenses/Workbox-MIT.txt');
await fs.mkdir('dist/licenses',{recursive:true});
for(const file of await fs.readdir('licenses'))await fs.copyFile(path.join('licenses',file),path.join('dist/licenses',file));
const publish=spawnSync('powershell',['-NoProfile','-Command',"Compress-Archive -Path 'dist/*' -DestinationPath '../PulseRoad-publicar.zip' -Force"],{stdio:'inherit'});
if(publish.status!==0)throw new Error('No se pudo crear el paquete publicable.');
const source=spawnSync('powershell',['-NoProfile','-Command',"Compress-Archive -LiteralPath 'src','public','scripts','tests','docs','qa','qr','licenses','.impeccable','.github','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts','README.md','PRODUCT.md','DESIGN.md','.gitignore' -DestinationPath '../PulseRoad-proyecto.zip' -Force"],{stdio:'inherit'});
if(source.status!==0)throw new Error('No se pudo crear el paquete de código fuente.');
console.log('Paquetes preparados junto al proyecto: PulseRoad-publicar.zip y PulseRoad-proyecto.zip.');
