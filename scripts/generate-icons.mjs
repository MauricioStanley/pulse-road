import fs from "node:fs/promises";
import sharp from "sharp";

// "NEO" and "RUSH" in Outfit at weight 850 with the home heading's -0.035 em
// tracking (SIL OFL 1.1, see licenses/Outfit-OFL.txt), stored as outlines so
// the icon looks the same on every device. 1000 units per em, baseline y = 0.
const words = {
  NEO: {
    minX: 61,
    maxX: 2106,
    d: "M61 0L61 -711L194 -711L251 -563L251 0ZM550 0L137 -522L194 -711L607 -188ZM550 0L502 -154L502 -711L691 -711L691 0ZM778.88 0L778.88 -711L968.88 -711L968.88 0ZM930.88 0L930.88 -159L1313.88 -159L1313.88 0ZM930.88 -285L930.88 -440L1276.88 -440L1276.88 -285ZM930.88 -553L930.88 -711L1307.88 -711L1307.88 -553ZM1724.75 13Q1641.75 13 1572.25 -14.5Q1502.75 -42 1450.25 -92.5Q1397.75 -143 1369.25 -210.5Q1340.75 -278 1340.75 -357Q1340.75 -436 1368.75 -502.5Q1396.75 -569 1448.75 -619Q1500.75 -669 1570.25 -696.5Q1639.75 -724 1722.75 -724Q1806.75 -724 1876.25 -696.5Q1945.75 -669 1997.25 -619Q2048.75 -569 2077.25 -502Q2105.75 -435 2105.75 -356Q2105.75 -277 2077.75 -210Q2049.75 -143 1997.75 -92Q1945.75 -41 1876.25 -14Q1806.75 13 1724.75 13ZM1722.75 -154Q1780.75 -154 1823.75 -179Q1866.75 -204 1889.75 -250Q1912.75 -296 1912.75 -357Q1912.75 -402 1899.25 -438.5Q1885.75 -475 1860.75 -502Q1835.75 -529 1801.25 -542.5Q1766.75 -556 1722.75 -556Q1665.75 -556 1622.75 -532Q1579.75 -508 1556.75 -462.5Q1533.75 -417 1533.75 -357Q1533.75 -310 1547.25 -273Q1560.75 -236 1585.75 -209.5Q1610.75 -183 1645.25 -168.5Q1679.75 -154 1722.75 -154Z",
  },
  RUSH: {
    minX: 61,
    maxX: 2560,
    d: "M213 -285L213 -419L340 -419Q384 -419 406 -439.5Q428 -460 428 -495Q428 -530 406 -551Q384 -572 340 -572L213 -572L213 -711L370 -711Q443 -711 498 -684Q553 -657 584.5 -609.5Q616 -562 616 -498Q616 -434 584.5 -386.5Q553 -339 496 -312Q439 -285 361 -285ZM61 0L61 -711L251 -711L251 0ZM445 0L244 -304L415 -343L662 0ZM991.13 12Q899.13 12 829.63 -26Q760.13 -64 721.63 -131.5Q683.13 -199 683.13 -286L683.13 -711L873.13 -711L873.13 -270Q873.13 -235 888.63 -209Q904.13 -183 931.13 -169.5Q958.13 -156 991.13 -156Q1024.13 -156 1050.13 -169.5Q1076.13 -183 1091.13 -208.5Q1106.13 -234 1106.13 -269L1106.13 -711L1296.13 -711L1296.13 -285Q1296.13 -198 1258.13 -131Q1220.13 -64 1151.63 -26Q1083.13 12 991.13 12ZM1597.13 12Q1507.13 12 1441.13 -15Q1375.13 -42 1319.13 -101L1438.13 -220Q1475.13 -181 1518.13 -161.5Q1561.13 -142 1611.13 -142Q1654.13 -142 1676.63 -156Q1699.13 -170 1699.13 -194Q1699.13 -217 1681.63 -232.5Q1664.13 -248 1634.13 -260Q1604.13 -272 1569.13 -284Q1534.13 -296 1499.13 -312.5Q1464.13 -329 1434.13 -353.5Q1404.13 -378 1386.63 -414.5Q1369.13 -451 1369.13 -504Q1369.13 -572 1401.63 -621Q1434.13 -670 1493.13 -696Q1552.13 -722 1631.13 -722Q1709.13 -722 1776.13 -696.5Q1843.13 -671 1887.13 -624L1767.13 -505Q1734.13 -538 1701.13 -553.5Q1668.13 -569 1629.13 -569Q1596.13 -569 1576.13 -557.5Q1556.13 -546 1556.13 -524Q1556.13 -502 1574.13 -487.5Q1592.13 -473 1621.63 -461.5Q1651.13 -450 1686.13 -438Q1721.13 -426 1756.63 -409.5Q1792.13 -393 1821.63 -368Q1851.13 -343 1869.13 -305Q1887.13 -267 1887.13 -213Q1887.13 -106 1811.13 -47Q1735.13 12 1597.13 12ZM1938.5 0L1938.5 -711L2128.5 -711L2128.5 0ZM2370.5 0L2370.5 -711L2559.5 -711L2559.5 0ZM2044.5 -284L2044.5 -443L2442.5 -443L2442.5 -284Z",
  },
};
const CAP = 711;
const SCALE = 0.15;
const LINE = 880 * SCALE; // line-height 0.88, as on the home screen

function word(name, baseline, fill) {
  const { minX, maxX, d } = words[name];
  const x = 256 - ((minX + maxX) / 2) * SCALE;
  return `<path transform="translate(${x.toFixed(1)} ${baseline.toFixed(1)}) scale(${SCALE})" fill="${fill}" d="${d}"/>`;
}
const top = 103;
const neo = top + CAP * SCALE;
const rush = neo + LINE;
// The platform under the name is the same slab the orb lands on in the game.
const slab = rush + 26;
export const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="glow" cx="50%" cy="48%" r="50%"><stop offset="0" stop-color="#70f4cb" stop-opacity=".2"/><stop offset="1" stop-color="#70f4cb" stop-opacity="0"/></radialGradient></defs><rect width="512" height="512" rx="112" fill="#07151e"/><rect width="512" height="512" rx="112" fill="url(#glow)"/>${word("NEO", neo, "#eaf6ef")}${word("RUSH", rush, "#70f4cb")}<path d="M196 ${slab} H316 L338 ${slab + 26} H174Z" fill="#70f4cb"/><path d="M174 ${slab + 26} H338 V${slab + 38} H174Z" fill="#228069"/><path d="M174 ${slab + 26} H338" stroke="#eaf6ef" stroke-opacity=".55" stroke-width="2"/></svg>`;

// iOS and Android maskable icons get their own rounded mask: give them full,
// opaque corners instead of transparent ones.
const square = icon.replaceAll(' rx="112"', "");

await fs.mkdir("public/icons", { recursive: true });
await fs.writeFile("public/icons/icon.svg", icon);
for (const size of [192, 512])
  await sharp(Buffer.from(icon))
    .resize(size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
await sharp(Buffer.from(square))
  .resize(180)
  .png()
  .toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(square))
  .resize(384)
  .extend({ top: 64, bottom: 64, left: 64, right: 64, background: "#07151e" })
  .png()
  .toFile("public/icons/maskable-512.png");
