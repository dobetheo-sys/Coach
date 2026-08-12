/**
 * makeIcons — icônes PNG de la PWA, zéro dépendance (zlib natif + CRC32 maison).
 *
 * R-ZENNA v7 — IL NE DESSINE PLUS RIEN LUI-MÊME. Il peignait un triangle rouge sur fond
 * CRÈME : l'ancienne direction artistique, et la seule surface où elle restait INSTALLÉE chez
 * les gens (l'icône sur l'écran d'accueil du téléphone, l'onglet du navigateur). Il lit
 * désormais `endurabuild/js/ui/brand.js` — la même source que l'en-tête, l'accueil et la carte
 * de partage. Quand le vrai logo y sera posé, `npm run make:icons` suffit.
 *
 * Génère assets/icon-192.png et assets/icon-512.png.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixelFn) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filtre None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelFn(x / size, y / size);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const { MARQUE, dansSymbole } = await import("../endurabuild/js/ui/brand.js");
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const FOND = rgb(MARQUE.fondIcone), ENCRE = rgb(MARQUE.encre);

// R-ZENNA v9 — PLUS DE TUILE : le logo est une SILHOUETTE orange sur fond sombre, exactement
// comme le fichier fourni par le fondateur. On garde une marge (les lanceurs Android rognent
// jusqu'à 10 % de chaque bord sur une icône « maskable ») et on échantillonne le symbole en
// 2×2 par pixel : les bords du tracé sont courbes, et sans ce lissage l'icône crénèle à 192 px.
const M = 16, S0 = M, S1 = 100 - M;
const pixel = (u, v) => {
  const x = u * 100, y = v * 100;
  let n = 0;
  for (const [dx, dy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    const sx = ((x + dx - S0) / (S1 - S0)) * 100, sy = ((y + dy - S0) / (S1 - S0)) * 100;
    if (sx >= 0 && sx <= 100 && sy >= 0 && sy <= 100 && dansSymbole(sx, sy)) n++;
  }
  if (!n) return FOND;
  const a = n / 4;
  return [0, 1, 2].map((i) => Math.round(ENCRE[i] * a + FOND[i] * (1 - a)));
};

mkdirSync(join(root, "endurabuild", "assets"), { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(join(root, "endurabuild", "assets", "icon-" + size + ".png"), png(size, pixel));
  console.log("icon-" + size + ".png ✓");
}
