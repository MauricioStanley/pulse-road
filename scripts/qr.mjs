import QRCode from "qrcode";
import fs from "node:fs/promises";
const value = process.argv[2];
if (!value) throw new Error("Uso: npm run qr -- https://tu-dominio.example");
const url = new URL(value);
if (url.protocol !== "https:")
  throw new Error("Usa la URL pública HTTPS para que la PWA funcione.");
await fs.mkdir("qr", { recursive: true });
await QRCode.toFile("qr/pulse-road.png", url.href, {
  width: 1200,
  margin: 4,
  errorCorrectionLevel: "M",
  color: { dark: "#07151e", light: "#ffffff" },
});
await QRCode.toFile("qr/pulse-road.svg", url.href, {
  type: "svg",
  margin: 4,
  errorCorrectionLevel: "M",
});
console.log(`QR generado para ${url.href}`);
